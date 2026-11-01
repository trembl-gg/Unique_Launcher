param([string]$OutputDirectory = '')
. (Join-Path $PSScriptRoot 'rust-env.ps1')
if (!$OutputDirectory) { $OutputDirectory = Join-Path $root 'dist/rust' }
$output = [IO.Path]::GetFullPath($OutputDirectory)
if (!$output.StartsWith($root + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
    throw 'Build output must be inside the project directory.'
}
$node = if ($env:UNIQUE_NODE_PATH) { $env:UNIQUE_NODE_PATH } else { (Get-Command node.exe -ErrorAction Stop).Source }
$npm = (Get-Command npm.cmd -ErrorAction Stop).Source
Push-Location $root
try {
    & cargo build --release --locked
    if ($LASTEXITCODE -ne 0) { throw 'Rust build failed.' }
    New-Item -ItemType Directory -Force -Path $output | Out-Null
    Copy-Item -LiteralPath (Join-Path $root 'target/release/unique-launcher.exe') -Destination (Join-Path $output 'UNIQUE LAUNCHER.exe') -Force
    $target = ((& rustc -vV | Select-String '^host: ').ToString()).Substring(6)
    $metadata = (& cargo metadata --format-version 1 --locked --offline --filter-platform $target | ConvertFrom-Json)
    if ($LASTEXITCODE -ne 0) { throw 'Cannot locate WebView2 runtime loader.' }
    $webview = $metadata.packages | Where-Object name -eq 'webview2-com-sys' | Select-Object -First 1
    $loader = Join-Path (Split-Path $webview.manifest_path -Parent) 'x64/WebView2Loader.dll'
    Copy-Item -LiteralPath $loader -Destination $output -Force
    foreach ($folder in @('renderer', 'lib')) {
        Copy-Item -LiteralPath (Join-Path $root $folder) -Destination $output -Recurse -Force
    }
    New-Item -ItemType Directory -Force -Path (Join-Path $output 'webview2'), (Join-Path $output 'node') | Out-Null
    foreach ($file in @('node-backend.js', 'electron-shim.js')) {
        Copy-Item -LiteralPath (Join-Path $root "webview2/$file") -Destination (Join-Path $output 'webview2') -Force
    }
    foreach ($file in @('main.js', 'package.json', 'package-lock.json', 'game.ico', 'unique.png')) {
        Copy-Item -LiteralPath (Join-Path $root $file) -Destination $output -Force
    }
    Copy-Item -LiteralPath (Join-Path $root 'unique иконка.ico') -Destination (Join-Path $output 'launcher.ico') -Force
    Copy-Item -LiteralPath $node -Destination (Join-Path $output 'node/node.exe') -Force
    & $node (Join-Path $root 'scripts/export-spotify-config.js') $output
    if ($LASTEXITCODE -ne 0) { throw 'Cannot export public Spotify configuration.' }
    & $node (Join-Path $root 'scripts/package-horizon.js') $output
    if ($LASTEXITCODE -ne 0) { throw 'Cannot package the Horizon game client.' }
    Push-Location $output
    try {
        & $npm ci --omit=dev --ignore-scripts --no-audit --no-fund
        if ($LASTEXITCODE -ne 0) { throw 'Backend dependency installation failed.' }
    } finally { Pop-Location }
    Write-Host "Rust launcher ready: $output"
} finally { Pop-Location }
