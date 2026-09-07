using Microsoft.Web.WebView2.Core;
using Microsoft.Web.WebView2.WinForms;
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

    private readonly WebView2 webView = new();
    private readonly HttpClient http = new();
    private readonly CancellationTokenSource shutdown = new();
    private Process? backendProcess;
    private int backendPort;
    private bool isMaximized;

    public LauncherForm()
    {
        Text = "UNIQUE LAUNCHER";
        MinimumSize = new System.Drawing.Size(1120, 720);
        StartPosition = FormStartPosition.CenterScreen;
        FormBorderStyle = FormBorderStyle.None;
        WindowState = FormWindowState.Maximized;

        var iconPath = FindFile("unique иконка.ico");
        if (iconPath is not null)
        {
            Icon = new System.Drawing.Icon(iconPath);
        }

        webView.Dock = DockStyle.Fill;
        Controls.Add(webView);
        Resize += (_, _) => PublishMaximizedState();
        FormClosed += (_, _) => StopBackend();
    }

    protected override async void OnLoad(EventArgs e)
    {
        base.OnLoad(e);

        try
        {
            backendPort = GetFreeLoopbackPort();
            StartBackend(backendPort);
            await WaitForBackendAsync();
            await InitializeWebViewAsync();
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
        await webView.EnsureCoreWebView2Async();
        webView.CoreWebView2.Settings.AreDefaultContextMenusEnabled = false;
        webView.CoreWebView2.Settings.AreDevToolsEnabled = true;
        webView.CoreWebView2.WebMessageReceived += OnWebMessageReceived;

        var rendererIndex = FindFile(Path.Combine("renderer", "index.html"))
            ?? throw new FileNotFoundException("renderer/index.html was not found.");
        webView.CoreWebView2.Navigate(new Uri(rendererIndex).AbsoluteUri);
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
        backendProcess.OutputDataReceived += (_, args) => Debug.WriteLine(args.Data);
        backendProcess.ErrorDataReceived += (_, args) => Debug.WriteLine(args.Data);
        backendProcess.BeginOutputReadLine();
        backendProcess.BeginErrorReadLine();
    }

    private void StopBackend()
    {
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

        while (DateTimeOffset.UtcNow < deadline)
        {
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
                var result = await InvokeAsync(channel, payload);
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
            "choose-file" => HandleChooseFile(payloadJson),
            "choose-directory" => HandleChooseDirectory(),
            _ => await ForwardToBackendAsync(channel, payloadJson)
        };
    }

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
        var url = $"http://127.0.0.1:{backendPort}/invoke/{Uri.EscapeDataString(channel)}";
        using var content = new StringContent(payloadJson, Encoding.UTF8, "application/json");
        using var response = await http.PostAsync(url, content);
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
        return result.Clone();
    }

    private async Task PumpBackendEventsAsync(CancellationToken token)
    {
        try
        {
            using var stream = await http.GetStreamAsync($"http://127.0.0.1:{backendPort}/events", token);
            using var reader = new StreamReader(stream);
            while (!token.IsCancellationRequested)
            {
                var line = await reader.ReadLineAsync();
                if (line is null) break;
                if (!line.StartsWith("data: ", StringComparison.Ordinal)) continue;

                using var document = JsonDocument.Parse(line[6..]);
                var channel = document.RootElement.GetProperty("channel").GetString();
                var data = document.RootElement.GetProperty("data").Clone();
                if (channel == "window-control" && HandleBackendWindowControl(data))
                {
                    continue;
                }

                PostToWebView(new
                {
                    type = "event",
                    channel,
                    data
                });
            }
        }
        catch
        {
            // Event stream is best-effort; invoke requests still report direct errors.
        }
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
        if (webView.CoreWebView2 is null || IsDisposed) return;
        var json = JsonSerializer.Serialize(payload);
        BeginInvoke(new Action(() => webView.CoreWebView2.PostWebMessageAsJson(json)));
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
