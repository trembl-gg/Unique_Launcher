const path = require('node:path');
const fs = require('node:fs');
const crypto = require('node:crypto');
class InstancePaths {
  constructor({ store, base }) { this.store = store; this.base = base; }
  root(owner, id, legacyCandidate = false) {
    if (!id) return this.base();
    if (!/^[A-Za-z0-9_-]+$/.test(id)) throw new Error('Invalid instance identifier.');
    const key = `${owner}:${id}`;
    let legacy = this.store.get('legacyGameInstance', '');
    if (!legacy && legacyCandidate) {
      legacy = key;
      this.store.set('legacyGameInstance', key);
    }
    if (legacy === key) return this.base();
    const ownerKey = crypto.createHash('sha256').update(String(owner)).digest('hex').slice(0, 24);
    return path.join(this.base(), 'instances', ownerKey, id);
  }
  content(root, type) {
    const name = { mods: 'mods', resourcepack: 'resourcepacks', shader: 'shaderpacks', worlds: 'saves' }[type];
    if (!name) throw new Error('Unsupported content type.');
    const folder = path.join(root, name);
    if (fs.existsSync(folder) && fs.lstatSync(folder).isSymbolicLink()) throw new Error('Linked content folders are not supported.');
    fs.mkdirSync(folder, { recursive: true });
    return folder;
  }
  item(folder, name) {
    if (typeof name !== 'string' || !name || /[. ]$/.test(name) || path.basename(name) !== name || /[\\/:\x00-\x1f]/.test(name)) throw new Error('Invalid content name.');
    const target = path.join(folder, name);
    if (fs.lstatSync(target).isSymbolicLink()) throw new Error('Linked content is not supported.');
    return target;
  }
}
module.exports = { InstancePaths };
