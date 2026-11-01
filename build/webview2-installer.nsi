Unicode true
!include "MUI2.nsh"
!include "LogicLib.nsh"
!include "x64.nsh"
!include "WinVer.nsh"

!ifndef APP_VERSION
  !error "Use scripts/build-installer.ps1 to compile this installer."
!endif
Name "UNIQUE LAUNCHER"
OutFile "${OUTPUT_EXE}"
InstallDir "$LOCALAPPDATA\Programs\UNIQUE LAUNCHER"
InstallDirRegKey HKCU "Software\UNIQUE LAUNCHER\Installer" "InstallDir"
RequestExecutionLevel user
SetCompressor /SOLID lzma
SetCompressorDictSize 32
Icon "${APP_ICON}"
UninstallIcon "${APP_ICON}"
VIProductVersion "${APP_VERSION}.0"
VIAddVersionKey /LANG=1033 "ProductName" "UNIQUE LAUNCHER"
VIAddVersionKey /LANG=1033 "FileDescription" "UNIQUE LAUNCHER Setup"
VIAddVersionKey /LANG=1033 "FileVersion" "${APP_VERSION}"
VIAddVersionKey /LANG=1033 "LegalCopyright" "UNIQUE LAUNCHER"
!define MUI_ABORTWARNING
!define MUI_ICON "${APP_ICON}"
!define MUI_UNICON "${APP_ICON}"
!define MUI_FINISHPAGE_RUN "$INSTDIR\UNIQUE LAUNCHER.exe"
!insertmacro MUI_PAGE_WELCOME
!insertmacro MUI_PAGE_DIRECTORY
!insertmacro MUI_PAGE_INSTFILES
!insertmacro MUI_PAGE_FINISH
!insertmacro MUI_UNPAGE_CONFIRM
!insertmacro MUI_UNPAGE_INSTFILES
!insertmacro MUI_LANGUAGE "English"
!insertmacro MUI_LANGUAGE "Russian"
!insertmacro MUI_LANGUAGE "Spanish"

Function CheckWebView
  StrCpy $1 ""
  ReadRegStr $1 HKCU "Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
  ${If} $1 == ""
    SetRegView 32
    ReadRegStr $1 HKLM "Software\Microsoft\EdgeUpdate\Clients\{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}" "pv"
    SetRegView lastused
  ${EndIf}
  ${If} $1 == "0.0.0.0"
    StrCpy $1 ""
  ${EndIf}
FunctionEnd

Function .onInit
  !insertmacro MUI_LANGDLL_DISPLAY
  ${IfNot} ${RunningX64}
    MessageBox MB_ICONSTOP "UNIQUE LAUNCHER requires 64-bit Windows."
    Abort
  ${EndIf}
  ${IfNot} ${AtLeastWin10}
    MessageBox MB_ICONSTOP "UNIQUE LAUNCHER requires Windows 10 or newer."
    Abort
  ${EndIf}
  FindWindow $0 "" "UNIQUE LAUNCHER"
  ${If} $0 != 0
    MessageBox MB_ICONEXCLAMATION "Close UNIQUE LAUNCHER before installing."
    Abort
  ${EndIf}
FunctionEnd

Section "UNIQUE LAUNCHER" SEC_MAIN
  Call CheckWebView
  ${If} $1 == ""
    MessageBox MB_YESNO|MB_ICONQUESTION "Microsoft Edge WebView2 Runtime is required. Install it now? Internet access is needed." /SD IDNO IDYES install_runtime
    Abort
    install_runtime:
    InitPluginsDir
    SetOutPath "$PLUGINSDIR"
    File /oname=WebView2Setup.exe "${WEBVIEW_BOOTSTRAPPER}"
    ExecWait '"$PLUGINSDIR\WebView2Setup.exe" /silent /install' $0
    Call CheckWebView
    ${If} $1 == ""
      MessageBox MB_ICONSTOP "WebView2 Runtime was not installed. Install it from Microsoft, then run Setup again."
      Abort
    ${EndIf}
  ${EndIf}
  SetOutPath "$INSTDIR"
  File /r "${APP_DIR}\*"
  WriteUninstaller "$INSTDIR\uninstaller.exe"
  CreateDirectory "$SMPROGRAMS\UNIQUE LAUNCHER"
  CreateShortcut "$SMPROGRAMS\UNIQUE LAUNCHER\Uninstall UNIQUE LAUNCHER.lnk" "$INSTDIR\uninstaller.exe"
  CreateShortcut "$SMPROGRAMS\UNIQUE LAUNCHER\UNIQUE LAUNCHER.lnk" "$INSTDIR\UNIQUE LAUNCHER.exe" "" "$INSTDIR\UNIQUE LAUNCHER.exe" 0
  CreateShortcut "$DESKTOP\UNIQUE LAUNCHER.lnk" "$INSTDIR\UNIQUE LAUNCHER.exe" "" "$INSTDIR\UNIQUE LAUNCHER.exe" 0
  System::Call 'shell32::SHChangeNotify(i 0x08000000, i 0, p 0, p 0)'
  WriteRegStr HKCU "Software\UNIQUE LAUNCHER\Installer" "InstallDir" "$INSTDIR"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\UniqueLauncherWebView2" "DisplayName" "UNIQUE LAUNCHER"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\UniqueLauncherWebView2" "DisplayVersion" "${APP_VERSION}"
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\UniqueLauncherWebView2" "DisplayIcon" '$\"$INSTDIR\UNIQUE LAUNCHER.exe$\",0'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\UniqueLauncherWebView2" "UninstallString" '$\"$INSTDIR\uninstaller.exe$\"'
  WriteRegStr HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\UniqueLauncherWebView2" "InstallLocation" "$INSTDIR"
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\UniqueLauncherWebView2" "NoModify" 1
  WriteRegDWORD HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\UniqueLauncherWebView2" "NoRepair" 1
SectionEnd

Function un.onInit
  FindWindow $0 "" "UNIQUE LAUNCHER"
  ${If} $0 != 0
    MessageBox MB_ICONEXCLAMATION "Close UNIQUE LAUNCHER before uninstalling."
    Abort
  ${EndIf}
FunctionEnd
Section "Uninstall"
  ; Exact packaged files only. No recursive deletion of the install directory
  ; and no deletion of AppData accounts, instances, skins or worlds.
  !include "${UNINSTALL_MANIFEST}"
  Delete "$INSTDIR\Uninstall.exe"
  Delete "$INSTDIR\uninstaller.exe"
  RMDir "$INSTDIR"
  Delete "$DESKTOP\UNIQUE LAUNCHER.lnk"
  Delete "$SMPROGRAMS\UNIQUE LAUNCHER\UNIQUE LAUNCHER.lnk"
  Delete "$SMPROGRAMS\UNIQUE LAUNCHER\Uninstall UNIQUE LAUNCHER.lnk"
  RMDir "$SMPROGRAMS\UNIQUE LAUNCHER"
  DeleteRegKey HKCU "Software\UNIQUE LAUNCHER\Installer"
  DeleteRegKey HKCU "Software\Microsoft\Windows\CurrentVersion\Uninstall\UniqueLauncherWebView2"
SectionEnd
