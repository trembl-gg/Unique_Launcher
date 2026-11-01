function parseArguments(text = '') {
  if (typeof text !== 'string' || text.length > 8192 || text.includes('\0')) throw new Error('Некорректные параметры запуска.');
  const result = []; let token = '', quote = '', started = false;
  for (const char of text) {
    if (char === '"' || char === "'") {
      if (!quote) { quote = char; started = true; }
      else if (quote === char) quote = '';
      else token += char;
    } else if (/\s/.test(char) && !quote) {
      if (started) { result.push(token); token = ''; started = false; }
    } else { token += char; started = true; }
  }
  if (quote) throw new Error('Закройте кавычки в параметрах запуска.');
  if (started) result.push(token);
  return result;
}
function instanceLaunchOptions(instance = {}) {
  const jvm = parseArguments(instance.jvmArguments || '');
  const game = parseArguments(instance.gameArguments || '');
  // The launcher owns identity, paths, classpath and memory. Never run a shell.
  if (jvm.some(arg => !/^-D[^=\s]+=|^-XX:[^\s]+$|^-X(?:ss|ms|mx)[^\s]+$/.test(arg) || /^-Xm[sx]/i.test(arg))) throw new Error('Используйте JVM-параметры -D, -XX или -Xss. ОЗУ задаётся в настройках.');
  if (game.some(arg => /^--(?:accessToken|username|uuid|userType|userProperties|gameDir|assetsDir|assetIndex|version|versionType|clientId|xuid)(?:=|$)/i.test(arg) || /^@/.test(arg))) throw new Error('Нельзя переопределять аккаунт и служебные пути игры.');
  return { jvm, game };
}
function mergeJvmArguments(defaults, custom) {
  const key = value => value.replace(/^(-XX:)[+-]/, '$1').split('=')[0];
  const keys = new Set(custom.map(key));
  const collector = custom.some(value => /^-XX:\+Use\w+GC$/.test(value));
  return defaults.filter(value => !keys.has(key(value)) && !(collector && /^-XX:\+Use\w+GC$/.test(value))).concat(custom);
}
module.exports = { parseArguments, instanceLaunchOptions, mergeJvmArguments };
