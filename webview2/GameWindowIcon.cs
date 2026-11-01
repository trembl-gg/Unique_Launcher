using System.Diagnostics;
using System.Drawing;
using System.Runtime.InteropServices;

namespace UniqueLauncher.WebView2;

/// <summary>Brands only the Java process launched by this launcher, never other Java windows.</summary>
internal static class GameWindowIcon
{
    public static async Task ApplyAsync(int pid, string iconPath, CancellationToken shutdown)
    {
        if (pid <= 0) return;
        try
        {
            using var game = Process.GetProcessById(pid);
            if (!game.ProcessName.Equals("java", StringComparison.OrdinalIgnoreCase)
                && !game.ProcessName.Equals("javaw", StringComparison.OrdinalIgnoreCase)) return;
            using var small = new Icon(iconPath, 16, 16);
            using var large = new Icon(iconPath, 48, 48);
            var branded = new HashSet<IntPtr>();
            NativeDiagnostics.Write("Game icon", $"Watching Minecraft pid={pid}");
            // Holding this Process object avoids following a later process that reuses the PID.
            while (!shutdown.IsCancellationRequested && !game.HasExited)
            {
                EnumWindows((window, _) =>
                {
                    GetWindowThreadProcessId(window, out var owner);
                    if (owner != (uint)pid || !IsWindowVisible(window)) return true;
                    if (branded.Add(window))
                    {
                        GameTaskbarIdentity.Apply(window, iconPath);
                        NativeDiagnostics.Write("Game icon", $"Found window {window} for pid={pid}");
                    }
                    SetIfChanged(window, 0, small.Handle);
                    SetIfChanged(window, 1, large.Handle);
                    return true;
                }, IntPtr.Zero);
                // Also handles fullscreen/window recreation and mods resetting the icon.
                await Task.Delay(2000, shutdown);
            }
        }
        catch (OperationCanceledException) { }
        catch (Exception error) { NativeDiagnostics.Write("Game icon", error.Message); }
    }

    private static void SetIfChanged(IntPtr window, int size, IntPtr icon)
    {
        const uint abortIfHung = 2;
        if (SendMessageTimeout(window, 0x007F, (IntPtr)size, IntPtr.Zero, abortIfHung, 100, out var current) == IntPtr.Zero) return;
        if (current != icon && SendMessageTimeout(window, 0x0080, (IntPtr)size, icon, abortIfHung, 100, out _) == IntPtr.Zero)
            NativeDiagnostics.Write("Game icon", $"WM_SETICON failed: {Marshal.GetLastWin32Error()}");
    }

    private delegate bool EnumWindowProc(IntPtr window, IntPtr parameter);
    [DllImport("user32.dll")] private static extern bool EnumWindows(EnumWindowProc callback, IntPtr parameter);
    [DllImport("user32.dll")] private static extern bool IsWindowVisible(IntPtr window);
    [DllImport("user32.dll")] private static extern uint GetWindowThreadProcessId(IntPtr window, out uint processId);
    [DllImport("user32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr SendMessageTimeout(IntPtr window, uint message, IntPtr wParam, IntPtr lParam, uint flags, uint timeout, out IntPtr result);
}
