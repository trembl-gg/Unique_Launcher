param([string]$NsisPath = $env:UNIQUE_NSIS_PATH)
$ErrorActionPreference = 'Stop'
Import-Module (Join-Path $PSHOME 'Modules/Microsoft.PowerShell.Security/Microsoft.PowerShell.Security.psd1') -ErrorAction Stop
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
$dist = Join-Path $root 'dist'
$package = Get-Content -LiteralPath (Join-Path $root 'package.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$version = [string]$package.version
if ($version -notmatch '^\d+\.\d+\.\d+$') { throw 'Installer requires a three-part numeric version.' }
$icon = Join-Path $root 'unique иконка.ico'
if (!(Test-Path -LiteralPath $icon -PathType Leaf)) { throw 'Application icon is missing.' }
if (!$NsisPath) {
  $compiler = Get-Command makensis.exe -ErrorAction SilentlyContinue
  if ($compiler) { $NsisPath = $compiler.Source }
  else {
    $candidates = @((Join-Path $root 'build/cache/nsis-toolchain/nsis-3.11/makensis.exe'), "${env:ProgramFiles(x86)}\NSIS\makensis.exe", "$env:ProgramFiles\NSIS\makensis.exe")
    $cache = Join-Path $env:LOCALAPPDATA 'electron-builder/Cache/nsis'
    if (Test-Path -LiteralPath $cache) { $candidates += @(Get-ChildItem -LiteralPath $cache -Directory | ForEach-Object { Join-Path $_.FullName 'makensis.exe' }) }
    $NsisPath = $candidates | Where-Object { Test-Path -LiteralPath $_ -PathType Leaf } | Select-Object -First 1
  }
}
if (!$NsisPath) { throw 'NSIS 3 is required. Install NSIS or set UNIQUE_NSIS_PATH to makensis.exe.' }
New-Item -ItemType Directory -Path $dist -Force | Out-Null
$stage = Join-Path $dist ('.installer-stage-' + [Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $stage | Out-Null
$scratch = Join-Path $root 'build/cache'
New-Item -ItemType Directory -Path $scratch -Force | Out-Null
$bootstrap = Join-Path $scratch 'MicrosoftEdgeWebview2Setup.exe'
$manifest = Join-Path $scratch 'uninstall-files.nsh'
$output = Join-Path $dist "UNIQUE-Launcher-Setup-$version.exe"
try {
  & (Join-Path $root 'scripts/build-rust.ps1') -OutputDirectory $stage
  foreach ($asset in @('launcher.ico', 'game.ico', 'unique.png', 'UNIQUE LAUNCHER.exe')) {
    if (!(Test-Path -LiteralPath (Join-Path $stage $asset) -PathType Leaf)) { throw "Missing published asset: $asset" }
  }
  $privateFiles = Get-ChildItem -LiteralPath $stage -Recurse -File -Force | Where-Object { $_.Name -match '^\.env($|\.)|\.(pfx|p12|key|pem)$' }
  if ($privateFiles) { throw 'Potential private files found in package; refusing to create installer.' }
  if (!(Test-Path -LiteralPath $bootstrap)) {
    Invoke-WebRequest -Uri 'https://go.microsoft.com/fwlink/p/?LinkId=2124703' -OutFile $bootstrap -UseBasicParsing
  }
  $signature = Get-AuthenticodeSignature -LiteralPath $bootstrap
  if ($signature.Status -ne 'Valid' -or $signature.SignerCertificate.Subject -notmatch 'O=Microsoft Corporation') { throw 'WebView2 bootstrapper signature validation failed.' }
  $lines = [Collections.Generic.List[string]]::new()
  foreach ($file in Get-ChildItem -LiteralPath $stage -File -Recurse) {
    $relative = $file.FullName.Substring($stage.Length + 1).Replace('$', '$$')
    $lines.Add('Delete "$INSTDIR\' + $relative + '"')
  }
  foreach ($dir in Get-ChildItem -LiteralPath $stage -Directory -Recurse | Sort-Object { $_.FullName.Length } -Descending) {
    $relative = $dir.FullName.Substring($stage.Length + 1).Replace('$', '$$')
    $lines.Add('RMDir "$INSTDIR\' + $relative + '"')
  }
  # Generated manifest, not project source.
  [IO.File]::WriteAllLines($manifest, $lines, [Text.UTF8Encoding]::new($true))
  $publishedIcon = Join-Path $stage 'launcher.ico'
  & $NsisPath /INPUTCHARSET UTF8 "/DAPP_VERSION=$version" "/DAPP_DIR=$stage" "/DAPP_ICON=$publishedIcon" "/DOUTPUT_EXE=$output" "/DWEBVIEW_BOOTSTRAPPER=$bootstrap" "/DUNINSTALL_MANIFEST=$manifest" (Join-Path $root 'build/webview2-installer.nsi')
  if ($LASTEXITCODE -ne 0) { throw 'NSIS compilation failed.' }
  Write-Host "Installer ready: $output"
  $hashAlgorithm = [Security.Cryptography.SHA256]::Create()
  $stream = [IO.File]::OpenRead($output)
  try { Write-Host ('SHA256: ' + [BitConverter]::ToString($hashAlgorithm.ComputeHash($stream)).Replace('-', '').ToLowerInvariant()) }
  finally { $stream.Dispose(); $hashAlgorithm.Dispose() }
} finally {
  $resolvedStage = [IO.Path]::GetFullPath($stage)
  if ($resolvedStage.StartsWith($dist + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -and [IO.Path]::GetFileName($resolvedStage) -match '^\.installer-stage-[0-9a-f]{32}$') {
    Remove-Item -LiteralPath $resolvedStage -Recurse -Force
  }
}
