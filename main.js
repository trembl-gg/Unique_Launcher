const { app, BrowserWindow, ipcMain, dialog, nativeImage, Menu, screen, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const childProcess = require('child_process');
const http = require('http');
const https = require('https');
const Store = require('electron-store');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const AdmZip = require('adm-zip');
const DiscordRPC = require('discord-rpc');
const launcher = require('minecraft-launcher-core');

function loadDotEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;

  const lines = fs.readFileSync(envPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const separator = trimmed.indexOf('=');
    if (separator <= 0) continue;

    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if (!key || process.env[key]) continue;

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

loadDotEnv();

const store = new Store({ name: 'launcher-data' });

const USERS_KEY = 'users';
const SETTINGS_KEY = 'settings';
const USER_SETTINGS_KEY = 'userSettings';
const SESSION_KEY = 'lastSession';
const PROFILES_KEY = 'profiles';
const LAUNCHER_NAME = 'UNIQUE LAUNCHER';
const DISCORD_INVITE_URL = 'https://discord.gg/unique';
const DISCORD_CLIENT_ID = process.env.UNIQUE_DISCORD_CLIENT_ID || '1480900668788310088';
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || process.env.UNIQUE_SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || process.env.UNIQUE_SPOTIFY_CLIENT_SECRET || '';
const SPOTIFY_REDIRECT_PORT = Number(process.env.SPOTIFY_REDIRECT_PORT || 48128);
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || `http://127.0.0.1:${SPOTIFY_REDIRECT_PORT}/spotify/callback`;
const SPOTIFY_SCOPES = ['user-read-currently-playing', 'user-read-playback-state'];
const PROJECT_TPS_URL = process.env.PROJECT_TPS_URL || '';
const APP_USER_MODEL_ID = 'com.unique.launcher';
const PROJECT_SERVER = {
  name: 'UNIQUE Server',
  host: process.env.PROJECT_SERVER_HOST || 'play.unique.local',
  port: Number(process.env.PROJECT_SERVER_PORT || 25566)
};
const FABRIC_META_URL = 'https://meta.fabricmc.net';

const activeSessions = new Map();
const activeLaunches = new Map();
let rpcClient = null;
let rpcReady = false;
let rpcConnecting = false;
let rpcDisabledUntil = 0;
let rpcInterval = null;
let rpcContext = null;
let spotifyAuthServer = null;

function resolveLauncherIcon() {
  const iconFiles = fs.readdirSync(__dirname).filter((file) => file.toLowerCase().endsWith('.ico'));
  const preferred = iconFiles.find((file) => file === 'unique \u0438\u043a\u043e\u043d\u043a\u0430.ico')
    || iconFiles.find((file) => file.toLowerCase().includes('unique') && file.toLowerCase().includes('\u0438\u043a\u043e\u043d'))
    || iconFiles.find((file) => file.toLowerCase() === 'unique.ico')
    || iconFiles[0];

  return preferred ? path.join(__dirname, preferred) : null;
}

const LAUNCHER_ICON = resolveLauncherIcon();

if (process.platform === 'win32') {
  app.setAppUserModelId(APP_USER_MODEL_ID);
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 820,
    minWidth: 1120,
    minHeight: 720,
    title: LAUNCHER_NAME,
    backgroundColor: '#050508',
    autoHideMenuBar: true,
    frame: false,
    icon: LAUNCHER_ICON && fs.existsSync(LAUNCHER_ICON) ? LAUNCHER_ICON : undefined,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  win.on('maximize', () => win.webContents.send('window-maximized-state', true));
  win.on('unmaximize', () => win.webContents.send('window-maximized-state', false));

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

function resolveTitlebarIcon() {
  const pngFiles = fs.readdirSync(__dirname).filter((file) => file.toLowerCase().endsWith('.png'));
  const preferred = pngFiles.find((file) => file.toLowerCase() === 'unique.png')
    || pngFiles.find((file) => file.toLowerCase().includes('unique') && file.toLowerCase().includes('\u0438\u043a\u043e\u043d'))
    || pngFiles.find((file) => file.toLowerCase().startsWith('unique'))
    || null;

  return preferred ? path.join(__dirname, preferred) : null;
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function getBundledResourceDir(name) {
  return app.isPackaged
    ? path.join(process.resourcesPath, name)
    : path.join(__dirname, name);
}

function getWorkspaceModsPath() {
  return getBundledResourceDir('mods');
}

function getGameRoot() {
  return path.join(app.getPath('userData'), 'minecraft');
}

function getUsers() {
  return store.get(USERS_KEY, {});
}

function saveUsers(users) {
  store.set(USERS_KEY, users);
}

function getDefaultSettings() {
  return {
    minecraftVersion: '1.20.1',
    loader: 'Fabric',
    fabricLoaderVersion: 'latest',
    memory: { min: 1024, max: 4096 },
    wallpaper: null,
    skin: null,
    skinModel: 'auto',
    cape: null,
    javaPath: '',
    hideLauncherDuringGame: false,
    server: PROJECT_SERVER
  };
}

function normalizeSettings(settings = {}, base = getDefaultSettings()) {
  const defaults = getDefaultSettings();

  return {
    ...defaults,
    ...base,
    ...settings,
    memory: { ...defaults.memory, ...(base.memory || {}), ...(settings.memory || {}) },
    server: { ...defaults.server, ...(base.server || {}), ...(settings.server || {}), ...PROJECT_SERVER }
  };
}

function getUserSettingsMap() {
  return store.get(USER_SETTINGS_KEY, {});
}

function getSettings(nickname = '') {
  const globalSettings = normalizeSettings(store.get(SETTINGS_KEY, {}));
  const normalizedNickname = String(nickname || '').trim();
  if (!normalizedNickname) {
    return globalSettings;
  }

  const userSettings = getUserSettingsMap()[normalizedNickname];
  const userBase = {
    ...globalSettings,
    skin: null,
    skinModel: 'auto',
    cape: null
  };
  return normalizeSettings(userSettings || {}, userBase);
}

function saveSettings(settings, nickname = '') {
  const normalizedNickname = String(nickname || '').trim();
  const maxMemory = Math.max(1024, Number(settings.memory?.max) || 4096);
  const skinModel = ['auto', 'default', 'slim'].includes(settings.skinModel) ? settings.skinModel : 'auto';
  const next = {
    ...getSettings(normalizedNickname),
    ...settings,
    memory: {
      min: Math.min(1024, maxMemory),
      max: maxMemory
    },
    skinModel,
    maxFps: Math.max(30, Number(settings.maxFps) || 60),
    hideLauncherDuringGame: Boolean(settings.hideLauncherDuringGame),
    server: PROJECT_SERVER
  };

  if (normalizedNickname) {
    const userSettings = getUserSettingsMap();
    userSettings[normalizedNickname] = next;
    store.set(USER_SETTINGS_KEY, userSettings);
  } else {
    store.set(SETTINGS_KEY, next);
  }
  return next;
}

function getProfiles() {
  return store.get(PROFILES_KEY, {});
}

function saveProfiles(profiles) {
  store.set(PROFILES_KEY, profiles);
}

function getUserProfile(nickname) {
  const profiles = getProfiles();
  return {
    youtubeUrl: '',
    twitchUrl: '',
    spotify: null,
    ...(profiles[nickname] || {})
  };
}

function sanitizeProfile(profile) {
  return {
    youtubeUrl: profile.youtubeUrl || '',
    twitchUrl: profile.twitchUrl || '',
    spotifyConnected: Boolean(profile.spotify?.refreshToken || profile.spotify?.accessToken),
    spotifyDisplayName: profile.spotify?.displayName || ''
  };
}

function normalizeSocialUrl(value, allowedHosts) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return '';

  const withProtocol = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed;
  try {
    parsed = new URL(withProtocol);
  } catch (err) {
    throw new Error('Некорректная ссылка профиля.');
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error('Ссылка должна начинаться с http:// или https://.');
  }

  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const allowed = allowedHosts.some((allowedHost) => host === allowedHost || host.endsWith(`.${allowedHost}`));
  if (!allowed) {
    throw new Error(`Ссылка должна вести на ${allowedHosts.join(' или ')}.`);
  }

  parsed.protocol = 'https:';
  return parsed.href;
}

function saveUserProfileLinks(nickname, payload) {
  const profiles = getProfiles();
  const profile = getUserProfile(nickname);
  profile.youtubeUrl = normalizeSocialUrl(payload.youtubeUrl, ['youtube.com', 'youtu.be']);
  profile.twitchUrl = normalizeSocialUrl(payload.twitchUrl, ['twitch.tv']);
  profiles[nickname] = profile;
  saveProfiles(profiles);
  return sanitizeProfile(profile);
}

function getDiscordButtons(profile) {
  const buttons = [{ label: 'Discord UNIQUE', url: DISCORD_INVITE_URL }];
  const socials = [];
  if (profile?.youtubeUrl) {
    socials.push({ label: 'YouTube', url: profile.youtubeUrl });
  }
  if (profile?.twitchUrl) {
    socials.push({ label: 'Twitch', url: profile.twitchUrl });
  }

  if (socials.length === 1) {
    buttons.push(socials[0]);
  } else if (socials.length > 1) {
    const socialIndex = Math.floor(Date.now() / 15000) % socials.length;
    buttons.push(socials[socialIndex]);
  }

  return buttons;
}

function validateNickname(nickname) {
  return /^[A-Za-z0-9_]{3,16}$/.test(nickname);
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.gif') return 'image/gif';
  if (ext === '.webp') return 'image/webp';
  return 'image/png';
}

function toFileMeta(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;

  return {
    path: filePath,
    name: path.basename(filePath),
    ext: path.extname(filePath).toLowerCase()
  };
}

function readAssetPreview(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;

  const buffer = fs.readFileSync(filePath);
  return `data:${getMimeType(filePath)};base64,${buffer.toString('base64')}`;
}

function getSkinLayoutFromSize(width, height) {
  const modernDelta = Math.abs(height - width);
  const legacyDelta = Math.abs(height - (width / 2));
  const baseHeight = legacyDelta < modernDelta ? 32 : 64;
  const scaleX = width / 64;
  const scaleY = height / baseHeight;
  return {
    baseHeight,
    hasSecondLayer: baseHeight === 64,
    scaleX,
    scaleY,
    valid: width >= 64 && height >= 32 && Math.abs(scaleX - scaleY) <= Math.max(1, scaleX) * 0.08
  };
}

function detectSkinModel(skinPath) {
  if (!skinPath || !fs.existsSync(skinPath)) return 'default';

  const lowerName = path.basename(skinPath).toLowerCase();
  if (lowerName.includes('slim') || lowerName.includes('alex')) {
    return 'slim';
  }

  const image = nativeImage.createFromPath(skinPath);
  if (image.isEmpty()) return 'default';

  const size = image.getSize();
  if (!size.width || !size.height) return 'default';

  const layout = getSkinLayoutFromSize(size.width, size.height);
  if (!layout.valid) return 'default';
  const bitmap = image.toBitmap();
  const alphaAt = (x, y) => {
    const px = Math.max(0, Math.min(size.width - 1, Math.floor(x)));
    const py = Math.max(0, Math.min(size.height - 1, Math.floor(y)));
    return bitmap[(py * size.width + px) * 4 + 3] || 0;
  };

  const regions = [{ x: 47, y: 20, w: 1, h: 12 }];
  if (layout.hasSecondLayer) {
    regions.push({ x: 39, y: 52, w: 1, h: 12 });
  }
  let transparent = 0;
  let total = 0;

  for (const region of regions) {
    const sx = region.x * layout.scaleX;
    const sy = region.y * layout.scaleY;
    const sw = Math.max(1, region.w * layout.scaleX);
    const sh = Math.max(1, region.h * layout.scaleY);
    if (sy >= size.height) continue;

    for (let y = sy; y < Math.min(size.height, sy + sh); y += 1) {
      for (let x = sx; x < Math.min(size.width, sx + sw); x += 1) {
        total += 1;
        if (alphaAt(x, y) < 16) transparent += 1;
      }
    }
  }

  return total > 0 && transparent / total > 0.6 ? 'slim' : 'default';
}

function getRefreshRateForSender(sender) {
  const win = BrowserWindow.fromWebContents(sender);
  const display = win ? screen.getDisplayMatching(win.getBounds()) : screen.getPrimaryDisplay();
  return Math.round(Number(display.displayFrequency) || 60);
}

function getPackFormat(minecraftVersion) {
  const [major, minor = 0, patch = 0] = String(minecraftVersion).split('.').map((part) => Number(part) || 0);
  if (major > 1 || minor >= 21) return 34;
  if (minor === 20 && patch >= 5) return 32;
  if (minor === 20 && patch >= 3) return 22;
  if (minor === 20 && patch >= 2) return 18;
  if (minor === 20) return 15;
  if (minor === 19 && patch >= 4) return 13;
  if (minor === 19) return 9;
  if (minor === 18) return 8;
  if (minor === 17) return 7;
  return 6;
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    const https = require('https');
    https.get(url, (response) => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
        response.resume();
        return;
      }

      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (err) {
          reject(err);
        }
      });
    }).on('error', reject);
  });
}

function getText(url) {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? require('https') : require('http');
    const request = protocol.get(url, (response) => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
        response.resume();
        return;
      }

      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => resolve(body));
    });
    request.setTimeout(2500, () => {
      request.destroy(new Error('Request timed out'));
    });
    request.on('error', reject);
  });
}

function requestJson(method, url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(url);
    const body = options.body || null;
    const timeoutMs = Number(options.timeoutMs || 8000);
    const request = https.request({
      method,
      hostname: parsed.hostname,
      path: `${parsed.pathname}${parsed.search}`,
      headers: {
        ...(options.headers || {}),
        ...(body ? { 'Content-Length': Buffer.byteLength(body) } : {})
      }
    }, (response) => {
      let data = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => {
        if (response.statusCode === 204) {
          resolve(null);
          return;
        }

        let parsedBody = null;
        if (data) {
          try {
            parsedBody = JSON.parse(data);
          } catch (err) {
            reject(new Error(`Invalid JSON from ${parsed.hostname}`));
            return;
          }
        }

        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(parsedBody?.error_description || parsedBody?.error?.message || `HTTP ${response.statusCode}`));
          return;
        }

        resolve(parsedBody);
      });
    });

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error('Request timed out'));
    });
    request.on('error', reject);
    if (body) request.write(body);
    request.end();
  });
}

function spotifyAuthHeader() {
  return `Basic ${Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString('base64')}`;
}

async function requestSpotifyToken(params) {
  return requestJson('POST', 'https://accounts.spotify.com/api/token', {
    headers: {
      Authorization: spotifyAuthHeader(),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(params).toString()
  });
}

async function getSpotifyUser(accessToken) {
  return requestJson('GET', 'https://api.spotify.com/v1/me', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
}

async function refreshSpotifyToken(nickname, profile) {
  if (!profile.spotify?.refreshToken) {
    throw new Error('Spotify не привязан.');
  }

  const token = await requestSpotifyToken({
    grant_type: 'refresh_token',
    refresh_token: profile.spotify.refreshToken
  });

  const profiles = getProfiles();
  const nextProfile = getUserProfile(nickname);
  nextProfile.spotify = {
    ...nextProfile.spotify,
    accessToken: token.access_token,
    refreshToken: token.refresh_token || nextProfile.spotify.refreshToken,
    expiresAt: Date.now() + (Number(token.expires_in || 3600) * 1000) - 60000
  };
  profiles[nickname] = nextProfile;
  saveProfiles(profiles);
  return nextProfile.spotify.accessToken;
}

async function getSpotifyAccessToken(nickname) {
  const profile = getUserProfile(nickname);
  if (!profile.spotify?.accessToken) {
    return refreshSpotifyToken(nickname, profile);
  }

  if (Date.now() >= Number(profile.spotify.expiresAt || 0)) {
    return refreshSpotifyToken(nickname, profile);
  }

  return profile.spotify.accessToken;
}

function formatSpotifyNowPlaying(body) {
  if (!body?.item) {
    return {
      playing: false,
      text: 'Spotify подключен, сейчас ничего не играет.',
      displayText: '',
      progressMs: 0,
      durationMs: 0,
      updatedAt: Date.now()
    };
  }

  const title = body.item.name || 'Неизвестный трек';
  const artists = Array.isArray(body.item.artists)
    ? body.item.artists.map((artist) => artist.name).filter(Boolean).join(', ')
    : '';
  const text = `${body.is_playing ? 'Слушает' : 'Пауза'}: ${artists ? `${artists} - ` : ''}${title}`;
  return {
    playing: Boolean(body.is_playing),
    text,
    displayText: body.is_playing ? `Слушает: ${artists ? `${artists} - ` : ''}${title}` : '',
    url: body.item.external_urls?.spotify || '',
    progressMs: Math.max(0, Number(body.progress_ms || 0)),
    durationMs: Math.max(0, Number(body.item.duration_ms || 0)),
    updatedAt: Date.now()
  };
}

function writeMinecraftMusicStatus(nickname, nowPlaying) {
  const configDir = path.join(getGameRoot(), 'config', 'project-launcher');
  ensureDir(configDir);
  const displayText = nowPlaying?.connected === false ? '' : String(nowPlaying?.displayText || '').trim();
  const status = {
    nickname,
    displayText: displayText.slice(0, 96),
    playing: Boolean(nowPlaying?.playing),
    updatedAt: Date.now()
  };
  fs.writeFileSync(path.join(configDir, 'music_status.json'), JSON.stringify(status, null, 2), 'utf8');
}

async function getSpotifyNowPlaying(nickname) {
  const profile = getUserProfile(nickname);
  if (!profile.spotify?.refreshToken && !profile.spotify?.accessToken) {
    return { connected: false, playing: false, text: 'Spotify не привязан.' };
  }

  const accessToken = await getSpotifyAccessToken(nickname);
  const body = await requestJson('GET', 'https://api.spotify.com/v1/me/player?additional_types=track,episode', {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeoutMs: 3000
  });
  return { connected: true, ...formatSpotifyNowPlaying(body) };
}

async function connectSpotify(nickname) {
  if (!SPOTIFY_CLIENT_ID || !SPOTIFY_CLIENT_SECRET) {
    return {
      success: false,
      error: 'Для Spotify нужны переменные окружения SPOTIFY_CLIENT_ID и SPOTIFY_CLIENT_SECRET.'
    };
  }

  if (spotifyAuthServer) {
    spotifyAuthServer.close();
    spotifyAuthServer = null;
  }

  const redirectUrl = new URL(SPOTIFY_REDIRECT_URI);
  const state = crypto.randomBytes(18).toString('hex');
  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', SPOTIFY_CLIENT_ID);
  authUrl.searchParams.set('scope', SPOTIFY_SCOPES.join(' '));
  authUrl.searchParams.set('redirect_uri', SPOTIFY_REDIRECT_URI);
  authUrl.searchParams.set('state', state);

  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      if (spotifyAuthServer) {
        spotifyAuthServer.close();
        spotifyAuthServer = null;
      }
      resolve({ success: false, error: 'Spotify не ответил за 2 минуты.' });
    }, 120000);

    spotifyAuthServer = http.createServer(async (request, response) => {
      const requestUrl = new URL(request.url, SPOTIFY_REDIRECT_URI);
      if (requestUrl.pathname !== redirectUrl.pathname) {
        response.writeHead(404);
        response.end('Not found');
        return;
      }

      if (requestUrl.searchParams.get('state') !== state) {
        response.writeHead(400);
        response.end('Bad state');
        clearTimeout(timer);
        resolve({ success: false, error: 'Spotify вернул неверный state.' });
        return;
      }

      const code = requestUrl.searchParams.get('code');
      if (!code) {
        response.writeHead(400);
        response.end('No code');
        clearTimeout(timer);
        resolve({ success: false, error: 'Spotify не вернул код авторизации.' });
        return;
      }

      try {
        const token = await requestSpotifyToken({
          grant_type: 'authorization_code',
          code,
          redirect_uri: SPOTIFY_REDIRECT_URI
        });
        const spotifyUser = await getSpotifyUser(token.access_token);
        const profiles = getProfiles();
        const profile = getUserProfile(nickname);
        profile.spotify = {
          accessToken: token.access_token,
          refreshToken: token.refresh_token,
          expiresAt: Date.now() + (Number(token.expires_in || 3600) * 1000) - 60000,
          displayName: spotifyUser.display_name || spotifyUser.id || 'Spotify'
        };
        profiles[nickname] = profile;
        saveProfiles(profiles);

        response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        response.end('<html><body>Spotify подключен. Можно вернуться в UNIQUE LAUNCHER.</body></html>');
        clearTimeout(timer);
        resolve({ success: true, profile: sanitizeProfile(profile) });
      } catch (err) {
        response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        response.end('Spotify auth failed');
        clearTimeout(timer);
        resolve({ success: false, error: err.message || String(err) });
      } finally {
        if (spotifyAuthServer) {
          spotifyAuthServer.close();
          spotifyAuthServer = null;
        }
      }
    });

    spotifyAuthServer.listen(Number(redirectUrl.port || SPOTIFY_REDIRECT_PORT), redirectUrl.hostname, () => {
      shell.openExternal(authUrl.toString());
    });

    spotifyAuthServer.on('error', (err) => {
      clearTimeout(timer);
      spotifyAuthServer = null;
      resolve({ success: false, error: err.message || String(err) });
    });
  });
}

async function getServerTps() {
  if (!PROJECT_TPS_URL) {
    return 'n/a';
  }

  try {
    const body = await getText(PROJECT_TPS_URL);
    const trimmed = body.trim();
    let value = trimmed;

    if (trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed);
      value = parsed.tps ?? parsed.TPS ?? parsed.serverTps ?? parsed.meanTps ?? parsed.mspt ?? 'n/a';
    }

    if (typeof value === 'number') {
      return value.toFixed(1);
    }

    const numeric = Number(value);
    return Number.isFinite(numeric) ? numeric.toFixed(1) : String(value).slice(0, 16);
  } catch (err) {
    return 'n/a';
  }
}

function withTimeout(promise, timeoutMs, message) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), timeoutMs);
    promise
      .then((value) => {
        clearTimeout(timer);
        resolve(value);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function disconnectDiscordRpc() {
  rpcReady = false;
  if (rpcClient) {
    if (typeof rpcClient.destroy === 'function') {
      Promise.resolve(rpcClient.destroy()).catch(() => {});
    }
  }
  rpcClient = null;
}

function ensureDiscordRpc() {
  if (!DISCORD_CLIENT_ID || rpcReady || rpcConnecting || Date.now() < rpcDisabledUntil) {
    return;
  }

  rpcConnecting = true;
  try {
    DiscordRPC.register(DISCORD_CLIENT_ID);
    const client = new DiscordRPC.Client({ transport: 'ipc' });
    rpcClient = client;

    client.on('ready', () => {
      rpcReady = true;
      rpcConnecting = false;
      if (rpcContext) {
        updateDiscordRpc(rpcContext);
      }
    });

    withTimeout(client.login({ clientId: DISCORD_CLIENT_ID }), 3500, 'Discord Activity connection timed out')
      .catch(() => {
        if (rpcClient === client) {
          disconnectDiscordRpc();
        }
        rpcDisabledUntil = Date.now() + 60000;
      })
      .finally(() => {
        if (rpcClient === client && !rpcReady) {
          rpcConnecting = false;
        }
      });
  } catch (err) {
    rpcConnecting = false;
    rpcDisabledUntil = Date.now() + 60000;
    disconnectDiscordRpc();
  }
}

async function updateDiscordRpc(context = rpcContext) {
  if (!context) {
    return;
  }

  rpcContext = context;
  if (!rpcReady || !rpcClient) {
    ensureDiscordRpc();
    return;
  }

  const tps = await getServerTps();
  const profile = context.nickname ? getUserProfile(context.nickname) : null;
  const activity = {
    type: 0,
    name: LAUNCHER_NAME,
    details: context.details || `Playing via ${LAUNCHER_NAME}`,
    state: context.state || 'In launcher',
    startTimestamp: context.startTimestamp || Date.now(),
    largeImageText: LAUNCHER_NAME,
    buttons: getDiscordButtons(profile)
  };

  if (context.nickname) {
    activity.details = `Через ${LAUNCHER_NAME} | Ник: ${context.nickname}`;
    activity.state = context.memoryMax
      ? `${PROJECT_SERVER.name} | RAM ${context.memoryMax} MB | TPS ${tps}`
      : 'В лаунчере';
  }

  rpcClient.setActivity(activity).catch(() => {});
}

function startPlayingDiscordRpc(user, settings) {
  rpcContext = {
    nickname: user.nickname,
    memoryMax: settings.memory.max,
    startTimestamp: Date.now()
  };
  updateDiscordRpc(rpcContext);

  if (rpcInterval) {
    clearInterval(rpcInterval);
  }

  rpcInterval = setInterval(() => {
    updateDiscordRpc(rpcContext);
  }, 15000);
}

function setLauncherDiscordRpc(nickname) {
  if (!nickname) return;
  updateDiscordRpc({
    ...(rpcContext || {}),
    nickname,
    memoryMax: null,
    details: `In ${LAUNCHER_NAME}`,
    state: 'Launcher is open',
    startTimestamp: rpcContext?.startTimestamp || Date.now()
  });
}

function stopPlayingDiscordRpc() {
  if (rpcInterval) {
    clearInterval(rpcInterval);
    rpcInterval = null;
  }

  const nickname = rpcContext?.nickname;
  rpcContext = {
    details: `In ${LAUNCHER_NAME}`,
    state: 'Launcher is open',
    startTimestamp: Date.now(),
    ...(nickname ? { nickname, memoryMax: null } : {})
  };
  updateDiscordRpc(rpcContext);
}

function listModsFromWorkspace() {
  const modsPath = getWorkspaceModsPath();
  ensureDir(modsPath);

  return fs.readdirSync(modsPath)
    .filter((file) => file.toLowerCase().endsWith('.jar'))
    .map((file) => {
      const fullPath = path.join(modsPath, file);
      const stat = fs.statSync(fullPath);

      return {
        name: file,
        sizeMb: Number((stat.size / 1024 / 1024).toFixed(2)),
        modified: stat.mtime.toISOString()
      };
    });
}

function syncModsToGameRoot(root) {
  const sourceDir = getWorkspaceModsPath();
  const targetDir = path.join(root, 'mods');
  ensureDir(sourceDir);
  ensureDir(targetDir);

  const copied = [];
  for (const file of fs.readdirSync(sourceDir)) {
    if (!file.toLowerCase().endsWith('.jar')) continue;

    const source = path.join(sourceDir, file);
    const target = path.join(targetDir, file);
    const shouldCopy = !fs.existsSync(target)
      || fs.statSync(source).mtimeMs > fs.statSync(target).mtimeMs
      || fs.statSync(source).size !== fs.statSync(target).size;

    if (shouldCopy) {
      fs.copyFileSync(source, target);
      copied.push(file);
    }
  }

  return copied;
}

function writeOptionsResourcePacks(root, packNames) {
  const optionsPath = path.join(root, 'options.txt');
  const enabledPacks = ['vanilla', ...packNames.filter(Boolean).map((packName) => `file/${packName}`)];
  const wanted = {
    resourcePacks: `resourcePacks:${JSON.stringify(enabledPacks)}`,
    incompatibleResourcePacks: `incompatibleResourcePacks:${JSON.stringify(enabledPacks.filter((pack) => pack !== 'vanilla'))}`
  };

  if (!fs.existsSync(optionsPath)) {
    fs.writeFileSync(optionsPath, `${wanted.resourcePacks}\n${wanted.incompatibleResourcePacks}\n`, 'utf8');
    return;
  }

  const lines = fs.readFileSync(optionsPath, 'utf8').split(/\r?\n/);
  for (const [key, value] of Object.entries(wanted)) {
    const index = lines.findIndex((line) => line.startsWith(`${key}:`));
    if (index >= 0) {
      lines[index] = value;
    } else {
      lines.push(value);
    }
  }

  fs.writeFileSync(optionsPath, lines.join('\n'), 'utf8');
}

function writePerformanceOptions(root, maxFps) {
  const optionsPath = path.join(root, 'options.txt');
  const wanted = {
    enableVsync: 'enableVsync:true',
    maxFps: `maxFps:${maxFps}`,
    renderDistance: 'renderDistance:8',
    simulationDistance: 'simulationDistance:6',
    entityDistanceScaling: 'entityDistanceScaling:1.0'
  };

  const lines = fs.existsSync(optionsPath)
    ? fs.readFileSync(optionsPath, 'utf8').split(/\r?\n/)
    : [];

  for (const [key, value] of Object.entries(wanted)) {
    const index = lines.findIndex((line) => line.startsWith(`${key}:`));
    if (index >= 0) {
      lines[index] = value;
    } else {
      lines.push(value);
    }
  }

  fs.writeFileSync(optionsPath, lines.join('\n'), 'utf8');
}

function removeEmptyAssetObjects(root) {
  const objectsDir = path.join(root, 'assets', 'objects');
  if (!fs.existsSync(objectsDir)) {
    return 0;
  }

  let removed = 0;
  const stack = [objectsDir];
  while (stack.length > 0) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(fullPath);
        continue;
      }

      if (entry.isFile() && fs.statSync(fullPath).size === 0) {
        fs.rmSync(fullPath, { force: true });
        removed += 1;
      }
    }
  }

  return removed;
}

function addFolderToZip(zip, folder, base = folder) {
  if (!fs.existsSync(folder)) return;
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    const fullPath = path.join(folder, entry.name);
    if (entry.isDirectory()) {
      addFolderToZip(zip, fullPath, base);
      continue;
    }

    const zipPath = path.relative(base, fullPath).replace(/\\/g, '/');
    zip.addFile(zipPath, fs.readFileSync(fullPath));
  }
}

function writePackZip(packDir, zipPath) {
  const zip = new AdmZip();
  addFolderToZip(zip, packDir);
  zip.writeZip(zipPath);
}

function buildWallpaperResourcePack(root, wallpaperPath, minecraftVersion) {
  const meta = toFileMeta(wallpaperPath);
  if (!meta || !['.png', '.jpg', '.jpeg'].includes(meta.ext)) {
    return null;
  }

  const packName = 'ProjectMenuWallpaper.zip';
  const buildDir = path.join(root, 'resourcepacks', '.project-build', 'ProjectMenuWallpaper');
  const packZip = path.join(root, 'resourcepacks', packName);
  fs.rmSync(buildDir, { recursive: true, force: true });
  const packDir = buildDir;
  const panoramaDir = path.join(packDir, 'assets', 'minecraft', 'textures', 'gui', 'title', 'background');
  ensureDir(panoramaDir);

  const packMcmeta = {
    pack: {
      pack_format: getPackFormat(minecraftVersion),
      description: 'Project launcher menu wallpaper'
    }
  };

  fs.writeFileSync(path.join(packDir, 'pack.mcmeta'), JSON.stringify(packMcmeta, null, 2), 'utf8');

  let png;
  if (meta.ext === '.png') {
    png = fs.readFileSync(wallpaperPath);
  } else {
    const image = nativeImage.createFromPath(wallpaperPath);
    if (image.isEmpty()) {
      throw new Error('Cannot read wallpaper image.');
    }
    png = image.toPNG();
  }

  for (let i = 0; i < 6; i += 1) {
    fs.writeFileSync(path.join(panoramaDir, `panorama_${i}.png`), png);
  }

  writePackZip(packDir, packZip);
  return packName;
}

function buildPlayerAssets(root, settings) {
  const configDir = path.join(root, 'config', 'project-launcher');
  ensureDir(configDir);

  const assets = {
    skin: null,
    skinModel: 'default',
    cape: null,
    wallpaper: null,
    windowIconDir: null,
    updatedAt: new Date().toISOString()
  };

  const buildDir = path.join(root, 'resourcepacks', '.project-build', 'ProjectPlayerAssets');
  fs.rmSync(buildDir, { recursive: true, force: true });

  if (settings.skin && fs.existsSync(settings.skin)) {
    const skinTarget = path.join(configDir, 'skin.png');
    fs.copyFileSync(settings.skin, skinTarget);
    assets.skin = skinTarget;
    assets.skinModel = settings.skinModel === 'slim'
      ? 'slim'
      : settings.skinModel === 'default'
        ? 'default'
        : detectSkinModel(settings.skin);
  }

  if (settings.cape && fs.existsSync(settings.cape)) {
    const capeTarget = path.join(configDir, `cape${path.extname(settings.cape).toLowerCase() || '.png'}`);
    fs.copyFileSync(settings.cape, capeTarget);
    assets.cape = capeTarget;
  }

  if (settings.wallpaper && fs.existsSync(settings.wallpaper)) {
    const wallpaperTarget = path.join(configDir, 'menu_wallpaper.png');
    const wallpaperMeta = toFileMeta(settings.wallpaper);
    if (wallpaperMeta?.ext === '.png') {
      fs.copyFileSync(settings.wallpaper, wallpaperTarget);
      assets.wallpaper = wallpaperTarget;
    } else {
      const image = nativeImage.createFromPath(settings.wallpaper);
      if (!image.isEmpty()) {
        fs.writeFileSync(wallpaperTarget, image.toPNG());
        assets.wallpaper = wallpaperTarget;
      }
    }
  }

  if (LAUNCHER_ICON && fs.existsSync(LAUNCHER_ICON)) {
    const iconRoot = path.join(configDir, 'window-icons');
    const iconsDir = path.join(iconRoot, 'icons');
    const iconImage = nativeImage.createFromPath(LAUNCHER_ICON);
    if (!iconImage.isEmpty()) {
      fs.rmSync(iconRoot, { recursive: true, force: true });
      ensureDir(iconsDir);
      for (const size of [16, 32, 48, 128, 256]) {
        const resized = iconImage.resize({ width: size, height: size, quality: 'best' });
        fs.writeFileSync(path.join(iconsDir, `icon_${size}x${size}.png`), resized.toPNG());
      }
      assets.windowIconDir = iconRoot;
    }
  }

  fs.writeFileSync(path.join(configDir, 'assets.json'), JSON.stringify(assets, null, 2), 'utf8');
  return null;
}

async function ensureVanillaVersion(root, minecraftVersion) {
  const versionDir = path.join(root, 'versions', minecraftVersion);
  ensureDir(versionDir);

  const versionFile = await launcher.handler.getVersion(minecraftVersion, versionDir);
  const jarPath = path.join(versionDir, `${minecraftVersion}.jar`);

  if (!fs.existsSync(jarPath)) {
    await launcher.handler.getJar(versionFile, minecraftVersion, versionDir);
  } else if (!fs.existsSync(path.join(versionDir, `${minecraftVersion}.json`))) {
    fs.writeFileSync(path.join(versionDir, `${minecraftVersion}.json`), JSON.stringify(versionFile, null, 2), 'utf8');
  }

  return { versionFile, jarPath };
}

async function ensureFabricVersion(root, minecraftVersion, requestedLoaderVersion = 'latest') {
  const encodedGameVersion = encodeURIComponent(minecraftVersion);
  let loaderVersion = requestedLoaderVersion;

  if (!loaderVersion || loaderVersion === 'latest') {
    const versions = await getJson(`${FABRIC_META_URL}/v2/versions/loader/${encodedGameVersion}`);
    const stable = versions.find((entry) => entry.loader?.stable) || versions[0];
    if (!stable) {
      throw new Error(`Fabric Loader was not found for Minecraft ${minecraftVersion}.`);
    }
    loaderVersion = stable.loader.version;
  }

  const encodedLoaderVersion = encodeURIComponent(loaderVersion);
  const profile = await getJson(`${FABRIC_META_URL}/v2/versions/loader/${encodedGameVersion}/${encodedLoaderVersion}/profile/json`);
  const fabricId = profile.id || `fabric-loader-${loaderVersion}-${minecraftVersion}`;
  const fabricDir = path.join(root, 'versions', fabricId);
  ensureDir(fabricDir);

  const vanilla = await ensureVanillaVersion(root, minecraftVersion);
  fs.writeFileSync(path.join(fabricDir, `${fabricId}.json`), JSON.stringify(profile, null, 2), 'utf8');
  fs.copyFileSync(vanilla.jarPath, path.join(fabricDir, `${fabricId}.jar`));

  return {
    id: fabricId,
    loaderVersion,
    jvmArgs: (profile.arguments?.jvm || []).filter((arg) => typeof arg === 'string')
  };
}

function getOsName() {
  if (process.platform === 'win32') return 'windows';
  if (process.platform === 'darwin') return 'osx';
  return 'linux';
}

function createSession(nickname, persist = false) {
  const token = crypto.randomBytes(32).toString('hex');
  const session = {
    nickname,
    createdAt: Date.now()
  };

  activeSessions.set(token, session);

  if (persist) {
    store.set(SESSION_KEY, {
      nickname,
      sessionToken: token,
      createdAt: session.createdAt
    });
  }

  return token;
}

function getStoredSession() {
  const session = store.get(SESSION_KEY, null);
  if (!session?.nickname || !session?.sessionToken) {
    return null;
  }

  const user = getUsers()[session.nickname];
  if (!user) {
    store.delete(SESSION_KEY);
    return null;
  }

  if (!activeSessions.has(session.sessionToken)) {
    activeSessions.set(session.sessionToken, {
      nickname: session.nickname,
      createdAt: session.createdAt || Date.now()
    });
  }

  return {
    nickname: session.nickname,
    sessionToken: session.sessionToken
  };
}

ipcMain.handle('auth-register', async (event, payload) => {
  const nickname = String(payload.nickname || '').trim();
  const password = String(payload.password || '');
  const enableTOTP = Boolean(payload.enableTOTP);

  if (!validateNickname(nickname)) {
    return { success: false, error: 'Ник должен быть 3-16 символов: латиница, цифры или _.' };
  }

  if (password.length < 6) {
    return { success: false, error: 'Пароль должен быть минимум 6 символов.' };
  }

  const users = getUsers();
  if (users[nickname]) {
    return { success: false, error: 'Такой ник уже зарегистрирован.' };
  }

  const user = {
    nickname,
    passwordHash: bcrypt.hashSync(password, 10),
    totp: null,
    createdAt: new Date().toISOString()
  };

  if (enableTOTP) {
    const secret = speakeasy.generateSecret({
      length: 20,
      name: `Project Launcher (${nickname})`,
      issuer: 'Project Launcher'
    });

    user.totp = {
      secret: secret.base32,
      otpauthUrl: secret.otpauth_url
    };
  }

  users[nickname] = user;
  saveUsers(users);

  return {
    success: true,
    enabledTOTP: Boolean(user.totp),
    totpUrl: user.totp?.otpauthUrl || null
  };
});

ipcMain.handle('auth-login', async (event, payload) => {
  const nickname = String(payload.nickname || '').trim();
  const password = String(payload.password || '');
  const totpCode = String(payload.totpCode || '').trim();
  const users = getUsers();
  const user = users[nickname];

  if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
    return { success: false, error: 'Неверный ник или пароль.' };
  }

  if (user.totp) {
    const verified = speakeasy.totp.verify({
      secret: user.totp.secret,
      encoding: 'base32',
      token: totpCode,
      window: 1
    });

    if (!verified) {
      return { success: false, error: 'Неверный код Google Authenticator.' };
    }
  }

  const sessionToken = createSession(nickname, true);
  setLauncherDiscordRpc(nickname);
  return {
    success: true,
    user: { nickname, sessionToken }
  };
});

ipcMain.handle('auth-current-session', async () => {
  const session = getStoredSession();
  if (!session) {
    return { success: false };
  }

  setLauncherDiscordRpc(session.nickname);

  return {
    success: true,
    user: session
  };
});

ipcMain.handle('auth-logout', async (event, payload = {}) => {
  const token = payload.sessionToken || store.get(`${SESSION_KEY}.sessionToken`);
  if (token) {
    activeSessions.delete(token);
  }

  store.delete(SESSION_KEY);
  return { success: true };
});

ipcMain.handle('get-settings', async (event, payload = {}) => {
  return getSettings(payload.nickname);
});

ipcMain.handle('save-settings', async (event, payload = {}) => {
  const settings = payload.settings || payload;
  return { success: true, settings: saveSettings(settings, payload.nickname) };
});

ipcMain.handle('get-system-info', async () => ({
  totalMemoryMb: Math.floor(os.totalmem() / 1024 / 1024),
  refreshRate: Math.round(Number(screen.getPrimaryDisplay().displayFrequency) || 60),
  gameRoot: getGameRoot(),
  modsFolder: getWorkspaceModsPath(),
  server: PROJECT_SERVER
}));

ipcMain.handle('list-mods', async () => {
  try {
    return { success: true, mods: listModsFromWorkspace() };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('choose-file', async (event, options = {}) => {
  const result = await dialog.showOpenDialog({
    properties: ['openFile'],
    filters: options.filters || []
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return toFileMeta(result.filePaths[0]);
});

ipcMain.handle('get-asset-preview', async (event, filePath) => {
  try {
    return { success: true, preview: readAssetPreview(filePath) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('get-titlebar-icon', async () => {
  try {
    const iconPath = resolveTitlebarIcon();
    return { success: true, preview: iconPath ? readAssetPreview(iconPath) : null };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('window-control', async (event, action) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  if (!win) {
    return { success: false };
  }

  if (action === 'minimize') {
    win.minimize();
  } else if (action === 'maximize') {
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
  } else if (action === 'close') {
    win.close();
  }

  return { success: true, maximized: win.isMaximized() };
});

ipcMain.handle('window-is-maximized', async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  return Boolean(win?.isMaximized());
});

ipcMain.handle('profile-get', async (event, payload = {}) => {
  const nickname = String(payload.nickname || '').trim();
  if (!nickname) {
    return { success: false, error: 'Профиль не найден.' };
  }

  return { success: true, profile: sanitizeProfile(getUserProfile(nickname)) };
});

ipcMain.handle('profile-save-links', async (event, payload = {}) => {
  try {
    const nickname = String(payload.nickname || '').trim();
    if (!nickname) {
      return { success: false, error: 'Профиль не найден.' };
    }

    const profile = saveUserProfileLinks(nickname, payload);
    if (rpcContext) {
      updateDiscordRpc({ ...rpcContext, nickname: rpcContext.nickname || nickname });
    }

    return {
      success: true,
      profile
    };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle('spotify-connect', async (event, payload = {}) => {
  const nickname = String(payload.nickname || '').trim();
  if (!nickname) {
    return { success: false, error: 'Профиль не найден.' };
  }

  return connectSpotify(nickname);
});

ipcMain.handle('spotify-disconnect', async (event, payload = {}) => {
  const nickname = String(payload.nickname || '').trim();
  if (!nickname) {
    return { success: false, error: 'Профиль не найден.' };
  }

  const profiles = getProfiles();
  const profile = getUserProfile(nickname);
  profile.spotify = null;
  profiles[nickname] = profile;
  saveProfiles(profiles);
  writeMinecraftMusicStatus(nickname, { connected: false });
  return { success: true, profile: sanitizeProfile(profile) };
});

ipcMain.handle('spotify-now-playing', async (event, payload = {}) => {
  try {
    const nickname = String(payload.nickname || '').trim();
    if (!nickname) {
      return { success: false, error: 'Профиль не найден.' };
    }

    const nowPlaying = await getSpotifyNowPlaying(nickname);
    writeMinecraftMusicStatus(nickname, nowPlaying);
    return { success: true, nowPlaying };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle('launch-minecraft', async (event, payload) => {
  const launchKey = payload.user?.sessionToken;
  if (launchKey && activeLaunches.has(launchKey)) {
    return { success: false, error: 'Minecraft is already launching or running.' };
  }

  const maxFps = getRefreshRateForSender(event.sender);
  const nickname = String(payload.user?.nickname || '').trim();
  const settings = saveSettings({
    ...getSettings(nickname),
    ...(payload.settings || {}),
    memory: payload.memory || getSettings(nickname).memory,
    maxFps
  }, nickname);
  const root = getGameRoot();
  const user = payload.user || {};
  const launchWindow = BrowserWindow.fromWebContents(event.sender);

  if (!user.nickname || !activeSessions.has(user.sessionToken)) {
    return { success: false, error: 'Launcher session expired. Log in again.' };
  }

  const launchState = {
    cancelled: false,
    process: null,
    window: launchWindow,
    hideLauncherDuringGame: Boolean(settings.hideLauncherDuringGame)
  };
  activeLaunches.set(user.sessionToken, launchState);

  try {
    ensureDir(root);
    const repairedAssets = removeEmptyAssetObjects(root);
    const syncedMods = syncModsToGameRoot(root);
    const wallpaperPack = buildWallpaperResourcePack(root, settings.wallpaper, settings.minecraftVersion || '1.20.1');
    const playerAssetsPack = buildPlayerAssets(root, settings);
    writeOptionsResourcePacks(root, [wallpaperPack, playerAssetsPack]);
    writePerformanceOptions(root, maxFps);
    const fabric = await ensureFabricVersion(root, settings.minecraftVersion || '1.20.1', settings.fabricLoaderVersion);
    const auth = await launcher.authenticator.getAuth(user.nickname);

    launcher.event.removeAllListeners('debug');
    launcher.event.removeAllListeners('data');
    launcher.event.removeAllListeners('download-status');
    launcher.event.removeAllListeners('close');
    launcher.event.removeAllListeners('error');

    launcher.event.on('debug', (data) => event.sender.send('launch-debug', String(data)));
    launcher.event.on('data', (data) => event.sender.send('launch-log', data.toString()));
    launcher.event.on('download-status', (data) => event.sender.send('launch-progress', data));
    launcher.event.on('close', (code) => {
      activeLaunches.delete(user.sessionToken);
      if (launchState.window && !launchState.window.isDestroyed()) {
        launchState.window.show();
      }
      stopPlayingDiscordRpc();
      event.sender.send('launch-closed', code);
    });
    launcher.event.on('error', (data) => event.sender.send('launch-error', data.toString()));

    const options = {
      authorization: auth,
      clientPackage: null,
      root,
      os: getOsName(),
      version: {
        number: settings.minecraftVersion || '1.20.1',
        type: 'Fabric',
        custom: fabric.id
      },
      javaPath: settings.javaPath || undefined,
      memory: {
        min: String(settings.memory.min),
        max: String(settings.memory.max)
      },
      server: {
        host: PROJECT_SERVER.host,
        port: String(PROJECT_SERVER.port)
      },
      customArgs: [
        '-XX:+UseG1GC',
        '-XX:+UnlockExperimentalVMOptions',
        '-XX:G1NewSizePercent=20',
        '-XX:G1ReservePercent=20',
        '-XX:MaxGCPauseMillis=50',
        '-Dsun.rmi.dgc.server.gcInterval=2147483646',
        ...fabric.jvmArgs,
        `-Dproject.auth.user=${user.nickname}`,
        `-Dproject.auth.token=${user.sessionToken}`
      ]
    };

    const originalSpawn = childProcess.spawn;
    childProcess.spawn = (...spawnArgs) => {
      const minecraftProcess = originalSpawn(...spawnArgs);
      launchState.process = minecraftProcess;
      if (launchState.hideLauncherDuringGame && launchState.window && !launchState.window.isDestroyed()) {
        launchState.window.hide();
      }
      if (launchState.cancelled && !minecraftProcess.killed) {
        minecraftProcess.kill();
      }
      return minecraftProcess;
    };

    try {
      await launcher.core(options);
    } finally {
      childProcess.spawn = originalSpawn;
    }

    startPlayingDiscordRpc(user, settings);

    if (!launchState.process) {
      activeLaunches.delete(user.sessionToken);
      stopPlayingDiscordRpc();
    }

    return {
      success: true,
      syncedMods,
      wallpaperPack,
      playerAssetsPack,
      fabric,
      maxFps,
      repairedAssets
    };
  } catch (err) {
    activeLaunches.delete(user.sessionToken);
    if (launchState.window && !launchState.window.isDestroyed()) {
      launchState.window.show();
    }
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle('stop-minecraft', async (event, payload = {}) => {
  const launchKey = payload.sessionToken;
  const launchState = activeLaunches.get(launchKey);

  if (!launchState) {
    return { success: false, error: 'Minecraft is not running.' };
  }

  launchState.cancelled = true;

  if (launchState.process && !launchState.process.killed) {
    launchState.process.kill();
    if (launchState.window && !launchState.window.isDestroyed()) {
      launchState.window.show();
    }
    stopPlayingDiscordRpc();
    return { success: true, stopped: true };
  }

  return { success: true, stopped: false };
});

app.whenReady().then(() => {
  Menu.setApplicationMenu(null);
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
