const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { prepareHorizonLaunch, startHorizon, findHorizonInstallation, resolveHorizonPaths } = require('../lib/horizon-client');
const { packageHorizon } = require('./package-horizon');

(async () => {
  const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'unique-horizon-'));
  try {
    const executable = path.join(temporary, 'horizon-client.exe');
    fs.writeFileSync(executable, 'test fixture; never executed');
    const versions = path.join(temporary, 'versions');
    const installation = path.join(versions, 'nightly-2026-10-31-test');
    const resources = path.join(installation, '.local', 'horizon-client', '26.3');
    fs.mkdirSync(resources, { recursive: true });
    fs.copyFileSync(executable, path.join(installation, 'horizon-client.exe'));
    fs.writeFileSync(path.join(installation, 'LICENSE'), 'test license');
    fs.writeFileSync(path.join(installation, 'session.json'), 'must not be packaged');
    fs.writeFileSync(path.join(resources, 'horizon-resources.json'), '{"minecraft":"26.3"}');
    fs.writeFileSync(path.join(resources, 'export.log'), 'local preparation log');
    const audioName = 'minecraft/sounds/music/test.ogg';
    const audioBytes = Buffer.from('audio fixture');
    const audioHash = require('node:crypto').createHash('sha1').update(audioBytes).digest('hex');
    fs.mkdirSync(path.join(resources, 'assets/minecraft/sounds/music'), { recursive: true });
    fs.writeFileSync(path.join(resources, 'assets', audioName), audioBytes);
    fs.writeFileSync(path.join(resources, 'asset-index.json'), JSON.stringify({ objects: { [audioName]: { hash: audioHash, size: audioBytes.length } } }));
    const packageRoot = path.join(temporary, 'package');
    const detected = findHorizonInstallation(packageRoot, versions);
    assert.equal(detected.horizonExecutable, path.join(installation, 'horizon-client.exe'));
    packageHorizon(packageRoot, detected);
    const bundled = findHorizonInstallation(packageRoot, versions);
    assert.equal(bundled.horizonExecutable, path.join(packageRoot, 'horizon', 'horizon-client.exe'));
    assert.equal(fs.readFileSync(path.join(packageRoot, 'horizon', 'LICENSE'), 'utf8'), 'test license');
    assert(!fs.existsSync(path.join(packageRoot, 'horizon', 'session.json')));
    assert(!fs.existsSync(path.join(bundled.horizonResources, 'export.log')));
    assert(!fs.existsSync(path.join(bundled.horizonResources, 'assets', audioName)));
    const { ensureHorizonResources, COMPACT_MANIFEST } = require('../lib/horizon-resources');
    assert(fs.existsSync(path.join(bundled.horizonResources, COMPACT_MANIFEST)));
    let downloads = 0;
    const hydration = {
      resources: bundled.horizonResources, cacheRoot: path.join(temporary, 'cache'),
      download: async (url, file) => {
        assert.equal(url, `https://resources.download.minecraft.net/${audioHash.slice(0, 2)}/${audioHash}`);
        downloads++; fs.writeFileSync(file, audioBytes);
      }
    };
    const hydrated = await ensureHorizonResources(hydration);
    assert.notEqual(hydrated, bundled.horizonResources);
    assert.equal(downloads, 1);
    assert.deepEqual(fs.readFileSync(path.join(hydrated, 'assets', audioName)), audioBytes);
    await ensureHorizonResources({ ...hydration, download: async () => { throw Error('offline'); } });
    assert.equal(downloads, 1);
    fs.writeFileSync(path.join(hydrated, 'assets', audioName), Buffer.alloc(audioBytes.length));
    await assert.rejects(ensureHorizonResources({ ...hydration, download: async (_, file) => fs.writeFileSync(file, Buffer.alloc(audioBytes.length)) }), /проверка/);
    assert(!fs.existsSync(path.join(hydrated, 'assets', audioName) + '.part'));
    await assert.rejects(ensureHorizonResources({ ...hydration, download: async () => { throw Error('offline'); } }), /интернет/);
    const cancelled = Object.assign(Error('cancelled'), { code: 'LAUNCH_CANCELLED' });
    await assert.rejects(ensureHorizonResources({ ...hydration, checkpoint: () => { throw cancelled; } }), error => error === cancelled);
    let cancelDuringDownload = false;
    await assert.rejects(ensureHorizonResources({
      ...hydration,
      checkpoint: () => { if (cancelDuringDownload) throw cancelled; },
      download: async (_, file) => { fs.writeFileSync(file, audioBytes); cancelDuringDownload = true; }
    }), error => error === cancelled);
    assert(!fs.existsSync(path.join(hydrated, 'assets', audioName) + '.part'));
    await ensureHorizonResources(hydration);
    assert.equal(downloads, 2);
    assert.equal(await ensureHorizonResources({ resources, cacheRoot: 'unused' }), resources);
    const originalIndex = fs.readFileSync(path.join(bundled.horizonResources, 'asset-index.json'));
    fs.writeFileSync(path.join(bundled.horizonResources, 'asset-index.json'), '{}');
    await assert.rejects(ensureHorizonResources(hydration), /Повреждён/);
    fs.writeFileSync(path.join(bundled.horizonResources, 'asset-index.json'), originalIndex);
    const originalManifest = fs.readFileSync(path.join(bundled.horizonResources, COMPACT_MANIFEST));
    const maliciousIndex = JSON.stringify({ objects: { 'minecraft/sounds/../../outside.ogg': { hash: audioHash, size: audioBytes.length } } });
    fs.writeFileSync(path.join(bundled.horizonResources, 'asset-index.json'), maliciousIndex);
    fs.writeFileSync(path.join(bundled.horizonResources, COMPACT_MANIFEST), JSON.stringify({
      ...JSON.parse(originalManifest), indexHash: require('node:crypto').createHash('sha256').update(maliciousIndex).digest('hex')
    }));
    await assert.rejects(ensureHorizonResources(hydration), /Некорректный аудиофайл/);
    fs.writeFileSync(path.join(bundled.horizonResources, COMPACT_MANIFEST), originalManifest);
    fs.writeFileSync(path.join(bundled.horizonResources, 'asset-index.json'), originalIndex);
    assert.deepEqual(resolveHorizonPaths({ horizonExecutable: path.join(temporary, 'removed.exe'), horizonResources: 'removed' }, bundled), bundled);
    assert.equal(resolveHorizonPaths({ horizonExecutable: executable, horizonResources: temporary }, bundled).horizonExecutable, executable);
    assert.equal(findHorizonInstallation(path.join(temporary, 'empty'), path.join(temporary, 'no-versions')).horizonExecutable, '');
    const options = {
      executable, resources: temporary, root: path.join(temporary, 'own game'),
      auth: { name: 'Owner', uuid: 'uuid', access_token: 'secret-test-token' }
    };
    const names = ['--resources', '--game-dir', '--home', '--session-stdin'];
    const probe = (file, args, settings, callback) => {
      assert.equal(file, executable);
      assert.deepEqual(args, ['--launch-api']);
      assert(settings.timeout > 0);
      callback(null, JSON.stringify({ launch_api: '0.1.0', options: names.map(name => ({ name })) }));
    };
    const plan = await prepareHorizonLaunch(options, probe);
    assert.equal(plan.session.access_token, options.auth.access_token);
    assert(!JSON.stringify(plan.args).includes(options.auth.access_token));
    assert.equal(plan.args[3], options.root);
    startHorizon(plan, (file, args, config) => {
      assert.equal(file, executable);
      assert.equal(config.shell, false);
      assert.equal(config.cwd, options.root);
      assert.deepEqual(config.stdio, ['pipe', 'pipe', 'pipe']);
    });
    await assert.rejects(prepareHorizonLaunch({ ...options, auth: null }, probe), /Microsoft/);
    await assert.rejects(prepareHorizonLaunch({ ...options, executable: path.join(temporary, 'other.exe') }, probe), /horizon-client/);
    await assert.rejects(prepareHorizonLaunch({ ...options, resources: path.join(temporary, 'missing') }, probe), /ресурсов/);
    await assert.rejects(prepareHorizonLaunch(options, (_, __, ___, done) => done(null, '{}')), /Несовместимый/);
    await assert.rejects(prepareHorizonLaunch(options, (_, __, ___, done) => done(null, 'invalid')), /некорректное/);
    await assert.rejects(prepareHorizonLaunch(options, (_, __, ___, done) => done(Error('old build'))), /Обновите/);

    const source = fs.readFileSync('main.js', 'utf8');
    let handler;
    const sessions = new Map([['offline', { guest: true }]]);
    vm.runInNewContext(source.slice(source.indexOf("ipcMain.handle('launch-horizon'"), source.indexOf("ipcMain.handle('launch-minecraft'")), {
      ipcMain: { handle: (_, callback) => { handler = callback; } },
      activeLaunches: new Map(), activeSessions: sessions
    });
    assert.equal((await handler({}, { user: { sessionToken: 'offline', license: true } })).success, false);
    assert.equal((await handler({}, { user: { sessionToken: 'forged', license: true } })).success, false);
    const { EventEmitter } = require('node:events');
    const { PassThrough } = require('node:stream');
    const { LaunchSession } = require('../lib/launch-session');
    const active = new Map(), emitted = [], written = [];
    const child = new EventEmitter();
    child.stdout = new PassThrough(); child.stderr = new PassThrough(); child.stdin = new PassThrough();
    child.exitCode = null; child.pid = 4321;
    child.stdin.on('data', chunk => written.push(chunk.toString()));
    sessions.set('owner', { microsoft: true, nickname: 'Owner' });
    vm.runInNewContext(source.slice(source.indexOf("ipcMain.handle('launch-horizon'"), source.indexOf("ipcMain.handle('launch-minecraft'")), {
      ipcMain:{handle:(_,callback)=>{handler=callback;}}, activeLaunches:active, activeSessions:sessions,
      getSettings:()=>({horizonExecutable:executable,horizonResources:temporary, experiments:{rustMinecraft:true}}),
      findBuildInstance:()=>({id:'test_instance'}), instancePaths:{root:()=>temporary}, syncHorizonInstance:()=>({skippedJavaMods:2}),
      gameStorage:{root:temporary}, path, crypto:require('node:crypto'),
      app:{getPath:()=>temporary}, BrowserWindow:{fromWebContents:()=>null}, LaunchSession,
      GameLogs:class { constructor(){this.secrets=[];} lifecycle(){} redact(value){return value;} write(_,value){return value;} async collect(){} },
      getSessionMinecraftAuth:async()=>options.auth,
      ensureHorizonResources:async value=>{assert.equal(value.resources,temporary); return temporary;},
      prepareHorizonLaunch:async value=>{assert(value.root.includes(path.join(temporary,'horizon'))); return plan;},
      startHorizon:()=>{setImmediate(()=>child.emit('spawn'));return child;}
    });
    const result = await handler({sender:{send:(channel,data)=>emitted.push([channel,data])}},{user:{sessionToken:'owner'}});
    assert.equal(result.success,true); assert.equal(active.size,1);
    assert.equal(result.pid,4321); assert.equal(active.values().next().value.engine,'horizon');
    assert.equal(result.instanceId,'test_instance'); assert.equal(result.content.skippedJavaMods,2);
    assert.equal(JSON.parse(written.join('')).access_token,options.auth.access_token);
    assert(emitted.some(([channel, data])=>channel==='launch-started' && data.pid === 4321 && data.engine === 'horizon'));
    child.emit('close',0); assert.equal(active.size,0);
    assert(emitted.some(([channel])=>channel==='launch-closed'));
    console.log('PASS: bundled Horizon discovery, license/resources packaging without sessions/logs, stale path recovery, API negotiation, isolated paths, piped session and licensed-account checks');
  } finally {
    fs.rmSync(temporary, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
