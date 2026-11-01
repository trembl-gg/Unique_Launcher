using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
using WebView2Control = Microsoft.Web.WebView2.WinForms.WebView2;
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Http;
using System.Net.Sockets;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using System.Windows.Forms;
using System.Runtime.InteropServices;

namespace UniqueLauncher.WebView2;

public sealed class LauncherForm : Form
{
    private const int WmNclButtonDown = 0x00A1;
    private const int HtCaption = 0x02;

    private readonly WebView2Control webView = new();
    private readonly HttpClient http = new() { Timeout = Timeout.InfiniteTimeSpan };
    private readonly CancellationTokenSource shutdown = new();
    private readonly AudioPeakMeter audioMeter = new();
    private readonly CaptureProtection captureProtection = new();
    private readonly HashSet<int> iconProcesses = new();
    private Process? backendProcess;
    private int backendPort;
    private bool isMaximized;
    private volatile bool storageMigration;
    private readonly Label startupStatus = new() { Dock = DockStyle.Fill, TextAlign = System.Drawing.ContentAlignment.MiddleCenter, ForeColor = System.Drawing.Color.White, Text = "UNIQUE LAUNCHER…" };

    public LauncherForm()
    {
        Text = "UNIQUE LAUNCHER";
        BackColor = System.Drawing.Color.FromArgb(9, 6, 17);
        webView.DefaultBackgroundColor = BackColor;
        MinimumSize = new System.Drawing.Size(1120, 720);
        StartPosition = FormStartPosition.CenterScreen;
        FormBorderStyle = FormBorderStyle.None;
        WindowState = FormWindowState.Maximized;

        var iconPath = FindFile("launcher.ico") ?? FindFile("unique иконка.ico");
        if (iconPath is not null)
        {
            Icon = new System.Drawing.Icon(iconPath);
        }

        webView.Dock = DockStyle.Fill;
        Controls.Add(webView);
        Controls.Add(startupStatus);
        startupStatus.BringToFront();
        Resize += (_, _) => { PublishMaximizedState(); ApplyWindowCorners(); };
        ResizeEnd += (_, _) => PostToWebView(new { type = "event", channel = "hardware-info", data = WindowsHardware.Read(Handle) });
        Activated += (_, _) => PostToWebView(new { type = "event", channel = "hardware-info", data = WindowsHardware.Read(Handle) });
        FormClosed += (_, _) => StopBackend();
    }

    protected override void OnHandleCreated(EventArgs e)
    {
        base.OnHandleCreated(e);
        ApplyWindowCorners();
        captureProtection.Restore(Handle);
    }

    private void ApplyWindowCorners()
    {
        if (!IsHandleCreated || !OperatingSystem.IsWindowsVersionAtLeast(10, 0, 22000)) return;
        var preference = WindowState == FormWindowState.Normal ? 2 : 1;
        DwmSetWindowAttribute(Handle, 33, ref preference, sizeof(int));
    }

    [DllImport("dwmapi.dll")]
    private static extern int DwmSetWindowAttribute(IntPtr hwnd, int attribute, ref int value, int size);

    protected override async void OnLoad(EventArgs e)
    {
        base.OnLoad(e);

        try
        {
            backendPort = GetFreeLoopbackPort();
            StartBackend(backendPort);
            await WaitForBackendAsync();
            await InitializeWebViewAsync();
            startupStatus.Visible = false;
            _ = Task.Run(() => PumpBackendEventsAsync(shutdown.Token));
        }
        catch (Exception ex)
        {
            MessageBox.Show(ex.Message, "UNIQUE LAUNCHER WebView2", MessageBoxButtons.OK, MessageBoxIcon.Error);
            Close();
        }
    }

    private async Task InitializeWebViewAsync()
    {
        var userDataFolder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "UNIQUE LAUNCHER", "WebView2");
        Directory.CreateDirectory(userDataFolder);
        var environment = await CoreWebView2Environment.CreateAsync(null, userDataFolder);
        await webView.EnsureCoreWebView2Async(environment);
        webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = true;
        webView.CoreWebView2.Settings.AreDevToolsEnabled = false;
        webView.CoreWebView2.Settings.IsStatusBarEnabled = false;
        webView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;

        var rendererIndex = FindFile(Path.Combine("renderer", "index.html"))
            ?? throw new FileNotFoundException("renderer/index.html was not found.");
        var rendererUri = new Uri(rendererIndex).AbsoluteUri;
        webView.CoreWebView2.NavigationStarting += (_, args) =>
        {
            if (!string.Equals(args.Uri.Split('#')[0], rendererUri, StringComparison.OrdinalIgnoreCase)) args.Cancel = true;
        };
        webView.CoreWebView2.Navigate(rendererUri);
    }

    private void StartBackend(int port)
    {
        var root = FindProjectRoot();
        var backendScript = FindFile(Path.Combine("webview2", "node-backend.js"))
            ?? FindFile("node-backend.js")
            ?? throw new FileNotFoundException("webview2/node-backend.js was not found.");
        var nodePath = FindNode()
            ?? throw new FileNotFoundException("node.exe was not found. Install Node.js or set UNIQUE_NODE_PATH.");

        var startInfo = new ProcessStartInfo
        {
            FileName = nodePath,
            Arguments = $"\"{backendScript}\"",
            WorkingDirectory = root,
            UseShellExecute = false,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            CreateNoWindow = true
        };

        startInfo.Environment["UNIQUE_WEBVIEW2_BACKEND"] = "1";
        startInfo.Environment["UNIQUE_WEBVIEW2_BACKEND_PORT"] = port.ToString();
        startInfo.Environment["UNIQUE_WEBVIEW2_ROOT"] = root;

        backendProcess = Process.Start(startInfo)
            ?? throw new InvalidOperationException("Cannot start UNIQUE backend process.");
        backendProcess.OutputDataReceived += (_, args) =>
        {
            Debug.WriteLine(args.Data);
            if (args.Data == "UNIQUE_STORAGE_COPY_START") storageMigration = true;
            if (args.Data == "UNIQUE_STORAGE_COPY_END") storageMigration = false;
        };
        backendProcess.ErrorDataReceived += (_, args) => Debug.WriteLine(args.Data);
        backendProcess.BeginOutputReadLine();
        backendProcess.BeginErrorReadLine();
    }

    private void StopBackend()
    {
        audioMeter.Dispose();
        shutdown.Cancel();
        try
        {
            if (backendProcess is { HasExited: false })
            {
                backendProcess.Kill(entireProcessTree: true);
            }
        }
        catch
        {
            // Best-effort shutdown; the process will exit when the host exits in normal cases.
        }
    }

    private async Task WaitForBackendAsync()
    {
        var deadline = DateTimeOffset.UtcNow.AddSeconds(20);
        Exception? lastError = null;

        while (DateTimeOffset.UtcNow < deadline || storageMigration)
        {
            shutdown.Token.ThrowIfCancellationRequested();
            if (backendProcess is { HasExited: true }) throw new InvalidOperationException("UNIQUE backend stopped during startup.");
            if (storageMigration)
            {
                startupStatus.Text = "UNIQUE LAUNCHER\nПеренос и проверка файлов игры / Copying and verifying game files / Copiando y verificando archivos…";
                deadline = DateTimeOffset.UtcNow.AddSeconds(20);
            }
            try
            {
                using var response = await http.GetAsync($"http://127.0.0.1:{backendPort}/health");
                if (response.IsSuccessStatusCode)
                {
                    return;
                }
            }
            catch (Exception ex)
            {
                lastError = ex;
            }

            await Task.Delay(250);
        }

        throw new TimeoutException($"UNIQUE backend did not start in time. {lastError?.Message}");
    }

    private async void OnWebMessageReceived(object? sender, CoreWebView2WebMessageReceivedEventArgs e)
    {
        using var document = JsonDocument.Parse(e.WebMessageAsJson);
        var root = document.RootElement;
        var type = root.GetProperty("type").GetString();

        if (type == "invoke")
        {
            var id = root.GetProperty("id").GetInt32();
            var channel = root.GetProperty("channel").GetString() ?? "";
            var payload = root.TryGetProperty("payload", out var payloadElement)
                ? payloadElement.GetRawText()
                : "null";

            try
            {
                object? result;
                if (channel == "dropped-files")
                {
                    var paths = new List<string>();
                    foreach (var item in e.AdditionalObjects)
                    {
                        if (item is CoreWebView2File file && (File.Exists(file.Path) || Directory.Exists(file.Path))) paths.Add(file.Path);
                        if (paths.Count > 100) throw new InvalidOperationException("Перетащите не больше 100 файлов за раз.");
                    }
                    result = paths;
                }
                else result = await InvokeAsync(channel, payload);
                PostToWebView(new { type = "invoke-result", id, ok = true, result });
            }
            catch (Exception ex)
            {
                PostToWebView(new { type = "invoke-result", id, ok = false, error = ex.Message });
            }
        }
    }

    private async Task<object?> InvokeAsync(string channel, string payloadJson)
    {
        return channel switch
        {
            "window-control" => HandleWindowControl(payloadJson),
            "window-is-maximized" => WindowState == FormWindowState.Maximized,
            "window-drag" => HandleWindowDrag(),
            "audio-peak" => audioMeter.Read(),
            "get-hardware-info" => WindowsHardware.Read(Handle),
            "audio-meter-stop" => StopAudioMeter(),
            "streamer-mode" => captureProtection.Set(Handle, JsonSerializer.Deserialize<bool>(payloadJson)),
            "choose-file" => HandleChooseFile(payloadJson),
            "choose-directory" => HandleChooseDirectory(),
            _ => await ForwardToBackendAsync(channel, payloadJson)
        };
    }

    private bool StopAudioMeter() { audioMeter.Dispose(); return true; }

    private object? HandleWindowDrag()
    {
        if (WindowState == FormWindowState.Minimized)
        {
            return false;
        }

        ReleaseCapture();
        SendMessage(Handle, WmNclButtonDown, HtCaption, 0);
        return true;
    }

    private object? HandleWindowControl(string payloadJson)
    {
        var action = JsonSerializer.Deserialize<string>(payloadJson) ?? "";
        switch (action)
        {
            case "minimize":
                WindowState = FormWindowState.Minimized;
                break;
            case "maximize":
                WindowState = WindowState == FormWindowState.Maximized
                    ? FormWindowState.Normal
                    : FormWindowState.Maximized;
                PublishMaximizedState();
                break;
            case "close":
                Close();
                break;
            case "show":
                if (WindowState == FormWindowState.Minimized)
                {
                    WindowState = FormWindowState.Normal;
                }
                Show();
                Activate();
                break;
            case "hide":
                Hide();
                break;
        }
        return true;
    }

    private object? HandleChooseFile(string payloadJson)
    {
        using var dialog = new OpenFileDialog
        {
            CheckFileExists = true,
            Multiselect = false,
            Filter = BuildDialogFilter(payloadJson)
        };

        if (dialog.ShowDialog(this) != DialogResult.OK)
        {
            return null;
        }

        return new
        {
            path = dialog.FileName,
            name = Path.GetFileName(dialog.FileName),
            ext = Path.GetExtension(dialog.FileName).ToLowerInvariant()
        };
    }

    private object? HandleChooseDirectory()
    {
        using var dialog = new FolderBrowserDialog
        {
            ShowNewFolderButton = false
        };

        if (dialog.ShowDialog(this) != DialogResult.OK)
        {
            return null;
        }

        return new
        {
            path = dialog.SelectedPath,
            name = Path.GetFileName(dialog.SelectedPath.TrimEnd(Path.DirectorySeparatorChar, Path.AltDirectorySeparatorChar))
        };
    }

    private static string BuildDialogFilter(string payloadJson)
    {
        try
        {
            using var document = JsonDocument.Parse(payloadJson);
            if (!document.RootElement.TryGetProperty("filters", out var filters) || filters.ValueKind != JsonValueKind.Array)
            {
                return "All files (*.*)|*.*";
            }

            var parts = new List<string>();
            foreach (var filter in filters.EnumerateArray())
            {
                var name = filter.TryGetProperty("name", out var nameElement)
                    ? nameElement.GetString() ?? "Files"
                    : "Files";
                if (!filter.TryGetProperty("extensions", out var extensions) || extensions.ValueKind != JsonValueKind.Array)
                {
                    continue;
                }

                var patterns = new List<string>();
                foreach (var extension in extensions.EnumerateArray())
                {
                    var value = extension.GetString();
                    if (string.IsNullOrWhiteSpace(value)) continue;
                    patterns.Add(value == "*" ? "*.*" : $"*.{value.TrimStart('.')}");
                }
                if (patterns.Count > 0)
                {
                    parts.Add($"{name}|{string.Join(";", patterns)}");
                }
            }

            parts.Add("All files (*.*)|*.*");
            return string.Join("|", parts);
        }
        catch
        {
            return "All files (*.*)|*.*";
        }
    }

    private async Task<JsonElement?> ForwardToBackendAsync(string channel, string payloadJson)
    {
        if (channel == "launch-minecraft")
        {
            var payload = System.Text.Json.Nodes.JsonNode.Parse(payloadJson);
            if (payload is System.Text.Json.Nodes.JsonObject obj)
            {
                obj["_displayRefreshRate"] = JsonSerializer.SerializeToNode(WindowsHardware.Read(Handle)["refreshRate"]);
                payloadJson = obj.ToJsonString();
            }
        }
        var url = $"http://127.0.0.1:{backendPort}/invoke/{Uri.EscapeDataString(channel)}";
        using var content = new StringContent(payloadJson, Encoding.UTF8, "application/json");
        using var response = await http.PostAsync(url, content, shutdown.Token);
        var json = await response.Content.ReadAsStringAsync();

        using var document = JsonDocument.Parse(json);
        var root = document.RootElement;
        if (!response.IsSuccessStatusCode || !root.TryGetProperty("ok", out var ok) || !ok.GetBoolean())
        {
            var error = root.TryGetProperty("error", out var errorElement)
                ? errorElement.GetString()
                : $"HTTP {(int)response.StatusCode}";
            throw new InvalidOperationException(error ?? "Backend request failed.");
        }

        if (!root.TryGetProperty("result", out var result))
        {
            return null;
        }
        if (channel == "get-launch-state" && result.ValueKind == JsonValueKind.Object
            && result.TryGetProperty("running", out var running) && running.ValueKind == JsonValueKind.True
            && result.TryGetProperty("pid", out var gamePid) && gamePid.TryGetInt32(out var pid)) TrackGameIcon(pid, shutdown.Token);
        if (channel == "get-system-info")
        {
            var merged = JsonSerializer.Deserialize<Dictionary<string, object?>>(result.GetRawText())!;
            foreach (var item in WindowsHardware.Read(Handle)) if (item.Value is not null || item.Key == "refreshRate") merged[item.Key] = item.Value;
            return JsonSerializer.SerializeToElement(merged);
        }
        return result.Clone();
    }

    private async Task PumpBackendEventsAsync(CancellationToken token)
    {
        using var eventsHttp = new HttpClient { Timeout = Timeout.InfiniteTimeSpan };
        string lastId = "0";
        while (!token.IsCancellationRequested)
        {
            try
            {
                using var request = new HttpRequestMessage(HttpMethod.Get, $"http://127.0.0.1:{backendPort}/events");
                request.Headers.TryAddWithoutValidation("Last-Event-ID", lastId);
                using var response = await eventsHttp.SendAsync(request, HttpCompletionOption.ResponseHeadersRead, token);
                response.EnsureSuccessStatusCode();
                using var stream = await response.Content.ReadAsStreamAsync(token);
                using var reader = new StreamReader(stream);
                var nextId = lastId;
                while (!token.IsCancellationRequested)
                {
                    var line = await reader.ReadLineAsync(token);
                    if (line is null) break;
                    if (line.StartsWith("id: ", StringComparison.Ordinal)) { nextId = line[4..]; continue; }
                    if (!line.StartsWith("data: ", StringComparison.Ordinal)) continue;
                    using var document = JsonDocument.Parse(line[6..]);
                    var channel = document.RootElement.GetProperty("channel").GetString();
                    var data = document.RootElement.GetProperty("data").Clone();
                    if (channel == "launch-started" && data.ValueKind == JsonValueKind.Object && data.TryGetProperty("pid", out var pidValue) && pidValue.TryGetInt32(out var gamePid))
                        TrackGameIcon(gamePid, token, data.TryGetProperty("engine", out var engine) && engine.GetString() == "horizon");
                    if (channel != "window-control" || !HandleBackendWindowControl(data))
                        PostToWebView(new { type = "event", channel, data });
                    lastId = nextId;
                }
            }
            catch (OperationCanceledException) when (token.IsCancellationRequested) { break; }
            catch (Exception error) { NativeDiagnostics.Write("Backend events", error.Message); }
            try { await Task.Delay(1000, token); } catch (OperationCanceledException) { break; }
        }
    }

    private void TrackGameIcon(int pid, CancellationToken token, bool horizon = false)
    {
        lock (iconProcesses) { if (!iconProcesses.Add(pid)) return; }
        _ = Task.Run(async () =>
        {
            try
            {
                var icon = horizon ? FindFile("launcher.ico") ?? FindFile("unique иконка.ico") : FindFile("game.ico");
                if (icon is null) NativeDiagnostics.Write("Game icon", "game.ico was not found");
                else await GameWindowIcon.ApplyAsync(pid, icon, token, horizon);
            }
            finally { lock (iconProcesses) iconProcesses.Remove(pid); }
        });
    }

    private bool HandleBackendWindowControl(JsonElement data)
    {
        var action = data.ValueKind == JsonValueKind.String ? data.GetString() : null;
        if (string.IsNullOrWhiteSpace(action)) return false;

        BeginInvoke(new Action(() => HandleWindowControl(JsonSerializer.Serialize(action))));
        return true;
    }

    private void PublishMaximizedState()
    {
        var next = WindowState == FormWindowState.Maximized;
        if (next == isMaximized) return;
        isMaximized = next;
        PostToWebView(new { type = "event", channel = "window-maximized-state", data = isMaximized });
    }

    private void PostToWebView(object payload)
    {
        if (IsDisposed || !IsHandleCreated) return;
        var json = JsonSerializer.Serialize(payload);
        // WebView2 is a UI-thread COM object: even its properties must stay on that thread.
        try { BeginInvoke(new Action(() =>
        {
            if (!IsDisposed && webView.CoreWebView2 is not null)
                webView.CoreWebView2.PostWebMessageAsJson(json);
        })); }
        catch (InvalidOperationException) when (shutdown.IsCancellationRequested) { }
    }

    private static int GetFreeLoopbackPort()
    {
        var listener = new TcpListener(IPAddress.Loopback, 0);
        listener.Start();
        var port = ((IPEndPoint)listener.LocalEndpoint).Port;
        listener.Stop();
        return port;
    }

    private static string? FindNode()
    {
        var explicitPath = Environment.GetEnvironmentVariable("UNIQUE_NODE_PATH");
        if (!string.IsNullOrWhiteSpace(explicitPath) && File.Exists(explicitPath))
        {
            return explicitPath;
        }

        var localNode = FindFile(Path.Combine("node", "node.exe"));
        if (localNode is not null) return localNode;

        var pathEnv = Environment.GetEnvironmentVariable("PATH") ?? "";
        foreach (var part in pathEnv.Split(Path.PathSeparator))
        {
            var candidate = Path.Combine(part.Trim(), "node.exe");
            if (File.Exists(candidate)) return candidate;
        }
        return null;
    }

    private static string FindProjectRoot()
    {
        var rootEnv = Environment.GetEnvironmentVariable("UNIQUE_WEBVIEW2_ROOT");
        if (!string.IsNullOrWhiteSpace(rootEnv) && File.Exists(Path.Combine(rootEnv, "main.js")))
        {
            return rootEnv;
        }

        var dir = new DirectoryInfo(AppContext.BaseDirectory);
        while (dir is not null)
        {
            if (File.Exists(Path.Combine(dir.FullName, "main.js")) && Directory.Exists(Path.Combine(dir.FullName, "renderer")))
            {
                return dir.FullName;
            }
            dir = dir.Parent;
        }

        return AppContext.BaseDirectory;
    }

    private static string? FindFile(string relativePath)
    {
        var baseCandidate = Path.Combine(AppContext.BaseDirectory, relativePath);
        if (File.Exists(baseCandidate)) return baseCandidate;

        var rootCandidate = Path.Combine(FindProjectRoot(), relativePath);
        return File.Exists(rootCandidate) ? rootCandidate : null;
    }

    [DllImport("user32.dll")]
    private static extern bool ReleaseCapture();

    [DllImport("user32.dll")]
    private static extern IntPtr SendMessage(IntPtr hWnd, int msg, int wParam, int lParam);
}
