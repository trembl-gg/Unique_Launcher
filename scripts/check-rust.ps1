. (Join-Path $PSScriptRoot 'rust-env.ps1')
Push-Location $root
try {
    & cargo test --locked
    if ($LASTEXITCODE -ne 0) { throw 'Rust tests failed.' }
} finally { Pop-Location }
