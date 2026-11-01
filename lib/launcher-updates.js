const RELEASES_URL = 'https://github.com/trembl-gg/Unique_Launcher/releases';
const LATEST_API = 'https://api.github.com/repos/trembl-gg/Unique_Launcher/releases/latest';

function parseVersion(value) {
  const match = /^v?\.?(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)(?:\+[\w.-]+)?$/i.exec(String(value || '').trim());
  if (!match || match.slice(1).some(part => !Number.isSafeInteger(Number(part)))) throw new Error('Invalid release version');
  return match.slice(1).map(Number);
}
function compareVersions(left, right) {
  const a = parseVersion(left), b = parseVersion(right);
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i] ? 1 : -1;
  return 0;
}
class LauncherUpdates {
  constructor({ version, request, now = Date.now }) {
    parseVersion(version);
    this.version = version; this.request = request; this.now = now;
    this.cached = null; this.pending = null; this.checkedAt = 0;
  }
  async check() {
    if (this.cached && this.now() - this.checkedAt < 5 * 60 * 1000) return this.cached;
    if (this.pending) return this.pending;
    this.pending = this.fetchLatest();
    try { return await this.pending; } finally { this.pending = null; }
  }
  async fetchLatest() {
    try {
      const release = await this.request('GET', LATEST_API, { timeoutMs: 8000, headers: {
        Accept: 'application/vnd.github+json', 'User-Agent': `Unique-Launcher/${this.version}`, 'X-GitHub-Api-Version': '2022-11-28'
      } });
      if (!release || release.draft || release.prerelease) throw new Error('Invalid latest release');
      const version = parseVersion(release.tag_name).join('.');
      const url = new URL(release.html_url);
      if (url.origin !== 'https://github.com' || !url.pathname.startsWith('/trembl-gg/Unique_Launcher/releases/tag/') || url.username || url.password) throw new Error('Invalid release URL');
      this.cached = { success: true, state: compareVersions(version, this.version) > 0 ? 'available' : 'none', currentVersion: this.version,
        release: { version, title: String(release.name || `UNIQUE Launcher ${version}`).slice(0, 200), notes: String(release.body || '').slice(0, 64000), url: url.href } };
    } catch (error) {
      if (error.statusCode === 404) this.cached = { success: true, state: 'unpublished', currentVersion: this.version };
      else return { success: false, state: 'error', currentVersion: this.version, errorCode: [403, 429].includes(error.statusCode) ? 'RATE_LIMIT' : 'UNAVAILABLE' };
    }
    this.checkedAt = this.now();
    return this.cached;
  }
}
module.exports = { LauncherUpdates, compareVersions, RELEASES_URL, LATEST_API };
