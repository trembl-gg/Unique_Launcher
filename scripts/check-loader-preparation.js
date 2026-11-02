const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const AdmZip = require('adm-zip');
const { createLoaderService } = require('../lib/loader-service');

(async () => {
  const source = fs.readFileSync(path.join(__dirname, '../main.js'), 'utf8');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'unique-loader-preparation-'));
  const minecraftVersion = '26.3';
  const vanilla = { id: minecraftVersion, mainClass: 'net.minecraft.client.main.Main', arguments: { game: ['--username', '${auth_player_name}'] } };
  const jar = Buffer.from('fixture client jar');
  const ensureDir = directory => fs.mkdirSync(directory, { recursive: true });
  const metadata = '<versions>' + [
    '1.20.1-47.1.0', '1.20.1-47.1.106', '20.4.253', '21.0.167', '21.1.265',
    '21.10.1', '26.1.0.10', '26.1.2.125', '26.3.0.9', '26.3.0.101',
    '26.3.0.102-beta', '26.3.1.5', '26.4.0.1'
  ].map(version => `<version>${version}</version>`).join('') + '</versions>';
  let moduleLoads = 0, jarDownloads = 0;
  const context = vm.createContext({
    fs, path, os, AdmZip, ensureDir,
    normalizeModLoader: value => value,
    FABRIC_META_URL: 'https://fabric.test', QUILT_META_URL: 'https://quilt.test',
    FORGE_MAVEN_URL: 'https://forge.test', NEOFORGE_MAVEN_URL: 'https://neoforge.test',
    BrowserWindow: { getAllWindows: () => [] },
    require(name) {
      if (name === './lib/loader-service') return { createLoaderService };
      if (name === './lib/legacy-download-progress') return { observeLegacyDownloads() {} };
      if (name === 'request') return {};
      assert.equal(name, 'minecraft-launcher-core');
      moduleLoads++;
      return { handler: {
        async getVersion(version) { assert.equal(version, minecraftVersion); return vanilla; },
        async getJar(profile, version, directory) {
          assert.equal(profile.id, version); jarDownloads++;
          fs.writeFileSync(path.join(directory, `${version}.jar`), jar);
          fs.writeFileSync(path.join(directory, `${version}.json`), JSON.stringify(profile));
        }
      } };
    },
    async getJson(url) {
      if (url.endsWith('/profile/json')) {
        return { id: url.includes('fabric') ? 'fabric-test' : 'quilt-test', inheritsFrom: minecraftVersion, libraries: [], arguments: { jvm: ['-Dloader=test'] } };
      }
      return [{ loader: { stable: true, version: '0.18.0' } }];
    },
    async getText(url) {
      return url.includes('forge.test/net/minecraftforge')
        ? '<version>26.3-64.0.0</version>' : metadata;
    },
    async downloadFile(url, destination) {
      ensureDir(path.dirname(destination));
      const zip = new AdmZip();
      zip.addFile('version.json', Buffer.from(JSON.stringify({ id: url.includes('neoforge.test') ? 'neoforge-test' : 'forge-test', libraries: [] })));
      zip.writeZip(destination);
    },
    hashFile() { throw Error('Unexpected library hash'); }
  });
  vm.runInContext(source.slice(source.indexOf('let launcher;'), source.indexOf('function loadDotEnv(')), context);
  vm.runInContext(source.slice(source.indexOf('function parseMinecraftReleaseId('), source.indexOf('function compareMinecraftReleaseIds(')), context);
  const installerSource = source.slice(source.indexOf('let loaderService = null;'), source.indexOf('function getOsName('));
  vm.runInContext(installerSource, context);
  try {
    // A fresh backend must initialize the core even when a modded instance is launched first.
    for (const type of ['fabric', 'vanilla', 'forge', 'neoforge', 'quilt']) {
      vm.runInContext('launcher = undefined; loaderService = null;', context);
      const instanceRoot = path.join(root, type);
      const result = await context.ensureSelectedLoaderVersion(instanceRoot, { modLoader: type, minecraftVersion });
      assert.equal(result.name.toLowerCase(), type);
      const versionDir = path.join(instanceRoot, 'versions', minecraftVersion);
      assert.deepEqual(fs.readFileSync(path.join(versionDir, `${minecraftVersion}.jar`)), jar);
      assert.equal(JSON.parse(fs.readFileSync(path.join(versionDir, `${minecraftVersion}.json`))).id, minecraftVersion);
      if (type !== 'vanilla') assert.deepEqual(fs.readFileSync(path.join(instanceRoot, 'versions', result.id, `${result.id}.jar`)), jar);
      const before = jarDownloads;
      await context.ensureSelectedLoaderVersion(instanceRoot, { modLoader: type, minecraftVersion });
      assert.equal(jarDownloads, before, 'cached clients must be reused');
    }
    assert.equal(moduleLoads, 5, 'each cold backend loads the core once');
    const loader = vm.runInContext('loaderService', context);
    for (const [game, expected] of [
      ['1.20.1', '1.20.1-47.1.106'], ['1.20.4', '20.4.253'], ['1.21', '21.0.167'],
      ['1.21.1', '21.1.265'], ['26.1', '26.1.0.10'], ['26.1.2', '26.1.2.125'],
      ['26.3', '26.3.0.101'], ['26.3.1', '26.3.1.5']
    ]) assert.equal((await loader.resolveNeoForgeArtifact(game)).version, expected);
    for (const game of ['26.9', '26.3-snapshot-1', 'bad-version']) {
      await assert.rejects(loader.resolveNeoForgeArtifact(game), /NeoForge was not found/);
    }
    assert.equal((await loader.resolveNeoForgeArtifact('26.3', '26.3.0.84')).version, '26.3.0.84');
    assert.equal((await loader.resolveNeoForgeArtifact('1.20.1', '47.1.106')).version, '1.20.1-47.1.106');
    loader.dependencies.getText = async () => '<version>26.3.0.102-beta</version>';
    assert.equal((await loader.resolveNeoForgeArtifact('26.3')).version, '26.3.0.102-beta');
    console.log('PASS: cold and cached preparation for Vanilla/Fabric/Forge/NeoForge/Quilt; legacy and 26.x NeoForge matching, pinned versions, unavailable versions and beta fallback');
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
