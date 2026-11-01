/** Bounded TTL/LRU cache for public metadata; shares concurrent requests. */
class RequestCache {
  constructor({ ttlMs = 30000, maxEntries = 32, maxBytes = 4 * 1024 * 1024, now = Date.now } = {}) {
    Object.assign(this, { ttlMs, maxEntries, maxBytes, now });
    this.entries = new Map();
    this.pending = new Map();
    this.bytes = 0;
  }
  remove(key) {
    const entry = this.entries.get(key);
    if (entry) this.bytes -= entry.bytes;
    this.entries.delete(key);
  }
  async get(key, fetchValue) {
    const cached = this.entries.get(key);
    if (cached && cached.expires > this.now()) {
      this.entries.delete(key); this.entries.set(key, cached);
      return structuredClone(cached.value);
    }
    this.remove(key);
    if (!this.pending.has(key)) {
      const pending = Promise.resolve().then(fetchValue).then(value => {
        const bytes = Buffer.byteLength(JSON.stringify(value) || 'null');
        for (const [oldKey, entry] of this.entries) if (entry.expires <= this.now()) this.remove(oldKey);
        if (bytes <= this.maxBytes && this.maxEntries > 0) {
          while (this.entries.size >= this.maxEntries || this.bytes + bytes > this.maxBytes) this.remove(this.entries.keys().next().value);
          this.entries.set(key, { value: structuredClone(value), bytes, expires: this.now() + this.ttlMs });
          this.bytes += bytes;
        }
        return value;
      }).finally(() => this.pending.delete(key));
      this.pending.set(key, pending);
    }
    return structuredClone(await this.pending.get(key));
  }
}
module.exports = { RequestCache };
