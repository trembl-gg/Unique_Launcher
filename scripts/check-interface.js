const { chromium } = require(process.env.UNIQUE_PLAYWRIGHT_MODULE || 'playwright');
const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const root = path.resolve(__dirname, '..');
  const profile = fs.mkdtempSync(path.join(root, '.tools/interface-qa-'));
  const output = path.join(root, '.tools/interface-qa');
  fs.mkdirSync(output, { recursive: true });
  fs.mkdirSync(path.join(profile, 'roaming/minecraft-launcher/minecraft'), { recursive: true });
  const backend = spawn(process.execPath, ['webview2/node-backend.js'], {
    cwd: root, windowsHide: true, env: {
      ...process.env, UNIQUE_BACKEND_TRANSPORT: 'stdio', UNIQUE_WEBVIEW2_ROOT: root,
      APPDATA: path.join(profile, 'roaming'), LOCALAPPDATA: path.join(profile, 'local')
    }
  });
  backend.stderr.resume();
  let page, browser, ready;
  const started = new Promise(resolve => { ready = resolve; });
  const lines = createInterface({ input: backend.stdout });
  lines.on('line', line => {
    if (!line.startsWith('UNIQUE_RPC:')) return;
    const message = JSON.parse(line.slice(11));
    if (message.type === 'ready') ready();
    else if (page && !page.isClosed()) page.evaluate(message => window.__uniqueDispatch?.(message), message).catch(() => {});
  });
  const errors = [];
  try {
    await Promise.race([started, new Promise((_, reject) => setTimeout(() => reject(Error('Backend startup timed out')), 15000).unref())]);
    browser = await chromium.launch({ executablePath: process.env.UNIQUE_BROWSER || 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', headless: true });
    page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    page.on('pageerror', error => errors.push(error.message));
    await page.exposeFunction('nativeInvoke', async text => {
      const message = JSON.parse(text);
      const reply = result => page.evaluate(({ id, result }) => window.__uniqueDispatch({ type: 'invoke-result', id, ok: true, result }), { id: message.id, result });
      if (message.channel === 'auth-current-session') return reply({ success: false });
      if (message.channel === 'window-is-maximized') return reply(false);
      if (message.channel === 'get-hardware-info') return reply({ totalMemoryMb: 16384 });
      if (message.channel === 'streamer-mode') return reply({ success: true, enabled: false });
      backend.stdin.write(text + '\n');
    });
    await page.addInitScript(() => { window.__UNIQUE_RUST__ = true; window.ipc = { postMessage: message => { void window.nativeInvoke(message); } }; });
    await page.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.hostname !== 'unique.localhost') return route.abort();
      const relative = decodeURIComponent(url.pathname).slice(1);
      const file = path.resolve(root, relative);
      if (!file.startsWith(root + path.sep) || (!relative.startsWith('renderer/') && relative !== 'unique.png')) return route.abort();
      const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ttf': 'font/ttf' }[path.extname(file)];
      return route.fulfill({ path: file, contentType: mime });
    });
    await page.goto('http://unique.localhost/renderer/index.html');
    await page.locator('#startup-screen').waitFor({ state: 'hidden' });
    await page.evaluate(() => document.fonts.ready);
    const capture = async name => {
      if (process.argv.includes('--no-screenshots')) return;
      await page.mouse.move(1439, 899);
      await page.waitForTimeout(180);
      await page.screenshot({ path: path.join(output, name + '.png'), animations: 'disabled' });
    };
    await capture('auth');
    await page.fill('#guest-nick', 'Explorer');
    await page.click('#guest-button');
    await page.locator('#launcher-screen').waitFor({ state: 'visible' });
    page.on('dialog', async dialog => { errors.push(`Unexpected native dialog: ${dialog.message()}`); await dialog.dismiss(); });
    await page.waitForFunction(() => currentSettings && systemInfo);
    assert.equal(await page.locator('#space-canvas').evaluate(canvas => canvas.width * canvas.height), 0);
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).getPropertyValue('--accent').trim()), '#80ce86');
    await page.click('#rail-create-instance');
    await page.fill('#instance-name', 'Лесной мир');
    await capture('create');
    await page.click('#create-instance');
    await page.waitForFunction(() => document.querySelector('#instance-list').textContent.includes('Лесной мир'));
    await page.locator('#instance-list').waitFor({ state: 'visible' });
    await capture('library');
    await page.locator('.instance-edit').first().click();
    await page.locator('#instance-editor').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#instance-editor-favorite').evaluate(input => getComputedStyle(input).appearance), 'checkbox');
    await page.check('#instance-editor-favorite');
    assert(await page.isChecked('#instance-editor-favorite'));
    await capture('editor');
    await page.click('#instance-editor-cancel');
    assert.equal(await page.locator('.instance-rail-name').first().textContent(), 'Лесной мир');
    await page.locator('[data-section="main"]:visible').first().click();
    await capture('home');
    const instanceMotion = await page.evaluate(async () => {
      const original = getActiveBuildInstance();
      const created = await window.api.createBuildInstance({ nickname: activeUser.nickname, name: 'Тест анимации', minecraftVersion: original.minecraftVersion, loader: original.loader, source: 'custom' });
      if (!created.success) throw Error(created.error);
      await loadBuildInstances();
      let frames;
      const animate = wallpaperPreview.animate;
      wallpaperPreview.animate = function (keyframes, options) { frames = keyframes; return animate.call(this, keyframes, options); };
      try { await selectBuildInstance(original.id); }
      finally { wallpaperPreview.animate = animate; }
      await window.api.deleteBuildInstance({ nickname: activeUser.nickname, instanceId: created.instance.id });
      await loadBuildInstances();
      return { frames, name: document.getElementById('launch-instance-name').textContent };
    });
    assert.match(instanceMotion.frames[0].transform, /translateX/);
    assert.equal(instanceMotion.name, 'Лесной мир');
    await page.click('#home-instance-content');
    await page.locator('.mods-panel').waitFor({ state: 'visible' });
    await capture('content');
    await page.click('[data-section="settings"]:visible');
    await page.click('[data-settings-tab="game"]');
    const indicatorFrames = await page.evaluate(() => {
      syncSettingsIndicator(false);
      setSettingsTab('debug');
      const moving = document.querySelector('.settings-indicator').getAnimations()[0];
      const right = moving.effect.getKeyframes()[0].transform;
      moving.finish();
      setSettingsTab('info');
      const left = document.querySelector('.settings-indicator').getAnimations()[0].effect.getKeyframes()[0].transform;
      setSettingsTab('game');
      return { right, left };
    });
    assert.match(indicatorFrames.right, /translate\(-/);
    assert.match(indicatorFrames.left, /translate\([1-9]/);
    await capture('settings');
    await page.check('#star-background');
    await page.waitForFunction(() => currentSettings.appearance.starBackground === true && document.querySelector('#space-canvas').width > 0);
    const saved = await page.evaluate(() => window.api.getSettings({ nickname: activeUser.nickname }));
    assert.equal(saved.appearance.starBackground, true, 'star background setting persists in backend');
    await capture('stars');
    await page.check('#reduce-motion');
    await page.waitForFunction(() => document.querySelector('#space-canvas').width === 0);
    await page.uncheck('#reduce-motion');
    await page.waitForFunction(() => document.querySelector('#space-canvas').width > 0);
    await page.evaluate(() => window.__uniqueDispatch({ type: 'event', channel: 'window-visibility', data: false }));
    await page.waitForFunction(() => document.querySelector('#space-canvas').width === 0);
    await page.evaluate(() => window.__uniqueDispatch({ type: 'event', channel: 'window-visibility', data: true }));
    await page.waitForFunction(() => document.querySelector('#space-canvas').width > 0);
    await page.uncheck('#star-background');
    await page.waitForFunction(() => !currentSettings.appearance.starBackground && document.querySelector('#space-canvas').width === 0);
    await page.locator('[data-select-id="appearance-theme"] .custom-select-button').click();
    await page.locator('[data-select-id="appearance-theme"] [data-value="oled"]').click();
    await page.waitForFunction(() => currentSettings.appearance.theme === 'oled' && document.body.dataset.theme === 'oled');
    assert.equal(await page.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(0, 0, 0)');
    assert.equal(await page.locator('.log-panel').evaluate(panel => getComputedStyle(panel).backgroundColor), 'color(srgb 0 0 0)');
    await page.locator('#interface-transparency').evaluate(input => { input.value = '50'; input.dispatchEvent(new Event('input')); input.dispatchEvent(new Event('change')); });
    await page.waitForFunction(() => currentSettings.appearance.transparency === 50);
    const translucent = await page.evaluate(() => ['#clear-log', '.log-levels label:has(input:checked)', '.settings-tabbar', '.settings-indicator', '.content-manager-tabs', '.content-manager-tabs .tiny-button.active', '.setting-check'].map(selector => [selector, getComputedStyle(document.querySelector(selector)).backgroundColor]));
    for (const [selector, color] of translucent) assert(color.includes('/ 0.5'), `${selector} should follow panel transparency: ${color}`);
    assert.deepEqual(await page.locator('#star-background').evaluate(input => ({ width: input.offsetWidth, height: input.offsetHeight, padding: getComputedStyle(input).padding })), { width: 40, height: 24, padding: '0px' });
    assert.equal(await page.locator('#interface-transparency-value').textContent(), '50%');
    const appearanceSaved = await page.evaluate(() => window.api.getSettings({ nickname: activeUser.nickname }));
    assert.equal(appearanceSaved.appearance.theme, 'oled');
    assert.equal(appearanceSaved.appearance.transparency, 50);
    await page.check('#star-background');
    await page.click('#sidebar-toggle');
    await page.waitForFunction(() => currentSettings.appearance.sidebarCollapsed === true);
    await page.waitForFunction(() => document.querySelector('.app-rail').getBoundingClientRect().width === 64);
    assert.equal(await page.locator('.app-rail').evaluate(rail => rail.getBoundingClientRect().width), 64);
    assert.equal((await page.evaluate(() => window.api.getSettings({ nickname: activeUser.nickname }))).appearance.sidebarCollapsed, true);
    await capture('oled-transparency');
    await page.click('#sidebar-toggle');
    await page.waitForFunction(() => currentSettings.appearance.sidebarCollapsed === false);
    await page.waitForFunction(() => document.querySelector('.app-rail').getBoundingClientRect().width === 240);
    assert.equal(await page.locator('.app-rail').evaluate(rail => getComputedStyle(rail).transitionDuration.split(',')[0]), '0.24s');
    await page.uncheck('#star-background');
    await page.locator('#interface-transparency').evaluate(input => { input.value = '0'; input.dispatchEvent(new Event('input')); input.dispatchEvent(new Event('change')); });
    await page.waitForFunction(() => currentSettings.appearance.transparency === 0);
    await page.mouse.move(1439, 899);
    await page.waitForFunction(() => document.querySelector('#active-user').getBoundingClientRect().width === 38);
    await page.hover('#active-user');
    await page.waitForFunction(() => document.querySelector('#active-user').getBoundingClientRect().width > 80);
    await page.click('#active-user');
    await capture('profile');
    await page.click('[data-section="settings"]:visible');
    await page.click('[data-settings-tab="game"]');
    await page.evaluate(() => applyAppearance({ theme: 'light', accent: 'emerald' }));
    await capture('light');
    await page.evaluate(() => applyAppearance({ theme: 'cosmic', accent: 'emerald' }));
    for (const accent of ['#000', '#fff', '#cc6600', 'violet', 'emerald']) {
      const contrast = await page.evaluate(accent => {
        applyAppearance({ theme: 'cosmic', accent });
        const style = getComputedStyle(document.body);
        const luminance = color => {
          let hex = color.replace('#', '');
          if (hex.length === 3) hex = [...hex].map(c => c + c).join('');
          const c = [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4);
          return c[0] * .2126 + c[1] * .7152 + c[2] * .0722;
        };
        const a = luminance(style.getPropertyValue('--accent').trim()), b = luminance(style.getPropertyValue('--accent-text').trim());
        return (Math.max(a, b) + .05) / (Math.min(a, b) + .05);
      }, accent);
      assert(contrast >= 4.5, `${accent}: button contrast ${contrast}`);
    }
    const checks = [];
    for (const width of [1440, 1120, 960, 800, 600]) {
      await page.setViewportSize({ width, height: 900 });
      for (const section of ['main', 'library', 'create', 'settings', 'profile']) {
        await page.locator(section === 'profile' ? '#active-user' : `[data-section="${section}"]:visible`).first().click();
        assert.equal(await page.locator('#launcher-screen').getAttribute('data-active-section'), section);
        if (section === 'main') assert.equal(await page.locator('.launch-actions').evaluate(bar => bar.getBoundingClientRect().bottom), 900, 'launch bar stays fixed during transitions');
        const dimensions = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth, sidebar: document.querySelector('.app-rail').getBoundingClientRect().width }));
        assert(dimensions.scroll <= width, `${section} overflows at ${width}`);
        assert.equal(dimensions.sidebar, width <= 820 ? 64 : width <= 1200 ? 208 : 240);
        const overflowing = await page.locator('.dashboard').evaluate(root => [...root.querySelectorAll('input:not([hidden]), .custom-select-button, button')]
          .filter(element => element.checkVisibility()).filter(element => {
            const box = element.getBoundingClientRect();
            return box.right > innerWidth + 1 || box.left < 0;
          }).map(element => element.id || element.className));
        assert.deepEqual(overflowing, [], `${section} controls overflow at ${width}`);
        checks.push({ width, section });
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.evaluate(() => {
      for (const section of ['main', 'profile', 'settings', 'library', 'main']) setLauncherSection(section);
    });
    await page.waitForTimeout(250);
    assert.equal(await page.locator('#launcher-screen').getAttribute('data-active-section'), 'main');
    assert.equal(await page.locator('.dashboard').evaluate(panel => panel.getAnimations().length), 0);
    // Account badges stay upright when the disclosure arrow turns.
    await page.locator('[data-select-id="account-switch"] .custom-select-button').click();
    assert.equal(await page.locator('[data-select-id="account-switch"] .custom-select-value .account-kind svg').evaluate(icon => getComputedStyle(icon).transform), 'none');
    await page.evaluate(() => {
      const option = document.querySelector('#account-switch option');
      option.dataset.microsoft = 'true'; syncCustomSelect(document.getElementById('account-switch'));
    });
    assert.equal(await page.locator('[data-select-id="account-switch"] .custom-select-value .account-kind svg').evaluate(icon => getComputedStyle(icon).transform), 'none');
    await page.keyboard.press('Escape');
    await page.evaluate(() => { document.body.classList.add('reduce-motion'); setLauncherSection('library'); });
    assert.equal(await page.locator('.dashboard').evaluate(panel => panel.getAnimations().length), 0);
    const deleteButton = page.locator('.instance-delete').first();
    await deleteButton.click();
    await page.locator('#action-dialog').waitFor({ state: 'visible' });
    assert.equal(await page.locator('#action-dialog-title').textContent(), 'Удалить сборку?');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'action-dialog-cancel');
    await capture('confirmation');
    await page.click('#action-dialog-cancel');
    assert.equal(await page.locator('.instance-delete').count(), 1);
    assert.equal(await deleteButton.evaluate(button => button === document.activeElement), true);
    await deleteButton.click();
    await page.keyboard.press('Escape');
    await page.locator('#action-dialog').waitFor({ state: 'hidden' });
    assert.equal(await page.locator('.instance-delete').count(), 1);
    await deleteButton.click();
    await page.click('#action-dialog-confirm');
    await page.waitForFunction(() => !buildInstances.length);
    assert.equal(await page.locator('.instance-delete').count(), 0);
    await page.evaluate(() => document.body.classList.remove('reduce-motion'));
    await page.evaluate(() => { applyLanguage('en'); });
    assert.equal(await page.locator('[data-section="settings"] .rail-label').textContent(), 'Settings');
    await page.evaluate(() => { applyLanguage('es'); });
    assert.equal(await page.locator('[data-section="settings"] .rail-label').textContent(), 'Ajustes');
    assert.deepEqual(errors, []);
    fs.writeFileSync(path.join(output, 'report.json'), JSON.stringify({ checks, errors, contrast: '5 accents >= 4.5:1' }, null, 2));
    console.log('PASS: actual backend, offline login, instance creation/editor/content/deletion, custom dialog cancel/Escape/focus/confirm, OLED + transparency + sidebar persistence, account badge rotation, rapid navigation/reduced-motion, 25 viewport/view checks, 5 accent contrasts, localization, star background/native-hide pause, no JS errors');
  } finally {
    if (browser) await browser.close();
    lines.close();
    backend.kill();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
