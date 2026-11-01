const fs = require('node:fs');
const path = require('node:path');
const childProcess = require('node:child_process');

class JavaService {
  constructor({ shell, downloadUrl, processes = childProcess }) {
    this.shell = shell;
    this.downloadUrl = downloadUrl;
    this.childProcess = processes;
    this.versions = new Map();
  }
  normalizeJavaCandidate(candidate) {
    if (!candidate) return null;
    const trimmed = String(candidate).trim().replace(/^"|"$/g, '');
    if (!trimmed) return null;

    try {
      if (fs.existsSync(trimmed) && fs.statSync(trimmed).isDirectory()) {
        return path.join(trimmed, 'bin', process.platform === 'win32' ? 'java.exe' : 'java');
      }
    } catch (err) {
      return null;
    }

    return trimmed;
  }

  getJavaMajorVersion(javaPath) {
    const candidate = this.normalizeJavaCandidate(javaPath);
    if (!candidate || !fs.existsSync(candidate)) return 0;

    try {
      const stat = fs.statSync(candidate);
      const fingerprint = `${stat.size}:${stat.mtimeMs}:${stat.ctimeMs}`;
      const cached = this.versions.get(candidate);
      if (cached?.fingerprint === fingerprint) return cached.major;
      const result = this.childProcess.spawnSync(candidate, ['-version'], {
        encoding: 'utf8',
        timeout: 5000,
        windowsHide: true
      });
      const major = this.parseJavaMajorVersion(`${result.stdout || ''}\n${result.stderr || ''}`);
      if (major && !result.error) {
        if (this.versions.size >= 32) this.versions.delete(this.versions.keys().next().value);
        this.versions.set(candidate, { fingerprint, major });
      }
      return major;
    } catch (err) {
      return this.parseJavaMajorVersion(`${err.stdout || ''}\n${err.stderr || ''}`);
    }
  }

  parseJavaMajorVersion(output) {
    const text = String(output || '');
    const match = text.match(/version\s+"([^"]+)"/i) || text.match(/openjdk\s+([0-9][^\s]*)/i);
    if (!match) return 0;

    const version = match[1];
    if (version.startsWith('1.')) {
      return Number(version.split('.')[1]) || 0;
    }

    return Number(version.split('.')[0]) || 0;
  }

  collectJavaCandidates(preferredPath = '') {
    const candidates = [];
    const add = (candidate) => {
      const normalized = this.normalizeJavaCandidate(candidate);
      if (normalized && !candidates.includes(normalized)) {
        candidates.push(normalized);
      }
    };

    add(preferredPath);
    add(process.env.JAVA_HOME);

    const javaExe = process.platform === 'win32' ? 'java.exe' : 'java';
    const roots = process.platform === 'win32'
      ? [
          path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Amazon Corretto'),
          path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Eclipse Adoptium'),
          path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Microsoft'),
          path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Java'),
          path.join(process.env.ProgramFiles || 'C:\\Program Files', 'BellSoft'),
          path.join(process.env.ProgramFiles || 'C:\\Program Files', 'Zulu'),
          path.join(process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)', 'Java')
        ]
      : ['/usr/lib/jvm', '/Library/Java/JavaVirtualMachines'];

    for (const root of roots) {
      if (!root || !fs.existsSync(root)) continue;
      for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const fullPath = path.join(root, entry.name);
        add(path.join(fullPath, 'bin', javaExe));
        add(path.join(fullPath, 'Contents', 'Home', 'bin', javaExe));
      }
    }

    try {
      const whereCommand = process.platform === 'win32' ? 'where.exe' : 'which';
      const output = this.childProcess.execFileSync(whereCommand, ['java'], {
        encoding: 'utf8',
        timeout: 3000,
        windowsHide: true,
        stdio: ['ignore', 'pipe', 'ignore']
      });
      output.split(/\r?\n/).forEach(add);
    } catch (err) {
      // Ignore PATH lookup errors; explicit install folders above are usually enough.
    }

    return candidates;
  }

  resolveJava17(preferredPath = '', minimumMajor = 17) {
    const candidates = this.collectJavaCandidates(preferredPath);
    let preferredMajor = 0;
    for (const candidate of candidates) {
      const major = this.getJavaMajorVersion(candidate);
      if (candidate === this.normalizeJavaCandidate(preferredPath)) {
        preferredMajor = major;
      }
      if (major >= minimumMajor) {
        return { path: candidate, major };
      }
    }

    const selected = preferredPath ? ` Выбранная Java: ${preferredMajor || 'не найдена'}.` : '';
    const error = new Error(`Для выбранной версии Minecraft нужна Java ${minimumMajor} или новее.${selected} Установите подходящую Java или выберите java.exe в настройках лаунчера.`);
    error.code = 'JAVA_REQUIRED';
    error.minimumJava = minimumMajor;
    throw error;
  }

  installRecommendedJava() {
    if (process.platform !== 'win32') {
      this.shell.openExternal(this.downloadUrl);
      return;
    }

    const command = [
      'Start-Process',
      '-Verb RunAs',
      '-FilePath winget',
      '-ArgumentList',
      "'install EclipseAdoptium.Temurin.21.JRE --silent --accept-package-agreements --accept-source-agreements'"
    ].join(' ');

    try {
      const child = this.childProcess.spawn('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command], {
        detached: true,
        stdio: 'ignore',
        windowsHide: true
      });
      child.unref();
    } catch (err) {
      this.shell.openExternal(this.downloadUrl);
    }
  }
}
module.exports = { JavaService };
