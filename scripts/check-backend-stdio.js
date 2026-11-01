const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const readline = require('node:readline');
const { spawn } = require('node:child_process');
const { PREFIX } = require('../lib/stdio-transport');

async function check() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'unique-rust-ipc-'));
  const root = path.resolve(process.argv[2] || '.');
  fs.mkdirSync(path.join(profile, 'roaming/minecraft-launcher/minecraft'), { recursive: true });
  const child = spawn(process.execPath, [path.join(root, 'webview2/node-backend.js')], {
    cwd: root, windowsHide: true,
    env: { ...process.env, APPDATA: path.join(profile, 'roaming'), LOCALAPPDATA: path.join(profile, 'local'),
      UNIQUE_WEBVIEW2_ROOT: root, UNIQUE_BACKEND_TRANSPORT: 'stdio' },
    stdio: ['pipe', 'pipe', 'pipe']
  });
  const exited = new Promise(resolve => child.once('exit', resolve));
  const pending = new Map();
  child.once('exit', () => {
    for (const entry of pending.values()) entry.reject(new Error('Backend exited before replying.'));
    pending.clear();
  });
  let nextId = 1;
  const invoke = (channel, payload = null) => new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    child.stdin.write(JSON.stringify({ id, channel, payload }) + '\n');
  });
  let ready;
  const started = new Promise(resolve => { ready = resolve; });
  let errors = '';
  child.stderr.on('data', bytes => { errors += bytes; });
  const lines = readline.createInterface({ input: child.stdout });
  lines.on('line', line => {
    if (!line.startsWith(PREFIX)) return;
    const message = JSON.parse(line.slice(PREFIX.length));
    if (message.type === 'ready') ready(message);
    if (message.type === 'invoke-result') {
      const entry = pending.get(message.id);
      if (!entry) return;
      pending.delete(message.id);
      if (message.ok) entry.resolve(message.result);
      else entry.reject(new Error(message.error));
    }
  });
  const deadline = setTimeout(() => {
    console.error('Backend integration timed out:', errors);
    child.kill();
  }, 15000);
  try {
    const startedOrExited = await Promise.race([started, exited.then(() => { throw new Error('Backend exited before readiness: ' + errors); })]);
    assert(startedOrExited.handlers > 60);
    const settings = await invoke('get-settings');
    assert.equal(typeof settings.language, 'string');
    const accounts = await invoke('auth-accounts-list');
    assert.equal(accounts.success, true);
    assert.deepEqual(accounts.accounts, []);
    const guest = await invoke('auth-guest', { nickname: 'RustSmoke' });
    assert.equal(guest.success, true);
    const session = await invoke('auth-current-session');
    assert.equal(session.user.nickname, 'RustSmoke');
    await assert.rejects(invoke('unknown-smoke-channel'), /Unknown backend channel/);
    child.stdin.end();
    assert.equal(await exited, 0);
    console.log('PASS: real backend stdio startup, null payload, empty profile, guest login, session and EOF shutdown');
  } finally {
    clearTimeout(deadline);
    child.kill();
    await exited;
    fs.rmSync(profile, { recursive: true, force: true });
  }
}
check().catch(error => { console.error(error); process.exitCode = 1; });
