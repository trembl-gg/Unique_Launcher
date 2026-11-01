const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { findHorizonInstallation } = require('../lib/horizon-client');
const { COMPACT_MANIFEST, AUDIO_PREFIX } = require('../lib/horizon-resources');

function packageHorizon(output, installation = findHorizonInstallation()) {
  if (!installation.horizonExecutable || !installation.horizonResources) throw new Error('Не найдена подготовленная установка Horizon. Установите Horizon и подготовьте ресурсы Minecraft 26.3 перед сборкой.');
  const source = path.dirname(installation.horizonExecutable);
  const destination = path.join(output, 'horizon');
  if (!fs.existsSync(path.join(source, 'LICENSE'))) throw new Error('Horizon LICENSE is missing.');
  fs.mkdirSync(destination, { recursive: true });
  for (const name of ['horizon-client.exe', 'LICENSE', 'PLAY.txt', 'research-lock.json']) {
    const file = path.join(source, name);
    if (fs.existsSync(file)) fs.copyFileSync(file, path.join(destination, name));
  }
  const resources = path.join(destination, 'resources', '26.3');
  const sounds = path.join(resources, 'assets', ...AUDIO_PREFIX.split('/').filter(Boolean));
  if (path.resolve(sounds).startsWith(path.resolve(output) + path.sep)) fs.rmSync(sounds, { recursive: true, force: true });
  fs.cpSync(installation.horizonResources, resources, {
    recursive: true,
    filter: file => !file.endsWith('.log') && !path.relative(installation.horizonResources, file).replace(/\\/g, '/').startsWith('assets/' + AUDIO_PREFIX.slice(0, -1))
  });
  const core = crypto.createHash('sha256');
  function hashDirectory(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) hashDirectory(file);
      else if (entry.name !== COMPACT_MANIFEST) core.update(path.relative(resources, file)).update(fs.readFileSync(file));
    }
  }
  hashDirectory(resources);
  fs.writeFileSync(path.join(resources, COMPACT_MANIFEST), JSON.stringify({
    schema: 1, coreHash: core.digest('hex'),
    indexHash: crypto.createHash('sha256').update(fs.readFileSync(path.join(resources, 'asset-index.json'))).digest('hex')
  }));
  console.log('Compact Horizon included; verified Minecraft audio downloads on first Rust launch.');
}

if (require.main === module) packageHorizon(path.resolve(process.argv[2] || 'dist/rust'));
module.exports = { packageHorizon };
