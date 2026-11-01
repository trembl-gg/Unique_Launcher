const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const vm = require('node:vm');
const crypto = require('node:crypto');
const { AsyncLocalStorage } = require('node:async_hooks');
const { InstancePaths } = require('../lib/instance-paths');
const { instanceLaunchOptions, parseArguments, mergeJvmArguments } = require('../lib/instance-launch-options');
const { InstanceRepository } = require('../lib/instance-repository');
async function run() {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'unique-instance-test-'));
  try {
    const data = new Map();
    const store = { get: (key, fallback) => data.get(key) ?? fallback, set: (key, value) => data.set(key, value) };
    const paths = new InstancePaths({ store, base: () => temp });
    const a = paths.root('owner', 'inst_a'), b = paths.root('owner', 'inst_b');
    assert.notEqual(a, b); assert.notEqual(a, paths.root('other', 'inst_a'));
    assert.throws(() => paths.root('owner', '../bad'));
    const context = new AsyncLocalStorage();
    const roots = await Promise.all([a, b].map(root => context.run(root, async () => { await new Promise(resolve => setTimeout(resolve, 5)); return context.getStore(); })));
    assert.deepEqual(roots, [a, b]);
    const source = fs.readFileSync('main.js', 'utf8');
    const handlers = new Map();
    let selected = 'inst_a';
    const routing = vm.createContext({
      ipcMain: { handle: (name, handler) => handlers.set(name, handler) },
      instanceContext: new AsyncLocalStorage(), instancePaths: paths,
      getStoredSession: () => ({ nickname: 'owner' }), getSettings: () => ({ activeInstanceId: selected }),
      store, fs, path, gameStorage: { root: temp }, app: { getPath: () => temp }, createBuildInstanceId: () => 'inst_import'
    });
    vm.runInContext(source.slice(source.indexOf('function getGameRoot('), source.indexOf('function sha256File(')), routing);
    vm.runInContext(source.slice(source.indexOf('// Capture the instance once per request;'), source.indexOf("ipcMain.handle('auth-guest'")), routing);
    routing.ipcMain.handle('probe', async () => { await new Promise(resolve => setTimeout(resolve, 5)); return routing.getGameRoot(); });
    const first = handlers.get('probe')({}, {}); selected = 'inst_b';
    const second = handlers.get('probe')({}, {});
    assert.deepEqual(await Promise.all([first, second]), [a, b]);
    routing.ipcMain.handle('import-probe', () => { routing.beginImportedInstance(); return routing.getGameRoot(); });
    assert.equal(await handlers.get('import-probe')({}, {}), paths.root('owner', 'inst_import'));
    const test = vm.createContext({ fs, path, crypto, instancePaths: paths, getGameRoot: () => a, activeLaunches: new Map(), ensureDir: dir => fs.mkdirSync(dir, { recursive: true }) });
    vm.runInContext(source.slice(source.indexOf('function getContentFolder('), source.indexOf('const contentImporter =')), test);
    for (const type of ['resourcepack', 'shader', 'worlds']) {
      const folderA = paths.content(a, type), folderB = paths.content(b, type);
      const name = type === 'worlds' ? 'World' : 'pack.zip';
      for (const folder of [folderA, folderB]) {
        if (type === 'worlds') { fs.mkdirSync(path.join(folder, name)); fs.writeFileSync(path.join(folder, name, 'level.dat'), 'world'); }
        else fs.writeFileSync(path.join(folder, name), 'pack');
      }
      test.setGameContentEnabled(type, name, false);
      assert.ok(fs.existsSync(path.join(folderA, name + '.disabled')));
      test.deleteGameContent(type, name + '.disabled');
      assert.ok(!fs.existsSync(path.join(folderA, name + '.disabled')));
      assert.ok(fs.existsSync(path.join(folderB, name)));
      assert.throws(() => test.deleteGameContent(type, '..'));
      assert.throws(() => test.deleteGameContent(type, '.. '));
    }
    const mods = paths.content(a, 'mods');
    fs.writeFileSync(path.join(mods, 'mod.jar'), 'jar');
    test.resolveUserModPath = (_version, name) => paths.item(mods, name);
    test.pendingUserModDeletes = new Map(); test.setTimeout = () => 1; test.clearTimeout = () => {};
    vm.runInContext(source.slice(source.indexOf('function scheduleUserModDelete('), source.indexOf('function createModBlockMatcher(')), test);
    const pending = test.scheduleUserModDelete('1.20.1', 'mod.jar');
    assert.ok(!fs.existsSync(path.join(mods, 'mod.jar')));
    test.undoUserModDelete(pending.token); assert.ok(fs.existsSync(path.join(mods, 'mod.jar')));
    const pending2 = test.scheduleUserModDelete('1.20.1', 'mod.jar'); test.finalizePendingUserModDelete(pending2.token);
    assert.ok(!fs.existsSync(path.join(mods, 'mod.jar')));
    test.activeLaunches.set('running', {});
    assert.throws(() => test.deleteGameContent('worlds', 'World'));
    assert.deepEqual(parseArguments('-Dname="two words" -Dpath="C:\\My Folder"'), ['-Dname=two words', '-Dpath=C:\\My Folder']);
    assert.throws(() => parseArguments('"unclosed'));
    assert.throws(() => instanceLaunchOptions({ gameArguments: '--gameDir other' }));
    assert.throws(() => instanceLaunchOptions({ jvmArguments: '-Xmx8G' }));
    assert.deepEqual(instanceLaunchOptions({ jvmArguments: '-XX:MaxGCPauseMillis=100', gameArguments: '--width 1280' }).game, ['--width', '1280']);
    assert.deepEqual(mergeJvmArguments(['-XX:+UseG1GC', '-Dtest=old'], ['-XX:+UseZGC', '-Dtest=new']), ['-XX:+UseZGC', '-Dtest=new']);
    const repo = new InstanceRepository({ store, key: 'instances', normalizeModLoader: v => v, getSettings: () => ({}), saveSettings: () => {} });
    repo.upsertBuildInstance('owner', { id: 'inst_a', jvmArguments: '-Dtest=value', gameArguments: '--width 1280' }, false);
    repo.upsertBuildInstance('owner', { id: 'inst_b', name: 'B' }, false);
    assert.equal(repo.findBuildInstance('owner', 'inst_a').jvmArguments, '-Dtest=value');
    assert.equal(repo.findBuildInstance('owner', 'inst_b').jvmArguments, '');
    console.log('PASS: per-instance paths, concurrent contexts, content disable/delete, mod delete/undo, launch arguments and persistence');
  } finally { fs.rmSync(temp, { recursive: true, force: true }); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
