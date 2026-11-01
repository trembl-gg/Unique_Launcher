const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
for (const name of ['unique иконка.ico', 'game.ico']) {
  const bytes = fs.readFileSync(path.join(root, name));
  assert.equal(bytes.readUInt16LE(2), 1, `${name}: ICO type`);
  assert.equal(bytes.readUInt16LE(4), 7, `${name}: seven resolutions`);
  for (let i = 0; i < 7; i++) {
    const entry = 6 + i * 16;
    const width = bytes[entry] || 256;
    const offset = bytes.readUInt32LE(entry + 12);
    const length = bytes.readUInt32LE(entry + 8);
    assert(offset + length <= bytes.length);
    assert.equal(bytes.readUInt16LE(entry + 6), 32);
    assert.equal(bytes.readUInt32LE(offset), 40, 'DIB header');
    assert.equal(bytes.readUInt32LE(offset + 4), width);
    const alphas = [];
    for (let p = offset + 43; p < offset + 40 + width * width * 4; p += 4) alphas.push(bytes[p]);
    assert(alphas.includes(0), `${name}/${width}: transparent pixels`);
    assert(alphas.includes(255), `${name}/${width}: opaque logo`);
    assert.equal(alphas[0], 0, 'transparent corner');
  }
}
assert(!fs.readFileSync(path.join(root, 'game.ico')).equals(fs.readFileSync(path.join(root, 'unique иконка.ico'))));
const installer = fs.readFileSync(path.join(root, 'build/webview2-installer.nsi'), 'utf8');
const shortcuts = installer.split('\n').filter(line => line.trim().startsWith('CreateShortcut'));
assert.equal(shortcuts.length, 3);
const launcherShortcuts = shortcuts.filter(line => !line.includes('uninstaller.exe'));
assert.equal(launcherShortcuts.length, 2);
assert(launcherShortcuts.every(line => line.trim().endsWith('"$INSTDIR\\UNIQUE LAUNCHER.exe" 0')));
assert(installer.includes('WriteUninstaller "$INSTDIR\\uninstaller.exe"'));
assert(installer.includes('RequestExecutionLevel user'));
console.log('PASS: launcher/game ICO sizes, 32-bit alpha and executable-backed shortcuts');
