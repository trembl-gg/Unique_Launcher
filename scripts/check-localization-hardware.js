const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const { memoryBudget } = require('../lib/memory-budget');
const { SettingsService } = require('../lib/settings-service');
const ctx = { window: {}, MutationObserver: class { observe() {} disconnect() {} } };
vm.createContext(ctx);
for (const file of ['localizer.js', 'translations.js']) vm.runInContext(fs.readFileSync(`renderer/${file}`, 'utf8'), ctx);
let language = 'en';
const translator = new ctx.window.Localizer(ctx.window.extraTranslations, () => language);
const node = {};
let text = translator.value('  Максимум ОЗУ  ', node, 'text');
assert.equal(text, '  Maximum RAM  ');
language = 'es'; text = translator.value(text, node, 'text'); assert.equal(text, '  RAM máxima  ');
language = 'ru'; text = translator.value(text, node, 'text'); assert.equal(text, '  Максимум ОЗУ  ');
assert.equal(translator.value('Maximum RAM', {}, 'text'), 'Максимум ОЗУ', 'cloned dropdown label must return to Russian');
language = 'en';
assert.equal(translator.value('Minecraft завершился с кодом 1', node, 'text'), 'Minecraft exited with code 1');
language = 'es';
assert.equal(translator.value('Minecraft exited with code 1', node, 'text'), 'Minecraft terminó con el código 1');
assert.equal(translator.value('My Custom World', {}, 'text'), 'My Custom World');
for (const canonical of ['java из PATH', 'Версия 26.3', 'Найдено: 8. Версия: 26.3.', 'Показывать снапшоты Minecraft', 'Привязать Spotify', 'Spotify подключен, сейчас ничего не играет.', 'Слушает: Artist - Song', 'Аккаунт: Player', 'Настройки сборки', 'Custom', 'Миры сборки']) {
  const target = {}; let value = canonical;
  for (const lang of ['en', 'es', 'ru', 'en']) {
    language = lang; value = translator.value(value, target, 'text');
    assert(value.length > 0);
    if (lang !== 'ru') assert(!/[а-яё]/i.test(value), `${canonical}: untranslated ${lang}`);
  }
}
for (const entry of Object.values(ctx.window.extraTranslations)) { assert(entry.en); assert(entry.es); }
assert.equal(memoryBudget(4096), 3072); assert.equal(memoryBudget(8192), 6144);
assert.equal(memoryBudget(32768), 30720); assert.equal(memoryBudget(NaN), 1024);
const data = new Map();
const settings = new SettingsService({ store: { get: (key, fallback) => data.get(key) ?? fallback, set: (key, value) => data.set(key, value) }, userKey: 'users', globalKey: 'settings', server: {}, normalizeLoader: value => value || 'fabric', resolveServer: () => null });
settings.saveSettings({ language: 'es' }, 'Player');
assert.equal(settings.getSettings().language, 'es', 'auth screen uses device language');
assert.equal(settings.getSettings('Other').language, 'es', 'language survives account switch');
assert(settings.saveSettings({ memory: { max: 9999999 } }).memory.max <= memoryBudget());
console.log('PASS: RU/EN/ES round trips, cloned labels, dynamic statuses, device language and RAM limits');
