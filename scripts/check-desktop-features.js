const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const http = require('node:http');
const { WallpaperMedia } = require('../lib/wallpaper-media');
const { downloadFile } = require('../lib/download-file');
const { observeLegacyDownloads } = require('../lib/legacy-download-progress');
const { DiscordActivity } = require('../lib/discord-activity');
const { DiscordPresence } = require('../lib/discord-presence');

(async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'unique-media-test-'));
  const bytes = Buffer.alloc(128000, 42);
  const server = http.createServer((request, response) => {
    if (request.url === '/redirect') { response.writeHead(302, { Location: '/file' }).end(); return; }
    if (request.url === '/error') { response.writeHead(500).end(); return; }
    if (request.url === '/broken') { response.writeHead(200, { 'Content-Length': 999999 }); response.write(bytes); setTimeout(() => response.destroy(), 10); return; }
    response.writeHead(200, { 'Content-Length': bytes.length }); response.end(bytes);
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const url = `http://127.0.0.1:${server.address().port}`;
  const media = new WallpaperMedia();
  let restore;
  try {
    const destination = path.join(root, 'download.bin'), progress = [];
    await downloadFile(`${url}/redirect`, destination, event => progress.push(event));
    assert.deepEqual(fs.readFileSync(destination), bytes);
    assert.equal(progress.at(-1).received, bytes.length); assert.equal(progress.at(-1).total, bytes.length);
    await assert.rejects(downloadFile(`${url}/broken`, destination));
    assert.deepEqual(fs.readFileSync(destination), bytes, 'failed download preserves previous file');
    assert(!fs.existsSync(`${destination}.download`));
    await assert.rejects(downloadFile(`${url}/error`, destination));
    const request = require('request'), observed = [];
    restore = observeLegacyDownloads(request, event => observed.push(event));
    await new Promise((resolve, reject) => request(`${url}/redirect`, error => error ? reject(error) : resolve()));
    assert.equal(observed.at(-1).state, 'done');
    assert.equal(observed.at(-1).received, bytes.length); assert.equal(observed.at(-1).total, bytes.length);
    await new Promise((resolve, reject) => request(`${url}/invalid%ZZ`, error => error ? reject(error) : resolve()));
    assert.equal(observed.at(-1).state, 'done', 'malformed escaped names do not interrupt progress');
    const video = path.join(root, 'sample.webm'); fs.writeFileSync(video, bytes);
    const registered = await media.open(video); assert.equal(registered.video, true);
    const part = await fetch(registered.url, { headers: { Range: 'bytes=5-99' } });
    assert.equal(part.status, 206); assert.equal(part.headers.get('content-range'), `bytes 5-99/${bytes.length}`);
    assert.equal(part.headers.get('access-control-allow-origin'), '*', 'tokenized wallpaper can be snapshotted without retaining a video decoder');
    assert.equal((await part.arrayBuffer()).byteLength, 95);
    assert.equal((await fetch(registered.url, { method: 'HEAD' })).headers.get('content-type'), 'video/webm');
    assert.equal((await fetch(registered.url.replace(/\w+$/, 'invalid'))).status, 404);
    assert.equal((await fetch(registered.url, { headers: { Range: 'bytes=999999-' } })).status, 416);
    await assert.rejects(media.open(destination));
    const image = path.join(root, 'sample.gif'); fs.writeFileSync(image, 'GIF89a');
    const gif = await media.open(image); assert.equal(gif.video, false);
    assert.equal((await fetch(registered.url)).status, 404, 'old media token is invalidated');
    assert.equal((await fetch(gif.url)).headers.get('content-type'), 'image/gif');

    const activity = new DiscordActivity('UNIQUE LAUNCHER');
    assert.equal(activity.create({ language: 'ru', section: 'library' }).details, 'Ищет сборку');
    assert.equal(activity.create({ language: 'en', section: 'profile' }).details, 'Customizing a profile');
    assert.equal(activity.create({ language: 'es', memoryMax: 2048 }).details, 'Jugando a Minecraft');
    const sent = [], pending = [];
    const presence = new DiscordPresence({ clientId: 'test', launcherName: 'Unique Launcher', getUserProfile: () => ({}), getDiscordButtons: () => [{ label: 'Download launcher', url: 'https://github.com/trembl-gg/Unique_Launcher/releases/latest' }], withTimeout: promise => promise, getLanguage: () => 'en' });
    presence.rpcReady = true;
    presence.rpcClient = { request(command, payload) { assert.equal(command, 'SET_ACTIVITY'); sent.push(payload.activity); return new Promise(resolve => pending.push(resolve)); } };
    const sending = presence.updateDiscordRpc({ nickname: 'QA' });
    presence.section = 'library'; await presence.updateDiscordRpc({ nickname: 'QA' });
    assert.equal(sent.length, 1, 'presence writes are serialized');
    pending[0](); await new Promise(resolve => setImmediate(resolve));
    assert.equal(sent.length, 2); assert.equal(sent[1].details, 'Searching for modpacks');
    assert.equal(sent[1].status_display_type, 2);
    assert.deepEqual(sent[0].buttons, sent[1].buttons);
    pending[1](); await sending; clearInterval(presence.rpcInterval);
    console.log('PASS: actual download bytes, redirects, interruption cleanup, legacy core progress, streamed wallpaper ranges/tokens and serialized localized Discord activity with persistent buttons');
  } finally {
    restore?.(); media.close(); await new Promise(resolve => server.close(resolve));
    fs.rmSync(root, { recursive: true, force: true });
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
