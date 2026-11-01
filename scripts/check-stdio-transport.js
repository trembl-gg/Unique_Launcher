const assert = require('node:assert/strict');
const { PassThrough } = require('node:stream');
const vm = require('node:vm');
const fs = require('node:fs');
const { serveStdio, PREFIX } = require('../lib/stdio-transport');

async function check() {
  const input = new PassThrough();
  const output = new PassThrough();
  const messages = [];
  let closed = false;
  output.on('data', data => {
    for (const line of data.toString().trim().split('\n')) messages.push(JSON.parse(line.slice(PREFIX.length)));
  });
  const handlers = new Map([
    ['echo', async (_event, payload) => payload],
    ['fail', async () => { throw new Error('expected failure'); }],
    ['event', async event => { event.sender.send('launch-progress', { progress: 42 }); }]
  ]);
  serveStdio({ handlers, input, output, emitEvent: (channel, data) => messages.push({ type: 'event', channel, data }), onClose: () => { closed = true; } });
  assert.equal(messages[0].type, 'ready');
  input.write('invalid JSON\n');
  for (const request of [
    { id: 1, channel: 'echo', payload: { text: 'Привет 🌍', path: 'E:\\space folder\\x' } },
    { id: 2, channel: 'fail' }, { id: 3, channel: 'missing' }, { id: 4, channel: 'event' }
  ]) input.write(JSON.stringify(request) + '\n');
  await new Promise(resolve => setImmediate(resolve));
  assert.deepEqual(messages.find(m => m.id === 1).result, { text: 'Привет 🌍', path: 'E:\\space folder\\x' });
  assert.equal(messages.find(m => m.id === 2).error, 'expected failure');
  assert.equal(messages.find(m => m.id === 3).ok, false);
  assert.equal(messages.find(m => m.id === 4).result, null);
  assert.equal(messages.find(m => m.channel === 'launch-progress').data.progress, 42);
  input.end();
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(closed, true);

  const source = fs.readFileSync('renderer/webview2-bridge.js', 'utf8');
  const sent = [];
  const window = { __UNIQUE_RUST__: true, ipc: { postMessage: text => sent.push(JSON.parse(text)) }, addEventListener() {} };
  vm.runInNewContext(source, { window, console, Element: class {} });
  const settings = window.api.getSettings({ sessionToken: 'test' });
  assert.equal(sent[0].channel, 'get-settings');
  window.__uniqueDispatch({ type: 'invoke-result', id: sent[0].id, ok: true, result: { language: 'ru' } });
  assert.equal((await settings).language, 'ru');
  const pending = window.api.getCurrentSession();
  const rejected = assert.rejects(pending, /Backend/);
  window.__uniqueDispatch({ type: 'event', channel: 'backend-stopped', data: true });
  await rejected;
  await assert.rejects(window.api.getSettings(), /Backend/);
  const close = window.api.windowControl('close');
  const closeRequest = sent.at(-1);
  assert.equal(closeRequest.channel, 'window-control');
  assert.equal(closeRequest.payload, 'close');
  window.__uniqueDispatch({ type: 'invoke-result', id: closeRequest.id, ok: true, result: true });
  assert.equal(await close, true);
  console.log('PASS: Rust stdio transport, Unicode, errors, events, pipe shutdown and native close after backend failure');
}
check().catch(error => { console.error(error); process.exitCode = 1; });
