const fs = require('node:fs');
const http = require('node:http');
const https = require('node:https');
const path = require('node:path');
const { pipeline } = require('node:stream/promises');

async function downloadFile(url, target, onProgress = () => {}, redirects = 0) {
  const parsed = new URL(url);
  if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error('Unsupported download protocol');
  const response = await new Promise((resolve, reject) => {
    const request = (parsed.protocol === 'https:' ? https : http).get(parsed, resolve);
    request.setTimeout(30000, () => request.destroy(Error('Download timed out')));
    request.on('error', reject);
  });
  if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
    response.resume();
    if (redirects >= 5) throw new Error('Too many download redirects');
    return downloadFile(new URL(response.headers.location, url).href, target, onProgress, redirects + 1);
  }
  if (response.statusCode < 200 || response.statusCode >= 300) { response.resume(); throw new Error(`HTTP ${response.statusCode}: ${url}`); }
  fs.mkdirSync(path.dirname(target), { recursive: true });
  const partial = `${target}.download`;
  let received = 0, last = 0;
  const total = Number(response.headers['content-length']) || 0;
  onProgress({ received, total });
  try {
    await pipeline(response, async function* (chunks) {
      for await (const chunk of chunks) {
        received += chunk.length;
        if (Date.now() - last >= 100) { last = Date.now(); onProgress({ received, total }); }
        yield chunk;
      }
    }, fs.createWriteStream(partial));
    if (total && received !== total) throw new Error('Incomplete download');
    fs.renameSync(partial, target);
    onProgress({ received, total });
    return target;
  } finally { fs.rmSync(partial, { force: true }); }
}
module.exports = { downloadFile };
