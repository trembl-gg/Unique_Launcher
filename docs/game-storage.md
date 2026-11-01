# Game storage and uninstall

New profiles with no existing game directory use `game-data` beside `main.js`
(beside the launcher executable in the installed distribution). The launcher
must have write permission there. Accounts and settings remain in user AppData.
Existing installations keep their previous Minecraft folder until changed.

Settings → Game → Game folder offers a directory picker and a shortcut to the
default folder beside the launcher. Select an **empty** folder. Changing this
setting schedules copying for the next launcher startup, before game/download
operations start. Close Minecraft first. Copying and SHA-256 verification may
take several minutes and need disk space for a complete second copy.

The source is never deleted. A failed or interrupted copy does not switch the
active path; a partial destination is left for inspection. Choose a different
empty folder to retry. Linked files/directories are rejected. Settings expose
the active path, pending destination, and migration errors. This changes the
existing shared game root; it does not redesign per-instance isolation.

The installer creates `uninstaller.exe` in its installation directory and an
`Uninstall UNIQUE LAUNCHER` Start Menu shortcut. It runs per-user, without opening
Windows Settings or requesting elevation. It removes only installer-owned files;
game data and account data are retained. Institutional execution policies and
filesystem permissions still apply. An EXE uninstaller is created by NSIS during
installation, not by `npm start`.

Network filtering and Spotify account/API restrictions are different problems.
No public proxy, packet interception driver, TLS verification bypass, antivirus
exclusion or automatic network bypass is bundled by this change. A Kaspersky
diagnosis still requires the detection name and affected path from its report.
