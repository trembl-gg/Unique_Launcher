. (Join-Path $PSScriptRoot 'rust-env.ps1')
Push-Location $root
try {
    & cargo run --release
    if ($LASTEXITCODE -ne 0) { throw 'Rust launcher failed.' }
} finally { Pop-Location }
