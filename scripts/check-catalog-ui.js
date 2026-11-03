const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('renderer/renderer.js', 'utf8');
const extract = (from, to) => source.slice(source.indexOf(from), source.indexOf(to, source.indexOf(from)));
(async () => {
  const backend = fs.readFileSync('main.js','utf8');
  let openFolder;
  const folderContext = vm.createContext({
    ensureDir() {}, getGameRoot:()=> 'instance/root',
    ipcMain:{handle:(_,handler)=>{openFolder=handler;}},
    getContentFolder:type=>{if (!['mods','resourcepack','shader','worlds'].includes(type)) throw Error('Unsupported content type.'); return 'instance/'+type;},
    shell:{openPath:async()=>''}
  });
  vm.runInContext(backend.slice(backend.indexOf("ipcMain.handle('open-game-content-folder'"),backend.indexOf("ipcMain.handle('open-user-mods-folder'")),folderContext);
  for (const type of ['mods','resourcepack','shader','worlds','resourcepacks','shaders']) assert.equal((await openFolder({}, {type})).success,true);
  assert.equal((await openFolder({}, {type:'unknown'})).success,false);
  const pending = [], rendered = [], status = {};
  const context = vm.createContext({
    activeContentType: 'mods', currentSettings: { activeInstanceId: 'first' },
    getSelectedModLoader: () => 'fabric', getSelectedMinecraftVersion: () => '1.20.1',
    modrinthModSearch: { value: '' }, modrinthModStatus: status, modrinthModResults: {},
    window: { api: { searchModrinth: () => new Promise(resolve => pending.push(resolve)) } },
    setStatusText: (target, text) => { target.text = text; },
    renderModrinthProjects: (_, projects) => rendered.push(projects), renderCatalogPagination() {}
  });
  vm.runInContext(extract('let modrinthSearchRevision =', 'async function searchModrinthPacks('), context);
  const old = context.searchModrinthMods(), latest = context.searchModrinthMods();
  pending[1]({success:true,projects:['latest']}); await latest;
  pending[0]({success:true,projects:['stale']}); await old;
  assert.equal(JSON.stringify(rendered), '[["latest"]]');
  const switched = context.searchModrinthMods(); context.activeContentType = 'shader';
  pending[2]({success:true,projects:['wrong tab']}); await switched;
  assert.equal(rendered.length,1);
  context.window.api.searchModrinth = async () => { throw Error('Connection lost'); };
  await context.searchModrinthMods(); assert.equal(status.text,'Connection lost');
  Object.assign(context, {
    activeUser:{nickname:'QA'}, modrinthContentStatus:{}, normalizeModrinthProjectType: value=>value,
    formatModrinthProjectType:value=>value, getSelectedContentType:()=> 'resourcepack',
    refreshContentManager:async()=>{},
  });
  vm.runInContext(extract('async function installModrinthProject(', 'async function installModrinthMod('),context);
  const button={textContent:'Install',dataset:{projectType:'resourcepack'},closest:()=>true};
  context.window.api.installModrinthProject=async payload=>{assert.equal(payload.instanceId,'first');throw Error('Install failed');};
  await context.installModrinthProject(button);
  assert.equal(button.disabled,false); assert.equal(button.textContent,'Install'); assert.equal(status.text,'Install failed');
  Object.assign(context, { refreshMods: async () => {} });
  vm.runInContext(extract('async function installModrinthMod(', 'async function installModrinthPack('), context);
  context.window.api.installModrinthMod = async payload => { assert.equal(payload.instanceId, 'first'); throw Error('Mod install failed'); };
  await context.installModrinthMod(button);
  assert.equal(button.disabled, false); assert.equal(button.textContent, 'Install'); assert.equal(status.text, 'Mod install failed');
  console.log('PASS: newest search wins, switched tabs ignore stale results, network errors shown, failed installs unlock button and target correct status/instance');
})().catch(error=>{console.error(error);process.exitCode=1;});
