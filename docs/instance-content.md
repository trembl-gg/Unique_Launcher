# Instance content and launch arguments

The backend captures account and selected instance in AsyncLocalStorage for each
request. Switching the UI while downloading cannot change that request's paths.
New instances use `game-data/instances/<account hash>/<instance id>` (or the chosen
game storage root). Mods, resourcepacks, shaderpacks, saves, config and the Java
working/game directory are instance-specific. Imports reserve a new instance ID
before extracting files, then save the metadata with that same ID.

The previous implementation shared one game folder and kept mods per Minecraft
version. Those files cannot reliably be assigned to their original instance.
One existing selected instance keeps the legacy shared root; its old versioned
mods are copied once without overwriting. Other instances get separate folders.
Legacy source files are retained. Reimport a pack to restore another instance's
original contents. The settings directory picker still moves the entire game
storage tree, including all instance directories.

Instance settings now include JVM and Minecraft arguments. Values with spaces
must be quoted; backslashes remain literal. Arguments are passed as an array,
never through a shell. JVM options support -D, -XX and -Xss; memory remains under
launcher settings. Account fields and managed paths cannot be overridden through
Minecraft arguments. These settings apply on the next launch and are not copied
to other instances. Invalid quotes/options are rejected on save and launch.

Mods are immediately moved to a local `.trash` subdirectory for the 5-second undo
window; finalization removes that exact file. Texture/shader/world deletion checks
the filename and running-game state. Filesystem errors are shown by the UI.

Ctrl+C selection and a Copy logs button are available in the launch log. Nonzero
unexpected game exits display a full-launcher dialog with the exit code and Close.
Requested successful shutdown does not display a crash screen. Settings no longer
contain the crash-analysis button; logs and diagnostic export remain available.

Tests: `npm test`, including `scripts/check-instance-content.js` and localization
round trips. These are fixture tests, not a live Microsoft login or Minecraft run.
