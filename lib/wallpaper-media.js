const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm' };

class WallpaperMedia {
  async open(file) {
    const mime = MIME[path.extname(file).toLowerCase()];
    if (!mime || !fs.statSync(file).isFile()) throw new Error('Unsupported wallpaper');
    if (this.file !== file) this.token = crypto.randomBytes(24).toString('hex');
    this.file = file; this.mime = mime;
    if (!this.server) {
      this.server = http.createServer((request, response) => this.serve(request, response));
      this.starting = new Promise((resolve, reject) => { this.server.once('error', reject); this.server.listen(0, '127.0.0.1', resolve); });
      this.server.unref();
    }
    await this.starting;
    return { url: `http://127.0.0.1:${this.server.address().port}/${this.token}`, video: mime.startsWith('video/') };
  }
  serve(request, response) {
    if (request.url !== `/${this.token}` || !['GET', 'HEAD'].includes(request.method)) { response.writeHead(404).end(); return; }
    let size;
    try { size = fs.statSync(this.file).size; } catch { response.writeHead(404).end(); return; }
    let start = 0, end = size - 1;
    if (request.headers.range) {
      const range = /^bytes=(\d*)-(\d*)$/.exec(request.headers.range);
      if (!range || (!range[1] && !range[2])) { response.writeHead(416, { 'Content-Range': `bytes */${size}` }).end(); return; }
      start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
      end = range[1] && range[2] ? Math.min(size - 1, Number(range[2])) : size - 1;
      if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start > end || start >= size) { response.writeHead(416, { 'Content-Range': `bytes */${size}` }).end(); return; }
    }
    response.writeHead(request.headers.range ? 206 : 200, { 'Content-Type': this.mime, 'Content-Length': Math.max(0, end - start + 1), 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff', ...(request.headers.range ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}) });
    if (request.method === 'HEAD' || !size) { response.end(); return; }
    const stream = fs.createReadStream(this.file, { start, end });
    stream.on('error', () => response.destroy()); response.on('close', () => stream.destroy()); stream.pipe(response);
  }
  close() { this.server?.close(); this.server = null; }
}
module.exports = { WallpaperMedia };
