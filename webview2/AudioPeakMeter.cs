using System.Runtime.InteropServices;

namespace UniqueLauncher.WebView2;

// Reads output levels only: no microphone, audio recording, or network traffic.
internal sealed class AudioPeakMeter : IDisposable
{
    private IAudioMeterInformation? meter;
    private DateTime refreshed;

    public float Read()
    {
        try
        {
            if (meter is null || DateTime.UtcNow - refreshed > TimeSpan.FromSeconds(3))
            {
                Dispose();
                var enumerator = (IMMDeviceEnumerator)new MMDeviceEnumerator();
                IMMDevice? device = null;
                try
                {
                    Marshal.ThrowExceptionForHR(enumerator.GetDefaultAudioEndpoint(0, 1, out device));
                    var iid = typeof(IAudioMeterInformation).GUID;
                    Marshal.ThrowExceptionForHR(device.Activate(ref iid, 23, IntPtr.Zero, out var instance));
                    meter = (IAudioMeterInformation)instance;
                    refreshed = DateTime.UtcNow;
                }
                finally
                {
                    if (device is not null) Marshal.ReleaseComObject(device);
                    Marshal.ReleaseComObject(enumerator);
                }
            }
            Marshal.ThrowExceptionForHR(meter.GetPeakValue(out var value));
            return Math.Clamp(value, 0, 1);
        }
        catch { Dispose(); throw; }
    }

    public void Dispose()
    {
        if (meter is not null) { Marshal.ReleaseComObject(meter); meter = null; }
    }

    [ComImport, Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
    private class MMDeviceEnumerator { }

    [ComImport, Guid("A95664D2-9614-4F35-A746-DE8DB63617E6"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IMMDeviceEnumerator
    {
        [PreserveSig] int EnumAudioEndpoints(int flow, uint state, out IntPtr devices);
        [PreserveSig] int GetDefaultAudioEndpoint(int flow, int role, out IMMDevice device);
    }

    [ComImport, Guid("D666063F-1587-4E43-81F1-B948E807363F"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IMMDevice
    {
        [PreserveSig] int Activate(ref Guid iid, uint context, IntPtr parameters, [MarshalAs(UnmanagedType.IUnknown)] out object instance);
    }

    [ComImport, Guid("C02216F6-8C67-4B5B-9D00-D008E73E0064"), InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
    private interface IAudioMeterInformation
    {
        [PreserveSig] int GetPeakValue(out float peak);
    }
}
