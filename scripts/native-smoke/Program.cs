using System.Runtime.InteropServices;
using System.Diagnostics;
using UniqueLauncher.WebView2;

internal static class Program
{
    [STAThread]
    private static void Main(string[] args)
    {
        ApplicationConfiguration.Initialize();
        // An offscreen fixture, not the user's launcher/game. No input or capture is performed.
        using var form = new Form { ShowInTaskbar = false, StartPosition = FormStartPosition.Manual, Location = new(-32000, -32000), Size = new(100, 100) };
        if (args[0] == "--child")
        {
            form.Shown += (_, _) =>
            {
                SendMessage(form.Handle, 0x80, (IntPtr)1, IntPtr.Zero);
                SendMessage(form.Handle, 0x80, IntPtr.Zero, IntPtr.Zero);
                Console.WriteLine(form.Handle.ToInt64()); Console.Out.Flush();
            };
            Application.Run(form);
            return;
        }
        form.Shown += async (_, _) =>
        {
            using var cancel = new CancellationTokenSource();
            var temp = Path.Combine(Path.GetTempPath(), "unique-native-test-" + Guid.NewGuid().ToString("N"));
            Task? iconTask = null;
            Process? child = null;
            IntPtr childWindow = IntPtr.Zero;
            try
            {
                Directory.CreateDirectory(temp);
                var hardware = WindowsHardware.Read(form.Handle);
                if (Convert.ToInt64(hardware["totalMemoryMb"]) <= 0 || Convert.ToInt64(hardware["installedMemoryMb"]) < Convert.ToInt64(hardware["totalMemoryMb"])) throw new Exception("Invalid physical memory report");
                Console.WriteLine(System.Text.Json.JsonSerializer.Serialize(hardware));
                var protection = new CaptureProtection(Path.Combine(temp, "preference.txt"));
                protection.Set(form.Handle, true);
                if (!GetWindowDisplayAffinity(form.Handle, out var affinity) || affinity != 0x11) throw new Exception("Capture exclusion was not applied");
                protection.Set(form.Handle, false);
                if (!GetWindowDisplayAffinity(form.Handle, out affinity) || affinity != 0) throw new Exception("Capture exclusion was not removed");
                child = Process.Start(new ProcessStartInfo(Environment.ProcessPath!, "--child") { UseShellExecute = false, RedirectStandardOutput = true, CreateNoWindow = true })!;
                childWindow = (IntPtr)long.Parse((await child.StandardOutput.ReadLineAsync().WaitAsync(TimeSpan.FromSeconds(5)))!);
                if (SendMessage(childWindow, 0x7F, (IntPtr)1, IntPtr.Zero) != IntPtr.Zero) throw new Exception("Fixture icon was not cleared");
                iconTask = Task.Run(() => GameWindowIcon.ApplyAsync(child.Id, Path.GetFullPath(args[0]), cancel.Token));
                await Task.Delay(2500);
                if (SendMessage(childWindow, 0x7F, (IntPtr)1, IntPtr.Zero) == IntPtr.Zero) throw new Exception("Game icon was not set");
                Console.WriteLine("PASS: cross-process Java-window icon and capture-affinity enable/disable on isolated fixture");
            }
            catch (Exception error) { Console.Error.WriteLine(error); Environment.ExitCode = 1; }
            finally
            {
                if (child is not null)
                {
                    if (childWindow != IntPtr.Zero) PostMessage(childWindow, 0x10, IntPtr.Zero, IntPtr.Zero);
                    try { await child.WaitForExitAsync().WaitAsync(TimeSpan.FromSeconds(5)); }
                    catch (TimeoutException) { child.Kill(); }
                    child.Dispose();
                }
                cancel.Cancel();
                if (iconTask is not null) await iconTask;
                if (Directory.Exists(temp)) Directory.Delete(temp, true);
                form.Close();
            }
        };
        Application.Run(form);
    }
    [DllImport("user32.dll")] private static extern bool GetWindowDisplayAffinity(IntPtr window, out uint affinity);
    [DllImport("user32.dll")] private static extern bool PostMessage(IntPtr window, uint message, IntPtr wParam, IntPtr lParam);
    [DllImport("user32.dll", CharSet = CharSet.Unicode)] private static extern IntPtr SendMessage(IntPtr window, uint message, IntPtr wParam, IntPtr lParam);
}
