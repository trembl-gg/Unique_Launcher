using System.Runtime.InteropServices;

namespace UniqueLauncher.WebView2;

internal static class WindowsHardware
{
    internal static Dictionary<string, object?> Read(IntPtr window)
    {
        var monitor = Screen.FromHandle(window);
        var mode = new DisplayMode { Size = (ushort)Marshal.SizeOf<DisplayMode>() };
        int? hz = EnumDisplaySettings(monitor.DeviceName, -1, ref mode) && mode.Frequency > 1 ? (int)mode.Frequency : null;
        var memory = new MemoryStatus { Length = (uint)Marshal.SizeOf<MemoryStatus>() };
        var valid = GlobalMemoryStatusEx(ref memory);
        long? usable = valid ? (long)(memory.TotalPhysical / 1048576) : null;
        long? free = valid ? (long)(memory.AvailablePhysical / 1048576) : null;
        long? installed = GetPhysicallyInstalledSystemMemory(out var kb) ? (long)(kb / 1024) : usable;
        return new Dictionary<string, object?> {
            ["refreshRate"] = hz, ["monitorName"] = monitor.DeviceName,
            ["totalMemoryMb"] = usable, ["installedMemoryMb"] = installed, ["availableMemoryMb"] = free,
            ["maxGameMemoryMb"] = usable.HasValue ? Math.Max(1024, (usable.Value - Math.Max(1024, Math.Min(2048, usable.Value / 4))) / 256 * 256) : null
        };
    }
    // DEVMODEW: native API fills the full 220-byte structure; only these fields are read.
    [StructLayout(LayoutKind.Explicit, Size = 220)]
    private struct DisplayMode { [FieldOffset(68)] public ushort Size; [FieldOffset(184)] public uint Frequency; }
    [StructLayout(LayoutKind.Sequential)]
    private struct MemoryStatus {
        public uint Length, Load;
        public ulong TotalPhysical, AvailablePhysical, TotalPageFile, AvailablePageFile, TotalVirtual, AvailableVirtual, AvailableExtendedVirtual;
    }
    [DllImport("user32.dll", EntryPoint = "EnumDisplaySettingsW", CharSet = CharSet.Unicode)]
    private static extern bool EnumDisplaySettings(string device, int mode, ref DisplayMode result);
    [DllImport("kernel32.dll")] private static extern bool GlobalMemoryStatusEx(ref MemoryStatus status);
    [DllImport("kernel32.dll")] private static extern bool GetPhysicallyInstalledSystemMemory(out ulong kilobytes);
}
