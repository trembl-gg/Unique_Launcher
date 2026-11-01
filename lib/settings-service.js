const { isDeepStrictEqual } = require('node:util');
const { memoryBudget } = require('./memory-budget');
const { findHorizonInstallation, resolveHorizonPaths } = require('./horizon-client');
const horizonDefaults = findHorizonInstallation();

class SettingsService {
  constructor({ store, userKey, globalKey, server, normalizeLoader, resolveServer }) {
    Object.assign(this, { store, USER_SETTINGS_KEY: userKey, SETTINGS_KEY: globalKey, PROJECT_SERVER: server, normalizeModLoader: normalizeLoader, getProjectServerFromCache: resolveServer });
  }

  getDefaultSettings() {
    return {
      minecraftVersion: '1.20.1',
      activeInstanceId: '',
      buildProfile: 'normal',
      projectId: 'unique',
      loader: 'Fabric',
      modLoader: 'fabric',
      loaderVersion: 'latest',
      fabricLoaderVersion: 'latest',
      forgeVersion: 'latest',
      neoforgeVersion: 'latest',
      quiltLoaderVersion: 'latest',
      memory: { min: 1024, max: Math.min(4096, memoryBudget()) },
      wallpaper: null,
      skin: null,
      skinModel: 'auto',
      cape: null,
      javaPath: '',
      hideLauncherDuringGame: true,
      showSnapshots: false,
      useUniqueMods: true,
      language: 'ru',
      ...horizonDefaults,
      experiments: { spotifyTheme: false, visualizer: false, streamerMode: false, rustMinecraft: true },
      appearance: {
        theme: 'cosmic',
        accent: 'violet',
        reduceMotion: false
      },
      server: this.PROJECT_SERVER
    };
  }

  normalizeSettings(settings = {}, base = this.getDefaultSettings()) {
    const defaults = this.getDefaultSettings();

    return {
      ...defaults,
      ...base,
      ...settings,
      ...resolveHorizonPaths({ ...base, ...settings }, horizonDefaults),
      memory: { min: 1024, max: Math.min(memoryBudget(), Math.max(1024, Number(settings.memory?.max ?? base.memory?.max) || defaults.memory.max)) },
      language: this.store.get('uiLanguage', settings.language || base.language || 'ru'),
      appearance: { ...defaults.appearance, ...(base.appearance || {}), ...(settings.appearance || {}) },
      experiments: { ...defaults.experiments, ...(base.experiments || {}), ...(settings.experiments || {}) },
      server: { ...defaults.server, ...(base.server || {}), ...(settings.server || {}) }
    };
  }

  getUserSettingsMap() {
    return this.store.get(this.USER_SETTINGS_KEY, {});
  }

  getSettings(nickname = '') {
    const globalSettings = this.normalizeSettings(this.store.get(this.SETTINGS_KEY, {}));
    const normalizedNickname = String(nickname || '').trim();
    if (!normalizedNickname) {
      return globalSettings;
    }

    const userSettings = this.getUserSettingsMap()[normalizedNickname];
    const userBase = {
      ...globalSettings,
      skin: null,
      skinModel: 'auto',
      cape: null
    };
    return this.normalizeSettings(userSettings || {}, userBase);
  }

  saveSettings(settings, nickname = '') {
    const normalizedNickname = String(nickname || '').trim();
    const previous = this.getSettings(normalizedNickname);
    const requestedMemory = Number(settings.memory?.max);
    const maxMemory = Math.min(memoryBudget(), Number.isFinite(requestedMemory) ? Math.max(1024, Math.floor(requestedMemory)) : 4096);
    const skinModel = ['auto', 'default', 'slim'].includes(settings.skinModel) ? settings.skinModel : 'auto';
    const requestedAccent = String(settings.appearance?.accent || '').trim();
    const accent = ['violet', 'cyan', 'emerald', 'rose'].includes(requestedAccent)
      ? requestedAccent
      : /^#[0-9a-f]{6}$/i.test(requestedAccent)
        ? requestedAccent.toLowerCase()
        : 'violet';
    const appearance = {
      theme: ['cosmic', 'light', 'deep', 'contrast'].includes(settings.appearance?.theme) ? settings.appearance.theme : 'cosmic',
      accent,
      reduceMotion: Boolean(settings.appearance?.reduceMotion)
    };
    const modLoader = this.normalizeModLoader(settings.modLoader || settings.loader);
    const next = {
      ...previous,
      ...settings,
      memory: {
        min: Math.min(1024, maxMemory),
        max: maxMemory
      },
      skinModel,
      appearance,
      experiments: {
        rustMinecraft: settings.experiments?.rustMinecraft === undefined ? previous.experiments.rustMinecraft : settings.experiments.rustMinecraft === true,
        spotifyTheme: settings.experiments?.spotifyTheme === true,
        visualizer: settings.experiments?.visualizer === true,
        streamerMode: settings.experiments?.streamerMode === true
      },
      maxFps: Math.max(30, Number(settings.maxFps) || 60),
      hideLauncherDuringGame: Boolean(settings.hideLauncherDuringGame),
      showSnapshots: settings.showSnapshots === undefined ? previous.showSnapshots : settings.showSnapshots === true,
      useUniqueMods: settings.useUniqueMods !== false,
      language: ['ru', 'en', 'es'].includes(String(settings.language || previous.language || '').toLowerCase()) ? String(settings.language || previous.language).toLowerCase() : 'ru',
      activeInstanceId: String(settings.activeInstanceId || '').trim(),
      modLoader,
      loader: modLoader === 'fabric' ? 'Fabric' : modLoader,
      loaderVersion: String(settings.loaderVersion || 'latest').trim() || 'latest',
      fabricLoaderVersion: String(settings.fabricLoaderVersion || settings.loaderVersion || 'latest').trim() || 'latest',
      forgeVersion: String(settings.forgeVersion || settings.loaderVersion || 'latest').trim() || 'latest',
      neoforgeVersion: String(settings.neoforgeVersion || settings.loaderVersion || 'latest').trim() || 'latest',
      quiltLoaderVersion: String(settings.quiltLoaderVersion || settings.loaderVersion || 'latest').trim() || 'latest',
      projectId: String(settings.projectId || 'unique'),
      server: this.getProjectServerFromCache(String(settings.projectId || 'unique')) || this.PROJECT_SERVER
    };

    this.store.set('uiLanguage', next.language);
    if (isDeepStrictEqual(previous, next)) return previous;
    if (normalizedNickname) {
      const userSettings = this.getUserSettingsMap();
      userSettings[normalizedNickname] = next;
      this.store.set(this.USER_SETTINGS_KEY, userSettings);
    } else {
      this.store.set(this.SETTINGS_KEY, next);
    }
    return next;
  }
}

module.exports = { SettingsService };
