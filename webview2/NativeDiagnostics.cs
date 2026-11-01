namespace UniqueLauncher.WebView2;

internal static class NativeDiagnostics
{
    private static readonly object Sync = new();
    internal static void Write(string source, string message)
    {
        try
        {
            lock (Sync)
            {
                var directory = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData), "minecraft-launcher", "logs");
                Directory.CreateDirectory(directory);
                var file = Path.Combine(directory, "native-host.log");
                if (File.Exists(file) && new FileInfo(file).Length > 1024 * 1024) File.Move(file, file + ".previous", true);
                File.AppendAllText(file, $"{DateTimeOffset.Now:O} [{source}] {message}\n");
            }
        }
        catch { }
    }
}
