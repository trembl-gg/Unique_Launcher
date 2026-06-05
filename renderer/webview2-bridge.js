(() => {
  if (window.api || !window.chrome?.webview) {
    return;
  }

  const pending = new Map();
  const listeners = new Map();
  let nextId = 1;

  function invoke(channel, payload) {
    const id = nextId++;
    window.chrome.webview.postMessage({
      type: 'invoke',
      id,
      channel,
      payload: payload === undefined ? null : payload
    });

    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
    });
  }

  function on(channel, callback) {
    if (!listeners.has(channel)) {
      listeners.set(channel, new Set());
      window.chrome.webview.postMessage({ type: 'subscribe', channel });
    }
    listeners.get(channel).add(callback);
  }

  function isTitlebarDragTarget(target) {
    const element = target instanceof Element ? target : null;
    if (!element?.closest('.window-titlebar')) return false;
    return !element.closest('button, input, select, textarea, a, [role="button"], .window-controls');
  }

  window.addEventListener('pointerdown', (event) => {
    if (event.button !== 0 || event.detail > 1 || !isTitlebarDragTarget(event.target)) {
      return;
    }
    event.preventDefault();
    void invoke('window-drag');
  });

  window.addEventListener('dblclick', (event) => {
    if (!isTitlebarDragTarget(event.target)) {
      return;
    }
    event.preventDefault();
    void invoke('window-control', 'maximize');
  });

  window.chrome.webview.addEventListener('message', (event) => {
    const message = event.data || {};

    if (message.type === 'invoke-result') {
      const entry = pending.get(message.id);
      if (!entry) return;
      pending.delete(message.id);
      if (message.ok) {
        entry.resolve(message.result);
      } else {
        entry.reject(new Error(message.error || 'WebView2 bridge request failed.'));
      }
      return;
    }

    if (message.type === 'event') {
      const callbacks = listeners.get(message.channel);
      if (!callbacks) return;
      callbacks.forEach((callback) => {
        try {
          callback(message.data);
        } catch (err) {
          console.error(err);
        }
      });
    }
  });

  window.api = {
    register: (payload) => invoke('auth-register', payload),
    login: (payload) => invoke('auth-login', payload),
    guestLogin: (payload) => invoke('auth-guest', payload),
    getCurrentSession: () => invoke('auth-current-session'),
    logout: (payload) => invoke('auth-logout', payload),
    listMods: (payload) => invoke('list-mods', payload),
    listBuildInstances: (payload) => invoke('build-instances-list', payload),
    createBuildInstance: (payload) => invoke('build-instance-create', payload),
    importExistingBuildInstance: (payload) => invoke('build-instance-import-existing', payload),
    selectBuildInstance: (payload) => invoke('build-instance-select', payload),
    searchModrinth: (payload) => invoke('modrinth-search', payload),
    getModrinthTags: () => invoke('modrinth-tags'),
    getModrinthProject: (payload) => invoke('modrinth-project', payload),
    getModrinthProjectVersions: (payload) => invoke('modrinth-project-versions', payload),
    getModrinthProjectDependencies: (payload) => invoke('modrinth-project-dependencies', payload),
    getModrinthVersion: (payload) => invoke('modrinth-version', payload),
    checkModrinthUpdates: (payload) => invoke('modrinth-check-updates', payload),
    installModrinthMod: (payload) => invoke('modrinth-install-mod', payload),
    installModrinthProject: (payload) => invoke('modrinth-install-project', payload),
    installModrinthModpack: (payload) => invoke('modrinth-install-modpack', payload),
    importModrinthProject: (payload) => invoke('modrinth-import-project', payload),
    importModrinthModpack: (payload) => invoke('modrinth-import-mrpack', payload),
    getModrinthMultipleProjects: (payload) => invoke('modrinth-multiple-projects', payload),
    getModrinthMultipleVersions: (payload) => invoke('modrinth-multiple-versions', payload),
    getModrinthVersionFromHash: (payload) => invoke('modrinth-version-from-hash', payload),
    getModrinthVersionsFromHashes: (payload) => invoke('modrinth-versions-from-hashes', payload),
    getModrinthUserProjects: (payload) => invoke('modrinth-user-projects', payload),
    getModrinthUser: (payload) => invoke('modrinth-user', payload),
    getModrinthProjectMembers: (payload) => invoke('modrinth-project-members', payload),
    getModrinthSearchFacets: (payload) => invoke('modrinth-search-facets', payload),
    exportModrinthModlist: (payload) => invoke('modrinth-export-modlist', payload),
    importModrinthModlist: (payload) => invoke('modrinth-import-modlist', payload),
    setModEnabled: (payload) => invoke('mod-set-enabled', payload),
    scheduleModDelete: (payload) => invoke('mod-delete-schedule', payload),
    undoModDelete: (payload) => invoke('mod-delete-undo', payload),
    finalizeModDeletes: () => invoke('mod-delete-finalize'),
    installBuildProfile: (payload) => invoke('install-build-profile', payload),
    getRegisteredServers: (payload) => invoke('registered-servers', payload),
    openUserModsFolder: (payload) => invoke('open-user-mods-folder', payload),
    installJava: () => invoke('install-java'),
    rescanJava: () => invoke('java-rescan'),
    checkForUpdates: () => invoke('updates-check'),
    installUpdate: () => invoke('updates-install'),
    getDiagnostics: () => invoke('diagnostics-get'),
    exportDiagnostics: () => invoke('diagnostics-export'),
    analyzeCrash: (payload) => invoke('crash-analyze', payload),
    repairGame: (payload) => invoke('repair-game', payload),
    openLogsFolder: () => invoke('open-logs-folder'),
    getLauncherContent: () => invoke('launcher-content'),
    checkApiHealth: () => invoke('api-health'),
    copyText: (text) => invoke('clipboard-write', text),
    getSettings: (payload) => invoke('get-settings', payload),
    saveSettings: (payload) => invoke('save-settings', payload),
    getSystemInfo: () => invoke('get-system-info'),
    chooseFile: (options) => invoke('choose-file', options),
    chooseDirectory: () => invoke('choose-directory'),
    getAssetPreview: (filePath) => invoke('get-asset-preview', filePath),
    downloadSkinByNickname: (payload) => invoke('skin-download-by-nickname', payload),
    getTitlebarIcon: () => invoke('get-titlebar-icon'),
    getProfile: (payload) => invoke('profile-get', payload),
    saveProfileLinks: (payload) => invoke('profile-save-links', payload),
    connectSpotify: (payload) => invoke('spotify-connect', payload),
    disconnectSpotify: (payload) => invoke('spotify-disconnect', payload),
    getSpotifyNowPlaying: (payload) => invoke('spotify-now-playing', payload),
    startMicrosoftLogin: () => invoke('auth-microsoft-device-start'),
    completeMicrosoftLogin: (payload) => invoke('auth-microsoft-device-complete', payload),
    windowControl: (action) => invoke('window-control', action),
    isWindowMaximized: () => invoke('window-is-maximized'),
    startWindowDrag: () => invoke('window-drag'),
    onWindowMaximizedState: (callback) => on('window-maximized-state', callback),
    launchMinecraft: (payload) => invoke('launch-minecraft', payload),
    stopMinecraft: (payload) => invoke('stop-minecraft', payload),
    onLaunchProgress: (callback) => on('launch-progress', callback),
    onLaunchLog: (callback) => on('launch-log', callback),
    onLaunchDebug: (callback) => on('launch-debug', callback),
    onLaunchClosed: (callback) => on('launch-closed', callback),
    onLaunchError: (callback) => on('launch-error', callback),
    onUpdateStatus: (callback) => on('update-status', callback)
  };
})();
