const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { exportSpotifyConfig } = require('./export-spotify-config');

async function check() {
  const source = fs.readFileSync('main.js', 'utf8');
  const portProbe = http.createServer();
  await new Promise(resolve => portProbe.listen(0, '127.0.0.1', resolve));
  const redirect = `http://127.0.0.1:${portProbe.address().port}/spotify/callback`;
  await new Promise(resolve => portProbe.close(resolve));
  const profiles = {};
  const tokens = [];
  let pendingUser;
  let holdUser = false;
  const context = vm.createContext({
    http, crypto, URL, Buffer, setTimeout, clearTimeout, Date,
    sendAuthCallback: require('../lib/auth-callback').sendAuthCallback,
    getSettings: () => ({ language: 'ru' }),
    spotifyAuthFlow: null, SPOTIFY_REDIRECT_URI: redirect, SPOTIFY_SCOPES: ['user-read-playback-state'],
    getSpotifyClientId: async () => 'a'.repeat(32),
    getProfiles: () => profiles, getUserProfile: name => structuredClone(profiles[name] || {}),
    saveProfiles: next => Object.assign(profiles, next), syncRemoteProfile() {},
    sanitizeProfile: profile => ({ spotifyConnected: Boolean(profile.spotify), spotifyDisplayName: profile.spotify?.displayName }),
    isSpotifyCredentialError: () => false,
    requestSpotifyToken: async (params, options) => {
      tokens.push({ params, options });
      return { access_token: 'test-access', refresh_token: 'test-refresh', expires_in: 3600 };
    },
    getSpotifyUser: async () => holdUser ? new Promise(resolve => { pendingUser = resolve; }) : { display_name: 'Test listener' }
  });
  vm.runInContext(source.slice(source.indexOf('function base64Url('), source.indexOf('function isSpotifyCredentialError(')) +
    source.slice(source.indexOf('function finishSpotifyAuth('), source.indexOf('async function getServerTps(')), context);
  const callback = async (flow, query = {}) => {
    const url = new URL(redirect);
    url.searchParams.set('state', new URL(flow.authorizationUrl).searchParams.get('state'));
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, value);
    const response = await fetch(url);
    await response.text();
    return response.status;
  };
  try {
    const flow = await context.connectSpotify('Player');
    assert.equal(flow.success, true);
    assert.equal(new URL(flow.authorizationUrl).searchParams.get('redirect_uri'), redirect);
    assert.equal(new URL(flow.authorizationUrl).searchParams.get('code_challenge_method'), 'S256');
    assert.equal(await callback(flow, { state: 'untrusted', code: 'bad' }), 400);
    assert.equal(tokens.length, 0);
    assert.equal((await context.completeSpotifyAuth('OtherPlayer', flow.flowId)).success, false);
    assert.equal(await callback(flow, { code: 'valid-code' }), 200);
    const result = await context.completeSpotifyAuth('Player', flow.flowId);
    assert.equal(result.success, true);
    assert.equal(result.profile.spotifyDisplayName, 'Test listener');
    assert.equal(profiles.Player.spotify.authMode, 'pkce');
    assert.equal(tokens[0].options.clientSecret, '');
    assert.equal(crypto.createHash('sha256').update(tokens[0].params.code_verifier).digest('base64url'), new URL(flow.authorizationUrl).searchParams.get('code_challenge'));

    const denied = await context.connectSpotify('Player');
    assert.equal(await callback(denied, { error: 'access_denied' }), 400);
    assert.match((await context.completeSpotifyAuth('Player', denied.flowId)).error, /не разрешён/);
    const missing = await context.connectSpotify('Player');
    assert.equal(await callback(missing), 400);
    assert.equal((await context.completeSpotifyAuth('Player', missing.flowId)).success, false);

    const previous = await context.connectSpotify('Player');
    const previousWait = context.completeSpotifyAuth('Player', previous.flowId);
    const restarted = await context.connectSpotify('Player');
    assert.equal(restarted.success, true);
    assert.equal((await previousWait).success, false);
    context.cancelSpotifyAuth('Player', restarted.flowId);
    assert.equal((await context.completeSpotifyAuth('Player', restarted.flowId)).success, false);

    holdUser = true;
    const cancelled = await context.connectSpotify('CancelledPlayer');
    const lateCallback = callback(cancelled, { code: 'late-code' });
    while (!pendingUser) await new Promise(resolve => setImmediate(resolve));
    context.cancelSpotifyAuth('CancelledPlayer', cancelled.flowId);
    pendingUser({ display_name: 'Too late' });
    assert.equal(await lateCallback, 410);
    assert.equal(profiles.CancelledPlayer, undefined);
    holdUser = false;

    const occupied = http.createServer();
    await new Promise(resolve => occupied.listen(Number(new URL(redirect).port), '127.0.0.1', resolve));
    try { assert.match((await context.connectSpotify('Player')).error, /Порт Spotify занят/); }
    finally { await new Promise(resolve => occupied.close(resolve)); }
    context.SPOTIFY_REDIRECT_URI = 'http://localhost:48128/spotify/callback';
    assert.equal((await context.connectSpotify('Player')).success, false);
  } finally {
    context.cancelSpotifyAuth('Player');
    context.cancelSpotifyAuth('CancelledPlayer');
  }

  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'unique-spotify-config-'));
  try {
    fs.writeFileSync(path.join(root, '.env'), `SPOTIFY_CLIENT_ID="${'b'.repeat(32)}"\nSPOTIFY_CLIENT_SECRET=never-package-this\n`);
    exportSpotifyConfig(root, root, {});
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(root, 'spotify-client.json'))), { clientId: 'b'.repeat(32) });
    assert.equal(fs.readFileSync(path.join(root, 'spotify-client.json'), 'utf8').includes('never-package-this'), false);
    const config = vm.createContext({ SPOTIFY_CLIENT_ID: '', getLauncherPublicConfig: async () => ({}), fs, path, __dirname: root });
    vm.runInContext(source.slice(source.indexOf('async function getSpotifyClientId('), source.indexOf('function spotifyAuthHeader(')), config);
    assert.equal(await config.getSpotifyClientId(), 'b'.repeat(32));
    config.SPOTIFY_CLIENT_ID = 'c'.repeat(32);
    assert.equal(await config.getSpotifyClientId({ spotify: { clientId: 'a'.repeat(32) } }), 'a'.repeat(32));
    assert.throws(() => exportSpotifyConfig(root, root, { SPOTIFY_CLIENT_ID: 'invalid' }));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
  console.log('PASS: Spotify PKCE, callback/state validation, denial, restart, cancellation during exchange, occupied port and public-only packaged config');
}
check().catch(error => { console.error(error); process.exitCode = 1; });
