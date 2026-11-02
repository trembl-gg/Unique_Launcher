const crypto = require('node:crypto');

// This core version reports chunk lengths as totals; observe its HTTP streams for real byte counts.
function observeLegacyDownloads(request, emit) {
  const original = request.Request.prototype.init;
  const observed = new WeakSet();
  request.Request.prototype.init = function (...args) {
    if (!observed.has(this)) {
      observed.add(this);
      const id = crypto.randomUUID();
      let received = 0, total = 0, active = false, last = 0, name;
      this.on('response', response => {
        if (response.statusCode < 200 || response.statusCode >= 300) return;
        active = true;
        total = Number(response.headers['content-length']) || 0;
        name = this.uri?.pathname?.split('/').pop() || 'Minecraft';
        try { name = decodeURIComponent(name); } catch { /* Keep malformed URL names readable without interrupting the download. */ }
        emit({ id, name, received, total, state: 'active' });
      });
      this.on('data', chunk => {
        if (!active) return;
        received += chunk.length;
        if (Date.now() - last >= 100) { last = Date.now(); emit({ id, name, received, total, state: 'active' }); }
      });
      const finish = state => { if (active) { active = false; emit({ id, name, received, total, state }); } };
      this.on('end', () => finish('done'));
      this.on('error', () => finish('error'));
      this.on('abort', () => finish('error'));
    }
    return original.apply(this, args);
  };
  return () => { request.Request.prototype.init = original; };
}
module.exports = { observeLegacyDownloads };
