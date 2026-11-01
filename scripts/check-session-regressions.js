const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('main.js', 'utf8');
const helpers = source.slice(source.indexOf('function saveAccountSession('), source.indexOf('// Capture the instance once per request;'));
const disk = new Map([['lastSession', { nickname: 'TestUser', sessionToken: 'test-session', guest: true }]]);
function restart() {
  const context = vm.createContext({ store: { get: (key, fallback) => structuredClone(disk.has(key) ? disk.get(key) : fallback), set: (key, value) => disk.set(key, structuredClone(value)) }, SESSION_KEY: 'lastSession', ACCOUNTS_KEY: 'savedAccounts', activeSessions: new Map() });
  vm.runInContext(helpers, context);
  return context;
}
for (let i = 0; i < 3; i++) {
  const backend = restart();
  assert.equal(backend.getStoredSession().nickname, 'TestUser');
  assert.equal(backend.listSavedAccounts().length, 1);
}
disk.set('lastSession', { nickname: 'Licensed', sessionToken: 'licensed-session', refreshToken: 'fake-test-token', minecraftAuth: { uuid: 'test-id' } });
assert.equal(restart().getStoredSession().microsoft, true);
assert.equal(restart().listSavedAccounts().length, 2);
const renderer = fs.readFileSync('renderer/renderer.js', 'utf8');
const init = renderer.slice(renderer.indexOf('async function init() {'), renderer.indexOf('\nconst experiments ='));
let entered = false;
const context = vm.createContext({
  applyLanguage() {}, activeUser: null,
  setAuthMode() {}, prepareLauncherSections() {}, setLauncherSection() {}, setSettingsTab() {}, installSvgIcons() {}, setupCustomSelects() {}, showStartupAfterIcons() {}, dismissStartupScreen() {},
  loadTitlebarIcon: async () => {}, updateWindowMaximizeButton: async () => {}, refreshMods: async () => { throw new Error('Optional content failed'); },
  window: { api: { getSettings: async () => ({ language: 'ru' }), getCurrentSession: async () => ({ success: true, user: { nickname: 'TestUser' } }) } },
  enterLauncher: async () => { entered = true; }
});
vm.runInContext(init, context);
context.init().then(() => { assert.equal(entered, true); console.log('PASS: restart persistence, legacy migration, account list, startup despite content failure'); });
