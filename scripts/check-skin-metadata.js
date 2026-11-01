const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const AdmZip = require('adm-zip');
const { SkinService } = require('../lib/skin-service');
const { LocalModMetadata } = require('../lib/local-mod-metadata');

async function run() {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'unique-feature-test-'));
  try {
    // Header fixture: no network request or real account is used by this test.
    const png = Buffer.alloc(24);
    Buffer.from('89504e470d0a1a0a', 'hex').copy(png);
    png.writeUInt32BE(64, 16); png.writeUInt32BE(64, 20);
    const file = path.join(root, 'skin.png');
    await fs.writeFile(file, png);
    const disk = new Map();
    let active = 'one', calls = 0, failUpload = false;
    const sessions = { one: { nickname: 'One', microsoft: true, minecraftAuth: { uuid: 'uuid-one' } }, two: { nickname: 'Two', guest: true } };
    const service = new SkinService({
      root: path.join(root, 'album'),
      store: { get: (key, fallback) => structuredClone(disk.get(key) ?? fallback), set: (key, value) => disk.set(key, structuredClone(value)) },
      getSession: token => { if (token !== active) throw new Error('Account changed'); return sessions[token]; },
      getAuth: async token => ({ access_token: `token-${token}`, uuid: 'uuid-one' }),
      getSettings: () => ({}), saveSettings: settings => settings,
      fetchImpl: async (url, options) => {
        calls++;
        assert.equal(url, 'https://api.minecraftservices.com/minecraft/profile/skins');
        assert.equal(options.headers.Authorization, 'Bearer token-one');
        assert.equal(options.body.get('variant'), 'slim');
        return { ok: !failUpload, status: failUpload ? 403 : 200 };
      }
    });
    const result = await service.apply({ sessionToken: 'one', filePath: file, model: 'slim' });
    assert.equal(calls, 1); assert.equal(result.licensed, true);
    assert.equal(service.list('one').length, 1);
    failUpload = true;
    await assert.rejects(service.apply({ sessionToken: 'one', filePath: file, model: 'slim' }), /403/);
    assert.equal(service.list('one').length, 1);
    active = 'two';
    assert.equal(service.list('two').length, 0);
    await assert.rejects(service.apply({ sessionToken: 'one', filePath: file }), /Account changed/);
    await service.apply({ sessionToken: 'two', filePath: file });
    assert.equal(calls, 2, 'offline skins do not call Minecraft services');
    const jar = path.join(root, 'mod.jar');
    const zip = new AdmZip();
    zip.addFile('fabric.mod.json', Buffer.from(JSON.stringify({ id: 'example', name: 'Friendly Mod', icon: 'icon.png' })));
    zip.addFile('icon.png', png);
    zip.writeZip(jar);
    const metadata = new LocalModMetadata().read(jar, await fs.stat(jar));
    assert.equal(metadata.displayName, 'Friendly Mod');
    assert.match(metadata.iconUrl, /^data:image\/png;base64,/);
    console.log('PASS: skin account binding, upload failure, album isolation, offline behavior, local JAR names/icons');
    const { ContentImporter } = require('../lib/content-importer');
    let busy = false;
    const importer = new ContentImporter({ folder: type => path.join(root, 'target', type), busy: () => busy });
    await importer.importOne('mods', jar, {});
    await assert.rejects(importer.importOne('mods', jar, {}), { code: 'EEXIST' });
    assert.equal((await fs.readFile(jar)).length, (await fs.readFile(path.join(root, 'target', 'mods', 'mod.jar'))).length);
    await assert.rejects(importer.importOne('mods', file, {}), /\.jar/);
    busy = true;
    await assert.rejects(importer.importOne('mods', jar, {}), /Minecraft/);
    busy = false;
    const world = new AdmZip(); world.addFile('MyWorld/level.dat', Buffer.from('test')); world.addFile('MyWorld/region/r.0.0.mca', Buffer.from('test region'));
    const worldPath = path.join(root, 'World.zip'); world.writeZip(worldPath);
    const importedWorld = await importer.importOne('worlds', worldPath, {});
    assert.equal(await fs.readFile(path.join(importedWorld.path, 'level.dat'), 'utf8'), 'test');
    assert.equal(await fs.readFile(path.join(importedWorld.path, 'region', 'r.0.0.mca'), 'utf8'), 'test region');
    await assert.rejects(importer.importOne('worlds', worldPath, {}), /существует/);
    assert.throws(() => importer.child(root, '../escape'), /имя/);
    assert.throws(() => importer.child(root, 'C:/escape'), /имя/);
    const pack = new AdmZip(); pack.addFile('pack.mcmeta', Buffer.from('{}'));
    const packPath = path.join(root, 'textures.zip'); pack.writeZip(packPath);
    await importer.importOne('resourcepack', packPath, {});
    await assert.rejects(importer.importOne('shader', packPath, {}), /shaders/);
    pack.addFile('shaders/test.fsh', Buffer.from('test')); pack.writeZip(packPath);
    await importer.importOne('shader', packPath, {});
    console.log('PASS: dropped mods, resource packs, shaders and worlds; no overwrite; running-game guard; archive path validation');
  } finally { await fs.rm(root, { recursive: true, force: true }); }
}
run().catch(error => { console.error(error); process.exitCode = 1; });
