@echo off
setlocal enabledelayedexpansion

set "ROOT=%~dp0"
set "OUT=%ROOT%dist\webview2"
set "PROJECT=%ROOT%webview2\UniqueLauncher.WebView2.csproj"

where dotnet >nul 2>nul
if errorlevel 1 (
  echo .NET SDK is required to build the WebView2 launcher.
  echo Install .NET 8 SDK: https://dotnet.microsoft.com/download/dotnet/8.0
  exit /b 1
)

dotnet --list-sdks | findstr /r "^8\." >nul
if errorlevel 1 (
  echo .NET 8 SDK was not found. Runtime is not enough for building.
  echo Install .NET 8 SDK: https://dotnet.microsoft.com/download/dotnet/8.0
  exit /b 1
)

if exist "%OUT%" (
  powershell -NoProfile -ExecutionPolicy Bypass -Command "Remove-Item -LiteralPath '%OUT%' -Recurse -Force"
)

dotnet publish "%PROJECT%" -c Release -r win-x64 --self-contained false -o "%OUT%"
if errorlevel 1 exit /b 1

copy /y "%ROOT%main.js" "%OUT%\main.js" >nul
copy /y "%ROOT%webview2\node-backend.js" "%OUT%\node-backend.js" >nul
copy /y "%ROOT%webview2\electron-shim.js" "%OUT%\electron-shim.js" >nul
copy /y "%ROOT%webview2\package.backend.json" "%OUT%\package.json" >nul

pushd "%OUT%"
npm install --omit=dev --ignore-scripts
if errorlevel 1 (
  popd
  exit /b 1
)
popd

if /i "%UNIQUE_BUNDLE_NODE%"=="1" (
  if not defined UNIQUE_NODE_PATH (
    for %%N in (node.exe) do set "UNIQUE_NODE_PATH=%%~$PATH:N"
  )
  if not exist "%UNIQUE_NODE_PATH%" (
    echo UNIQUE_BUNDLE_NODE=1 but node.exe was not found. Set UNIQUE_NODE_PATH.
    exit /b 1
  )
  mkdir "%OUT%\node" 2>nul
  copy /y "%UNIQUE_NODE_PATH%" "%OUT%\node\node.exe" >nul
)

echo WebView2 build is ready: %OUT%
echo To keep the build small, node.exe is not bundled unless UNIQUE_BUNDLE_NODE=1.
endlocal
