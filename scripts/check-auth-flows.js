const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const crypto = require('node:crypto');

function element(hidden = false) {
  const classes = new Set(hidden ? ['hidden'] : []);
  return { disabled: false, textContent: '', value: 'OfflineUser',
    classList: { add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value) },
    replaceChildren() {}, setAttribute() {}, removeAttribute() {} };
}

async function check() {
  const backendSource = fs.readFileSync('main.js', 'utf8');
  const guestHandler = backendSource.slice(backendSource.indexOf("ipcMain.handle('auth-guest'"), backendSource.indexOf("ipcMain.handle('auth-accounts-list'"));
  let handler;
  const disk = new Map();
  const context = vm.createContext({
    ipcMain: { handle: (_name, callback) => { handler = callback; } }, crypto,
    validateNickname: nick => /^[a-zA-Z0-9_]{3,16}$/.test(nick), activeSessions: new Map(), SESSION_KEY: 'lastSession',
    store: { set: (key, value) => disk.set(key, value), get: key => disk.get(key) },
    saveAccountSession() {}, getSettings: () => ({ skin: 'existing-local-skin.png' }),
    saveSettings: settings => { disk.set('settings', settings); }, setLauncherDiscordRpc() {},
    downloadSkinByNickname: () => { throw new Error('Offline login must not request the network'); }
  });
  vm.runInContext(guestHandler, context);
  assert.equal((await handler({}, { nickname: 'OfflineUser' })).success, true);
  assert.equal(disk.get('settings').skin, 'existing-local-skin.png');
  assert.equal(disk.get('settings').useUniqueMods, false);
  assert.equal((await handler({}, { nickname: '' })).success, false);

  const source = fs.readFileSync('renderer/renderer.js', 'utf8');
  const enter = source.slice(source.indexOf('async function enterLauncher('), source.indexOf('async function login('));
  const auth = source.slice(source.indexOf('async function guestLogin('), source.indexOf('async function register('));
  const elements = new Map(['guest-button', 'skin-album'].map(id => [id, element()]));
  const authScreen = element();
  const launcherScreen = element(true);
  const guestMessage = element();
  const loginMessage = element();
  const calls = [];
  const renderer = vm.createContext({
    document: { getElementById: id => elements.get(id) }, activeUser: null,
    authScreen, launcherScreen, guestMessage, loginMessage, microsoftLoginButton: element(),
    fields: { guestNick: element() }, updateUserIdentity() {}, refreshAccountSwitcher: async () => {},
    loadAppState: async () => {}, startUpdateChecks() {}, saveSettings: async () => {}, refreshPreviews: async () => {},
    setMessage: (element, text) => { element.textContent = text; },
    window: { api: {
      guestLogin: async () => ({ success: true, user: { nickname: 'OfflineUser' } }),
      startMicrosoftLogin: async () => ({ success: true, browserOpened: false, flowId: 'test-flow', authorizationUrl: 'https://login.microsoftonline.com/authorize?state=abc&code_challenge=xyz' }),
      openExternal: async url => { calls.push(['open', url]); },
      completeMicrosoftLogin: async payload => { calls.push(['complete', payload.flowId]); return { success: true, user: { nickname: 'LicensedUser' } }; }
    } }
  });
  vm.runInContext(enter + auth, renderer);
  await renderer.guestLogin({ preventDefault() {} });
  assert.equal(authScreen.classList.contains('hidden'), true);
  assert.equal(launcherScreen.classList.contains('hidden'), false);
  assert.equal(elements.get('guest-button').disabled, false);
  renderer.window.api.guestLogin = async () => { throw new Error('Backend disconnected'); };
  await renderer.guestLogin({ preventDefault() {} });
  assert.match(guestMessage.textContent, /Backend disconnected/);
  assert.equal(elements.get('guest-button').disabled, false);
  await renderer.microsoftLogin();
  assert.deepEqual(calls.map(call => call[0]), ['open', 'complete']);
  assert.equal(calls[1][1], 'test-flow');
  calls.length = 0;
  renderer.window.api.openExternal = async () => { throw new Error('Cannot open browser'); };
  await renderer.microsoftLogin();
  assert.match(loginMessage.textContent, /Cannot open browser/);
  assert.equal(calls.length, 0);
  assert.equal(renderer.microsoftLoginButton.disabled, false);
  renderer.window.api.startMicrosoftLogin = async () => ({ success: true, browserOpened: true, flowId: 'legacy-flow' });
  await renderer.microsoftLogin();
  assert.deepEqual(calls.map(call => call[0]), ['complete']);
  console.log('PASS: offline login without network, main-screen transition, error recovery and native Microsoft browser opening before callback wait');
}
check().catch(error => { console.error(error); process.exitCode = 1; });
