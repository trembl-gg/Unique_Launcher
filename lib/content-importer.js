const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');
const AdmZip = require('adm-zip');

class ContentImporter {
  constructor({ folder, busy }) { Object.assign(this, { folder, busy }); }
  safeName(name) {
    if (!name || name === '.' || name === '..' || /[<>:"/\\|?*\x00-\x1f]/.test(name) || /[. ]$/.test(name) || /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i.test(name)) throw new Error('Недопустимое имя файла.');
    return name;
  }
  child(root, relative) {
    const parts = relative.replace(/\\/g, '/').split('/').filter(Boolean);
    for (const part of parts) this.safeName(part);
    const target = path.resolve(root, ...parts);
    if (!target.startsWith(path.resolve(root) + path.sep)) throw new Error('Путь архива выходит за пределы папки.');
    return target;
  }
  async exists(file) { return fs.access(file).then(() => true, () => false); }
  async copyWorld(source, target, budget) {
    for (const entry of await fs.readdir(source, { withFileTypes: true })) {
      if (++budget.count > 100000) throw new Error('Слишком много файлов в мире.');
      this.safeName(entry.name);
      const from = path.join(source, entry.name), to = path.join(target, entry.name);
      if (entry.isSymbolicLink()) throw new Error('Ссылки в папках миров не поддерживаются.');
      if (entry.isDirectory()) { await fs.mkdir(to); await this.copyWorld(from, to, budget); }
      else if (entry.isFile()) {
        budget.bytes += (await fs.stat(from)).size;
        if (budget.bytes > 4 * 1024 ** 3) throw new Error('Мир больше 4 ГБ.');
        await fs.copyFile(from, to, fs.constants.COPYFILE_EXCL);
      } else throw new Error('Неподдерживаемый файл в мире.');
    }
  }
  async importOne(type, source, context) {
    if (this.busy() && type !== 'cape') throw new Error('Сначала закройте Minecraft.');
    if (!['mods', 'resourcepack', 'shader', 'worlds', 'cape'].includes(type)) throw new Error('Выберите раздел для импорта.');
    const stat = await fs.lstat(source);
    if (stat.isSymbolicLink()) throw new Error('Перетащите исходный файл, а не ссылку.');
    const name = this.safeName(path.basename(source));
    const ext = path.extname(name).toLowerCase();
    const folder = path.resolve(this.folder(type, context));
    await fs.mkdir(folder, { recursive: true });
    if (type !== 'worlds') {
      const allowed = { mods: ['.jar'], resourcepack: ['.zip'], shader: ['.zip'], cape: ['.png', '.gif'] }[type];
      if (!stat.isFile() || !allowed.includes(ext)) throw new Error(`Нужен файл ${allowed.join(' / ')}.`);
      if (stat.size > (type === 'cape' ? 16 : 512) * 1024 ** 2) throw new Error('Файл слишком большой для импорта.');
      if (type !== 'cape') {
        const zip = new AdmZip(source);
        if (type === 'resourcepack' && !zip.getEntry('pack.mcmeta')) throw new Error('В корне текстур-пака нет pack.mcmeta.');
        if (type === 'shader' && !zip.getEntries().some(entry => entry.entryName.startsWith('shaders/'))) throw new Error('В архиве нет папки shaders.');
      } else {
        const handle = await fs.open(source, 'r');
        try {
          const header = Buffer.alloc(8); await handle.read(header, 0, 8, 0);
          if (ext === '.png' ? header.toString('hex') !== '89504e470d0a1a0a' : !/^GIF8[79]a/.test(header.toString('ascii'))) throw new Error('Некорректный PNG/GIF.');
        } finally { await handle.close(); }
      }
      const target = path.join(folder, type === 'cape' ? `${crypto.randomUUID()}${ext}` : name);
      await fs.copyFile(source, target, fs.constants.COPYFILE_EXCL);
      return { name, path: target };
    }
    if (!stat.isDirectory() && (!stat.isFile() || ext !== '.zip')) throw new Error('Перетащите ZIP мира или папку с level.dat.');
    if (stat.isFile() && stat.size > 512 * 1024 ** 2) throw new Error('ZIP мира больше 512 МБ. Используйте папку мира.');
    const target = path.join(folder, this.safeName(stat.isDirectory() ? name : path.basename(name, ext)));
    if (await this.exists(target)) throw new Error('Мир с таким именем уже существует. Переименуйте импортируемый мир.');
    const staging = await fs.mkdtemp(path.join(folder, '.import-'));
    try {
      if (stat.isDirectory()) {
        if (!(await this.exists(path.join(source, 'level.dat')))) throw new Error('В папке нет level.dat.');
        const realSource = await fs.realpath(source);
        const realStage = await fs.realpath(staging);
        if (realStage.startsWith(realSource + path.sep)) throw new Error('Нельзя импортировать папку внутрь неё самой.');
        await this.copyWorld(source, staging, { count: 0, bytes: 0 });
      } else {
        const entries = new AdmZip(source).getEntries();
        if (entries.length > 100000) throw new Error('Слишком много файлов в архиве.');
        const levels = entries.filter(entry => !entry.isDirectory && /(^|\/)level\.dat$/.test(entry.entryName));
        if (levels.length !== 1) throw new Error('ZIP должен содержать ровно один мир с level.dat.');
        const prefix = levels[0].entryName.slice(0, -'level.dat'.length);
        let total = 0;
        for (const entry of entries) {
          this.child(staging, entry.entryName.replace(/\/$/, '')); // Validate even entries outside the selected world.
          if (((entry.attr >>> 16) & 0xf000) === 0xa000) throw new Error('Ссылки в ZIP не поддерживаются.');
          if (!entry.entryName.startsWith(prefix) || entry.isDirectory) continue;
          total += entry.header.size;
          if (entry.header.size > 256 * 1024 ** 2 || total > 4 * 1024 ** 3) throw new Error('Распакованный мир слишком большой.');
          const output = this.child(staging, entry.entryName.slice(prefix.length));
          await fs.mkdir(path.dirname(output), { recursive: true });
          await fs.writeFile(output, entry.getData(), { flag: 'wx' });
        }
      }
      if (this.busy()) throw new Error('Minecraft был запущен во время импорта. Повторите после закрытия игры.');
      if (await this.exists(target)) throw new Error('Мир с таким именем уже существует.');
      await fs.rename(staging, target);
      return { name: path.basename(target), path: target };
    } finally { await fs.rm(staging, { recursive: true, force: true }); }
  }
}
module.exports = { ContentImporter };
