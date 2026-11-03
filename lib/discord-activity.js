const { version } = require('../package.json');

class DiscordActivity {
  constructor(launcherName) { this.launcherName = launcherName; }

  create(context, buttons = []) {
    const language = ['ru', 'en', 'es'].includes(context.language) ? context.language : 'ru';
    const words = ({ ru: { main: 'Выбирает сборку', library: 'Ищет сборку', mods: 'Выбирает моды и ресурсы', settings: 'Настраивает лаунчер', profile: 'Настраивает профиль', playing: 'Играет в Minecraft', microsoft: 'Microsoft', offline: 'Офлайн' }, en: { main: 'Choosing an instance', library: 'Searching for modpacks', mods: 'Browsing mods and resources', settings: 'Changing launcher settings', profile: 'Customizing a profile', playing: 'Playing Minecraft', microsoft: 'Microsoft', offline: 'Offline' }, es: { main: 'Eligiendo instancia', library: 'Buscando modpacks', mods: 'Explorando mods y recursos', settings: 'Configurando el launcher', profile: 'Personalizando el perfil', playing: 'Jugando a Minecraft', microsoft: 'Microsoft', offline: 'Sin conexión' } })[language] || {};
    const account = context.microsoft && !context.guest ? words.microsoft : words.offline;
    const launcher = `${this.launcherName} ${version}`;
    const activity = {
      details: context.memoryMax ? words.playing : context.section === 'create' ? ({ ru: 'Создаёт сборку', en: 'Creating an instance', es: 'Creando una instancia' })[language] : words[context.section] || words.main,
      state: context.nickname ? `${launcher} · ${context.nickname} · ${account}` : launcher,
      startTimestamp: context.startTimestamp || Date.now(),
      name: launcher,
      largeImageText: launcher
    };
    const downloadUrl = 'https://github.com/trembl-gg/Unique_Launcher/releases/latest';
    const socials = (Array.isArray(buttons) ? buttons : []).filter(button => {
      if (typeof button?.label !== 'string' || button.label.length < 2 || button.label.length > 32 || typeof button.url !== 'string' || button.url.length > 512 || button.url === downloadUrl) return false;
      try { const url = new URL(button.url); return url.protocol === 'https:' && !url.username && !url.password; } catch { return false; }
    });
    const social = socials[Math.max(0, Math.floor(Number(context.socialIndex) || 0)) % socials.length];
    activity.buttons = [{ label: ({ ru: 'Скачать лаунчер', en: 'Download launcher', es: 'Descargar launcher' })[language], url: downloadUrl }];
    if (social) activity.buttons.push({ label: social.label, url: social.url });
    return activity;
  }
}

module.exports = { DiscordActivity };
