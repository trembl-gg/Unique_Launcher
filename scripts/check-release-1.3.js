const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { EventEmitter } = require('node:events');
const { LaunchSession } = require('../lib/launch-session');
const { SettingsService } = require('../lib/settings-service');
const { sendAuthCallback } = require('../lib/auth-callback');
const { JavaService } = require('../lib/java-service');

(async () => {
  for (const provider of ['Microsoft', 'Spotify']) for (const language of ['ru', 'en', 'es']) {
    for (const status of ['success', 'denied', 'invalid', 'expired', 'missing', 'handled', 'failed']) {
      let headers, html;
      sendAuthCallback({ writeHead(code, value) { assert.equal(code, status === 'success' ? 200 : 400); headers = value; }, end(value) { html = value; } }, { provider, status, language, code: status === 'success' ? 200 : 400 });
      assert(html.includes(`<html lang="${language}">`)); assert(html.includes(provider));
      assert.equal(headers['Cache-Control'], 'no-store');
      assert.match(headers['Content-Security-Policy'], /frame-ancestors 'none'/);
      assert(html.includes(`nonce="${headers['Content-Security-Policy'].match(/nonce-([^']+)/)[1]}"`));
      assert(!html.includes('access_token'));
    }
  }
  const source = fs.readFileSync('main.js', 'utf8');
  const context = vm.createContext({
    MOJANG_VERSION_MANIFEST_URL: 'https://example.test/manifest', supportedSnapshotVersionsCache: [],
    requestJson: async () => ({ versions: [
      { id: '26.3', type: 'release' }, { id: '26.3-snapshot-1', type: 'snapshot', releaseTime: '2026-10-20T00:00:00Z' },
      { id: '25w01a', type: 'snapshot', releaseTime: '2025-01-01T00:00:00Z' },
      { id: 'old-snapshot', type: 'snapshot', releaseTime: '2019-01-01T00:00:00Z' },
      { id: '1.15.2', type: 'release' }, { id: '1.16', type: 'release' }
    ] })
  });
  vm.runInContext(source.slice(source.indexOf('function parseMinecraftReleaseId('), source.indexOf('async function getLauncherContent(')), context);
  assert.deepEqual(Array.from(await context.getOfficialReleaseVersionsAfter116()), ['26.3', '1.16']);
  assert.deepEqual(Array.from(context.supportedSnapshotVersionsCache), ['26.3-snapshot-1', '25w01a']);
  const disk = new Map();
  const settings = new SettingsService({ store: { get: (key, fallback) => disk.get(key) ?? fallback, set: (key, value) => disk.set(key, value) }, userKey: 'users', globalKey: 'settings', server: {}, normalizeLoader: value => value || 'vanilla', resolveServer: () => null });
  assert.equal(settings.getSettings('Player').showSnapshots, false);
  settings.saveSettings({ showSnapshots: true }, 'Player'); settings.saveSettings({ language: 'en' }, 'Player');
  assert.equal(settings.getSettings('Player').showSnapshots, true);
  settings.saveSettings({ showSnapshots: false }, 'Player'); assert.equal(settings.getSettings('Player').showSnapshots, false);
  let language = 'ru';
  const rpc = vm.createContext({ getSettings: () => ({ language }), Date });
  vm.runInContext(source.slice(source.indexOf('function getDiscordButtons('), source.indexOf('\n}', source.indexOf('function getDiscordButtons(')) + 2), rpc);
  for (const [lang, label] of [['ru', 'Скачать лаунчер'], ['en', 'Download launcher'], ['es', 'Descargar launcher']]) {
    language = lang; const buttons = rpc.getDiscordButtons({ youtubeUrl: 'https://youtube.com/test', twitchUrl: 'https://twitch.tv/test' });
    assert.equal(buttons[0].label, label); assert.equal(buttons[0].url, 'https://github.com/trembl-gg/Unique_Launcher/releases/latest');
    assert.equal(buttons.length, 2);
  }
  const events = [];
  const cancelled = new LaunchSession({ record: event => events.push(event), onFinish() {} });
  cancelled.setStage('loader'); await cancelled.stop();
  try { cancelled.checkpoint(); } catch (error) { cancelled.finish(0, null, error); }
  assert.equal(events.at(-1).method, 'cancel-preparation'); assert.equal(events.at(-1).errorCode, 'LAUNCH_CANCELLED'); assert.equal(events.at(-1).stage, 'loader');
  const crash = new LaunchSession({ record: event => events.push(event), onFinish() {} });
  const child = new EventEmitter(); child.pid = 123; crash.attach(child); child.emit('close', null, 'SIGKILL');
  assert.equal(events.at(-1).signal, 'SIGKILL'); assert.match(events.at(-1).reason, /signal/);
  const spawnFailure = new LaunchSession({ record: event => events.push(event), onFinish() {} });
  spawnFailure.attach(new EventEmitter()); spawnFailure.process.emit('error', Object.assign(Error('Java not found'), { code: 'ENOENT' }));
  assert.equal(events.at(-1).errorCode, 'ENOENT'); assert.match(events.at(-1).stack, /Java not found/);
  const java = new JavaService({}); java.collectJavaCandidates = () => ['old', 'new']; java.getJavaMajorVersion = candidate => candidate === 'new' ? 25 : 21;
  assert.equal(java.resolveJava17('', 25).major, 25);
  assert.throws(() => java.resolveJava17('', 26), error => error.code === 'JAVA_REQUIRED' && error.minimumJava === 26);
  console.log('PASS: localized protected callbacks, modern release/snapshot lists, snapshot setting persistence, localized Discord latest link, cancellation/signal/spawn reasons and required Java version');
})().catch(error => { console.error(error); process.exitCode = 1; });
