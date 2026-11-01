$ErrorActionPreference = 'Stop'
$root = [IO.Path]::GetFullPath((Join-Path $PSScriptRoot '..'))
if (Test-Path -LiteralPath (Join-Path $root '.tools/cargo/bin/cargo.exe')) {
    $env:CARGO_HOME = Join-Path $root '.tools/cargo'
    $env:RUSTUP_HOME = Join-Path $root '.tools/rustup'
    $env:PATH = (Join-Path $env:CARGO_HOME 'bin') + ';' + $env:PATH
}
if (Test-Path -LiteralPath (Join-Path $root '.tools/mingw/mingw64/bin')) {
    $env:PATH = (Join-Path $root '.tools/mingw/mingw64/bin') + ';' + $env:PATH
}
Get-Command cargo -ErrorAction Stop | Out-Null
