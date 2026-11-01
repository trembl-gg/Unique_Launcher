const { app, BrowserWindow, ipcMain, dialog, nativeImage, Menu, screen, shell, clipboard } = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');
const crypto = require('crypto');
const childProcess = require('child_process');
const { LaunchSession } = require('./lib/launch-session');
const { prepareHorizonLaunch, startHorizon } = require('./lib/horizon-client');
const { sendAuthCallback } = require('./lib/auth-callback');
const { ensureHorizonResources } = require('./lib/horizon-resources');
const { syncHorizonInstance } = require('./lib/horizon-instance');
const { GameLogs } = require('./lib/game-logs');
const { GameStorage } = require('./lib/game-storage');
const { InstancePaths } = require('./lib/instance-paths');
const { instanceLaunchOptions, mergeJvmArguments } = require('./lib/instance-launch-options');
const { AsyncLocalStorage } = require('node:async_hooks');
const instanceContext = new AsyncLocalStorage();
const { SettingsService } = require('./lib/settings-service');
const { InstanceRepository } = require('./lib/instance-repository');
const { JavaService } = require('./lib/java-service');
const { SkinService } = require('./lib/skin-service');
const { LocalModMetadata } = require('./lib/local-mod-metadata');
const { ContentImporter } = require('./lib/content-importer');
const localModMetadata = new LocalModMetadata();
const { RequestCache } = require('./lib/request-cache');
const modrinthRequestCache = new RequestCache();
const { DiscordPresence } = require('./lib/discord-presence');
const http = require('http');
const https = require('https');
const Store = require('electron-store');
const AdmZip = require('adm-zip');
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

function readEnvValueOrFile(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.includes('-----BEGIN')) return text.replace(/\\n/g, '\n');
  try {
    const fullPath = path.isAbsolute(text) ? text : path.join(__dirname, text);
    return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : text;
  } catch (err) {
    return text;
  }
}

const store = new Store({ name: 'launcher-data' });
const gameStorage = new GameStorage({ store, launcherRoot: __dirname, legacyRoot: path.join(app.getPath('userData'), 'minecraft'), onMigration: active => console.log(active ? 'UNIQUE_STORAGE_COPY_START' : 'UNIQUE_STORAGE_COPY_END') });
const instancePaths = new InstancePaths({ store, base: () => gameStorage.root });

const USERS_KEY = 'users';
const SETTINGS_KEY = 'settings';
const USER_SETTINGS_KEY = 'userSettings';
const SESSION_KEY = 'lastSession';
const ACCOUNTS_KEY = 'savedAccounts';
const PROFILES_KEY = 'profiles';
const BUILD_INSTANCES_KEY = 'buildInstances';
const ASSET_UPLOADS_KEY = 'assetUploads';
const LAUNCHER_NAME = 'UNIQUE LAUNCHER';
const DISCORD_INVITE_URL = 'https://discord.gg/unique';
const DISCORD_CLIENT_ID = process.env.UNIQUE_DISCORD_CLIENT_ID || '1480900668788310088';
const MICROSOFT_CLIENT_ID = process.env.MICROSOFT_CLIENT_ID || process.env.UNIQUE_MICROSOFT_CLIENT_ID || '8e0b0376-e0b6-4f26-869f-9d5c7e321046';
const MICROSOFT_AUTHORIZE_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize';
const MICROSOFT_TOKEN_URL = 'https://login.microsoftonline.com/consumers/oauth2/v2.0/token';
const MICROSOFT_OAUTH_SCOPE = 'XboxLive.signin offline_access';
// Register this exact URI in Azure App Registration -> Authentication -> Mobile and desktop applications.
const MICROSOFT_REDIRECT_URI = process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:53682/callback';
const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || process.env.UNIQUE_SPOTIFY_CLIENT_ID || '';
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || process.env.UNIQUE_SPOTIFY_CLIENT_SECRET || '';
const SPOTIFY_REDIRECT_PORT = Number(process.env.SPOTIFY_REDIRECT_PORT || 48128);
const SPOTIFY_REDIRECT_URI = process.env.SPOTIFY_REDIRECT_URI || `http://127.0.0.1:${SPOTIFY_REDIRECT_PORT}/spotify/callback`;
const SPOTIFY_SCOPES = ['user-read-currently-playing', 'user-read-playback-state'];
const PROJECT_TPS_URL = process.env.PROJECT_TPS_URL || '';
const DEFAULT_UNIQUE_API_URL = '';
const UNIQUE_API_URL = ''.replace(/\/+$/, ''); // Remote UNIQUE API disabled by default
const DEFAULT_UNIQUE_API_FALLBACK_URLS = '';
const UNIQUE_API_FALLBACK_URLS = String(process.env.UNIQUE_API_FALLBACK_URLS || DEFAULT_UNIQUE_API_FALLBACK_URLS)
  .split(',')
  .map((value) => value.trim().replace(/\/+$/, ''))
  .filter(Boolean);
const UNIQUE_API_FORCE_IPV4 = process.env.UNIQUE_API_FORCE_IPV4 !== 'false';
const UNIQUE_MOD_MANIFEST_URL = process.env.UNIQUE_MOD_MANIFEST_URL
  || (UNIQUE_API_URL ? `${UNIQUE_API_URL}/launcher/manifest` : '');
const UNIQUE_AUTH_VERIFY_URL = process.env.UNIQUE_AUTH_VERIFY_URL
  || (UNIQUE_API_URL ? `${UNIQUE_API_URL}/launcher/session/verify` : '');
const UNIQUE_CLIENT_CONFIG_URL = process.env.UNIQUE_CLIENT_CONFIG_URL
  || (UNIQUE_API_URL ? `${UNIQUE_API_URL}/launcher/config` : '');
const UNIQUE_PROFILE_URL = process.env.UNIQUE_PROFILE_URL
  || (UNIQUE_API_URL ? `${UNIQUE_API_URL}/launcher/profile` : '');
const UNIQUE_SERVERS_URL = process.env.UNIQUE_SERVERS_URL
  || (UNIQUE_API_URL ? `${UNIQUE_API_URL}/launcher/servers` : '');
const UNIQUE_UPDATE_URL = (process.env.UNIQUE_UPDATE_URL || (UNIQUE_API_URL ? `${UNIQUE_API_URL}/updates` : '')).replace(/\/+$/, '');
const AUTO_UPDATE_CHECK_INTERVAL_MS = Math.max(
  5 * 60 * 1000,
  Number(process.env.UNIQUE_UPDATE_CHECK_INTERVAL_MS || 30 * 60 * 1000)
);
const UNIQUE_NEWS_URL = process.env.UNIQUE_NEWS_URL
  || (UNIQUE_API_URL ? `${UNIQUE_API_URL}/launcher/news` : '');
const UNIQUE_CRASH_REPORT_URL = process.env.UNIQUE_CRASH_REPORT_URL
  || (UNIQUE_API_URL ? `${UNIQUE_API_URL}/launcher/crash-report` : '');
const UNIQUE_MANIFEST_PUBLIC_KEY = readEnvValueOrFile(process.env.UNIQUE_MANIFEST_PUBLIC_KEY || '');
const UNIQUE_LAUNCHER_BUILD_ID = process.env.UNIQUE_LAUNCHER_BUILD_ID || app.getVersion();
const UNIQUE_LAUNCHER_AUTH_SECRET = process.env.UNIQUE_LAUNCHER_AUTH_SECRET || 'unique-launcher-dev-secret-change-me';
const JAVA_DOWNLOAD_URL = process.env.JAVA_DOWNLOAD_URL || 'https://adoptium.net/temurin/releases/?version=21';
const REQUIRED_MODS_MANIFEST_TTL_MS = 5 * 60 * 1000;
const MAX_REMOTE_ASSET_BYTES = Math.max(8, Number(process.env.UNIQUE_MAX_ASSET_MB || 32)) * 1024 * 1024;
const APP_USER_MODEL_ID = 'com.unique.launcher';
const PROJECT_SERVER = {
  name: 'Minecraft Launcher',
  host: process.env.PROJECT_SERVER_HOST || '',
  port: Number(process.env.PROJECT_SERVER_PORT || 25565)
};
const FABRIC_META_URL = 'https://meta.fabricmc.net';
const QUILT_META_URL = 'https://meta.quiltmc.org';
const FORGE_MAVEN_URL = 'https://maven.minecraftforge.net';
const NEOFORGE_MAVEN_URL = 'https://maven.neoforged.net/releases';
const MOJANG_VERSION_MANIFEST_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';
const MODRINTH_API_URL = 'https://api.modrinth.com/v2';
const SUPPORTED_VERSIONS_TTL_MS = 60 * 60 * 1000;
const SUPPORTED_MOD_LOADERS = ['fabric', 'forge', 'neoforge', 'quilt', 'vanilla'];
const MODRINTH_SEARCH_LOADERS = ['fabric', 'forge', 'neoforge', 'quilt'];
const MODRINTH_PROJECT_TYPES = ['mod', 'modpack', 'resourcepack', 'shader'];
const MODRINTH_FILE_TARGETS = {
  mod: { extensions: ['.jar'], folder: 'mods', userVersioned: true },
  resourcepack: { extensions: ['.zip'], folder: 'resourcepacks', userVersioned: false },
  shader: { extensions: ['.zip'], folder: 'shaderpacks', userVersioned: false }
};
const FALLBACK_SUPPORTED_VERSIONS = [
  '1.16',
  '1.16.1',
  '1.16.2',
  '1.16.3',
  '1.16.4',
  '1.16.5',
  '1.17',
  '1.17.1',
  '1.18',
  '1.18.1',
  '1.18.2',
  '1.19',
  '1.19.1',
  '1.19.2',
  '1.19.3',
  '1.19.4',
  '1.20',
  '1.20.1',
  '1.20.2',
  '1.20.3',
  '1.20.4',
  '1.20.5',
  '1.20.6',
  '1.21',
  '1.21.1',
  '1.21.2'
];

const activeSessions = new Map();
const activeLaunches = new Map();
const pendingUserModDeletes = new Map();
const microsoftAuthFlows = new Map();
let microsoftAuthServer = null;
let modManifestCache = null;
let modManifestFetchedAt = 0;
let spotifyAuthFlow = null;
let launcherPublicConfigCache = null;
let launcherPublicConfigFetchedAt = 0;
let supportedVersionsCache = null;
let supportedSnapshotVersionsCache = [];
let supportedVersionsFetchedAt = 0;

function resolveLauncherIcon() {
  const iconFiles = fs.readdirSync(__dirname).filter((file) => file.toLowerCase().endsWith('.ico'));
  const preferred = iconFiles.find((file) => file === 'launcher.ico')
    || iconFiles.find((file) => file === 'unique \u0438\u043a\u043e\u043d\u043a\u0430.ico')
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
    show: false,
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
  win.once('ready-to-show', () => {
    win.maximize();
    win.show();
  });

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

function getUserModsPath(minecraftVersion = 'global') {
  const folder = instancePaths.content(getGameRoot(), 'mods');
  const context = instanceContext.getStore();
  if (context?.instanceId && store.get('legacyGameInstance', '') === `${context.owner}:${context.instanceId}` && !store.get('legacyModsMigrated', false)) {
    const version = applySelectedInstanceToSettings(context.owner, getSettings(context.owner)).minecraftVersion || minecraftVersion;
    const old = path.join(app.getPath('userData'), 'user-mods', String(version).replace(/[^A-Za-z0-9_.-]/g, '_'));
    if (fs.existsSync(old)) for (const file of fs.readdirSync(old, { withFileTypes: true })) {
      if (file.isFile() && /\.jar(\.disabled)?$/i.test(file.name) && !fs.existsSync(path.join(folder, file.name))) {
        fs.copyFileSync(path.join(old, file.name), path.join(folder, file.name), fs.constants.COPYFILE_EXCL);
        if (file.name.endsWith('.disabled')) {
          const enabled = path.join(folder, file.name.slice(0, -9));
          if (fs.existsSync(enabled) && !fs.existsSync(enabled + '.legacy-backup')) fs.renameSync(enabled, enabled + '.legacy-backup');
        }
      }
    }
    store.set('legacyModsMigrated', true);
  }
  return folder;
}

function getGameRoot() {
  const context = instanceContext.getStore();
  return context ? instancePaths.root(context.owner, context.instanceId) : gameStorage.root;
}

function beginImportedInstance() {
  const context = instanceContext.getStore();
  if (context && !context.newInstance) { context.instanceId = createBuildInstanceId(); context.newInstance = true; }
}

function sha256File(filePath) {
  const hash = crypto.createHash('sha256');
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    let bytesRead = 0;
    do {
      bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null);
      if (bytesRead > 0) {
        hash.update(buffer.subarray(0, bytesRead));
      }
    } while (bytesRead > 0);
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest('hex');
}

function hashFile(filePath, algorithm = 'sha256') {
  const hash = crypto.createHash(algorithm);
  const fd = fs.openSync(filePath, 'r');
  const buffer = Buffer.allocUnsafe(1024 * 1024);
  try {
    let bytesRead = 0;
    do {
      bytesRead = fs.readSync(fd, buffer, 0, buffer.length, null);
      if (bytesRead > 0) {
        hash.update(buffer.subarray(0, bytesRead));
      }
    } while (bytesRead > 0);
  } finally {
    fs.closeSync(fd);
  }
  return hash.digest('hex');
}

function sanitizeDownloadFileName(fileName, fallback = 'download.bin') {
  const name = path.basename(String(fileName || fallback))
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .trim();
  return name || fallback;
}

function safeJoinPath(baseDir, relativePath) {
  const normalizedBase = path.resolve(baseDir);
  const cleanRelative = String(relativePath || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '');
  if (!cleanRelative || cleanRelative.includes('\0') || path.isAbsolute(cleanRelative)) {
    return null;
  }

  const target = path.resolve(normalizedBase, cleanRelative);
  const targetLower = target.toLowerCase();
  const baseLower = normalizedBase.toLowerCase();
  return targetLower === baseLower || targetLower.startsWith(`${baseLower}${path.sep}`)
    ? target
    : null;
}

function getHardwareIdHash() {
  const raw = [
    os.hostname(),
    os.platform(),
    os.arch(),
    os.cpus()?.[0]?.model || '',
    os.totalmem(),
    process.env.PROCESSOR_IDENTIFIER || '',
    process.env.COMPUTERNAME || '',
    process.env.USERDOMAIN || ''
  ].join('|');
  return crypto.createHash('sha256').update(raw).digest('hex');
}

function signLauncherSession(nickname, sessionToken, hwidHash) {
  return crypto
    .createHmac('sha256', UNIQUE_LAUNCHER_AUTH_SECRET)
    .update(`${nickname}:${sessionToken}:${hwidHash}`)
    .digest('hex');
}

function sha256Text(value) {
  return crypto.createHash('sha256').update(String(value || ''), 'utf8').digest('hex');
}

function stableJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableJson).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function verifyDetachedSignature(payload, signature, publicKeyPem = UNIQUE_MANIFEST_PUBLIC_KEY) {
  if (!publicKeyPem || !signature) {
    return true;
  }
  try {
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(typeof payload === 'string' ? payload : stableJson(payload));
    verifier.end();
    return verifier.verify(publicKeyPem, String(signature), 'base64');
  } catch (err) {
    return false;
  }
}

let javaService;
function getJavaService() {
  return javaService ||= new JavaService({ shell, downloadUrl: JAVA_DOWNLOAD_URL });
}
function normalizeJavaCandidate(...args) { return getJavaService().normalizeJavaCandidate(...args); }
function getJavaMajorVersion(...args) { return getJavaService().getJavaMajorVersion(...args); }
function parseJavaMajorVersion(...args) { return getJavaService().parseJavaMajorVersion(...args); }
function collectJavaCandidates(...args) { return getJavaService().collectJavaCandidates(...args); }
function resolveJava17(...args) { return getJavaService().resolveJava17(...args); }
function installRecommendedJava(...args) { return getJavaService().installRecommendedJava(...args); }

function getRecentFiles(dir, limit = 10) {
  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs.readdirSync(dir)
    .map((name) => {
      const filePath = path.join(dir, name);
      try {
        const stat = fs.statSync(filePath);
        return stat.isFile() ? {
          name,
          path: filePath,
          size: stat.size,
          modifiedAt: new Date(stat.mtimeMs).toISOString()
        } : null;
      } catch (err) {
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => new Date(b.modifiedAt) - new Date(a.modifiedAt))
    .slice(0, limit);
}

function collectDiagnostics() {
  const root = getGameRoot();
  const settings = getSettings(store.get(`${SESSION_KEY}.nickname`, ''));
  const javaCandidates = collectJavaCandidates(settings.javaPath)
    .slice(0, 12)
    .map((candidate) => ({ path: candidate, major: getJavaMajorVersion(candidate) }));
  const modsDir = path.join(root, 'mods');
  const mods = fs.existsSync(modsDir)
    ? fs.readdirSync(modsDir)
      .filter((file) => file.toLowerCase().endsWith('.jar'))
      .map((file) => {
        const filePath = path.join(modsDir, file);
        const stat = fs.statSync(filePath);
        return {
          name: file,
          size: stat.size,
          sha256: sha256File(filePath)
        };
      })
    : [];

  return {
    launcher: {
      name: LAUNCHER_NAME,
      version: app.getVersion(),
      buildId: UNIQUE_LAUNCHER_BUILD_ID,
      packaged: app.isPackaged,
      updateUrlConfigured: Boolean(UNIQUE_UPDATE_URL),
      manifestSignatureRequired: Boolean(UNIQUE_MANIFEST_PUBLIC_KEY)
    },
    system: {
      platform: process.platform,
      arch: process.arch,
      release: os.release(),
      totalMemoryMb: Math.floor(os.totalmem() / 1024 / 1024),
      cpu: os.cpus()?.[0]?.model || ''
    },
    paths: {
      userData: app.getPath('userData'),
      gameRoot: root,
      bundledMods: getWorkspaceModsPath(),
      logs: path.join(root, 'logs'),
      crashReports: path.join(root, 'crash-reports')
    },
    api: {
      configured: Boolean(UNIQUE_API_URL),
      authVerify: Boolean(UNIQUE_AUTH_VERIFY_URL),
      manifest: Boolean(UNIQUE_MOD_MANIFEST_URL),
      serverRegistry: Boolean(UNIQUE_SERVERS_URL)
    },
    settings: {
      minecraftVersion: settings.minecraftVersion,
      projectId: settings.projectId,
      buildProfile: settings.buildProfile,
      fabricLoaderVersion: settings.fabricLoaderVersion,
      memory: settings.memory,
      hideLauncherDuringGame: settings.hideLauncherDuringGame
    },
    javaCandidates,
    mods,
    logs: [...getRecentFiles(path.join(root, 'logs')), ...getRecentFiles(path.join(app.getPath('userData'), 'logs'), 20).filter(file => /^(minecraft-|native-host)/.test(file.name))],
    crashReports: getRecentFiles(path.join(root, 'crash-reports'))
  };
}

function exportDiagnostics() {
  const diagnostics = collectDiagnostics();
  const outputDir = path.join(app.getPath('userData'), 'diagnostics');
  ensureDir(outputDir);
  const zipPath = path.join(outputDir, `unique-diagnostics-${Date.now()}.zip`);
  const zip = new AdmZip();
  zip.addFile('diagnostics.json', Buffer.from(JSON.stringify(diagnostics, null, 2), 'utf8'));

  for (const file of diagnostics.logs || []) {
    try {
      zip.addLocalFile(file.path, 'logs');
    } catch (err) {
      // Logs are best-effort because Minecraft can rotate them while the launcher is open.
    }
  }
  for (const file of diagnostics.crashReports || []) {
    try {
      zip.addLocalFile(file.path, 'crash-reports');
    } catch (err) {
      // Crash reports are best-effort for the same reason.
    }
  }

  zip.writeZip(zipPath);
  return zipPath;
}

function readTail(filePath, maxBytes = 96 * 1024) {
  if (!fs.existsSync(filePath)) return '';
  const stat = fs.statSync(filePath);
  const start = Math.max(0, stat.size - maxBytes);
  const fd = fs.openSync(filePath, 'r');
  try {
    const buffer = Buffer.allocUnsafe(stat.size - start);
    fs.readSync(fd, buffer, 0, buffer.length, start);
    return buffer.toString('utf8');
  } finally {
    fs.closeSync(fd);
  }
}

function analyzeMinecraftCrash() {
  const root = getGameRoot();
  const latestLog = path.join(root, 'logs', 'latest.log');
  const crashReports = getRecentFiles(path.join(root, 'crash-reports'), 3);
  const hsErrors = getRecentFiles(__dirname, 3).filter((file) => /^hs_err_pid/i.test(file.name));
  const sources = [
    { name: 'latest.log', text: readTail(latestLog) },
    ...getRecentFiles(path.join(app.getPath('userData'), 'logs'), 20).filter(file => /^minecraft-/.test(file.name)).slice(0, 1).map(file => ({ name: file.name, text: readTail(file.path) })),
    ...crashReports.map((file) => ({ name: file.name, text: readTail(file.path) })),
    ...hsErrors.map((file) => ({ name: file.name, text: readTail(file.path) }))
  ].filter((source) => source.text);
  const findings = [];
  const add = (severity, title, detail) => findings.push({ severity, title, detail });

  for (const source of sources) {
    const text = source.text;
    if (/Invalid tag id|Loading NBT data|Couldn't load server list/i.test(text)) {
      add('high', 'Broken server list', `${source.name}: servers.dat is corrupted; repair mode can recreate it.`);
    }
    if (/zip file is empty|EOFException|End of input/i.test(text)) {
      add('high', 'Corrupted asset or resource pack', `${source.name}: empty/corrupted JSON or zip was detected.`);
    }
    if (/requires version 17|wrong version is present: 8|Java.*8/i.test(text)) {
      add('high', 'Wrong Java version', `${source.name}: Fabric needs Java 17 or newer.`);
    }
    if (/Incompatible mods found|Some of your mods are incompatible/i.test(text)) {
      add('medium', 'Incompatible mods', `${source.name}: mod set does not match selected Minecraft/Fabric version.`);
    }
    if (/EXCEPTION_ACCESS_VIOLATION|Problematic frame|lwjgl/i.test(text)) {
      add('medium', 'Native graphics/JVM crash', `${source.name}: update GPU drivers and use Java 17/21.`);
    }
  }

  if (findings.length === 0) {
    add('info', 'No known crash pattern found', 'Attach diagnostics ZIP or latest.log for a deeper look.');
  }

  return {
    success: true,
    analyzedAt: new Date().toISOString(),
    sources: sources.map((source) => source.name),
    findings
  };
}

async function repairGameRoot(nickname = '') {
  const root = getGameRoot();
  const settings = getSettings(nickname);
  ensureDir(root);
  const repaired = {
    emptyAssets: removeEmptyAssetObjects(root),
    removedTempMods: [],
    backedUpServerList: false,
    rewroteServers: false
  };

  const modsDir = path.join(root, 'mods');
  ensureDir(modsDir);
  for (const file of fs.readdirSync(modsDir)) {
    if (file.endsWith('.download') || file.endsWith('.tmp')) {
      fs.rmSync(path.join(modsDir, file), { force: true });
      repaired.removedTempMods.push(file);
    }
  }

  const serversPath = path.join(root, 'servers.dat');
  if (fs.existsSync(serversPath)) {
    const backupPath = `${serversPath}.broken-${Date.now()}.bak`;
    fs.copyFileSync(serversPath, backupPath);
    fs.rmSync(serversPath, { force: true });
    repaired.backedUpServerList = true;
  }

  writeServersDat(root, await getRegisteredServers(settings.projectId || 'unique'), { preserveExisting: true });
  repaired.rewroteServers = true;

  const versionProfile = await getVersionProfile(settings.minecraftVersion || '1.20.1');
  await syncRequiredModsToGameRoot(root, versionProfile, settings.buildProfile || 'normal');
  await enforceModIntegrity(root, versionProfile, settings.buildProfile || 'normal');
  return repaired;
}

function sendCrashReport(nickname, analysis) {
  if (!UNIQUE_CRASH_REPORT_URL) return;
  const session = store.get(SESSION_KEY, null);
  requestJson('POST', UNIQUE_CRASH_REPORT_URL, {
    timeoutMs: 5000,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nickname,
      sessionToken: session?.sessionToken || '',
      hwidHash: getHardwareIdHash(),
      analysis,
      diagnostics: collectDiagnostics()
    })
  }).catch(() => {});
}

function normalizeModLoader(loader) {
  const normalized = String(loader || '').trim().toLowerCase();
  if (normalized === 'mod') return 'fabric';
  if (normalized === 'qulit') return 'quilt';
  return SUPPORTED_MOD_LOADERS.includes(normalized) ? normalized : 'fabric';
}

function formatLoaderNameForLog(loader) {
  const normalized = normalizeModLoader(loader);
  if (normalized === 'neoforge') return 'NeoForge';
  if (normalized === 'forge') return 'Forge';
  if (normalized === 'quilt') return 'Quilt';
  if (normalized === 'vanilla') return 'Vanilla';
  return 'Fabric';
}

let settingsService;
function getSettingsService() {
  return settingsService ||= new SettingsService({ store, userKey: USER_SETTINGS_KEY, globalKey: SETTINGS_KEY, server: PROJECT_SERVER, normalizeLoader: normalizeModLoader, resolveServer: getProjectServerFromCache });
}
function getDefaultSettings(...args) { return getSettingsService().getDefaultSettings(...args); }
function normalizeSettings(...args) { return getSettingsService().normalizeSettings(...args); }
function getUserSettingsMap(...args) { return getSettingsService().getUserSettingsMap(...args); }
function getSettings(...args) { return getSettingsService().getSettings(...args); }
function saveSettings(...args) { return getSettingsService().saveSettings(...args); }

let instanceRepository;
function getInstanceRepository() {
  return instanceRepository ||= new InstanceRepository({ store, key: BUILD_INSTANCES_KEY, normalizeModLoader, getSettings, saveSettings });
}
function normalizeInstanceOwner(...args) { return getInstanceRepository().normalizeInstanceOwner(...args); }
function getBuildInstanceStore(...args) { return getInstanceRepository().getBuildInstanceStore(...args); }
function saveBuildInstanceStore(...args) { return getInstanceRepository().saveBuildInstanceStore(...args); }
function createBuildInstanceId(...args) { return getInstanceRepository().createBuildInstanceId(...args); }
function normalizeBuildInstance(...args) { return getInstanceRepository().normalizeBuildInstance(...args); }
function getBuildInstances(...args) { return getInstanceRepository().getBuildInstances(...args); }
function saveBuildInstances(...args) { return getInstanceRepository().saveBuildInstances(...args); }
function findBuildInstance(...args) { return getInstanceRepository().findBuildInstance(...args); }
function upsertBuildInstance(owner, instance, select) {
  const context = instanceContext.getStore();
  if (context?.newInstance && !instance.id) instance = { ...instance, id: context.instanceId };
  return getInstanceRepository().upsertBuildInstance(owner, instance, select);
}
function applySelectedInstanceToSettings(...args) { return getInstanceRepository().applySelectedInstanceToSettings(...args); }

function getProjectServerFromCache(projectId) {
  const projects = modManifestCache?.projects || [];
  const project = projects.find((entry) => entry.id === projectId);
  const server = project?.server;
  if (!server?.host) return null;
  return {
    name: String(server.name || project.name || PROJECT_SERVER.name),
    host: String(server.host),
    port: Number(server.port || PROJECT_SERVER.port)
  };
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
  syncRemoteProfile(nickname, {
    youtubeUrl: profile.youtubeUrl,
    twitchUrl: profile.twitchUrl
  });
  return sanitizeProfile(profile);
}

function getDiscordButtons(profile) {
  const language = getSettings().language;
  const buttons = [{ label: language === 'ru' ? 'Скачать лаунчер' : language === 'es' ? 'Descargar launcher' : 'Download launcher', url: 'https://github.com/trembl-gg/Unique_Launcher/releases/latest' }];
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

async function downloadSkinByNickname(nickname) {
  const cleanNickname = String(nickname || '').trim();
  if (!validateNickname(cleanNickname)) {
    throw new Error('Ник должен быть 3-16 символов: латиница, цифры или _.');
  }

  const skinsDir = path.join(app.getPath('userData'), 'skins');
  ensureDir(skinsDir);
  const targetPath = path.join(skinsDir, `${cleanNickname}-${Date.now()}.png`);
  await downloadFile(`https://minotar.net/skin/${encodeURIComponent(cleanNickname)}`, targetPath);

  if (!fs.existsSync(targetPath) || fs.statSync(targetPath).size < 64) {
    fs.rmSync(targetPath, { force: true });
    throw new Error('Сервис скинов вернул пустой файл.');
  }

  return toFileMeta(targetPath);
}

function readAssetPreview(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;

  const buffer = fs.readFileSync(filePath);
  return `data:${getMimeType(filePath)};base64,${buffer.toString('base64')}`;
}

async function uploadLauncherAsset(nickname, type, filePath, metadata = {}) {
  if (!UNIQUE_API_URL || !nickname || !filePath || !fs.existsSync(filePath)) return null;
  const stat = fs.statSync(filePath);
  if (stat.size <= 0 || stat.size > MAX_REMOTE_ASSET_BYTES) return null;

  const session = store.get(SESSION_KEY, null);
  if (!session?.sessionToken) return null;

  const sha256 = sha256File(filePath);
  const metadataSignature = sha256Text(stableJson(metadata || {}));
  const key = `${nickname}:${type}:${sha256}:${metadataSignature}`;
  const cache = store.get(ASSET_UPLOADS_KEY, {});
  const previousUpload = cache[key] || null;

  const extension = path.extname(filePath).replace('.', '').toLowerCase() || 'png';
  try {
    const response = await requestJson('POST', `${UNIQUE_API_URL}/launcher/assets/upload`, {
      timeoutMs: 30000,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nickname,
        sessionToken: session.sessionToken,
        hwidHash: getHardwareIdHash(),
        type,
        extension,
        metadata,
        dataBase64: fs.readFileSync(filePath).toString('base64')
      })
    });
    if (response?.success) {
      cache[key] = { url: response.url, sha256, uploadedAt: Date.now() };
      store.set(ASSET_UPLOADS_KEY, cache);
    }
    return response;
  } catch (err) {
    return previousUpload;
  }
}

async function syncRemoteLauncherAssets(nickname, settings) {
  const skinModel = settings.skinModel === 'slim'
    ? 'slim'
    : settings.skinModel === 'default'
      ? 'default'
      : detectSkinModel(settings.skin);
  await Promise.allSettled([
    uploadLauncherAsset(nickname, 'skin', settings.skin, { skinModel }),
    uploadLauncherAsset(nickname, 'cape', settings.cape, { animated: Boolean(settings.cape && /\.gif$/i.test(settings.cape)) }),
    uploadLauncherAsset(nickname, 'wallpaper', settings.wallpaper)
  ]);
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

function getText(url, timeoutMs = 10000) {
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
    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error('Request timed out'));
    });
    request.on('error', reject);
  });
}

function downloadFile(url, targetPath, onProgress = null) {
  return new Promise((resolve, reject) => {
    ensureDir(path.dirname(targetPath));
    const parsed = new URL(url);
    const transport = parsed.protocol === 'http:' ? http : https;
    const tempPath = `${targetPath}.download`;
    const file = fs.createWriteStream(tempPath);
    const request = transport.get(url, (response) => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        file.close(() => fs.rmSync(tempPath, { force: true }));
        response.resume();
        reject(new Error(`HTTP ${response.statusCode}: ${url}`));
        return;
      }

      const total = Number(response.headers['content-length'] || 0);
      let received = 0;
      response.on('data', (chunk) => {
        received += chunk.length;
        if (onProgress) {
          onProgress({ received, total });
        }
      });
      response.pipe(file);
      file.on('finish', () => {
        file.close(() => {
          fs.rmSync(targetPath, { force: true });
          fs.renameSync(tempPath, targetPath);
          resolve(targetPath);
        });
      });
    });

    request.setTimeout(30000, () => {
      request.destroy(new Error('Download timed out'));
    });
    request.on('error', (err) => {
      file.close(() => fs.rmSync(tempPath, { force: true }));
      reject(err);
    });
  });
}

function backupExistingFile(filePath, label = 'rollback') {
  if (!fs.existsSync(filePath)) return null;
  const backupDir = path.join(path.dirname(filePath), '.rollback');
  ensureDir(backupDir);
  const backupPath = path.join(backupDir, `${Date.now()}-${label}-${path.basename(filePath)}`);
  fs.copyFileSync(filePath, backupPath);
  return backupPath;
}

function verifyModSignature(mod, filePath) {
  if (!mod.signature) return true;
  const payload = `${mod.name}:${mod.sha256 || sha256File(filePath)}`;
  return verifyDetachedSignature(payload, mod.signature);
}

function isNetworkRequestError(err) {
  const code = String(err?.code || '').toUpperCase();
  return ['ENOTFOUND', 'EAI_AGAIN', 'ECONNRESET', 'ETIMEDOUT', 'ECONNREFUSED', 'EHOSTUNREACH', 'ENETUNREACH'].includes(code)
    || /timed out|socket hang up|network|dns/i.test(String(err?.message || ''));
}

function getApiRequestCandidates(rawUrl) {
  const candidates = [{ url: rawUrl }];
  if (!UNIQUE_API_URL || UNIQUE_API_FALLBACK_URLS.length === 0) {
    return candidates;
  }

  let parsed;
  let primary;
  try {
    parsed = new URL(rawUrl);
    primary = new URL(UNIQUE_API_URL);
  } catch (err) {
    return candidates;
  }

  if (parsed.origin !== primary.origin) {
    return candidates;
  }

  for (const fallbackBase of UNIQUE_API_FALLBACK_URLS) {
    try {
      const fallback = new URL(fallbackBase);
      if (fallback.origin === parsed.origin) continue;
      const fallbackUrl = new URL(`${parsed.pathname}${parsed.search}`, fallback.origin);
      const candidate = { url: fallbackUrl.toString() };

      if (fallback.protocol === 'https:' && primary.protocol === 'https:' && fallback.hostname !== primary.hostname) {
        candidate.servername = primary.hostname;
        candidate.hostHeader = primary.host;
      }

      candidates.push(candidate);
    } catch (err) {
      // Ignore malformed fallback URLs from local configuration.
    }
  }

  return candidates;
}

function isConfiguredApiUrl(rawUrl) {
  try {
    const parsed = new URL(rawUrl);
    if (UNIQUE_API_URL && parsed.origin === new URL(UNIQUE_API_URL).origin) {
      return true;
    }
    return UNIQUE_API_FALLBACK_URLS.some((fallbackBase) => {
      try {
        return parsed.origin === new URL(fallbackBase).origin;
      } catch (err) {
        return false;
      }
    });
  } catch (err) {
    return false;
  }
}

function requestJsonOnce(method, candidate, options = {}) {
  return new Promise((resolve, reject) => {
    const parsed = new URL(candidate.url);
    const body = options.body || null;
    const timeoutMs = Number(options.timeoutMs || 8000);
    const transport = parsed.protocol === 'http:' ? http : https;
    const request = transport.request({
      method,
      hostname: parsed.hostname,
      port: parsed.port || undefined,
      path: `${parsed.pathname}${parsed.search}`,
      family: UNIQUE_API_FORCE_IPV4 && isConfiguredApiUrl(candidate.url) ? 4 : undefined,
      servername: candidate.servername,
      headers: {
        ...(options.headers || {}),
        ...(candidate.hostHeader ? { Host: candidate.hostHeader } : {}),
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
          const errorMessage = typeof parsedBody?.error === 'string'
            ? parsedBody.error
            : parsedBody?.error?.message;
          const err = new Error(parsedBody?.error_description || errorMessage || parsedBody?.message || `HTTP ${response.statusCode} from ${parsed.hostname}${parsed.pathname}`);
          err.statusCode = response.statusCode;
          err.responseBody = parsedBody;
          if (typeof parsedBody?.error === 'string') {
            err.code = parsedBody.error;
          } else if (parsedBody?.error?.code) {
            err.code = parsedBody.error.code;
          }
          reject(err);
          return;
        }

        resolve(parsedBody);
      });
    });

    request.setTimeout(timeoutMs, () => {
      const err = new Error('Request timed out');
      err.code = 'ETIMEDOUT';
      request.destroy(err);
    });
    request.on('error', reject);
    if (body) request.write(body);
    request.end();
  });
}

async function requestJson(method, url, options = {}) {
  const candidates = getApiRequestCandidates(url);
  let lastError = null;

  for (const candidate of candidates) {
    try {
      return await requestJsonOnce(method, candidate, options);
    } catch (err) {
      lastError = err;
      if (!isNetworkRequestError(err)) {
        throw err;
      }
    }
  }

  throw lastError || new Error('Request failed');
}

function getModrinthHeaders() {
  return {
    Accept: 'application/json',
    'User-Agent': `${LAUNCHER_NAME}/${app.getVersion()} (UNIQUE Minecraft launcher)`
  };
}

function normalizeModrinthProjectType(type, fallback = 'mod') {
  const normalized = String(type || '').trim().toLowerCase().replace(/[_\s-]+/g, '');
  if (normalized === 'resourcepacks' || normalized === 'resourcepack') return 'resourcepack';
  if (normalized === 'shaderpacks' || normalized === 'shader') return 'shader';
  if (normalized === 'modpacks' || normalized === 'modpack') return 'modpack';
  if (normalized === 'mods' || normalized === 'mod') return 'mod';
  return MODRINTH_PROJECT_TYPES.includes(fallback) ? fallback : '';
}

function getModrinthProjectUrl(type, slug) {
  const projectType = normalizeModrinthProjectType(type);
  const projectSlug = String(slug || '').trim();
  return projectSlug ? `https://modrinth.com/${projectType}/${projectSlug}` : '';
}

function parseModrinthProjectRef(value = '') {
  const raw = String(value || '').trim();
  if (!raw) return { projectId: '', type: '' };

  try {
    const url = new URL(raw.includes('://') ? raw : `https://${raw}`);
    const host = url.hostname.toLowerCase();
    if (host.endsWith('modrinth.com')) {
      const parts = url.pathname.split('/').map((part) => part.trim()).filter(Boolean);
      const typeIndex = parts.findIndex((part) => MODRINTH_PROJECT_TYPES.includes(normalizeModrinthProjectType(part, '')));
      if (typeIndex >= 0 && parts[typeIndex + 1]) {
        return {
          projectId: parts[typeIndex + 1],
          type: normalizeModrinthProjectType(parts[typeIndex])
        };
      }
    }
  } catch (err) {
    // Plain slug or id, handled below.
  }

  return {
    projectId: raw.replace(/^@/, ''),
    type: ''
  };
}

async function modrinthRequest(endpoint, params = {}) {
  const url = new URL(`${MODRINTH_API_URL}${endpoint}`);
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    url.searchParams.set(key, String(value));
  }

  return modrinthRequestCache.get(url.toString(), () => requestJson('GET', url.toString(), {
    timeoutMs: 12000,
    headers: getModrinthHeaders()
  }));
}

function normalizeModrinthProject(hit = {}) {
  const type = normalizeModrinthProjectType(hit.project_type || hit.type, 'mod');
  const slug = String(hit.slug || '').trim();
  return {
    id: String(hit.project_id || hit.id || '').trim(),
    slug,
    title: String(hit.title || hit.slug || 'Modrinth project').trim(),
    description: String(hit.description || hit.summary || '').trim(),
    type,
    author: String(hit.author || '').trim(),
    iconUrl: String(hit.icon_url || '').trim(),
    downloads: Number(hit.downloads || 0),
    follows: Number(hit.follows || 0),
    dateCreated: String(hit.date_created || '').trim(),
    dateModified: String(hit.date_modified || '').trim(),
    clientSide: String(hit.client_side || '').trim(),
    serverSide: String(hit.server_side || '').trim(),
    license: typeof hit.license === 'string'
      ? hit.license
      : String(hit.license?.id || hit.license?.name || '').trim(),
    sourceUrl: String(hit.source_url || '').trim(),
    issuesUrl: String(hit.issues_url || '').trim(),
    wikiUrl: String(hit.wiki_url || '').trim(),
    discordUrl: String(hit.discord_url || '').trim(),
    projectUrl: getModrinthProjectUrl(type, slug),
    latestVersion: String(hit.latest_version || '').trim(),
    versions: Array.isArray(hit.versions) ? hit.versions.map(String) : [],
    categories: Array.isArray(hit.display_categories || hit.categories)
      ? (hit.display_categories || hit.categories).map(String)
      : [],
    loaders: Array.isArray(hit.loaders) ? hit.loaders.map(String) : [],
    gameVersions: Array.isArray(hit.game_versions) ? hit.game_versions.map(String) : []
  };
}

function normalizeModrinthVersion(version = {}) {
  return {
    id: String(version.id || '').trim(),
    projectId: String(version.project_id || '').trim(),
    authorId: String(version.author_id || '').trim(),
    name: String(version.name || version.version_number || 'Version').trim(),
    versionNumber: String(version.version_number || '').trim(),
    versionType: String(version.version_type || '').trim(),
    datePublished: String(version.date_published || '').trim(),
    downloads: Number(version.downloads || 0),
    featured: Boolean(version.featured),
    gameVersions: Array.isArray(version.game_versions) ? version.game_versions.map(String) : [],
    loaders: Array.isArray(version.loaders) ? version.loaders.map(String) : [],
    files: Array.isArray(version.files)
      ? version.files.map((file) => ({
        filename: String(file.filename || '').trim(),
        url: String(file.url || '').trim(),
        primary: Boolean(file.primary),
        size: Number(file.size || 0),
        fileType: String(file.file_type || '').trim(),
        hashes: file.hashes || {}
      }))
      : [],
    dependencies: Array.isArray(version.dependencies)
      ? version.dependencies.map((dependency) => ({
        projectId: String(dependency.project_id || '').trim(),
        versionId: String(dependency.version_id || '').trim(),
        fileName: String(dependency.file_name || '').trim(),
        dependencyType: String(dependency.dependency_type || '').trim()
      }))
      : []
  };
}

function normalizeModrinthCategory(category = {}) {
  return {
    icon: String(category.icon || '').trim(),
    name: String(category.name || '').trim(),
    projectType: String(category.project_type || '').trim(),
    header: String(category.header || '').trim()
  };
}

async function getModrinthTags() {
  const [gameVersions, loaders, categories, licenses, projectTypes] = await Promise.all([
    modrinthRequest('/tag/game_version'),
    modrinthRequest('/tag/loader'),
    modrinthRequest('/tag/category'),
    modrinthRequest('/tag/license').catch(() => []),
    modrinthRequest('/tag/project_type').catch(() => MODRINTH_PROJECT_TYPES)
  ]);

  return {
    gameVersions: Array.isArray(gameVersions) ? gameVersions : [],
    loaders: Array.isArray(loaders) ? loaders : [],
    categories: Array.isArray(categories) ? categories.map(normalizeModrinthCategory) : [],
    licenses: Array.isArray(licenses) ? licenses : [],
    projectTypes: Array.isArray(projectTypes) ? projectTypes.map((type) => normalizeModrinthProjectType(type)).filter(Boolean) : MODRINTH_PROJECT_TYPES
  };
}

async function getModrinthProject(projectId) {
  const project = await modrinthRequest(`/project/${encodeURIComponent(projectId)}`);
  return normalizeModrinthProject(project);
}

async function getModrinthProjectDependencies(projectId) {
  const result = await modrinthRequest(`/project/${encodeURIComponent(projectId)}/dependencies`);
  return {
    projects: Array.isArray(result?.projects) ? result.projects.map(normalizeModrinthProject) : [],
    versions: Array.isArray(result?.versions) ? result.versions.map(normalizeModrinthVersion) : []
  };
}

async function checkModrinthInstalledUpdates(payload = {}) {
  const settings = applySelectedInstanceToSettings(payload.nickname, getSettings(payload.nickname));
  const minecraftVersion = String(payload.minecraftVersion || settings.minecraftVersion || '1.20.1');
  const loader = getModrinthLoaderFilter(payload.loader || settings.modLoader || 'fabric');
  const modsDir = getUserModsPath(minecraftVersion);
  if (!fs.existsSync(modsDir)) {
    return { updates: [], hashes: [] };
  }

  const files = fs.readdirSync(modsDir)
    .filter((name) => name.toLowerCase().endsWith('.jar'))
    .map((name) => ({ name, path: path.join(modsDir, name), sha1: hashFile(path.join(modsDir, name), 'sha1') }));
  if (!files.length) {
    return { updates: [], hashes: [] };
  }

  const body = {
    hashes: files.map((file) => file.sha1),
    algorithm: 'sha1',
    loaders: loader ? [loader] : [],
    game_versions: [minecraftVersion]
  };
  const result = await requestJson('POST', `${MODRINTH_API_URL}/version_files/update`, {
    timeoutMs: 15000,
    headers: {
      ...getModrinthHeaders(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
  const updates = [];
  for (const [hash, version] of Object.entries(result || {})) {
    const file = files.find((entry) => entry.sha1 === hash);
    if (!file || !version || (version.files || []).some(candidate => candidate.hashes?.sha1 === hash)) continue;
    updates.push({
      fileName: file.name,
      hash,
      version: normalizeModrinthVersion(version)
    });
  }
  return { updates, hashes: files.map((file) => file.sha1) };
}

function getCompatibleMinecraftVersionCandidates(versionId) {
  const parsed = parseMinecraftReleaseId(versionId);
  const current = String(versionId || '').trim();
  if (!parsed) return current ? [current] : [];

  const candidates = [current];
  for (let patch = parsed.patch - 1; patch >= 0; patch -= 1) {
    candidates.push(`${parsed.major}.${parsed.minor}${patch > 0 ? `.${patch}` : ''}`);
  }
  candidates.push(`${parsed.major}.${parsed.minor}`);
  return uniqueVersionIds(candidates);
}

function getModrinthLoaderFilter(loader) {
  const normalized = normalizeModLoader(loader);
  return MODRINTH_SEARCH_LOADERS.includes(normalized) ? normalized : '';
}

async function searchModrinthProjects(payload = {}) {
  const query = String(payload.query || '').trim();
  const projectType = normalizeModrinthProjectType(payload.type || payload.projectType, 'mod');
  const minecraftVersion = String(payload.minecraftVersion || '').trim();
  const loader = getModrinthLoaderFilter(payload.loader || payload.modLoader || 'fabric');
  const limit = Math.max(1, Math.min(24, Number(payload.limit || 12)));
  const offset = Math.max(0, Number(payload.offset || 0));
  const index = ['relevance', 'downloads', 'follows', 'newest', 'updated'].includes(String(payload.index || ''))
    ? String(payload.index)
    : (query ? 'relevance' : 'downloads');
  const facets = [[`project_type:${projectType}`]];
  const extraFacets = Array.isArray(payload.facets) ? payload.facets : [];

  if (minecraftVersion) {
    facets.push(getCompatibleMinecraftVersionCandidates(minecraftVersion).map((version) => `versions:${version}`));
  }
  if (['mod', 'modpack'].includes(projectType) && loader) {
    facets.push([`categories:${loader}`]);
  } else if (projectType === 'mod') {
    return { projects: [], totalHits: 0 };
  }
  if (projectType === 'mod') {
    facets.push(['client_side:required', 'client_side:optional']);
  }
  if (payload.versionType && ['release', 'beta', 'alpha'].includes(String(payload.versionType))) {
    facets.push([`version_type:${payload.versionType}`]);
  }
  if (payload.license) {
    facets.push([`license:${String(payload.license)}`]);
  }
  for (const facet of extraFacets) {
    if (Array.isArray(facet) && facet.length) {
      facets.push(facet.map(String).filter(Boolean));
    }
  }

  const result = await modrinthRequest('/search', {
    query,
    facets: JSON.stringify(facets),
    index,
    limit,
    offset
  });

  return {
    projects: Array.isArray(result?.hits) ? result.hits.map(normalizeModrinthProject).filter((item) => item.id) : [],
    totalHits: Number(result?.total_hits || 0)
  };
}

async function getModrinthVersion(versionId) {
  return modrinthRequest(`/version/${encodeURIComponent(versionId)}`);
}

async function getModrinthProjectVersions(projectId, options = {}) {
  const query = { include_changelog: 'false' };
  if (options.includeChangelog) {
    query.include_changelog = 'true';
  }
  if (options.minecraftVersion) {
    query.game_versions = JSON.stringify([String(options.minecraftVersion)]);
  }
  if (Array.isArray(options.loaders) && options.loaders.length) {
    query.loaders = JSON.stringify(options.loaders.map(String));
  }
  return modrinthRequest(`/project/${encodeURIComponent(projectId)}/version`, query);
}

function selectModrinthVersionFile(version, extension) {
  const files = Array.isArray(version?.files) ? version.files : [];
  const wantedExtensions = (Array.isArray(extension) ? extension : [extension])
    .map((item) => String(item || '').toLowerCase())
    .filter(Boolean);
  const matches = files.filter((file) => {
    const fileName = String(file?.filename || '').toLowerCase();
    if (wantedExtensions.length && !wantedExtensions.some((wantedExtension) => fileName.endsWith(wantedExtension))) {
      return false;
    }
    return !['sources-jar', 'dev-jar', 'javadoc-jar', 'signature'].includes(String(file.file_type || ''));
  });

  return matches.find((file) => file.primary) || matches[0] || null;
}

async function selectModrinthProjectVersion(projectId, options = {}) {
  if (options.versionId) {
    const version = await getModrinthVersion(options.versionId);
    if (!selectModrinthVersionFile(version, options.extension)) {
      throw new Error('Selected Modrinth version has no compatible downloadable file.');
    }
    return version;
  }

  const versionCandidates = getCompatibleMinecraftVersionCandidates(options.minecraftVersion);
  let versions = [];
  for (const minecraftVersion of versionCandidates.length ? versionCandidates : [options.minecraftVersion]) {
    versions = await getModrinthProjectVersions(projectId, {
      minecraftVersion,
      loaders: options.loaders
    });
    if (Array.isArray(versions) && versions.length) break;
  }

  if ((!Array.isArray(versions) || versions.length === 0) && Array.isArray(options.loaders) && options.loaders.length) {
    for (const minecraftVersion of versionCandidates.length ? versionCandidates : [options.minecraftVersion]) {
      versions = await getModrinthProjectVersions(projectId, {
        minecraftVersion,
        loaders: []
      });
      if (Array.isArray(versions) && versions.length) break;
    }
  }

  const compatible = (Array.isArray(versions) ? versions : [])
    .filter((version) => selectModrinthVersionFile(version, options.extension));
  if (!compatible.length) {
    throw new Error('No compatible Modrinth version found for selected Minecraft version.');
  }

  return compatible.find((version) => version.version_type === 'release')
    || compatible.find((version) => version.featured)
    || compatible[0];
}

function verifyExpectedHashes(filePath, hashes = {}) {
  const checks = [
    ['sha512', hashes.sha512],
    ['sha1', hashes.sha1],
    ['sha256', hashes.sha256]
  ].filter(([, expected]) => expected);

  if (!checks.length) return true;

  for (const [algorithm, expected] of checks) {
    const actual = hashFile(filePath, algorithm).toLowerCase();
    if (actual === String(expected).trim().toLowerCase()) {
      return true;
    }
  }

  return false;
}

async function downloadVerifiedFile(file, targetPath) {
  const expectedSize = Number(file?.size || file?.fileSize || 0);
  const hashes = file?.hashes || {};
  const existingValid = fs.existsSync(targetPath)
    && (!expectedSize || fs.statSync(targetPath).size === expectedSize)
    && verifyExpectedHashes(targetPath, hashes);

  if (!existingValid) {
    await downloadFile(file.url || file.downloadUrl, targetPath);
  }

  if (!verifyExpectedHashes(targetPath, hashes)) {
    fs.rmSync(targetPath, { force: true });
    throw new Error(`Hash mismatch for ${path.basename(targetPath)}`);
  }

  return {
    name: path.basename(targetPath),
    path: targetPath,
    sizeMb: fs.existsSync(targetPath) ? Number((fs.statSync(targetPath).size / 1024 / 1024).toFixed(2)) : 0,
    sha256: fs.existsSync(targetPath) ? sha256File(targetPath) : ''
  };
}

function normalizeMrpackPath(filePath) {
  return String(filePath || '')
    .replace(/\\/g, '/')
    .replace(/^\/+/, '')
    .replace(/^\.\/+/, '');
}

function getMrpackTargetPath(root, minecraftVersion, relativePath) {
  const normalized = normalizeMrpackPath(relativePath);
  const fileName = sanitizeDownloadFileName(path.basename(normalized), 'modrinth-file.bin');
  if (/^mods\/.+\.jar$/i.test(normalized)) {
    return path.join(getUserModsPath(minecraftVersion), fileName);
  }
  return safeJoinPath(root, normalized);
}

function extractMrpackOverrides(zip, root, minecraftVersion) {
  const prefixes = ['overrides/', 'client-overrides/'];
  const extracted = [];

  for (const entry of zip.getEntries()) {
    if (entry.isDirectory) continue;
    const entryName = normalizeMrpackPath(entry.entryName);
    const prefix = prefixes.find((item) => entryName.startsWith(item));
    if (!prefix) continue;

    const relativePath = entryName.slice(prefix.length);
    const target = getMrpackTargetPath(root, minecraftVersion, relativePath);
    if (!target) continue;

    ensureDir(path.dirname(target));
    backupExistingFile(target, 'modrinth-override');
    fs.writeFileSync(target, entry.getData());
    extracted.push(path.basename(target));
  }

  return extracted;
}

async function installMrpackArchive(packPath, payload = {}, metadata = {}) {
  const selectedMinecraftVersion = String(payload.minecraftVersion || '1.20.1').trim();
  const selectedLoader = getModrinthLoaderFilter(payload.loader || payload.modLoader || 'fabric');
  const root = getGameRoot();
  ensureDir(root);

  const zip = new AdmZip(packPath);
  const indexEntry = zip.getEntry('modrinth.index.json');
  if (!indexEntry) {
    throw new Error('modrinth.index.json not found in .mrpack.');
  }

  const index = JSON.parse(indexEntry.getData().toString('utf8'));
  const dependencies = index.dependencies && typeof index.dependencies === 'object' ? index.dependencies : {};
  const minecraftVersion = String(dependencies.minecraft || selectedMinecraftVersion || '1.20.1');
  const fabricLoaderVersion = String(dependencies['fabric-loader'] || '');
  const quiltLoaderVersion = String(dependencies['quilt-loader'] || '');
  const forgeVersion = String(dependencies.forge || '');
  const neoforgeVersion = String(dependencies.neoforge || dependencies['neo-forge'] || '');
  const loader = dependencies['fabric-loader']
    ? 'fabric'
    : dependencies['quilt-loader']
      ? 'quilt'
      : (dependencies.neoforge || dependencies['neo-forge'])
        ? 'neoforge'
        : dependencies.forge
          ? 'forge'
          : selectedLoader || 'vanilla';
  const loaderVersion = loader === 'fabric'
    ? fabricLoaderVersion
    : loader === 'quilt'
      ? quiltLoaderVersion
      : loader === 'neoforge'
        ? neoforgeVersion
        : loader === 'forge'
          ? forgeVersion
          : '';
  const files = Array.isArray(index.files) ? index.files : [];
  const installed = [];
  const skipped = [];

  for (const entry of files) {
    if (entry?.env?.client === 'unsupported') {
      skipped.push(normalizeMrpackPath(entry.path));
      continue;
    }
    const downloads = Array.isArray(entry.downloads) ? entry.downloads.filter(Boolean) : [];
    if (!downloads.length) {
      skipped.push(normalizeMrpackPath(entry.path));
      continue;
    }

    const target = getMrpackTargetPath(root, minecraftVersion, entry.path);
    if (!target) {
      skipped.push(normalizeMrpackPath(entry.path));
      continue;
    }

    const downloaded = await downloadVerifiedFile({
      url: downloads[0],
      filename: path.basename(target),
      size: entry.fileSize,
      hashes: entry.hashes || {}
    }, target);
    installed.push(downloaded);
  }

  const overrides = extractMrpackOverrides(zip, root, minecraftVersion);

  return {
    minecraftVersion,
    loader,
    fabricLoaderVersion,
    quiltLoaderVersion,
    forgeVersion,
    neoforgeVersion,
    loaderVersion: loaderVersion || 'latest',
    installed,
    overrides,
    skipped,
    packName: String(index.name || metadata.name || path.basename(packPath, path.extname(packPath))),
    versionNumber: String(index.versionId || metadata.versionNumber || '')
  };
}

async function installModrinthModProject(payload = {}, state = null) {
  const projectId = String(payload.projectId || payload.slug || '').trim();
  const versionId = String(payload.versionId || '').trim();
  const minecraftVersion = String(payload.minecraftVersion || '1.20.1').trim();
  const loader = getModrinthLoaderFilter(payload.loader || payload.modLoader || 'fabric');
  if (!projectId && !versionId) {
    throw new Error('Modrinth project id is required.');
  }
  if (!loader) {
    throw new Error('Selected loader does not support Modrinth client mods.');
  }

  const installState = state || { projects: new Set(), versions: new Set(), installed: [] };
  if (projectId && installState.projects.has(projectId)) {
    return installState;
  }

  const version = await selectModrinthProjectVersion(projectId, {
    versionId,
    minecraftVersion,
    loaders: [loader],
    extension: '.jar'
  });
  if (installState.versions.has(version.id)) {
    return installState;
  }

  if (projectId) installState.projects.add(projectId);
  if (version.project_id) installState.projects.add(String(version.project_id));
  installState.versions.add(version.id);

  const file = selectModrinthVersionFile(version, '.jar');
  if (!file?.url) {
    throw new Error('Selected Modrinth version has no .jar file.');
  }

  const target = path.join(getUserModsPath(minecraftVersion), sanitizeDownloadFileName(file.filename, 'modrinth-mod.jar'));
  const installed = await downloadVerifiedFile(file, target);
  installState.installed.push({
    ...installed,
    projectId: String(version.project_id || projectId),
    versionId: String(version.id || ''),
    versionNumber: String(version.version_number || '')
  });

  const dependencies = Array.isArray(version.dependencies) ? version.dependencies : [];
  for (const dependency of dependencies) {
    if (dependency?.dependency_type !== 'required') continue;
    const dependencyProjectId = String(dependency.project_id || '').trim();
    const dependencyVersionId = String(dependency.version_id || '').trim();
    if (!dependencyProjectId && !dependencyVersionId) continue;

    await installModrinthModProject({
      projectId: dependencyProjectId || projectId,
      versionId: dependencyVersionId || '',
      minecraftVersion,
      loader
    }, installState);
  }

  return installState;
}

async function installModrinthFileProject(payload = {}) {
  const projectType = normalizeModrinthProjectType(payload.type || payload.projectType, 'mod');
  const targetConfig = MODRINTH_FILE_TARGETS[projectType];
  if (!targetConfig) {
    throw new Error(`Unsupported Modrinth project type: ${projectType || 'unknown'}.`);
  }
  if (projectType === 'mod') {
    const state = await installModrinthModProject(payload);
    return {
      type: 'mod',
      minecraftVersion: String(payload.minecraftVersion || '1.20.1').trim(),
      installed: state.installed,
      installedCount: state.installed.length
    };
  }

  const projectId = String(payload.projectId || payload.slug || '').trim();
  const minecraftVersion = String(payload.minecraftVersion || '1.20.1').trim();
  if (!projectId && !payload.versionId) {
    throw new Error('Modrinth project id is required.');
  }

  const version = await selectModrinthProjectVersion(projectId, {
    versionId: payload.versionId,
    minecraftVersion,
    loaders: ['minecraft'],
    extension: targetConfig.extensions
  });
  const file = selectModrinthVersionFile(version, targetConfig.extensions);
  if (!file?.url) {
    throw new Error(`Selected Modrinth version has no ${targetConfig.extensions.join('/')} file.`);
  }

  const root = getGameRoot();
  const target = path.join(root, targetConfig.folder, sanitizeDownloadFileName(file.filename, `modrinth-${projectType}.zip`));
  const installed = await downloadVerifiedFile(file, target);
  return {
    type: projectType,
    minecraftVersion,
    installed: [{
      ...installed,
      projectId: String(version.project_id || projectId),
      versionId: String(version.id || ''),
      versionNumber: String(version.version_number || ''),
      targetFolder: targetConfig.folder
    }],
    installedCount: 1,
    targetFolder: targetConfig.folder
  };
}

async function installModrinthModpackProject(payload = {}) {
  beginImportedInstance();
  const projectId = String(payload.projectId || payload.slug || '').trim();
  const selectedMinecraftVersion = String(payload.minecraftVersion || '1.20.1').trim();
  const selectedLoader = getModrinthLoaderFilter(payload.loader || payload.modLoader || 'fabric');
  if (!projectId) {
    throw new Error('Modrinth project id is required.');
  }

  const version = await selectModrinthProjectVersion(projectId, {
    versionId: payload.versionId,
    minecraftVersion: selectedMinecraftVersion,
    loaders: selectedLoader ? [selectedLoader] : [],
    extension: '.mrpack'
  });
  const file = selectModrinthVersionFile(version, '.mrpack');
  if (!file?.url) {
    throw new Error('Selected Modrinth version has no .mrpack file.');
  }

  const tempDir = path.join(app.getPath('temp'), 'unique-launcher-modrinth', `${Date.now()}-${crypto.randomBytes(4).toString('hex')}`);
  const tempPackPath = path.join(tempDir, sanitizeDownloadFileName(file.filename, 'modrinth-pack.mrpack'));
  const root = getGameRoot();
  ensureDir(tempDir);
  ensureDir(root);

  try {
    await downloadVerifiedFile(file, tempPackPath);
    const zip = new AdmZip(tempPackPath);
    const indexEntry = zip.getEntry('modrinth.index.json');
    if (!indexEntry) {
      throw new Error('modrinth.index.json not found in .mrpack.');
    }

    const index = JSON.parse(indexEntry.getData().toString('utf8'));
    const dependencies = index.dependencies && typeof index.dependencies === 'object' ? index.dependencies : {};
    const minecraftVersion = String(dependencies.minecraft || selectedMinecraftVersion || '1.20.1');
    const fabricLoaderVersion = String(dependencies['fabric-loader'] || '');
    const quiltLoaderVersion = String(dependencies['quilt-loader'] || '');
    const forgeVersion = String(dependencies.forge || '');
    const neoforgeVersion = String(dependencies.neoforge || dependencies['neo-forge'] || '');
    const loader = dependencies['fabric-loader']
      ? 'fabric'
      : dependencies['quilt-loader']
        ? 'quilt'
        : (dependencies.neoforge || dependencies['neo-forge'])
          ? 'neoforge'
          : dependencies.forge
            ? 'forge'
            : selectedLoader || 'vanilla';
    const loaderVersion = loader === 'fabric'
      ? fabricLoaderVersion
      : loader === 'quilt'
        ? quiltLoaderVersion
        : loader === 'neoforge'
          ? neoforgeVersion
          : loader === 'forge'
            ? forgeVersion
            : '';
    const files = Array.isArray(index.files) ? index.files : [];
    const installed = [];
    const skipped = [];

    for (const entry of files) {
      if (entry?.env?.client === 'unsupported') {
        skipped.push(normalizeMrpackPath(entry.path));
        continue;
      }
      const downloads = Array.isArray(entry.downloads) ? entry.downloads.filter(Boolean) : [];
      if (!downloads.length) {
        skipped.push(normalizeMrpackPath(entry.path));
        continue;
      }

      const target = getMrpackTargetPath(root, minecraftVersion, entry.path);
      if (!target) {
        skipped.push(normalizeMrpackPath(entry.path));
        continue;
      }

      const downloaded = await downloadVerifiedFile({
        url: downloads[0],
        filename: path.basename(target),
        size: entry.fileSize,
        hashes: entry.hashes || {}
      }, target);
      installed.push(downloaded);
    }

    const overrides = extractMrpackOverrides(zip, root, minecraftVersion);

    return {
      minecraftVersion,
      loader,
      fabricLoaderVersion,
      quiltLoaderVersion,
      forgeVersion,
      neoforgeVersion,
      loaderVersion: loaderVersion || 'latest',
      installed,
      overrides,
      skipped,
      packName: String(index.name || version.name || projectId),
      versionNumber: String(index.versionId || version.version_number || '')
    };
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

async function importLocalMrpack(payload = {}) {
  beginImportedInstance();
  const filePath = String(payload.filePath || '').trim();
  if (!filePath || !fs.existsSync(filePath) || !filePath.toLowerCase().endsWith('.mrpack')) {
    throw new Error('Select a valid .mrpack file.');
  }
  return installMrpackArchive(filePath, payload, { name: payload.name });
}

async function importModrinthProject(payload = {}) {
  const parsed = parseModrinthProjectRef(payload.ref || payload.url || payload.projectId || payload.slug);
  const projectId = String(payload.projectId || payload.slug || parsed.projectId || '').trim();
  if (!projectId) {
    throw new Error('Enter a Modrinth URL, slug, or project id.');
  }

  const project = await getModrinthProject(projectId);
  const type = normalizeModrinthProjectType(payload.type || parsed.type || project.type, project.type || 'mod');
  if (type === 'modpack') {
    const result = await installModrinthModpackProject({
      ...payload,
      projectId: project.id || projectId,
      slug: project.slug || payload.slug,
      loader: payload.loader
    });
    return { type, project, ...result };
  }

  const result = await installModrinthFileProject({
    ...payload,
    projectId: project.id || projectId,
    slug: project.slug || payload.slug,
    type
  });
  return { type, project, ...result };
}

function copyDirectoryContents(sourceDir, targetDir, filter = () => true) {
  if (!fs.existsSync(sourceDir)) return [];
  ensureDir(targetDir);
  const copied = [];
  for (const entry of fs.readdirSync(sourceDir, { withFileTypes: true })) {
    const source = path.join(sourceDir, entry.name);
    const target = path.join(targetDir, entry.name);
    if (!filter(source, entry)) continue;
    if (entry.isDirectory()) {
      fs.cpSync(source, target, { recursive: true, force: true });
      copied.push(entry.name);
    } else if (entry.isFile()) {
      fs.copyFileSync(source, target);
      copied.push(entry.name);
    }
  }
  return copied;
}

function detectInstanceVersion(sourcePath) {
  const versionsDir = path.join(sourcePath, 'versions');
  if (!fs.existsSync(versionsDir)) return '1.20.1';
  const versions = fs.readdirSync(versionsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .filter(Boolean);
  const vanilla = versions.find((version) => /^\d+\.\d+(\.\d+)?$/.test(version));
  return vanilla || versions[0] || '1.20.1';
}

function detectInstanceLoader(sourcePath) {
  const versionsDir = path.join(sourcePath, 'versions');
  const candidates = [];
  if (fs.existsSync(versionsDir)) {
    candidates.push(...fs.readdirSync(versionsDir, { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name.toLowerCase()));
  }
  const modsDir = path.join(sourcePath, 'mods');
  if (fs.existsSync(modsDir)) {
    candidates.push(...fs.readdirSync(modsDir).map((name) => name.toLowerCase()));
  }
  const joined = candidates.join(' ');
  if (joined.includes('neoforge')) return 'neoforge';
  if (joined.includes('forge')) return 'forge';
  if (joined.includes('quilt')) return 'quilt';
  if (joined.includes('fabric')) return 'fabric';
  return 'vanilla';
}

function importExistingMinecraftBuild(payload = {}) {
  beginImportedInstance();
  const sourcePath = String(payload.sourcePath || '').trim();
  if (!sourcePath || !fs.existsSync(sourcePath) || !fs.statSync(sourcePath).isDirectory()) {
    throw new Error('Select a valid Minecraft instance folder.');
  }

  const minecraftVersion = String(payload.minecraftVersion || detectInstanceVersion(sourcePath) || '1.20.1');
  const loader = normalizeModLoader(payload.loader || detectInstanceLoader(sourcePath));
  const root = getGameRoot();
  ensureDir(root);
  const copied = {
    mods: copyDirectoryContents(path.join(sourcePath, 'mods'), getUserModsPath(minecraftVersion), (source, entry) => entry.isFile() && entry.name.toLowerCase().endsWith('.jar')),
    resourcepacks: copyDirectoryContents(path.join(sourcePath, 'resourcepacks'), path.join(root, 'resourcepacks')),
    shaderpacks: copyDirectoryContents(path.join(sourcePath, 'shaderpacks'), path.join(root, 'shaderpacks')),
    config: copyDirectoryContents(path.join(sourcePath, 'config'), path.join(root, 'config'))
  };

  const instance = upsertBuildInstance(payload.nickname, {
    name: payload.name || path.basename(sourcePath) || `Imported ${minecraftVersion}`,
    minecraftVersion,
    loader,
    source: 'imported'
  }, true);

  return {
    instance,
    copied,
    minecraftVersion,
    loader
  };
}

async function checkApiHealth() {
  if (!UNIQUE_API_URL) {
    return {
      configured: false,
      ok: false,
      primaryUrl: '',
      fallbackUrls: [],
      error: 'UNIQUE_API_URL is not configured.'
    };
  }

  const healthUrl = `${UNIQUE_API_URL}/health`;
  const candidates = getApiRequestCandidates(healthUrl);
  const attempts = [];
  let lastError = null;

  for (const candidate of candidates) {
    const startedAt = Date.now();
    try {
      const body = await requestJsonOnce('GET', candidate, { timeoutMs: 5000 });
      return {
        configured: true,
        ok: true,
        primaryUrl: UNIQUE_API_URL,
        fallbackUrls: UNIQUE_API_FALLBACK_URLS,
        route: candidate.url,
        fallback: candidate.url !== healthUrl,
        latencyMs: Date.now() - startedAt,
        service: body?.service || 'unique-launcher-api',
        attempts
      };
    } catch (err) {
      lastError = err;
      attempts.push({
        route: candidate.url,
        code: err.code || '',
        error: err.message || String(err),
        latencyMs: Date.now() - startedAt
      });
      if (!isNetworkRequestError(err)) {
        break;
      }
    }
  }

  return {
    configured: true,
    ok: false,
    primaryUrl: UNIQUE_API_URL,
    fallbackUrls: UNIQUE_API_FALLBACK_URLS,
    error: lastError?.message || 'API is unreachable.',
    attempts
  };
}

function normalizeModManifest(raw) {
  let source = raw && typeof raw === 'object' ? raw : {};
  if (source.signedPayload) {
    const payload = typeof source.signedPayload === 'string'
      ? JSON.parse(source.signedPayload)
      : source.signedPayload;
    if (!verifyDetachedSignature(payload, source.signature)) {
      throw new Error('Manifest signature verification failed.');
    }
    source = payload;
  } else if (source.signature) {
    const signature = source.signature;
    const unsigned = { ...source };
    delete unsigned.signature;
    if (!verifyDetachedSignature(unsigned, signature)) {
      throw new Error('Manifest signature verification failed.');
    }
  }
  const versions = Array.isArray(source.versions) ? source.versions : [];
  const blockedMods = Array.isArray(source.blockedMods) ? source.blockedMods : [];
  const conflictMods = Array.isArray(source.conflictMods) ? source.conflictMods : [];
  const buildProfiles = Array.isArray(source.buildProfiles) ? source.buildProfiles : [];
  const news = Array.isArray(source.news) ? source.news : [];
  const projects = Array.isArray(source.projects) ? source.projects : [];
  return {
    cdnBaseUrl: String(source.cdnBaseUrl || source.assetBaseUrl || '').trim(),
    blockedMods: blockedMods.map((pattern) => String(pattern || '').trim()).filter(Boolean),
    conflictMods: conflictMods.map((entry) => ({
      pattern: String(entry.pattern || entry || '').trim(),
      versions: Array.isArray(entry.versions) ? entry.versions.map(String) : [],
      reason: String(entry.reason || 'Conflicting user mod').trim()
    })).filter((entry) => entry.pattern),
    projects: projects.map((project) => ({
      id: String(project.id || '').trim(),
      name: String(project.name || project.id || '').trim(),
      description: String(project.description || '').trim(),
      server: project.server && typeof project.server === 'object' ? project.server : null,
      versions: Array.isArray(project.versions) ? project.versions.map(String) : []
    })).filter((project) => project.id && project.name),
    buildProfiles: buildProfiles.map((profile) => ({
      id: String(profile.id || '').trim(),
      name: String(profile.name || profile.id || '').trim(),
      description: String(profile.description || '').trim(),
      memoryMaxMb: Number(profile.memoryMaxMb || 0),
      sodium: profile.sodium !== false
    })).filter((profile) => profile.id && profile.name),
    news: news.map((item) => ({
      id: String(item.id || item.title || '').trim(),
      title: String(item.title || '').trim(),
      body: String(item.body || item.text || '').trim(),
      date: String(item.date || item.createdAt || '').trim(),
      url: String(item.url || '').trim()
    })).filter((item) => item.title),
    versions: versions
      .map((entry) => ({
        id: String(entry.id || entry.minecraftVersion || '').trim(),
        fabricLoaderVersion: String(entry.fabricLoaderVersion || entry.loaderVersion || 'latest').trim() || 'latest',
        server: entry.server && typeof entry.server === 'object' ? entry.server : null,
        useBundledMods: entry.useBundledMods !== false,
        blockedMods: Array.isArray(entry.blockedMods)
          ? entry.blockedMods.map((pattern) => String(pattern || '').trim()).filter(Boolean)
          : [],
        mods: Array.isArray(entry.mods) ? entry.mods.map((mod) => ({
          name: path.basename(String(mod.name || mod.file || '')),
          url: String(mod.url || '').trim(),
          sha256: String(mod.sha256 || mod.hash || '').trim().toLowerCase(),
          required: mod.required !== false,
          profiles: Array.isArray(mod.profiles) ? mod.profiles.map((profile) => String(profile || '').trim()).filter(Boolean) : [],
          signature: String(mod.signature || '').trim(),
          sizeMb: Number(mod.sizeMb || 0)
        })).filter((mod) => mod.name && mod.required) : []
      }))
      .filter((entry) => entry.id)
  };
}

async function getModManifest(force = false) {
  if (!force && modManifestCache && Date.now() - modManifestFetchedAt < REQUIRED_MODS_MANIFEST_TTL_MS) {
    return modManifestCache;
  }

  if (!UNIQUE_MOD_MANIFEST_URL) {
    modManifestCache = {
      cdnBaseUrl: '',
      blockedMods: [],
      conflictMods: [],
      projects: getFallbackProjects(),
      buildProfiles: getFallbackBuildProfiles(),
      news: [],
      versions: FALLBACK_SUPPORTED_VERSIONS.map((id) => ({
        id,
        fabricLoaderVersion: 'latest',
        useBundledMods: true,
        blockedMods: [],
        mods: []
      }))
    };
    modManifestFetchedAt = Date.now();
    return modManifestCache;
  }

  const remote = await requestJson('GET', UNIQUE_MOD_MANIFEST_URL, { timeoutMs: 8000 });
  modManifestCache = normalizeModManifest(remote);
  modManifestFetchedAt = Date.now();
  return modManifestCache;
}

function getFallbackProjects() {
  return [{
    id: 'unique',
    name: 'Minecraft Launcher',
    description: 'Main UNIQUE project',
    server: PROJECT_SERVER,
    versions: FALLBACK_SUPPORTED_VERSIONS
  }];
}

function getFallbackBuildProfiles() {
  return [
    { id: 'lite', name: 'Lite', description: 'Минимум визуальных модов для слабых ПК.', memoryMaxMb: 2048, sodium: true },
    { id: 'normal', name: 'Normal', description: 'Оптимальный профиль для обычной игры.', memoryMaxMb: 4096, sodium: true },
    { id: 'ultra', name: 'Ultra', description: 'Больше памяти и все визуальные улучшения.', memoryMaxMb: 8192, sodium: true }
  ];
}

function modAllowedForProfile(mod, buildProfile) {
  if (!Array.isArray(mod.profiles) || mod.profiles.length === 0) {
    return true;
  }
  return mod.profiles.includes(buildProfile);
}

function parseMinecraftReleaseId(versionId) {
  const match = /^(\d+)\.(\d+)(?:\.(\d+))?$/.exec(String(versionId || '').trim());
  if (!match) return null;

  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3] || 0)
  };
}

function compareMinecraftReleaseIds(left, right) {
  const a = parseMinecraftReleaseId(left);
  const b = parseMinecraftReleaseId(right);
  if (!a || !b) return 0;

  return (a.major - b.major) || (a.minor - b.minor) || (a.patch - b.patch);
}

function isSupportedMinecraftRelease(versionId) {
  return Boolean(parseMinecraftReleaseId(versionId)) && compareMinecraftReleaseIds(versionId, '1.16') >= 0;
}

function uniqueVersionIds(ids) {
  const seen = new Set();
  return ids
    .map((id) => String(id || '').trim())
    .filter((id) => {
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
}

async function getOfficialReleaseVersionsAfter116() {
  const manifest = await requestJson('GET', MOJANG_VERSION_MANIFEST_URL, { timeoutMs: 10000 });
  const versions = Array.isArray(manifest?.versions) ? manifest.versions : [];
  supportedSnapshotVersionsCache = versions
    .filter(entry => entry?.type === 'snapshot' && Date.parse(entry.releaseTime) >= Date.parse('2020-06-23'))
    .map(entry => String(entry.id || '').trim()).filter(Boolean);
  return versions
    .filter((entry) => entry?.type === 'release')
    .map((entry) => String(entry.id || '').trim())
    .filter(isSupportedMinecraftRelease);
}

async function getLauncherContent() {
  const manifest = await getModManifest();
  let news = manifest.news || [];
  if (UNIQUE_NEWS_URL) {
    try {
      const response = await requestJson('GET', UNIQUE_NEWS_URL, { timeoutMs: 5000 });
      if (Array.isArray(response?.news)) {
        news = response.news.map((item) => ({
          id: String(item.id || item.title || '').trim(),
          title: String(item.title || '').trim(),
          body: String(item.body || '').trim(),
          date: String(item.date || item.created_at || '').trim(),
          url: String(item.url || '').trim()
        })).filter((item) => item.title);
      }
    } catch (err) {
      // Manifest news remains the offline fallback.
    }
  }

  const buildProfiles = (manifest.buildProfiles?.length ? manifest.buildProfiles : getFallbackBuildProfiles());
  const projects = (manifest.projects?.length ? manifest.projects : getFallbackProjects());
  return { news, buildProfiles, projects };
}

async function getVersionProfile(minecraftVersion) {
  const manifest = await getModManifest();
  const requested = String(minecraftVersion || '').trim();
  return manifest.versions.find((entry) => entry.id === requested)
    || (requested ? { id: requested, fabricLoaderVersion: 'latest', useBundledMods: false, blockedMods: [], mods: [] } : null)
    || manifest.versions[0]
    || { id: '1.20.1', fabricLoaderVersion: 'latest', useBundledMods: false, blockedMods: [], mods: [] };
}

async function getSupportedVersions() {
  if (supportedVersionsCache && Date.now() - supportedVersionsFetchedAt < SUPPORTED_VERSIONS_TTL_MS) {
    return supportedVersionsCache;
  }

  let manifestIds = [];
  let officialIds = [];

  try {
    const manifest = await getModManifest();
    manifestIds = manifest.versions.map((entry) => entry.id).filter(Boolean);
  } catch (err) {
    manifestIds = [];
  }

  try {
    officialIds = await getOfficialReleaseVersionsAfter116();
  } catch (err) {
    officialIds = [];
  }

  supportedVersionsCache = uniqueVersionIds([
    ...officialIds,
    ...manifestIds.filter(isSupportedMinecraftRelease),
    ...FALLBACK_SUPPORTED_VERSIONS
  ]);
  supportedVersionsFetchedAt = Date.now();
  return supportedVersionsCache;
}

async function getRegisteredServers(projectId = '') {
  if (!UNIQUE_SERVERS_URL) {
    return [PROJECT_SERVER];
  }

  try {
    const url = new URL(UNIQUE_SERVERS_URL);
    if (projectId) {
      url.searchParams.set('projectId', projectId);
    }
    const response = await requestJson('GET', url.toString(), { timeoutMs: 5000 });
    const servers = Array.isArray(response?.servers) ? response.servers : [];
    return servers
      .map((server) => ({
        id: String(server.id || '').trim(),
        projectId: String(server.project_id || server.projectId || '').trim(),
        name: String(server.name || PROJECT_SERVER.name).slice(0, 64),
        host: String(server.host || '').trim(),
        port: Number(server.port || 25565),
        priority: Number(server.priority || 0),
        motd: String(server.motd || '').trim(),
        playerCount: Number(server.player_count ?? server.playerCount ?? 0),
        maxPlayers: Number(server.max_players ?? server.maxPlayers ?? 0),
        tps: server.tps == null ? null : Number(server.tps),
        plugin: true
      }))
      .filter((server) => server.host)
      .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0));
  } catch (err) {
    return [];
  }
}

async function getLauncherPublicConfig() {
  if (!UNIQUE_CLIENT_CONFIG_URL) {
    return {};
  }

  const cacheTtlMs = 10 * 60 * 1000;
  if (launcherPublicConfigCache && Date.now() - launcherPublicConfigFetchedAt < cacheTtlMs) {
    return launcherPublicConfigCache;
  }

  try {
    const body = await requestJson('GET', UNIQUE_CLIENT_CONFIG_URL, { timeoutMs: 5000 });
    launcherPublicConfigCache = body && typeof body === 'object' ? body : {};
    launcherPublicConfigFetchedAt = Date.now();
    return launcherPublicConfigCache;
  } catch (err) {
    return launcherPublicConfigCache || {};
  }
}

async function getSpotifyClientId(profile = null) {
  if (profile?.spotify?.clientId) return String(profile.spotify.clientId).trim();
  if (SPOTIFY_CLIENT_ID) {
    return SPOTIFY_CLIENT_ID;
  }

  const config = await getLauncherPublicConfig();
  const remoteClientId = String(config.spotifyClientId || config.spotify?.clientId || '').trim();
  if (remoteClientId) {
    return remoteClientId;
  }

  try {
    return String(JSON.parse(fs.readFileSync(path.join(__dirname, 'spotify-client.json'), 'utf8')).clientId || '').trim();
  } catch {
    return '';
  }
}

function spotifyAuthHeader(clientId, clientSecret) {
  return `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString('base64')}`;
}

function base64Url(buffer) {
  return Buffer.from(buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function createSpotifyPkcePair() {
  const verifier = base64Url(crypto.randomBytes(64));
  const challenge = base64Url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function isSpotifyCredentialError(err) {
  const code = String(err?.code || '').toLowerCase();
  const message = String(err?.message || '').toLowerCase();
  return code === 'invalid_client'
    || code === 'invalid_request'
    || code === 'invalid_grant'
    || message.includes('invalid_client')
    || message.includes('invalid_request')
    || message.includes('invalid request')
    || message.includes('invalid grant')
    || message.includes('invalid authorization');
}

function clearSpotifyProfile(nickname) {
  const profiles = getProfiles();
  const profile = getUserProfile(nickname);
  profile.spotify = null;
  profiles[nickname] = profile;
  saveProfiles(profiles);
  writeMinecraftMusicStatus(nickname, { connected: false });
  syncRemoteProfile(nickname, {
    spotifyConnected: false,
    music: { nickname, displayText: '', playing: false, updatedAt: Date.now() }
  });
  return sanitizeProfile(profile);
}

function markSpotifyReconnectRequired(err, nickname) {
  err.code = 'SPOTIFY_RECONNECT_REQUIRED';
  err.profile = clearSpotifyProfile(nickname);
  err.message = 'Spotify требует повторной привязки. Нажми «Привязать Spotify» ещё раз.';
  return err;
}

async function requestSpotifyToken(params, options = {}) {
  const clientId = await getSpotifyClientId(options.profile);
  if (!clientId) {
    const err = new Error('Spotify Client ID не настроен. Укажи SPOTIFY_CLIENT_ID в API или локальном .env.');
    err.code = 'SPOTIFY_CLIENT_ID_MISSING';
    throw err;
  }

  const clientSecret = options.clientSecret ?? SPOTIFY_CLIENT_SECRET;
  const usePkce = options.authMode === 'pkce' || !clientSecret;
  const bodyParams = {
    ...params,
    ...(usePkce ? { client_id: clientId } : {})
  };

  return requestJson('POST', 'https://accounts.spotify.com/api/token', {
    headers: {
      ...(usePkce ? {} : { Authorization: spotifyAuthHeader(clientId, clientSecret) }),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: new URLSearchParams(bodyParams).toString()
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

  let token = null;
  try {
    token = await requestSpotifyToken({
      grant_type: 'refresh_token',
      refresh_token: profile.spotify.refreshToken
    }, {
      profile,
      authMode: profile.spotify.authMode || (!SPOTIFY_CLIENT_SECRET ? 'pkce' : 'authorization_code')
    });
  } catch (err) {
    if (isSpotifyCredentialError(err)) {
      markSpotifyReconnectRequired(err, nickname);
    }
    throw err;
  }

  const profiles = getProfiles();
  const nextProfile = getUserProfile(nickname);
  nextProfile.spotify = {
    ...nextProfile.spotify,
    accessToken: token.access_token,
    refreshToken: token.refresh_token || nextProfile.spotify.refreshToken,
    expiresAt: Date.now() + (Number(token.expires_in || 3600) * 1000) - 60000,
    authMode: nextProfile.spotify.authMode || (!SPOTIFY_CLIENT_SECRET ? 'pkce' : 'authorization_code'),
    clientId: nextProfile.spotify.clientId || await getSpotifyClientId(nextProfile)
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
    coverUrl: (body.item.album?.images || body.item.images || []).find((image) => image.url?.startsWith('https://'))?.url || '',
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
  syncRemoteProfile(nickname, {
    music: status
  });
}

async function getSpotifyNowPlaying(nickname) {
  const profile = getUserProfile(nickname);
  if (!profile.spotify?.refreshToken && !profile.spotify?.accessToken) {
    return { connected: false, playing: false, text: 'Spotify не привязан.' };
  }

  const requestNowPlaying = (accessToken) => requestJson('GET', 'https://api.spotify.com/v1/me/player?additional_types=track,episode', {
    headers: { Authorization: `Bearer ${accessToken}` },
    timeoutMs: 3000
  });
  const accessToken = await getSpotifyAccessToken(nickname);
  let body = null;
  try {
    body = await requestNowPlaying(accessToken);
  } catch (err) {
    if (err.statusCode === 401 && profile.spotify?.refreshToken) {
      body = await requestNowPlaying(await refreshSpotifyToken(nickname, getUserProfile(nickname)));
    } else {
      if (isSpotifyCredentialError(err)) {
        markSpotifyReconnectRequired(err, nickname);
      }
      throw err;
    }
  }

  return { connected: true, ...formatSpotifyNowPlaying(body) };
}

function finishSpotifyAuth(flow, result) {
  if (flow.finished) return;
  flow.finished = true;
  clearTimeout(flow.timer);
  if (flow.server.listening) flow.server.close();
  flow.resolve(result);
}

async function connectSpotify(nickname) {
  const clientId = await getSpotifyClientId(getUserProfile(nickname));
  if (!clientId) {
    return {
      success: false,
      error: 'Spotify Client ID не настроен. Добавьте SPOTIFY_CLIENT_ID в .env и пересоберите лаунчер.'
    };
  }

  const redirectUrl = new URL(SPOTIFY_REDIRECT_URI);
  if (redirectUrl.protocol !== 'http:' || !['127.0.0.1', '[::1]'].includes(redirectUrl.hostname) || !redirectUrl.port || redirectUrl.username || redirectUrl.password || redirectUrl.search || redirectUrl.hash) {
    return { success: false, error: 'Для Spotify нужен локальный callback, например http://127.0.0.1:48128/spotify/callback. Зарегистрируйте тот же адрес в Spotify Dashboard.' };
  }
  if (spotifyAuthFlow) finishSpotifyAuth(spotifyAuthFlow, { success: false, error: 'Привязка Spotify отменена.' });

  const state = crypto.randomBytes(18).toString('hex');
  const pkce = createSpotifyPkcePair();
  const authUrl = new URL('https://accounts.spotify.com/authorize');
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('scope', SPOTIFY_SCOPES.join(' '));
  authUrl.searchParams.set('redirect_uri', SPOTIFY_REDIRECT_URI);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('code_challenge', pkce.challenge);

  const flow = { id: crypto.randomBytes(18).toString('hex'), nickname, finished: false, processing: false };
  flow.completion = new Promise(resolve => { flow.resolve = resolve; });
  spotifyAuthFlow = flow;
  flow.server = http.createServer(async (request, response) => {
      const reply = (status, code) => sendAuthCallback(response, { provider: 'Spotify', status, code, language: getSettings(nickname).language });
      const requestUrl = new URL(request.url, SPOTIFY_REDIRECT_URI);
      if (requestUrl.pathname !== redirectUrl.pathname) {
        reply('notfound', 404);
        return;
      }

      if (requestUrl.searchParams.get('state') !== state) {
        reply('invalid', 400);
        return;
      }

      if (flow.finished || flow.processing) {
        reply('handled', 409);
        return;
      }
      const oauthError = requestUrl.searchParams.get('error');
      if (oauthError) {
        reply('denied', 400);
        finishSpotifyAuth(flow, { success: false, error: oauthError === 'access_denied' ? 'Доступ Spotify не разрешён. Нажмите «Привязать Spotify», чтобы повторить.' : `Spotify: ${oauthError}` });
        return;
      }
      const code = requestUrl.searchParams.get('code');
      if (!code) {
        reply('missing', 400);
        finishSpotifyAuth(flow, { success: false, error: 'Spotify не вернул код авторизации.' });
        return;
      }

      flow.processing = true;
      try {
        const token = await requestSpotifyToken({
          grant_type: 'authorization_code',
          code,
          redirect_uri: SPOTIFY_REDIRECT_URI,
          code_verifier: pkce.verifier
        }, {
          authMode: 'pkce',
          clientSecret: '',
          profile: { spotify: { clientId } }
        });
        if (!token.access_token || !token.refresh_token) throw new Error('Spotify не вернул токены. Повторите привязку.');
        const spotifyUser = await getSpotifyUser(token.access_token);
        if (flow.finished) {
          reply('expired', 410);
          return;
        }
        const profiles = getProfiles();
        const profile = getUserProfile(nickname);
        profile.spotify = {
          accessToken: token.access_token,
          refreshToken: token.refresh_token,
          expiresAt: Date.now() + (Number(token.expires_in || 3600) * 1000) - 60000,
          authMode: 'pkce',
          clientId,
          displayName: spotifyUser.display_name || spotifyUser.id || 'Spotify'
        };
        profiles[nickname] = profile;
        saveProfiles(profiles);
        syncRemoteProfile(nickname, {
          spotifyConnected: true,
          spotifyDisplayName: profile.spotify.displayName
        });

        reply('success', 200);
        finishSpotifyAuth(flow, { success: true, profile: sanitizeProfile(profile) });
      } catch (err) {
        reply('failed', 500);
        const error = isSpotifyCredentialError(err)
          ? `Spotify вернул ${err.code || 'invalid_request'}. Проверь callback в Spotify Dashboard: ${SPOTIFY_REDIRECT_URI}`
          : (err.message || String(err));
        finishSpotifyAuth(flow, { success: false, error });
      }
    });

  flow.timer = setTimeout(() => {
    finishSpotifyAuth(flow, { success: false, error: 'Spotify не ответил за 2 минуты. Повторите привязку.' });
    if (spotifyAuthFlow === flow) spotifyAuthFlow = null;
  }, 120000);
  flow.server.on('error', err => finishSpotifyAuth(flow, { success: false, error: `Не удалось открыть callback Spotify (${SPOTIFY_REDIRECT_URI}): ${err.message}` }));
  try {
    await new Promise((resolve, reject) => {
      flow.server.once('listening', resolve);
      flow.server.once('error', reject);
      flow.server.listen(Number(redirectUrl.port), redirectUrl.hostname.replace(/^\[|\]$/g, ''));
    });
    return { success: true, flowId: flow.id, authorizationUrl: authUrl.toString() };
  } catch (err) {
    finishSpotifyAuth(flow, { success: false, error: err.message });
    if (spotifyAuthFlow === flow) spotifyAuthFlow = null;
    return { success: false, error: err.code === 'EADDRINUSE' ? 'Порт Spotify занят. Завершите другую привязку или перезапустите лаунчер.' : err.message };
  }
}

async function completeSpotifyAuth(nickname, flowId) {
  const flow = spotifyAuthFlow;
  if (!flow || flow.nickname !== nickname || flow.id !== flowId) {
    return { success: false, error: 'Привязка Spotify истекла. Попробуйте ещё раз.' };
  }
  const result = await flow.completion;
  if (spotifyAuthFlow === flow) spotifyAuthFlow = null;
  return result;
}

function cancelSpotifyAuth(nickname, flowId) {
  const flow = spotifyAuthFlow;
  if (flow && flow.nickname === nickname && (!flowId || flow.id === flowId)) {
    finishSpotifyAuth(flow, { success: false, error: 'Привязка Spotify отменена.' });
    spotifyAuthFlow = null;
  }
  return { success: true };
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

let discordPresence;
function getDiscordService() {
  return discordPresence ||= new DiscordPresence({ clientId: DISCORD_CLIENT_ID, launcherName: LAUNCHER_NAME, getUserProfile, getDiscordButtons, store, sessionKey: SESSION_KEY, withTimeout });
}
function disconnectDiscordRpc(...args) { return getDiscordService().disconnectDiscordRpc(...args); }
function ensureDiscordRpc(...args) { return getDiscordService().ensureDiscordRpc(...args); }
function updateDiscordRpc(...args) { return getDiscordService().updateDiscordRpc(...args); }
function startPlayingDiscordRpc(...args) { return getDiscordService().startPlayingDiscordRpc(...args); }
function setLauncherDiscordRpc(...args) { return getDiscordService().setLauncherDiscordRpc(...args); }
function stopPlayingDiscordRpc(...args) { return getDiscordService().stopPlayingDiscordRpc(...args); }

function readJarModsFromDir(modsPath) {
  ensureDir(modsPath);
  return fs.readdirSync(modsPath)
    .filter((file) => {
      const lower = file.toLowerCase();
      return lower.endsWith('.jar') || lower.endsWith('.jar.disabled');
    })
    .map((file) => {
      const fullPath = path.join(modsPath, file);
      const stat = fs.statSync(fullPath);
      const enabled = !file.toLowerCase().endsWith('.disabled');

      return {
        name: file,
        baseName: enabled ? file : file.slice(0, -'.disabled'.length),
        enabled,
        sizeMb: Number((stat.size / 1024 / 1024).toFixed(2)),
        modified: stat.mtime.toISOString(),
        ...localModMetadata.read(fullPath, stat),
        // Hashes are computed during integrity checks, not UI refreshes.
      };
    });
}

async function listModsFromWorkspace(minecraftVersion = '1.20.1', buildProfile = 'normal') {
  const userModsPath = getUserModsPath(minecraftVersion);
  const userMods = readJarModsFromDir(userModsPath).map((mod) => ({ ...mod, source: 'user' }));

  return userMods;
}

function resolveUserModPath(minecraftVersion, fileName) {
  const modsPath = getUserModsPath(minecraftVersion);
  ensureDir(modsPath);
  const safeName = sanitizeDownloadFileName(fileName, '');
  if (!safeName) return null;
  const lower = safeName.toLowerCase();
  if (!lower.endsWith('.jar') && !lower.endsWith('.jar.disabled')) return null;
  return safeJoinPath(modsPath, safeName);
}

function setUserModEnabled(minecraftVersion, fileName, enabled) {
  if (activeLaunches.size) throw new Error('Сначала закройте Minecraft.');
  const sourcePath = resolveUserModPath(minecraftVersion, fileName);
  if (!sourcePath || !fs.existsSync(sourcePath)) {
    throw new Error('Mod file was not found.');
  }

  const currentlyDisabled = sourcePath.toLowerCase().endsWith('.disabled');
  if (enabled && currentlyDisabled) {
    const targetPath = sourcePath.slice(0, -'.disabled'.length);
    if (fs.existsSync(targetPath)) {
      backupExistingFile(targetPath, 'reenabled-mod');
    }
    fs.renameSync(sourcePath, targetPath);
    return { name: path.basename(targetPath), enabled: true };
  }

  if (!enabled && !currentlyDisabled) {
    const targetPath = `${sourcePath}.disabled`;
    if (fs.existsSync(targetPath)) {
      fs.rmSync(targetPath, { force: true });
    }
    fs.renameSync(sourcePath, targetPath);
    const gameModPath = path.join(getGameRoot(), 'mods', path.basename(sourcePath));
    if (fs.existsSync(gameModPath)) {
      fs.rmSync(gameModPath, { force: true });
    }
    return { name: path.basename(targetPath), enabled: false };
  }

  return { name: path.basename(sourcePath), enabled: !currentlyDisabled };
}

function scheduleUserModDelete(minecraftVersion, fileName) {
  if (activeLaunches.size) throw new Error('Сначала закройте Minecraft.');
  const targetPath = resolveUserModPath(minecraftVersion, fileName);
  if (!targetPath || !fs.existsSync(targetPath)) {
    throw new Error('Mod file was not found.');
  }

  const token = crypto.randomBytes(12).toString('hex');
  const trash = path.join(path.dirname(targetPath), '.trash');
  ensureDir(trash);
  const removedPath = path.join(trash, token);
  fs.renameSync(targetPath, removedPath);
  const entry = {
    token,
    path: removedPath,
    originalPath: targetPath,
    createdAt: Date.now(),
    timer: null
  };
  entry.timer = setTimeout(() => { try { finalizePendingUserModDelete(token); } catch (error) { console.error('Pending mod cleanup failed:', error.code); } }, 5000);
  pendingUserModDeletes.set(token, entry);
  return { token, name: path.basename(targetPath), deleteAt: entry.createdAt + 5000 };
}

function undoUserModDelete(token) {
  const entry = pendingUserModDeletes.get(String(token || ''));
  if (!entry) return false;
  if (fs.existsSync(entry.originalPath)) throw new Error('Файл уже существует, он не был перезаписан.');
  fs.renameSync(entry.path, entry.originalPath);
  clearTimeout(entry.timer);
  pendingUserModDeletes.delete(entry.token);
  return true;
}

function finalizePendingUserModDelete(token) {
  const entry = pendingUserModDeletes.get(String(token || ''));
  if (!entry) return false;
  clearTimeout(entry.timer);
  pendingUserModDeletes.delete(entry.token);
  if (fs.existsSync(entry.path)) {
    fs.rmSync(entry.path, { force: true });
  }
  return true;
}

function finalizeAllPendingUserModDeletes() {
  for (const token of [...pendingUserModDeletes.keys()]) {
    finalizePendingUserModDelete(token);
  }
}

function createModBlockMatcher(patterns = []) {
  const matchers = patterns
    .map((pattern) => String(pattern || '').trim().toLowerCase())
    .filter(Boolean)
    .map((pattern) => {
      const escaped = pattern
        .replace(/[.+^${}()|[\]\\]/g, '\\$&')
        .replace(/\*/g, '.*')
        .replace(/\?/g, '.');
      return new RegExp(`^${escaped}$`, 'i');
    });

  return (fileName) => matchers.some((matcher) => matcher.test(fileName));
}

function createModPolicyChecker(manifest, versionProfile) {
  const blockedPatterns = [
    ...(manifest.blockedMods || []),
    ...(versionProfile.blockedMods || [])
  ];
  const isBlocked = createModBlockMatcher(blockedPatterns);
  const conflictEntries = manifest.conflictMods || [];

  return (fileName) => {
    const lowerName = String(fileName || '').toLowerCase();
    if (isBlocked(lowerName)) {
      return { type: 'blocked', message: fileName };
    }

    for (const conflict of conflictEntries) {
      if (!conflict.pattern) continue;
      const appliesToVersion = !conflict.versions?.length || conflict.versions.includes(versionProfile.id);
      if (appliesToVersion && createModBlockMatcher([conflict.pattern])(lowerName)) {
        return { type: 'conflict', message: `${fileName}: ${conflict.reason}` };
      }
    }

    return null;
  };
}

function removeManagedMod(targetDir, file, reason) {
  const target = path.join(targetDir, file);
  if (!fs.existsSync(target)) {
    return false;
  }

  backupExistingFile(target, reason);
  fs.rmSync(target, { force: true });
  return true;
}

async function syncRequiredModsToGameRoot(root, versionProfile, buildProfile = 'normal', onProgress = null) {
  const sourceDir = getWorkspaceModsPath();
  const targetDir = path.join(root, 'mods');
  ensureDir(sourceDir);
  ensureDir(targetDir);

  const manifest = await getModManifest();
  const getPolicyIssue = createModPolicyChecker(manifest, versionProfile);
  const useBundledMods = versionProfile.useBundledMods !== false;

  for (const file of fs.readdirSync(targetDir)) {
    if (file.endsWith('.download') || file.endsWith('.tmp')) {
      fs.rmSync(path.join(targetDir, file), { force: true });
    }
  }

  const copied = [];
  if (!useBundledMods) {
    for (const file of fs.readdirSync(sourceDir)) {
      if (file.toLowerCase().endsWith('.jar')) {
        removeManagedMod(targetDir, file, 'other-minecraft-version');
      }
    }
  }

  if (useBundledMods) {
  for (const file of fs.readdirSync(sourceDir)) {
    if (!file.toLowerCase().endsWith('.jar')) continue;

    const issue = getPolicyIssue(file);
    if (issue) {
      removeManagedMod(targetDir, file, 'incompatible-managed-mod');
      continue;
    }

    const source = path.join(sourceDir, file);
    const target = path.join(targetDir, file);
    const shouldCopy = !fs.existsSync(target)
      || sha256File(source).toLowerCase() !== sha256File(target).toLowerCase()
      || fs.statSync(source).mtimeMs > fs.statSync(target).mtimeMs
      || fs.statSync(source).size !== fs.statSync(target).size;

    if (shouldCopy) {
      fs.copyFileSync(source, target);
      copied.push(file);
    }
  }
  }

  for (const mod of (versionProfile.mods || []).filter((entry) => modAllowedForProfile(entry, buildProfile))) {
    if (!mod.name || !mod.url) continue;
    const issue = getPolicyIssue(mod.name);
    if (issue) {
      throw new Error(`Required mod is blocked by manifest policy: ${issue.message}`);
    }

    const target = path.join(targetDir, mod.name);
    const valid = fs.existsSync(target)
      && (!mod.sha256 || sha256File(target).toLowerCase() === mod.sha256)
      && verifyModSignature(mod, target);
    if (!valid) {
      const backup = backupExistingFile(target, 'mod');
      await downloadFile(mod.url, target, (progress) => {
        if (onProgress) onProgress({ mod: mod.name, ...progress });
      });
      if (mod.sha256 && sha256File(target).toLowerCase() !== mod.sha256) {
        fs.rmSync(target, { force: true });
        if (backup) fs.copyFileSync(backup, target);
        throw new Error(`Required mod hash mismatch: ${mod.name}`);
      }
      if (!verifyModSignature(mod, target)) {
        fs.rmSync(target, { force: true });
        if (backup) fs.copyFileSync(backup, target);
        throw new Error(`Required mod signature mismatch: ${mod.name}`);
      }
      copied.push(mod.name);
    }
  }

  return copied;
}

async function enforceModIntegrity(root, versionProfile, buildProfile = 'normal') {
  const targetDir = path.join(root, 'mods');
  ensureDir(targetDir);

  const manifest = await getModManifest();
  const getPolicyIssue = createModPolicyChecker(manifest, versionProfile);
  const sourceDir = getWorkspaceModsPath();
  const bundledMods = versionProfile.useBundledMods === false ? [] : readJarModsFromDir(sourceDir).map((mod) => mod.name.toLowerCase());
  const managedNames = new Set([
    ...bundledMods,
    ...(versionProfile.mods || [])
      .filter((entry) => modAllowedForProfile(entry, buildProfile))
      .map((mod) => String(mod.name || '').toLowerCase())
      .filter(Boolean)
  ]);
  const blocked = [];
  const conflicts = [];

  for (const file of fs.readdirSync(targetDir)) {
    if (!file.toLowerCase().endsWith('.jar')) continue;
    const issue = getPolicyIssue(file);
    if (!issue) {
      continue;
    }

    if (managedNames.has(file.toLowerCase())) {
      removeManagedMod(targetDir, file, issue.type === 'blocked' ? 'blocked-managed-mod' : 'conflicting-managed-mod');
      continue;
    }

    if (issue.type === 'blocked') {
      blocked.push(issue.message);
    } else {
      conflicts.push(issue.message);
    }
  }

  if (blocked.length > 0) {
    throw new Error(`Blocked mods detected: ${blocked.join(', ')}`);
  }
  if (conflicts.length > 0) {
    throw new Error(`Conflicting user mods detected: ${conflicts.join('; ')}`);
  }

  for (const mod of (versionProfile.mods || []).filter((entry) => modAllowedForProfile(entry, buildProfile))) {
    if (!mod.name || !mod.sha256) continue;
    const target = path.join(targetDir, mod.name);
    if (fs.existsSync(target) && sha256File(target).toLowerCase() !== mod.sha256) {
      backupExistingFile(target, 'tampered');
      fs.rmSync(target, { force: true });
      throw new Error(`Required mod was changed and has been removed: ${mod.name}`);
    }
    if (fs.existsSync(target) && !verifyModSignature(mod, target)) {
      backupExistingFile(target, 'bad-signature');
      fs.rmSync(target, { force: true });
      throw new Error(`Required mod signature mismatch: ${mod.name}`);
    }
  }
}

function syncUserModsToGameRoot(root, minecraftVersion) {
  const sourceDir = getUserModsPath(minecraftVersion);
  const targetDir = path.join(root, 'mods');
  if (path.resolve(sourceDir) === path.resolve(targetDir)) return [];
  ensureDir(sourceDir);
  ensureDir(targetDir);

  const copied = [];
  const disabledBaseNames = new Set();
  for (const file of fs.readdirSync(sourceDir)) {
    const lower = file.toLowerCase();
    if (lower.endsWith('.jar.disabled')) {
      disabledBaseNames.add(file.slice(0, -'.disabled'.length).toLowerCase());
      continue;
    }
    if (!lower.endsWith('.jar')) continue;

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

  for (const file of fs.readdirSync(targetDir)) {
    if (disabledBaseNames.has(file.toLowerCase())) {
      fs.rmSync(path.join(targetDir, file), { force: true });
    }
  }

  return copied;
}

function removeProjectManagedMods(root, versionProfile) {
  const targetDir = path.join(root, 'mods');
  ensureDir(targetDir);

  const removed = [];
  const names = new Set([
    ...readJarModsFromDir(getWorkspaceModsPath()).map((mod) => mod.name.toLowerCase()),
    ...(versionProfile.mods || []).map((mod) => String(mod.name || '').toLowerCase()).filter(Boolean)
  ]);

  for (const file of fs.readdirSync(targetDir)) {
    if (!file.toLowerCase().endsWith('.jar')) continue;
    if (!names.has(file.toLowerCase())) continue;

    removeManagedMod(targetDir, file, 'unique-mods-disabled');
    removed.push(file);
  }

  return removed;
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

function nbtString(name, value) {
  const nameBuffer = Buffer.from(name, 'utf8');
  const valueBuffer = Buffer.from(String(value), 'utf8');
  const header = Buffer.alloc(1 + 2 + nameBuffer.length + 2);
  let offset = 0;
  header.writeUInt8(8, offset); offset += 1;
  header.writeUInt16BE(nameBuffer.length, offset); offset += 2;
  nameBuffer.copy(header, offset); offset += nameBuffer.length;
  header.writeUInt16BE(valueBuffer.length, offset);
  return Buffer.concat([header, valueBuffer]);
}

function nbtByte(name, value) {
  const nameBuffer = Buffer.from(name, 'utf8');
  const buffer = Buffer.alloc(1 + 2 + nameBuffer.length + 1);
  let offset = 0;
  buffer.writeUInt8(1, offset); offset += 1;
  buffer.writeUInt16BE(nameBuffer.length, offset); offset += 2;
  nameBuffer.copy(buffer, offset); offset += nameBuffer.length;
  buffer.writeUInt8(value ? 1 : 0, offset);
  return buffer;
}

function readNbtString(buffer, offset) {
  const length = buffer.readUInt16BE(offset);
  const start = offset + 2;
  return {
    value: buffer.subarray(start, start + length).toString('utf8'),
    offset: start + length
  };
}

function readNbtPayload(buffer, offset, type) {
  if (type === 1) return { value: buffer.readInt8(offset), offset: offset + 1 };
  if (type === 2) return { value: buffer.readInt16BE(offset), offset: offset + 2 };
  if (type === 3) return { value: buffer.readInt32BE(offset), offset: offset + 4 };
  if (type === 4) return { value: Number(buffer.readBigInt64BE(offset)), offset: offset + 8 };
  if (type === 5) return { value: buffer.readFloatBE(offset), offset: offset + 4 };
  if (type === 6) return { value: buffer.readDoubleBE(offset), offset: offset + 8 };
  if (type === 7) {
    const length = buffer.readInt32BE(offset);
    return { value: buffer.subarray(offset + 4, offset + 4 + length), offset: offset + 4 + length };
  }
  if (type === 8) return readNbtString(buffer, offset);
  if (type === 9) {
    const childType = buffer.readUInt8(offset);
    const length = buffer.readInt32BE(offset + 1);
    let current = offset + 5;
    const value = [];
    for (let index = 0; index < length; index += 1) {
      const child = readNbtPayload(buffer, current, childType);
      value.push(child.value);
      current = child.offset;
    }
    return { value, offset: current };
  }
  if (type === 10) {
    const value = {};
    let current = offset;
    while (current < buffer.length) {
      const childType = buffer.readUInt8(current);
      current += 1;
      if (childType === 0) break;
      const name = readNbtString(buffer, current);
      current = name.offset;
      const child = readNbtPayload(buffer, current, childType);
      value[name.value] = child.value;
      current = child.offset;
    }
    return { value, offset: current };
  }
  if (type === 11) {
    const length = buffer.readInt32BE(offset);
    return { value: [], offset: offset + 4 + (length * 4) };
  }
  if (type === 12) {
    const length = buffer.readInt32BE(offset);
    return { value: [], offset: offset + 4 + (length * 8) };
  }
  throw new Error(`Unsupported NBT tag: ${type}`);
}

function readServersDat(root) {
  const serversPath = path.join(root, 'servers.dat');
  if (!fs.existsSync(serversPath)) return [];
  try {
    const buffer = fs.readFileSync(serversPath);
    if (buffer.length < 4 || buffer.readUInt8(0) !== 10) return [];
    const rootName = readNbtString(buffer, 1);
    const rootPayload = readNbtPayload(buffer, rootName.offset, 10).value;
    const servers = Array.isArray(rootPayload.servers) ? rootPayload.servers : [];
    return servers
      .map((server) => ({
        name: String(server.name || '').trim(),
        ip: String(server.ip || '').trim(),
        acceptTextures: server.acceptTextures === undefined ? 1 : Number(server.acceptTextures),
        uniqueManaged: Boolean(server.uniqueManaged)
      }))
      .filter((server) => server.ip);
  } catch (err) {
    return [];
  }
}

function serverAddress(server) {
  return `${server.host}${Number(server.port || 25565) === 25565 ? '' : `:${Number(server.port)}`}`;
}

function normalizeServerForDat(server, managed = false) {
  const ip = server.ip || serverAddress(server);
  return {
    name: server.name || PROJECT_SERVER.name,
    ip,
    acceptTextures: server.acceptTextures === undefined ? 1 : Number(server.acceptTextures),
    uniqueManaged: managed || Boolean(server.uniqueManaged)
  };
}

function writeServersDat(root, servers, options = {}) {
  const managedServers = servers
    .filter((server) => server?.host)
    .sort((a, b) => Number(b.priority || 0) - Number(a.priority || 0))
    .map((server) => normalizeServerForDat(server, true));
  const existingUserServers = options.preserveExisting === false
    ? []
    : readServersDat(root).filter((server) => !server.uniqueManaged);
  const seen = new Set();
  const normalized = [];
  for (const server of [...managedServers, ...existingUserServers]) {
    const key = String(server.ip || '').trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    normalized.push(server);
  }

  const serversPath = path.join(root, 'servers.dat');
  if (fs.existsSync(serversPath) && !fs.existsSync(`${serversPath}.unique-backup`)) {
    fs.copyFileSync(serversPath, `${serversPath}.unique-backup`);
  }

  const rootName = Buffer.alloc(2);
  const listName = Buffer.from('servers', 'utf8');
  const listHeader = Buffer.alloc(1 + 2 + listName.length + 1 + 4);
  let offset = 0;
  listHeader.writeUInt8(9, offset); offset += 1;
  listHeader.writeUInt16BE(listName.length, offset); offset += 2;
  listName.copy(listHeader, offset); offset += listName.length;
  listHeader.writeUInt8(10, offset); offset += 1;
  listHeader.writeInt32BE(normalized.length, offset);

  const compounds = normalized.map((server) => Buffer.concat([
    nbtString('name', server.name),
    nbtString('ip', server.ip),
    nbtByte('acceptTextures', server.acceptTextures === 0 ? 0 : 1),
    nbtByte('uniqueManaged', server.uniqueManaged ? 1 : 0),
    Buffer.from([0])
  ]));

  const nbtRoot = Buffer.concat([Buffer.from([10]), rootName, listHeader, ...compounds, Buffer.from([0])]);
  fs.writeFileSync(serversPath, nbtRoot);
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
    apiUrl: UNIQUE_API_URL || null,
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

let loaderService = null;

async function ensureSelectedLoaderVersion(root, settings) {
  if (!loaderService) {
    const { createLoaderService } = require('./lib/loader-service');
    loaderService = createLoaderService({
      fs,
      path,
      os,
      AdmZip,
      launcher,
      getJson,
      getText,
      downloadFile,
      ensureDir,
      hashFile,
      normalizeModLoader,
      parseMinecraftReleaseId,
      FABRIC_META_URL,
      QUILT_META_URL,
      FORGE_MAVEN_URL,
      NEOFORGE_MAVEN_URL
    });
  }
  return loaderService.ensureSelectedLoaderVersion(root, settings);
}
function getOsName() {
  if (process.platform === 'win32') return 'windows';
  if (process.platform === 'darwin') return 'osx';
  return 'linux';
}

function createSession(nickname, persist = false, extra = {}) {
  const token = crypto.randomBytes(32).toString('hex');
  const session = {
    nickname,
    createdAt: Date.now(),
    ...extra
  };

  activeSessions.set(token, session);

  if (persist) {
    store.set(SESSION_KEY, {
      nickname,
      sessionToken: token,
      createdAt: session.createdAt,
      ...extra
    });
  }

  return token;
}

function formEncode(values = {}) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null) {
      params.set(key, String(value));
    }
  }
  return params.toString();
}

async function microsoftPostJson(url, body) {
  try {
    return await requestJson('POST', url, {
      timeoutMs: 15000,
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    });
  } catch (err) {
    const response = err?.responseBody || {};
    const endpoint = new URL(url);
    const detail = response.Message || response.message || response.error_description || response.error?.message || err?.message || 'request failed';
    const xerr = response.XErr || response.xerr || '';
    if (endpoint.hostname === 'api.minecraftservices.com'
      && endpoint.pathname === '/authentication/login_with_xbox'
      && err?.statusCode === 403) {
      throw new Error('Minecraft Services отклонил регистрацию приложения (HTTP 403). Client ID должен быть разрешён Minecraft/Xbox для этого API; настройка callback или лицензия игрока это не исправит. Подробнее: https://aka.ms/AppRegInfo');
    }
    throw new Error(`Microsoft/Xbox request to ${endpoint.hostname} failed: ${detail}${xerr ? ` (Xbox XErr ${xerr})` : ''}`);
  }
}

function createMicrosoftPkcePair() {
  const verifier = base64Url(crypto.randomBytes(64));
  const challenge = base64Url(crypto.createHash('sha256').update(verifier).digest());
  return { verifier, challenge };
}

function closeMicrosoftAuthServer() {
  if (microsoftAuthServer) {
    microsoftAuthServer.close();
    microsoftAuthServer = null;
  }
}

function finishMicrosoftAuthFlow(flowId, result) {
  const flow = microsoftAuthFlows.get(flowId);
  if (!flow || flow.finished) return;
  flow.finished = true;
  clearTimeout(flow.timer);
  closeMicrosoftAuthServer();
  flow.resolve(result);
}

async function startMicrosoftDeviceFlow() {
  if (!MICROSOFT_CLIENT_ID) {
    throw new Error('MICROSOFT_CLIENT_ID is not configured.');
  }

  const redirectUrl = new URL(MICROSOFT_REDIRECT_URI);
  if (redirectUrl.protocol !== 'http:' || redirectUrl.hostname !== 'localhost' || redirectUrl.port !== '53682' || redirectUrl.pathname !== '/callback') {
    throw new Error('MICROSOFT_REDIRECT_URI must be http://localhost:53682/callback.');
  }

  for (const [oldFlowId] of microsoftAuthFlows) {
    finishMicrosoftAuthFlow(oldFlowId, { error: new Error('Microsoft login was restarted.') });
  }

  const flowId = crypto.randomBytes(16).toString('hex');
  const state = crypto.randomBytes(24).toString('hex');
  const pkce = createMicrosoftPkcePair();
  let resolveFlow;
  const completion = new Promise((resolve) => { resolveFlow = resolve; });
  const flow = {
    state,
    verifier: pkce.verifier,
    completion,
    resolve: resolveFlow,
    finished: false,
    timer: null
  };
  microsoftAuthFlows.set(flowId, flow);

  const authUrl = new URL(MICROSOFT_AUTHORIZE_URL);
  authUrl.searchParams.set('client_id', MICROSOFT_CLIENT_ID);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('redirect_uri', MICROSOFT_REDIRECT_URI);
  authUrl.searchParams.set('response_mode', 'query');
  authUrl.searchParams.set('scope', MICROSOFT_OAUTH_SCOPE);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('code_challenge', pkce.challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  authUrl.searchParams.set('prompt', 'select_account');

  flow.timer = setTimeout(() => {
    finishMicrosoftAuthFlow(flowId, { error: new Error('Microsoft login timed out. Please try again.') });
  }, 5 * 60 * 1000);

  microsoftAuthServer = http.createServer(async (request, response) => {
    const reply = (status, code) => sendAuthCallback(response, { provider: 'Microsoft', status, code, language: getSettings().language });
    const requestUrl = new URL(request.url, MICROSOFT_REDIRECT_URI);
    if (requestUrl.pathname !== redirectUrl.pathname) {
      reply('notfound', 404);
      return;
    }

    if (requestUrl.searchParams.get('state') !== state) {
      reply('invalid', 400);
      return;
    }

    const oauthError = requestUrl.searchParams.get('error');
    if (oauthError) {
      reply('denied', 400);
      finishMicrosoftAuthFlow(flowId, { error: new Error(requestUrl.searchParams.get('error_description') || oauthError) });
      return;
    }

    const code = requestUrl.searchParams.get('code');
    if (!code) {
      reply('missing', 400);
      finishMicrosoftAuthFlow(flowId, { error: new Error('Microsoft did not return an authorization code.') });
      return;
    }

    try {
      const token = await requestJson('POST', MICROSOFT_TOKEN_URL, {
        timeoutMs: 12000,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
        body: formEncode({
          grant_type: 'authorization_code',
          client_id: MICROSOFT_CLIENT_ID,
          code,
          redirect_uri: MICROSOFT_REDIRECT_URI,
          scope: MICROSOFT_OAUTH_SCOPE,
          code_verifier: pkce.verifier
        })
      });
      reply('success', 200);
      finishMicrosoftAuthFlow(flowId, { token });
    } catch (err) {
      reply('failed', 500);
      finishMicrosoftAuthFlow(flowId, { error: err });
    }
  });

  microsoftAuthServer.once('error', (err) => {
    finishMicrosoftAuthFlow(flowId, { error: new Error(`Cannot listen on ${MICROSOFT_REDIRECT_URI}: ${err.message || err}`) });
  });
  await new Promise((resolve, reject) => {
    microsoftAuthServer.once('listening', resolve);
    microsoftAuthServer.once('error', reject);
    // Do not pin this to one localhost address: browsers may choose either IPv4 or IPv6.
    microsoftAuthServer.listen(Number(redirectUrl.port || 53682));
  });
  const browserOpened = process.env.UNIQUE_BACKEND_TRANSPORT !== 'stdio';
  if (browserOpened) await shell.openExternal(authUrl.toString());

  return {
    flowId,
    browserOpened,
    authorizationUrl: authUrl.toString(),
    redirectUri: MICROSOFT_REDIRECT_URI,
    message: browserOpened ? 'Browser opened. Finish Microsoft sign-in there; the launcher will continue automatically.' : 'Open authorizationUrl in the default browser to continue Microsoft sign-in.'
  };
}

async function pollMicrosoftDeviceToken(flowId) {
  const flow = microsoftAuthFlows.get(String(flowId || ''));
  if (!flow) {
    throw new Error('Microsoft login flow was not found or expired.');
  }

  const result = await flow.completion;
  microsoftAuthFlows.delete(String(flowId || ''));
  if (result?.error) throw result.error;
  if (!result?.token) throw new Error('Microsoft login did not return a token.');
  return result.token;
}
async function refreshMicrosoftToken(refreshToken) {
  if (!MICROSOFT_CLIENT_ID || !refreshToken) {
    throw new Error('Microsoft refresh token is not available.');
  }

  return requestJson('POST', MICROSOFT_TOKEN_URL, {
    timeoutMs: 12000,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    body: formEncode({
      grant_type: 'refresh_token',
      client_id: MICROSOFT_CLIENT_ID,
      refresh_token: refreshToken,
      scope: MICROSOFT_OAUTH_SCOPE
    })
  });
}

async function exchangeMicrosoftForMinecraft(microsoftToken) {
  const xbl = await microsoftPostJson('https://user.auth.xboxlive.com/user/authenticate', {
    Properties: {
      AuthMethod: 'RPS',
      SiteName: 'user.auth.xboxlive.com',
      RpsTicket: `d=${microsoftToken.access_token}`
    },
    RelyingParty: 'http://auth.xboxlive.com',
    TokenType: 'JWT'
  });

  const xsts = await microsoftPostJson('https://xsts.auth.xboxlive.com/xsts/authorize', {
    Properties: {
      SandboxId: 'RETAIL',
      UserTokens: [xbl.Token]
    },
    RelyingParty: 'rp://api.minecraftservices.com/',
    TokenType: 'JWT'
  });

  const userHash = xsts.DisplayClaims?.xui?.[0]?.uhs;
  if (!userHash || !xsts.Token) {
    throw new Error('Xbox Live authentication did not return XSTS token.');
  }

  const minecraftLogin = await microsoftPostJson('https://api.minecraftservices.com/authentication/login_with_xbox', {
    identityToken: `XBL3.0 x=${userHash};${xsts.Token}`
  });
  const minecraftAccessToken = minecraftLogin.access_token;
  if (!minecraftAccessToken) {
    throw new Error('Minecraft Services did not return access token.');
  }

  const entitlements = await requestJson('GET', 'https://api.minecraftservices.com/entitlements/mcstore', {
    timeoutMs: 12000,
    headers: { Authorization: `Bearer ${minecraftAccessToken}`, Accept: 'application/json' }
  });
  const ownsMinecraft = Array.isArray(entitlements?.items)
    && entitlements.items.some((item) => ['game_minecraft', 'product_minecraft'].includes(String(item.name || '').toLowerCase()));
  if (!ownsMinecraft) {
    throw new Error('This Microsoft account has no Minecraft Java license.');
  }

  const profile = await requestJson('GET', 'https://api.minecraftservices.com/minecraft/profile', {
    timeoutMs: 12000,
    headers: { Authorization: `Bearer ${minecraftAccessToken}`, Accept: 'application/json' }
  });
  if (!profile?.id || !profile?.name) {
    throw new Error('Minecraft Java profile was not found on this Microsoft account.');
  }

  return {
    profile,
    minecraftAccessToken,
    auth: {
      access_token: minecraftAccessToken,
      client_token: crypto.randomBytes(16).toString('hex'),
      uuid: String(profile.id),
      name: String(profile.name),
      selected_profile: { id: String(profile.id), name: String(profile.name) },
      user_properties: JSON.stringify({})
    },
    refreshToken: microsoftToken.refresh_token || '',
    expiresAt: Date.now() + Math.max(60, Number(microsoftToken.expires_in || 3600) - 60) * 1000
  };
}

async function createRemoteLicenseSession(minecraft) {
  if (!UNIQUE_API_URL || !minecraft?.minecraftAccessToken || !minecraft?.profile?.name) {
    return null;
  }

  try {
    const response = await requestJson('POST', `${UNIQUE_API_URL}/auth/minecraft-license`, {
      timeoutMs: 12000,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nickname: minecraft.profile.name,
        profileId: minecraft.profile.id,
        minecraftAccessToken: minecraft.minecraftAccessToken,
        hwidHash: getHardwareIdHash(),
        launcherBuild: UNIQUE_LAUNCHER_BUILD_ID
      })
    });
    if (response?.success === false || response?.ok === false) {
      return null;
    }
    return response;
  } catch (err) {
    return null;
  }
}

async function completeMicrosoftLogin(flowId) {
  const microsoftToken = await pollMicrosoftDeviceToken(flowId);
  const minecraft = await exchangeMicrosoftForMinecraft(microsoftToken);
  const nickname = minecraft.profile.name;
  const remote = await createRemoteLicenseSession(minecraft);
  const sessionToken = remote?.sessionToken || remote?.token || createSession(nickname, false);
  const sessionExtra = {
    microsoft: true,
    remote: Boolean(remote?.sessionToken || remote?.token),
    profileId: minecraft.profile.id,
    minecraftAuth: {
      ...minecraft.auth,
      expiresAt: minecraft.expiresAt
    },
    refreshToken: minecraft.refreshToken || microsoftToken.refresh_token || ''
  };
  activeSessions.set(sessionToken, { nickname, createdAt: Date.now(), ...sessionExtra });
  store.set(SESSION_KEY, {
    nickname,
    sessionToken,
    createdAt: Date.now(),
    ...sessionExtra
  });
  saveAccountSession(store.get(SESSION_KEY));
  setLauncherDiscordRpc(nickname);
  return {
    success: true,
    user: {
      nickname,
      sessionToken,
      microsoft: true,
      license: true,
      profileId: minecraft.profile.id
    }
  };
}

async function getSessionMinecraftAuth(sessionToken, fallbackNickname) {
  const session = activeSessions.get(sessionToken);
  if (!session?.minecraftAuth) {
    return launcher.authenticator.getAuth(fallbackNickname);
  }

  if (session.minecraftAuth.expiresAt && Date.now() > Number(session.minecraftAuth.expiresAt)) {
    const refreshed = await refreshMicrosoftToken(session.refreshToken);
    const minecraft = await exchangeMicrosoftForMinecraft(refreshed);
    session.minecraftAuth = { ...minecraft.auth, expiresAt: minecraft.expiresAt };
    session.refreshToken = minecraft.refreshToken || refreshed.refresh_token || session.refreshToken;
    const stored = store.get(SESSION_KEY, null);
    if (stored?.sessionToken === sessionToken) {
      store.set(SESSION_KEY, {
        ...stored,
        minecraftAuth: session.minecraftAuth,
        refreshToken: session.refreshToken
      });
    }
  }

  return session.minecraftAuth;
}

async function verifyRemoteSession(nickname, sessionToken) {
  if (!UNIQUE_AUTH_VERIFY_URL || !sessionToken) {
    return true;
  }

  try {
    const response = await requestJson('POST', UNIQUE_AUTH_VERIFY_URL, {
      timeoutMs: 6000,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nickname,
        sessionToken,
        hwidHash: getHardwareIdHash(),
        launcherBuild: UNIQUE_LAUNCHER_BUILD_ID
      })
    });
    return response?.success !== false && response?.ok !== false;
  } catch (err) {
    return false;
  }
}

function syncRemoteProfile(nickname, data = {}) {
  if (!UNIQUE_PROFILE_URL || !nickname) {
    return;
  }

  const session = store.get(SESSION_KEY, null);
  requestJson('POST', UNIQUE_PROFILE_URL, {
    timeoutMs: 3500,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      nickname,
      sessionToken: session?.sessionToken || '',
      hwidHash: getHardwareIdHash(),
      ...data
    })
  }).catch(() => {});
}

function saveAccountSession(session) {
  if (!session?.nickname || !session?.sessionToken) return;
  const accounts = Array.isArray(store.get(ACCOUNTS_KEY, [])) ? store.get(ACCOUNTS_KEY, []) : [];
  store.set(ACCOUNTS_KEY, [{ ...session, savedAt: Date.now() }, ...accounts.filter((item) => item.nickname !== session.nickname)].slice(0, 8));
}
function listSavedAccounts() { return (Array.isArray(store.get(ACCOUNTS_KEY, [])) ? store.get(ACCOUNTS_KEY, []) : []).filter((item) => item?.nickname && item?.sessionToken); }
function getStoredSession() {
  const session = store.get(SESSION_KEY, null);
  if (!session?.nickname || !session?.sessionToken) {
    return null;
  }
  // Older builds did not persist the `microsoft` flag.  Preserve a valid
  // Microsoft session instead of silently signing the player out.
  if (!session.guest && !session.microsoft && (session.refreshToken || session.minecraftAuth || session.profileId)) {
    session.microsoft = true;
    session.license = true;
    store.set(SESSION_KEY, session);
  }
  if (!session.guest && !session.microsoft) return null;
  saveAccountSession(session);

  if (!activeSessions.has(session.sessionToken)) {
    activeSessions.set(session.sessionToken, {
      nickname: session.nickname,
      createdAt: session.createdAt || Date.now(),
      remote: Boolean(session.remote),
      guest: Boolean(session.guest),
      microsoft: Boolean(session.microsoft),
      minecraftAuth: session.minecraftAuth || null,
      refreshToken: session.refreshToken || ''
    });
  }

  return {
    nickname: session.nickname,
    sessionToken: session.sessionToken,
    guest: Boolean(session.guest),
    microsoft: Boolean(session.microsoft),
    license: Boolean(session.microsoft),
    profileId: session.profileId || session.minecraftAuth?.uuid || ''
  };
}

// Capture the instance once per request; async downloads must not follow later UI selection changes.
const registerHandler = ipcMain.handle.bind(ipcMain);
ipcMain.handle = (channel, handler) => registerHandler(channel, (event, payload) => {
  // Both native bridges send null for calls without arguments; default parameters only handle undefined.
  payload ??= {};
  const owner = payload?.nickname || payload?.user?.nickname || getStoredSession()?.nickname || '';
  const instanceId = payload?.instanceId || getSettings(owner).activeInstanceId || '';
  if (instanceId && !store.get('legacyGameInstance', '') && !store.get('instanceIsolationInitialized', false)) {
    instancePaths.root(owner, instanceId, fs.existsSync(path.join(gameStorage.root, 'mods')) || fs.existsSync(path.join(gameStorage.root, 'saves')) || fs.existsSync(path.join(app.getPath('userData'), 'user-mods')));
    store.set('instanceIsolationInitialized', true);
  }
  return instanceContext.run({ owner, instanceId }, () => handler(event, payload));
});

ipcMain.handle('auth-guest', async (event, payload = {}) => {
  const nickname = String(payload.nickname || '').trim();
  if (!validateNickname(nickname)) {
    return { success: false, error: 'Ник должен быть 3-16 символов: латиница, цифры или _.' };
  }

  const sessionToken = `guest-${crypto.randomBytes(24).toString('hex')}`;
  activeSessions.set(sessionToken, {
    nickname,
    createdAt: Date.now(),
    remote: false,
    guest: true
  });

  // Persist guest session so it can be restored across launcher restarts
  try {
    store.set(SESSION_KEY, {
      nickname,
      sessionToken,
      createdAt: Date.now(),
      guest: true
    });
    saveAccountSession(store.get(SESSION_KEY));
  } catch (e) {
    return { success: false, error: 'Не удалось сохранить аккаунт: ' + e.message };
  }

  try {
    saveSettings({
      ...getSettings(nickname),
      useUniqueMods: false
    }, nickname);
  } catch (error) {
    return { success: false, error: 'Не удалось сохранить настройки: ' + error.message };
  }

  setLauncherDiscordRpc(nickname);
  return {
    success: true,
    user: { nickname, sessionToken, guest: true },
    skin: null
  };
});

ipcMain.handle('auth-accounts-list', async () => ({ success: true, accounts: listSavedAccounts().map(({ nickname, sessionToken, guest, microsoft }) => ({ nickname, sessionToken, guest, microsoft })) }));
ipcMain.handle('auth-account-switch', async (event, payload = {}) => {
  const account = listSavedAccounts().find((item) => item.sessionToken === payload.sessionToken);
  if (!account) return { success: false, error: 'Account was not found.' };
  store.set(SESSION_KEY, account);
  activeSessions.set(account.sessionToken, { ...account, createdAt: account.createdAt || Date.now() });
  return { success: true, user: getStoredSession() };
});
ipcMain.handle('auth-current-session', async () => {
  const session = getStoredSession();
  if (!session) {
    return { success: false };
  }

  // Keep a local session available offline; its Microsoft token is refreshed only when Minecraft starts.

  setLauncherDiscordRpc(session.nickname);

  return {
    success: true,
    user: session
  };
});

ipcMain.handle('auth-microsoft-device-start', async () => {
  try {
    return { success: true, ...(await startMicrosoftDeviceFlow()) };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle('auth-microsoft-device-complete', async (event, payload = {}) => {
  try {
    return await completeMicrosoftLogin(payload.flowId);
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle('auth-logout', async (event, payload = {}) => {
  const token = payload.sessionToken || store.get(`${SESSION_KEY}.sessionToken`);
  if (UNIQUE_API_URL && token && !String(token).startsWith('guest-')) {
    requestJson('POST', `${UNIQUE_API_URL}/auth/logout`, {
      timeoutMs: 3000,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionToken: token })
    }).catch(() => {});
  }
  if (token) {
    activeSessions.delete(token);
  }

  store.delete(SESSION_KEY);
  return { success: true };
});

ipcMain.handle('log-launch', async (event, payload = {}) => {
  try {
    const nickname = String(payload.nickname || '').trim() || 'unknown';
    const instanceId = String(payload.instanceId || '');
    const loader = String(payload.loader || '');
    const version = String(payload.version || '');
    const logsDir = path.join(app.getPath('userData'), 'logs');
    ensureDir(logsDir);
    const logPath = path.join(logsDir, 'launches.log');
    const line = `${new Date().toISOString()}\t${nickname}\t${instanceId}\t${loader}\t${version}\n`;
    fs.appendFileSync(logPath, line, { encoding: 'utf8', flag: 'a' });
    return { success: true, path: logPath };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle('get-settings', async (event, payload = {}) => {
  return getSettings(payload.nickname);
});

ipcMain.handle('save-settings', async (event, payload = {}) => {
  const settings = payload.settings || payload;
  const saved = saveSettings(settings, payload.nickname);
  if (getDiscordService().rpcContext) void updateDiscordRpc();
  syncRemoteLauncherAssets(String(payload.nickname || '').trim(), saved);
  return { success: true, settings: saved };
});

ipcMain.handle('get-system-info', async () => {
  const versions = await getSupportedVersions();
  const content = await getLauncherContent().catch(() => ({ news: [], buildProfiles: getFallbackBuildProfiles(), projects: getFallbackProjects() }));
  let recommendedJava = null;
  try {
    recommendedJava = resolveJava17();
  } catch (err) {
    recommendedJava = null;
  }
  return {
    totalMemoryMb: Math.floor(os.totalmem() / 1024 / 1024),
    refreshRate: Math.round(Number(screen.getPrimaryDisplay().displayFrequency) || 60),
    appVersion: app.getVersion(),
    gameRoot: getGameRoot(),
    modsFolder: getWorkspaceModsPath(),
    userModsFolder: getUserModsPath(versions[0] || '1.20.1'),
    server: PROJECT_SERVER,
    supportedVersions: versions,
    snapshotVersions: supportedSnapshotVersionsCache,
    supportedLoaders: SUPPORTED_MOD_LOADERS,
    apiBaseUrl: UNIQUE_API_URL,
    apiFallbackUrls: UNIQUE_API_FALLBACK_URLS,
    remoteAuth: Boolean(UNIQUE_API_URL),
    remoteMods: Boolean(UNIQUE_MOD_MANIFEST_URL),
    updateUrlConfigured: Boolean(UNIQUE_UPDATE_URL),
    recommendedJava,
      buildProfiles: content.buildProfiles,
      projects: content.projects,
      news: content.news
  };
});

ipcMain.handle('launcher-content', async () => {
  try {
    return { success: true, ...(await getLauncherContent()) };
  } catch (err) {
    return { success: false, error: err.message || String(err), news: [], buildProfiles: getFallbackBuildProfiles(), projects: getFallbackProjects() };
  }
});

ipcMain.handle('api-health', async () => {
  try {
    return { success: true, ...(await checkApiHealth()) };
  } catch (err) {
    return { success: false, ok: false, error: err.message || String(err) };
  }
});

ipcMain.handle('clipboard-write', async (event, text = '') => {
  clipboard.writeText(String(text || ''));
  return { success: true };
});

ipcMain.handle('list-mods', async (event, payload = {}) => {
  try {
    const settings = applySelectedInstanceToSettings(payload.nickname, getSettings(payload.nickname));
    const minecraftVersion = String(payload.minecraftVersion || settings.minecraftVersion || '1.20.1');
    const buildProfile = String(payload.buildProfile || settings.buildProfile || 'normal');
    return {
      success: true,
      mods: await listModsFromWorkspace(minecraftVersion, buildProfile),
      userModsFolder: getUserModsPath(minecraftVersion)
    };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('build-instances-list', async (event, payload = {}) => {
  try {
    const settings = getSettings(payload.nickname);
    const instances = getBuildInstances(payload.nickname);
    return {
      success: true,
      instances,
      activeInstanceId: settings.activeInstanceId || ''
    };
  } catch (err) {
    return { success: false, error: err.message || String(err), instances: [] };
  }
});

ipcMain.handle('build-instance-update', async (event, payload = {}) => {
  try {
    const instance = findBuildInstance(payload.nickname, payload.instanceId);
    if (!instance) throw new Error('Сборка не найдена.');
    const changes = payload.changes || {};
    instanceLaunchOptions({ ...instance, ...changes });
    const name = String(changes.name ?? instance.name).trim();
    if (!name || name.length > 80) throw new Error('Название должно содержать от 1 до 80 символов.');
    if (changes.icon !== undefined && changes.icon !== '' && (typeof changes.icon !== 'string' || changes.icon.length > 180000 || !/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(changes.icon))) throw new Error('Некорректная аватарка.');
    upsertBuildInstance(payload.nickname, { ...instance, name, jvmArguments: changes.jvmArguments ?? instance.jvmArguments, gameArguments: changes.gameArguments ?? instance.gameArguments, icon: changes.icon ?? instance.icon, favorite: changes.favorite === undefined ? instance.favorite : changes.favorite === true }, false);
    return { success: true, instances: getBuildInstances(payload.nickname) };
  } catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle('build-instance-create', async (event, payload = {}) => {
  try {
    const minecraftVersion = String(payload.minecraftVersion || '1.20.1').trim();
    const loader = normalizeModLoader(payload.loader || 'fabric');
    const instance = upsertBuildInstance(payload.nickname, {
      name: payload.name,
      minecraftVersion,
      loader,
      source: payload.source || 'custom'
    }, true);
    return {
      success: true,
      instance,
      instances: getBuildInstances(payload.nickname),
      settings: getSettings(payload.nickname)
    };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle('build-instance-delete', async (event, payload = {}) => {
  try {
    const nickname = String(payload.nickname || '').trim();
    const instanceId = String(payload.instanceId || '').trim();
    if (!instanceId) return { success: false, error: 'instanceId required' };
    const instances = getBuildInstances(nickname).filter((i) => i.id !== instanceId);
    saveBuildInstances(nickname, instances);
    const settings = getSettings(nickname);
    if (settings.activeInstanceId === instanceId) {
      saveSettings({ ...settings, activeInstanceId: '' }, nickname);
    }
    return { success: true, instances, settings: getSettings(nickname) };
  } catch (err) {
    return { success: false, error: err && (err.message || String(err)) };
  }
});

ipcMain.handle('build-instance-import-existing', async (event, payload = {}) => {
  try {
    const result = importExistingMinecraftBuild(payload);
    return {
      success: true,
      ...result,
      instances: getBuildInstances(payload.nickname),
      settings: getSettings(payload.nickname)
    };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle('build-instance-select', async (event, payload = {}) => {
  try {
    const instance = findBuildInstance(payload.nickname, payload.instanceId);
    if (!instance) {
      return { success: false, error: 'Build instance was not found.' };
    }
    const current = getSettings(payload.nickname);
    const settings = saveSettings({
      ...current,
      activeInstanceId: instance.id,
      minecraftVersion: instance.minecraftVersion,
      modLoader: instance.loader,
      loader: instance.loader === 'fabric' ? 'Fabric' : instance.loader,
      loaderVersion: instance.loaderVersion,
      fabricLoaderVersion: instance.fabricLoaderVersion,
      forgeVersion: instance.forgeVersion,
      neoforgeVersion: instance.neoforgeVersion,
      quiltLoaderVersion: instance.quiltLoaderVersion
    }, payload.nickname);
    return { success: true, instance, settings, instances: getBuildInstances(payload.nickname) };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle('mod-set-enabled', async (event, payload = {}) => {
  try {
    const settings = applySelectedInstanceToSettings(payload.nickname, getSettings(payload.nickname));
    const minecraftVersion = String(payload.minecraftVersion || settings.minecraftVersion || '1.20.1');
    const mod = setUserModEnabled(minecraftVersion, payload.name, payload.enabled !== false);
    return {
      success: true,
      mod,
      mods: await listModsFromWorkspace(minecraftVersion, settings.buildProfile || 'normal')
    };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle('mod-delete-schedule', async (event, payload = {}) => {
  try {
    const settings = applySelectedInstanceToSettings(payload.nickname, getSettings(payload.nickname));
    const minecraftVersion = String(payload.minecraftVersion || settings.minecraftVersion || '1.20.1');
    return { success: true, ...(scheduleUserModDelete(minecraftVersion, payload.name)) };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle('mod-delete-undo', async (event, payload = {}) => {
  return { success: undoUserModDelete(payload.token) };
});

ipcMain.handle('mod-delete-finalize', async () => {
  finalizeAllPendingUserModDeletes();
  return { success: true };
});

ipcMain.handle('modrinth-search', async (event, payload = {}) => {
  try {
    return { success: true, ...(await searchModrinthProjects(payload)) };
  } catch (err) {
    return { success: false, error: err.message || String(err), projects: [] };
  }
});

ipcMain.handle('modrinth-tags', async () => {
  try {
    return { success: true, ...(await getModrinthTags()) };
  } catch (err) {
    return { success: false, error: err.message || String(err), gameVersions: [], loaders: [], categories: [], licenses: [], projectTypes: MODRINTH_PROJECT_TYPES };
  }
});

ipcMain.handle('modrinth-project', async (event, payload = {}) => {
  try {
    const projectId = String(payload.projectId || payload.slug || '').trim();
    if (!projectId) {
      return { success: false, error: 'Modrinth project id is required.' };
    }
    return { success: true, project: await getModrinthProject(projectId) };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle('modrinth-project-versions', async (event, payload = {}) => {
  try {
    const projectId = String(payload.projectId || payload.slug || '').trim();
    const projectType = normalizeModrinthProjectType(payload.type || payload.projectType, 'mod');
    const loader = getModrinthLoaderFilter(payload.loader || payload.modLoader || '');
    if (!projectId) {
      return { success: false, error: 'Modrinth project id is required.', versions: [] };
    }
    const versions = await getModrinthProjectVersions(projectId, {
      minecraftVersion: payload.minecraftVersion,
      loaders: ['resourcepack', 'shader'].includes(projectType) ? ['minecraft'] : (loader ? [loader] : []),
      includeChangelog: Boolean(payload.includeChangelog)
    });
    return { success: true, versions: Array.isArray(versions) ? versions.map(normalizeModrinthVersion) : [] };
  } catch (err) {
    return { success: false, error: err.message || String(err), versions: [] };
  }
});

ipcMain.handle('modrinth-project-dependencies', async (event, payload = {}) => {
  try {
    const projectId = String(payload.projectId || payload.slug || '').trim();
    if (!projectId) {
      return { success: false, error: 'Modrinth project id is required.', projects: [], versions: [] };
    }
    return { success: true, ...(await getModrinthProjectDependencies(projectId)) };
  } catch (err) {
    return { success: false, error: err.message || String(err), projects: [], versions: [] };
  }
});

ipcMain.handle('modrinth-version', async (event, payload = {}) => {
  try {
    const versionId = String(payload.versionId || '').trim();
    if (!versionId) {
      return { success: false, error: 'Modrinth version id is required.' };
    }
    return { success: true, version: normalizeModrinthVersion(await getModrinthVersion(versionId)) };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle('modrinth-check-updates', async (event, payload = {}) => {
  try {
    return { success: true, ...(await checkModrinthInstalledUpdates(payload)) };
  } catch (err) {
    return { success: false, error: err.message || String(err), updates: [] };
  }
});

ipcMain.handle('modrinth-install-mod', async (event, payload = {}) => {
  try {
    const settings = applySelectedInstanceToSettings(payload.nickname, getSettings(payload.nickname));
    const minecraftVersion = String(payload.minecraftVersion || settings.minecraftVersion || '1.20.1');
    const state = await installModrinthModProject({
      projectId: payload.projectId,
      slug: payload.slug,
      versionId: payload.versionId,
      minecraftVersion,
      loader: payload.loader || settings.modLoader
    });
    return {
      success: true,
      minecraftVersion,
      installed: state.installed,
      installedCount: state.installed.length
    };
  } catch (err) {
    return { success: false, error: err.message || String(err), installed: [] };
  }
});

ipcMain.handle('modrinth-install-project', async (event, payload = {}) => {
  try {
    const settings = applySelectedInstanceToSettings(payload.nickname, getSettings(payload.nickname));
    const result = await installModrinthFileProject({
      projectId: payload.projectId,
      slug: payload.slug,
      type: payload.type,
      versionId: payload.versionId,
      minecraftVersion: payload.minecraftVersion || settings.minecraftVersion || '1.20.1',
      loader: payload.loader || settings.modLoader
    });
    return { success: true, ...result };
  } catch (err) {
    return { success: false, error: err.message || String(err), installed: [] };
  }
});

ipcMain.handle('modrinth-install-modpack', async (event, payload = {}) => {
  try {
    if (activeLaunches.size) throw new Error('Сначала закройте Minecraft.');
    const settings = applySelectedInstanceToSettings(payload.nickname, getSettings(payload.nickname));
    const result = await installModrinthModpackProject({
      projectId: payload.projectId,
      slug: payload.slug,
      versionId: payload.versionId,
      minecraftVersion: payload.minecraftVersion || settings.minecraftVersion || '1.20.1',
      loader: payload.loader || settings.modLoader
    });
    const instance = upsertBuildInstance(payload.nickname, {
      name: result.packName,
      minecraftVersion: result.minecraftVersion,
      loader: result.loader || settings.modLoader || 'fabric',
      loaderVersion: result.loaderVersion || 'latest',
      fabricLoaderVersion: result.fabricLoaderVersion || 'latest',
      forgeVersion: result.forgeVersion || 'latest',
      neoforgeVersion: result.neoforgeVersion || 'latest',
      quiltLoaderVersion: result.quiltLoaderVersion || 'latest',
      source: 'modrinth',
      modrinthProjectId: payload.projectId,
      iconSource: (await getModrinthProject(payload.projectId || payload.slug).catch(() => null))?.iconUrl || '',
      modrinthSlug: payload.slug,
      packName: result.packName
    }, true);
    return {
      success: true,
      ...result,
      instance,
      installedCount: result.installed.length,
      overridesCount: result.overrides.length,
      skippedCount: result.skipped.length
    };
  } catch (err) {
    return { success: false, error: err.message || String(err), installed: [] };
  }
});

ipcMain.handle('modrinth-import-mrpack', async (event, payload = {}) => {
  try {
    if (activeLaunches.size) throw new Error('Сначала закройте Minecraft.');
    const result = await importLocalMrpack(payload);
    const instance = upsertBuildInstance(payload.nickname, {
      name: payload.name || result.packName,
      minecraftVersion: result.minecraftVersion,
      loader: result.loader,
      loaderVersion: result.loaderVersion || 'latest',
      fabricLoaderVersion: result.fabricLoaderVersion || 'latest',
      forgeVersion: result.forgeVersion || 'latest',
      neoforgeVersion: result.neoforgeVersion || 'latest',
      quiltLoaderVersion: result.quiltLoaderVersion || 'latest',
      source: 'modrinth',
      packName: result.packName
    }, true);
    return {
      success: true,
      ...result,
      instance,
      installedCount: result.installed.length,
      overridesCount: result.overrides.length,
      skippedCount: result.skipped.length
    };
  } catch (err) {
    return { success: false, error: err.message || String(err), installed: [] };
  }
});

ipcMain.handle('modrinth-import-project', async (event, payload = {}) => {
  try {
    if (activeLaunches.size) throw new Error('Сначала закройте Minecraft.');
    const settings = applySelectedInstanceToSettings(payload.nickname, getSettings(payload.nickname));
    const result = await importModrinthProject({
      ...payload,
      minecraftVersion: payload.minecraftVersion || settings.minecraftVersion || '1.20.1',
      loader: payload.loader || settings.modLoader
    });
    let instance = null;
    if (result.type === 'modpack') {
      instance = upsertBuildInstance(payload.nickname, {
        name: payload.name || result.packName,
        minecraftVersion: result.minecraftVersion,
        loader: result.loader || settings.modLoader || 'fabric',
        loaderVersion: result.loaderVersion || 'latest',
        fabricLoaderVersion: result.fabricLoaderVersion || 'latest',
        forgeVersion: result.forgeVersion || 'latest',
        neoforgeVersion: result.neoforgeVersion || 'latest',
        quiltLoaderVersion: result.quiltLoaderVersion || 'latest',
        source: 'modrinth',
        modrinthProjectId: result.project?.id || payload.projectId,
        iconSource: result.project?.iconUrl || '',
        modrinthSlug: result.project?.slug || payload.slug,
        packName: result.packName || result.project?.title
      }, true);
    }
    return {
      success: true,
      ...result,
      instance,
      installedCount: result.installed?.length || result.installedCount || 0,
      overridesCount: result.overrides?.length || 0,
      skippedCount: result.skipped?.length || 0
    };
  } catch (err) {
    return { success: false, error: err.message || String(err), installed: [] };
  }
});

ipcMain.handle('modrinth-multiple-projects', async (event, payload = {}) => {
  try {
    const ids = Array.isArray(payload.ids) ? payload.ids : Array.isArray(payload) ? payload : [];
    if (!ids.length) {
      return { success: true, projects: [] };
    }
    const params = new URLSearchParams({ ids: JSON.stringify(ids.slice(0, 100)) });
    const results = await modrinthRequest(`/projects?${params}`);
    return { success: true, projects: Array.isArray(results) ? results.map(normalizeModrinthProject) : [] };
  } catch (err) {
    return { success: false, error: err.message || String(err), projects: [] };
  }
});

ipcMain.handle('modrinth-multiple-versions', async (event, payload = {}) => {
  try {
    const ids = Array.isArray(payload.ids) ? payload.ids : Array.isArray(payload) ? payload : [];
    if (!ids.length) {
      return { success: true, versions: [] };
    }
    const params = new URLSearchParams({ ids: JSON.stringify(ids.slice(0, 100)) });
    const results = await modrinthRequest(`/versions?${params}`);
    return { success: true, versions: Array.isArray(results) ? results.map(normalizeModrinthVersion) : [] };
  } catch (err) {
    return { success: false, error: err.message || String(err), versions: [] };
  }
});

ipcMain.handle('modrinth-version-from-hash', async (event, payload = {}) => {
  try {
    const hash = String(payload.hash || '').trim();
    const algorithm = ['sha1', 'sha512'].includes(payload.algorithm) ? payload.algorithm : 'sha1';
    if (!hash) {
      return { success: false, error: 'Hash is required.' };
    }
    const result = await modrinthRequest(`/version_file/${encodeURIComponent(hash)}?algorithm=${algorithm}`);
    return { success: true, version: normalizeModrinthVersion(result) };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle('modrinth-versions-from-hashes', async (event, payload = {}) => {
  try {
    const hashes = Array.isArray(payload.hashes) ? payload.hashes : [];
    const algorithm = ['sha1', 'sha512'].includes(payload.algorithm) ? payload.algorithm : 'sha1';
    if (!hashes.length) {
      return { success: true, versions: {} };
    }
    const result = await requestJson('POST', `${MODRINTH_API_URL}/version_files`, {
      timeoutMs: 15000,
      headers: {
        ...getModrinthHeaders(),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ hashes: hashes.slice(0, 500), algorithm })
    });
    const versions = {};
    for (const [hash, version] of Object.entries(result || {})) {
      versions[hash] = normalizeModrinthVersion(version);
    }
    return { success: true, versions };
  } catch (err) {
    return { success: false, error: err.message || String(err), versions: {} };
  }
});

ipcMain.handle('modrinth-user-projects', async (event, payload = {}) => {
  try {
    const userId = String(payload.userId || payload.username || '').trim();
    if (!userId) {
      return { success: false, error: 'User ID or username is required.', projects: [] };
    }
    const results = await modrinthRequest(`/user/${encodeURIComponent(userId)}/projects`);
    return { success: true, projects: Array.isArray(results) ? results.map(normalizeModrinthProject) : [] };
  } catch (err) {
    return { success: false, error: err.message || String(err), projects: [] };
  }
});

ipcMain.handle('modrinth-user', async (event, payload = {}) => {
  try {
    const userId = String(payload.userId || payload.username || '').trim();
    if (!userId) {
      return { success: false, error: 'User ID or username is required.' };
    }
    const result = await modrinthRequest(`/user/${encodeURIComponent(userId)}`);
    return {
      success: true,
      user: {
        id: String(result.id || ''),
        username: String(result.username || ''),
        name: String(result.name || ''),
        avatarUrl: String(result.avatar_url || ''),
        bio: String(result.bio || ''),
        created: String(result.created || ''),
        role: String(result.role || ''),
        badges: Number(result.badges || 0)
      }
    };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle('modrinth-project-members', async (event, payload = {}) => {
  try {
    const projectId = String(payload.projectId || payload.slug || '').trim();
    if (!projectId) {
      return { success: false, error: 'Modrinth project id is required.', members: [] };
    }
    const results = await modrinthRequest(`/project/${encodeURIComponent(projectId)}/members`);
    const members = Array.isArray(results)
      ? results.map((member) => ({
          teamId: String(member.team_id || ''),
          userId: String(member.user?.id || member.user_id || ''),
          username: String(member.user?.username || ''),
          name: String(member.user?.name || ''),
          avatarUrl: String(member.user?.avatar_url || ''),
          role: String(member.role || ''),
          permissions: Number(member.permissions || 0),
          accepted: Boolean(member.accepted),
          ordering: Number(member.ordering || 0)
        }))
      : [];
    return { success: true, members };
  } catch (err) {
    return { success: false, error: err.message || String(err), members: [] };
  }
});

ipcMain.handle('modrinth-search-facets', async (event, payload = {}) => {
  try {
    const result = await searchModrinthProjects({
      ...payload,
      facets: Array.isArray(payload.facets) ? payload.facets : []
    });
    return { success: true, ...result };
  } catch (err) {
    return { success: false, error: err.message || String(err), projects: [] };
  }
});

ipcMain.handle('modrinth-export-modlist', async (event, payload = {}) => {
  try {
    const settings = applySelectedInstanceToSettings(payload.nickname, getSettings(payload.nickname));
    const minecraftVersion = String(payload.minecraftVersion || settings.minecraftVersion || '1.20.1');
    const loader = getModrinthLoaderFilter(payload.loader || settings.modLoader || 'fabric');
    const modsDir = getUserModsPath(minecraftVersion);
    if (!fs.existsSync(modsDir)) {
      return { success: true, modlist: [], exported: 0 };
    }

    const files = fs.readdirSync(modsDir)
      .filter((name) => name.toLowerCase().endsWith('.jar'))
      .map((name) => ({
        name,
        path: path.join(modsDir, name),
        sha1: hashFile(path.join(modsDir, name), 'sha1'),
        sha512: hashFile(path.join(modsDir, name), 'sha512'),
        size: fs.statSync(path.join(modsDir, name)).size
      }));
    if (!files.length) {
      return { success: true, modlist: [], exported: 0 };
    }

    const hashLookup = await requestJson('POST', `${MODRINTH_API_URL}/version_files`, {
      timeoutMs: 15000,
      headers: { ...getModrinthHeaders(), 'Content-Type': 'application/json' },
      body: JSON.stringify({ hashes: files.map((f) => f.sha1), algorithm: 'sha1' })
    }).catch(() => ({}));

    const modlist = files.map((file) => {
      const version = hashLookup?.[file.sha1];
      return {
        fileName: file.name,
        sha1: file.sha1,
        sha512: file.sha512,
        fileSize: file.size,
        modrinthVersionId: version?.id || null,
        modrinthProjectId: version?.project_id || null,
        downloadUrl: version?.files?.[0]?.url || null
      };
    });

    const outputDir = path.join(app.getPath('userData'), 'exports');
    ensureDir(outputDir);
    const outputPath = path.join(outputDir, `modlist-${minecraftVersion}-${Date.now()}.json`);
    fs.writeFileSync(outputPath, JSON.stringify({
      formatVersion: 1,
      game: 'minecraft',
      gameVersion: minecraftVersion,
      loader: loader || settings.modLoader || 'fabric',
      exportedAt: new Date().toISOString(),
      launcherVersion: app.getVersion(),
      mods: modlist
    }, null, 2), 'utf8');

    await shell.showItemInFolder(outputPath);
    return { success: true, modlist, exported: modlist.length, path: outputPath };
  } catch (err) {
    return { success: false, error: err.message || String(err), modlist: [] };
  }
});

ipcMain.handle('modrinth-import-modlist', async (event, payload = {}) => {
  try {
    const filePath = String(payload.filePath || payload.path || '').trim();
    if (!filePath || !fs.existsSync(filePath)) {
      return { success: false, error: 'Modlist file not found.', installed: [] };
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    const mods = Array.isArray(data.mods) ? data.mods : Array.isArray(data) ? data : [];
    if (!mods.length) {
      return { success: false, error: 'Modlist is empty.', installed: [] };
    }

    const settings = applySelectedInstanceToSettings(payload.nickname, getSettings(payload.nickname));
    const minecraftVersion = String(data.gameVersion || payload.minecraftVersion || settings.minecraftVersion || '1.20.1');
    const loader = getModrinthLoaderFilter(data.loader || payload.loader || settings.modLoader || 'fabric');
    const modsDir = getUserModsPath(minecraftVersion);
    ensureDir(modsDir);

    const installed = [];
    const skipped = [];

    for (const mod of mods) {
      try {
        const url = mod.downloadUrl || mod.download_url || mod.url;
        if (!url) {
          if (mod.modrinthProjectId || mod.project_id) {
            const result = await installModrinthModProject({
              projectId: mod.modrinthProjectId || mod.project_id,
              minecraftVersion,
              loader
            });
            installed.push(...(result.installed || []));
          } else {
            skipped.push({ fileName: mod.fileName || mod.name || 'unknown', reason: 'no download URL' });
          }
          continue;
        }

        const fileName = sanitizeDownloadFileName(mod.fileName || mod.name || path.basename(new URL(url).pathname));
        const destPath = path.join(modsDir, fileName);
        if (fs.existsSync(destPath)) {
          skipped.push({ fileName, reason: 'already exists' });
          continue;
        }

        await downloadFile(url, destPath);
        installed.push({ fileName, path: destPath });
      } catch (err) {
        skipped.push({ fileName: mod.fileName || mod.name || 'unknown', reason: err.message || String(err) });
      }
    }

    return { success: true, installed, skipped, minecraftVersion, total: mods.length };
  } catch (err) {
    return { success: false, error: err.message || String(err), installed: [] };
  }
});

ipcMain.handle('install-build-profile', async (event, payload = {}) => {
  try {
    const settings = getSettings(payload.nickname);
    const minecraftVersion = String(payload.minecraftVersion || settings.minecraftVersion || '1.20.1');
    const buildProfile = String(payload.buildProfile || settings.buildProfile || 'normal');
    const root = getGameRoot();
    ensureDir(root);

    const versionProfile = await getVersionProfile(minecraftVersion);
    const copied = await syncRequiredModsToGameRoot(root, versionProfile, buildProfile);
    await enforceModIntegrity(root, versionProfile, buildProfile);

    return {
      success: true,
      copied,
      minecraftVersion: versionProfile.id || minecraftVersion,
      buildProfile,
      modsDir: path.join(root, 'mods')
    };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle('registered-servers', async (event, payload = {}) => {
  try {
    const settings = getSettings(payload.nickname);
    const projectId = String(payload.projectId || settings.projectId || 'unique');
    const servers = await getRegisteredServers(projectId);
    return { success: true, servers, projectId };
  } catch (err) {
    return { success: false, error: err.message || String(err), servers: [] };
  }
});

function getContentFolder(type) {
  return instancePaths.content(getGameRoot(), type);
}

function listGameContent(type) {
  const folder = getContentFolder(type);
  return fs.readdirSync(folder, { withFileTypes: true })
    .filter((entry) => String(type) === 'worlds' ? entry.isDirectory() || entry.name.endsWith('.disabled') : entry.isFile())
    .map((entry) => {
      const disabled = entry.name.endsWith('.disabled');
      const stat = fs.statSync(path.join(folder, entry.name));
      return { name: entry.name, baseName: disabled ? entry.name.slice(0, -'.disabled'.length) : entry.name, enabled: !disabled, sizeMb: Number((stat.size / 1024 / 1024).toFixed(2)) };
    });
}

function setGameContentEnabled(type, fileName, enabled) {
  if (activeLaunches.size) throw new Error('Сначала закройте Minecraft.');
  const folder = getContentFolder(type);
  const source = instancePaths.item(folder, fileName);
  if (!fs.existsSync(source)) throw new Error('Content file was not found.');
  const target = enabled ? source.replace(/\.disabled$/i, '') : source.endsWith('.disabled') ? source : `${source}.disabled`;
  if (target !== source && fs.existsSync(target)) throw new Error('Файл уже существует, он не был перезаписан.');
  if (target !== source) fs.renameSync(source, target);
  return { name: path.basename(target), enabled };
}

function deleteGameContent(type, fileName) {
  if (activeLaunches.size) throw new Error('Сначала закройте Minecraft.');
  const folder = getContentFolder(type);
  const target = instancePaths.item(folder, fileName);
  if (!fs.existsSync(target)) throw new Error('Content file was not found.');
  fs.rmSync(target, { recursive: true, force: true });
  return true;
}
const contentImporter = new ContentImporter({
  busy: () => activeLaunches.size > 0,
  folder: (type, settings) => type === 'mods' ? getUserModsPath(settings.minecraftVersion)
    : type === 'cape' ? path.join(app.getPath('userData'), 'capes') : getContentFolder(type)
});
ipcMain.handle('content-import-drop', async (event, payload = {}) => {
  try {
    const session = getStoredSession();
    if (!session || session.sessionToken !== payload.sessionToken) throw new Error('Аккаунт изменился. Повторите импорт.');
    const settings = applySelectedInstanceToSettings(session.nickname, getSettings(session.nickname));
    if (payload.type !== 'cape' && (!settings.activeInstanceId || payload.instanceId !== settings.activeInstanceId)) throw new Error('Сначала выберите сборку.');
    if (!Array.isArray(payload.paths) || !payload.paths.length || payload.paths.length > 100) throw new Error('Выберите от 1 до 100 файлов.');
    const imported = [], errors = [];
    for (const file of payload.paths) {
      try { imported.push(await contentImporter.importOne(payload.type, String(file), settings)); }
      catch (error) { errors.push({ name: path.basename(String(file)), error: error.code === 'EEXIST' ? 'Файл уже существует, он не был перезаписан.' : error.message }); }
    }
    return { success: true, imported, errors };
  } catch (error) { return { success: false, error: error.message }; }
});
ipcMain.handle('game-content-list', async (event, payload = {}) => {
  try { return { success: true, items: listGameContent(payload.type) }; }
  catch (err) { return { success: false, error: err.message || String(err), items: [] }; }
});
ipcMain.handle('game-content-set-enabled', async (event, payload = {}) => {
  try { return { success: true, item: setGameContentEnabled(payload.type, payload.name, Boolean(payload.enabled)) }; }
  catch (err) { return { success: false, error: err.message || String(err) }; }
});
ipcMain.handle('game-content-delete', async (event, payload = {}) => {
  try { deleteGameContent(payload.type, payload.name); return { success: true }; }
  catch (err) { return { success: false, error: err.message || String(err) }; }
});
ipcMain.handle('open-game-content-folder', async (event, payload = {}) => {
  try {
    const aliases = { resourcepacks: 'resourcepack', shaders: 'shader' };
    const type = String(payload.type || '').toLowerCase();
    const folder = type === 'instance' ? getGameRoot() : getContentFolder(aliases[type] || type);
    ensureDir(folder);
    const error = await shell.openPath(folder);
    return error ? { success: false, error } : { success: true, path: folder };
  } catch (error) {
    return { success: false, error: error.message };
  }
});
ipcMain.handle('open-user-mods-folder', async (event, payload = {}) => {
  const minecraftVersion = String(payload.minecraftVersion || getSettings(payload.nickname).minecraftVersion || '1.20.1');
  const folder = getUserModsPath(minecraftVersion);
  ensureDir(folder);
  await shell.openPath(folder);
  return { success: true, folder };
});

ipcMain.handle('install-java', async () => {
  installRecommendedJava();
  return {
    success: true,
    candidates: collectJavaCandidates().map((candidate) => ({ path: candidate, major: getJavaMajorVersion(candidate) }))
  };
});

ipcMain.handle('java-rescan', async () => ({
  success: true,
  candidates: collectJavaCandidates().map((candidate) => ({ path: candidate, major: getJavaMajorVersion(candidate) })),
  recommendedJava: (() => {
    try { return resolveJava17(); } catch (err) { return null; }
  })()
}));

ipcMain.handle('updates-check', async () => ({ success: false, disabled: true, error: 'Автоматические обновления отключены.' }));

ipcMain.handle('updates-install', async () => ({ success: false, disabled: true, error: 'Автоматические обновления отключены.' }));

ipcMain.handle('diagnostics-get', async () => {
  try {
    return { success: true, diagnostics: collectDiagnostics() };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle('diagnostics-export', async () => {
  try {
    const zipPath = exportDiagnostics();
    await shell.showItemInFolder(zipPath);
    return { success: true, path: zipPath };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle('crash-analyze', async (event, payload = {}) => {
  try {
    const analysis = analyzeMinecraftCrash();
    if (payload.submit) {
      sendCrashReport(String(payload.nickname || '').trim(), analysis);
    }
    return analysis;
  } catch (err) {
    return { success: false, error: err.message || String(err), findings: [] };
  }
});

ipcMain.handle('repair-game', async (event, payload = {}) => {
  try {
    return { success: true, repaired: await repairGameRoot(String(payload.nickname || '').trim()) };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle('open-logs-folder', async () => {
  const logsDir = path.join(app.getPath('userData'), 'logs');
  ensureDir(logsDir);
  await shell.openPath(logsDir);
  return { success: true, folder: logsDir };
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

ipcMain.handle('choose-directory', async () => {
  const result = await dialog.showOpenDialog({
    properties: ['openDirectory']
  });

  if (result.canceled || result.filePaths.length === 0) {
    return null;
  }

  return {
    path: result.filePaths[0],
    name: path.basename(result.filePaths[0])
  };
});

ipcMain.handle('game-storage-info', () => gameStorage.info());
ipcMain.handle('game-storage-change', (event, payload = {}) => {
  try {
    if (activeLaunches.size) throw new Error('Close Minecraft before changing the game folder.');
    if (!payload.path && !payload.useDefault) throw new Error('Choose a folder.');
    return { success: true, ...gameStorage.schedule(payload.useDefault ? gameStorage.defaultRoot : String(payload.path)) };
  } catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle('get-asset-preview', async (event, filePath) => {
  try {
    return { success: true, preview: readAssetPreview(filePath) };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

const skinService = new SkinService({
  root: path.join(app.getPath('userData'), 'skin-album'), store,
  getSession: token => {
    const stored = getStoredSession();
    if (stored?.sessionToken !== token) throw new Error('Аккаунт изменился. Повторите действие для текущего аккаунта.');
    return activeSessions.get(token);
  }, getAuth: getSessionMinecraftAuth, saveSettings, getSettings
});
ipcMain.handle('skin-album', async (event, payload = {}) => {
  try { return { success: true, items: skinService.list(payload.sessionToken) }; }
  catch (error) { return { success: false, error: error.message }; }
});
ipcMain.handle('skin-apply', async (event, payload = {}) => {
  try { return { success: true, ...await skinService.apply(payload) }; }
  catch (error) { return { success: false, error: error.message }; }
});

ipcMain.handle('skin-download-by-nickname', async (event, payload = {}) => {
  try {
    const file = await downloadSkinByNickname(payload.nickname);
    return {
      success: true,
      file,
      preview: readAssetPreview(file.path)
    };
  } catch (err) {
    return { success: false, error: err.message || String(err) };
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
    if (getDiscordService().rpcContext) {
      const context = getDiscordService().rpcContext;
      updateDiscordRpc({ ...context, nickname: context.nickname || nickname });
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

  try {
    return await connectSpotify(nickname);
  } catch (err) {
    return { success: false, error: err.message || String(err) };
  }
});

ipcMain.handle('spotify-connect-complete', (event, payload = {}) => completeSpotifyAuth(String(payload.nickname || '').trim(), payload.flowId));
ipcMain.handle('spotify-connect-cancel', (event, payload = {}) => cancelSpotifyAuth(String(payload.nickname || '').trim(), payload.flowId));

ipcMain.handle('spotify-disconnect', async (event, payload = {}) => {
  const nickname = String(payload.nickname || '').trim();
  if (!nickname) {
    return { success: false, error: 'Профиль не найден.' };
  }

  cancelSpotifyAuth(nickname);
  return { success: true, profile: clearSpotifyProfile(nickname) };
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
    return {
      success: false,
      error: err.message || String(err),
      code: err.code || '',
      profile: err.profile || null
    };
  }
});

ipcMain.handle('launch-horizon', async (event, payload = {}) => {
  if (activeLaunches.size) return { success: false, error: 'Сначала закройте запущенную игру.' };
  const session = activeSessions.get(payload.user?.sessionToken);
  if (!session?.microsoft || session.guest) return { success: false, error: 'Для Horizon нужен Microsoft-аккаунт с Minecraft Java Edition.' };
  const key = payload.user.sessionToken;
  const settings = getSettings(session.nickname);
  if (!settings.experiments?.rustMinecraft) return { success: false, error: 'Включите RUST-версию Minecraft в экспериментальных настройках.' };
  const instance = findBuildInstance(session.nickname, payload.instanceId || settings.activeInstanceId);
  if (!instance) return { success: false, error: 'Сначала выберите сборку для Rust-запуска.' };
  const source = instancePaths.root(session.nickname, instance.id);
  const root = path.join(gameStorage.root, 'horizon', crypto.createHash('sha256').update(session.nickname).digest('hex').slice(0, 24), instance.id);
  const logs = new GameLogs({ root, directory: path.join(app.getPath('userData'), 'logs'), secrets: [key], emit: (channel, data) => event.sender.send(channel, data) });
  const state = new LaunchSession({
    record: entry => logs.lifecycle(entry),
    window: BrowserWindow.fromWebContents(event.sender),
    hideLauncherDuringGame: Boolean(settings.hideLauncherDuringGame),
    onFinish: code => {
      activeLaunches.delete(key);
      event.sender.send('launch-closed', code);
      if (state.process && code !== 0 && !state.stopRequested) event.sender.send('game-crashed', { code: code ?? 'UNKNOWN' });
      void logs.collect(code, state.stopRequested).catch(() => {});
    }
  });
  activeLaunches.set(key, state);
  try {
    const auth = await getSessionMinecraftAuth(key, session.nickname);
    if (auth?.access_token) logs.secrets.push(auth.access_token);
    state.checkpoint();
    state.setStage('horizon-api');
    const plan = await prepareHorizonLaunch({ executable: settings.horizonExecutable, resources: settings.horizonResources, root, auth });
    state.setStage('horizon-resources');
    plan.args[1] = await ensureHorizonResources({
      resources: settings.horizonResources,
      cacheRoot: path.join(gameStorage.root, 'horizon', 'resources'),
      checkpoint: () => state.checkpoint(),
      onProgress: progress => event.sender.send('launch-progress', progress)
    });
    state.checkpoint();
    state.setStage('horizon-instance-sync');
    const content = syncHorizonInstance(source, root);
    if (content.skippedJavaMods) event.sender.send('launch-log', 'Horizon: Java-моды не запускаются: ' + content.skippedJavaMods + '. Перенесено совместимое содержимое выбранной сборки.');
    state.checkpoint();
    const process = startHorizon(plan);
    state.attach(process);
    for (const stream of ['stdout', 'stderr']) process[stream].on('data', chunk => event.sender.send('launch-log', logs.write(stream, chunk.toString())));
    process.stdin.on('error', error => event.sender.send('launch-log', logs.write('stdin', error.message)));
    await new Promise((resolve, reject) => { process.once('spawn', resolve); process.once('error', reject); });
    process.stdin.end(JSON.stringify(plan.session));
    event.sender.send('launch-started', { engine: 'horizon' });
    if (settings.hideLauncherDuringGame) state.window?.hide();
    return { success: true, content, instanceId: instance.id };
  } catch (error) {
    state.finish(error.code === 'LAUNCH_CANCELLED' ? 0 : 1, null, error);
    return { success: false, error: logs.redact(error.message), code: error.code };
  }
});

ipcMain.handle('launch-minecraft', async (event, payload) => {
  const launchKey = payload.user?.sessionToken;
  if (activeLaunches.size) {
    return { success: false, error: 'Minecraft is already launching or running.' };
  }

  const detectedHz = Number(payload._displayRefreshRate);
  const maxFps = detectedHz > 1 && detectedHz <= 1000 ? Math.round(detectedHz) : getRefreshRateForSender(event.sender);
  const nickname = String(payload.user?.nickname || '').trim();
  const savedSettings = saveSettings({
    ...getSettings(nickname),
    ...(payload.settings || {}),
    memory: payload.memory || getSettings(nickname).memory,
    maxFps
  }, nickname);
  const settings = applySelectedInstanceToSettings(nickname, savedSettings);
  const root = getGameRoot();
  const user = payload.user || {};
  const launchWindow = BrowserWindow.fromWebContents(event.sender);
  const sessionState = activeSessions.get(user.sessionToken);
  const isGuest = Boolean(user.guest || sessionState?.guest);

  if (!user.nickname || !sessionState) {
    return { success: false, error: 'Launcher session expired. Log in again.' };
  }

  const selectedInstance = findBuildInstance(nickname, settings.activeInstanceId);
  if (!selectedInstance) {
    return {
      success: false,
      code: 'BUILD_INSTANCE_REQUIRED',
      error: 'Create a build instance or install a Modrinth modpack before first launch.'
    };
  }

  const requestedUniqueServices = false; // Removed UNIQUE API must not participate in local launches.
  const uniqueServicesAllowed = requestedUniqueServices && settings.modLoader === 'fabric';
  if (requestedUniqueServices && settings.modLoader !== 'fabric' && settings.projectId === 'unique') {
    settings.projectId = 'offline';
  }
  if (isGuest && settings.projectId === 'unique') {
    settings.projectId = 'offline';
  }

  if (settings.useUniqueMods === false && settings.projectId === 'unique') {
    settings.projectId = 'offline';
  }

  // Local launcher sessions are never invalidated by a removed external service.

  const gameLogs = new GameLogs({ root, directory: path.join(app.getPath('userData'), 'logs'), secrets: [user.sessionToken], emit: (channel, data) => event.sender.send(channel, data) });
  const launchState = new LaunchSession({
    record: entry => gameLogs.lifecycle(entry),
    window: launchWindow,
    hideLauncherDuringGame: Boolean(settings.hideLauncherDuringGame),
    onFinish: code => {
      activeLaunches.delete(user.sessionToken);
      stopPlayingDiscordRpc();
      event.sender.send('launch-closed', code);
      if (launchState.process && code !== 0 && !launchState.stopRequested && !launchState.cancelled) event.sender.send('game-crashed', { code: code ?? 'UNKNOWN' });
      gameLogs.collect(code, launchState.stopRequested).catch(error => event.sender.send('launch-log', `Log collection: ${error.message}`));
    }
  });
  activeLaunches.set(user.sessionToken, launchState);

  let _launchDebugPath = null;
  try {
    const launchLogsDir = path.join(app.getPath('userData'), 'logs');
    ensureDir(launchLogsDir);
    _launchDebugPath = path.join(launchLogsDir, 'launch-debug.log');
    fs.appendFileSync(_launchDebugPath, `${new Date().toISOString()}\tLAUNCH-START\t${String(settings.minecraftVersion||'')}\t${String(settings.modLoader||'')}\n`, { encoding: 'utf8' });
  } catch (e) {
    try { console.error('Failed to write launch start log:', e && (e.stack || e.message || e)); } catch (__) {}
  }

  try {
    ensureDir(root);
    launchState.setStage('version-and-instance');
    const repairedAssets = removeEmptyAssetObjects(root);
    const customLaunch = instanceLaunchOptions(selectedInstance);
    const versionProfile = await getVersionProfile(settings.minecraftVersion || '1.20.1');
    launchState.checkpoint();
    if (versionProfile.id && versionProfile.id !== settings.minecraftVersion) {
      settings.minecraftVersion = versionProfile.id;
    }
    if ((!settings.fabricLoaderVersion || settings.fabricLoaderVersion === 'latest') && versionProfile.fabricLoaderVersion) {
      settings.fabricLoaderVersion = versionProfile.fabricLoaderVersion;
    }
    if (uniqueServicesAllowed) {
      event.sender.send('launch-progress', { stage: 'assets', name: 'Uploading HD assets' });
      await syncRemoteLauncherAssets(user.nickname, settings);
    }
    const effectiveVersionProfile = uniqueServicesAllowed
      ? versionProfile
      : { ...versionProfile, useBundledMods: false, mods: [] };
    launchState.setStage('mods');
    event.sender.send('launch-progress', {
      stage: 'mods',
      name: uniqueServicesAllowed ? 'Checking project mods' : 'Removing UNIQUE mods'
    });
    if (!uniqueServicesAllowed) {
      removeProjectManagedMods(root, versionProfile);
    }
    finalizeAllPendingUserModDeletes();
    const requiredMods = await syncRequiredModsToGameRoot(root, effectiveVersionProfile, settings.buildProfile || 'normal', (progress) => {
      const percent = progress.total ? Math.round((progress.received / progress.total) * 100) : 0;
      event.sender.send('launch-progress', { stage: 'mods', name: progress.mod, percent });
    });
    const userMods = syncUserModsToGameRoot(root, settings.minecraftVersion || '1.20.1');
    await enforceModIntegrity(root, effectiveVersionProfile, settings.buildProfile || 'normal');
    const syncedMods = [...requiredMods, ...userMods];
    launchState.setStage('resource-packs');
    event.sender.send('launch-progress', { stage: 'assets', name: 'Building resource packs' });
    const wallpaperPack = null;
    const playerAssetsPack = buildPlayerAssets(root, settings);
    // Wallpaper belongs to the launcher only. Preserve all user resource packs.
    const optionsPath = path.join(root, 'options.txt');
    if (fs.existsSync(optionsPath)) {
      const original = fs.readFileSync(optionsPath, 'utf8');
      const updated = original.replace(/^(resourcePacks|incompatibleResourcePacks):(.*)$/gm, (line, key, value) => {
        try {
          const packs = JSON.parse(value);
          if (!Array.isArray(packs) || !packs.includes('file/ProjectMenuWallpaper.zip')) return line;
          return `${key}:${JSON.stringify(packs.filter(pack => pack !== 'file/ProjectMenuWallpaper.zip'))}`;
        } catch { return line; }
      });
      if (updated !== original) fs.writeFileSync(optionsPath, updated, 'utf8');
    }
    writePerformanceOptions(root, maxFps);
    const registeredServers = uniqueServicesAllowed ? await getRegisteredServers(settings.projectId || 'unique') : [];
    const launchServer = registeredServers[0] || settings.server || PROJECT_SERVER;
    launchState.setStage('loader');
    writeServersDat(root, registeredServers, { preserveExisting: true });
    event.sender.send('launch-progress', {
      stage: 'loader',
      name: `Preparing ${settings.modLoader === 'vanilla' ? 'Vanilla' : formatLoaderNameForLog(settings.modLoader)}`
    });
    const loader = await ensureSelectedLoaderVersion(root, settings);
    launchState.checkpoint();
    event.sender.send('launch-progress', { stage: 'java', name: 'Checking Java' });
    launchState.setStage('java-and-auth');
    const versionMetadata = JSON.parse(fs.readFileSync(path.join(root, 'versions', settings.minecraftVersion, `${settings.minecraftVersion}.json`), 'utf8'));
    const requiredJava = Number(versionMetadata.javaVersion?.majorVersion) || 17;
    const java = resolveJava17(settings.javaPath, requiredJava);
    const auth = await getSessionMinecraftAuth(user.sessionToken, user.nickname);
    if (auth?.access_token) gameLogs.secrets.push(auth.access_token);
    launchState.checkpoint();

    launcher.event.removeAllListeners('debug');
    launcher.event.removeAllListeners('data');
    launcher.event.removeAllListeners('download-status');
    launcher.event.removeAllListeners('close');
    launcher.event.removeAllListeners('error');

    launcher.event.on('debug', (data) => event.sender.send('launch-debug', gameLogs.write('debug', data)));
    launcher.event.on('data', (data) => event.sender.send('launch-log', gameLogs.write('stdout', data)));
    launcher.event.on('download-status', (data) => event.sender.send('launch-progress', data));
    launcher.event.on('close', (code) => {
      launchState.finish(code, launchState.process?.signalCode);
    });
    launcher.event.on('error', (data) => event.sender.send('launch-error', gameLogs.write('stderr', data)));

    const options = {
      authorization: auth,
      clientPackage: null,
      root,
      os: getOsName(),
      version: {
        number: settings.minecraftVersion || '1.20.1',
        type: settings.modLoader === 'vanilla' ? (supportedSnapshotVersionsCache.includes(settings.minecraftVersion) ? 'snapshot' : 'release') : formatLoaderNameForLog(settings.modLoader),
        ...(loader?.id ? { custom: loader.id } : {})
      },
      javaPath: java.path,
      memory: {
        min: String(settings.memory.min),
        max: String(settings.memory.max)
      },
      customArgs: mergeJvmArguments([
        '-XX:+UseG1GC',
        '-XX:+UnlockExperimentalVMOptions',
        '-XX:G1NewSizePercent=20',
        '-XX:G1ReservePercent=20',
        '-XX:MaxGCPauseMillis=50',
        '-Dsun.rmi.dgc.server.gcInterval=2147483646',
        ...(loader?.jvmArgs || []),
        `-Dproject.auth.user=${user.nickname}`,
        `-Dproject.auth.token=${user.sessionToken}`,
        `-Dproject.auth.hwid=${getHardwareIdHash()}`,
        `-Dproject.auth.signature=${signLauncherSession(user.nickname, user.sessionToken, getHardwareIdHash())}`,
        `-Dproject.auth.api=${UNIQUE_AUTH_VERIFY_URL || ''}`,
        `-Dproject.launcher.api=${UNIQUE_API_URL || ''}`,
        `-Dproject.launcher.build=${UNIQUE_LAUNCHER_BUILD_ID}`
      ], customLaunch.jvm)
    };

    if (uniqueServicesAllowed && launchServer?.host) {
      options.server = {
        host: launchServer.host,
        port: String(launchServer.port || 25565)
      };
    }

    const originalSpawn = childProcess.spawn;
    childProcess.spawn = (...spawnArgs) => {
      // Helper processes (image conversion, Java probes, downloads) are not Minecraft.
      if (path.resolve(String(spawnArgs[0])).toLowerCase() !== path.resolve(options.javaPath).toLowerCase()
          || !Array.isArray(spawnArgs[1]) || !spawnArgs[1].includes('--gameDir')) return originalSpawn(...spawnArgs);
      launchState.checkpoint();
      spawnArgs[2] = { ...(spawnArgs[2] || {}), cwd: root, windowsHide: true };
      spawnArgs[1] = [...spawnArgs[1], ...customLaunch.game];
      const minecraftProcess = originalSpawn(...spawnArgs);
      launchState.attach(minecraftProcess);
      event.sender.send('launch-started', { pid: minecraftProcess.pid || null });
      if (launchState.hideLauncherDuringGame && launchState.window && !launchState.window.isDestroyed()) {
        launchState.window.hide();
      }
      return minecraftProcess;
    };

    try {
      launchState.setStage('game-download-and-start');
      await launcher.core(options);
      launchState.checkpoint();
    } finally {
      childProcess.spawn = originalSpawn;
    }

    if (!launchState.finished && launchState.process) startPlayingDiscordRpc(user, { ...settings, server: launchServer });

    if (!launchState.process) {
      const error = new Error('Minecraft did not create a process. See preparation logs for the cause.');
      error.code = 'MINECRAFT_NOT_STARTED';
      throw error;
    }

    try {
      const p = _launchDebugPath || path.join(app.getPath('userData'), 'logs', 'launch-debug.log');
      fs.appendFileSync(p, `${new Date().toISOString()}\tLAUNCH-SUCCESS\tpid:${launchState.process?.pid||''}\n`, { encoding: 'utf8' });
    } catch (e) {
      try { console.error('Failed to write launch success log:', e && (e.stack || e.message || e)); } catch (__) {}
    }

    return {
      success: true,
      syncedMods,
      wallpaperPack,
      playerAssetsPack,
      fabric: settings.modLoader === 'fabric' ? loader : null,
      loader,
      modLoader: settings.modLoader,
      java,
      maxFps,
      repairedAssets,
      running: !launchState.finished && Boolean(launchState.process),
      pid: launchState.process?.pid || null
    };
  } catch (err) {
    try {
      const p = _launchDebugPath || path.join(app.getPath('userData'), 'logs', 'launch-debug.log');
      fs.appendFileSync(p, `${new Date().toISOString()}\tLAUNCH-ERROR\t${gameLogs.write('error', err.stack || err.message || err)}\n`, { encoding: 'utf8' });
    } catch (e) {
      try { console.error('Failed to write launch error log:', e && (e.stack || e.message || e)); } catch (__) {}
    }
    launchState.finish(err.code === 'LAUNCH_CANCELLED' ? 0 : 1, null, err);
    return {
      success: false,
      error: err.message || String(err),
      code: err.code || '',
      javaInstallUrl: err.code === 'JAVA_REQUIRED' ? `https://adoptium.net/temurin/releases/?version=${Math.max(21, err.minimumJava || 21)}` : '',
      minimumJava: err.minimumJava || null
    };
  }
});

ipcMain.handle('get-launch-state', async () => {
  const state = [...activeLaunches.values()][0];
  if (state?.process && (state.process.exitCode !== null || state.process.signalCode)) state.finish(state.process.exitCode, state.process.signalCode);
  return { active: Boolean(state && !state.finished), running: Boolean(state?.process && !state.finished), pid: state?.process?.pid || null };
});

ipcMain.handle('stop-minecraft', async (event, payload = {}) => {
  const launchKey = payload.sessionToken;
  const launchState = activeLaunches.get(launchKey);

  if (!launchState) {
    return { success: true, stopped: true };
  }
  return launchState.stop();
});

if (!process.env.UNIQUE_WEBVIEW2_BACKEND) {
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
}
