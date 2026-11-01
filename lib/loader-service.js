'use strict';

/** Lazily constructed loader installer with injected I/O dependencies. */
class LoaderService {
  constructor(dependencies) { this.dependencies = dependencies; }
  async ensureVanillaVersion(root, minecraftVersion) {
    const { fs, path, launcher, ensureDir } = this.dependencies;
    const versionDir = path.join(root, 'versions', minecraftVersion);
    ensureDir(versionDir);

    const versionFile = await launcher.handler.getVersion(minecraftVersion, versionDir);
    const jarPath = path.join(versionDir, `${minecraftVersion}.jar`);

    if (!fs.existsSync(jarPath)) {
      await launcher.handler.getJar(versionFile, minecraftVersion, versionDir);
    } else if (!fs.existsSync(path.join(versionDir, `${minecraftVersion}.json`))) {
      fs.writeFileSync(path.join(versionDir, `${minecraftVersion}.json`), JSON.stringify(versionFile, null, 2), 'utf8');
    }

    return { versionFile, jarPath };
  }

  async ensureFabricVersion(root, minecraftVersion, requestedLoaderVersion = 'latest') {
    const { fs, path, getJson, ensureDir, FABRIC_META_URL } = this.dependencies;
    const encodedGameVersion = encodeURIComponent(minecraftVersion);
    let loaderVersion = requestedLoaderVersion;

    if (!loaderVersion || loaderVersion === 'latest') {
      const versions = await getJson(`${FABRIC_META_URL}/v2/versions/loader/${encodedGameVersion}`);
      const stable = versions.find((entry) => entry.loader?.stable) || versions[0];
      if (!stable) {
        throw new Error(`Fabric Loader was not found for Minecraft ${minecraftVersion}.`);
      }
      loaderVersion = stable.loader.version;
    }

    const encodedLoaderVersion = encodeURIComponent(loaderVersion);
    const profile = await getJson(`${FABRIC_META_URL}/v2/versions/loader/${encodedGameVersion}/${encodedLoaderVersion}/profile/json`);
    const fabricId = profile.id || `fabric-loader-${loaderVersion}-${minecraftVersion}`;
    const fabricDir = path.join(root, 'versions', fabricId);
    ensureDir(fabricDir);

    const vanilla = await this.ensureVanillaVersion(root, minecraftVersion);
    fs.writeFileSync(path.join(fabricDir, `${fabricId}.json`), JSON.stringify(profile, null, 2), 'utf8');
    fs.copyFileSync(vanilla.jarPath, path.join(fabricDir, `${fabricId}.jar`));

    return {
      id: fabricId,
      loaderVersion,
      jvmArgs: (profile.arguments?.jvm || []).filter((arg) => typeof arg === 'string')
    };
  }

  parseMavenVersions(xml) {
    return Array.from(String(xml || '').matchAll(/<version>([^<]+)<\/version>/g))
      .map((match) => match[1].trim())
      .filter(Boolean);
  }

  selectLastMatchingVersion(versions, predicate) {
    const matches = versions.filter(predicate);
    if (!matches.length) return '';

    const releases = matches.filter((version) => !/alpha|beta|snapshot/i.test(version));
    const list = releases.length ? releases : matches;
    return list[list.length - 1] || '';
  }

  getCurrentRuleOsName() {
    if (process.platform === 'win32') return 'windows';
    if (process.platform === 'darwin') return 'osx';
    return 'linux';
  }

  ruleOsMatches(osRule = {}) {
    const { os } = this.dependencies;
    const expectedName = String(osRule.name || '').trim();
    if (expectedName && expectedName !== this.getCurrentRuleOsName()) return false;

    const expectedArch = String(osRule.arch || '').trim();
    if (expectedArch && expectedArch !== process.arch) return false;

    const expectedVersion = String(osRule.version || '').trim();
    if (expectedVersion) {
      try {
        if (!new RegExp(expectedVersion).test(os.release())) return false;
      } catch (err) {
        return false;
      }
    }

    return true;
  }

  ruleMatches(rule = {}) {
    const { os } = this.dependencies;
    if (rule.os && !this.ruleOsMatches(rule.os)) return false;
    if (rule.features && Object.keys(rule.features).length) return false;
    return true;
  }

  rulesAllow(rules) {
    if (!Array.isArray(rules) || rules.length === 0) return true;

    let allowed = false;
    for (const rule of rules) {
      if (!this.ruleMatches(rule)) continue;
      allowed = rule.action === 'allow';
      if (rule.action === 'disallow') allowed = false;
    }
    return allowed;
  }

  replaceLoaderPlaceholders(value, root, versionName) {
    const { path } = this.dependencies;
    const separator = process.platform === 'win32' ? ';' : ':';
    return String(value)
      .replace(/\$\{library_directory\}/g, path.join(root, 'libraries').replace(/\\/g, '/'))
      .replace(/\$\{classpath_separator\}/g, separator)
      .replace(/\$\{version_name\}/g, versionName);
  }

  resolveLoaderArguments(args, root, versionName) {
    const result = [];
    for (const entry of Array.isArray(args) ? args : []) {
      if (typeof entry === 'string') {
        result.push(this.replaceLoaderPlaceholders(entry, root, versionName));
        continue;
      }
      if (!entry || typeof entry !== 'object' || !this.rulesAllow(entry.rules)) continue;
      const value = entry.value;
      const values = Array.isArray(value) ? value : [value];
      for (const item of values) {
        if (typeof item === 'string') {
          result.push(this.replaceLoaderPlaceholders(item, root, versionName));
        }
      }
    }
    return result;
  }

  getVanillaGameArguments(versionFile) {
    if (typeof versionFile?.minecraftArguments === 'string') {
      return versionFile.minecraftArguments.split(/\s+/).filter(Boolean);
    }
    return Array.isArray(versionFile?.arguments?.game) ? versionFile.arguments.game : [];
  }

  mavenNameToParts(name) {
    const [group, artifact, version, classifierWithExt] = String(name || '').split(':');
    if (!group || !artifact || !version) {
      throw new Error(`Invalid Maven library name: ${name}`);
    }

    let classifier = classifierWithExt || '';
    let extension = 'jar';
    if (classifier.includes('@')) {
      const parts = classifier.split('@');
      classifier = parts[0];
      extension = parts[1] || extension;
    } else if (version.includes('@')) {
      const parts = version.split('@');
      return {
        group,
        artifact,
        version: parts[0],
        classifier: '',
        extension: parts[1] || extension
      };
    }

    return { group, artifact, version, classifier, extension };
  }

  mavenPathFromName(name, includeClassifier = true) {
    const { group, artifact, version, classifier, extension } = this.mavenNameToParts(name);
    const classifierSuffix = includeClassifier && classifier ? `-${classifier}` : '';
    return `${group.replace(/\./g, '/')}/${artifact}/${version}/${artifact}-${version}${classifierSuffix}.${extension}`;
  }

  getMclcLibraryPath(root, name) {
    const { path } = this.dependencies;
    return path.join(root, 'libraries', this.mavenPathFromName(name, false));
  }

  shouldIncludeLoaderLibrary(library = {}) {
    return this.rulesAllow(library.rules);
  }

  getLibraryDownloadInfo(library = {}) {
    const { path } = this.dependencies;
    if (library.downloads?.artifact?.url && library.downloads?.artifact?.path) {
      return {
        url: String(library.downloads.artifact.url),
        path: String(library.downloads.artifact.path).replace(/\//g, path.sep),
        sha1: String(library.downloads.artifact.sha1 || '')
      };
    }

    if (library.url && library.name) {
      const base = String(library.url).replace(/\/?$/, '/');
      const mavenPath = this.mavenPathFromName(library.name, true);
      return {
        url: `${base}${mavenPath}`,
        path: mavenPath.replace(/\//g, path.sep),
        sha1: ''
      };
    }

    if (library.name) {
      const mavenPath = this.mavenPathFromName(library.name, true);
      return {
        url: `https://libraries.minecraft.net/${mavenPath}`,
        path: mavenPath.replace(/\//g, path.sep),
        sha1: ''
      };
    }

    return null;
  }

  async downloadLoaderLibrary(root, library) {
    const { fs, path, downloadFile, ensureDir, hashFile } = this.dependencies;
    if (!this.shouldIncludeLoaderLibrary(library)) return null;

    const download = this.getLibraryDownloadInfo(library);
    if (!download?.url || !download.path) return null;

    const targetPath = path.join(root, 'libraries', download.path);
    const hasValidFile = fs.existsSync(targetPath)
      && (!download.sha1 || hashFile(targetPath, 'sha1').toLowerCase() === download.sha1.toLowerCase());

    if (!hasValidFile) {
      await downloadFile(download.url, targetPath);
      if (download.sha1 && hashFile(targetPath, 'sha1').toLowerCase() !== download.sha1.toLowerCase()) {
        fs.rmSync(targetPath, { force: true });
        throw new Error(`Hash mismatch for loader library ${path.basename(targetPath)}`);
      }
    }

    if (library.name) {
      const mclcPath = this.getMclcLibraryPath(root, library.name);
      if (path.normalize(mclcPath) !== path.normalize(targetPath)) {
        ensureDir(path.dirname(mclcPath));
        fs.copyFileSync(targetPath, mclcPath);
      }
    }

    return targetPath;
  }

  async downloadLoaderLibraries(root, profile) {
    const libraries = Array.isArray(profile?.libraries) ? profile.libraries : [];
    const includedLibraries = libraries.filter(library => this.shouldIncludeLoaderLibrary(library));
    for (const library of includedLibraries) {
      await this.downloadLoaderLibrary(root, library);
    }
    return includedLibraries;
  }

  async prepareCustomLoaderProfile(root, minecraftVersion, profile, loaderVersion) {
    const { fs, path, ensureDir } = this.dependencies;
    const profileId = String(profile?.id || '').trim();
    if (!profileId) {
      throw new Error('Loader profile has no version id.');
    }

    const vanilla = await this.ensureVanillaVersion(root, minecraftVersion);
    const versionDir = path.join(root, 'versions', profileId);
    ensureDir(versionDir);

    const ownGameArgs = this.resolveLoaderArguments(profile.arguments?.game || [], root, profileId);
    const vanillaGameArgs = this.resolveLoaderArguments(this.getVanillaGameArguments(vanilla.versionFile), root, profileId);
    const preparedProfile = {
      ...profile,
      libraries: await this.downloadLoaderLibraries(root, profile),
      arguments: {
        ...(profile.arguments || {}),
        game: ownGameArgs.length ? [...ownGameArgs, ...vanillaGameArgs] : [],
        jvm: []
      }
    };

    fs.writeFileSync(path.join(versionDir, `${profileId}.json`), JSON.stringify(preparedProfile, null, 2), 'utf8');
    fs.copyFileSync(vanilla.jarPath, path.join(versionDir, `${profileId}.jar`));

    return {
      id: profileId,
      loaderVersion,
      jvmArgs: this.resolveLoaderArguments(profile.arguments?.jvm || [], root, profileId)
    };
  }

  async resolveForgeVersion(minecraftVersion, requestedVersion = 'latest') {
    const { getText, FORGE_MAVEN_URL } = this.dependencies;
    const requested = String(requestedVersion || 'latest').trim();
    if (requested && requested !== 'latest') {
      return requested.startsWith(`${minecraftVersion}-`) ? requested : `${minecraftVersion}-${requested}`;
    }

    const xml = await getText(`${FORGE_MAVEN_URL}/net/minecraftforge/forge/maven-metadata.xml`, 15000);
    const version = this.selectLastMatchingVersion(this.parseMavenVersions(xml), (item) => item.startsWith(`${minecraftVersion}-`));
    if (!version) {
      throw new Error(`Forge was not found for Minecraft ${minecraftVersion}.`);
    }
    return version;
  }

  async ensureForgeVersion(root, minecraftVersion, requestedVersion = 'latest') {
    const { fs, path, AdmZip, downloadFile, FORGE_MAVEN_URL } = this.dependencies;
    const artifactVersion = await this.resolveForgeVersion(minecraftVersion, requestedVersion);
    const installerName = `forge-${artifactVersion}-installer.jar`;
    const installerUrl = `${FORGE_MAVEN_URL}/net/minecraftforge/forge/${artifactVersion}/${installerName}`;
    const installerPath = path.join(root, 'loaders', 'forge', artifactVersion, installerName);

    if (!fs.existsSync(installerPath) || fs.statSync(installerPath).size === 0) {
      await downloadFile(installerUrl, installerPath);
    }

    const zip = new AdmZip(installerPath);
    const versionEntry = zip.getEntry('version.json');
    if (!versionEntry) {
      throw new Error(`Forge installer ${artifactVersion} has no version.json.`);
    }

    const profile = JSON.parse(versionEntry.getData().toString('utf8'));
    return this.prepareCustomLoaderProfile(root, minecraftVersion, profile, artifactVersion);
  }

  getNeoForgeModernPrefix(minecraftVersion) {
    const { parseMinecraftReleaseId } = this.dependencies;
    const parsed = parseMinecraftReleaseId(minecraftVersion);
    if (!parsed || parsed.major !== 1) return '';
    return `${parsed.minor}.${parsed.patch || 0}`;
  }

  async resolveNeoForgeArtifact(minecraftVersion, requestedVersion = 'latest') {
    const { getText, NEOFORGE_MAVEN_URL } = this.dependencies;
    const legacy = String(minecraftVersion) === '1.20.1';
    const basePath = legacy ? 'net/neoforged/forge' : 'net/neoforged/neoforge';
    const filePrefix = legacy ? 'forge' : 'neoforge';
    const requested = String(requestedVersion || 'latest').trim();

    if (requested && requested !== 'latest') {
      return {
        basePath,
        filePrefix,
        version: legacy && !requested.startsWith(`${minecraftVersion}-`) ? `${minecraftVersion}-${requested}` : requested
      };
    }

    const xml = await getText(`${NEOFORGE_MAVEN_URL}/${basePath}/maven-metadata.xml`, 15000);
    const versions = this.parseMavenVersions(xml);
    const version = legacy
      ? this.selectLastMatchingVersion(versions, (item) => item.startsWith(`${minecraftVersion}-`))
      : this.selectLastMatchingVersion(versions, (item) => item.startsWith(`${this.getNeoForgeModernPrefix(minecraftVersion)}.`));

    if (!version) {
      throw new Error(`NeoForge was not found for Minecraft ${minecraftVersion}.`);
    }

    return { basePath, filePrefix, version };
  }

  async ensureNeoForgeVersion(root, minecraftVersion, requestedVersion = 'latest') {
    const { fs, path, AdmZip, downloadFile, NEOFORGE_MAVEN_URL } = this.dependencies;
    const artifact = await this.resolveNeoForgeArtifact(minecraftVersion, requestedVersion);
    const installerName = `${artifact.filePrefix}-${artifact.version}-installer.jar`;
    const installerUrl = `${NEOFORGE_MAVEN_URL}/${artifact.basePath}/${artifact.version}/${installerName}`;
    const installerPath = path.join(root, 'loaders', 'neoforge', artifact.version, installerName);

    if (!fs.existsSync(installerPath) || fs.statSync(installerPath).size === 0) {
      await downloadFile(installerUrl, installerPath);
    }

    const zip = new AdmZip(installerPath);
    const versionEntry = zip.getEntry('version.json');
    if (!versionEntry) {
      throw new Error(`NeoForge installer ${artifact.version} has no version.json.`);
    }

    const profile = JSON.parse(versionEntry.getData().toString('utf8'));
    return this.prepareCustomLoaderProfile(root, minecraftVersion, profile, artifact.version);
  }

  async resolveQuiltLoaderVersion(minecraftVersion, requestedVersion = 'latest') {
    const { getJson, QUILT_META_URL } = this.dependencies;
    const requested = String(requestedVersion || 'latest').trim();
    if (requested && requested !== 'latest') return requested;

    const versions = await getJson(`${QUILT_META_URL}/v3/versions/loader/${encodeURIComponent(minecraftVersion)}`);
    const entries = Array.isArray(versions) ? versions : [];
    const stable = entries.find((entry) => {
      const version = String(entry?.loader?.version || entry?.version || '');
      return version && !/alpha|beta|snapshot/i.test(version);
    }) || entries[0];
    const loaderVersion = String(stable?.loader?.version || stable?.version || '').trim();
    if (!loaderVersion) {
      throw new Error(`Quilt Loader was not found for Minecraft ${minecraftVersion}.`);
    }
    return loaderVersion;
  }

  async ensureQuiltVersion(root, minecraftVersion, requestedVersion = 'latest') {
    const { getJson, QUILT_META_URL } = this.dependencies;
    const loaderVersion = await this.resolveQuiltLoaderVersion(minecraftVersion, requestedVersion);
    const profile = await getJson(`${QUILT_META_URL}/v3/versions/loader/${encodeURIComponent(minecraftVersion)}/${encodeURIComponent(loaderVersion)}/profile/json`);
    return this.prepareCustomLoaderProfile(root, minecraftVersion, profile, loaderVersion);
  }

  async ensureSelectedLoaderVersion(root, settings) {
    const { normalizeModLoader } = this.dependencies;
    const minecraftVersion = settings.minecraftVersion || '1.20.1';
    const modLoader = normalizeModLoader(settings.modLoader || settings.loader);

    if (modLoader === 'vanilla') {
      await this.ensureVanillaVersion(root, minecraftVersion);
      return { id: '', loaderVersion: 'vanilla', jvmArgs: [], name: 'Vanilla' };
    }
    if (modLoader === 'fabric') {
      const result = await this.ensureFabricVersion(root, minecraftVersion, settings.fabricLoaderVersion || 'latest');
      return { ...result, name: 'Fabric' };
    }
    if (modLoader === 'quilt') {
      const result = await this.ensureQuiltVersion(root, minecraftVersion, settings.quiltLoaderVersion || settings.loaderVersion || 'latest');
      return { ...result, name: 'Quilt' };
    }
    if (modLoader === 'forge') {
      const result = await this.ensureForgeVersion(root, minecraftVersion, settings.forgeVersion || settings.loaderVersion || 'latest');
      return { ...result, name: 'Forge' };
    }
    if (modLoader === 'neoforge') {
      const result = await this.ensureNeoForgeVersion(root, minecraftVersion, settings.neoforgeVersion || settings.loaderVersion || 'latest');
      return { ...result, name: 'NeoForge' };
    }

    throw new Error(`Unsupported mod loader: ${modLoader}`);
  }
}

function createLoaderService(dependencies) { return new LoaderService(dependencies); }
module.exports = { LoaderService, createLoaderService };
