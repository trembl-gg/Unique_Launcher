const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { GameLogs } = require('../lib/game-logs');
const { BackendEvents } = require('../lib/backend-events');
const { LaunchSession } = require('../lib/launch-session');
const { EventEmitter } = require('node:events');

async function test() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'unique-lifecycle-'));
  try {
    const gameRoot = path.join(temp, 'instance');
    fs.mkdirSync(path.join(gameRoot, 'logs'), { recursive: true });
    fs.mkdirSync(path.join(gameRoot, 'crash-reports'));
    fs.writeFileSync(path.join(gameRoot, 'crash-reports', 'crash-old.txt'), 'DO NOT COLLECT');
    fs.utimesSync(path.join(gameRoot, 'crash-reports', 'crash-old.txt'), new Date(0), new Date(0));
    const events = [];
    const logs = new GameLogs({ root: gameRoot, directory: path.join(temp, 'output'), secrets: ['session-secret'], emit: (channel, data) => events.push(data) });
    logs.write('stderr', 'session-secret --accessToken minecraft-secret -Dproject.auth.token=private');
    fs.writeFileSync(path.join(gameRoot, 'logs', 'latest.log'), 'new log');
    fs.writeFileSync(path.join(gameRoot, 'crash-reports', 'crash-new.txt'), 'Exception: test crash');
    fs.writeFileSync(path.join(gameRoot, 'hs_err_pid123.log'), 'JVM fatal error');
    await logs.collect(1);
    const text = fs.readFileSync(logs.file, 'utf8');
    assert.match(text, /test crash/); assert.match(text, /JVM fatal error/);
    assert.doesNotMatch(text, /session-secret|minecraft-secret|=private|DO NOT COLLECT/);
    assert(events.some(text => text.includes('test crash')));
    const cleanEvents = [];
    const stopped = new GameLogs({ root: gameRoot, directory: path.join(temp, 'output2'), emit: (_, value) => cleanEvents.push(value) });
    await stopped.collect(1, true);
    assert(!cleanEvents.some(text => text.includes('test crash')), 'requested close is not a crash alert');

    const bus = new BackendEvents();
    bus.emit('launch-started', { pid: 123 }); bus.emit('launch-log', 'hello');
    let output = '';
    const client = { write: data => { output += data; return true; } };
    bus.connect(client, 1);
    assert(!output.includes('launch-started')); assert(output.includes('hello'));
    bus.disconnect(client); bus.emit('launch-closed', 0);
    output = ''; bus.connect(client, 2); assert(output.includes('launch-closed'));
    for (let i = 0; i < 300; i++) bus.emit('launch-log', 'x'.repeat(5000));
    assert(bus.bytes <= 512 * 1024); assert(bus.history.length <= 250);

    let closed = 0;
    const session = new LaunchSession({ onFinish: () => closed++ });
    const process = new EventEmitter(); process.exitCode = null;
    session.attach(process);
    assert.throws(() => session.attach(new EventEmitter()));
    process.emit('error', new Error('spawn failed')); process.emit('close', 1);
    assert.equal(closed, 1);
    console.log('PASS: persisted stderr, crash/JVM reports, redaction, stale-report exclusion, event replay and process completion');
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}
test().catch(error => { console.error(error); process.exitCode = 1; });
