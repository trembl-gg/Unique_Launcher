const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const net = require('node:net');
const { spawn } = require('node:child_process');
const { createHash } = require('node:crypto');
const { chromium } = require(process.env.UNIQUE_PLAYWRIGHT_MODULE);

(async () => {
  const root = process.cwd();
  const executable = path.resolve(process.argv[2] || 'target/debug/unique-launcher.exe');
  const resources = path.resolve(process.argv[3] || root);
  const reference = process.argv[4] && path.resolve(process.argv[4]);
  assert(fs.existsSync(executable), 'Build the Rust executable first');
  assert(fs.existsSync(path.join(resources, 'renderer/index.html')), 'Launcher resources are missing');
  assert(fs.existsSync(path.join(path.dirname(executable), 'WebView2Loader.dll')), 'Place WebView2Loader.dll beside the Rust executable, as in the packaged build');
  if (reference) {
    const renderer = path.join(reference, 'renderer');
    const files = fs.readdirSync(renderer, { recursive: true }).filter(file => fs.statSync(path.join(renderer, file)).isFile());
    for (const file of files) {
      const hash = filename => createHash('sha256').update(fs.readFileSync(filename)).digest('hex');
      assert.equal(hash(path.join(resources, 'renderer', file)), hash(path.join(renderer, file)), `1.0.0 renderer changed: ${file}`);
    }
    console.log(`PASS: all ${files.length} renderer assets match the 1.0.0 reference byte for byte`);
  }
  fs.mkdirSync('.tools', { recursive: true });
  const profile = fs.mkdtempSync(path.join(root, '.tools/rust-ui-qa-'));
  const roaming = path.join(profile, 'roaming');
  fs.mkdirSync(path.join(roaming, 'minecraft-launcher/minecraft'), { recursive: true });
  const listener = net.createServer();
  await new Promise(resolve => listener.listen(0, '127.0.0.1', resolve));
  const port = listener.address().port;
  await new Promise(resolve => listener.close(resolve));
  const child = spawn(executable, [], { cwd: resources, windowsHide: false, stdio: 'ignore', env: {
    ...process.env,
    APPDATA: roaming,
    LOCALAPPDATA: path.join(profile, 'local'),
    UNIQUE_NATIVE_DATA: path.join(profile, 'native'),
    UNIQUE_NODE_PATH: process.execPath,
    UNIQUE_WEBVIEW2_ROOT: resources,
    UNIQUE_DISCORD_CLIENT_ID: '0',
    UNIQUE_UI_TEST_PORT: String(port)
  } });
  let spawnError, exited = false, browser, passed = false;
  console.log(`Rust UI test PID=${child.pid}, CDP port=${port}`);
  const exit = new Promise(resolve => {
    child.once('error', error => { spawnError = error; exited = true; resolve(); });
    child.once('exit', () => { exited = true; resolve(); });
  });
  try {
    let ready = false;
    for (let attempt = 0; attempt < 200; attempt++) {
      if (spawnError) throw spawnError;
      assert(!exited, `Rust launcher exited before WebView2 was ready (code ${child.exitCode})`);
      try {
        const response = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(500) });
        if (response.ok) { ready = true; break; }
      } catch {}
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert(ready, 'Rust WebView2 startup timed out');
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
    let page;
    for (let attempt = 0; attempt < 200; attempt++) {
      page = browser.contexts()[0].pages().find(page => page.url().includes('unique.localhost/renderer/index.html'));
      if (page) break;
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    assert(page, 'Original renderer did not load');
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.locator('#startup-screen').waitFor({ state: 'hidden' });
    await page.fill('#guest-nick', 'RustUIQA');
    await page.click('#guest-button');
    await page.locator('#launcher-screen').waitFor({ state: 'visible' });
    await page.waitForFunction(() => systemInfo && currentSettings);
    await page.evaluate(() => document.fonts.ready);
    assert(await page.locator('.app-rail').isVisible());
    assert(await page.locator('.window-titlebar').isVisible());
    assert.equal(await page.evaluate(() => systemInfo.appVersion), require('../package.json').version);
    const capture = async name => {
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({ path: `.tools/qa-rust-original-${name}.png` });
    };
    await capture('home');
    await page.click('#rail-open-library');
    assert(await page.locator('#instance-name').isHidden());
    await page.click('#rail-create-instance');
    assert(await page.locator('#instance-list').isHidden());
    await capture('create');
    await page.fill('#instance-name', 'Rust UI 1.0.1');
    await page.click('#create-instance');
    await page.waitForFunction(() => document.querySelector('#instance-list').textContent.includes('Rust UI 1.0.1'));
    await page.locator('#instance-list').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#launcher-screen').getAttribute('data-active-section'), 'library');
    await capture('library');
    await page.locator('[data-section="settings"]:visible').first().click();
    for (const tab of ['game', 'debug', 'experiments', 'info']) await page.click(`[data-settings-tab="${tab}"]`);
    assert.equal(await page.locator('[data-settings-tab="technical"], #repair-game').count(), 0);
    await page.click('[data-settings-tab="game"]');
    await page.evaluate(async () => { fields.reduceMotion.checked = true; await saveSettings(); });
    assert.equal(await page.locator('#space-canvas').evaluate(canvas => canvas.width * canvas.height), 0);
    await capture('settings');
    await page.click('#active-user');
    await page.waitForFunction(() => document.querySelector('#launcher-screen').dataset.activeSection === 'profile');
    await capture('profile');
    await page.locator('[data-section="main"]:visible').first().click();
    await capture('reduced-motion');
    assert.equal(await page.evaluate(() => window.__UNIQUE_RUST__), true);
    assert.deepEqual(errors, []);
    console.log('PASS: actual Rust EXE, original renderer, separate instance menus, offline login, instance creation, settings, profile, fonts and reduced motion');
    await page.evaluate(() => window.api.windowControl('close')).catch(() => {});
    await Promise.race([exit, new Promise((_, reject) => setTimeout(() => reject(Error('Rust launcher failed to close')), 5000).unref())]);
    passed = true;
  } finally {
    if (!exited) { child.kill(); await exit; }
    if (browser) await browser.close().catch(() => {});
    if (passed) fs.rmSync(profile, { recursive: true, force: true, maxRetries: 10, retryDelay: 250 });
    else console.error(`Test profile and logs retained: ${profile}`);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
