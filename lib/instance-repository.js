const crypto = require('node:crypto');

class InstanceRepository {
  constructor({ store, key, normalizeModLoader, getSettings, saveSettings }) {
    Object.assign(this, { store, BUILD_INSTANCES_KEY: key, normalizeModLoader, getSettings, saveSettings });
  }
  normalizeInstanceOwner(nickname = '') {
    return String(nickname || 'global').trim() || 'global';
  }

  getBuildInstanceStore() {
    return this.store.get(this.BUILD_INSTANCES_KEY, {});
  }

  saveBuildInstanceStore(value) {
    this.store.set(this.BUILD_INSTANCES_KEY, value);
  }

  createBuildInstanceId() {
    return `inst_${Date.now().toString(36)}_${crypto.randomBytes(3).toString('hex')}`;
  }

  normalizeBuildInstance(instance = {}) {
    const minecraftVersion = String(instance.minecraftVersion || instance.version || '1.20.1').trim();
    const loader = this.normalizeModLoader(instance.loader || instance.modLoader || 'fabric');
    const name = String(instance.name || '').trim() || `${loader.toUpperCase()} ${minecraftVersion}`;
    const now = new Date().toISOString();

    return {
      id: String(instance.id || this.createBuildInstanceId()).trim(),
      name,
      jvmArguments: typeof instance.jvmArguments === 'string' ? instance.jvmArguments.slice(0, 8192) : '',
      gameArguments: typeof instance.gameArguments === 'string' ? instance.gameArguments.slice(0, 8192) : '',
      minecraftVersion,
      icon: typeof instance.icon === 'string' && instance.icon.length <= 180000 && /^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(instance.icon) ? instance.icon : '',
      favorite: instance.favorite === true,
      iconSource: /^https:\/\/(cdn|cdn-raw)\.modrinth\.com\//.test(instance.iconSource || '') ? instance.iconSource : '',
      loader,
      loaderVersion: String(instance.loaderVersion || 'latest').trim() || 'latest',
      fabricLoaderVersion: String(instance.fabricLoaderVersion || instance.loaderVersion || 'latest').trim() || 'latest',
      forgeVersion: String(instance.forgeVersion || instance.loaderVersion || 'latest').trim() || 'latest',
      neoforgeVersion: String(instance.neoforgeVersion || instance.loaderVersion || 'latest').trim() || 'latest',
      quiltLoaderVersion: String(instance.quiltLoaderVersion || instance.loaderVersion || 'latest').trim() || 'latest',
      source: ['custom', 'modrinth', 'server', 'imported'].includes(String(instance.source || '').trim()) ? String(instance.source).trim() : 'custom',
      projectId: String(instance.projectId || '').trim(),
      modrinthProjectId: String(instance.modrinthProjectId || '').trim(),
      modrinthSlug: String(instance.modrinthSlug || '').trim(),
      packName: String(instance.packName || name).trim(),
      createdAt: String(instance.createdAt || now),
      updatedAt: String(instance.updatedAt || instance.createdAt || now)
    };
  }

  getBuildInstances(nickname = '') {
    const storeValue = this.getBuildInstanceStore();
    const owner = this.normalizeInstanceOwner(nickname);
    const list = Array.isArray(storeValue[owner]) ? storeValue[owner] : [];
    return list.map(instance => this.normalizeBuildInstance(instance)).filter((instance) => instance.id);
  }

  saveBuildInstances(nickname = '', instances = []) {
    const storeValue = this.getBuildInstanceStore();
    const owner = this.normalizeInstanceOwner(nickname);
    storeValue[owner] = instances.map(instance => this.normalizeBuildInstance(instance));
    this.saveBuildInstanceStore(storeValue);
    return storeValue[owner];
  }

  findBuildInstance(nickname = '', instanceId = '') {
    const id = String(instanceId || '').trim();
    if (!id) return null;
    return this.getBuildInstances(nickname).find((instance) => instance.id === id) || null;
  }

  upsertBuildInstance(nickname = '', instance = {}, select = true) {
    const normalized = this.normalizeBuildInstance(instance);
    const instances = this.getBuildInstances(nickname);
    const index = instances.findIndex((entry) => entry.id === normalized.id);
    if (index >= 0) {
      instances[index] = { ...instances[index], ...normalized, updatedAt: new Date().toISOString() };
    } else {
      instances.unshift(normalized);
    }
    this.saveBuildInstances(nickname, instances);

    if (select) {
      const current = this.getSettings(nickname);
      this.saveSettings({
        ...current,
        activeInstanceId: normalized.id,
        minecraftVersion: normalized.minecraftVersion,
        modLoader: normalized.loader,
        loader: normalized.loader === 'fabric' ? 'Fabric' : normalized.loader,
        loaderVersion: normalized.loaderVersion,
        fabricLoaderVersion: normalized.fabricLoaderVersion,
        forgeVersion: normalized.forgeVersion,
        neoforgeVersion: normalized.neoforgeVersion,
        quiltLoaderVersion: normalized.quiltLoaderVersion
      }, nickname);
    }

    return normalized;
  }

  applySelectedInstanceToSettings(nickname = '', settings = {}) {
    const instance = this.findBuildInstance(nickname, settings.activeInstanceId);
    if (!instance) return settings;

    return {
      ...settings,
      minecraftVersion: instance.minecraftVersion || settings.minecraftVersion,
      modLoader: instance.loader || settings.modLoader,
      loader: instance.loader === 'fabric' ? 'Fabric' : instance.loader,
      loaderVersion: instance.loaderVersion || settings.loaderVersion,
      fabricLoaderVersion: instance.fabricLoaderVersion || settings.fabricLoaderVersion,
      forgeVersion: instance.forgeVersion || settings.forgeVersion,
      neoforgeVersion: instance.neoforgeVersion || settings.neoforgeVersion,
      quiltLoaderVersion: instance.quiltLoaderVersion || settings.quiltLoaderVersion
    };
  }
}
module.exports = { InstanceRepository };
