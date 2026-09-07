const fs = require('fs');
const path = require('path');

const KEEP_LOCALES = new Set(['en-US.pak', 'ru.pak']);

function removePath(targetPath) {
  fs.rmSync(targetPath, { recursive: true, force: true });
}

function removeElectronLocales(appOutDir) {
  const localesDir = path.join(appOutDir, 'locales');
  if (!fs.existsSync(localesDir)) return;

  for (const entry of fs.readdirSync(localesDir)) {
    if (!KEEP_LOCALES.has(entry)) {
      removePath(path.join(localesDir, entry));
    }
  }
}

function removeDefaultElectronFiles(appOutDir) {
  removePath(path.join(appOutDir, 'resources', 'default_app.asar'));
}

function removeSourceMaps(targetDir) {
  if (!fs.existsSync(targetDir)) return;

  for (const entry of fs.readdirSync(targetDir, { withFileTypes: true })) {
    const fullPath = path.join(targetDir, entry.name);
    if (entry.isDirectory()) {
      removeSourceMaps(fullPath);
    } else if (entry.name.endsWith('.map')) {
      removePath(fullPath);
    }
  }
}

exports.default = async function afterPack(context) {
  const appOutDir = context.appOutDir;
  removeElectronLocales(appOutDir);
  removeDefaultElectronFiles(appOutDir);
  removeSourceMaps(path.join(appOutDir, 'resources', 'app.asar.unpacked'));
};
