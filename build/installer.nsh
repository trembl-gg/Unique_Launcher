!include LogicLib.nsh
!include FileFunc.nsh

!define /ifndef INSTALL_REGISTRY_KEY "Software\${APP_GUID}"

!ifndef BUILD_UNINSTALLER
Function uniqueResolveExistingInstallDir
  StrCpy $R9 ""

  ReadRegStr $R9 HKCU "${INSTALL_REGISTRY_KEY}" InstallLocation
  ${If} $R9 == ""
    ReadRegStr $R9 HKLM "${INSTALL_REGISTRY_KEY}" InstallLocation
  ${EndIf}

  ${If} $R9 != ""
  ${AndIf} ${FileExists} "$R9\${PRODUCT_FILENAME}.exe"
    StrCpy $INSTDIR "$R9"
  ${EndIf}
FunctionEnd

!macro customInit
  ${If} ${Silent}
    Call uniqueResolveExistingInstallDir
  ${EndIf}

  ${GetParameters} $R8
  ${GetOptions} $R8 "--updated" $R9
  ${IfNot} ${Errors}
    Call uniqueResolveExistingInstallDir
    SetSilent silent
  ${EndIf}
!macroend
!endif

!macro customCheckAppRunning
  unique_check_running:
    ${nsProcess::FindProcess} "${APP_EXECUTABLE_FILENAME}" $R0
    StrCmp $R0 "0" 0 unique_not_running

    MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "UNIQUE LAUNCHER сейчас запущен.$\r$\n$\r$\nЗакройте лаунчер и нажмите «Повторить», чтобы продолжить удаление." /SD IDCANCEL IDRETRY unique_check_running
    Quit

  unique_not_running:
!macroend

!macro customRemoveFiles
  ${IfNot} ${Silent}
    RMDir /r "$INSTDIR"
  ${EndIf}
  RMDir /r "$LOCALAPPDATA\Programs\minecraft-launcher"
!macroend

!macro customUnInstall
  SetShellVarContext current
  ${IfNot} ${Silent}
    RMDir /r "$INSTDIR"
  ${EndIf}
  RMDir /r "$LOCALAPPDATA\Programs\minecraft-launcher"
!macroend
