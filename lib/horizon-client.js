const fs = require('node:fs');
const path = require('node:path');
const { execFile, spawn } = require('node:child_process');

function findHorizonInstallation(root = path.join(__dirname, '..'), versionsRoot = path.join(process.env.APPDATA || '', 'horizon-launcher', 'versions')) {
  const candidates = [{
    horizonExecutable: path.join(root, 'horizon', 'horizon-client.exe'),
    horizonResources: path.join(root, 'horizon', 'resources', '26.3')
  }];
  if (fs.existsSync(versionsRoot)) {
    for (const version of fs.readdirSync(versionsRoot, { withFileTypes: true }).filter(entry => entry.isDirectory()).map(entry => entry.name).sort().reverse()) {
      candidates.push({
        horizonExecutable: path.join(versionsRoot, version, 'horizon-client.exe'),
        horizonResources: path.join(versionsRoot, version, '.local', 'horizon-client', '26.3')
      });
    }
  }
  return candidates.find(candidate => fs.existsSync(candidate.horizonExecutable) && fs.existsSync(path.join(candidate.horizonResources, 'horizon-resources.json'))) || { horizonExecutable: '', horizonResources: '' };
}

function resolveHorizonPaths(settings, fallback) {
  const executable = typeof settings.horizonExecutable === 'string' ? settings.horizonExecutable : '';
  const resources = typeof settings.horizonResources === 'string' ? settings.horizonResources : '';
  return {
    horizonExecutable: executable && fs.existsSync(executable) ? executable : fallback.horizonExecutable,
    horizonResources: resources && fs.existsSync(resources) ? resources : fallback.horizonResources
  };
}

async function prepareHorizonLaunch({ executable, resources, root, auth }, execute = execFile) {
  if (!auth?.access_token || !auth?.uuid || !auth?.name) throw new Error('Для Horizon войдите в Microsoft-аккаунт с Minecraft Java Edition.');
  if (typeof executable !== 'string' || !path.isAbsolute(executable) || !/^horizon-client(?:\.exe)?$/i.test(path.basename(executable)) || (!fs.existsSync(executable) || !fs.statSync(executable).isFile())) {
    throw new Error('Выберите horizon-client.exe в настройках Horizon.');
  }
  if (typeof resources !== 'string' || !path.isAbsolute(resources) || (!fs.existsSync(resources) || !fs.statSync(resources).isDirectory())) throw new Error('Выберите папку подготовленных ресурсов Horizon.');
  const api = await new Promise((resolve, reject) => {
    execute(executable, ['--launch-api'], { windowsHide: true, timeout: 10000, maxBuffer: 1024 * 1024 }, (error, stdout) => {
      if (error) return reject(new Error('Клиент не поддерживает Horizon Launch API. Обновите Horizon.'));
      try { resolve(JSON.parse(stdout)); } catch { reject(new Error('Horizon вернул некорректное описание Launch API.')); }
    });
  });
  const required = ['--resources', '--game-dir', '--home', '--session-stdin'];
  if (!/^0\.1\./.test(api.launch_api || '') || !required.every(name => api.options?.some(option => option.name === name))) {
    throw new Error('Несовместимый Horizon Launch API: требуется 0.1 с передачей сессии через stdin.');
  }
  fs.mkdirSync(root, { recursive: true });
  return {
    executable, root,
    args: ['--resources', resources, '--game-dir', root, '--home', root, '--session-stdin'],
    session: { name: auth.name, uuid: auth.uuid, access_token: auth.access_token, user_type: 'msa' }
  };
}

function startHorizon(plan, createProcess = spawn) {
  return createProcess(plan.executable, plan.args, { cwd: plan.root, windowsHide: false, stdio: ['pipe', 'pipe', 'pipe'], shell: false });
}

module.exports = { prepareHorizonLaunch, startHorizon, findHorizonInstallation, resolveHorizonPaths };
