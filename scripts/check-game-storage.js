const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { GameStorage } = require('../lib/game-storage');
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'unique-storage-test-'));
const values = new Map();
const store = { get: (key, fallback) => values.has(key) ? values.get(key) : fallback, set: (key, value) => values.set(key, value), delete: key => values.delete(key) };
const options = { store, launcherRoot: path.join(temporary, 'launcher'), legacyRoot: path.join(temporary, 'legacy') };
try {
  let storage = new GameStorage(options);
  assert.equal(storage.root, path.join(options.launcherRoot, 'game-data'));
  fs.mkdirSync(options.legacyRoot);
  fs.writeFileSync(path.join(options.legacyRoot, 'world.dat'), 'world data');
  storage = new GameStorage(options);
  assert.equal(storage.root, options.legacyRoot);
  assert.throws(() => storage.schedule(path.join(options.legacyRoot, 'nested')));
  assert.throws(() => storage.schedule(temporary));
  const target = path.join(temporary, 'moved');
  storage.schedule(target);
  assert.equal(storage.root, options.legacyRoot);
  storage = new GameStorage(options);
  assert.equal(storage.root, target);
  assert.equal(fs.readFileSync(path.join(target, 'world.dat'), 'utf8'), 'world data');
  assert.ok(fs.existsSync(path.join(options.legacyRoot, 'world.dat')));
  assert.equal(new GameStorage(options).root, target);
  const conflict = path.join(temporary, 'conflict');
  fs.mkdirSync(conflict);
  fs.writeFileSync(path.join(conflict, 'keep.txt'), 'keep');
  assert.throws(() => storage.schedule(conflict));
  store.set('gameStoragePending', conflict);
  storage = new GameStorage(options);
  assert.equal(storage.root, target);
  assert.ok(storage.error);
  assert.equal(fs.readFileSync(path.join(conflict, 'keep.txt'), 'utf8'), 'keep');
  console.log('PASS: storage defaults, restart migration, verification, source preservation, conflicts and recovery');
} finally {
  // Delete only the unique test fixture directory created above.
  fs.rmSync(temporary, { recursive: true, force: true });
}
