const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

function exists(target) {
  try { fs.lstatSync(target); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; }
}

function digest(target) {
  const stat = fs.lstatSync(target);
  if (stat.isSymbolicLink()) throw new Error('Horizon: ссылки в содержимом сборки не поддерживаются.');
  if (stat.isDirectory()) return crypto.createHash('sha256').update(fs.readdirSync(target).sort().map(name => name + ':' + digest(path.join(target, name))).join('\n')).digest('hex');
  if (!stat.isFile()) throw new Error('Horizon: неподдерживаемый тип файла.');
  const hash = crypto.createHash('sha256');
  const buffer = Buffer.alloc(1024 * 1024);
  const descriptor = fs.openSync(target, 'r');
  try {
    let bytes;
    while ((bytes = fs.readSync(descriptor, buffer, 0, buffer.length, null))) hash.update(buffer.subarray(0, bytes));
    return hash.digest('hex');
  } finally { fs.closeSync(descriptor); }
}

// Java originals stay untouched; worlds are copied once and never merged back.
function syncHorizonInstance(source, root) {
  fs.mkdirSync(root, { recursive: true });
  for (const folder of ['', 'resourcepacks', 'horizon-mods', 'saves']) {
    const destination = path.join(root, folder);
    if (exists(destination) && fs.lstatSync(destination).isSymbolicLink()) throw new Error('Horizon: папка Rust-сборки является ссылкой.');
  }
  const manifestFile = path.join(root, '.unique-horizon-import.json');
  const previous = fs.existsSync(manifestFile) ? JSON.parse(fs.readFileSync(manifestFile, 'utf8')) : {};
  const managed = previous.files || {};
  const files = {};
  for (const folder of ['resourcepacks', 'horizon-mods']) {
    const directory = path.join(source, folder);
    if (!exists(directory)) continue;
    if (fs.lstatSync(directory).isSymbolicLink()) throw new Error('Horizon: папка содержимого является ссылкой.');
    for (const name of fs.readdirSync(directory)) {
      if (name.endsWith('.disabled')) continue;
      const relative = folder + '/' + name;
      const original = path.join(directory, name), destination = path.join(root, relative);
      const hash = digest(original);
      if (exists(destination)) {
        const current = digest(destination);
        if (current === hash) { files[relative] = hash; continue; }
        if (current !== managed[relative]) throw new Error('Horizon: файл изменён в Rust-сборке: ' + relative + '. Сохраните его отдельно перед обновлением.');
        fs.rmSync(destination, { recursive: true });
      }
      fs.cpSync(original, destination, { recursive: true });
      files[relative] = hash;
    }
  }
  for (const [relative, hash] of Object.entries(managed)) {
    if (!/^(resourcepacks|horizon-mods)\/[^/\\]+$/.test(relative) || /\/(\.|\.\.)$/.test(relative)) throw new Error('Horizon: повреждён список импортированных файлов.');
    const destination = path.join(root, relative);
    if (!files[relative] && exists(destination) && digest(destination) === hash) fs.rmSync(destination, { recursive: true });
  }
  const importedWorlds = new Set(previous.worlds || []);
  const saves = path.join(source, 'saves');
  if (exists(saves)) {
    if (fs.lstatSync(saves).isSymbolicLink()) throw new Error('Horizon: папка миров является ссылкой.');
    for (const name of fs.readdirSync(saves)) {
      if (name.endsWith('.disabled') || importedWorlds.has(name)) continue;
      const world = path.join(saves, name), destination = path.join(root, 'saves', name);
      if (!fs.lstatSync(world).isDirectory()) continue;
      digest(world);
      if (exists(destination)) digest(destination);
      else fs.cpSync(world, destination, { recursive: true });
      importedWorlds.add(name);
    }
  }
  for (const name of ['options.txt', 'servers.dat']) {
    const original = path.join(source, name), destination = path.join(root, name);
    if (exists(destination) && fs.lstatSync(destination).isSymbolicLink()) throw new Error('Horizon: настройки Rust-сборки являются ссылкой.');
    if (exists(original) && !exists(destination)) { digest(original); fs.copyFileSync(original, destination); }
  }
  const mods = path.join(source, 'mods');
  if (exists(mods) && fs.lstatSync(mods).isSymbolicLink()) throw new Error('Horizon: папка модов является ссылкой.');
  const skippedJavaMods = fs.existsSync(mods) ? fs.readdirSync(mods).filter(name => /\.jar$/i.test(name)).length : 0;
  const next = manifestFile + '.' + crypto.randomUUID() + '.tmp';
  fs.writeFileSync(next, JSON.stringify({ files, worlds: [...importedWorlds] }), { flag: 'wx' });
  fs.renameSync(next, manifestFile);
  return { importedFiles: Object.keys(files).length, worlds: importedWorlds.size, skippedJavaMods };
}

module.exports = { syncHorizonInstance };
