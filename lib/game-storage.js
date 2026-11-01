const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

// Changes are applied only on backend startup, before downloads or Java start.
// Never delete the old game directory, including after a successful copy.
class GameStorage {
  constructor({ store, launcherRoot, legacyRoot, onMigration = () => {} }) {
    Object.assign(this, { store, legacyRoot });
    this.defaultRoot = path.join(launcherRoot, 'game-data');
    this.root = store.get('gameStorageRoot', '') || (fs.existsSync(legacyRoot) ? legacyRoot : this.defaultRoot);
    this.error = '';
    const pending = store.get('gameStoragePending', '');
    if (pending) {
      onMigration(true);
      try {
        this.validate(pending);
        if (fs.existsSync(this.root)) this.copyVerified(this.root, pending);
        else fs.mkdirSync(pending, { recursive: true });
        store.set('gameStorageRoot', pending);
        this.root = pending;
        store.delete('gameStoragePending');
      } catch (error) {
        this.error = error.message;
        // Failed copies remain available for inspection; no automatic retry/overwrite.
        store.delete('gameStoragePending');
      } finally {
        onMigration(false);
      }
    }
  }

  info() {
    return { root: this.root, defaultRoot: this.defaultRoot, pending: this.store.get('gameStoragePending', ''), error: this.error };
  }

  validate(target) {
    if (!path.isAbsolute(target)) throw new Error('Choose an absolute folder path.');
    const source = path.resolve(this.root).toLowerCase();
    const destination = path.resolve(target).toLowerCase();
    if (destination === path.parse(destination).root || destination === source || destination.startsWith(source + path.sep) || source.startsWith(destination + path.sep)) {
      throw new Error('The new folder must be separate from the current game folder.');
    }
    for (let current = path.resolve(target); ; current = path.dirname(current)) {
      if (fs.existsSync(current) && fs.lstatSync(current).isSymbolicLink()) throw new Error('Linked folders are not supported.');
      if (current === path.dirname(current)) break;
    }
    if (fs.existsSync(target) && (!fs.statSync(target).isDirectory() || fs.readdirSync(target).length)) {
      throw new Error('Choose an empty folder. Existing files will not be overwritten.');
    }
  }

  schedule(target) {
    target = path.resolve(target);
    this.validate(target);
    fs.mkdirSync(target, { recursive: true });
    fs.accessSync(target, fs.constants.W_OK);
    this.store.set('gameStoragePending', target);
    return this.info();
  }

  copyVerified(source, target) {
    const stat = fs.lstatSync(source);
    if (stat.isSymbolicLink()) throw new Error('Linked game files cannot be migrated automatically.');
    if (stat.isDirectory()) {
      fs.mkdirSync(target, { recursive: true });
      for (const name of fs.readdirSync(source)) this.copyVerified(path.join(source, name), path.join(target, name));
    } else if (stat.isFile()) {
      fs.copyFileSync(source, target, fs.constants.COPYFILE_EXCL);
      const digest = file => {
        const hash = crypto.createHash('sha256');
        const fd = fs.openSync(file, 'r');
        const buffer = Buffer.allocUnsafe(1024 * 1024);
        try { let count; while ((count = fs.readSync(fd, buffer, 0, buffer.length, null))) hash.update(buffer.subarray(0, count)); }
        finally { fs.closeSync(fd); }
        return hash.digest('hex');
      };
      if (digest(source) !== digest(target)) throw new Error('Game file verification failed. The original folder is unchanged.');
    } else throw new Error('Unsupported file in the game folder.');
  }
}
module.exports = { GameStorage };
