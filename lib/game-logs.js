const fs = require('node:fs');
const path = require('node:path');

class GameLogs {
  constructor({ root, directory, secrets = [], emit = () => {} }) {
    this.root = root;
    this.started = Date.now();
    this.secrets = secrets.filter(value => typeof value === 'string' && value.length > 5);
    this.emit = emit;
    try { fs.mkdirSync(directory, { recursive: true }); } catch { }
    this.file = path.join(directory, `minecraft-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
    this.bytes = 0;
    this.write('launcher', 'Preparing Minecraft');
  }
  redact(value) {
    let text = String(value);
    for (const secret of this.secrets) text = text.split(secret).join('[REDACTED]');
    return text.replace(/((?:--accessToken|--clientToken|[\w.-]*(?:token|signature|password))\s*[=: ]\s*)[^\s,"']+/gi, '$1[REDACTED]');
  }
  write(source, value) {
    const text = this.redact(value).slice(-65536);
    try {
      // Bound each session file; keep reading process pipes even at the limit.
      if (this.bytes < 16 * 1024 * 1024) {
        const line = `[${new Date().toISOString()}] [${source}] ${text}\n`;
        fs.appendFileSync(this.file, line, 'utf8');
        this.bytes += Buffer.byteLength(line);
      }
    } catch { /* Disk failures must not stop the game. */ }
    return text;
  }
  lifecycle(event) {
    const text = this.write('lifecycle', JSON.stringify(event));
    this.emit('launch-log', `[lifecycle] ${text}`);
  }
  async collect(code, stopped = false) {
    this.write('exit', `code=${code}; requestedStop=${stopped}`);
    const candidates = [path.join(this.root, 'logs', 'latest.log')];
    for (const directory of [path.join(this.root, 'crash-reports'), this.root]) {
      try {
        const files = (await fs.promises.readdir(directory, { withFileTypes: true }))
          .filter(entry => entry.isFile() && /^(crash-.*\.txt|hs_err_pid\d+\.log)$/.test(entry.name));
        candidates.push(...files.map(entry => path.join(directory, entry.name)));
      } catch { /* Some versions create no crash-report folder. */ }
    }
    const recent = [];
    for (const file of candidates) {
      try {
        const stat = await fs.promises.lstat(file);
        if (stat.isFile() && !stat.isSymbolicLink() && stat.mtimeMs >= this.started - 2000) recent.push({ file, stat });
      } catch { }
    }
    for (const { file, stat } of recent.sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs).slice(0, 5)) {
      const handle = await fs.promises.open(file, 'r');
      try {
        const buffer = Buffer.alloc(Math.min(stat.size, 65536));
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, Math.max(0, stat.size - buffer.length));
        const text = this.write(path.basename(file), buffer.subarray(0, bytesRead).toString('utf8'));
        if (!stopped && (code !== 0 || path.basename(file) !== 'latest.log')) this.emit('launch-log', `\n--- ${path.basename(file)} ---\n${text}`);
      } finally { await handle.close(); }
    }
    this.emit('launch-log', `Game log: ${this.file}`);
    return this.file;
  }
}
module.exports = { GameLogs };
