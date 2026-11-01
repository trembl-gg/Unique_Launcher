# Launcher services

The default native host is now Rust (`rust/main.rs`, Tao/Wry). It owns the window,
system integrations and IPC. The game backend below is still JavaScript in a
Node.js child process; this is an incremental migration, not a complete Rust
rewrite. Rust mode uses private stdin/stdout instead of the legacy loopback HTTP
transport. See `rust-migration.md` for the exact boundary and build commands.

`main.js` still wires IPC and legacy subsystems. The refactoring is incremental;
it is not yet a fully separated application layer.

| Service | Responsibility |
| --- | --- |
| SettingsService | Normalize and persist global/per-account preferences; skip unchanged writes |
| InstanceRepository | Store instance metadata, avatars, favorites and selection |
| JavaService | Discover/probe Java; cache successful probes by executable file fingerprint |
| LoaderService | Prepare Vanilla/Fabric/Forge/NeoForge/Quilt profiles; loaded only on demand |
| LaunchSession | Cancellation, process lifetime and idempotent completion |
| DiscordPresence / DiscordActivity | RPC transport state and activity formatting |
| RequestCache | Public Modrinth metadata: concurrent-request sharing, TTL and bounded LRU |
| AmbientBackground | Canvas lifetime, visibility and reduced-motion rendering |
| LauncherExperiments | Spotify accent and output-level visualization |

Dependency injection keeps native APIs and storage replaceable in tests. Existing
function adapters in main.js preserve callers while subsystems are migrated.

## Performance bounds

- Modrinth cache: 30 seconds, 32 entries, 4 MiB serialized payload estimate.
  JavaScript object overhead and in-flight response memory are additional.
  Errors are not cached; returned values are cloned to prevent shared mutation.
- Java: up to 32 successful executable probes, invalidated by size/mtime/ctime.
- Hidden background: no scheduled animation frames. Reduced motion: one redraw
  per resize/theme/visibility change, no continuous loop.
- Account tokens and auth responses do not enter the public request cache.

## Validation

`npm run check` checks all top-level JS files in the application module folders.
`npm test` covers session regression, settings/instances, cancellation, RPC account
types, metadata coalescing/eviction/retry, Java probes, loader dispatch/rules and
background lifecycle. These tests do not replace live Minecraft/Discord testing.

## Remaining work

Authentication, Modrinth installs, diagnostics, asset generation and much of the
renderer remain in legacy modules. Some filesystem operations and Java discovery
still run synchronously. No end-to-end RAM/startup benchmark has been performed;
do not infer overall speedups solely from moving code into classes.
