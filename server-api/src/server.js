require('dotenv').config();

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const speakeasy = require('speakeasy');
const { Pool } = require('pg');

const app = express();
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
app.disable('x-powered-by');
app.set('trust proxy', Number(process.env.TRUST_PROXY || 1));

function readEnvValueOrFile(value) {
  const text = String(value || '').trim();
  if (!text) return '';
  if (text.includes('-----BEGIN')) return text.replace(/\\n/g, '\n');
  try {
    const fullPath = path.isAbsolute(text) ? text : path.join(__dirname, '..', text);
    return fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf8') : text;
  } catch (err) {
    return text;
  }
}
const port = Number(process.env.PORT || 48129);
const sessionTtlHours = Number(process.env.SESSION_TTL_HOURS || 24);
const manifestPath = process.env.MOD_MANIFEST_PATH || path.join(__dirname, '..', 'manifest.json');
const serverRegistrySecret = process.env.SERVER_REGISTRY_SECRET || '';
const adminToken = process.env.ADMIN_TOKEN || '';
const manifestPrivateKey = readEnvValueOrFile(process.env.MANIFEST_PRIVATE_KEY || '');
const singleSession = process.env.SINGLE_SESSION !== 'false';
const allowedLauncherBuilds = String(process.env.ALLOWED_LAUNCHER_BUILDS || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const cdnRoot = process.env.CDN_ROOT || path.join(__dirname, '..', 'cdn');
const updatesRoot = process.env.UPDATES_ROOT || path.join(__dirname, '..', 'updates');
const logsRoot = process.env.LOGS_ROOT || path.join(__dirname, '..', 'logs');
const apiLogPath = path.join(logsRoot, 'api.log');
const maxPlayerAssetBytes = Math.max(8, Number(process.env.MAX_PLAYER_ASSET_MB || 32)) * 1024 * 1024;
const jsonBodyLimit = process.env.JSON_BODY_LIMIT || '64mb';
const schemaPath = process.env.DB_SCHEMA_PATH || path.join(__dirname, '..', 'schema.sql');
const apiHost = process.env.API_HOST || '0.0.0.0';
const rateLimitWindowMs = Number(process.env.RATE_LIMIT_WINDOW_MS || 60 * 1000);
const rateLimitMax = Number(process.env.RATE_LIMIT_MAX || 1200);
const authRateLimitMax = Number(process.env.AUTH_RATE_LIMIT_MAX || 120);
const corsOrigins = String(process.env.CORS_ORIGIN || '*')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);
const allowAnyCorsOrigin = corsOrigins.length === 0 || corsOrigins.includes('*');
const spotifyClientId = String(process.env.SPOTIFY_CLIENT_ID || process.env.UNIQUE_SPOTIFY_CLIENT_ID || '').trim();

const corsMiddleware = cors({
  origin: allowAnyCorsOrigin
    ? '*'
    : (origin, callback) => callback(null, !origin || corsOrigins.includes(origin)),
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Launcher-Build', 'X-Server-Registry-Secret'],
  maxAge: 86400,
  optionsSuccessStatus: 204
});

app.use(corsMiddleware);
app.options('*', corsMiddleware);
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginResourcePolicy: { policy: 'cross-origin' }
}));
app.use(express.json({ limit: jsonBodyLimit }));
app.use(rateLimit({
  windowMs: rateLimitWindowMs,
  max: rateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS'
    || req.path === '/health'
    || req.path === '/health/ready'
    || req.path.startsWith('/cdn/')
    || req.path.startsWith('/updates/')
}));
app.use('/auth', rateLimit({
  windowMs: rateLimitWindowMs,
  max: authRateLimitMax,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.method === 'OPTIONS'
}));
app.use('/cdn', express.static(cdnRoot, {
  immutable: true,
  maxAge: '30d',
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));
app.use('/updates', express.static(updatesRoot, {
  maxAge: '5m',
  setHeaders: (res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
}));

fs.mkdirSync(logsRoot, { recursive: true });

async function applyDatabaseSchema() {
  if (process.env.AUTO_MIGRATE === 'false') {
    return;
  }
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Database schema file not found: ${schemaPath}`);
  }
  await pool.query(fs.readFileSync(schemaPath, 'utf8'));
}

function logEvent(type, data = {}) {
  const record = {
    ts: new Date().toISOString(),
    type,
    ...data
  };
  fs.appendFile(apiLogPath, `${JSON.stringify(record)}\n`, () => {});
}

app.use((req, res, next) => {
  const startedAt = Date.now();
  res.on('finish', () => {
    logEvent('request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      ms: Date.now() - startedAt,
      ip: req.ip
    });
  });
  next();
});

function validateNickname(nickname) {
  return /^[A-Za-z0-9_]{3,16}$/.test(nickname);
}

function publicUser(row) {
  return { id: row.id, nickname: row.nickname, role: row.role || 'player', status: row.status || 'active' };
}

async function isHwidBanned(hwidHash) {
  if (!hwidHash) return true;
  const result = await pool.query('select 1 from hwid_bans where hwid_hash = $1 limit 1', [hwidHash]);
  return result.rowCount > 0;
}

async function findUser(nickname) {
  const result = await pool.query('select * from users where lower(nickname) = lower($1) limit 1', [nickname]);
  return result.rows[0] || null;
}

function getJson(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const request = https.request(url, {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        ...headers
      },
      timeout: 12000
    }, (response) => {
      let body = '';
      response.setEncoding('utf8');
      response.on('data', (chunk) => { body += chunk; });
      response.on('end', () => {
        let parsed = null;
        try {
          parsed = body ? JSON.parse(body) : null;
        } catch (err) {
          reject(new Error('Invalid JSON response.'));
          return;
        }
        if (response.statusCode < 200 || response.statusCode >= 300) {
          reject(new Error(parsed?.errorMessage || parsed?.error || `HTTP ${response.statusCode}`));
          return;
        }
        resolve(parsed);
      });
    });
    request.on('timeout', () => request.destroy(new Error('Request timed out.')));
    request.on('error', reject);
    request.end();
  });
}

async function createSession(userId, hwidHash) {
  const token = crypto.randomBytes(32).toString('hex');
  if (singleSession) {
    await pool.query('delete from launcher_sessions where user_id = $1', [userId]);
  }
  await pool.query(
    `insert into launcher_sessions(token, user_id, hwid_hash, expires_at)
     values ($1, $2, $3, now() + ($4::text || ' hours')::interval)`,
    [token, userId, hwidHash, sessionTtlHours]
  );
  return token;
}

function readManifest() {
  const fallback = path.join(__dirname, '..', 'manifest.example.json');
  const file = fs.existsSync(manifestPath) ? manifestPath : fallback;
  const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
  if (!manifest.cdnBaseUrl && process.env.CDN_BASE_URL) {
    manifest.cdnBaseUrl = process.env.CDN_BASE_URL;
  }
  if (!Array.isArray(manifest.blockedMods)) {
    manifest.blockedMods = [];
  }
  return manifest;
}

function stableJson(value) {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

function signPayload(payload) {
  if (!manifestPrivateKey) return '';
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(typeof payload === 'string' ? payload : stableJson(payload));
  signer.end();
  return signer.sign(manifestPrivateKey, 'base64');
}

function writeManifest(manifest) {
  fs.mkdirSync(path.dirname(manifestPath), { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
}

function sanitizeNews(row) {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    url: row.url || '',
    date: row.created_at
  };
}

async function recordSecurityEvent(eventType, data = {}) {
  try {
    await pool.query(
      'insert into security_events(nickname, hwid_hash, event_type, details) values ($1, $2, $3, $4::jsonb)',
      [data.nickname || null, data.hwidHash || null, eventType, JSON.stringify(data.details || {})]
    );
  } catch (err) {
    logEvent('security_event.failed', { eventType, error: err.message });
  }
}

app.get('/health', (req, res) => {
  res.json({ ok: true, service: 'unique-launcher-api' });
});

app.get('/launcher/config', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.json({
    success: true,
    spotifyClientId,
    spotify: {
      clientId: spotifyClientId,
      redirectUri: 'http://127.0.0.1:48128/spotify/callback',
      authMode: 'pkce'
    }
  });
});

app.get('/health/ready', async (req, res) => {
  const checks = {
    database: false,
    adminToken: Boolean(adminToken),
    cdnRoot: false,
    updatesRoot: false,
    manifestReadable: false,
    manifestSigning: Boolean(manifestPrivateKey)
  };
  try {
    await pool.query('select 1');
    checks.database = true;
  } catch (err) {
    checks.database = false;
  }
  try {
    fs.mkdirSync(cdnRoot, { recursive: true });
    checks.cdnRoot = fs.existsSync(cdnRoot);
  } catch (err) {
    checks.cdnRoot = false;
  }
  try {
    fs.mkdirSync(updatesRoot, { recursive: true });
    checks.updatesRoot = fs.existsSync(updatesRoot);
  } catch (err) {
    checks.updatesRoot = false;
  }
  try {
    readManifest();
    checks.manifestReadable = true;
  } catch (err) {
    checks.manifestReadable = false;
  }
  const ok = checks.database && checks.adminToken && checks.cdnRoot && checks.updatesRoot && checks.manifestReadable;
  res.status(ok ? 200 : 503).json({ ok, checks });
});

app.get('/launcher/manifest', (req, res) => {
  const manifest = readManifest();
  const signature = signPayload(manifest);
  res.json(signature ? { signedPayload: manifest, signature } : manifest);
});

app.get('/launcher/news', async (req, res) => {
  try {
    const result = await pool.query(
      'select id, title, body, url, created_at from launcher_news where visible = true order by created_at desc limit 20'
    );
    if (result.rowCount > 0) {
      return res.json({ success: true, news: result.rows.map(sanitizeNews) });
    }
    const manifest = readManifest();
    res.json({ success: true, news: Array.isArray(manifest.news) ? manifest.news : [] });
  } catch (err) {
    const manifest = readManifest();
    res.json({ success: true, news: Array.isArray(manifest.news) ? manifest.news : [] });
  }
});

app.get('/launcher/build-profiles', (req, res) => {
  const manifest = readManifest();
  res.json({ success: true, buildProfiles: Array.isArray(manifest.buildProfiles) ? manifest.buildProfiles : [] });
});

app.get('/launcher/servers', async (req, res) => {
  try {
    res.setHeader('Cache-Control', 'no-store');
    const projectId = String(req.query.projectId || req.query.project || '').trim();
    const params = [];
    let projectWhere = '';
    if (projectId) {
      params.push(projectId);
      projectWhere = ` and project_id = $${params.length}`;
    }
    const result = await pool.query(
      `select id, project_id, name, host, port, version, motd, player_count, max_players, tps, priority, last_seen_at
       from project_servers
       where last_seen_at > now() - interval '10 minutes'
       ${projectWhere}
       order by priority desc, last_seen_at desc, name asc`,
      params
    );
    res.json({ success: true, servers: result.rows, projectId: projectId || null });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Server list failed.' });
  }
});

app.post('/servers/heartbeat', async (req, res) => {
  try {
    if (serverRegistrySecret) {
      const auth = String(req.headers.authorization || '');
      if (auth !== `Bearer ${serverRegistrySecret}`) {
        return res.status(401).json({ success: false, error: 'Invalid registry token.' });
      }
    }

    const id = String(req.body.id || '').trim();
    const projectId = String(req.body.projectId || req.body.project_id || 'unique').trim() || 'unique';
    const name = String(req.body.name || '').trim();
    const host = String(req.body.host || '').trim();
    const portValue = Number(req.body.port || 25565);
    const portNumber = Number.isInteger(portValue) && portValue > 0 && portValue <= 65535 ? portValue : 25565;
    if (!id || !name || !host) {
      return res.status(400).json({ success: false, error: 'Missing server identity.' });
    }

    await pool.query(
      `insert into project_servers(id, project_id, name, host, port, version, motd, player_count, max_players, tps, priority, last_seen_at)
       values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, now())
       on conflict (id) do update set
         project_id = excluded.project_id,
         name = excluded.name,
         host = excluded.host,
         port = excluded.port,
         version = excluded.version,
         motd = excluded.motd,
         player_count = excluded.player_count,
         max_players = excluded.max_players,
         tps = excluded.tps,
         priority = excluded.priority,
         last_seen_at = now()`,
      [
        id,
        projectId,
        name,
        host,
        portNumber,
        req.body.version || null,
        req.body.motd || null,
        Number(req.body.playerCount || 0),
        Number(req.body.maxPlayers || 0),
        req.body.tps == null ? null : Number(req.body.tps),
        Number(req.body.priority || 0)
      ]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Heartbeat failed.' });
  }
});

app.post('/auth/check', async (req, res) => {
  try {
    const nickname = String(req.body.nickname || '').trim();
    if (!validateNickname(nickname)) {
      return res.json({ success: true, registered: false });
    }

    const user = await findUser(nickname);
    res.json({ success: true, registered: Boolean(user) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Account check failed.' });
  }
});

app.post('/auth/register', async (req, res) => {
  try {
    const nickname = String(req.body.nickname || '').trim();
    const passwordSha256 = String(req.body.passwordSha256 || '').trim().toLowerCase();
    const hwidHash = String(req.body.hwidHash || '').trim();
    const enableTOTP = Boolean(req.body.enableTOTP);

    if (!validateNickname(nickname)) {
      return res.status(400).json({ success: false, error: 'Invalid nickname.' });
    }
    if (!/^[a-f0-9]{64}$/.test(passwordSha256)) {
      return res.status(400).json({ success: false, error: 'Invalid password hash.' });
    }
    if (await isHwidBanned(hwidHash)) {
      return res.status(403).json({ success: false, error: 'HWID is banned.' });
    }
    const existing = await findUser(nickname);
    if (existing) {
      logEvent('auth.register.conflict', { nickname });
      await recordSecurityEvent('register_conflict', { nickname, hwidHash });
      return res.status(409).json({ success: false, error: 'Nickname is already registered.' });
    }

    let totpSecret = null;
    let otpauthUrl = null;
    if (enableTOTP) {
      const secret = speakeasy.generateSecret({
        length: 20,
        name: `UNIQUE LAUNCHER (${nickname})`,
        issuer: 'UNIQUE LAUNCHER'
      });
      totpSecret = secret.base32;
      otpauthUrl = secret.otpauth_url;
    }

    await pool.query(
      'insert into users(nickname, password_hash, totp_secret) values ($1, $2, $3)',
      [nickname, bcrypt.hashSync(passwordSha256, 12), totpSecret]
    );

    logEvent('auth.register.success', { nickname });
    await recordSecurityEvent('register_success', { nickname, hwidHash });
    res.json({ success: true, enabledTOTP: Boolean(totpSecret), totpUrl: otpauthUrl });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Register failed.' });
  }
});

app.post('/auth/login', async (req, res) => {
  try {
    const nickname = String(req.body.nickname || '').trim();
    const passwordSha256 = String(req.body.passwordSha256 || '').trim().toLowerCase();
    const totpCode = String(req.body.totpCode || '').trim();
    const hwidHash = String(req.body.hwidHash || '').trim();
    const launcherBuild = String(req.body.launcherBuild || '').trim();
    const user = await findUser(nickname);

    if (!user || !/^[a-f0-9]{64}$/.test(passwordSha256) || !bcrypt.compareSync(passwordSha256, user.password_hash)) {
      logEvent('auth.login.failed', { nickname });
      await recordSecurityEvent('login_failed', { nickname, hwidHash });
      return res.status(401).json({ success: false, error: 'Invalid nickname or password.' });
    }
    if (await isHwidBanned(hwidHash)) {
      return res.status(403).json({ success: false, error: 'HWID is banned.' });
    }
    if (allowedLauncherBuilds.length && !allowedLauncherBuilds.includes(launcherBuild)) {
      await recordSecurityEvent('launcher_build_rejected_login', { nickname, hwidHash, details: { launcherBuild } });
      return res.status(403).json({ success: false, error: 'Launcher build is not allowed.' });
    }
    if (user.status && user.status !== 'active') {
      await recordSecurityEvent('login_rejected_status', { nickname, hwidHash, details: { status: user.status } });
      return res.status(403).json({ success: false, error: 'Account is not allowed to play.' });
    }
    if (user.totp_secret) {
      const ok = speakeasy.totp.verify({
        secret: user.totp_secret,
        encoding: 'base32',
        token: totpCode,
        window: 1
      });
      if (!ok) {
        return res.status(401).json({ success: false, error: 'Invalid authenticator code.' });
      }
    }

    const sessionToken = await createSession(user.id, hwidHash);
    logEvent('auth.login.success', { nickname });
    await recordSecurityEvent('login_success', { nickname, hwidHash });
    res.json({ success: true, sessionToken, user: publicUser(user) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Login failed.' });
  }
});

app.post('/auth/minecraft-license', async (req, res) => {
  try {
    const requestedNickname = String(req.body.nickname || '').trim();
    const profileId = String(req.body.profileId || '').trim();
    const minecraftAccessToken = String(req.body.minecraftAccessToken || '').trim();
    const hwidHash = String(req.body.hwidHash || '').trim();
    const launcherBuild = String(req.body.launcherBuild || '').trim();

    if (!minecraftAccessToken || !profileId || !validateNickname(requestedNickname)) {
      return res.status(400).json({ success: false, error: 'Invalid Minecraft license payload.' });
    }
    if (await isHwidBanned(hwidHash)) {
      return res.status(403).json({ success: false, error: 'HWID is banned.' });
    }
    if (allowedLauncherBuilds.length && !allowedLauncherBuilds.includes(launcherBuild)) {
      await recordSecurityEvent('launcher_build_rejected_license', { nickname: requestedNickname, hwidHash, details: { launcherBuild } });
      return res.status(403).json({ success: false, error: 'Launcher build is not allowed.' });
    }

    const profile = await getJson('https://api.minecraftservices.com/minecraft/profile', {
      Authorization: `Bearer ${minecraftAccessToken}`
    });
    if (!profile?.id || !profile?.name || String(profile.id) !== profileId || String(profile.name).toLowerCase() !== requestedNickname.toLowerCase()) {
      return res.status(401).json({ success: false, error: 'Minecraft license token does not match this profile.' });
    }

    let user = await findUser(profile.name);
    if (!user) {
      const passwordHash = bcrypt.hashSync(`minecraft-license:${profile.id}:${crypto.randomBytes(16).toString('hex')}`, 12);
      await pool.query(
        'insert into users(nickname, password_hash, role, status) values ($1, $2, $3, $4)',
        [profile.name, passwordHash, 'player', 'active']
      );
      user = await findUser(profile.name);
    }
    if (user.status && user.status !== 'active') {
      await recordSecurityEvent('license_login_rejected_status', { nickname: profile.name, hwidHash, details: { status: user.status } });
      return res.status(403).json({ success: false, error: 'Account is not allowed to play.' });
    }

    const sessionToken = await createSession(user.id, hwidHash);
    logEvent('auth.minecraft_license.success', { nickname: profile.name });
    await recordSecurityEvent('minecraft_license_success', { nickname: profile.name, hwidHash, details: { profileId: profile.id } });
    res.json({ success: true, sessionToken, user: publicUser(user), profileId: profile.id });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Minecraft license login failed.' });
  }
});

app.post('/auth/logout', async (req, res) => {
  try {
    const sessionToken = String(req.body.sessionToken || '').trim();
    if (sessionToken) {
      await pool.query('delete from launcher_sessions where token = $1', [sessionToken]);
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Logout failed.' });
  }
});

app.post('/auth/session/rotate', async (req, res) => {
  try {
    const nickname = String(req.body.nickname || '').trim();
    const sessionToken = String(req.body.sessionToken || '').trim();
    const hwidHash = String(req.body.hwidHash || '').trim();
    const launcherBuild = String(req.body.launcherBuild || '').trim();
    const result = await pool.query(
      `select s.user_id from launcher_sessions s
       join users u on u.id = s.user_id
       where s.token = $1 and lower(u.nickname) = lower($2)
         and s.hwid_hash = $3 and s.expires_at > now()
       limit 1`,
      [sessionToken, nickname, hwidHash]
    );
    if (result.rowCount !== 1) {
      return res.status(401).json({ success: false, error: 'Invalid session.' });
    }
    await pool.query('delete from launcher_sessions where token = $1', [sessionToken]);
    const nextToken = await createSession(result.rows[0].user_id, hwidHash);
    res.json({ success: true, sessionToken: nextToken });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Session rotation failed.' });
  }
});

app.post('/auth/password-reset/request', async (req, res) => {
  try {
    const nickname = String(req.body.nickname || '').trim();
    const user = await findUser(nickname);
    if (!user) {
      return res.json({ success: true });
    }
    const token = crypto.randomBytes(32).toString('hex');
    await pool.query(
      `insert into password_reset_tokens(token, user_id, expires_at)
       values ($1, $2, now() + interval '30 minutes')`,
      [token, user.id]
    );
    logEvent('password_reset.created', { nickname, token });
    res.json({ success: true, resetToken: process.env.NODE_ENV === 'production' ? undefined : token });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Password reset request failed.' });
  }
});

app.post('/auth/password-reset/confirm', async (req, res) => {
  try {
    const token = String(req.body.token || '').trim();
    const passwordSha256 = String(req.body.passwordSha256 || '').trim().toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(passwordSha256)) {
      return res.status(400).json({ success: false, error: 'Invalid password hash.' });
    }
    const result = await pool.query(
      `select user_id from password_reset_tokens
       where token = $1 and used_at is null and expires_at > now()
       limit 1`,
      [token]
    );
    if (result.rowCount !== 1) {
      return res.status(401).json({ success: false, error: 'Invalid reset token.' });
    }
    await pool.query('update users set password_hash = $1 where id = $2', [
      bcrypt.hashSync(passwordSha256, 12),
      result.rows[0].user_id
    ]);
    await pool.query('update password_reset_tokens set used_at = now() where token = $1', [token]);
    await pool.query('delete from launcher_sessions where user_id = $1', [result.rows[0].user_id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Password reset failed.' });
  }
});

app.post('/launcher/session/verify', async (req, res) => {
  try {
    const nickname = String(req.body.nickname || '').trim();
    const sessionToken = String(req.body.sessionToken || '').trim();
    const hwidHash = String(req.body.hwidHash || '').trim();
    const launcherBuild = String(req.body.launcherBuild || '').trim();

    if (await isHwidBanned(hwidHash)) {
      return res.status(403).json({ success: false, error: 'HWID is banned.' });
    }
    if (allowedLauncherBuilds.length && !allowedLauncherBuilds.includes(launcherBuild)) {
      await recordSecurityEvent('launcher_build_rejected', { nickname, hwidHash, details: { launcherBuild } });
      return res.status(403).json({ success: false, error: 'Launcher build is not allowed.' });
    }

    const result = await pool.query(
      `select s.token, u.nickname, u.status
       from launcher_sessions s
       join users u on u.id = s.user_id
       where s.token = $1 and lower(u.nickname) = lower($2)
         and s.hwid_hash = $3 and s.expires_at > now()
         and u.status = 'active'
       limit 1`,
      [sessionToken, nickname, hwidHash]
    );

    res.json({ success: result.rowCount === 1 });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Verify failed.' });
  }
});

app.post('/launcher/profile', async (req, res) => {
  try {
    const nickname = String(req.body.nickname || '').trim();
    const sessionToken = String(req.body.sessionToken || '').trim();
    const hwidHash = String(req.body.hwidHash || '').trim();
    const verify = await pool.query(
      `select u.id
       from launcher_sessions s
       join users u on u.id = s.user_id
       where s.token = $1 and lower(u.nickname) = lower($2)
         and s.hwid_hash = $3 and s.expires_at > now()
       limit 1`,
      [sessionToken, nickname, hwidHash]
    );

    if (verify.rowCount !== 1) {
      return res.status(401).json({ success: false, error: 'Invalid session.' });
    }

    const userId = verify.rows[0].id;
    const hasSpotifyConnected = typeof req.body.spotifyConnected === 'boolean';
    const hasPlaytimeSeconds = Number.isFinite(Number(req.body.playtimeSeconds));
    const playtimeSeconds = hasPlaytimeSeconds
      ? Math.max(0, Math.floor(Number(req.body.playtimeSeconds)))
      : null;
    await pool.query(
      `insert into player_profiles(
         user_id, youtube_url, twitch_url, spotify_connected, spotify_display_name, music, playtime_seconds, updated_at
       ) values ($1, $2, $3, coalesce($4, false), $5, $6::jsonb, coalesce($8, 0), now())
       on conflict (user_id) do update set
         youtube_url = coalesce(excluded.youtube_url, player_profiles.youtube_url),
         twitch_url = coalesce(excluded.twitch_url, player_profiles.twitch_url),
         spotify_connected = case when $7 then excluded.spotify_connected else player_profiles.spotify_connected end,
         spotify_display_name = coalesce(excluded.spotify_display_name, player_profiles.spotify_display_name),
         music = case when excluded.music = '{}'::jsonb then player_profiles.music else excluded.music end,
         playtime_seconds = case when $9 then greatest(player_profiles.playtime_seconds, excluded.playtime_seconds) else player_profiles.playtime_seconds end,
         updated_at = now()`,
      [
        userId,
        req.body.youtubeUrl || null,
        req.body.twitchUrl || null,
        hasSpotifyConnected ? Boolean(req.body.spotifyConnected) : null,
        req.body.spotifyDisplayName || null,
        JSON.stringify(req.body.music || {}),
        hasSpotifyConnected,
        playtimeSeconds,
        hasPlaytimeSeconds
      ]
    );

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Profile update failed.' });
  }
});

app.post('/launcher/crash-report', async (req, res) => {
  try {
    const nickname = String(req.body.nickname || '').trim();
    const sessionToken = String(req.body.sessionToken || '').trim();
    const hwidHash = String(req.body.hwidHash || '').trim();
    let userId = null;
    if (nickname && sessionToken && hwidHash) {
      const verify = await pool.query(
        `select u.id
         from launcher_sessions s
         join users u on u.id = s.user_id
         where s.token = $1 and lower(u.nickname) = lower($2)
           and s.hwid_hash = $3 and s.expires_at > now()
         limit 1`,
        [sessionToken, nickname, hwidHash]
      );
      userId = verify.rows[0]?.id || null;
    }

    const analysis = req.body.analysis || {};
    const firstFinding = Array.isArray(analysis.findings) ? analysis.findings[0] : null;
    const fingerprint = crypto.createHash('sha256')
      .update(`${firstFinding?.title || 'unknown'}:${firstFinding?.detail || ''}`)
      .digest('hex');
    await pool.query(
      `insert into crash_reports(user_id, nickname, hwid_hash, analysis, diagnostics, fingerprint)
       values ($1, $2, $3, $4::jsonb, $5::jsonb, $6)`,
      [
        userId,
        nickname || null,
        hwidHash || null,
        JSON.stringify(analysis),
        JSON.stringify(req.body.diagnostics || {}),
        fingerprint
      ]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Crash report failed.' });
  }
});

app.post('/launcher/assets/upload', async (req, res) => {
  try {
    const nickname = String(req.body.nickname || '').trim();
    const sessionToken = String(req.body.sessionToken || '').trim();
    const hwidHash = String(req.body.hwidHash || '').trim();
    const type = ['skin', 'cape', 'wallpaper'].includes(req.body.type) ? req.body.type : '';
    const extension = String(req.body.extension || 'png').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 8) || 'png';
    const dataBase64 = String(req.body.dataBase64 || '');
    const metadata = req.body.metadata && typeof req.body.metadata === 'object' && !Array.isArray(req.body.metadata)
      ? req.body.metadata
      : {};
    const assetMetadata = {
      skinModel: metadata.skinModel === 'slim' ? 'slim' : metadata.skinModel === 'default' ? 'default' : undefined,
      animated: Boolean(metadata.animated)
    };
    if (!type || !dataBase64) {
      return res.status(400).json({ success: false, error: 'Missing asset payload.' });
    }

    const verify = await pool.query(
      `select u.id
       from launcher_sessions s
       join users u on u.id = s.user_id
       where s.token = $1 and lower(u.nickname) = lower($2)
         and s.hwid_hash = $3 and s.expires_at > now()
       limit 1`,
      [sessionToken, nickname, hwidHash]
    );
    if (verify.rowCount !== 1) {
      return res.status(401).json({ success: false, error: 'Invalid session.' });
    }

    const bytes = Buffer.from(dataBase64, 'base64');
    if (bytes.length <= 0 || bytes.length > maxPlayerAssetBytes) {
      return res.status(400).json({ success: false, error: 'Invalid asset size.' });
    }

    const hash = crypto.createHash('sha256').update(bytes).digest('hex');
    const relativeDir = path.join('player-assets', nickname.toLowerCase(), type);
    const targetDir = path.join(cdnRoot, relativeDir);
    fs.mkdirSync(targetDir, { recursive: true });
    const fileName = `${hash}.${extension}`;
    fs.writeFileSync(path.join(targetDir, fileName), bytes);
    const cdnBaseUrl = process.env.CDN_BASE_URL || '';
    const urlPath = `/cdn/${relativeDir.replace(/\\/g, '/')}/${fileName}`;
    const url = cdnBaseUrl ? `${cdnBaseUrl.replace(/\/+$/, '')}/${relativeDir.replace(/\\/g, '/')}/${fileName}` : urlPath;
    await pool.query(
      `insert into player_assets(user_id, asset_type, url, sha256, extension, metadata, updated_at)
       values ($1, $2, $3, $4, $5, $6::jsonb, now())
       on conflict (user_id, asset_type) do update set
         url = excluded.url,
         sha256 = excluded.sha256,
         extension = excluded.extension,
         metadata = excluded.metadata,
         updated_at = now()`,
      [verify.rows[0].id, type, url, hash, extension, JSON.stringify(assetMetadata)]
    );
    res.json({ success: true, sha256: hash, url });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Asset upload failed.' });
  }
});

app.get('/player', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'player', 'index.html'));
});

app.get('/player/api/profile/:nickname', async (req, res) => {
  try {
    const nickname = String(req.params.nickname || '').trim();
    const user = await findUser(nickname);
    if (!user || user.status !== 'active') {
      return res.status(404).json({ success: false, error: 'Player not found.' });
    }
    const [profile, assets] = await Promise.all([
      pool.query('select youtube_url, twitch_url, spotify_connected, spotify_display_name, music, playtime_seconds, updated_at from player_profiles where user_id = $1', [user.id]),
      pool.query('select asset_type, url, sha256, extension, metadata, updated_at from player_assets where user_id = $1', [user.id])
    ]);
    res.json({
      success: true,
      player: publicUser(user),
      profile: profile.rows[0] || {},
      assets: assets.rows
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Profile failed.' });
  }
});

function requireAdmin(req, res, next) {
  if (!adminToken) {
    return res.status(503).json({ success: false, error: 'ADMIN_TOKEN is not configured.' });
  }
  const auth = String(req.headers.authorization || '');
  if (auth !== `Bearer ${adminToken}`) {
    return res.status(401).json({ success: false, error: 'Invalid admin token.' });
  }
  next();
}

app.get('/admin', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'admin', 'index.html'));
});

app.get('/admin/api/summary', requireAdmin, async (req, res) => {
  try {
    const [users, sessions, bans, servers] = await Promise.all([
      pool.query('select count(*)::int as count from users'),
      pool.query("select count(*)::int as count from launcher_sessions where expires_at > now()"),
      pool.query('select count(*)::int as count from hwid_bans'),
      pool.query("select count(*)::int as count from project_servers where last_seen_at > now() - interval '10 minutes'")
    ]);
    res.json({
      success: true,
      users: users.rows[0].count,
      activeSessions: sessions.rows[0].count,
      hwidBans: bans.rows[0].count,
      onlineServers: servers.rows[0].count
    });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Summary failed.' });
  }
});

app.get('/admin/api/users', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `select u.id, u.nickname, u.role, u.status, u.created_at, p.youtube_url, p.twitch_url, p.spotify_connected, p.updated_at
       from users u
       left join player_profiles p on p.user_id = u.id
       order by u.created_at desc
       limit 200`
    );
    res.json({ success: true, users: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Users failed.' });
  }
});

app.patch('/admin/api/users/:id', requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const role = ['owner', 'admin', 'moderator', 'support', 'player'].includes(req.body.role) ? req.body.role : null;
    const status = ['active', 'banned', 'disabled', 'whitelist_pending'].includes(req.body.status) ? req.body.status : null;
    if (!role && !status) {
      return res.status(400).json({ success: false, error: 'Nothing to update.' });
    }
    await pool.query(
      `update users set
         role = coalesce($2, role),
         status = coalesce($3, status)
       where id = $1`,
      [id, role, status]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'User update failed.' });
  }
});

app.get('/admin/api/servers', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `select id, project_id, name, host, port, version, motd, player_count, max_players, tps, priority, last_seen_at
       from project_servers
       order by project_id asc, priority desc, last_seen_at desc
       limit 100`
    );
    res.json({ success: true, servers: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Servers failed.' });
  }
});

app.get('/admin/api/manifest', requireAdmin, (req, res) => {
  res.json({ success: true, manifest: readManifest() });
});

app.put('/admin/api/manifest', requireAdmin, (req, res) => {
  try {
    const manifest = req.body.manifest && typeof req.body.manifest === 'object' ? req.body.manifest : req.body;
    if (!Array.isArray(manifest.versions)) {
      return res.status(400).json({ success: false, error: 'Manifest must contain versions array.' });
    }
    writeManifest(manifest);
    logEvent('admin.manifest.update', { versions: manifest.versions.length });
    res.json({ success: true, manifest });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Manifest update failed.' });
  }
});

app.post('/admin/api/mods/upload', requireAdmin, (req, res) => {
  try {
    const manifest = readManifest();
    const versionId = String(req.body.version || '').trim();
    const profileIds = Array.isArray(req.body.profiles) ? req.body.profiles.map(String) : [];
    const fileName = path.basename(String(req.body.name || 'mod.jar'));
    const dataBase64 = String(req.body.dataBase64 || '');
    if (!versionId || !fileName.endsWith('.jar') || !dataBase64) {
      return res.status(400).json({ success: false, error: 'version, jar name and dataBase64 are required.' });
    }
    const bytes = Buffer.from(dataBase64, 'base64');
    const sha256 = crypto.createHash('sha256').update(bytes).digest('hex');
    const relativeDir = path.join('mods', versionId);
    const targetDir = path.join(cdnRoot, relativeDir);
    fs.mkdirSync(targetDir, { recursive: true });
    fs.writeFileSync(path.join(targetDir, fileName), bytes);
    const cdnBaseUrl = process.env.CDN_BASE_URL || '';
    const url = cdnBaseUrl
      ? `${cdnBaseUrl.replace(/\/+$/, '')}/${relativeDir.replace(/\\/g, '/')}/${fileName}`
      : `/cdn/${relativeDir.replace(/\\/g, '/')}/${fileName}`;
    let version = manifest.versions.find((entry) => entry.id === versionId);
    if (!version) {
      version = { id: versionId, fabricLoaderVersion: 'latest', mods: [] };
      manifest.versions.push(version);
    }
    version.mods = (version.mods || []).filter((mod) => mod.name !== fileName);
    version.mods.push({ name: fileName, url, sha256, required: true, profiles: profileIds, sizeMb: Number((bytes.length / 1024 / 1024).toFixed(2)) });
    writeManifest(manifest);
    res.json({ success: true, mod: version.mods[version.mods.length - 1] });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Mod upload failed.' });
  }
});

app.get('/admin/api/projects', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('select id, name, description, config, updated_at from launcher_projects order by name asc');
    res.json({ success: true, projects: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Projects failed.' });
  }
});

app.put('/admin/api/projects/:id', requireAdmin, async (req, res) => {
  try {
    const id = String(req.params.id || '').trim();
    const name = String(req.body.name || id).trim();
    const description = String(req.body.description || '').trim();
    const config = req.body.config && typeof req.body.config === 'object' ? req.body.config : {};
    await pool.query(
      `insert into launcher_projects(id, name, description, config, updated_at)
       values ($1, $2, $3, $4::jsonb, now())
       on conflict (id) do update set name = excluded.name, description = excluded.description, config = excluded.config, updated_at = now()`,
      [id, name, description || null, JSON.stringify(config)]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Project update failed.' });
  }
});

app.post('/admin/api/news', requireAdmin, async (req, res) => {
  try {
    const title = String(req.body.title || '').trim();
    const body = String(req.body.body || '').trim();
    const url = String(req.body.url || '').trim();
    if (!title) {
      return res.status(400).json({ success: false, error: 'Title is required.' });
    }
    const result = await pool.query(
      'insert into launcher_news(title, body, url) values ($1, $2, $3) returning id, title, body, url, created_at',
      [title, body, url || null]
    );
    res.json({ success: true, news: sanitizeNews(result.rows[0]) });
  } catch (err) {
    res.status(500).json({ success: false, error: 'News create failed.' });
  }
});

app.delete('/admin/api/news/:id', requireAdmin, async (req, res) => {
  try {
    await pool.query('update launcher_news set visible = false where id = $1', [Number(req.params.id)]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'News delete failed.' });
  }
});

app.get('/admin/api/crash-reports', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `select id, nickname, hwid_hash, analysis, created_at
       from crash_reports
       order by created_at desc
       limit 100`
    );
    res.json({ success: true, reports: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Crash reports failed.' });
  }
});

app.get('/admin/api/crash-groups', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `select fingerprint, count(*)::int as count, max(created_at) as last_seen
       from crash_reports
       group by fingerprint
       order by count desc, last_seen desc
       limit 50`
    );
    res.json({ success: true, groups: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Crash groups failed.' });
  }
});

app.get('/admin/api/security-events', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `select id, nickname, hwid_hash, event_type, details, created_at
       from security_events
       order by created_at desc
       limit 200`
    );
    res.json({ success: true, events: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'Security events failed.' });
  }
});

app.get('/admin/api/hwid-bans', requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('select hwid_hash, reason, created_at from hwid_bans order by created_at desc limit 200');
    res.json({ success: true, bans: result.rows });
  } catch (err) {
    res.status(500).json({ success: false, error: 'HWID bans failed.' });
  }
});

app.post('/admin/api/hwid-bans', requireAdmin, async (req, res) => {
  try {
    const hwidHash = String(req.body.hwidHash || '').trim().toLowerCase();
    const reason = String(req.body.reason || '').trim();
    if (!/^[a-f0-9]{64}$/.test(hwidHash)) {
      return res.status(400).json({ success: false, error: 'Invalid HWID hash.' });
    }
    await pool.query(
      `insert into hwid_bans(hwid_hash, reason)
       values ($1, $2)
       on conflict (hwid_hash) do update set reason = excluded.reason`,
      [hwidHash, reason || null]
    );
    logEvent('admin.hwid_ban.upsert', { hwidHash });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'HWID ban failed.' });
  }
});

app.delete('/admin/api/hwid-bans/:hash', requireAdmin, async (req, res) => {
  try {
    const hwidHash = String(req.params.hash || '').trim().toLowerCase();
    await pool.query('delete from hwid_bans where hwid_hash = $1', [hwidHash]);
    logEvent('admin.hwid_ban.delete', { hwidHash });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: 'HWID unban failed.' });
  }
});

async function start() {
  await applyDatabaseSchema();
  app.listen(port, apiHost, () => {
    console.log(`UNIQUE launcher API listening on ${apiHost}:${port}`);
  });
}

start().catch((err) => {
  console.error('UNIQUE launcher API failed to start:', err);
  process.exit(1);
});
