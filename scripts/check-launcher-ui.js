const { chromium } = require(process.env.UNIQUE_PLAYWRIGHT_MODULE);
const { spawn } = require('node:child_process');
const { createInterface } = require('node:readline');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const assert = require('node:assert/strict');

(async () => {
  const root = process.cwd();
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'unique-browser-auth-'));
  fs.mkdirSync(path.join(profile, 'roaming/minecraft-launcher/minecraft'), { recursive: true });
  const backend = spawn(process.execPath, ['webview2/node-backend.js'], { cwd: root, windowsHide: true, env: {
    ...process.env, UNIQUE_BACKEND_TRANSPORT: 'stdio', UNIQUE_WEBVIEW2_ROOT: root,
    APPDATA: path.join(profile, 'roaming'), LOCALAPPDATA: path.join(profile, 'local')
  }});
  let ready;
  const started = new Promise(resolve => { ready = resolve; });
  let page;
  let authorization;
  let spotifyUiMode = null;
  let spotifyPendingReply;
  const spotifyCalls = [];
  const windowActions = [];
  const folderCalls = [];
  let folderError = '';
  let updateReply = { success: true, state: 'none', currentVersion: '1.0.0' };
  let updateCalls = 0, updateDownloads = 0, updateDownloadFails = false;
  let browser;
  const errors = [];
  backend.stderr.resume();
  const lines = createInterface({ input: backend.stdout });
  lines.on('line', line => {
    if (!line.startsWith('UNIQUE_RPC:')) return;
    const message = JSON.parse(line.slice(11));
    if (message.type === 'ready') ready();
    else if (page && !page.isClosed()) page.evaluate(message => window.__uniqueDispatch?.(message), message).catch(() => {});
  });
  try {
    await Promise.race([started, new Promise((_, reject) => setTimeout(() => reject(new Error('Backend startup timeout')), 10000).unref())]);
    browser = await chromium.launch({ executablePath: 'C:/Program Files/BraveSoftware/Brave-Browser/Application/brave.exe', headless: true });
    async function authPage() {
      page = await browser.newPage();
      page.on('pageerror', error => { errors.push(error.message); console.log('PAGEERROR',error.message); });
      await page.exposeFunction('nativeInvoke', async text => {
        const message = JSON.parse(text);
        const reply = result => page.evaluate(({ id, result }) => window.__uniqueDispatch({ type: 'invoke-result', id, ok: true, result }), { id: message.id, result });
        if (message.channel === 'updates-check') { updateCalls++; return reply(updateReply); }
        if (message.channel === 'updates-install') { updateDownloads++; return reply({ success: !updateDownloadFails }); }
        if (message.channel === 'open-external-url') {
          authorization = message.payload;
          if (spotifyUiMode) spotifyCalls.push('open');
          if (spotifyUiMode === 'browser-error') return page.evaluate(id => window.__uniqueDispatch({ type: 'invoke-result', id, ok: false, error: 'Cannot open Spotify browser' }), message.id);
          return reply(true);
        }
        if (spotifyUiMode && message.channel === 'spotify-connect') { spotifyCalls.push('start'); return reply({ success: true, flowId: 'qa-spotify', authorizationUrl: 'https://accounts.spotify.com/authorize?state=qa&code_challenge=test' }); }
        if (spotifyUiMode && message.channel === 'spotify-connect-complete') {
          spotifyCalls.push('complete');
          if (spotifyUiMode === 'cancel') { spotifyPendingReply = reply; return; }
          return reply({ success: true, profile: { spotifyConnected: true, spotifyDisplayName: 'QA listener' } });
        }
        if (spotifyUiMode && message.channel === 'spotify-connect-cancel') {
          if (spotifyPendingReply) { await spotifyPendingReply({ success: false, error: 'Cancelled' }); spotifyPendingReply = null; }
          return reply({ success: true });
        }
        if (spotifyUiMode && message.channel === 'spotify-now-playing') return reply({ success: true, nowPlaying: { connected: true, playing: false, text: 'Spotify подключен, сейчас ничего не играет.' } });
        if (message.channel === 'window-control') { windowActions.push(message.payload); return reply(true); }
        if (['open-game-content-folder', 'open-logs-folder'].includes(message.channel)) {
          folderCalls.push({ channel: message.channel, payload: message.payload });
          return reply(folderError ? { success: false, error: folderError } : { success: true });
        }
        if (message.channel === 'auth-current-session') return reply({ success: false });
        if (message.channel === 'window-is-maximized') return reply(true);
        if (message.channel === 'get-hardware-info') return reply({ totalMemoryMb: 8192 });
        if (message.channel === 'streamer-mode') return reply({ success: true, enabled: false });
        backend.stdin.write(text + '\n');
      });
      await page.addInitScript(() => { window.__UNIQUE_RUST__ = true; window.ipc = { postMessage: message => { void window.nativeInvoke(message); } }; });
      await page.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.hostname !== 'unique.localhost') return route.abort();
        const relative = decodeURIComponent(url.pathname).slice(1);
        if (!relative.startsWith('renderer/') && relative !== 'unique.png') return route.abort();
        const file = path.join(root, relative);
        const mime = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.png':'image/png' }[path.extname(file)];
        return route.fulfill({ path: file, contentType: mime });
      });
      await page.goto('http://unique.localhost/renderer/index.html');
      await page.locator('#guest-nick').waitFor({ state: 'visible' });
      await page.locator('#startup-screen').waitFor({ state: 'hidden' });
    }
    await authPage();
    assert(await page.locator('.titlebar-account-actions').isHidden(), 'account controls stay hidden before login');
    const sky = await page.locator('.space-canvas').evaluate(canvas => canvas.toDataURL());
    await page.waitForFunction(previous => document.querySelector('.space-canvas').toDataURL() !== previous, sky);
    await page.screenshot({path:'.tools/qa-auth.png', animations:'disabled'});
    await page.fill('#guest-nick', 'OfflineBrowser');
    const before = Date.now();
    await page.click('#guest-button');
    await page.locator('#launcher-screen').waitFor({ state:'visible', timeout:3000 });
    assert(await page.locator('#auth-screen').isHidden());
    console.log('PASS: actual Offline button shows main screen in', Date.now() - before, 'ms');
    const contextMenus = await page.evaluate(() => ['#guest-nick', '#launch-log', '#java-path'].map(selector => {
      const event = new MouseEvent('contextmenu', { bubbles: true, cancelable: true });
      document.querySelector(selector).dispatchEvent(event); return event.defaultPrevented;
    }));
    assert.deepEqual(contextMenus, [true, false, true]);
    await page.waitForFunction(() => systemInfo && currentSettings);
    await page.waitForFunction(() => launcherUpdateState.state === 'none');
    assert.equal(updateCalls, 1, 'checks automatically after login');
    assert(await page.locator('#update-notification').isHidden());
    assert(await page.locator('#release-panel').isHidden());
    await page.locator('[data-section="settings"]:visible').first().click();
    await page.click('[data-settings-tab="debug"]');
    await page.click('#show-current-release');
    await page.locator('#release-panel').waitFor({ state: 'visible' });
    assert((await page.locator('#release-notes').textContent()).includes('Первый публичный релиз'));
    assert(await page.locator('#release-download').isHidden());
    await page.keyboard.press('Escape');
    updateReply = { success: true, state: 'available', currentVersion: '1.0.0', release: { version: '1.1.0', title: 'UNIQUE Launcher 1.1.0', notes: '## New features\n- Updates\n<img src=x onerror="window.qaUnsafe=true">', url: 'https://github.com/trembl-gg/Unique_Launcher/releases/tag/v1.1.0' } };
    await page.evaluate(() => checkUpdates(true));
    await page.locator('#release-panel').waitFor({ state: 'visible' });
    assert(await page.locator('#update-notification').isVisible());
    assert.equal(await page.locator('#release-notes img, #release-notes script').count(), 0);
    assert.equal(await page.evaluate(() => window.qaUnsafe), undefined);
    assert((await page.locator('#release-version').textContent()).includes('1.0.0 → 1.1.0'));
    assert.equal(updateDownloads, 0, 'discovery does not start downloads');
    for (const width of [960, 1120, 1280]) {
      await page.setViewportSize({ width, height: width === 1120 ? 720 : 800 });
      const layout = await page.evaluate(() => {
        const panel = document.querySelector('#release-panel').getBoundingClientRect();
        const badge = document.querySelector('#update-notification').getBoundingClientRect();
        const user = document.querySelector('#active-user').getBoundingClientRect();
        return panel.right <= innerWidth && panel.bottom <= innerHeight && badge.right <= user.left;
      });
      assert(layout, 'update panel and header controls fit');
      await page.screenshot({ path: `.tools/qa-updates-${width}.png` });
    }
    await page.click('#release-download'); assert.equal(updateDownloads, 1);
    updateDownloadFails = true;
    await page.click('#release-download');
    await page.waitForFunction(() => document.querySelector('#release-error').textContent.length > 0);
    assert(await page.locator('#release-download').isEnabled());
    updateDownloadFails = false;
    await page.click('#close-release-panel');
    await page.evaluate(() => checkUpdates(true));
    assert(await page.locator('#release-panel').isHidden(), 'same update notification appears only once');
    await page.click('#update-notification');
    assert(await page.locator('#release-panel').isVisible());
    await page.keyboard.press('Escape');
    for (const result of [{ success: false, state: 'error', errorCode: 'RATE_LIMIT' }, { success: true, state: 'unpublished' }, { success: true, state: 'none' }]) {
      updateReply = { currentVersion: '1.0.0', ...result };
      await page.click('#check-updates');
      await page.waitForFunction(state => launcherUpdateState.state === state, result.state);
      assert(await page.locator('#check-updates').isEnabled());
      assert(await page.locator('#update-notification').isHidden());
    }
    await page.evaluate(() => { systemInfo.snapshotVersions = ['26.3-snapshot-1', '25w01a']; populateMinecraftVersions(); });
    assert.equal(await page.locator('#instance-version option[value="26.3-snapshot-1"]').count(), 0);
    await page.locator('[data-section="settings"]:visible').first().click();
    await page.click('[data-settings-tab="game"]');
    await page.check('#show-snapshots');
    await page.waitForFunction(() => document.querySelector('#instance-version option[value="26.3-snapshot-1"]'));
    await page.uncheck('#show-snapshots');
    await page.waitForFunction(() => !document.querySelector('#instance-version option[value="26.3-snapshot-1"]'));
    await page.evaluate(() => {
      const previous = currentSettings.minecraftVersion;
      currentSettings.minecraftVersion = '26.3-snapshot-1'; populateMinecraftVersions();
      if (fields.minecraftVersion.value !== '26.3-snapshot-1' || [...fields.instanceVersion.options].some(option => option.value === '26.3-snapshot-1')) throw Error('Existing snapshot must stay launchable without appearing in creation');
      currentSettings.minecraftVersion = previous; populateMinecraftVersions();
    });
    await page.locator('[data-section="main"]:visible').first().click();

    await page.locator('#launch-horizon').waitFor({state:'visible'});
    for (const section of ['library', 'settings', 'profile', 'main']) {
      await page.locator(section === 'profile' ? '#active-user' : '[data-section="'+section+'"]:visible').first().click();
      if (section === 'settings') {
        assert.equal(await page.locator('[data-settings-tab="technical"], [data-settings-group="technical"], #repair-game').count(), 0);
        for (const tab of ['game','debug','experiments','info']) await page.click('[data-settings-tab="'+tab+'"]');
      }
      assert.equal(await page.locator('#launcher-screen').getAttribute('data-active-section'),section);
    }
    await page.locator('#rail-open-library').click();
    await page.fill('#instance-name','QA Fabric');
    await page.click('#create-instance');
    await page.waitForFunction(()=>document.querySelector('#instance-list')?.textContent.includes('QA Fabric'));
    await page.locator('.instance-content[data-content="worlds"]').first().click();
    await page.waitForFunction(()=>document.querySelector('.installed-mods-panel h3')?.textContent==='Миры сборки');
    await page.click('[data-content-tab="mods"]');
    await page.waitForFunction(()=>document.querySelector('.installed-mods-panel h3')?.textContent==='Моды сборки');
    await page.click('[data-content-tab="resourcepack"]');
    await page.click('#refresh-mods-panel');
    assert(await page.locator('#content-manager-list').isVisible());
    await page.screenshot({path:'.tools/qa-content.png'});
    await page.locator('#rail-open-library').click();
    await page.locator('.instance-edit').first().click();
    assert(await page.locator('#instance-editor').isVisible());
    await page.fill('#instance-editor-name','QA Renamed');
    await page.check('#instance-editor-favorite');
    await page.locator('#instance-editor-form button[type="submit"]').click();
    await page.locator('#instance-editor').waitFor({state:'hidden'});
    assert((await page.locator('#instance-list').textContent()).includes('QA Renamed'));
    await page.fill('#instance-search','no matches');
    assert((await page.locator('#instance-list').textContent()).includes('ничего не найдено'));
    await page.fill('#instance-search','QA Renamed');
    assert.equal(await page.locator('.instance-card').count(),1);
    await page.locator('.instance-edit').first().click();
    assert.equal(await page.inputValue('#instance-editor-name'),'QA Renamed');
    assert(await page.isChecked('#instance-editor-favorite'));
    await page.click('#instance-editor-cancel');
    await page.evaluate(() => {
      const instance = getActiveBuildInstance(), previousIcon = instance.icon;
      const canvas = document.createElement('canvas'); canvas.width = canvas.height = 40;
      const context = canvas.getContext('2d'); context.fillStyle = '#c084fc'; context.fillRect(10, 10, 20, 20);
      try {
        instance.icon = canvas.toDataURL('image/png'); renderInstanceRail(); renderInstanceList();
        for (const selector of ['.instance-rail-button.active', '.instance-card.active .instance-icon']) {
          const button = document.querySelector(selector), style = getComputedStyle(button);
          if (style.backgroundColor !== 'rgba(0, 0, 0, 0)' || style.backgroundImage !== 'none') throw Error(`PNG icon has a background: ${selector}`);
        }
      } finally { instance.icon = previousIcon; renderInstanceRail(); renderInstanceList(); }
    });
    for (const width of [960,1120,1280]) {
      await page.setViewportSize({width,height:width === 1120 ? 720 : 800});
      await page.locator('[data-section="main"]:visible').first().click();
      assert.equal(await page.locator('#launch-instance-name').textContent(),'QA Renamed');
      assert.deepEqual(await page.locator('#server-info .instance-version-tag').allTextContents(), ['Fabric', 'Minecraft 1.20.1']);
      const homeLayout = await page.evaluate(() => {
        const hero = document.querySelector('#wallpaper-preview').getBoundingClientRect();
        const tabs = document.querySelector('.instance-home-tabs').getBoundingClientRect();
        const controls = document.querySelector('.launch-actions').getBoundingClientRect();
        return { gap: tabs.top - hero.bottom, bottom: controls.bottom, height: innerHeight };
      });
      assert(homeLayout.gap >= 16, `Action row needs breathing room: ${JSON.stringify(homeLayout)}`);
      assert.equal(homeLayout.bottom, homeLayout.height);
      assert(await page.locator('.top-nav').isHidden(), 'duplicate launcher header is removed');
      for (const selector of ['#active-user', '#logout-button']) {
        assert.equal(await page.locator(selector).evaluate(el => Boolean(el.closest('.window-titlebar'))), true);
        const bounds = await page.locator(selector).boundingBox();
        const titlebar = await page.locator('.window-titlebar').boundingBox();
        assert(bounds.y >= titlebar.y && bounds.y + bounds.height <= titlebar.y + titlebar.height);
      }
      const railFits = await page.locator('.instance-rail-button.active').evaluate(button => {
        const item = button.getBoundingClientRect(), rail = button.parentElement.getBoundingClientRect();
        const style = getComputedStyle(button), inset = parseFloat(style.outlineWidth) + parseFloat(style.outlineOffset);
        return item.top - inset >= rail.top && item.bottom + inset <= rail.bottom && item.left - inset >= rail.left && item.right + inset <= rail.right;
      });
      assert(railFits, 'selected instance outline must fit inside its scrolling container');
      for (const selector of ['#copy-launch-log', '#home-instance-files', '#home-instance-worlds', '#home-instance-logs', '#add-account']) {
        assert.equal(await page.locator(selector + ' svg[aria-hidden="true"]').count(), 1);
      }
      await page.evaluate(() => { document.querySelector('.dashboard').scrollTop = 10000; });
      assert.equal(await page.locator('.launch-actions').evaluate(el => el.getBoundingClientRect().bottom), await page.evaluate(() => innerHeight));
      await page.evaluate(() => { document.querySelector('.dashboard').scrollTop = 0; });
      for (const selector of ['#home-mods-panel','#open-profile-card','.launch-insights','#open-build-library']) assert(await page.locator(selector).isHidden());
      assert(await page.locator('#account-switch').count());
      assert(await page.locator('#open-launch-logs').isVisible());
      await page.click('#home-instance-files');
      await page.click('#home-instance-logs');
      assert.equal(folderCalls.at(-2).channel, 'open-game-content-folder');
      assert.equal(folderCalls.at(-2).payload.instanceId, await page.evaluate(() => getActiveBuildInstance().id));
      assert.equal(folderCalls.at(-2).payload.type, 'instance');
      assert.equal(folderCalls.at(-1).channel, 'open-logs-folder');
      await page.evaluate(() => {
        launchLogEntries.length = 0;
        appendLog({ level: 'info', message: 'LOG INFO' });
        appendLog({ level: 'debug', message: 'LOG DEBUG' });
        appendLog({ level: 'warn', message: 'LOG WARNING' });
        appendLog('Ошибка: LOG ERROR');
        appendLog('[lifecycle] {"event":"stage"}');
        appendLog({ level: 'error', message: '<img src=x onerror=alert(1)>' });
      });
      assert(!(await page.locator('#launch-log').textContent()).includes('LOG DEBUG'));
      assert(!(await page.locator('#launch-log').textContent()).includes('[lifecycle]'));
      assert.equal(await page.locator('#launch-log img').count(), 0);
      assert((await page.locator('#launch-log .log-error').first().textContent()).includes('LOG ERROR'));
      await page.check('[data-log-level="debug"]');
      assert((await page.locator('#launch-log').textContent()).includes('LOG DEBUG'));
      await page.uncheck('[data-log-level="debug"]');
      folderError = 'QA folder access denied';
      await page.click('#home-instance-files');
      await page.waitForFunction(() => document.querySelector('#launch-log').textContent.includes('QA folder access denied'));
      folderError = '';
      await page.screenshot({path:'.tools/qa-home-'+width+'.png'});
      await page.click('#clear-log');
      assert.equal(await page.locator('#launch-log').textContent(), '');
      if (width === 1280) await page.screenshot({ path: '.tools/qa-home-final.png' });
      const logout = page.locator('#logout-button');
      const collapsedWidth = (await logout.boundingBox()).width;
      assert.equal(collapsedWidth, 38);
      await logout.hover();
      await page.waitForFunction(() => document.getElementById('logout-button').getBoundingClientRect().width === 138 && getComputedStyle(document.getElementById('logout-button')).color === 'rgb(253, 164, 175)');
      assert.equal(await logout.evaluate(el => getComputedStyle(el).color), 'rgb(253, 164, 175)');
      assert.equal(await logout.getAttribute('aria-label'), 'Выйти');
      await page.screenshot({path:'.tools/qa-logout-'+width+'.png'});
      await page.mouse.move(500,400);
      await page.click('#home-instance-worlds');
      await page.waitForFunction(()=>document.querySelector('#launcher-screen').dataset.activeSection==='mods');
      await page.locator('[data-section="settings"]:visible').first().click();
      await page.click('[data-settings-tab="experiments"]');
      await page.uncheck('#rust-minecraft');
      await page.waitForFunction(()=>document.getElementById('launch-horizon').classList.contains('hidden'));
      await page.check('#rust-minecraft');
      await page.waitForFunction(()=>!document.getElementById('launch-horizon').classList.contains('hidden'));
      await page.locator('[data-section="main"]:visible').first().click();
      assert(await page.locator('#launch-horizon').isVisible());
      const javaBox = await page.locator('#launch-button').boundingBox();
      const rustBox = await page.locator('#launch-horizon').boundingBox();
      assert(Math.abs(javaBox.y-rustBox.y)<5);
      assert(javaBox.x+javaBox.width<=rustBox.x);
      await page.screenshot({path:'.tools/qa-rust-buttons-'+width+'.png'});
      await page.click('#launch-horizon');
      await page.waitForFunction(()=>document.querySelector('#horizon-status').textContent.includes('Microsoft'));
      assert(await page.locator('#launch-horizon').isEnabled());
      await page.screenshot({path:'.tools/qa-horizon-'+width+'.png'});
      await page.locator('[data-section="settings"]:visible').first().click();
      await page.click('[data-settings-tab="experiments"]');
      await page.uncheck('#rust-minecraft');
      await page.waitForFunction(()=>document.getElementById('launch-horizon').classList.contains('hidden'));
      await page.locator('#rail-open-library').click();
      assert(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth));
      await page.screenshot({path:'.tools/qa-library-'+width+'.png'});
    }
    await page.screenshot({path:'.tools/qa-library.png'});
    await page.locator('[data-section="settings"]:visible').first().click();
    await page.click('[data-settings-tab="game"]');
    assert.equal(await page.locator('[data-settings-tab="game"]').getAttribute('aria-pressed'), 'true');
    await page.screenshot({path:'.tools/qa-settings.png', animations:'disabled'});
    await page.click('[data-settings-tab="debug"]');
    assert(await page.locator('#open-logs').isVisible());
    await page.screenshot({path:'.tools/qa-diagnostics.png', animations:'disabled'});
    await page.locator('#active-user').click();
    await page.waitForFunction(() => ['active-user-avatar', 'profile-main-avatar'].every(id => { const image = document.getElementById(id); return image.complete && image.naturalWidth > 0; }));
    await page.screenshot({path:'.tools/qa-profile.png'});
    spotifyUiMode = 'success';
    await page.click('#connect-spotify');
    await page.locator('#disconnect-spotify').waitFor({state:'visible'});
    assert.deepEqual(spotifyCalls, ['start', 'open', 'complete']);
    assert(authorization.includes('state=qa&code_challenge=test'));
    assert((await page.locator('#spotify-account').textContent()).includes('QA listener'));
    await page.click('#disconnect-spotify');
    await page.locator('#connect-spotify').waitFor({state:'visible'});
    spotifyUiMode = 'browser-error';
    await page.click('#connect-spotify');
    await page.waitForFunction(() => document.getElementById('spotify-now-playing').textContent.includes('Cannot open Spotify browser'));
    assert(await page.locator('#connect-spotify').isEnabled());
    spotifyUiMode = 'cancel';
    await page.click('#connect-spotify');
    await page.locator('#cancel-spotify').waitFor({state:'visible'});
    assert(await page.locator('#connect-spotify').isDisabled());
    await page.click('#cancel-spotify');
    assert(await page.locator('#cancel-spotify').isHidden());
    assert(await page.locator('#connect-spotify').isEnabled());
    spotifyUiMode = null;
    for (const theme of ['light', 'deep', 'contrast']) {
      await page.evaluate(theme => { document.body.dataset.theme = theme; }, theme);
      await page.screenshot({path:'.tools/qa-profile-'+theme+'.png', animations:'disabled'});
      assert(await page.evaluate(()=>document.documentElement.scrollWidth <= innerWidth));
    }
    assert.deepEqual(errors,[]);
    for (const language of ['en', 'es']) {
      await page.locator('[data-section="settings"]:visible').first().click();
      await page.click('[data-settings-tab="game"]');
      await page.evaluate(language => { fields.language.value = language; fields.language.dispatchEvent(new Event('change')); }, language);
      await page.waitForFunction(language => document.documentElement.lang === language && currentSettings.language === language, language);
      await page.click('[data-settings-tab="debug"]');
      await page.click('#show-current-release');
      await page.waitForFunction(language => document.querySelector('#release-notes').textContent.includes(language === 'en' ? 'First public release' : 'Primera versión pública'), language);
      await page.screenshot({ path: `.tools/qa-updates-${language}.png` });
      await page.keyboard.press('Escape');
      const missing = new Set();
      async function collectMissing() {
        const values = await page.evaluate(() => {
          const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT), values = [];
          while (walker.nextNode()) {
            const node = walker.currentNode, parent = node.parentElement;
            if (parent?.checkVisibility() && !parent.closest('script,style,pre,code,textarea,[data-i18n-ignore],.instance-card strong,.mod-row-main span') && /[а-яё]/i.test(node.nodeValue)) values.push(node.nodeValue.trim());
          }
          return values;
        });
        values.forEach(value => missing.add(value));
      }
      for (const tab of ['game', 'experiments', 'debug', 'info']) { await page.click(`[data-settings-tab="${tab}"]`); await collectMissing(); }
      for (const section of ['library', 'profile', 'main']) { await page.locator(section === 'profile' ? '#active-user' : `[data-section="${section}"]:visible`).first().click(); await collectMissing(); }
      assert.deepEqual([...missing].filter(value => value !== 'Русский'), [], `Untranslated visible text: ${language}`);
    }
    console.log('PASS: navigation, settings cleanup, instances, content, logout expansion/red hover, Spotify native browser order, success/error/cancel, offline avatars and all themes');
  } finally {
    if (browser) await browser.close();
    const exited = new Promise(resolve => backend.once('exit', resolve));
    backend.stdin.end(); await exited;
    fs.rmSync(profile,{recursive:true,force:true});
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
