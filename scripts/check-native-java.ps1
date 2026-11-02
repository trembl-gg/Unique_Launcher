param([string]$Executable = '')
$ErrorActionPreference = 'Stop'
$taskRoot = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (!$Executable) { $Executable = Join-Path $taskRoot 'native/target/release/unique-launcher-native.exe' }
$taskJava = (Get-Command java.exe -ErrorAction Stop).Source
$taskJavac = (Get-Command javac.exe -ErrorAction Stop).Source
$taskJar = (Get-Command jar.exe -ErrorAction Stop).Source
$taskFolder = Join-Path $taskRoot ('.tools/native-java-' + [Guid]::NewGuid().ToString('N'))
$taskProfile = Join-Path $taskFolder 'profile with spaces'
$taskGame = Join-Path $taskProfile 'minecraft'
$taskVersion = Join-Path $taskGame 'versions/1.20.1'
$taskAssets = Join-Path $taskGame 'assets/indexes'
New-Item -ItemType Directory -Path $taskVersion,$taskAssets -Force | Out-Null
$taskSource = @'
import java.nio.file.*;
public class NativeLaunchFixture {
  public static void main(String[] args) throws Exception {
    if (args.length != 4 || !args[0].equals("--username") || !args[1].equals("NativeQA") || !args[2].equals("--gameDir") || !Path.of(args[3]).isAbsolute() || !Path.of(args[3]).equals(Path.of("").toAbsolutePath())) throw new IllegalStateException("Native launcher arguments/cwd are wrong");
    System.out.println("NATIVE_JAVA_FIXTURE_OK");
    Thread.sleep(600);
  }
}
'@
[IO.File]::WriteAllText((Join-Path $taskFolder 'NativeLaunchFixture.java'), $taskSource)
& $taskJavac (Join-Path $taskFolder 'NativeLaunchFixture.java')
if ($LASTEXITCODE -ne 0) { throw 'Java fixture compilation failed' }
$taskClient = Join-Path $taskVersion '1.20.1.jar'
& $taskJar --create --file $taskClient -C $taskFolder NativeLaunchFixture.class
if ($LASTEXITCODE -ne 0) { throw 'Java fixture archive failed' }
$taskIndex = Join-Path $taskAssets 'native-fixture.json'
[IO.File]::WriteAllText($taskIndex, '{"objects":{}}')
$taskManifest = @{
  id='1.20.1'; javaVersion=@{majorVersion=17}; mainClass='NativeLaunchFixture'; libraries=@();
  downloads=@{client=@{url='https://example.invalid/fixture.jar'; sha1=(Get-FileHash -LiteralPath $taskClient -Algorithm SHA1).Hash.ToLowerInvariant(); size=(Get-Item -LiteralPath $taskClient).Length}};
  assetIndex=@{id='native-fixture'; url='https://example.invalid/assets.json'; sha1=(Get-FileHash -LiteralPath $taskIndex -Algorithm SHA1).Hash.ToLowerInvariant(); size=(Get-Item -LiteralPath $taskIndex).Length};
  arguments=@{jvm=@('-Djava.library.path=${natives_directory}','-cp','${classpath}');game=@('--username','${auth_player_name}','--gameDir','${game_directory}')}
}
[IO.File]::WriteAllText((Join-Path $taskVersion '1.20.1.json'), ($taskManifest | ConvertTo-Json -Depth 15))
$taskConfig = @{ lastSession=@{nickname='NativeQA';guest=$true};settings=@{javaPath=$taskJava;memory=@{max=512}};buildInstances=@{NativeQA=@(@{id='native_fixture';name='Native Java fixture';minecraftVersion='1.20.1';loader='vanilla'})} }
[IO.File]::WriteAllText((Join-Path $taskProfile 'launcher-data.json'), ($taskConfig | ConvertTo-Json -Depth 15))
$taskPreviousProfile = $env:UNIQUE_NATIVE_DATA
try {
  $env:UNIQUE_NATIVE_DATA=$taskProfile
  foreach ($taskCancel in @($false,$true)) {
    $taskReport=Join-Path $taskFolder $(if ($taskCancel) {'cancel.json'} else {'launch.json'})
    $taskArguments=@('--launch-probe',('"'+$taskReport+'"'))
    if ($taskCancel) { $taskArguments += '--cancel-after-start' }
    $taskProcess=Start-Process -FilePath $Executable -ArgumentList $taskArguments -WindowStyle Hidden -PassThru
    if (!$taskProcess.WaitForExit(45000)) { Stop-Process -Id $taskProcess.Id; throw 'Native Java fixture timed out' }
    $taskResult=Get-Content -LiteralPath $taskReport -Raw | ConvertFrom-Json
    if (!$taskResult.success -or (!$taskCancel -and $taskResult.exitCode -ne 0)) { throw ('Native launch fixture failed: '+($taskResult|ConvertTo-Json -Compress)) }
  }
  $taskLog=Get-Content -LiteralPath (Join-Path $taskProfile 'logs/native-game.log') -Raw
  foreach ($taskRequired in @('NATIVE_JAVA_FIXTURE_OK','method=process-exit','method=process-kill')) { if (!$taskLog.Contains($taskRequired)) { throw ('Native log missing '+$taskRequired) } }
  $taskManifest.javaVersion.majorVersion=999
  [IO.File]::WriteAllText((Join-Path $taskVersion '1.20.1.json'), ($taskManifest | ConvertTo-Json -Depth 15))
  $taskReport=Join-Path $taskFolder 'java-required.json'
  $taskProcess=Start-Process -FilePath $Executable -ArgumentList @('--launch-probe',('"'+$taskReport+'"')) -WindowStyle Hidden -PassThru
  if (!$taskProcess.WaitForExit(45000)) { Stop-Process -Id $taskProcess.Id; throw 'Java compatibility fixture timed out' }
  $taskResult=Get-Content -LiteralPath $taskReport -Raw | ConvertFrom-Json
  if ($taskResult.success -or !$taskResult.error.Contains('Java 999')) { throw 'Native launcher ignored required Java version' }
  Write-Output 'PASS: real Java process, Minecraft argument substitution, spaced paths/cwd, offline identity, normal exit, user cancellation, required-Java error and persisted lifecycle logs'
  Write-Output ('Fixture report: '+$taskFolder)
} finally { $env:UNIQUE_NATIVE_DATA=$taskPreviousProfile }
