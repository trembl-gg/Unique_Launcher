(() => {
  const rustHost = window.__UNIQUE_RUST__ && window.ipc;
  if (window.api || (!rustHost && !window.chrome?.webview)) {
    return;
  }

  const pending = new Map();
  const listeners = new Map();
  let nextId = 1;
  let backendStopped = false;
  let receiveMessage;
  const host = rustHost ? {
    postMessage: message => window.ipc.postMessage(JSON.stringify(message)),
    addEventListener: (_name, callback) => { receiveMessage = callback; }
  } : window.chrome.webview;
  if (rustHost) window.__uniqueDispatch = data => receiveMessage?.({ data });

  function invoke(channel, payload, files = null) {
    if (backendStopped && !['window-control', 'window-is-maximized', 'window-drag'].includes(channel)) {
      return Promise.reject(new Error('Backend остановлен. Перезапустите лаунчер.'));
    }
    const id = nextId++;
    const message = {
      type: 'invoke',
      id,
      channel,
      payload: payload === undefined ? null : payload
    };

    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      try {
        if (files && !rustHost) {
          if (!host.postMessageWithAdditionalObjects) throw new Error('Обновите WebView2 Runtime для перетаскивания файлов.');
          host.postMessageWithAdditionalObjects(message, files);
        } else host.postMessage(message);
      } catch (error) { pending.delete(id); reject(error); }
    });
  }

  function on(channel, callback) {
    if (!listeners.has(channel)) {
      listeners.set(channel, new Set());
      if (!rustHost) host.postMessage({ type: 'subscribe', channel });
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

  host.addEventListener('message', (event) => {
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
      if (message.channel === 'backend-stopped') {
        backendStopped = true;
        for (const entry of pending.values()) entry.reject(new Error('Backend остановлен. Перезапустите лаунчер.'));
        pending.clear();
      }
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
    onNativeFileDrop: callback => on('native-file-drop', callback),
    onNativeDropError: callback => on('native-drop-error', callback),
    getDroppedPaths: files => invoke('dropped-files', null, files),
    importDroppedContent: payload => invoke('content-import-drop', payload),
    applySkin: payload => invoke('skin-apply', payload),
    getSkinAlbum: payload => invoke('skin-album', payload),
    getAudioPeak: () => invoke('audio-peak'),
    stopAudioMeter: () => invoke('audio-meter-stop'),
    guestLogin: (payload) => invoke('auth-guest', payload),
    logLaunch: (payload) => invoke('log-launch', payload),
    getCurrentSession: () => invoke('auth-current-session'),
    listAccounts: () => invoke('auth-accounts-list'),
    switchAccount: (payload) => invoke('auth-account-switch', payload),
    listGameContent: (payload) => invoke('game-content-list', payload),
    setGameContentEnabled: (payload) => invoke('game-content-set-enabled', payload),
    deleteGameContent: (payload) => invoke('game-content-delete', payload),
    openGameContentFolder: (payload) => invoke('open-game-content-folder', payload),
    logout: (payload) => invoke('auth-logout', payload),
    listMods: (payload) => invoke('list-mods', payload),
    listBuildInstances: (payload) => invoke('build-instances-list', payload),
    createBuildInstance: (payload) => invoke('build-instance-create', payload),
    updateBuildInstance: (payload) => invoke('build-instance-update', payload),
    deleteBuildInstance: (payload) => invoke('build-instance-delete', payload),
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
    getCurrentRelease: (payload) => invoke('updates-current-release', payload),
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
    getHardwareInfo: () => invoke('get-hardware-info'),
    onHardwareInfo: callback => on('hardware-info', callback),
    chooseFile: (options) => invoke('choose-file', options),
    chooseDirectory: () => invoke('choose-directory'),
    getGameStorage: () => invoke('game-storage-info'),
    changeGameStorage: payload => invoke('game-storage-change', payload),
    getAssetPreview: (filePath) => invoke('get-asset-preview', filePath),
    downloadSkinByNickname: (payload) => invoke('skin-download-by-nickname', payload),
    getTitlebarIcon: () => invoke('get-titlebar-icon'),
    getProfile: (payload) => invoke('profile-get', payload),
    saveProfileLinks: (payload) => invoke('profile-save-links', payload),
    connectSpotify: (payload) => invoke('spotify-connect', payload),
    completeSpotifyAuth: (payload) => invoke('spotify-connect-complete', payload),
    cancelSpotifyAuth: (payload) => invoke('spotify-connect-cancel', payload),
    disconnectSpotify: (payload) => invoke('spotify-disconnect', payload),
    getSpotifyNowPlaying: (payload) => invoke('spotify-now-playing', payload),
    startMicrosoftLogin: () => invoke('auth-microsoft-device-start'),
    openExternal: url => invoke('open-external-url', url),
    completeMicrosoftLogin: (payload) => invoke('auth-microsoft-device-complete', payload),
    windowControl: (action) => invoke('window-control', action),
    isWindowMaximized: () => invoke('window-is-maximized'),
    startWindowDrag: () => invoke('window-drag'),
    onWindowMaximizedState: (callback) => on('window-maximized-state', callback),
    launchHorizon: (payload) => invoke('launch-horizon', payload),
    launchMinecraft: (payload) => invoke('launch-minecraft', payload),
    getLaunchState: () => invoke('get-launch-state'),
    setStreamerMode: (enabled) => invoke('streamer-mode', enabled),
    stopMinecraft: (payload) => invoke('stop-minecraft', payload),
    onLaunchProgress: (callback) => on('launch-progress', callback),
    onLaunchLog: (callback) => on('launch-log', callback),
    onLaunchDebug: (callback) => on('launch-debug', callback),
    onLaunchClosed: (callback) => on('launch-closed', callback),
    onLaunchStarted: (callback) => on('launch-started', callback),
    onLaunchError: (callback) => on('launch-error', callback),
    onGameCrashed: callback => on('game-crashed', callback),
    onUpdateStatus: (callback) => on('update-status', callback)
  };
})();
