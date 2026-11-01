const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const files = ['main.js', 'preload.js'];
for (const folder of ['lib', 'renderer', 'webview2', 'scripts']) {
  for (const entry of fs.readdirSync(folder, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.js')) files.push(path.join(folder, entry.name));
  }
}
for (const file of files) {
  const result = spawnSync(process.execPath, ['--check', file], { stdio: 'inherit', windowsHide: true });
  if (result.error || result.status !== 0) {
    if (result.error) console.error(result.error);
    process.exit(1);
  }
}
console.log(`Syntax OK: ${files.length} JavaScript files`);
