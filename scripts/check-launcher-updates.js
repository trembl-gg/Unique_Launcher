const assert = require('node:assert/strict');
const { LauncherUpdates, compareVersions, LATEST_API } = require('../lib/launcher-updates');

const release = (tag = 'v1.1.0') => ({ tag_name: tag, name: 'New release', body: '## Added\n- Feature', html_url: `https://github.com/trembl-gg/Unique_Launcher/releases/tag/${tag}` });
async function check() {
  assert.equal(compareVersions('1.10.0', '1.9.9'), 1);
  assert.equal(compareVersions('v.1.0.1', 'v1.0.0'), 1);
  assert.equal(compareVersions('v1.0.0+build.5', '1.0.0'), 0);
  assert.equal(compareVersions('1.0.0', '1.0.1'), -1);
  for (const version of ['1.0', '01.0.0', '1.0.0-rc.1', 'garbage', '9007199254740992.0.0']) assert.throws(() => compareVersions(version, '1.0.0'));
  let now = 0, calls = 0, resolveRequest;
  const service = new LauncherUpdates({ version: '1.0.0', now: () => now, request: async (method, url, options) => {
    calls++;
    assert.equal(method, 'GET'); assert.equal(url, LATEST_API);
    assert.equal(options.headers['User-Agent'], 'Unique-Launcher/1.0.0');
    assert.equal(options.timeoutMs, 8000);
    if (calls === 1) return new Promise(resolve => { resolveRequest = resolve; });
    return release();
  } });
  const first = service.check(), second = service.check();
  assert.equal(calls, 1); resolveRequest(release());
  assert.equal((await first).state, 'available'); assert.deepEqual(await second, await first);
  await service.check(); assert.equal(calls, 1);
  now = 300000; await service.check(); assert.equal(calls, 2);
  for (const tag of ['1.0.0', 'v0.9.0']) assert.equal((await new LauncherUpdates({ version: '1.0.0', request: async () => release(tag) }).check()).state, 'none');
  for (const data of [null, { ...release(), draft: true }, { ...release(), prerelease: true }, release('1.1.0-beta'), { ...release(), html_url: 'https://evil.test/release' }, { ...release(), html_url: 'https://github.com/other/repo/releases/tag/v1.1.0' }, { ...release(), html_url: 'https://user@github.com/trembl-gg/Unique_Launcher/releases/tag/v1.1.0' }]) {
    assert.equal((await new LauncherUpdates({ version: '1.0.0', request: async () => data }).check()).state, 'error');
  }
  for (const statusCode of [404, 403, 429, 500, undefined]) {
    let attempts = 0;
    const failed = new LauncherUpdates({ version: '1.0.0', request: async () => { attempts++; if (attempts === 1) throw Object.assign(Error('Request failed'), { statusCode }); return release(); } });
    const result = await failed.check();
    assert.equal(result.state, statusCode === 404 ? 'unpublished' : 'error');
    if ([403, 429].includes(statusCode)) assert.equal(result.errorCode, 'RATE_LIMIT');
    assert.equal((await failed.check()).state, statusCode === 404 ? 'unpublished' : 'available');
    assert.equal(attempts, statusCode === 404 ? 1 : 2);
  }
  const bounded = await new LauncherUpdates({ version: '1.0.0', request: async () => ({ ...release(), name: 'x'.repeat(300), body: 'x'.repeat(65000) }) }).check();
  assert.equal(bounded.release.title.length, 200); assert.equal(bounded.release.notes.length, 64000);
  console.log('PASS: numeric stable versions, GitHub URL validation, coalescing, cache expiry, unpublished release, rate limits and offline retry');
}
check().catch(error => { console.error(error); process.exitCode = 1; });
