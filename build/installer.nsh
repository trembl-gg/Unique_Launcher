!macro customCheckAppRunning
  unique_check_running:
    nsExec::ExecToStack `%SYSTEMROOT%\System32\cmd.exe /c tasklist /FI "IMAGENAME eq ${APP_EXECUTABLE_FILENAME}" /FO csv | %SYSTEMROOT%\System32\find.exe "${APP_EXECUTABLE_FILENAME}"`
    Pop $R0
    Pop $R1
    StrCmp $R0 "0" 0 unique_not_running

    MessageBox MB_RETRYCANCEL|MB_ICONEXCLAMATION "UNIQUE LAUNCHER сейчас запущен.$\r$\n$\r$\nЗакройте лаунчер и нажмите «Повторить», чтобы продолжить удаление." /SD IDCANCEL IDRETRY unique_check_running
    Quit

  unique_not_running:
!macroend

!macro customUnInstall
  SetShellVarContext current
  RMDir /r "$INSTDIR"
  RMDir /r "$LOCALAPPDATA\Programs\minecraft-launcher"
!macroend
