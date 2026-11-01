using System.ComponentModel;
using System.Runtime.InteropServices;

namespace UniqueLauncher.WebView2;

internal sealed class CaptureProtection
{
    private readonly string preference;
    internal CaptureProtection(string? preferencePath = null)
    {
        preference = preferencePath ?? Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "UNIQUE LAUNCHER", "streamer-mode.txt");
    }
    public bool Enabled { get; private set; }
    public void Restore(IntPtr window)
    {
        try { Set(window, File.Exists(preference) && File.ReadAllText(preference).Trim() == "1"); }
        catch (Exception error) { NativeDiagnostics.Write("Streamer mode", error.Message); }
    }
    public object Set(IntPtr window, bool enabled)
    {
        if (enabled && !OperatingSystem.IsWindowsVersionAtLeast(10, 0, 19041))
            return new { success = false, enabled = Enabled, error = "Streamer mode requires Windows 10 2004 or Windows 11." };
        if (!SetWindowDisplayAffinity(window, enabled ? 0x11u : 0u))
            return new { success = false, enabled = Enabled, error = new Win32Exception(Marshal.GetLastWin32Error()).Message };
        try
        {
            Directory.CreateDirectory(Path.GetDirectoryName(preference)!);
            File.WriteAllText(preference, enabled ? "1" : "0");
        }
        catch (Exception error)
        {
            SetWindowDisplayAffinity(window, Enabled ? 0x11u : 0u);
            return new { success = false, enabled = Enabled, error = error.Message };
        }
        Enabled = enabled;
        return new { success = true, enabled = Enabled };
    }
    [DllImport("user32.dll", SetLastError = true)]
    private static extern bool SetWindowDisplayAffinity(IntPtr window, uint affinity);
}
