const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('renderer/renderer.js','utf8');
let allocations=0,draws=0;
const context=vm.createContext({
 playerPreview:{cropCache:new Map()},getImageId:()=>1,
 document:{createElement(){allocations++;return{width:0,height:0,getContext:()=>({clearRect(){},drawImage(){draws++;}})};}}
});
vm.runInContext(source.slice(source.indexOf('function getTextureCrop('),source.indexOf('function drawPlayerPreview(')),context);
const texture={image:{width:64,height:32},sx:1,sy:1,sw:8,sh:8,animated:true};
const first=context.getTextureCrop(texture);
for(let i=0;i<100;i++)assert.equal(context.getTextureCrop(texture),first);
assert.equal(allocations,1);assert.equal(draws,101);
texture.animated=false;context.getTextureCrop(texture);assert.equal(draws,101);
let loaded=0,observed=0;
const backend=fs.readFileSync('main.js','utf8');
const lazy=vm.createContext({BrowserWindow:{getAllWindows:()=>[]},require(name){if(name==='minecraft-launcher-core'){loaded++;return{};}if(name==='request')return{};return{observeLegacyDownloads(){observed++;}};}});
vm.runInContext(backend.slice(backend.indexOf('let launcher;'),backend.indexOf('function loadDotEnv()')),lazy);
assert.equal(loaded,0);assert.equal(lazy.getMinecraftLauncher(),lazy.getMinecraftLauncher());assert.equal(loaded,1);assert.equal(observed,1);
console.log('PASS: Minecraft engine loads only on demand; animated cape reuses buffers across frames');
