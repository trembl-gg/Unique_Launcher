const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pipeline } = require('node:stream/promises');

const COMPACT_MANIFEST = 'unique-compact.json';
const AUDIO_PREFIX = 'minecraft/sounds/';

async function downloadAudio(url, target, checkpoint) {
  const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
  if (!response.ok) throw new Error(`Minecraft audio: HTTP ${response.status}`);
  await pipeline(response.body, async function* (chunks) {
    for await (const chunk of chunks) { checkpoint(); yield chunk; }
  }, fs.createWriteStream(target));
}

async function validAudio(file, object) {
  try {
    if ((await fs.promises.stat(file)).size !== object.size) return false;
    const hash = crypto.createHash('sha1');
    for await (const chunk of fs.createReadStream(file)) hash.update(chunk);
    return hash.digest('hex') === object.hash;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

async function ensureHorizonResources({ resources, cacheRoot, checkpoint = () => {}, onProgress = () => {}, download = downloadAudio }) {
  const manifestPath = path.join(resources, COMPACT_MANIFEST);
  if (!fs.existsSync(manifestPath)) return resources;
  const manifest = JSON.parse(await fs.promises.readFile(manifestPath, 'utf8'));
  const indexBytes = await fs.promises.readFile(path.join(resources, 'asset-index.json'));
  if (manifest.schema !== 1 || !/^[a-f0-9]{64}$/.test(manifest.coreHash) ||
      crypto.createHash('sha256').update(indexBytes).digest('hex') !== manifest.indexHash) {
    throw new Error('Повреждён комплект ресурсов Minecraft Rust. Переустановите лаунчер.');
  }
  const objects = JSON.parse(indexBytes).objects;
  if (!objects || typeof objects !== 'object') throw new Error('Некорректный индекс ресурсов Minecraft.');
  const audio = Object.entries(objects).filter(([name]) => name.startsWith(AUDIO_PREFIX));
  for (const [name, object] of audio) {
    if (!/^minecraft\/sounds\/(?:[a-zA-Z0-9_-]+\/)*[a-zA-Z0-9_.-]+\.ogg$/.test(name) ||
        !/^[a-f0-9]{40}$/.test(object?.hash) || !Number.isSafeInteger(object.size) || object.size <= 0) {
      throw new Error('Некорректный аудиофайл в индексе Minecraft.');
    }
  }
  checkpoint();
  // Installed files may be read-only. Keep the completed resources in game storage.
  const target = path.join(cacheRoot, manifest.coreHash);
  const ready = path.join(target, '.unique-core-ready');
  if (!fs.existsSync(ready)) {
    onProgress({ stage: 'assets', name: 'Подготовка ресурсов Minecraft Rust', percent: 0 });
    await fs.promises.cp(resources, target, { recursive: true });
    checkpoint();
    await fs.promises.writeFile(ready, manifest.coreHash);
  }
  let cursor = 0, complete = 0, stopped = false, lastProgress = 0;
  const total = audio.reduce((sum, [, object]) => sum + object.size, 0);
  const worker = async () => {
    while (!stopped && cursor < audio.length) {
      checkpoint();
      const [name, object] = audio[cursor++];
      const file = path.join(target, 'assets', ...name.split('/'));
      if (!await validAudio(file, object)) {
        const partial = `${file}.part`;
        await fs.promises.mkdir(path.dirname(file), { recursive: true });
        try {
          await download(`https://resources.download.minecraft.net/${object.hash.slice(0, 2)}/${object.hash}`, partial, checkpoint);
          checkpoint();
          if (!await validAudio(partial, object)) throw new Error(`Не прошла проверка звука Minecraft: ${path.basename(file)}`);
          await fs.promises.rename(partial, file);
        } finally { await fs.promises.rm(partial, { force: true }); }
      }
      complete += object.size;
      if (Date.now() - lastProgress > 200 || complete === total) {
        lastProgress = Date.now();
        onProgress({ stage: 'assets', name: 'Звуки и музыка Minecraft Rust', received: complete, total, percent: Math.floor(complete / total * 100) });
      }
    }
  };
  const results = await Promise.allSettled(Array.from({ length: 8 }, () => worker().catch(error => { stopped = true; throw error; })));
  const failure = results.find(result => result.status === 'rejected');
  if (failure) {
    if (failure.reason.code === 'LAUNCH_CANCELLED') throw failure.reason;
    throw new Error(`Не удалось подготовить звуки Minecraft Rust. Проверьте интернет и повторите запуск — готовые файлы сохраняются. ${failure.reason.message}`);
  }
  checkpoint();
  return target;
}

module.exports = { ensureHorizonResources, COMPACT_MANIFEST, AUDIO_PREFIX };
