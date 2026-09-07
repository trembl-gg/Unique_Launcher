const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { Client } = require('ssh2');

const root = path.resolve(__dirname, '..');

function loadEnvFile(fileName) {
  const filePath = path.join(root, fileName);
  if (!fs.existsSync(filePath)) return;

  for (const line of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
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

loadEnvFile('.env');
loadEnvFile('.env.deploy');

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const version = String(process.env.UNIQUE_DEPLOY_VERSION || packageJson.version || '').trim();
const productName = String(packageJson.build?.productName || 'UNIQUE LAUNCHER').trim();
const host = String(process.env.UNIQUE_DEPLOY_HOST || '213.108.170.58').trim();
const username = String(process.env.UNIQUE_DEPLOY_USER || 'administrator').trim();
const password = String(process.env.UNIQUE_DEPLOY_PASSWORD || '').trim();
const privateKeyPath = String(process.env.UNIQUE_DEPLOY_KEY || '').trim();
const remoteRoot = String(process.env.UNIQUE_DEPLOY_REMOTE_ROOT || '/home/administrator/unique-launcher-api').replace(/\/+$/, '');
const serviceName = String(process.env.UNIQUE_DEPLOY_SERVICE || 'unique-launcher-api.service').trim();
const updateUrl = String(
  process.env.UNIQUE_DEPLOY_UPDATE_URL
  || process.env.UNIQUE_UPDATE_URL
  || packageJson.build?.publish?.[0]?.url
  || 'https://launcher-api.unique-csgo.ru/updates'
).replace(/\/+$/, '');

const updatesDir = `${remoteRoot}/updates`;
const publicUpdatesDir = `${remoteRoot}/public/updates`;
const remoteEnvPath = `${remoteRoot}/.env`;
const distDir = path.join(root, 'dist');
const artifacts = [
  `${productName} Setup ${version}.exe`,
  `${productName} Setup ${version}.exe.blockmap`,
  'latest.yml'
].map((name) => ({
  name,
  local: path.join(distDir, name)
}));

function shQuote(value) {
  return `'${String(value).replace(/'/g, `'\"'\"'`)}'`;
}

function fail(message) {
  console.error(`ERROR: ${message}`);
  process.exit(1);
}

function createConnectionConfig() {
  if (!host || !username) {
    fail('UNIQUE_DEPLOY_HOST and UNIQUE_DEPLOY_USER are required.');
  }

  const config = {
    host,
    username,
    readyTimeout: 30000,
    keepaliveInterval: 15000
  };

  if (privateKeyPath) {
    const fullPath = path.isAbsolute(privateKeyPath) ? privateKeyPath : path.join(root, privateKeyPath);
    config.privateKey = fs.readFileSync(fullPath);
    if (process.env.UNIQUE_DEPLOY_KEY_PASSPHRASE) {
      config.passphrase = process.env.UNIQUE_DEPLOY_KEY_PASSPHRASE;
    }
    return config;
  }

  if (!password) {
    fail('Set UNIQUE_DEPLOY_PASSWORD in environment or .env.deploy before running upload.');
  }
  config.password = password;
  return config;
}

function connect() {
  return new Promise((resolve, reject) => {
    const conn = new Client();
    conn.on('ready', () => resolve(conn));
    conn.on('error', reject);
    conn.connect(createConnectionConfig());
  });
}

function exec(conn, command) {
  return new Promise((resolve, reject) => {
    conn.exec(command, (err, stream) => {
      if (err) return reject(err);
      let out = '';
      let errOut = '';
      stream.on('close', (code) => {
        if (code === 0) {
          resolve({ out, errOut });
        } else {
          reject(new Error(`Remote command failed (${code}): ${command}\n${errOut || out}`));
        }
      });
      stream.on('data', (data) => {
        out += data.toString();
      });
      stream.stderr.on('data', (data) => {
        errOut += data.toString();
      });
    });
  });
}

function getSftp(conn) {
  return new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => (err ? reject(err) : resolve(sftp)));
  });
}

function uploadReplace(sftp, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    const tmpPath = `${remotePath}.tmp-${Date.now()}`;
    const read = fs.createReadStream(localPath);
    const write = sftp.createWriteStream(tmpPath, { mode: 0o644 });

    read.on('error', reject);
    write.on('error', reject);
    write.on('close', () => {
      sftp.unlink(remotePath, () => {
        sftp.rename(tmpPath, remotePath, (renameErr) => (renameErr ? reject(renameErr) : resolve()));
      });
    });
    read.pipe(write);
  });
}

function readRemote(sftp, remotePath) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const stream = sftp.createReadStream(remotePath);
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('close', () => resolve(Buffer.concat(chunks).toString('utf8')));
  });
}

function writeRemote(sftp, remotePath, content) {
  return new Promise((resolve, reject) => {
    const tmpPath = `${remotePath}.tmp-${Date.now()}`;
    const stream = sftp.createWriteStream(tmpPath, { mode: 0o600 });
    stream.on('error', reject);
    stream.on('close', () => {
      sftp.unlink(remotePath, () => {
        sftp.rename(tmpPath, remotePath, (renameErr) => (renameErr ? reject(renameErr) : resolve()));
      });
    });
    stream.end(content);
  });
}

async function updateRemoteAllowlist(conn, sftp) {
  let envText = await readRemote(sftp, remoteEnvPath);
  const line = envText.match(/^ALLOWED_LAUNCHER_BUILDS=(.*)$/m);

  if (line) {
    const builds = line[1].split(',').map((item) => item.trim()).filter(Boolean);
    if (!builds.includes(version)) builds.push(version);
    envText = envText.replace(/^ALLOWED_LAUNCHER_BUILDS=.*$/m, `ALLOWED_LAUNCHER_BUILDS=${builds.join(',')}`);
  } else {
    envText = envText.replace(/\s*$/, `\nALLOWED_LAUNCHER_BUILDS=${version}\n`);
  }

  await writeRemote(sftp, remoteEnvPath, envText);
  console.log(`[deploy] allowlist updated: ${version}`);

  if (!serviceName) return;
  const sudoPassword = String(process.env.UNIQUE_DEPLOY_SUDO_PASSWORD || password || '').trim();
  const restartCommand = sudoPassword
    ? `printf '%s\\n' ${shQuote(sudoPassword)} | sudo -S -p '' systemctl restart ${shQuote(serviceName)}`
    : `systemctl restart ${shQuote(serviceName)}`;
  await exec(conn, restartCommand);
  const active = await exec(conn, `systemctl is-active ${shQuote(serviceName)}`);
  console.log(`[deploy] service: ${active.out.trim()}`);
}

function httpRequest(url, method = 'GET') {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const req = client.request(url, { method, timeout: 30000 }, (res) => {
      res.resume();
      res.on('end', () => resolve({ statusCode: res.statusCode, headers: res.headers }));
    });
    req.on('timeout', () => req.destroy(new Error(`Timeout: ${url}`)));
    req.on('error', reject);
    req.end();
  });
}

async function verifyUpload() {
  const latest = await httpRequest(`${updateUrl}/latest.yml?noCache=${Date.now()}`);
  if (latest.statusCode !== 200) {
    fail(`latest.yml verification failed: HTTP ${latest.statusCode}`);
  }

  for (const artifact of artifacts.filter((item) => item.name !== 'latest.yml')) {
    const encodedName = artifact.name.split('/').map(encodeURIComponent).join('/');
    const response = await httpRequest(`${updateUrl}/${encodedName}`, 'HEAD');
    if (response.statusCode !== 200) {
      fail(`${artifact.name} verification failed: HTTP ${response.statusCode}`);
    }
    console.log(`[verify] ${artifact.name}: HTTP ${response.statusCode}, ${response.headers['content-length'] || 'unknown'} bytes`);
  }
}

async function main() {
  if (!version) fail('package version is empty.');
  for (const artifact of artifacts) {
    if (!fs.existsSync(artifact.local)) {
      fail(`Missing artifact: ${artifact.local}`);
    }
  }

  console.log(`[deploy] version: ${version}`);
  console.log(`[deploy] target: ${username}@${host}:${updatesDir}`);

  const conn = await connect();
  try {
    await exec(conn, `mkdir -p ${shQuote(updatesDir)} ${shQuote(publicUpdatesDir)}`);
    const sftp = await getSftp(conn);

    for (const artifact of artifacts) {
      const remotePath = `${updatesDir}/${artifact.name}`;
      const publicPath = `${publicUpdatesDir}/${artifact.name}`;
      await uploadReplace(sftp, artifact.local, remotePath);
      await exec(conn, `rm -f ${shQuote(publicPath)} && cp -f ${shQuote(remotePath)} ${shQuote(publicPath)}`);
      console.log(`[deploy] uploaded: ${artifact.name}`);
    }

    await updateRemoteAllowlist(conn, sftp);
  } finally {
    conn.end();
  }

  await verifyUpload();
  console.log('[deploy] done');
}

main().catch((err) => {
  fail(err.message || String(err));
});
