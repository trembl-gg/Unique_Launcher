const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { LaunchSession } = require('../lib/launch-session');
const { SettingsService } = require('../lib/settings-service');
const { memoryBudget } = require('../lib/memory-budget');
const { DiscordActivity } = require('../lib/discord-activity');
const { DiscordPresence } = require('../lib/discord-presence');

async function run() {
  let finished = 0;
  const preparation = new LaunchSession({ onFinish: () => finished++ });
  assert.equal((await preparation.stop()).stopped, false);
  assert.throws(() => preparation.checkpoint(), { code: 'LAUNCH_CANCELLED' });
  preparation.finish(); preparation.finish();
  assert.equal(finished, 1);

  const process = new EventEmitter();
  process.pid = 123; process.exitCode = null;
  process.kill = () => assert.fail('A normal close must not kill Minecraft');
  const running = new LaunchSession({
    platform: 'win32', onFinish: () => finished++,
    execute: (file, args, options, callback) => {
      assert.equal(file, 'powershell.exe');
      assert.match(args.at(-1), /CloseMainWindow/);
      assert.equal(options.windowsHide, true);
      callback(null, 'True');
    }
  });
  running.attach(process);
  assert.equal((await running.stop()).success, true);
  assert.equal(running.finished, false, 'wait for actual process exit');
  assert.equal(running.cancelled, false);
  process.emit('close', 0); running.finish();
  assert.equal(finished, 2);

  const disk = new Map();
  const makeSettings = () => new SettingsService({
    store: { get: (k, fallback) => structuredClone(disk.get(k) ?? fallback), set: (k, v) => disk.set(k, structuredClone(v)) },
    userKey: 'users', globalKey: 'settings', server: { name: 'Minecraft' },
    normalizeLoader: value => value || 'fabric', resolveServer: () => null
  });
  const settings = makeSettings();
  assert.equal(settings.getDefaultSettings().appearance.starBackground, false);
  settings.saveSettings({ appearance: { starBackground: true } }, 'Stars');
  assert.equal(makeSettings().getSettings('Stars').appearance.starBackground, true);
  settings.saveSettings({ appearance: { starBackground: 'true' } }, 'Stars');
  assert.equal(makeSettings().getSettings('Stars').appearance.starBackground, false);
  settings.saveSettings({ appearance: { theme: 'oled', transparency: 50, sidebarCollapsed: true } }, 'OLED');
  assert.deepEqual(makeSettings().getSettings('OLED').appearance, { theme: 'oled', accent: 'emerald', reduceMotion: false, starBackground: false, transparency: 50, sidebarCollapsed: true });
  for (const [input, expected] of [[-5, 0], [500, 70], ['invalid', 0], [Infinity, 70]]) {
    settings.saveSettings({ appearance: { transparency: input } }, 'Bounds');
    assert.equal(makeSettings().getSettings('Bounds').appearance.transparency, expected);
  }
  settings.saveSettings({ ...settings.getDefaultSettings(), memory: { max: 6144 }, appearance: { accent: '#abcdef', theme: 'deep' }, experiments: { spotifyTheme: true, visualizer: true } }, 'Player');
  const restored = makeSettings().getSettings('Player');
  assert.equal(restored.memory.max, Math.min(6144, memoryBudget()));
  assert.equal(restored.appearance.accent, '#abcdef');
  assert.deepEqual(restored.experiments, { spotifyTheme: true, visualizer: true, streamerMode: false, rustMinecraft: true });
  settings.saveSettings({ ...restored, experiments: { ...restored.experiments, rustMinecraft: false } }, 'OptOut');
  assert.equal(makeSettings().getSettings('OptOut').experiments.rustMinecraft, false);
  settings.saveSettings({ memory: { max: 4096 } }, 'OptOut');
  assert.equal(makeSettings().getSettings('OptOut').experiments.rustMinecraft, false);
  settings.saveSettings({ ...restored, experiments: { ...restored.experiments, rustMinecraft: true } }, 'Player');
  assert.equal(makeSettings().getSettings('Player').experiments.rustMinecraft, true);
  assert.equal(settings.saveSettings({ ...restored, experiments: { ...restored.experiments, streamerMode: true } }, 'Player').experiments.streamerMode, true);
  assert.equal(settings.saveSettings({ memory: { max: Infinity } }).memory.max, Math.min(4096, memoryBudget()));

  const activity = new DiscordActivity('UNIQUE LAUNCHER');
  assert.match(activity.create({ nickname: 'Player', memoryMax: 6144, microsoft: true }).state, /Microsoft/);
  assert.match(activity.create({ nickname: 'Player', remote: true }).state, /Офлайн/);
  assert.equal(activity.create({ memoryMax: 6144 }).details, 'Играет в Minecraft');
  assert.doesNotMatch(activity.create({ nickname: 'Player', microsoft: true, guest: true }).state, /Лицензия/);
  const presence = new DiscordPresence({ clientId: '', launcherName: 'UNIQUE' });
  presence.rpcConnecting = true;
  presence.disconnectDiscordRpc();
  assert.equal(presence.rpcConnecting, false);
  console.log('PASS: cancellation, graceful close, idempotent completion, settings persistence, RAM, RPC account types');
  const { InstanceRepository } = require('../lib/instance-repository');
  let instanceDisk = {};
  const context = new InstanceRepository({
    key: 'instances', normalizeModLoader: value => value,
    store: { get: () => structuredClone(instanceDisk), set: (key, value) => { instanceDisk = structuredClone(value); } }
  });
  context.upsertBuildInstance('Player', { id: 'one', name: 'My pack', favorite: true, icon: 'data:image/png;base64,aGVsbG8=' }, false);
  const saved = context.getBuildInstances('Player')[0];
  assert.equal(saved.favorite, true);
  assert.equal(saved.icon, 'data:image/png;base64,aGVsbG8=');
  assert.equal(context.normalizeBuildInstance({ ...saved, updatedAt: '2020-01-01' }).updatedAt, '2020-01-01');
  context.upsertBuildInstance('Player', { ...saved, name: 'Renamed' }, false);
  assert.equal(context.getBuildInstances('Player')[0].icon, saved.icon);
  assert.equal(context.normalizeBuildInstance({ icon: 'https://untrusted.example/image.svg' }).icon, '');
  assert.equal(context.normalizeBuildInstance({}).favorite, false);
  console.log('PASS: instance avatar and favorites persist across normalization and rename');
  const { RequestCache } = require('../lib/request-cache');
  let time = 0, requests = 0;
  const cache = new RequestCache({ ttlMs: 10, maxEntries: 2, maxBytes: 100, now: () => time });
  const fetchValue = async () => { requests++; return { value: 1 }; };
  const results = await Promise.all(Array.from({ length: 20 }, () => cache.get('same', fetchValue)));
  assert.equal(requests, 1);
  results[0].value = 99;
  assert.equal((await cache.get('same', fetchValue)).value, 1);
  time = 11;
  await cache.get('same', fetchValue);
  assert.equal(requests, 2);
  await cache.get('b', fetchValue); await cache.get('c', fetchValue);
  assert.equal(cache.entries.size, 2);
  assert(cache.bytes <= 100);
  await assert.rejects(cache.get('error', async () => { throw new Error('offline'); }));
  assert.equal(cache.pending.size, 0);
  assert.equal((await cache.get('error', fetchValue)).value, 1);
  const { JavaService } = require('../lib/java-service');
  let probes = 0;
  const java = new JavaService({ processes: { spawnSync: () => { probes++; return { stderr: 'openjdk version "21.0.1"' }; } } });
  assert.equal(java.getJavaMajorVersion(__filename), 21);
  assert.equal(java.getJavaMajorVersion(__filename), 21);
  assert.equal(probes, 1);
  assert.equal(java.parseJavaMajorVersion('java version "1.8.0_100"'), 8);
  console.log('PASS: 20 concurrent metadata reads = 1 request; cache limits, expiry, retry; Java probe reuse');
  const { LoaderService } = require('../lib/loader-service');
  const loader = new LoaderService({ normalizeModLoader: value => value, path: require('node:path'), os: require('node:os') });
  assert.deepEqual(loader.parseMavenVersions('<versions><version>1.0</version><version>2.0</version></versions>'), ['1.0', '2.0']);
  assert.equal(loader.rulesAllow([]), true);
  assert.equal(loader.rulesAllow([{ action: 'disallow' }]), false);
  assert.match(loader.mavenPathFromName('org.example:test:1.0'), /org\/example\/test\/1.0\/test-1.0.jar/);
  for (const [type, method] of [['vanilla', 'ensureVanillaVersion'], ['fabric', 'ensureFabricVersion'], ['forge', 'ensureForgeVersion'], ['neoforge', 'ensureNeoForgeVersion'], ['quilt', 'ensureQuiltVersion']]) {
    loader[method] = async () => ({ id: type });
    const result = await loader.ensureSelectedLoaderVersion('test', { minecraftVersion: '1.20.1', modLoader: type });
    assert.equal(result.name.toLowerCase(), type);
  }
  await assert.rejects(loader.ensureSelectedLoaderVersion('test', { modLoader: 'unknown' }));
  const fs = require('node:fs');
  const vm = require('node:vm');
  let reduced = true, enabled = true, nextFrame = 1, observerCallback;
  const frames = new Map(), listeners = new Map();
  const events = { addEventListener: (name, callback) => listeners.set(name, callback), removeEventListener: name => listeners.delete(name) };
  let textureBuilds = 0;
  const drawing = new Proxy({}, { get: (target, key) => key === 'createImageData' ? (width, height) => {
    textureBuilds++; return { data: new Uint8ClampedArray(width * height * 4) };
  } : /Gradient$/.test(key) ? () => ({ addColorStop() {} }) : () => {} });
  const document = { ...events, hidden: false, body: { dataset: {}, classList: { contains: () => reduced } }, createElement: () => ({ getContext: () => drawing }) };
  const browser = { ...events, innerWidth: 800, innerHeight: 600, devicePixelRatio: 1 };
  const sandbox = vm.createContext({ window: browser, document, MutationObserver: class { constructor(cb) { observerCallback = cb; } observe() {} disconnect() {} }, requestAnimationFrame: cb => { const id = nextFrame++; frames.set(id, cb); return id; }, cancelAnimationFrame: id => frames.delete(id) });
  vm.runInContext(fs.readFileSync('renderer/ambient-background.js', 'utf8'), sandbox);
  const canvas = { style: {}, getContext: () => drawing };
  const background = new browser.AmbientBackground(canvas, () => ['1,2,3', '3,2,1'], () => enabled);
  const frame = time => { const [id, callback] = frames.entries().next().value; frames.delete(id); callback(time); };
  background.start();
  assert.equal(frames.size, 0, 'reduced motion schedules no canvas frames');
  assert.equal(canvas.width * canvas.height, 0, 'reduced motion allocates no sky backing store');
  assert.equal(textureBuilds, 0, 'reduced motion does not generate a nebula');
  reduced = false; observerCallback(); frame(200);
  assert.equal(frames.size, 1);
  frame(240);
  assert.equal(textureBuilds, 1, 'nebula texture is cached between animation frames');
  frame(9200);
  assert.equal(textureBuilds, 1, 'moving glows, stars and meteors reuse the texture');
  listeners.get('resize')(); frame(280);
  assert.equal(textureBuilds, 2, 'nebula texture follows window size');
  document.hidden = true; listeners.get('visibilitychange')();
  assert.equal(frames.size, 0, 'hidden canvas does not schedule frames');
  assert.equal(canvas.width * canvas.height, 0, 'hidden sky releases its backing store');
  document.hidden = false; browser.innerWidth = 3840; browser.innerHeight = 2160; browser.devicePixelRatio = 2;
  listeners.get('visibilitychange')(); frame(10000);
  assert(canvas.width * canvas.height <= 1440000, 'HiDPI sky has a bounded backing store');
  reduced = true; observerCallback();
  assert.equal(canvas.width * canvas.height, 0, 'enabling reduced motion releases an already animated sky');
  assert.equal(frames.size, 0);
  observerCallback(); listeners.get('resize')();
  assert.equal(frames.size, 0, 'theme and resize changes cannot restart reduced-motion canvas');
  reduced = false; observerCallback(); frame(10100);
  assert(canvas.width * canvas.height > 0, 'disabling reduced motion restores the animated sky');
  document.body.dataset.windowHidden = 'true'; listeners.get('visibilitychange')();
  assert.equal(canvas.width * canvas.height, 0, 'native hide releases the sky even before browser visibility updates');
  document.body.dataset.windowHidden = 'false'; enabled = false; observerCallback();
  assert.equal(canvas.width * canvas.height, 0, 'disabled star background releases its backing store');
  assert.equal(frames.size, 0, 'disabled star background schedules no frames');
  enabled = true; observerCallback();
  assert(canvas.width * canvas.height > 0, 'star background can be enabled again without restarting');
  background.dispose();
  assert.equal(listeners.size, 0);
  console.log('PASS: loader dispatch and rules; background stops in hidden/reduced-motion modes and releases listeners');
  if (require('node:process').platform === 'win32') {
    const childProcess = require('node:child_process');
    const originalSpawn = childProcess.spawn;
    const { createElectronShim } = require('../webview2/electron-shim');
    const shell = createElectronShim({ root: require('node:process').cwd(), handlers: new Map(), emitEvent() {} }).shell;
    try {
      let called = 0;
      childProcess.spawn = (file, args, options) => {
        called++;
        assert.equal(file, 'explorer.exe'); assert.deepEqual(args, [__dirname]);
          assert.equal(options.windowsHide, false); assert.equal(options.shell, undefined);
        const child = new EventEmitter(); child.unref = () => {};
        queueMicrotask(() => child.emit('spawn')); return child;
      };
      assert.equal(await shell.openPath(__dirname), '');
      assert.notEqual(await shell.openPath(require('node:path').join(__dirname, 'not-a-folder')), '');
      assert.equal(called, 1, 'missing folders are rejected before opening Explorer');
      childProcess.spawn = () => {
        const child = new EventEmitter(); queueMicrotask(() => child.emit('error', Error('Explorer unavailable'))); return child;
      };
      assert.equal(await shell.openPath(__dirname), 'Explorer unavailable');
    } finally { childProcess.spawn = originalSpawn; }
    console.log('PASS: directory opening uses Explorer, validates folders and reports spawn errors');
  }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
