const path = require('node:path');
const AdmZip = require('adm-zip');

/** Reads declared mod labels/icons locally. Never sends file identifiers online. */
class LocalModMetadata {
  constructor() { this.cache = new Map(); this.bytes = 0; }
  read(file, stat) {
    const key = `${file}:${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`;
    if (this.cache.has(key)) return this.cache.get(key).value;
    let result = {};
    try {
      const zip = new AdmZip(file);
      const read = name => {
        const entry = zip.getEntry(name);
        if (!entry || entry.header.size > 256 * 1024) return null;
        return entry.getData().toString('utf8');
      };
      let metadata, icon;
      const fabric = read('fabric.mod.json'), quilt = read('quilt.mod.json');
      if (fabric) { metadata = JSON.parse(fabric); icon = metadata.icon; }
      else if (quilt) { metadata = JSON.parse(quilt).quilt_loader?.metadata; icon = metadata?.icon; }
      else {
        const legacy = read('mcmod.info');
        if (legacy) { const json = JSON.parse(legacy); metadata = (Array.isArray(json) ? json : json.modList)?.[0]; icon = metadata?.logoFile; }
        const toml = read('META-INF/neoforge.mods.toml') || read('META-INF/mods.toml');
        if (!metadata && toml) {
          metadata = { name: toml.match(/^\s*displayName\s*=\s*"([^"]+)"/m)?.[1] };
          icon = toml.match(/^\s*logoFile\s*=\s*"([^"]+)"/m)?.[1];
        }
      }
      if (typeof metadata?.name === 'string') result.displayName = metadata.name.slice(0, 150);
      if (icon && typeof icon === 'object') icon = icon['128'] || icon['64'] || Object.values(icon)[0];
      if (typeof icon === 'string' && path.extname(icon).toLowerCase() === '.png') {
        const entry = zip.getEntry(icon);
        if (entry && entry.header.size <= 128 * 1024) {
          const png = entry.getData();
          if (png.subarray(0, 8).toString('hex') === '89504e470d0a1a0a') result.iconUrl = `data:image/png;base64,${png.toString('base64')}`;
        }
      }
    } catch { /* Unsupported or damaged metadata must not hide the JAR. */ }
    const bytes = Buffer.byteLength(JSON.stringify(result)) * 2;
    while (this.cache.size && (this.cache.size >= 64 || this.bytes + bytes > 2 * 1024 * 1024)) {
      const oldest = this.cache.keys().next().value;
      this.bytes -= this.cache.get(oldest).bytes;
      this.cache.delete(oldest);
    }
    if (bytes <= 2 * 1024 * 1024) { this.cache.set(key, { value: result, bytes }); this.bytes += bytes; }
    return result;
  }
}
module.exports = { LocalModMetadata };
