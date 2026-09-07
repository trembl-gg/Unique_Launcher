const authScreen = document.getElementById('auth-screen');
const launcherScreen = document.getElementById('launcher-screen');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const guestForm = document.getElementById('guest-form');
const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');
const guestTab = document.getElementById('guest-tab');
const loginMessage = document.getElementById('login-message');
const registerMessage = document.getElementById('register-message');
const guestMessage = document.getElementById('guest-message');
const totpHint = document.getElementById('totp-hint');
const launchStatus = document.getElementById('launch-status');
const launchLog = document.getElementById('launch-log');
const modsList = document.getElementById('mods-list');
const modsFolder = document.getElementById('mods-folder');
const authModsCount = document.getElementById('auth-mods-count');
const serverInfo = document.getElementById('server-info');
const serverLabel = document.getElementById('server-label');
const serverRegistryList = document.getElementById('server-registry-list');
const activeUserLabel = document.getElementById('active-user');
const activeUserName = document.getElementById('active-user-name');
const activeUserAvatar = document.getElementById('active-user-avatar');
const accountName = document.getElementById('account-name');
const accountAvatar = document.getElementById('account-avatar');
const profileMainName = document.getElementById('profile-main-name');
const profileMainAvatar = document.getElementById('profile-main-avatar');
const profileModeLabel = document.getElementById('profile-mode-label');
const systemMemory = document.getElementById('system-memory');
const wallpaperPreview = document.getElementById('wallpaper-preview');
const wallpaperName = document.getElementById('wallpaper-name');
const versionLabel = document.getElementById('version-label');
const launchButton = document.getElementById('launch-button');
const spaceCanvas = document.getElementById('space-canvas');
const profileStatus = document.getElementById('profile-status');
const profileMessage = document.getElementById('profile-message');
const spotifyStatus = document.getElementById('spotify-status');
const spotifyNowPlaying = document.getElementById('spotify-now-playing');
const spotifyAccount = document.getElementById('spotify-account');
const spotifyProgress = document.getElementById('spotify-progress');
const spotifyProgressBar = document.getElementById('spotify-progress-bar');
const spotifyCurrentTime = document.getElementById('spotify-current-time');
const spotifyDuration = document.getElementById('spotify-duration');
const windowMaximizeButton = document.getElementById('window-maximize');
const titlebarIcon = document.getElementById('titlebar-icon');
const navBrandIcon = document.getElementById('nav-brand-icon');
const playerPreviewCanvas = document.getElementById('player-preview-canvas');
const newsList = document.getElementById('news-list');
const updateStatus = document.getElementById('update-status');
const updateMessage = document.getElementById('update-message');
const installUpdateButton = document.getElementById('install-update');
const diagnosticsMessage = document.getElementById('diagnostics-message');
const readinessStatus = document.getElementById('readiness-status');
const readinessGrid = document.getElementById('readiness-grid');
const apiHealthStatus = document.getElementById('api-health-status');
const apiHealthDetail = document.getElementById('api-health-detail');
const apiHealthCard = document.getElementById('api-health-card');
const javaHealthStatus = document.getElementById('java-health-status');
const javaHealthDetail = document.getElementById('java-health-detail');
const javaHealthCard = document.getElementById('java-health-card');
const serverHealthStatus = document.getElementById('server-health-status');
const serverHealthDetail = document.getElementById('server-health-detail');
const serversHealthCard = document.getElementById('servers-health-card');
const updateHealthStatus = document.getElementById('update-health-status');
const launcherBuildLabel = document.getElementById('launcher-build-label');
const launchInsights = {
  version: document.getElementById('insight-version'),
  ram: document.getElementById('insight-ram'),
  server: document.getElementById('insight-server'),
  assets: document.getElementById('insight-assets')
};
const sectionTabs = Array.from(document.querySelectorAll('.section-tab, .rail-button'));
const sectionButtons = Array.from(document.querySelectorAll('[data-section]'));
const settingsTabs = Array.from(document.querySelectorAll('.settings-tab'));
const settingsGroups = Array.from(document.querySelectorAll('[data-settings-group]'));
const buildLibrary = document.getElementById('build-library');
const buildLibraryGrid = document.getElementById('build-library-grid');
const buildLibraryStatus = document.getElementById('build-library-status');
const instanceList = document.getElementById('instance-list');
const refreshInstancesButton = document.getElementById('refresh-instances');
const createInstanceButton = document.getElementById('create-instance');
const modrinthModLoaderLabel = document.getElementById('modrinth-mod-loader-label');
const modrinthPackLoaderLabel = document.getElementById('modrinth-pack-loader-label');
const modrinthModSearch = document.getElementById('modrinth-mod-search');
const modrinthModSearchButton = document.getElementById('modrinth-mod-search-button');
const modrinthModStatus = document.getElementById('modrinth-mod-status');
const modrinthModResults = document.getElementById('modrinth-mod-results');
const modrinthInstalledMods = document.getElementById('modrinth-installed-mods');
const modrinthPackSearch = document.getElementById('modrinth-pack-search');
const modrinthPackSearchButton = document.getElementById('modrinth-pack-search-button');
const modrinthPackStatus = document.getElementById('modrinth-pack-status');
const modrinthPackResults = document.getElementById('modrinth-pack-results');
const modrinthPackVersionFilter = document.getElementById('modrinth-pack-version-filter');
const modrinthPackLoaderFilter = document.getElementById('modrinth-pack-loader-filter');
const modrinthContentType = document.getElementById('modrinth-content-type');
const modrinthContentSearch = document.getElementById('modrinth-content-search');
const modrinthContentSearchButton = document.getElementById('modrinth-content-search-button');
const modrinthContentStatus = document.getElementById('modrinth-content-status');
const modrinthContentResults = document.getElementById('modrinth-content-results');
const modrinthImportRef = document.getElementById('modrinth-import-ref');
const modrinthImportButton = document.getElementById('modrinth-import-button');
const modrinthImportStatus = document.getElementById('modrinth-import-status');
const microsoftLoginButton = document.getElementById('microsoft-login-button');
const importExistingInstanceButton = document.getElementById('import-existing-instance');
const importMrpackButton = document.getElementById('import-mrpack');
const checkModrinthUpdatesButton = document.getElementById('check-modrinth-updates');
const serverBuildSearch = document.getElementById('server-build-search');
const serverBuildResults = document.getElementById('server-build-results');
const skinLookupNick = document.getElementById('skin-lookup-nick');
const skinLookupStatus = document.getElementById('skin-lookup-status');
const infoLauncherVersion = document.getElementById('info-launcher-version');
const infoServerSupport = document.getElementById('info-server-support');
const infoProfileName = document.getElementById('info-profile-name');
const imageIds = new WeakMap();
let nextImageId = 1;
const customSelects = new WeakMap();
let customSelectDocumentEventsInstalled = false;

const fields = {
  loginNick: document.getElementById('login-nick'),
  loginPassword: document.getElementById('login-password'),
  loginTotp: document.getElementById('login-totp'),
  guestNick: document.getElementById('guest-nick'),
  registerNick: document.getElementById('register-nick'),
  registerPassword: document.getElementById('register-password'),
  registerTotp: document.getElementById('register-totp'),
  memoryMax: document.getElementById('memory-max'),
  memoryMaxLabel: document.getElementById('memory-max-label'),
  activeInstance: document.getElementById('active-instance'),
  instanceName: document.getElementById('instance-name'),
  instanceVersion: document.getElementById('instance-version'),
  instanceLoader: document.getElementById('instance-loader'),
  packFilterVersion: document.getElementById('modrinth-pack-version-filter'),
  packFilterLoader: document.getElementById('modrinth-pack-loader-filter'),
  minecraftVersion: document.getElementById('minecraft-version'),
  projectId: document.getElementById('project-id'),
  buildProfile: document.getElementById('build-profile'),
  fabricLoaderVersion: document.getElementById('fabric-loader-version'),
  javaPath: document.getElementById('java-path'),
  skinPreview: document.getElementById('skin-preview'),
  skinName: document.getElementById('skin-name'),
  skinModel: document.getElementById('skin-model'),
  capePreview: document.getElementById('cape-preview'),
  capeName: document.getElementById('cape-name'),
  hideLauncherDuringGame: document.getElementById('hide-launcher-during-game'),
  useUniqueMods: document.getElementById('use-unique-mods'),
  profileYoutube: document.getElementById('profile-youtube'),
  profileTwitch: document.getElementById('profile-twitch'),
  appearanceTheme: document.getElementById('appearance-theme'),
  accentColor: document.getElementById('accent-color'),
  reduceMotion: document.getElementById('reduce-motion')
};

let activeUser = null;
let currentSettings = null;
let currentProfile = null;
let systemInfo = null;
let launchActive = false;
let spaceAnimationFrame = null;
let spotifyRefreshTimer = null;
let spotifyProgressTimer = null;
let serverRegistryRefreshTimer = null;
let apiHealthRefreshTimer = null;
let spotifyPlayback = null;
let spotifyRefreshInFlight = false;
let buildProfileOptions = [];
let buildInstances = [];
let modrinthTags = null;
let pendingModDeleteTimers = new Map();
let registeredServers = [];
let avatarRenderRequest = 0;
let spaceAccentRgb = '124, 58, 237';
let spaceAccent2Rgb = '167, 139, 250';
const SPOTIFY_REFRESH_INTERVAL_MS = 2500;
const SERVER_REGISTRY_REFRESH_INTERVAL_MS = 60000;
const API_HEALTH_REFRESH_INTERVAL_MS = 30000;
const playerPreview = {
  yaw: -0.45,
  pitch: 0.12,
  zoom: 1,
  dragging: false,
  lastX: 0,
  lastY: 0,
  skinImage: null,
  skinBaseImage: null,
  capeImage: null,
  capeAnimated: false,
  capeAnimationSource: null,
  animationFrame: null,
  cropCache: new Map(),
  colors: {
    skin: '#74b5ff',
    head: '#cfa27f',
    body: '#3f7bd8',
    arm: '#cfa27f',
    leg: '#334155',
    cape: '#7c3aed'
  }
};

const SVG_ICONS = {
  play: '<svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
  stop: '<svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>',
  logout: '<svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 7V5a2 2 0 0 1 2-2h7v18h-7a2 2 0 0 1-2-2v-2"/><path d="M15 12H3"/><path d="m6 8-4 4 4 4"/></svg>',
  refresh: '<svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 0 0-14.7-4.4L3 9"/><path d="M3 4v5h5"/><path d="M4 13a8 8 0 0 0 14.7 4.4L21 15"/><path d="M21 20v-5h-5"/></svg>',
  skin: '<svg class="tile-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l2 3 4 2-2 5-3-1v9H8v-9l-3 1-2-5 4-2z"/></svg>',
  cape: '<svg class="tile-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3h8l2 18H6z"/><path d="M9 6h6"/></svg>',
  folder: '<svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 6h7l2 2h9v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg>',
  java: '<svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M8 18h8"/><path d="M10 22h4"/><path d="M7 14h10a3 3 0 0 1-3 3h-4a3 3 0 0 1-3-3z"/><path d="M12 2c2 2-2 3 0 5s-2 3 0 5"/></svg>',
  save: '<svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M5 3h12l2 2v16H5z"/><path d="M8 3v6h8V3"/><path d="M8 21v-7h8v7"/></svg>',
  download: '<svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>',
  report: '<svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h7l5 5v13H7z"/><path d="M14 3v5h5"/><path d="M10 13h6"/><path d="M10 17h4"/></svg>',
  catalog: '<svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/></svg>',
  link: '<svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.1 0l2-2a5 5 0 0 0-7.1-7.1l-1.1 1.1"/><path d="M14 11a5 5 0 0 0-7.1 0l-2 2a5 5 0 0 0 7.1 7.1l1.1-1.1"/></svg>',
  music: '<svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18V5l10-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="16" cy="16" r="3"/></svg>',
  trash: '<svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M7 7l1 14h8l1-14"/></svg>'
};

function setButtonIconText(button, iconName, text) {
  if (!button) return;
  button.textContent = '';
  const template = document.createElement('template');
  template.innerHTML = SVG_ICONS[iconName] || '';
  if (template.content.firstElementChild) {
    button.appendChild(template.content.firstElementChild);
  }
  button.appendChild(document.createTextNode(text));
}

function prependTileIcon(button, iconName) {
  if (!button || button.querySelector('.tile-icon')) return;
  const template = document.createElement('template');
  template.innerHTML = SVG_ICONS[iconName] || '';
  if (template.content.firstElementChild) {
    button.prepend(template.content.firstElementChild);
  }
}

function installSvgIcons() {
  setButtonIconText(document.getElementById('open-user-mods'), 'folder', document.getElementById('open-user-mods')?.textContent || 'User mods');
  setButtonIconText(document.getElementById('open-user-mods-panel'), 'folder', document.getElementById('open-user-mods-panel')?.textContent || 'Open folder');
  setButtonIconText(document.getElementById('refresh-mods-panel'), 'refresh', document.getElementById('refresh-mods-panel')?.textContent || 'Refresh');
  setButtonIconText(document.getElementById('modrinth-mod-search-button'), 'download', document.getElementById('modrinth-mod-search-button')?.textContent || 'Search');
  setButtonIconText(document.getElementById('modrinth-pack-search-button'), 'catalog', document.getElementById('modrinth-pack-search-button')?.textContent || 'Search');
  setButtonIconText(document.getElementById('modrinth-content-search-button'), 'catalog', document.getElementById('modrinth-content-search-button')?.textContent || 'Search');
  setButtonIconText(document.getElementById('modrinth-import-button'), 'download', document.getElementById('modrinth-import-button')?.textContent || 'Import');
  setButtonIconText(document.getElementById('refresh-instances'), 'refresh', document.getElementById('refresh-instances')?.textContent || 'Обновить');
  setButtonIconText(document.getElementById('create-instance'), 'catalog', document.getElementById('create-instance')?.textContent || 'Создать сборку');
  setButtonIconText(document.getElementById('logout-button'), 'logout', document.getElementById('logout-button')?.textContent || 'Выйти');
  setButtonIconText(document.getElementById('refresh-mods'), 'refresh', document.getElementById('refresh-mods')?.textContent || 'Обновить');
  setButtonIconText(document.getElementById('refresh-content'), 'refresh', document.getElementById('refresh-content')?.textContent || 'Обновить');
  setButtonIconText(document.getElementById('open-build-library'), 'catalog', document.getElementById('open-build-library')?.textContent || 'Каталог сборок');
  setButtonIconText(document.getElementById('select-java'), 'java', document.getElementById('select-java')?.textContent || 'Выбрать');
  setButtonIconText(document.getElementById('choose-wallpaper'), 'folder', document.getElementById('choose-wallpaper')?.textContent || 'Выбрать PNG/JPG');
  setButtonIconText(document.getElementById('save-profile-links'), 'save', document.getElementById('save-profile-links')?.textContent || 'Сохранить профиль');
  setButtonIconText(document.getElementById('connect-spotify'), 'music', document.getElementById('connect-spotify')?.textContent || 'Привязать Spotify');
  setButtonIconText(document.getElementById('refresh-spotify'), 'refresh', document.getElementById('refresh-spotify')?.textContent || 'Обновить');
  setButtonIconText(document.getElementById('disconnect-spotify'), 'link', document.getElementById('disconnect-spotify')?.textContent || 'Отключить');
  setButtonIconText(document.getElementById('clear-log'), 'trash', document.getElementById('clear-log')?.textContent || 'Очистить');
  setButtonIconText(document.getElementById('check-updates'), 'refresh', document.getElementById('check-updates')?.textContent || 'Проверить');
  setButtonIconText(document.getElementById('install-update'), 'download', document.getElementById('install-update')?.textContent || 'Установить');
  setButtonIconText(document.getElementById('open-logs'), 'folder', document.getElementById('open-logs')?.textContent || 'Открыть логи');
  setButtonIconText(document.getElementById('export-diagnostics'), 'report', document.getElementById('export-diagnostics')?.textContent || 'Собрать ZIP');
  setButtonIconText(document.getElementById('analyze-crash'), 'report', document.getElementById('analyze-crash')?.textContent || 'Анализ краша');
  setButtonIconText(document.getElementById('repair-game'), 'refresh', document.getElementById('repair-game')?.textContent || 'Починить игру');
  setButtonIconText(launchButton, 'play', launchButton?.textContent || 'Запустить Fabric');
  prependTileIcon(document.getElementById('select-skin'), 'skin');
  prependTileIcon(document.getElementById('select-cape'), 'cape');
}

function closeCustomSelects(except = null) {
  document.querySelectorAll('.custom-select.is-open').forEach((wrapper) => {
    if (wrapper !== except) {
      wrapper.classList.remove('is-open');
      wrapper.querySelector('.custom-select-button')?.setAttribute('aria-expanded', 'false');
    }
  });
}

function getSelectLabel(select) {
  const option = select.options[select.selectedIndex];
  return option?.textContent?.trim() || select.value || 'Выбрать';
}

function syncCustomSelect(select) {
  const state = customSelects.get(select);
  if (!state) return;

  state.value.textContent = getSelectLabel(select);
  state.button.disabled = select.disabled;
  state.wrapper.classList.toggle('is-disabled', select.disabled);
  state.menu.textContent = '';

  Array.from(select.options).forEach((option) => {
    const item = document.createElement('button');
    item.type = 'button';
    item.className = 'custom-select-option';
    item.dataset.value = option.value;
    item.setAttribute('role', 'option');
    item.setAttribute('aria-selected', option.selected ? 'true' : 'false');
    item.classList.toggle('is-selected', option.selected);
    item.textContent = option.textContent || option.value;
    item.disabled = option.disabled;
    item.addEventListener('click', () => {
      if (option.disabled) return;
      select.value = option.value;
      select.dispatchEvent(new Event('change', { bubbles: true }));
      closeCustomSelects();
      syncCustomSelect(select);
      state.button.focus();
    });
    state.menu.appendChild(item);
  });
}

function openCustomSelect(select) {
  const state = customSelects.get(select);
  if (!state || select.disabled) return;

  const open = !state.wrapper.classList.contains('is-open');
  closeCustomSelects(open ? state.wrapper : null);
  state.wrapper.classList.toggle('is-open', open);
  state.button.setAttribute('aria-expanded', open ? 'true' : 'false');

  if (open) {
    const selected = state.menu.querySelector('.custom-select-option.is-selected') || state.menu.querySelector('.custom-select-option');
    selected?.scrollIntoView({ block: 'nearest' });
  }
}

function enhanceCustomSelect(select) {
  if (!select || customSelects.has(select)) return;

  const wrapper = document.createElement('div');
  wrapper.className = 'custom-select';
  wrapper.dataset.selectId = select.id || '';

  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'custom-select-button';
  button.setAttribute('aria-haspopup', 'listbox');
  button.setAttribute('aria-expanded', 'false');
  button.innerHTML = `
    <span class="custom-select-value"></span>
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
  `;

  const menu = document.createElement('div');
  menu.className = 'custom-select-menu';
  menu.setAttribute('role', 'listbox');

  wrapper.append(button, menu);
  select.classList.add('native-select-hidden');
  select.insertAdjacentElement('afterend', wrapper);

  const state = {
    wrapper,
    button,
    menu,
    value: button.querySelector('.custom-select-value')
  };
  customSelects.set(select, state);

  button.addEventListener('click', (event) => {
    event.stopPropagation();
    openCustomSelect(select);
  });
  button.addEventListener('keydown', (event) => {
    if (['Enter', ' ', 'ArrowDown'].includes(event.key)) {
      event.preventDefault();
      openCustomSelect(select);
    }
  });
  menu.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      closeCustomSelects();
      button.focus();
    }
  });
  select.addEventListener('change', () => syncCustomSelect(select));

  const observer = new MutationObserver(() => syncCustomSelect(select));
  observer.observe(select, { childList: true, subtree: true, attributes: true });

  syncCustomSelect(select);
}

function syncAllCustomSelects() {
  document.querySelectorAll('select').forEach(syncCustomSelect);
}

function setupCustomSelects() {
  document.querySelectorAll('select').forEach(enhanceCustomSelect);

  if (customSelectDocumentEventsInstalled) return;
  customSelectDocumentEventsInstalled = true;
  document.addEventListener('click', () => closeCustomSelects());
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeCustomSelects();
      closeBuildLibrary();
    }
  });
}

function setAuthMode(mode) {
  const isLogin = mode === 'login';
  const isRegister = mode === 'register';
  const isGuest = mode === 'guest';
  loginForm.classList.toggle('hidden', !isLogin);
  registerForm.classList.toggle('hidden', !isRegister);
  guestForm?.classList.toggle('hidden', !isGuest);
  loginTab.classList.toggle('active', isLogin);
  registerTab.classList.toggle('active', isRegister);
  guestTab?.classList.toggle('active', isGuest);
  loginMessage.textContent = '';
  registerMessage.textContent = '';
  if (guestMessage) guestMessage.textContent = '';
  totpHint.textContent = '';
}

function setMessage(element, text, type = 'error') {
  element.textContent = text || '';
  element.dataset.type = type;
}

async function updateWindowMaximizeButton() {
  const maximized = await window.api.isWindowMaximized();
  setWindowMaximizeButton(maximized);
}

function setWindowMaximizeButton(maximized) {
  windowMaximizeButton.title = maximized ? 'Восстановить' : 'Развернуть';
  windowMaximizeButton.setAttribute('aria-label', windowMaximizeButton.title);
  windowMaximizeButton.classList.toggle('is-maximized', maximized);
}

async function controlWindow(action) {
  await window.api.windowControl(action);
  if (action === 'maximize') {
    await updateWindowMaximizeButton();
  }
}

function prepareLauncherSections() {
  const profileGrid = document.querySelector('.profile-grid');
  const playerCard = document.getElementById('select-skin')?.closest('.panel-section');
  if (profileGrid && playerCard && playerCard.parentElement !== profileGrid) {
    playerCard.classList.add('player-profile-card');
    profileGrid.prepend(playerCard);
  }
}

function setLauncherSection(section = 'main') {
  const allowed = new Set(['main', 'library', 'mods', 'settings', 'profile']);
  const activeSection = allowed.has(section) ? section : 'main';
  launcherScreen.dataset.activeSection = activeSection;

  sectionTabs.forEach((button) => {
    const active = button.dataset.section === activeSection;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  if (activeSection === 'profile') {
    requestAnimationFrame(drawPlayerPreview);
    refreshSpotifyNowPlaying();
  }
  if (activeSection === 'mods') {
    refreshMods();
  }
  if (activeSection === 'library') {
    renderServerBuildResults();
  }
}

function setSettingsTab(tab = 'info') {
  const allowed = new Set(['info', 'game', 'technical', 'debug']);
  const activeTab = allowed.has(tab) ? tab : 'info';

  settingsTabs.forEach((button) => {
    const active = button.dataset.settingsTab === activeTab;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  settingsGroups.forEach((group) => {
    group.classList.toggle('hidden', group.dataset.settingsGroup !== activeTab);
  });
}

function getCravatarUrl(nickname, size = 96) {
  const safeNickname = encodeURIComponent(String(nickname || 'Steve').trim() || 'Steve');
  return `https://cravatar.eu/helmhead/${safeNickname}/${size}.png`;
}

function getAvatarFallbackUrl(nickname, size = 96) {
  const safeNickname = encodeURIComponent(String(nickname || 'Steve').trim() || 'Steve');
  return `https://minotar.net/helm/${safeNickname}/${size}.png`;
}

function setAvatarImage(image, nickname = '', size = 96) {
  if (!image) return;

  const displayName = String(nickname || '').trim();
  const skinName = displayName && displayName !== 'offline' ? displayName : 'Steve';
  image.alt = displayName ? `${displayName} skin head` : '';
  image.decoding = 'async';
  image.referrerPolicy = 'no-referrer';
  image.classList.remove('is-empty');
  image.dataset.fallbackSrc = getAvatarFallbackUrl(skinName, size);
  image.onerror = () => {
    const fallback = image.dataset.fallbackSrc;
    if (fallback) {
      image.dataset.fallbackSrc = '';
      image.src = fallback;
      return;
    }
    image.classList.add('is-empty');
    image.removeAttribute('src');
  };
  image.onload = () => image.classList.remove('is-empty');
  image.src = getCravatarUrl(skinName, size);
}

function setAvatarImageSource(image, source, nickname = '') {
  if (!image || !source) return;

  const displayName = String(nickname || '').trim();
  image.alt = displayName ? `${displayName} skin head` : '';
  image.decoding = 'async';
  image.referrerPolicy = 'no-referrer';
  image.dataset.fallbackSrc = '';
  image.onerror = () => {
    image.classList.add('is-empty');
    image.removeAttribute('src');
  };
  image.onload = () => image.classList.remove('is-empty');
  image.classList.remove('is-empty');
  image.src = source;
}

async function createSkinHeadDataUrl(filePath, size = 128) {
  const image = await loadPreviewImage(filePath);
  if (!image) return '';

  const sourceWidth = image.naturalWidth || image.width || 0;
  const sourceHeight = image.naturalHeight || image.height || 0;
  const scale = sourceWidth / 64;
  if (!sourceWidth || !sourceHeight || sourceWidth < 64 || sourceHeight < 16 * scale) {
    return '';
  }

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { alpha: true });
  ctx.imageSmoothingEnabled = false;

  const drawSkinRegion = (x, y, width, height) => {
    const sx = Math.round(x * scale);
    const sy = Math.round(y * scale);
    const sw = Math.max(1, Math.round(width * scale));
    const sh = Math.max(1, Math.round(height * scale));
    if (sx + sw <= sourceWidth && sy + sh <= sourceHeight) {
      ctx.drawImage(image, sx, sy, sw, sh, 0, 0, size, size);
    }
  };

  drawSkinRegion(8, 8, 8, 8);
  drawSkinRegion(40, 8, 8, 8);
  return canvas.toDataURL('image/png');
}

async function refreshUserHeadAvatar() {
  const requestId = ++avatarRenderRequest;
  const nickname = activeUser?.nickname || activeUserName?.textContent || '';
  const skinPath = currentSettings?.skin;

  if (!skinPath) {
    setAvatarImage(activeUserAvatar, nickname, 96);
    setAvatarImage(accountAvatar, nickname, 128);
    setAvatarImage(profileMainAvatar, nickname, 128);
    return;
  }

  try {
    const head = await createSkinHeadDataUrl(skinPath, 128);
    if (requestId !== avatarRenderRequest) return;

    if (head) {
      setAvatarImageSource(activeUserAvatar, head, nickname);
      setAvatarImageSource(accountAvatar, head, nickname);
      setAvatarImageSource(profileMainAvatar, head, nickname);
      return;
    }
  } catch (err) {
    // Nickname avatar remains the fallback when the selected PNG cannot be decoded.
  }

  if (requestId === avatarRenderRequest) {
    setAvatarImage(activeUserAvatar, nickname, 96);
    setAvatarImage(accountAvatar, nickname, 128);
    setAvatarImage(profileMainAvatar, nickname, 128);
  }
}

function updateUserIdentity(nickname = '') {
  const name = String(nickname || 'offline').trim() || 'offline';

  if (activeUserName) activeUserName.textContent = name;
  setAvatarImage(activeUserAvatar, name, 96);
  if (accountName) accountName.textContent = name;
  setAvatarImage(accountAvatar, name, 128);
  if (profileMainName) profileMainName.textContent = name;
  setAvatarImage(profileMainAvatar, name, 128);
  if (profileModeLabel) profileModeLabel.textContent = activeUser?.guest ? 'Guest profile' : activeUser?.license ? 'Minecraft license' : 'UNIQUE account';
  if (infoProfileName) infoProfileName.textContent = name;
  refreshUserHeadAvatar();
}

function renderInfoPanel() {
  if (infoLauncherVersion) {
    infoLauncherVersion.textContent = `UNIQUE ${systemInfo?.appVersion || '1.1.1'}`;
  }
  if (infoServerSupport) {
    infoServerSupport.textContent = registeredServers.length
      ? `${registeredServers.length} серверов поддерживают лаунчер`
      : 'серверы ожидаются через API';
  }
  if (infoProfileName) {
    infoProfileName.textContent = activeUser?.nickname || 'offline';
  }
}

function renderServerBuildResults() {
  if (!serverBuildResults) return;

  const query = String(serverBuildSearch?.value || '').trim().toLowerCase();
  const servers = registeredServers.length ? registeredServers : [];
  const profiles = buildProfileOptions.length ? buildProfileOptions : [
    { id: fields.buildProfile?.value || 'normal', name: 'Normal', description: 'Default profile', memoryMaxMb: currentSettings?.memory?.max || 4096 }
  ];
  const rows = [];

  for (const server of servers) {
    for (const profile of profiles) {
      const haystack = [
        server.name,
        server.motd,
        server.host,
        profile.name,
        profile.id,
        profile.description,
        fields.minecraftVersion?.value || currentSettings?.minecraftVersion || '1.20.1'
      ].join(' ').toLowerCase();
      if (query && !haystack.includes(query)) continue;
      rows.push({ server, profile });
    }
  }

  if (!rows.length) {
    serverBuildResults.innerHTML = '<div class="empty-row">Поддерживаемые серверы или сборки не найдены.</div>';
    renderInfoPanel();
    return;
  }

  serverBuildResults.innerHTML = rows.slice(0, 8).map(({ server, profile }) => {
    const address = formatServerAddress(server);
    const selected = profile.id === (fields.buildProfile?.value || currentSettings?.buildProfile);
    return `
      <article class="server-build-card">
        <div class="server-build-icon">${escapeHtml(String(profile.name || 'U').slice(0, 1).toUpperCase())}</div>
        <div>
          <strong>${escapeHtml(server.name || 'UNIQUE Server')}</strong>
          <span>${escapeHtml(profile.name || profile.id || 'Сборка')} · ${escapeHtml(fields.minecraftVersion?.value || currentSettings?.minecraftVersion || '1.20.1')}</span>
          <small>${escapeHtml(server.motd || address || 'сервер поддерживает UNIQUE LAUNCHER')}</small>
        </div>
        <div class="server-build-meta">
          <span>${Number(server.playerCount || 0)}/${Number(server.maxPlayers || 0) || '?'}</span>
          <span>${server.tps == null ? 'TPS n/a' : `${Number(server.tps).toFixed(1)} TPS`}</span>
        </div>
        <button class="tiny-button server-build-select" type="button" data-build-id="${escapeHtml(profile.id)}">
          ${selected ? 'Выбрано' : 'Выбрать'}
        </button>
      </article>
    `;
  }).join('');
  renderInfoPanel();
}

function getBuildProfileTitle(profile) {
  return profile?.name || profile?.id || 'Сборка';
}

function getBuildProfileDescription(profile) {
  return profile?.description || 'Готовая конфигурация модов и настроек для проекта.';
}

function renderBuildCatalog() {
  if (buildLibraryGrid) {
    buildLibraryGrid.innerHTML = '';
  }
  return;
}

function getActiveBuildInstance() {
  const id = fields.activeInstance?.value || currentSettings?.activeInstanceId || '';
  return buildInstances.find((instance) => instance.id === id) || null;
}

function getSelectedModLoader() {
  const instance = getActiveBuildInstance();
  return (instance?.loader || currentSettings?.modLoader || fields.instanceLoader?.value || 'fabric').toLowerCase();
}

function getSelectedPackVersion() {
  return (fields.packFilterVersion?.value || fields.instanceVersion?.value || currentSettings?.minecraftVersion || '1.20.1').trim();
}

function getSelectedPackLoader() {
  return (fields.packFilterLoader?.value || fields.instanceLoader?.value || 'fabric').toLowerCase();
}

function formatLoaderName(loader) {
  const normalized = String(loader || 'fabric').toLowerCase();
  if (normalized === 'neoforge') return 'NeoForge';
  if (normalized === 'quilt') return 'Quilt';
  if (normalized === 'forge') return 'Forge';
  if (normalized === 'vanilla') return 'Vanilla';
  return 'Fabric';
}

function normalizeModrinthProjectType(type) {
  const normalized = String(type || '').trim().toLowerCase().replace(/[_\s-]+/g, '');
  if (normalized === 'modpack' || normalized === 'modpacks') return 'modpack';
  if (normalized === 'resourcepack' || normalized === 'resourcepacks') return 'resourcepack';
  if (normalized === 'shader' || normalized === 'shaderpacks') return 'shader';
  return 'mod';
}

function formatModrinthProjectType(type) {
  const normalized = normalizeModrinthProjectType(type);
  if (normalized === 'modpack') return 'Modpack';
  if (normalized === 'resourcepack') return 'Resource pack';
  if (normalized === 'shader') return 'Shader';
  return 'Mod';
}

function getSelectedContentType() {
  return normalizeModrinthProjectType(modrinthContentType?.value || 'resourcepack');
}

function updateModrinthLoaderLabels() {
  if (modrinthModLoaderLabel) modrinthModLoaderLabel.textContent = formatLoaderName(getSelectedModLoader());
  if (modrinthPackLoaderLabel) modrinthPackLoaderLabel.textContent = formatLoaderName(getSelectedPackLoader());
}

function renderActiveInstanceSelect() {
  if (!fields.activeInstance) return;
  const selected = currentSettings?.activeInstanceId || '';
  fields.activeInstance.textContent = '';

  if (!buildInstances.length) {
    const option = document.createElement('option');
    option.value = '';
    option.textContent = 'Создать сборку';
    fields.activeInstance.appendChild(option);
    fields.activeInstance.value = '';
    syncCustomSelect(fields.activeInstance);
    updateModrinthLoaderLabels();
    return;
  }

  for (const instance of buildInstances) {
    const option = document.createElement('option');
    option.value = instance.id;
    option.textContent = `${instance.name} · ${instance.minecraftVersion} · ${formatLoaderName(instance.loader)}`;
    fields.activeInstance.appendChild(option);
  }

  fields.activeInstance.value = buildInstances.some((instance) => instance.id === selected)
    ? selected
    : buildInstances[0].id;
  syncCustomSelect(fields.activeInstance);
  updateModrinthLoaderLabels();
}

function renderInstanceList() {
  if (!instanceList) return;

  if (!buildInstances.length) {
    instanceList.innerHTML = '<div class="empty-row instance-empty">Сборок пока нет. Создай локальную сборку или установи Modrinth pack.</div>';
    return;
  }

  const activeId = currentSettings?.activeInstanceId || fields.activeInstance?.value || '';
  instanceList.innerHTML = buildInstances.map((instance) => {
    const active = instance.id === activeId;
    const source = instance.source === 'modrinth' ? 'Modrinth' : instance.source === 'server' ? 'Server' : instance.source === 'imported' ? 'Imported' : 'Custom';
    return `
      <article class="instance-card ${active ? 'active' : ''}">
        <div class="instance-icon">${escapeHtml(String(instance.name || 'U').slice(0, 2).toUpperCase())}</div>
        <div>
          <strong>${escapeHtml(instance.name)}</strong>
          <span>${escapeHtml(instance.minecraftVersion)} · ${escapeHtml(formatLoaderName(instance.loader))} · ${escapeHtml(source)}</span>
        </div>
        <button class="tiny-button instance-select" type="button" data-instance-id="${escapeHtml(instance.id)}">
          ${active ? 'Выбрано' : 'Выбрать'}
        </button>
      </article>
    `;
  }).join('');
}

async function loadBuildInstances() {
  if (!window.api.listBuildInstances) return;
  const result = await window.api.listBuildInstances({ nickname: activeUser?.nickname || '' });
  if (!result.success) {
    buildInstances = [];
    renderActiveInstanceSelect();
    renderInstanceList();
    return;
  }

  buildInstances = result.instances || [];
  if (result.activeInstanceId && currentSettings) {
    currentSettings.activeInstanceId = result.activeInstanceId;
  }
  if (!currentSettings?.activeInstanceId && buildInstances.length && window.api.selectBuildInstance) {
    const selected = await window.api.selectBuildInstance({
      nickname: activeUser?.nickname || '',
      instanceId: buildInstances[0].id
    });
    if (selected.success) {
      currentSettings = selected.settings || currentSettings;
      buildInstances = selected.instances || buildInstances;
    }
  }
  renderActiveInstanceSelect();
  renderInstanceList();
  updateModrinthLoaderLabels();
}

async function selectBuildInstance(instanceId) {
  if (!instanceId) {
    setLauncherSection('library');
    return;
  }

  const result = await window.api.selectBuildInstance({
    nickname: activeUser?.nickname || '',
    instanceId
  });
  if (!result.success) {
    if (buildLibraryStatus) buildLibraryStatus.textContent = result.error || 'Не удалось выбрать сборку.';
    return;
  }

  currentSettings = result.settings || currentSettings;
  buildInstances = result.instances || buildInstances;
  applySettingsToUi();
  renderActiveInstanceSelect();
  renderInstanceList();
  await refreshMods();
  if (buildLibraryStatus) buildLibraryStatus.textContent = `Выбрана сборка ${result.instance?.name || ''}.`;
}

async function createBuildInstance() {
  const minecraftVersion = fields.instanceVersion?.value || fields.minecraftVersion?.value || '1.20.1';
  const loader = fields.instanceLoader?.value || 'fabric';
  const result = await window.api.createBuildInstance({
    nickname: activeUser?.nickname || '',
    name: fields.instanceName?.value || '',
    minecraftVersion,
    loader,
    source: 'custom'
  });

  if (!result.success) {
    if (buildLibraryStatus) buildLibraryStatus.textContent = result.error || 'Не удалось создать сборку.';
    return;
  }

  currentSettings = result.settings || currentSettings;
  buildInstances = result.instances || [];
  if (fields.instanceName) fields.instanceName.value = '';
  applySettingsToUi();
  renderActiveInstanceSelect();
  renderInstanceList();
  await refreshMods();
  if (buildLibraryStatus) buildLibraryStatus.textContent = `Сборка ${result.instance?.name || ''} создана и выбрана.`;
}

async function importExistingInstance() {
  if (!window.api.chooseDirectory || !window.api.importExistingBuildInstance) return;
  const folder = await window.api.chooseDirectory();
  if (!folder) return;
  if (buildLibraryStatus) buildLibraryStatus.textContent = `Importing ${folder.name}...`;
  const result = await window.api.importExistingBuildInstance({
    nickname: activeUser?.nickname || '',
    sourcePath: folder.path,
    name: folder.name
  });
  if (!result.success) {
    if (buildLibraryStatus) buildLibraryStatus.textContent = result.error || 'Import failed.';
    return;
  }
  currentSettings = result.settings || currentSettings;
  buildInstances = result.instances || [];
  applySettingsToUi();
  renderActiveInstanceSelect();
  renderInstanceList();
  await refreshMods();
  if (buildLibraryStatus) buildLibraryStatus.textContent = `Imported ${result.instance?.name || folder.name}.`;
}

async function importMrpack() {
  if (!window.api.chooseFile || !window.api.importModrinthModpack) return;
  const file = await window.api.chooseFile({ filters: [{ name: 'Modrinth modpack', extensions: ['mrpack'] }] });
  if (!file) return;
  if (buildLibraryStatus) buildLibraryStatus.textContent = `Importing ${file.name}...`;
  const result = await window.api.importModrinthModpack({
    nickname: activeUser?.nickname || '',
    filePath: file.path,
    name: file.name.replace(/\.mrpack$/i, ''),
    minecraftVersion: getSelectedPackVersion(),
    loader: getSelectedPackLoader()
  });
  if (!result.success) {
    if (buildLibraryStatus) buildLibraryStatus.textContent = result.error || 'Modrinth import failed.';
    return;
  }
  if (result.instance) {
    currentSettings.activeInstanceId = result.instance.id;
    currentSettings.modLoader = result.instance.loader || result.loader || getSelectedPackLoader();
    await loadBuildInstances();
  }
  await saveSettings({
    minecraftVersion: result.minecraftVersion || getSelectedPackVersion(),
    activeInstanceId: result.instance?.id || currentSettings?.activeInstanceId || '',
    modLoader: result.loader || currentSettings?.modLoader || 'fabric',
    loaderVersion: result.loaderVersion || currentSettings?.loaderVersion || 'latest',
    fabricLoaderVersion: result.fabricLoaderVersion || fields.fabricLoaderVersion?.value || 'latest',
    forgeVersion: result.forgeVersion || currentSettings?.forgeVersion || 'latest',
    neoforgeVersion: result.neoforgeVersion || currentSettings?.neoforgeVersion || 'latest',
    quiltLoaderVersion: result.quiltLoaderVersion || currentSettings?.quiltLoaderVersion || 'latest'
  });
  await refreshMods();
  if (buildLibraryStatus) buildLibraryStatus.textContent = `Imported ${result.packName || file.name}. Files: ${result.installedCount || 0}.`;
}

function openBuildLibrary() {
  renderBuildCatalog();
  renderInstanceList();
  setLauncherSection('library');
}

function closeBuildLibrary() {
  if (launcherScreen?.dataset.activeSection === 'library') {
    setLauncherSection('main');
  }
}

async function selectBuildProfile(profileId, fromCatalog = false) {
  if (!fields.buildProfile || !profileId) return;

  fields.buildProfile.value = profileId;
  syncCustomSelect(fields.buildProfile);
  applyBuildProfileMemory(profileId);
  await saveSettings({ buildProfile: profileId });
  if (fromCatalog && buildLibraryStatus) {
    const profile = buildProfileOptions.find((entry) => entry.id === profileId);
    buildLibraryStatus.textContent = `Скачиваю ${getBuildProfileTitle(profile)}...`;
  }
  if (fromCatalog && window.api.installBuildProfile) {
    const result = await window.api.installBuildProfile({
      nickname: activeUser?.nickname || '',
      minecraftVersion: currentSettings?.minecraftVersion || fields.minecraftVersion?.value || '1.20.1',
      buildProfile: profileId
    });
    if (!result.success) {
      if (buildLibraryStatus) buildLibraryStatus.textContent = result.error || 'Не удалось скачать сборку.';
      return;
    }
  }
  await refreshMods();
  updateLaunchInsights();
  renderBuildCatalog();

  if (fromCatalog && buildLibraryStatus) {
    const profile = buildProfileOptions.find((entry) => entry.id === profileId);
    buildLibraryStatus.textContent = `${getBuildProfileTitle(profile)} подготовлена. Можно запускать игру.`;
  }
}

function shortPath(filePath) {
  if (!filePath) return '';
  return filePath.split(/[\\/]/).pop();
}

async function loadTitlebarIcon() {
  const result = await window.api.getTitlebarIcon();
  if (result.success && result.preview) {
    titlebarIcon.src = result.preview;
    titlebarIcon.classList.add('visible');
    if (navBrandIcon) {
      navBrandIcon.src = result.preview;
      navBrandIcon.classList.add('visible');
    }
  }
}

function appendLog(line) {
  const text = String(line || '').trim();
  if (!text) return;

  const next = `${launchLog.textContent}${text}\n`;
  launchLog.textContent = next.split('\n').slice(-140).join('\n');
  launchLog.scrollTop = launchLog.scrollHeight;
}

async function setImagePreview(img, filePath) {
  img.removeAttribute('src');
  img.classList.remove('visible');

  if (!filePath) return;

  const result = await window.api.getAssetPreview(filePath);
  if (result.success && result.preview) {
    img.src = result.preview;
    img.classList.add('visible');
  }
}

async function loadPreviewImage(filePath) {
  if (!filePath) return null;

  const result = await window.api.getAssetPreview(filePath);
  if (!result.success || !result.preview) return null;

  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => resolve(null);
    image.src = result.preview;
  });
}

async function loadAnimatedPreviewImage(filePath) {
  if (!filePath) return null;

  const result = await window.api.getAssetPreview(filePath);
  if (!result.success || !result.preview) return null;

  return new Promise((resolve) => {
    const image = new Image();
    image.style.position = 'fixed';
    image.style.left = '-1000px';
    image.style.top = '-1000px';
    image.style.width = '1px';
    image.style.height = '1px';
    image.style.opacity = '0';
    image.style.pointerEvents = 'none';
    image.onload = () => resolve(image);
    image.onerror = () => {
      image.remove();
      resolve(null);
    };
    image.src = result.preview;
    document.body.appendChild(image);
  });
}

function releaseCapeAnimationSource() {
  if (playerPreview.capeAnimationSource) {
    playerPreview.capeAnimationSource.remove();
    playerPreview.capeAnimationSource = null;
  }
}

function sampleImageColor(image, x, y, width, height, fallback) {
  if (!image) return fallback;

  const canvas = document.createElement('canvas');
  const sourceWidth = image.naturalWidth || image.width || 64;
  const sourceHeight = image.naturalHeight || image.height || 64;
  canvas.width = sourceWidth;
  canvas.height = sourceHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, sourceWidth, sourceHeight);

  const sx = Math.max(0, Math.min(sourceWidth - 1, Math.floor(x)));
  const sy = Math.max(0, Math.min(sourceHeight - 1, Math.floor(y)));
  const sw = Math.max(1, Math.min(sourceWidth - sx, Math.floor(width)));
  const sh = Math.max(1, Math.min(sourceHeight - sy, Math.floor(height)));
  const pixels = ctx.getImageData(sx, sy, sw, sh).data;
  let r = 0;
  let g = 0;
  let b = 0;
  let count = 0;

  for (let i = 0; i < pixels.length; i += 4) {
    if (pixels[i + 3] < 16) continue;
    r += pixels[i];
    g += pixels[i + 1];
    b += pixels[i + 2];
    count += 1;
  }

  if (!count) return fallback;
  return `rgb(${Math.round(r / count)}, ${Math.round(g / count)}, ${Math.round(b / count)})`;
}

function sampleSkinColor(image, x, y, width, height, fallback) {
  const rect = skinRect(image, x, y, width, height);
  if (!rect) return fallback;
  return sampleImageColor(rect.image, rect.sx, rect.sy, rect.sw, rect.sh, fallback);
}

function shadeColor(color, amount) {
  const match = color.match(/\d+/g);
  if (!match || match.length < 3) return color;
  const [r, g, b] = match.map(Number);
  const next = [r, g, b].map((channel) => Math.max(0, Math.min(255, Math.round(channel * amount))));
  return `rgb(${next[0]}, ${next[1]}, ${next[2]})`;
}

function getSkinLayout(image) {
  const sourceWidth = image?.naturalWidth || image?.width || 64;
  const sourceHeight = image?.naturalHeight || image?.height || 64;
  const modernDelta = Math.abs(sourceHeight - sourceWidth);
  const legacyDelta = Math.abs(sourceHeight - (sourceWidth / 2));
  const baseHeight = legacyDelta < modernDelta ? 32 : 64;

  return {
    sourceWidth,
    sourceHeight,
    baseHeight,
    hasSecondLayer: baseHeight === 64,
    scaleX: sourceWidth / 64,
    scaleY: sourceHeight / baseHeight,
    valid: sourceWidth >= 64
      && sourceHeight >= 32
      && Math.abs((sourceWidth / 64) - (sourceHeight / baseHeight)) <= Math.max(1, sourceWidth / 64) * 0.08
  };
}

function skinRect(image, x, y, width, height) {
  if (!image) return null;
  const layout = getSkinLayout(image);
  if (!layout.valid) return null;
  // Minecraft skin UVs are defined on a 64px-wide grid. HD skins keep the same
  // layout, so every UV coordinate scales from that canonical grid on both axes.
  const sx = x * layout.scaleX;
  const sy = y * layout.scaleY;
  if (sx >= layout.sourceWidth || sy >= layout.sourceHeight) return null;
  return {
    image,
    sx,
    sy,
    sw: Math.max(1, Math.min(width * layout.scaleX, layout.sourceWidth - sx)),
    sh: Math.max(1, Math.min(height * layout.scaleY, layout.sourceHeight - sy))
  };
}

function getCapeLayout(image) {
  const sourceWidth = image?.naturalWidth || image?.width || 64;
  const sourceHeight = image?.naturalHeight || image?.height || 32;
  return {
    sourceWidth,
    sourceHeight,
    scaleX: sourceWidth / 64,
    scaleY: sourceHeight / 32,
    valid: sourceWidth >= 16 && sourceHeight >= 8
  };
}

function capeRect(image, x, y, width, height) {
  if (!image) return null;
  const layout = getCapeLayout(image);
  if (!layout.valid) return null;
  const sx = x * layout.scaleX;
  const sy = y * layout.scaleY;
  if (sx >= layout.sourceWidth || sy >= layout.sourceHeight) return null;

  return {
    image,
    sx,
    sy,
    sw: Math.max(1, Math.min(width * layout.scaleX, layout.sourceWidth - sx)),
    sh: Math.max(1, Math.min(height * layout.scaleY, layout.sourceHeight - sy)),
    animated: playerPreview.capeAnimated
  };
}

function createOpaqueSkinImage(image) {
  if (!image) return null;

  const sourceWidth = image.naturalWidth || image.width || 64;
  const sourceHeight = image.naturalHeight || image.height || 64;
  const canvas = document.createElement('canvas');
  canvas.width = sourceWidth;
  canvas.height = sourceHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, sourceWidth, sourceHeight);
  const imageData = ctx.getImageData(0, 0, sourceWidth, sourceHeight);
  for (let i = 3; i < imageData.data.length; i += 4) {
    imageData.data[i] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

function clearPlayerPreviewCropCache() {
  playerPreview.cropCache.clear();
}

function getImageId(image) {
  if (!imageIds.has(image)) {
    imageIds.set(image, nextImageId);
    nextImageId += 1;
  }
  return imageIds.get(image);
}

function detectPreviewSkinModel(image) {
  if (!image) return 'default';
  const layout = getSkinLayout(image);
  if (!layout.valid) return 'default';
  const canvas = document.createElement('canvas');
  canvas.width = layout.sourceWidth;
  canvas.height = layout.sourceHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0, layout.sourceWidth, layout.sourceHeight);

  const regions = [{ x: 47, y: 20, w: 1, h: 12 }];
  if (layout.hasSecondLayer) {
    regions.push({ x: 39, y: 52, w: 1, h: 12 });
  }
  let transparent = 0;
  let total = 0;

  for (const region of regions) {
    const sx = Math.floor(region.x * layout.scaleX);
    const sy = Math.floor(region.y * layout.scaleY);
    const sw = Math.max(1, Math.floor(region.w * layout.scaleX));
    const sh = Math.max(1, Math.floor(region.h * layout.scaleY));
    if (sx >= layout.sourceWidth || sy >= layout.sourceHeight) continue;

    const pixels = ctx.getImageData(
      sx,
      sy,
      Math.min(sw, layout.sourceWidth - sx),
      Math.min(sh, layout.sourceHeight - sy)
    ).data;
    for (let i = 0; i < pixels.length; i += 4) {
      total += 1;
      if (pixels[i + 3] < 16) transparent += 1;
    }
  }

  return total > 0 && transparent / total > 0.6 ? 'slim' : 'default';
}

function getSelectedSkinModel() {
  if (currentSettings?.skinModel === 'slim') return 'slim';
  if (currentSettings?.skinModel === 'default') return 'default';
  return detectPreviewSkinModel(playerPreview.skinImage);
}

function armTextures(skin, baseX, baseY, slim) {
  if (slim) {
    return {
      front: skinRect(skin, baseX + 4, baseY + 4, 3, 12),
      back: skinRect(skin, baseX + 11, baseY + 4, 3, 12),
      top: skinRect(skin, baseX + 4, baseY, 3, 4),
      bottom: skinRect(skin, baseX + 7, baseY, 3, 4),
      right: skinRect(skin, baseX, baseY + 4, 4, 12),
      left: skinRect(skin, baseX + 7, baseY + 4, 4, 12)
    };
  }

  return {
    front: skinRect(skin, baseX + 4, baseY + 4, 4, 12),
    back: skinRect(skin, baseX + 12, baseY + 4, 4, 12),
    top: skinRect(skin, baseX + 4, baseY, 4, 4),
    bottom: skinRect(skin, baseX + 8, baseY, 4, 4),
    right: skinRect(skin, baseX, baseY + 4, 4, 12),
    left: skinRect(skin, baseX + 8, baseY + 4, 4, 12)
  };
}

function legTextures(skin, baseX, baseY) {
  return {
    front: skinRect(skin, baseX + 4, baseY + 4, 4, 12),
    back: skinRect(skin, baseX + 12, baseY + 4, 4, 12),
    top: skinRect(skin, baseX + 4, baseY, 4, 4),
    bottom: skinRect(skin, baseX + 8, baseY, 4, 4),
    right: skinRect(skin, baseX, baseY + 4, 4, 12),
    left: skinRect(skin, baseX + 8, baseY + 4, 4, 12)
  };
}

function getPlayerTextures() {
  const skin = playerPreview.skinImage;
  const skinBase = playerPreview.skinBaseImage || playerPreview.skinImage;
  const cape = playerPreview.capeImage;
  const layout = getSkinLayout(skin);
  const hasSecondLayer = layout.valid && layout.hasSecondLayer;
  const slim = getSelectedSkinModel() === 'slim';

  return {
    head: {
      front: skinRect(skinBase, 8, 8, 8, 8),
      back: skinRect(skinBase, 24, 8, 8, 8),
      top: skinRect(skinBase, 8, 0, 8, 8),
      bottom: skinRect(skinBase, 16, 0, 8, 8),
      right: skinRect(skinBase, 0, 8, 8, 8),
      left: skinRect(skinBase, 16, 8, 8, 8)
    },
    headOverlay: hasSecondLayer ? {
      front: skinRect(skin, 40, 8, 8, 8),
      back: skinRect(skin, 56, 8, 8, 8),
      top: skinRect(skin, 40, 0, 8, 8),
      bottom: skinRect(skin, 48, 0, 8, 8),
      right: skinRect(skin, 32, 8, 8, 8),
      left: skinRect(skin, 48, 8, 8, 8)
    } : null,
    body: {
      front: skinRect(skinBase, 20, 20, 8, 12),
      back: skinRect(skinBase, 32, 20, 8, 12),
      top: skinRect(skinBase, 20, 16, 8, 4),
      bottom: skinRect(skinBase, 28, 16, 8, 4),
      right: skinRect(skinBase, 16, 20, 4, 12),
      left: skinRect(skinBase, 28, 20, 4, 12)
    },
    bodyOverlay: hasSecondLayer ? {
      front: skinRect(skin, 20, 36, 8, 12),
      back: skinRect(skin, 32, 36, 8, 12),
      top: skinRect(skin, 20, 32, 8, 4),
      bottom: skinRect(skin, 28, 32, 8, 4),
      right: skinRect(skin, 16, 36, 4, 12),
      left: skinRect(skin, 28, 36, 4, 12)
    } : null,
    rightArm: armTextures(skinBase, 40, 16, slim),
    rightArmOverlay: hasSecondLayer ? armTextures(skin, 40, 32, slim) : null,
    leftArm: hasSecondLayer ? armTextures(skinBase, 32, 48, slim) : armTextures(skinBase, 40, 16, slim),
    leftArmOverlay: hasSecondLayer ? armTextures(skin, 48, 48, slim) : null,
    rightLeg: legTextures(skinBase, 0, 16),
    rightLegOverlay: hasSecondLayer ? legTextures(skin, 0, 32) : null,
    leftLeg: hasSecondLayer ? legTextures(skinBase, 16, 48) : legTextures(skinBase, 0, 16),
    leftLegOverlay: hasSecondLayer ? legTextures(skin, 0, 48) : null,
    cape: {
      front: capeRect(cape, 1, 1, 10, 16),
      back: capeRect(cape, 12, 1, 10, 16),
      top: capeRect(cape, 1, 0, 10, 1),
      bottom: capeRect(cape, 11, 0, 10, 1),
      right: capeRect(cape, 0, 1, 1, 16),
      left: capeRect(cape, 11, 1, 1, 16)
    },
    hasSecondLayer
  };
}

function projectPoint(point, centerX, centerY, scale) {
  const cos = Math.cos(playerPreview.yaw);
  const sin = Math.sin(playerPreview.yaw);
  const pitchCos = Math.cos(playerPreview.pitch);
  const pitchSin = Math.sin(playerPreview.pitch);
  const x = point[0] * cos - point[2] * sin;
  const yawZ = point[0] * sin + point[2] * cos;
  const y = point[1] * pitchCos - yawZ * pitchSin;
  const z = point[1] * pitchSin + yawZ * pitchCos;
  return {
    x: centerX + x * scale,
    y: centerY - y * scale + z * scale * 0.16,
    z
  };
}

function createCuboid(center, size, color, textures = {}, overlay = false) {
  const [cx, cy, cz] = center;
  const [w, h, d] = size.map((value) => value / 2);
  const vertices = [
    [cx - w, cy - h, cz - d], [cx + w, cy - h, cz - d],
    [cx + w, cy + h, cz - d], [cx - w, cy + h, cz - d],
    [cx - w, cy - h, cz + d], [cx + w, cy - h, cz + d],
    [cx + w, cy + h, cz + d], [cx - w, cy + h, cz + d]
  ];
  const faces = [
    { name: 'front', points: [0, 1, 2, 3], shade: 0.82 },
    { name: 'back', points: [5, 4, 7, 6], shade: 1 },
    { name: 'bottom', points: [0, 4, 5, 1], shade: 0.72 },
    { name: 'top', points: [3, 2, 6, 7], shade: 1.12 },
    { name: 'right', points: [1, 5, 6, 2], shade: 0.9 },
    { name: 'left', points: [4, 0, 3, 7], shade: 0.62 }
  ];

  return faces.map((face) => ({
    color: shadeColor(color, face.shade),
    texture: textures[face.name] || null,
    overlay,
    vertices: face.points.map((index) => vertices[index])
  }));
}

function rotateLimb(center, size, angleX = 0, angleZ = 0, pivotY = 0) {
  const [cx, cy, cz] = center;
  const [w, h, d] = size.map((value) => value / 2);
  const cosX = Math.cos(angleX);
  const sinX = Math.sin(angleX);
  const cosZ = Math.cos(angleZ);
  const sinZ = Math.sin(angleZ);

  return [
    [-w, -h, -d], [w, -h, -d],
    [w, h, -d], [-w, h, -d],
    [-w, -h, d], [w, -h, d],
    [w, h, d], [-w, h, d]
  ].map(([x, y, z]) => {
    const localY = y - pivotY;
    const pitchedY = localY * cosX - z * sinX;
    const pitchedZ = localY * sinX + z * cosX;
    const rolledX = x * cosZ - pitchedY * sinZ;
    const rolledY = x * sinZ + pitchedY * cosZ;
    return [cx + rolledX, cy + pivotY + rolledY, cz + pitchedZ];
  });
}

function createPosedCuboid(center, size, color, textures = {}, pose = {}, overlay = false) {
  const vertices = rotateLimb(center, size, pose.angleX || 0, pose.angleZ || 0, pose.pivotY || 0);
  const faces = [
    { name: 'front', points: [0, 1, 2, 3], shade: 0.82 },
    { name: 'back', points: [5, 4, 7, 6], shade: 1 },
    { name: 'bottom', points: [0, 4, 5, 1], shade: 0.72 },
    { name: 'top', points: [3, 2, 6, 7], shade: 1.12 },
    { name: 'right', points: [1, 5, 6, 2], shade: 0.9 },
    { name: 'left', points: [4, 0, 3, 7], shade: 0.62 }
  ];

  return faces.map((face) => ({
    color: shadeColor(color, face.shade),
    texture: textures[face.name] || null,
    overlay,
    vertices: face.points.map((index) => vertices[index])
  }));
}

function drawTexturedFace(ctx, face) {
  const texture = face.texture;
  const points = face.points;
  if (!texture?.image || !texture.sw || !texture.sh) {
    return false;
  }

  const crop = getTextureCrop(texture);
  if (!crop) return false;

  const [bottomLeft, bottomRight, topRight, topLeft] = points;
  const a = (topRight.x - topLeft.x) / crop.width;
  const b = (topRight.y - topLeft.y) / crop.width;
  const c = (bottomLeft.x - topLeft.x) / crop.height;
  const d = (bottomLeft.y - topLeft.y) / crop.height;

  ctx.save();
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.closePath();
  ctx.clip();
  ctx.imageSmoothingEnabled = false;
  ctx.setTransform(a, b, c, d, topLeft.x, topLeft.y);
  ctx.drawImage(crop, 0, 0);
  ctx.restore();
  return true;
}

function getTextureCrop(texture) {
  const sx = Math.max(0, Math.round(texture.sx));
  const sy = Math.max(0, Math.round(texture.sy));
  const sourceWidth = texture.image.naturalWidth || texture.image.width || 1;
  const sourceHeight = texture.image.naturalHeight || texture.image.height || 1;
  const width = Math.max(1, Math.min(Math.round(texture.sw), sourceWidth - sx));
  const height = Math.max(1, Math.min(Math.round(texture.sh), sourceHeight - sy));
  const key = `${getImageId(texture.image)}:${sx}:${sy}:${width}:${height}`;
  if (texture.animated) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(texture.image, sx, sy, width, height, 0, 0, width, height);
    return canvas;
  }

  if (playerPreview.cropCache.has(key)) {
    return playerPreview.cropCache.get(key);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(texture.image, sx, sy, width, height, 0, 0, width, height);
  playerPreview.cropCache.set(key, canvas);
  return canvas;
}

function drawPlayerPreview() {
  if (!playerPreviewCanvas) return;

  const ctx = playerPreviewCanvas.getContext('2d');
  const width = playerPreviewCanvas.width;
  const height = playerPreviewCanvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const colors = playerPreview.colors;
  const textures = getPlayerTextures();
  const slim = getSelectedSkinModel() === 'slim';
  const px = 0.115;
  const headSize = 8 * px;
  const bodyWidth = 8 * px;
  const bodyHeight = 12 * px;
  const bodyDepth = 4 * px;
  const armWidth = (slim ? 3 : 4) * px;
  const limbHeight = 12 * px;
  const limbDepth = 4 * px;
  const legWidth = 4 * px;
  const overlay = 0.5 * px;
  const legY = limbHeight / 2;
  const bodyY = limbHeight + (bodyHeight / 2);
  const headY = limbHeight + bodyHeight + (headSize / 2);
  const armX = (bodyWidth / 2) + (armWidth / 2) + (0.18 * px);
  const legX = (legWidth / 2) + (0.1 * px);
  const rightArmPose = { angleX: -0.16, angleZ: 0.18, pivotY: limbHeight / 2 };
  const leftArmPose = { angleX: 0.12, angleZ: -0.18, pivotY: limbHeight / 2 };
  const rightLegPose = { angleX: 0.1, angleZ: -0.06, pivotY: limbHeight / 2 };
  const leftLegPose = { angleX: -0.08, angleZ: 0.06, pivotY: limbHeight / 2 };
  const capePose = { angleX: -0.18, pivotY: 8 * px };
  const parts = [
    createCuboid([0, headY, 0], [headSize, headSize, headSize], colors.head, textures.head),
    createCuboid([0, bodyY, 0], [bodyWidth, bodyHeight, bodyDepth], colors.body, textures.body),
    createPosedCuboid([-armX, bodyY, 0], [armWidth, limbHeight, limbDepth], colors.arm, textures.rightArm, rightArmPose),
    createPosedCuboid([armX, bodyY, 0], [armWidth, limbHeight, limbDepth], colors.arm, textures.leftArm || textures.rightArm, leftArmPose),
    createPosedCuboid([-legX, legY, 0], [legWidth, limbHeight, limbDepth], colors.leg, textures.rightLeg, rightLegPose),
    createPosedCuboid([legX, legY, 0], [legWidth, limbHeight, limbDepth], colors.leg, textures.leftLeg || textures.rightLeg, leftLegPose)
  ].flat();

  if (textures.hasSecondLayer) {
    parts.push(
      ...createCuboid([0, headY, 0], [headSize + (overlay * 2), headSize + (overlay * 2), headSize + (overlay * 2)], 'rgba(255,255,255,0)', textures.headOverlay, true),
      ...createCuboid([0, bodyY, 0], [bodyWidth + overlay, bodyHeight + overlay, bodyDepth + overlay], 'rgba(255,255,255,0)', textures.bodyOverlay, true),
      ...createPosedCuboid([-armX, bodyY, 0], [armWidth + overlay, limbHeight + overlay, limbDepth + overlay], 'rgba(255,255,255,0)', textures.rightArmOverlay, rightArmPose, true),
      ...createPosedCuboid([armX, bodyY, 0], [armWidth + overlay, limbHeight + overlay, limbDepth + overlay], 'rgba(255,255,255,0)', textures.leftArmOverlay, leftArmPose, true),
      ...createPosedCuboid([-legX, legY, 0], [legWidth + overlay, limbHeight + overlay, limbDepth + overlay], 'rgba(255,255,255,0)', textures.rightLegOverlay, rightLegPose, true),
      ...createPosedCuboid([legX, legY, 0], [legWidth + overlay, limbHeight + overlay, limbDepth + overlay], 'rgba(255,255,255,0)', textures.leftLegOverlay, leftLegPose, true)
    );
  }

  if (playerPreview.capeImage) {
    parts.push(...createPosedCuboid([0, bodyY - (2 * px), (bodyDepth / 2) + (1.5 * px)], [10 * px, 16 * px, 0.5 * px], colors.cape, textures.cape, capePose));
  }

  const centerX = width / 2;
  const centerY = height - 32;
  const scale = 74 * playerPreview.zoom;
  const projectedFaces = parts.map((face) => {
    const points = face.vertices.map((point) => projectPoint(point, centerX, centerY, scale));
    return {
      color: face.color,
      texture: face.texture,
      overlay: face.overlay,
      points,
      depth: points.reduce((sum, point) => sum + point.z, 0) / points.length
    };
  }).sort((a, b) => a.depth - b.depth);

  for (const face of projectedFaces) {
    ctx.beginPath();
    ctx.moveTo(face.points[0].x, face.points[0].y);
    for (let i = 1; i < face.points.length; i += 1) {
      ctx.lineTo(face.points[i].x, face.points[i].y);
    }
    ctx.closePath();
    if (!face.overlay) {
      ctx.fillStyle = face.color;
      ctx.fill();
    }
    const textured = drawTexturedFace(ctx, face);
    if (!face.overlay && !textured) {
      ctx.strokeStyle = 'rgba(5, 5, 8, 0.45)';
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }
}

async function refreshPlayerPreviewAssets() {
  const capeAnimated = Boolean(currentSettings?.cape && /\.gif$/i.test(currentSettings.cape));
  releaseCapeAnimationSource();

  const [skinImage, capeImage] = await Promise.all([
    loadPreviewImage(currentSettings?.skin),
    capeAnimated ? loadAnimatedPreviewImage(currentSettings?.cape) : loadPreviewImage(currentSettings?.cape)
  ]);

  playerPreview.skinImage = skinImage;
  playerPreview.skinBaseImage = createOpaqueSkinImage(skinImage);
  playerPreview.capeImage = capeImage;
  playerPreview.capeAnimated = capeAnimated && Boolean(capeImage);
  playerPreview.capeAnimationSource = playerPreview.capeAnimated ? capeImage : null;
  clearPlayerPreviewCropCache();
  playerPreview.colors.head = sampleSkinColor(skinImage, 8, 8, 8, 8, '#cfa27f');
  playerPreview.colors.body = sampleSkinColor(skinImage, 20, 20, 8, 12, '#3f7bd8');
  playerPreview.colors.arm = sampleSkinColor(skinImage, 44, 20, 4, 12, playerPreview.colors.head);
  playerPreview.colors.leg = sampleSkinColor(skinImage, 4, 20, 4, 12, '#334155');
  playerPreview.colors.cape = sampleImageColor(capeImage, 1, 1, 20, 16, '#7c3aed');
  setPlayerPreviewAnimation(playerPreview.capeAnimated);
  drawPlayerPreview();
}

function setPlayerPreviewAnimation(active) {
  if (!playerPreviewCanvas) return;
  if (playerPreview.animationFrame) {
    cancelAnimationFrame(playerPreview.animationFrame);
    playerPreview.animationFrame = null;
  }

  if (!active) {
    clearPlayerPreviewCropCache();
    return;
  }

  let lastDraw = 0;
  const tick = (time) => {
    if (!playerPreview.capeAnimated) {
      playerPreview.animationFrame = null;
      return;
    }

    if (time - lastDraw > 40) {
      clearPlayerPreviewCropCache();
      drawPlayerPreview();
      lastDraw = time;
    }
    playerPreview.animationFrame = requestAnimationFrame(tick);
  };
  playerPreview.animationFrame = requestAnimationFrame(tick);
}

async function setWallpaperPreview(filePath) {
  wallpaperPreview.style.removeProperty('--wallpaper');
  wallpaperPreview.classList.remove('has-wallpaper');

  if (!filePath) return;

  const result = await window.api.getAssetPreview(filePath);
  if (result.success && result.preview) {
    wallpaperPreview.style.setProperty('--wallpaper', `url("${result.preview}")`);
    wallpaperPreview.classList.add('has-wallpaper');
  }
}

function applyAppearance() {
  const appearance = currentSettings?.appearance || {};
  const theme = ['cosmic', 'light', 'deep', 'contrast'].includes(appearance.theme) ? appearance.theme : 'cosmic';
  const accent = ['violet', 'cyan', 'emerald', 'rose'].includes(appearance.accent) ? appearance.accent : 'violet';
  const reduceMotion = Boolean(appearance.reduceMotion);

  document.body.dataset.theme = theme;
  document.body.dataset.accent = accent;
  document.body.classList.toggle('reduce-motion', reduceMotion);
  const styles = getComputedStyle(document.body);
  spaceAccentRgb = styles.getPropertyValue('--accent-rgb').trim() || spaceAccentRgb;
  spaceAccent2Rgb = styles.getPropertyValue('--accent-2-rgb').trim() || spaceAccent2Rgb;
}

function applySettingsToUi() {
  const memory = currentSettings.memory;
  fields.memoryMax.value = memory.max;
  fields.memoryMaxLabel.textContent = memory.max;
  fields.minecraftVersion.value = currentSettings.minecraftVersion || '1.20.1';
  if (fields.buildProfile) {
    fields.buildProfile.value = currentSettings.buildProfile || 'normal';
  }
  if (fields.projectId) {
    fields.projectId.value = currentSettings.projectId || 'unique';
  }
  fields.fabricLoaderVersion.value = currentSettings.fabricLoaderVersion || 'latest';
  if (fields.activeInstance) fields.activeInstance.value = currentSettings.activeInstanceId || '';
  if (fields.instanceVersion) fields.instanceVersion.value = currentSettings.minecraftVersion || '1.20.1';
  if (fields.instanceLoader) fields.instanceLoader.value = currentSettings.modLoader || 'fabric';
  fields.javaPath.value = currentSettings.javaPath || '';
  fields.skinModel.value = currentSettings.skinModel || 'auto';
  if (fields.appearanceTheme) fields.appearanceTheme.value = currentSettings.appearance?.theme || 'cosmic';
  if (fields.accentColor) fields.accentColor.value = currentSettings.appearance?.accent || 'violet';
  if (fields.reduceMotion) fields.reduceMotion.checked = Boolean(currentSettings.appearance?.reduceMotion);
  versionLabel.textContent = fields.minecraftVersion.value;
  serverInfo.textContent = currentSettings.server.name || 'UNIQUE Server';
  serverLabel.textContent = currentSettings.server.name;
  fields.hideLauncherDuringGame.checked = Boolean(currentSettings.hideLauncherDuringGame);
  if (fields.useUniqueMods) fields.useUniqueMods.checked = currentSettings.useUniqueMods !== false;
  wallpaperName.textContent = currentSettings.wallpaper ? shortPath(currentSettings.wallpaper) : 'обои не выбраны';
  fields.skinName.textContent = currentSettings.skin ? shortPath(currentSettings.skin) : 'не выбран';
  fields.capeName.textContent = currentSettings.cape ? shortPath(currentSettings.cape) : 'не выбран';
  applyAppearance();
  updateLaunchInsights();
  syncAllCustomSelects();
  updateModrinthLoaderLabels();
  refreshUserHeadAvatar();
}

function updateLaunchInsights(serverName = '') {
  if (launchInsights.version) {
    launchInsights.version.textContent = fields.minecraftVersion?.value?.trim() || currentSettings?.minecraftVersion || '1.20.1';
  }
  if (launchInsights.ram) {
    launchInsights.ram.textContent = `${currentSettings?.memory?.max || fields.memoryMax?.value || 4096} MB`;
  }
  if (launchInsights.server) {
    launchInsights.server.textContent = serverName || serverLabel?.textContent || currentSettings?.server?.name || 'UNIQUE';
  }
  if (launchInsights.assets) {
    const parts = [];
    if (currentSettings?.skin) parts.push('HD Skin');
    if (currentSettings?.cape) parts.push(/\.gif$/i.test(currentSettings.cape) ? 'Animated Cape' : 'Cape');
    launchInsights.assets.textContent = parts.length ? parts.join(' + ') : 'Default';
  }
}

function getBuildProfileMemoryMax(profileId) {
  const id = String(profileId || '').trim();
  const profile = buildProfileOptions.find((entry) => entry.id === id)
    || systemInfo?.buildProfiles?.find?.((entry) => entry.id === id);
  const memory = Number(profile?.memoryMaxMb || 0);
  return Number.isFinite(memory) && memory > 0 ? memory : 0;
}

function clampMemoryMax(value) {
  const min = Number(fields.memoryMax.min || 1024);
  const max = Number(fields.memoryMax.max || 16384);
  return Math.max(min, Math.min(max, Number(value) || min));
}

function applyBuildProfileMemory(profileId) {
  const profileMemory = getBuildProfileMemoryMax(profileId);
  if (!profileMemory) return false;

  const nextMemory = clampMemoryMax(profileMemory);
  fields.memoryMax.value = String(nextMemory);
  updateMemoryLabels();

  if (currentSettings) {
    currentSettings.memory = {
      ...(currentSettings.memory || {}),
      min: 1024,
      max: nextMemory
    };
  }

  updateLaunchInsights();
  return true;
}

async function refreshPreviews() {
  await Promise.all([
    setWallpaperPreview(currentSettings.wallpaper),
    setImagePreview(fields.skinPreview, currentSettings.skin),
    setImagePreview(fields.capePreview, currentSettings.cape),
    refreshPlayerPreviewAssets(),
    refreshUserHeadAvatar()
  ]);
}

async function saveSettings(partial = {}) {
  const max = Number(fields.memoryMax.value);
  currentSettings = {
    ...currentSettings,
    ...partial,
    loader: 'Fabric',
    fabricLoaderVersion: fields.fabricLoaderVersion.value.trim() || 'latest',
    memory: {
      min: 1024,
      max
    },
    skinModel: fields.skinModel.value || 'auto',
    minecraftVersion: fields.minecraftVersion.value.trim() || '1.20.1',
    activeInstanceId: fields.activeInstance?.value || currentSettings?.activeInstanceId || '',
    modLoader: getSelectedModLoader(),
    projectId: fields.projectId?.value || currentSettings?.projectId || 'unique',
    buildProfile: fields.buildProfile?.value || currentSettings?.buildProfile || 'normal',
    javaPath: fields.javaPath.value.trim(),
    hideLauncherDuringGame: fields.hideLauncherDuringGame.checked,
    useUniqueMods: fields.useUniqueMods ? fields.useUniqueMods.checked : currentSettings?.useUniqueMods !== false,
    appearance: {
      theme: fields.appearanceTheme?.value || currentSettings?.appearance?.theme || 'cosmic',
      accent: fields.accentColor?.value || currentSettings?.appearance?.accent || 'violet',
      reduceMotion: Boolean(fields.reduceMotion?.checked)
    }
  };

  const result = await window.api.saveSettings({
    nickname: activeUser?.nickname || '',
    settings: currentSettings
  });
  if (result.success) {
    currentSettings = result.settings;
    applySettingsToUi();
  }
}

async function refreshMods() {
  const result = await window.api.listMods({
    nickname: activeUser?.nickname || '',
    minecraftVersion: currentSettings?.minecraftVersion || fields.minecraftVersion?.value || '1.20.1',
    buildProfile: currentSettings?.buildProfile || fields.buildProfile?.value || 'normal'
  });
  if (modsList) modsList.innerHTML = '';
  if (modrinthInstalledMods) modrinthInstalledMods.innerHTML = '';

  if (!result.success) {
    const errorHtml = `<li class="empty-row">Ошибка: ${escapeHtml(result.error)}</li>`;
    if (modsList) modsList.innerHTML = errorHtml;
    if (modrinthInstalledMods) modrinthInstalledMods.innerHTML = errorHtml;
    authModsCount.textContent = '0';
    return;
  }

  authModsCount.textContent = String(result.mods.length);
  if (result.userModsFolder) {
    modsFolder.textContent = 'Служебные моды UNIQUE проверяются автоматически. Здесь отображаются только пользовательские моды.';
  }

  if (result.mods.length === 0) {
    renderInstalledModsList(modsList, []);
    renderInstalledModsList(modrinthInstalledMods, []);
    return;
  }

  renderInstalledModsList(modsList, result.mods);
  renderInstalledModsList(modrinthInstalledMods, result.mods);
}

function formatSpotifyTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function renderBuildProfiles(profiles = []) {
  if (!fields.buildProfile) return;
  const selected = currentSettings?.buildProfile || fields.buildProfile.value || 'normal';
  fields.buildProfile.innerHTML = '';
  const list = profiles.length ? profiles : [
    { id: 'lite', name: 'Lite', description: 'Low resource profile' },
    { id: 'normal', name: 'Normal', description: 'Default profile' },
    { id: 'ultra', name: 'Ultra', description: 'High resource profile' }
  ];
  buildProfileOptions = list.map((profile) => ({
    ...profile,
    memoryMaxMb: Number(profile.memoryMaxMb || 0)
  }));
  for (const profile of buildProfileOptions) {
    const option = document.createElement('option');
    option.value = profile.id;
    option.textContent = profile.memoryMaxMb ? `${profile.name} · ${profile.memoryMaxMb} MB` : profile.name;
    option.title = profile.description || profile.name;
    fields.buildProfile.appendChild(option);
  }
  fields.buildProfile.value = buildProfileOptions.some((profile) => profile.id === selected) ? selected : buildProfileOptions[0].id;
  syncCustomSelect(fields.buildProfile);
  renderBuildCatalog();
  renderServerBuildResults();
}

function renderProjects(projects = []) {
  if (!fields.projectId) return;
  const selected = currentSettings?.projectId || fields.projectId.value || 'unique';
  fields.projectId.innerHTML = '';
  const list = projects.length ? projects : [{ id: 'unique', name: 'UNIQUE Server', description: 'Main project' }];
  for (const project of list) {
    const option = document.createElement('option');
    option.value = project.id;
    option.textContent = project.name;
    option.title = project.description || project.name;
    fields.projectId.appendChild(option);
  }
  fields.projectId.value = list.some((project) => project.id === selected) ? selected : list[0].id;
  syncCustomSelect(fields.projectId);
}

function formatServerAddress(server) {
  const host = String(server?.host || '').trim();
  if (!host) return '';
  const port = Number(server?.port || 25565);
  return `${host}${port === 25565 ? '' : `:${port}`}`;
}

function renderRegisteredServers(servers = []) {
  if (!serverRegistryList) return;
  const liveServers = servers.filter((server) => server?.host);
  registeredServers = liveServers;

  if (!liveServers.length) {
    serverRegistryList.innerHTML = '';
    setStatusCard(serversHealthCard, serverHealthStatus, serverHealthDetail, 'idle', 'ожидание', 'UNIQUE Server');
    renderServerBuildResults();
    return;
  }

  const primary = liveServers[0];
  if (serverInfo) {
    serverInfo.textContent = primary.name || 'UNIQUE Server';
  }
  if (serverLabel) {
    serverLabel.textContent = primary.name || 'UNIQUE Server';
  }
  updateLaunchInsights(primary.name || 'UNIQUE Server');

  serverRegistryList.innerHTML = liveServers.slice(0, 5).map((server, index) => {
    const address = formatServerAddress(server);
    const players = `${Number(server.playerCount || 0)}/${Number(server.maxPlayers || 0)}`;
    const tps = server.tps == null || Number.isNaN(Number(server.tps)) ? '-' : Number(server.tps).toFixed(1);
    const motd = server.motd ? `<em>${escapeHtml(server.motd)}</em>` : '';
    return `
      <div class="server-registry-row ${index === 0 ? 'primary' : ''}">
        <button class="icon-button server-copy" type="button" data-address="${escapeHtml(address)}" aria-label="Скопировать адрес" title="Скопировать адрес">
          <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M5 15H4a1 1 0 0 1-1-1V5a2 2 0 0 1 2-2h9a1 1 0 0 1 1 1v1" /></svg>
        </button>
        <strong>${escapeHtml(server.name || 'UNIQUE Server')}</strong>
        <span>Сервер проекта</span>
        <small>${players} игроков · TPS ${tps}</small>
        ${motd}
      </div>
    `;
  }).join('');
  setStatusCard(
    serversHealthCard,
    serverHealthStatus,
    serverHealthDetail,
    'ok',
    `${liveServers.length} онлайн`,
    primary.name || 'UNIQUE Server'
  );
  renderServerBuildResults();
}

async function refreshRegisteredServers() {
  if (!serverRegistryList || !window.api.getRegisteredServers) return;

  try {
    const result = await window.api.getRegisteredServers({
      nickname: activeUser?.nickname || '',
      projectId: currentSettings?.projectId || fields.projectId?.value || 'unique'
    });

    if (!result?.success) {
      serverRegistryList.innerHTML = '';
      setStatusCard(serversHealthCard, serverHealthStatus, serverHealthDetail, 'idle', 'ожидание', 'UNIQUE Server');
      return;
    }

    renderRegisteredServers(result.servers || []);
  } catch (err) {
    serverRegistryList.innerHTML = '';
    setStatusCard(serversHealthCard, serverHealthStatus, serverHealthDetail, 'idle', 'ожидание', 'UNIQUE Server');
  }
}

function startServerRegistryRefresh() {
  if (serverRegistryRefreshTimer) {
    clearInterval(serverRegistryRefreshTimer);
  }
  serverRegistryRefreshTimer = setInterval(refreshRegisteredServers, SERVER_REGISTRY_REFRESH_INTERVAL_MS);
}

function stopServerRegistryRefresh() {
  if (serverRegistryRefreshTimer) {
    clearInterval(serverRegistryRefreshTimer);
    serverRegistryRefreshTimer = null;
  }
}

async function copyServerAddress(address) {
  if (!address) return;
  await window.api.copyText(address);
  setStatusCard(serversHealthCard, serverHealthStatus, serverHealthDetail, 'ok', 'скопировано', 'адрес сервера');
}

function renderReadiness() {
  if (!readinessGrid) return;
  const checks = [
    { label: 'Java 17+', ok: Boolean(systemInfo?.recommendedJava?.major >= 17), detail: systemInfo?.recommendedJava?.path || 'not found' },
    { label: 'Remote API', ok: Boolean(systemInfo?.remoteAuth), detail: systemInfo?.remoteAuth ? 'configured' : 'local fallback' },
    { label: 'Mod manifest', ok: Boolean(systemInfo?.remoteMods), detail: systemInfo?.remoteMods ? 'remote' : 'fallback' },
    { label: 'Update feed', ok: Boolean(systemInfo?.updateUrlConfigured), detail: systemInfo?.updateUrlConfigured ? 'configured' : 'not configured' }
  ];
  const readyCount = checks.filter((check) => check.ok).length;
  if (readinessStatus) readinessStatus.textContent = `${readyCount}/${checks.length}`;
  readinessGrid.innerHTML = checks.map((check) => `
    <div class="readiness-item ${check.ok ? 'ok' : 'warn'}">
      <strong>${escapeHtml(check.label)}</strong>
      <span>${escapeHtml(check.detail)}</span>
    </div>
  `).join('');
}

function setStatusCard(card, statusElement, detailElement, state, status, detail) {
  if (card) {
    card.dataset.state = state;
  }
  if (statusElement) {
    statusElement.textContent = status;
  }
  if (detailElement) {
    detailElement.textContent = detail;
  }
}

function renderCommandCenter() {
  const java = systemInfo?.recommendedJava;
  setStatusCard(
    javaHealthCard,
    javaHealthStatus,
    javaHealthDetail,
    java?.major >= 17 ? 'ok' : 'warn',
    java?.major ? `Java ${java.major}` : 'не найдена',
    java?.path || 'требуется Java 17+'
  );

  const configuredServers = serverRegistryList?.querySelectorAll('.server-registry-row:not(.warn)').length || 0;
  setStatusCard(
    serversHealthCard,
    serverHealthStatus,
    serverHealthDetail,
    configuredServers > 0 ? 'ok' : 'idle',
    configuredServers > 0 ? `${configuredServers} онлайн` : 'API',
    configuredServers > 0 ? 'серверы в списке Minecraft' : 'ожидание списка'
  );

  if (launcherBuildLabel) {
    launcherBuildLabel.textContent = `UNIQUE ${systemInfo?.appVersion || '1.0.0'}`;
  }
  if (updateHealthStatus && updateHealthStatus.textContent === '1.0') {
    updateHealthStatus.textContent = systemInfo?.updateUrlConfigured ? 'готово' : 'выключено';
  }
  renderInfoPanel();
}

async function refreshApiHealth() {
  if (!window.api.checkApiHealth) return;
  setStatusCard(apiHealthCard, apiHealthStatus, apiHealthDetail, 'idle', 'проверка', 'UNIQUE API');

  const result = await window.api.checkApiHealth();
  if (!result.success || !result.ok) {
    setStatusCard(
      apiHealthCard,
      apiHealthStatus,
      apiHealthDetail,
      'warn',
      'недоступен',
      'соединение недоступно'
    );
    return;
  }

  setStatusCard(
    apiHealthCard,
    apiHealthStatus,
    apiHealthDetail,
    'ok',
    `${Math.round(Number(result.latencyMs || 0))} ms`,
    'UNIQUE API'
  );
}

async function rescanJava() {
  if (!window.api.rescanJava) return;
  setStatusCard(javaHealthCard, javaHealthStatus, javaHealthDetail, 'idle', 'скан', 'поиск Java');

  const result = await window.api.rescanJava();
  if (!result.success) {
    setStatusCard(javaHealthCard, javaHealthStatus, javaHealthDetail, 'warn', 'ошибка', result.error || 'Java scan failed');
    return;
  }

  systemInfo = {
    ...systemInfo,
    recommendedJava: result.recommendedJava,
    javaCandidates: result.candidates || []
  };
  if (!fields.javaPath.value && result.recommendedJava?.path) {
    fields.javaPath.value = result.recommendedJava.path;
    await saveSettings();
  }
  renderReadiness();
  renderCommandCenter();
}

function startApiHealthRefresh() {
  if (apiHealthRefreshTimer) {
    clearInterval(apiHealthRefreshTimer);
  }
  apiHealthRefreshTimer = setInterval(refreshApiHealth, API_HEALTH_REFRESH_INTERVAL_MS);
}

function stopApiHealthRefresh() {
  if (apiHealthRefreshTimer) {
    clearInterval(apiHealthRefreshTimer);
    apiHealthRefreshTimer = null;
  }
}

function renderNews(news = []) {
  if (!newsList) return;
  newsList.innerHTML = '';
  if (!news.length) {
    newsList.innerHTML = '<div class="news-item muted">Новостей пока нет.</div>';
    return;
  }
  for (const item of news.slice(0, 4)) {
    const card = document.createElement(item.url ? 'a' : 'div');
    card.className = 'news-item';
    if (item.url) {
      card.href = item.url;
      card.target = '_blank';
      card.rel = 'noreferrer';
    }
    card.innerHTML = `
      <strong>${escapeHtml(item.title)}</strong>
      <span>${escapeHtml(item.date || '')}</span>
      <p>${escapeHtml(item.body || '')}</p>
    `;
    newsList.appendChild(card);
  }
}

async function refreshLauncherContent() {
  const result = await window.api.getLauncherContent();
  renderBuildProfiles(result.buildProfiles || systemInfo?.buildProfiles || []);
  renderProjects(result.projects || systemInfo?.projects || []);
  renderNews(result.news || systemInfo?.news || []);
}

function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function formatCompactNumber(value) {
  const number = Number(value || 0);
  if (number >= 1000000) return `${(number / 1000000).toFixed(number >= 10000000 ? 0 : 1)}M`;
  if (number >= 1000) return `${(number / 1000).toFixed(number >= 10000 ? 0 : 1)}K`;
  return String(number);
}

function getSelectedMinecraftVersion() {
  return fields.minecraftVersion?.value?.trim() || currentSettings?.minecraftVersion || '1.20.1';
}

function setStatusText(element, text, type = '') {
  if (!element) return;
  element.textContent = text || '';
  element.dataset.type = type;
}

function renderInstalledModsList(target, mods = []) {
  if (!target) return;
  target.innerHTML = '';
  if (!mods.length) {
    target.innerHTML = '<li class="empty-row">Пользовательские моды не добавлены</li>';
    return;
  }

  for (const mod of mods) {
    const item = document.createElement('li');
    item.className = mod.enabled === false ? 'disabled-mod' : '';
    const name = mod.baseName || mod.name;
    item.innerHTML = `
      <div class="mod-row-main">
        <span>${escapeHtml(name)}</span>
        <small>user | ${escapeHtml(mod.sizeMb)} MB${mod.enabled === false ? ' | disabled' : ''}</small>
      </div>
      <div class="mod-row-actions">
        <button class="mod-toggle ${mod.enabled === false ? '' : 'active'}" type="button" data-mod-name="${escapeHtml(mod.name)}" aria-label="Toggle mod">
          <span></span>
        </button>
        <button class="icon-button mod-delete" type="button" data-mod-name="${escapeHtml(mod.name)}" aria-label="Delete mod" title="Delete mod">
          ${SVG_ICONS.trash.replace('button-icon', '')}
        </button>
      </div>
    `;
    target.appendChild(item);
  }
}

function renderModrinthProjects(container, projects = [], type = 'mod') {
  if (!container) return;
  const projectType = normalizeModrinthProjectType(type);
  if (!projects.length) {
    container.innerHTML = '<div class="empty-row">Ничего не найдено.</div>';
    return;
  }

  const installClass = projectType === 'modpack'
    ? 'modrinth-install-pack'
    : projectType === 'mod'
      ? 'modrinth-install-mod'
      : 'modrinth-install-project';
  const installText = type === 'modpack' ? 'Установить сборку' : 'Установить мод';
  container.innerHTML = projects.map((project) => {
    const icon = project.iconUrl
      ? `<img class="modrinth-card-icon" src="${escapeHtml(project.iconUrl)}" alt="" referrerpolicy="no-referrer" />`
      : `<div class="modrinth-card-icon fallback">${escapeHtml(String(project.title || 'M').slice(0, 1).toUpperCase())}</div>`;
    const categories = (project.categories || []).slice(0, 3)
      .map((category) => `<span>${escapeHtml(category)}</span>`)
      .join('');
    return `
      <article class="modrinth-card">
        ${icon}
        <div class="modrinth-card-body">
          <div>
            <strong>${escapeHtml(project.title)}</strong>
            <p>${escapeHtml(project.description)}</p>
          </div>
          <div class="modrinth-card-meta">
            <span>${formatCompactNumber(project.downloads)} downloads</span>
            <span>${escapeHtml(project.latestVersion || getSelectedMinecraftVersion())}</span>
            ${categories}
          </div>
          <button class="tiny-button ${installClass}" type="button" data-project-id="${escapeHtml(project.id)}" data-project-slug="${escapeHtml(project.slug)}" data-project-type="${escapeHtml(projectType)}">
            ${projectType === 'resourcepack' ? 'Install resource pack' : projectType === 'shader' ? 'Install shader' : installText}
          </button>
          <div class="modrinth-card-actions">
            <button class="tiny-button modrinth-show-details" type="button" data-project-id="${escapeHtml(project.id)}" data-project-slug="${escapeHtml(project.slug)}" data-project-type="${escapeHtml(projectType)}">Info</button>
            <button class="tiny-button modrinth-show-versions" type="button" data-project-id="${escapeHtml(project.id)}" data-project-slug="${escapeHtml(project.slug)}" data-project-type="${escapeHtml(projectType)}">Versions</button>
            <button class="tiny-button modrinth-show-dependencies" type="button" data-project-id="${escapeHtml(project.id)}" data-project-slug="${escapeHtml(project.slug)}" data-project-type="${escapeHtml(projectType)}">Deps</button>
          </div>
          <div class="modrinth-card-extra hidden"></div>
        </div>
      </article>
    `;
  }).join('');
}

function setModrinthCardExtra(button, html) {
  const card = button?.closest('.modrinth-card');
  const extra = card?.querySelector('.modrinth-card-extra');
  if (!extra) return;
  extra.classList.remove('hidden');
  extra.innerHTML = html;
}

function getModrinthCardPayload(button) {
  const type = normalizeModrinthProjectType(button?.dataset.projectType || 'mod');
  return {
    projectId: button?.dataset.projectId || button?.dataset.projectSlug || '',
    slug: button?.dataset.projectSlug || '',
    type,
    minecraftVersion: type === 'modpack' ? getSelectedPackVersion() : getSelectedMinecraftVersion(),
    loader: type === 'modpack' ? getSelectedPackLoader() : getSelectedModLoader()
  };
}

async function showModrinthDetails(button) {
  const payload = getModrinthCardPayload(button);
  setModrinthCardExtra(button, '<span class="modrinth-extra-loading">Loading project info...</span>');
  const result = await window.api.getModrinthProject(payload);
  if (!result.success) {
    setModrinthCardExtra(button, `<span class="modrinth-extra-error">${escapeHtml(result.error || 'Project info failed.')}</span>`);
    return;
  }
  const project = result.project || {};
  const links = [
    project.projectUrl ? `<a href="${escapeHtml(project.projectUrl)}">Modrinth</a>` : '',
    project.sourceUrl ? `<a href="${escapeHtml(project.sourceUrl)}">Source</a>` : '',
    project.issuesUrl ? `<a href="${escapeHtml(project.issuesUrl)}">Issues</a>` : '',
    project.wikiUrl ? `<a href="${escapeHtml(project.wikiUrl)}">Wiki</a>` : '',
    project.discordUrl ? `<a href="${escapeHtml(project.discordUrl)}">Discord</a>` : ''
  ].filter(Boolean).join('');
  setModrinthCardExtra(button, `
    <div class="modrinth-extra-grid">
      <span>Downloads: ${formatCompactNumber(project.downloads || 0)}</span>
      <span>Follows: ${formatCompactNumber(project.follows || 0)}</span>
      <span>License: ${escapeHtml(project.license || 'unknown')}</span>
      <span>Client: ${escapeHtml(project.clientSide || 'unknown')}</span>
      <span>Server: ${escapeHtml(project.serverSide || 'unknown')}</span>
    </div>
    <div class="modrinth-extra-links">${links}</div>
  `);
}

async function showModrinthVersions(button) {
  const payload = getModrinthCardPayload(button);
  const installClass = payload.type === 'modpack'
    ? 'modrinth-install-pack'
    : payload.type === 'mod'
      ? 'modrinth-install-mod'
      : 'modrinth-install-project';
  const installText = payload.type === 'modpack'
    ? 'Install pack version'
    : payload.type === 'mod'
      ? 'Install mod version'
      : `Install ${formatModrinthProjectType(payload.type)} version`;
  setModrinthCardExtra(button, '<span class="modrinth-extra-loading">Loading versions...</span>');
  const result = await window.api.getModrinthProjectVersions(payload);
  if (!result.success) {
    setModrinthCardExtra(button, `<span class="modrinth-extra-error">${escapeHtml(result.error || 'Versions failed.')}</span>`);
    return;
  }
  const versions = (result.versions || []).slice(0, 8);
  if (!versions.length) {
    setModrinthCardExtra(button, '<span class="modrinth-extra-loading">No compatible versions found.</span>');
    return;
  }
  setModrinthCardExtra(button, versions.map((version) => `
    <div class="modrinth-version-row">
      <span>
        <strong>${escapeHtml(version.name || version.versionNumber)}</strong>
        <small>${escapeHtml(version.versionNumber || '')} | ${escapeHtml(version.versionType || 'release')} | ${formatCompactNumber(version.downloads || 0)} downloads</small>
      </span>
      <button class="tiny-button ${installClass}" type="button"
        data-project-id="${escapeHtml(payload.projectId)}"
        data-project-slug="${escapeHtml(payload.slug)}"
        data-project-type="${escapeHtml(payload.type)}"
        data-version-id="${escapeHtml(version.id)}">
        ${installText}
      </button>
    </div>
  `).join(''));
}

async function showModrinthDependencies(button) {
  const payload = getModrinthCardPayload(button);
  setModrinthCardExtra(button, '<span class="modrinth-extra-loading">Loading dependency graph...</span>');
  const result = await window.api.getModrinthProjectDependencies(payload);
  if (!result.success) {
    setModrinthCardExtra(button, `<span class="modrinth-extra-error">${escapeHtml(result.error || 'Dependencies failed.')}</span>`);
    return;
  }
  const projects = (result.projects || []).slice(0, 12);
  const versions = result.versions || [];
  if (!projects.length && !versions.length) {
    setModrinthCardExtra(button, '<span class="modrinth-extra-loading">No declared dependencies.</span>');
    return;
  }
  setModrinthCardExtra(button, `
    <div class="modrinth-extra-grid">
      ${projects.map((project) => `<span>${escapeHtml(project.title || project.slug)} (${escapeHtml(project.type || 'project')})</span>`).join('')}
      ${versions.slice(0, 8).map((version) => `<span>${escapeHtml(version.name || version.versionNumber)} (${escapeHtml(version.versionType || 'version')})</span>`).join('')}
    </div>
  `);
}

async function checkModrinthUpdates() {
  if (!window.api.checkModrinthUpdates) return;
  setStatusText(modrinthModStatus, 'Checking Modrinth updates...');
  const result = await window.api.checkModrinthUpdates({
    nickname: activeUser?.nickname || '',
    minecraftVersion: getSelectedMinecraftVersion(),
    loader: getSelectedModLoader()
  });
  if (!result.success) {
    setStatusText(modrinthModStatus, result.error || 'Modrinth update check failed.', 'error');
    return;
  }
  const updates = result.updates || [];
  setStatusText(modrinthModStatus, updates.length ? `Modrinth updates found: ${updates.length}.` : 'Installed Modrinth mods are up to date.', 'success');
}

async function loadModrinthTags() {
  if (modrinthTags || !window.api.getModrinthTags) return modrinthTags;
  const result = await window.api.getModrinthTags();
  if (result.success) {
    modrinthTags = result;
  }
  return modrinthTags;
}

async function searchModrinthMods() {
  const loader = getSelectedModLoader();
  if (loader === 'vanilla') {
    setStatusText(modrinthModStatus, 'Vanilla-сборка не поддерживает установку client mods.', 'error');
    renderModrinthProjects(modrinthModResults, []);
    return;
  }
  setStatusText(modrinthModStatus, 'Ищу моды на Modrinth...');
  const result = await window.api.searchModrinth({
    type: 'mod',
    query: modrinthModSearch?.value || '',
    minecraftVersion: getSelectedMinecraftVersion(),
    loader,
    limit: 16
  });

  if (!result.success) {
    setStatusText(modrinthModStatus, result.error || 'Не удалось выполнить поиск Modrinth.', 'error');
    renderModrinthProjects(modrinthModResults, []);
    return;
  }

  renderModrinthProjects(modrinthModResults, result.projects || [], 'mod');
  setStatusText(modrinthModStatus, `Найдено: ${result.totalHits || result.projects?.length || 0}. Версия: ${getSelectedMinecraftVersion()}.`, 'success');
}

async function searchModrinthPacks() {
  const loader = getSelectedPackLoader();
  if (loader === 'vanilla') {
    setStatusText(modrinthPackStatus, 'Vanilla modpacks on Modrinth do not use a modloader filter. Select Fabric, Forge, NeoForge or Quilt.', 'error');
    renderModrinthProjects(modrinthPackResults, [], 'modpack');
    return;
  }

  setStatusText(modrinthPackStatus, 'Ищу сборки на Modrinth...');
  const result = await window.api.searchModrinth({
    type: 'modpack',
    query: modrinthPackSearch?.value || '',
    minecraftVersion: getSelectedPackVersion(),
    loader,
    limit: 12
  });

  if (!result.success) {
    setStatusText(modrinthPackStatus, result.error || 'Не удалось выполнить поиск сборок Modrinth.', 'error');
    renderModrinthProjects(modrinthPackResults, [], 'modpack');
    return;
  }

  renderModrinthProjects(modrinthPackResults, result.projects || [], 'modpack');
  setStatusText(modrinthPackStatus, `Найдено сборок: ${result.totalHits || result.projects?.length || 0}.`, 'success');
}

async function searchModrinthContent() {
  const type = getSelectedContentType();
  setStatusText(modrinthContentStatus, `Searching Modrinth ${formatModrinthProjectType(type)}...`);
  const result = await window.api.searchModrinth({
    type,
    query: modrinthContentSearch?.value || '',
    minecraftVersion: getSelectedMinecraftVersion(),
    limit: 16
  });

  if (!result.success) {
    setStatusText(modrinthContentStatus, result.error || 'Modrinth content search failed.', 'error');
    renderModrinthProjects(modrinthContentResults, [], type);
    return;
  }

  renderModrinthProjects(modrinthContentResults, result.projects || [], type);
  setStatusText(modrinthContentStatus, `Found: ${result.totalHits || result.projects?.length || 0}.`, 'success');
}

async function importModrinthByRef() {
  if (!window.api.importModrinthProject) return;
  const ref = modrinthImportRef?.value?.trim();
  if (!ref) {
    setStatusText(modrinthImportStatus, 'Enter a Modrinth URL, slug, or project id.', 'error');
    return;
  }

  setStatusText(modrinthImportStatus, 'Importing Modrinth project...');
  const result = await window.api.importModrinthProject({
    nickname: activeUser?.nickname || '',
    ref,
    minecraftVersion: getSelectedMinecraftVersion(),
    loader: getSelectedModLoader()
  });

  if (!result.success) {
    setStatusText(modrinthImportStatus, result.error || 'Modrinth import failed.', 'error');
    return;
  }

  if (result.instance) {
    currentSettings.activeInstanceId = result.instance.id;
    currentSettings.modLoader = result.instance.loader || result.loader || getSelectedModLoader();
    await loadBuildInstances();
    await saveSettings({
      minecraftVersion: result.minecraftVersion || getSelectedMinecraftVersion(),
      activeInstanceId: result.instance.id,
      modLoader: result.loader || currentSettings?.modLoader || 'fabric',
      loaderVersion: result.loaderVersion || currentSettings?.loaderVersion || 'latest',
      fabricLoaderVersion: result.fabricLoaderVersion || fields.fabricLoaderVersion?.value || 'latest',
      forgeVersion: result.forgeVersion || currentSettings?.forgeVersion || 'latest',
      neoforgeVersion: result.neoforgeVersion || currentSettings?.neoforgeVersion || 'latest',
      quiltLoaderVersion: result.quiltLoaderVersion || currentSettings?.quiltLoaderVersion || 'latest'
    });
  }

  await refreshMods();
  setStatusText(
    modrinthImportStatus,
    `Imported ${result.project?.title || result.packName || ref}: ${result.installedCount || 0} files.`,
    'success'
  );
}

async function installModrinthProject(button) {
  if (!button || !window.api.installModrinthProject) return;
  const previousText = button.textContent;
  const type = normalizeModrinthProjectType(button.dataset.projectType || getSelectedContentType());
  button.disabled = true;
  button.textContent = 'Installing...';
  setStatusText(modrinthContentStatus, `Installing ${formatModrinthProjectType(type)}...`);
  const result = await window.api.installModrinthProject({
    nickname: activeUser?.nickname || '',
    projectId: button.dataset.projectId,
    slug: button.dataset.projectSlug,
    type,
    versionId: button.dataset.versionId || '',
    minecraftVersion: getSelectedMinecraftVersion()
  });

  button.disabled = false;
  button.textContent = previousText;

  if (!result.success) {
    setStatusText(modrinthContentStatus, result.error || 'Modrinth install failed.', 'error');
    return;
  }

  setStatusText(
    modrinthContentStatus,
    `${formatModrinthProjectType(type)} installed: ${result.installed?.[0]?.name || result.installedCount || 1}.`,
    'success'
  );
}

async function installModrinthMod(button) {
  if (!button) return;
  const previousText = button.textContent;
  button.disabled = true;
  button.textContent = 'Установка...';
  setStatusText(modrinthModStatus, 'Скачиваю мод и обязательные зависимости...');
  const result = await window.api.installModrinthMod({
    nickname: activeUser?.nickname || '',
    projectId: button.dataset.projectId,
    slug: button.dataset.projectSlug,
    versionId: button.dataset.versionId || '',
    minecraftVersion: getSelectedMinecraftVersion(),
    loader: getSelectedModLoader()
  });

  button.disabled = false;
  button.textContent = previousText;

  if (!result.success) {
    setStatusText(modrinthModStatus, result.error || 'Не удалось установить мод.', 'error');
    return;
  }

  setStatusText(modrinthModStatus, `Установлено файлов: ${result.installedCount || 0}.`, 'success');
  await refreshMods();
}

async function installModrinthPack(button) {
  if (!button) return;
  const previousText = button.textContent;
  button.disabled = true;
  button.textContent = 'Установка...';
  setStatusText(modrinthPackStatus, 'Скачиваю .mrpack и файлы сборки...');
  const result = await window.api.installModrinthModpack({
    nickname: activeUser?.nickname || '',
    projectId: button.dataset.projectId,
    slug: button.dataset.projectSlug,
    versionId: button.dataset.versionId || '',
    minecraftVersion: getSelectedPackVersion(),
    loader: getSelectedPackLoader()
  });

  button.disabled = false;
  button.textContent = previousText;

  if (!result.success) {
    setStatusText(modrinthPackStatus, result.error || 'Не удалось установить сборку.', 'error');
    return;
  }

  if (result.minecraftVersion && fields.minecraftVersion) {
    fields.minecraftVersion.value = result.minecraftVersion;
    versionLabel.textContent = result.minecraftVersion;
    syncCustomSelect(fields.minecraftVersion);
  }
  if (result.fabricLoaderVersion && fields.fabricLoaderVersion && (!fields.fabricLoaderVersion.value || fields.fabricLoaderVersion.value === 'latest')) {
    fields.fabricLoaderVersion.value = result.fabricLoaderVersion;
  }
  if (result.instance) {
    currentSettings.activeInstanceId = result.instance.id;
    currentSettings.modLoader = result.instance.loader || result.loader || getSelectedModLoader();
    await loadBuildInstances();
  }
  await saveSettings({
    minecraftVersion: result.minecraftVersion || getSelectedMinecraftVersion(),
    activeInstanceId: result.instance?.id || currentSettings?.activeInstanceId || '',
    modLoader: result.loader || currentSettings?.modLoader || 'fabric',
    loaderVersion: result.loaderVersion || currentSettings?.loaderVersion || 'latest',
    fabricLoaderVersion: result.fabricLoaderVersion || fields.fabricLoaderVersion?.value || 'latest',
    forgeVersion: result.forgeVersion || currentSettings?.forgeVersion || 'latest',
    neoforgeVersion: result.neoforgeVersion || currentSettings?.neoforgeVersion || 'latest',
    quiltLoaderVersion: result.quiltLoaderVersion || currentSettings?.quiltLoaderVersion || 'latest'
  });
  await refreshMods();
  updateLaunchInsights();
  setStatusText(
    modrinthPackStatus,
    `Сборка установлена: ${result.installedCount || 0} файлов, overrides: ${result.overridesCount || 0}.`,
    'success'
  );
}

async function toggleInstalledMod(button) {
  const name = button?.dataset?.modName;
  if (!name) return;
  const enable = !button.classList.contains('active');
  const result = await window.api.setModEnabled({
    nickname: activeUser?.nickname || '',
    minecraftVersion: getSelectedMinecraftVersion(),
    name,
    enabled: enable
  });
  if (!result.success) {
    setStatusText(modrinthModStatus, result.error || 'Не удалось изменить состояние мода.', 'error');
    return;
  }
  await refreshMods();
}

async function deleteInstalledMod(button) {
  const name = button?.dataset?.modName;
  if (!name) return;
  const row = button.closest('li');
  const result = await window.api.scheduleModDelete({
    nickname: activeUser?.nickname || '',
    minecraftVersion: getSelectedMinecraftVersion(),
    name
  });
  if (!result.success) {
    setStatusText(modrinthModStatus, result.error || 'Не удалось удалить мод.', 'error');
    return;
  }

  row?.classList.add('pending-delete');
  const previousHtml = row?.innerHTML || '';
  if (row) {
    row.innerHTML = `
      <div class="mod-row-main">
        <span>${escapeHtml(result.name || name)}</span>
        <small>Удаление через 5 секунд или при запуске Minecraft.</small>
      </div>
      <button class="tiny-button mod-delete-undo" type="button" data-delete-token="${escapeHtml(result.token)}">Отменить</button>
    `;
  }

  const timer = setTimeout(async () => {
    pendingModDeleteTimers.delete(result.token);
    await refreshMods();
  }, 5300);
  pendingModDeleteTimers.set(result.token, { timer, previousHtml, row });
}

async function undoInstalledModDelete(button) {
  const token = button?.dataset?.deleteToken;
  if (!token) return;
  const pending = pendingModDeleteTimers.get(token);
  if (pending) {
    clearTimeout(pending.timer);
    pendingModDeleteTimers.delete(token);
  }
  await window.api.undoModDelete({ token });
  await refreshMods();
}

function renderSpotifyProgress() {
  if (!spotifyPlayback?.durationMs) {
    spotifyProgress?.classList.add('hidden');
    return;
  }

  const elapsed = spotifyPlayback.playing ? Date.now() - spotifyPlayback.updatedAt : 0;
  const current = Math.min(spotifyPlayback.durationMs, spotifyPlayback.progressMs + elapsed);
  const percent = Math.max(0, Math.min(100, (current / spotifyPlayback.durationMs) * 100));

  spotifyProgress?.classList.remove('hidden');
  if (spotifyProgressBar) spotifyProgressBar.style.width = `${percent}%`;
  if (spotifyCurrentTime) spotifyCurrentTime.textContent = formatSpotifyTime(current);
  if (spotifyDuration) spotifyDuration.textContent = formatSpotifyTime(spotifyPlayback.durationMs);
}

function setSpotifyPlayback(nowPlaying = null) {
  const durationMs = Number(nowPlaying?.durationMs || 0);
  if (!durationMs) {
    spotifyPlayback = null;
    renderSpotifyProgress();
    return;
  }

  spotifyPlayback = {
    playing: Boolean(nowPlaying.playing),
    progressMs: Math.max(0, Number(nowPlaying.progressMs || 0)),
    durationMs,
    updatedAt: Number(nowPlaying.updatedAt || Date.now())
  };
  renderSpotifyProgress();
}

function applyProfileToUi() {
  fields.profileYoutube.value = currentProfile?.youtubeUrl || '';
  fields.profileTwitch.value = currentProfile?.twitchUrl || '';
  if (skinLookupNick && !skinLookupNick.value) {
    skinLookupNick.value = activeUser?.nickname || '';
  }
  profileStatus.textContent = activeUser ? activeUser.nickname : 'UNIQUE';
  if (profileModeLabel) profileModeLabel.textContent = activeUser?.guest ? 'Guest profile' : activeUser?.license ? 'Minecraft license' : 'UNIQUE account';
  updateUserIdentity(activeUser?.nickname || '');
  const spotifyConnected = Boolean(currentProfile?.spotifyConnected);
  spotifyStatus.textContent = spotifyConnected ? 'привязан' : 'не привязан';
  spotifyAccount.textContent = currentProfile?.spotifyDisplayName
    ? `Аккаунт: ${currentProfile.spotifyDisplayName}`
    : 'Музыка появится здесь после привязки.';
  document.getElementById('connect-spotify').classList.toggle('hidden', spotifyConnected);
  document.getElementById('refresh-spotify').classList.toggle('hidden', !spotifyConnected);
  document.getElementById('disconnect-spotify').classList.toggle('hidden', !spotifyConnected);
  if (!spotifyConnected) {
    spotifyNowPlaying.textContent = 'Spotify не привязан.';
    setSpotifyPlayback(null);
  }
}

async function loadProfile() {
  if (!activeUser) return;

  const result = await window.api.getProfile({ nickname: activeUser.nickname });
  if (result.success) {
    currentProfile = result.profile;
    applyProfileToUi();
    await refreshSpotifyNowPlaying();
  }
}

async function saveProfileLinks() {
  if (!activeUser) return;

  setMessage(profileMessage, '');
  const result = await window.api.saveProfileLinks({
    nickname: activeUser.nickname,
    youtubeUrl: fields.profileYoutube.value,
    twitchUrl: fields.profileTwitch.value
  });

  if (!result.success) {
    setMessage(profileMessage, result.error);
    return;
  }

  currentProfile = result.profile;
  applyProfileToUi();
  setMessage(profileMessage, 'Профиль сохранён. Кнопки Discord Activity обновлены.', 'success');
}

async function connectSpotify() {
  if (!activeUser) return;

  spotifyNowPlaying.textContent = 'Открой браузер и разреши доступ Spotify...';
  const result = await window.api.connectSpotify({ nickname: activeUser.nickname });
  if (!result.success) {
    spotifyNowPlaying.textContent = result.error;
    return;
  }

  currentProfile = result.profile;
  applyProfileToUi();
  await refreshSpotifyNowPlaying();
}

async function disconnectSpotify() {
  if (!activeUser) return;

  const result = await window.api.disconnectSpotify({ nickname: activeUser.nickname });
  if (result.success) {
    currentProfile = result.profile;
    applyProfileToUi();
  } else {
    spotifyNowPlaying.textContent = result.error;
  }
}

async function refreshSpotifyNowPlaying() {
  if (!activeUser || !currentProfile?.spotifyConnected) return;
  if (spotifyRefreshInFlight) return;

  spotifyRefreshInFlight = true;
  try {
    const result = await window.api.getSpotifyNowPlaying({ nickname: activeUser.nickname });
    if (!result.success) {
      if (result.code === 'SPOTIFY_RECONNECT_REQUIRED' && result.profile) {
        currentProfile = result.profile;
        applyProfileToUi();
      }
      spotifyNowPlaying.textContent = result.error;
      setSpotifyPlayback(null);
      return;
    }

    spotifyNowPlaying.textContent = result.nowPlaying.text;
    setSpotifyPlayback(result.nowPlaying);
    spotifyStatus.textContent = result.nowPlaying.connected
      ? (result.nowPlaying.playing ? 'слушает' : 'пауза')
      : 'не привязан';
  } finally {
    spotifyRefreshInFlight = false;
  }
}

function startSpotifyRefresh() {
  if (spotifyRefreshTimer) {
    clearInterval(spotifyRefreshTimer);
  }
  if (spotifyProgressTimer) {
    clearInterval(spotifyProgressTimer);
  }

  spotifyRefreshTimer = setInterval(refreshSpotifyNowPlaying, SPOTIFY_REFRESH_INTERVAL_MS);
  spotifyProgressTimer = setInterval(renderSpotifyProgress, 1000);
}

function stopSpotifyRefresh() {
  if (spotifyRefreshTimer) {
    clearInterval(spotifyRefreshTimer);
    spotifyRefreshTimer = null;
  }
  if (spotifyProgressTimer) {
    clearInterval(spotifyProgressTimer);
    spotifyProgressTimer = null;
  }
  setSpotifyPlayback(null);
}

function populateMinecraftVersions() {
  const select = fields.minecraftVersion;
  if (!select) return;

  const selectedVersion = currentSettings?.minecraftVersion || select.value || '1.20.1';
  const versions = Array.isArray(systemInfo?.supportedVersions) ? [...systemInfo.supportedVersions] : [];
  if (!versions.includes(selectedVersion)) {
    versions.unshift(selectedVersion);
  }

  select.textContent = '';
  for (const version of versions) {
    const option = document.createElement('option');
    option.value = version;
    option.textContent = version;
    select.appendChild(option);
  }
  select.value = selectedVersion;
  syncCustomSelect(select);

  if (fields.instanceVersion) {
    fields.instanceVersion.textContent = '';
    for (const version of versions) {
      const option = document.createElement('option');
      option.value = version;
      option.textContent = version;
      fields.instanceVersion.appendChild(option);
    }
    fields.instanceVersion.value = selectedVersion;
    syncCustomSelect(fields.instanceVersion);
  }

  if (fields.packFilterVersion) {
    fields.packFilterVersion.textContent = '';
    for (const version of versions) {
      const option = document.createElement('option');
      option.value = version;
      option.textContent = version;
      fields.packFilterVersion.appendChild(option);
    }
    fields.packFilterVersion.value = versions.includes(selectedVersion) ? selectedVersion : versions[0] || '1.20.1';
    syncCustomSelect(fields.packFilterVersion);
  }
}

async function loadAppState() {
  systemInfo = await window.api.getSystemInfo();
  currentSettings = await window.api.getSettings({ nickname: activeUser?.nickname || '' });
  if (!currentSettings.javaPath && systemInfo.recommendedJava?.path) {
    currentSettings.javaPath = systemInfo.recommendedJava.path;
  }
  modsFolder.textContent = systemInfo.modsFolder;
  systemMemory.textContent = `${systemInfo.totalMemoryMb} МБ RAM | ${systemInfo.refreshRate} Hz`;
  populateMinecraftVersions();
  await loadBuildInstances();
  renderBuildProfiles(systemInfo.buildProfiles || []);
  renderProjects(systemInfo.projects || []);
  renderNews(systemInfo.news || []);
  renderReadiness();
  renderCommandCenter();
  applySettingsToUi();
  modsFolder.textContent = 'Служебные моды UNIQUE скрыты и проверяются по SHA-256 перед запуском.';
  await Promise.all([
    refreshLauncherContent(),
    refreshMods(),
    refreshPreviews(),
    loadProfile(),
    refreshRegisteredServers(),
    refreshApiHealth(),
    loadModrinthTags().catch(() => null)
  ]);
  startSpotifyRefresh();
  startServerRegistryRefresh();
  startApiHealthRefresh();
}

async function enterLauncher(user) {
  activeUser = user;
  updateUserIdentity(activeUser.nickname);
  authScreen.classList.add('hidden');
  launcherScreen.classList.remove('hidden');
  await loadAppState();
}

async function login(event) {
  event.preventDefault();
  setMessage(loginMessage, '');

  const result = await window.api.login({
    nickname: fields.loginNick.value.trim(),
    password: fields.loginPassword.value,
    totpCode: fields.loginTotp.value.trim()
  });

  if (!result.success) {
    setMessage(loginMessage, result.error);
    return;
  }

  await enterLauncher(result.user);
}

async function guestLogin(event) {
  event.preventDefault();
  if (!window.api.guestLogin) return;

  setMessage(guestMessage, '');
  const result = await window.api.guestLogin({
    nickname: fields.guestNick.value.trim()
  });

  if (!result.success) {
    setMessage(guestMessage, result.error || 'Не удалось войти как гость.');
    return;
  }

  await enterLauncher(result.user);
  if (result.skin?.path) {
    await saveSettings({ skin: result.skin.path, useUniqueMods: false });
    await refreshPreviews();
  }
}

async function microsoftLogin() {
  if (!window.api.startMicrosoftLogin || !window.api.completeMicrosoftLogin) {
    setMessage(loginMessage, 'Microsoft login is not available in this build.');
    return;
  }

  microsoftLoginButton.disabled = true;
  setMessage(loginMessage, 'Opening Microsoft login...', 'success');
  const flow = await window.api.startMicrosoftLogin();
  if (!flow.success) {
    microsoftLoginButton.disabled = false;
    setMessage(loginMessage, flow.error || 'Microsoft login failed.');
    return;
  }

  setMessage(loginMessage, 'Завершите вход в открывшемся браузере — лаунчер получит callback автоматически.', 'success');
  const result = await window.api.completeMicrosoftLogin({ flowId: flow.flowId });
  microsoftLoginButton.disabled = false;

  if (!result.success) {
    setMessage(loginMessage, result.error || 'Minecraft license login failed.');
    return;
  }

  await enterLauncher(result.user);
}

async function register(event) {
  event.preventDefault();
  setMessage(registerMessage, '');
  totpHint.textContent = '';

  const result = await window.api.register({
    nickname: fields.registerNick.value.trim(),
    password: fields.registerPassword.value,
    enableTOTP: fields.registerTotp.checked
  });

  if (!result.success) {
    setMessage(registerMessage, result.error);
    return;
  }

  setMessage(registerMessage, 'Аккаунт создан. Теперь можно войти.', 'success');

  if (result.enabledTOTP) {
    totpHint.textContent = result.totpUrl;
  }
}

async function selectSkin() {
  const file = await window.api.chooseFile({ filters: [{ name: 'Minecraft skin PNG', extensions: ['png'] }] });
  if (!file) return;

  await saveSettings({ skin: file.path });
  fields.skinName.textContent = file.name;
  await setImagePreview(fields.skinPreview, file.path);
  await refreshPlayerPreviewAssets();
  await refreshUserHeadAvatar();
}

async function downloadSkinByNickname() {
  const nickname = skinLookupNick?.value?.trim() || activeUser?.nickname || '';
  if (!nickname || !window.api.downloadSkinByNickname) return;

  if (skinLookupStatus) skinLookupStatus.textContent = 'Скачиваю скин...';
  const result = await window.api.downloadSkinByNickname({ nickname });
  if (!result.success) {
    if (skinLookupStatus) skinLookupStatus.textContent = result.error || 'Не удалось скачать скин.';
    return;
  }

  await saveSettings({ skin: result.file.path });
  fields.skinName.textContent = result.file.name;
  if (result.preview) {
    fields.skinPreview.src = result.preview;
    fields.skinPreview.classList.add('visible');
  } else {
    await setImagePreview(fields.skinPreview, result.file.path);
  }
  await refreshPlayerPreviewAssets();
  await refreshUserHeadAvatar();
  if (skinLookupStatus) skinLookupStatus.textContent = `Скин ${nickname} установлен.`;
}

async function selectCape() {
  const file = await window.api.chooseFile({ filters: [{ name: 'Animated cape', extensions: ['png', 'gif'] }] });
  if (!file) return;

  await saveSettings({ cape: file.path });
  fields.capeName.textContent = file.name;
  await setImagePreview(fields.capePreview, file.path);
  await refreshPlayerPreviewAssets();
}

async function selectWallpaper() {
  const file = await window.api.chooseFile({ filters: [{ name: 'Wallpaper', extensions: ['png', 'jpg', 'jpeg'] }] });
  if (!file) return;

  await saveSettings({ wallpaper: file.path });
  wallpaperName.textContent = file.name;
  await setWallpaperPreview(file.path);
}

async function selectJava() {
  const file = await window.api.chooseFile({
    filters: [
      { name: 'Java executable', extensions: ['exe'] },
      { name: 'All files', extensions: ['*'] }
    ]
  });

  if (!file) return;
  fields.javaPath.value = file.path;
  await saveSettings();
}

async function launchMinecraft() {
  if (!activeUser) return;

  if (launchActive) {
    const result = await window.api.stopMinecraft({ sessionToken: activeUser.sessionToken });
    launchStatus.textContent = result.success ? 'Остановка Minecraft...' : result.error;
    return;
  }

  if (!buildInstances.length || !currentSettings?.activeInstanceId) {
    setLauncherSection('library');
    launchStatus.textContent = 'Перед первым запуском создай сборку или установи Modrinth pack.';
    return;
  }

  await window.api.finalizeModDeletes?.();
  await saveSettings();
  setLaunchActive(true);
  launchStatus.textContent = `Подготовка ${formatLoaderName(getSelectedModLoader())}-клиента...`;
  appendLog(`Запуск Minecraft ${formatLoaderName(getSelectedModLoader())}...`);

  const result = await window.api.launchMinecraft({
    user: activeUser,
    memory: currentSettings.memory,
    settings: currentSettings
  });

  if (!result.success) {
    launchStatus.textContent = result.error;
    appendLog(`Ошибка: ${result.error}`);
    if (result.code === 'BUILD_INSTANCE_REQUIRED') {
      setLauncherSection('library');
    }
    if (result.code === 'JAVA_REQUIRED') {
      const install = window.confirm(`${result.error}\n\nУстановить Java 21 сейчас?`);
      if (install) {
        await window.api.installJava();
        launchStatus.textContent = 'Открыта установка Java 21. После установки запусти Minecraft еще раз.';
      }
    }
    setLaunchActive(false);
    return;
  }

  const modsText = result.syncedMods.length > 0
    ? `Синхронизировано модов: ${result.syncedMods.length}.`
    : 'Моды уже актуальны.';
  const wallpaperText = result.wallpaperPack ? ` Обои: ${result.wallpaperPack}.` : '';
  const skinText = result.playerAssetsPack ? ` Скин: ${result.playerAssetsPack}.` : '';
  const loaderText = result.loader?.name
    ? ` ${result.loader.name}${result.loader.loaderVersion && result.loader.loaderVersion !== 'vanilla' ? `: ${result.loader.loaderVersion}` : ''}.`
    : '';
  const javaText = result.java ? ` Java ${result.java.major}.` : '';
  const fpsText = result.maxFps ? ` FPS limit: ${result.maxFps}.` : '';
  launchStatus.textContent = `${modsText}${wallpaperText}${skinText}${loaderText}${javaText}${fpsText}`;
}

function updateMemoryLabels() {
  fields.memoryMaxLabel.textContent = fields.memoryMax.value;
  updateLaunchInsights();
}

function setLaunchActive(active) {
  launchActive = active;
  setButtonIconText(launchButton, active ? 'stop' : 'play', active ? 'Остановить запуск' : 'Играть');
  launchButton.classList.toggle('danger', active);
}

function startSpaceEffect() {
  if (!spaceCanvas) return;

  const ctx = spaceCanvas.getContext('2d');
  const stars = [];
  let width = 0;
  let height = 0;
  let dpr = 1;
  let lastFrameAt = 0;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    spaceCanvas.width = Math.floor(width * dpr);
    spaceCanvas.height = Math.floor(height * dpr);
    spaceCanvas.style.width = `${width}px`;
    spaceCanvas.style.height = `${height}px`;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    stars.length = 0;
    const starCount = Math.max(80, Math.min(150, Math.floor((width * height) / 14000)));
    for (let i = 0; i < starCount; i += 1) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        z: 0.25 + Math.random() * 1.2,
        size: 0.5 + Math.random() * 1.8,
        drift: 0.08 + Math.random() * 0.32,
        glow: 0.25 + Math.random() * 0.75
      });
    }
  }

  function drawNebula(time) {
    const accentRgb = spaceAccentRgb;
    const accent2Rgb = spaceAccent2Rgb;
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, 'rgba(12, 18, 38, 0.9)');
    gradient.addColorStop(0.45, `rgba(${accentRgb}, 0.18)`);
    gradient.addColorStop(1, 'rgba(3, 7, 18, 0.92)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.translate(Math.sin(time / 9000) * 24, Math.cos(time / 11000) * 18);
    for (let i = 0; i < 5; i += 1) {
      const y = (height / 6) * (i + 1);
      const band = ctx.createLinearGradient(0, y - 80, width, y + 80);
      band.addColorStop(0, `rgba(${accentRgb}, 0)`);
      band.addColorStop(0.5, i % 2 ? `rgba(${accentRgb}, 0.16)` : `rgba(${accent2Rgb}, 0.16)`);
      band.addColorStop(1, `rgba(${accentRgb}, 0)`);
      ctx.fillStyle = band;
      ctx.fillRect(0, y - 90, width, 180);
    }
    ctx.restore();
  }

  function tick(time) {
    spaceAnimationFrame = requestAnimationFrame(tick);
    if (document.hidden) {
      return;
    }

    const reduceMotion = document.body.classList.contains('reduce-motion');
    const frameInterval = reduceMotion ? 400 : 33;
    if (time - lastFrameAt < frameInterval) {
      return;
    }
    lastFrameAt = time;

    drawNebula(reduceMotion ? 0 : time);

    for (const star of stars) {
      if (!reduceMotion) {
        star.y += star.drift * star.z;
        star.x += Math.sin((time * 0.0002) + star.y * 0.01) * 0.08;
      }
      if (star.y > height + 8) {
        star.y = -8;
        star.x = Math.random() * width;
      }

      const alpha = 0.28 + Math.sin((reduceMotion ? 0 : time) * 0.002 * star.z + star.x) * 0.16 + star.glow * 0.34;
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.12, Math.min(0.9, alpha))})`;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }
  }

  window.addEventListener('resize', resize);
  resize();
  spaceAnimationFrame = requestAnimationFrame(tick);
}

function resetPlayerPreviewView() {
  playerPreview.yaw = -0.45;
  playerPreview.pitch = 0.12;
  playerPreview.zoom = 1;
  drawPlayerPreview();
}

function rotatePlayerPreview(delta) {
  playerPreview.yaw += delta;
  drawPlayerPreview();
}

function zoomPlayerPreview(delta) {
  playerPreview.zoom = Math.max(0.65, Math.min(1.85, playerPreview.zoom + delta));
  drawPlayerPreview();
}

if (playerPreviewCanvas) {
  playerPreviewCanvas.addEventListener('pointerdown', (event) => {
    playerPreview.dragging = true;
    playerPreview.lastX = event.clientX;
    playerPreview.lastY = event.clientY;
    playerPreviewCanvas.setPointerCapture(event.pointerId);
  });

  playerPreviewCanvas.addEventListener('pointermove', (event) => {
    if (!playerPreview.dragging) return;
    const deltaX = event.clientX - playerPreview.lastX;
    const deltaY = event.clientY - playerPreview.lastY;
    playerPreview.lastX = event.clientX;
    playerPreview.lastY = event.clientY;
    playerPreview.yaw += deltaX * 0.012;
    playerPreview.pitch = Math.max(-0.75, Math.min(0.9, playerPreview.pitch + deltaY * 0.01));
    drawPlayerPreview();
  });

  playerPreviewCanvas.addEventListener('pointerup', (event) => {
    playerPreview.dragging = false;
    if (playerPreviewCanvas.hasPointerCapture(event.pointerId)) {
      playerPreviewCanvas.releasePointerCapture(event.pointerId);
    }
  });

  playerPreviewCanvas.addEventListener('pointerleave', () => {
    playerPreview.dragging = false;
  });

  playerPreviewCanvas.addEventListener('pointercancel', () => {
    playerPreview.dragging = false;
  });

  playerPreviewCanvas.addEventListener('wheel', (event) => {
    event.preventDefault();
    const direction = event.deltaY > 0 ? -1 : 1;
    playerPreview.zoom = Math.max(0.65, Math.min(1.85, playerPreview.zoom + direction * 0.08));
    drawPlayerPreview();
  }, { passive: false });

  drawPlayerPreview();
}

document.getElementById('preview-reset')?.addEventListener('click', resetPlayerPreviewView);
document.getElementById('preview-rotate-left')?.addEventListener('click', () => rotatePlayerPreview(-0.35));
document.getElementById('preview-rotate-right')?.addEventListener('click', () => rotatePlayerPreview(0.35));
document.getElementById('preview-zoom-out')?.addEventListener('click', () => zoomPlayerPreview(-0.12));
document.getElementById('preview-zoom-in')?.addEventListener('click', () => zoomPlayerPreview(0.12));

function renderUpdateStatus(payload = {}) {
  const state = payload.state || 'idle';
  const labels = {
    checking: 'проверка',
    available: 'доступно',
    none: 'актуально',
    downloading: 'загрузка',
    downloaded: 'готово',
    error: 'ошибка'
  };
  if (updateStatus) updateStatus.textContent = labels[state] || state;
  if (updateHealthStatus) updateHealthStatus.textContent = labels[state] || state;
  if (installUpdateButton) installUpdateButton.classList.toggle('hidden', state !== 'downloaded');
  if (!updateMessage) return;

  if (state === 'available') {
    updateMessage.textContent = 'Обновление найдено, начинается загрузка.';
  } else if (state === 'downloading') {
    updateMessage.textContent = `Загрузка обновления: ${Math.round(Number(payload.progress?.percent || 0))}%`;
  } else if (state === 'downloaded') {
    updateMessage.textContent = payload.autoInstallOnQuit
      ? 'Обновление скачано. Оно установится при закрытии лаунчера, либо можно установить сейчас.'
      : 'Обновление скачано. Можно установить и перезапустить лаунчер.';
  } else if (state === 'none') {
    updateMessage.textContent = 'Установлена актуальная версия лаунчера.';
  } else if (state === 'error') {
    updateMessage.textContent = payload.error || 'Не удалось проверить обновление.';
  } else if (state === 'checking') {
    updateMessage.textContent = 'Проверяю доступные релизы...';
  }
}

async function checkUpdates() {
  renderUpdateStatus({ state: 'checking' });
  const result = await window.api.checkForUpdates();
  if (!result.success) {
    renderUpdateStatus({ state: 'error', error: result.error || 'Обновления сейчас недоступны.' });
  }
}

async function exportDiagnostics() {
  if (diagnosticsMessage) diagnosticsMessage.textContent = 'Собираю диагностику...';
  const result = await window.api.exportDiagnostics();
  if (diagnosticsMessage) {
    diagnosticsMessage.textContent = result.success
      ? `ZIP готов: ${result.path}`
      : (result.error || 'Не удалось собрать диагностику.');
  }
}

async function analyzeCrash() {
  if (diagnosticsMessage) diagnosticsMessage.textContent = 'Анализирую последние логи...';
  const result = await window.api.analyzeCrash({ nickname: activeUser?.nickname || '', submit: true });
  if (!diagnosticsMessage) return;
  if (!result.success) {
    diagnosticsMessage.textContent = result.error || 'Не удалось проанализировать краш.';
    return;
  }
  diagnosticsMessage.textContent = (result.findings || [])
    .map((finding) => `${finding.title}: ${finding.detail}`)
    .join(' | ');
}

async function repairGame() {
  if (diagnosticsMessage) diagnosticsMessage.textContent = 'Проверяю и чиню игровые файлы...';
  const result = await window.api.repairGame({ nickname: activeUser?.nickname || '' });
  if (!diagnosticsMessage) return;
  if (!result.success) {
    diagnosticsMessage.textContent = result.error || 'Repair failed.';
    return;
  }
  const repaired = result.repaired || {};
  diagnosticsMessage.textContent = `Готово: assets ${repaired.emptyAssets || 0}, temp mods ${repaired.removedTempMods?.length || 0}, servers.dat обновлён.`;
  await refreshMods();
}

window.addEventListener('focus', refreshSpotifyNowPlaying);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    refreshSpotifyNowPlaying();
  }
});

loginTab.addEventListener('click', () => setAuthMode('login'));
registerTab.addEventListener('click', () => setAuthMode('register'));
guestTab?.addEventListener('click', () => setAuthMode('guest'));
sectionButtons.forEach((button) => {
  button.addEventListener('click', () => setLauncherSection(button.dataset.section));
});
settingsTabs.forEach((button) => {
  button.addEventListener('click', () => setSettingsTab(button.dataset.settingsTab));
});
loginForm.addEventListener('submit', login);
registerForm.addEventListener('submit', register);
guestForm?.addEventListener('submit', guestLogin);
microsoftLoginButton?.addEventListener('click', microsoftLogin);
document.getElementById('window-minimize').addEventListener('click', () => controlWindow('minimize'));
windowMaximizeButton.addEventListener('click', () => controlWindow('maximize'));
document.getElementById('window-close').addEventListener('click', () => controlWindow('close'));
activeUserLabel?.addEventListener('click', () => setLauncherSection('profile'));
activeUserLabel?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    setLauncherSection('profile');
  }
});
document.getElementById('logout-button').addEventListener('click', async () => {
  await window.api.logout({ sessionToken: activeUser?.sessionToken });
  stopSpotifyRefresh();
  stopServerRegistryRefresh();
  stopApiHealthRefresh();
  activeUser = null;
  currentProfile = null;
  updateUserIdentity('');
  launcherScreen.classList.add('hidden');
  authScreen.classList.remove('hidden');
  setAuthMode('login');
});
document.getElementById('refresh-mods').addEventListener('click', refreshMods);
document.getElementById('refresh-mods-panel')?.addEventListener('click', refreshMods);
checkModrinthUpdatesButton?.addEventListener('click', checkModrinthUpdates);
document.getElementById('refresh-content')?.addEventListener('click', async () => {
  await refreshLauncherContent();
  await refreshRegisteredServers();
  await refreshApiHealth();
});
serverRegistryList?.addEventListener('click', (event) => {
  const button = event.target.closest('.server-copy');
  if (!button) return;
  copyServerAddress(button.dataset.address || '');
});
document.getElementById('refresh-api-health')?.addEventListener('click', refreshApiHealth);
document.getElementById('rescan-java')?.addEventListener('click', rescanJava);
document.getElementById('open-build-library')?.addEventListener('click', openBuildLibrary);
document.getElementById('rail-open-library')?.addEventListener('click', openBuildLibrary);
document.getElementById('close-build-library')?.addEventListener('click', closeBuildLibrary);
document.getElementById('build-library-backdrop')?.addEventListener('click', closeBuildLibrary);
document.getElementById('open-profile-card')?.addEventListener('click', () => setLauncherSection('profile'));
refreshInstancesButton?.addEventListener('click', loadBuildInstances);
createInstanceButton?.addEventListener('click', createBuildInstance);
importExistingInstanceButton?.addEventListener('click', importExistingInstance);
importMrpackButton?.addEventListener('click', importMrpack);
instanceList?.addEventListener('click', async (event) => {
  const button = event.target.closest('.instance-select');
  if (!button) return;
  await selectBuildInstance(button.dataset.instanceId);
});
fields.activeInstance?.addEventListener('change', async () => {
  await selectBuildInstance(fields.activeInstance.value);
});
document.getElementById('refresh-server-builds')?.addEventListener('click', async () => {
  await refreshRegisteredServers();
  renderServerBuildResults();
});
serverBuildSearch?.addEventListener('input', renderServerBuildResults);
serverBuildResults?.addEventListener('click', async (event) => {
  const button = event.target.closest('.server-build-select');
  if (!button) return;
  await selectBuildProfile(button.dataset.buildId, true);
});
buildLibraryGrid?.addEventListener('click', async (event) => {
  const button = event.target.closest('.build-download');
  if (!button) return;
  await selectBuildProfile(button.dataset.buildId, true);
});
document.getElementById('open-user-mods').addEventListener('click', () => window.api.openUserModsFolder({
  nickname: activeUser?.nickname || '',
  minecraftVersion: currentSettings?.minecraftVersion || fields.minecraftVersion?.value || '1.20.1'
}));
document.getElementById('open-user-mods-panel')?.addEventListener('click', () => window.api.openUserModsFolder({
  nickname: activeUser?.nickname || '',
  minecraftVersion: currentSettings?.minecraftVersion || fields.minecraftVersion?.value || '1.20.1'
}));
modrinthModSearchButton?.addEventListener('click', searchModrinthMods);
modrinthModSearch?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    searchModrinthMods();
  }
});
modrinthContentSearchButton?.addEventListener('click', searchModrinthContent);
modrinthContentSearch?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    searchModrinthContent();
  }
});
modrinthContentType?.addEventListener('change', () => {
  setStatusText(modrinthContentStatus, `Selected: ${formatModrinthProjectType(getSelectedContentType())}.`);
});
modrinthImportButton?.addEventListener('click', importModrinthByRef);
modrinthImportRef?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    importModrinthByRef();
  }
});
modrinthModResults?.addEventListener('click', async (event) => {
  const detailsButton = event.target.closest('.modrinth-show-details');
  if (detailsButton) {
    await showModrinthDetails(detailsButton);
    return;
  }
  const versionsButton = event.target.closest('.modrinth-show-versions');
  if (versionsButton) {
    await showModrinthVersions(versionsButton);
    return;
  }
  const dependenciesButton = event.target.closest('.modrinth-show-dependencies');
  if (dependenciesButton) {
    await showModrinthDependencies(dependenciesButton);
    return;
  }
  const button = event.target.closest('.modrinth-install-mod');
  if (button) await installModrinthMod(button);
});
modrinthContentResults?.addEventListener('click', async (event) => {
  const detailsButton = event.target.closest('.modrinth-show-details');
  if (detailsButton) {
    await showModrinthDetails(detailsButton);
    return;
  }
  const versionsButton = event.target.closest('.modrinth-show-versions');
  if (versionsButton) {
    await showModrinthVersions(versionsButton);
    return;
  }
  const dependenciesButton = event.target.closest('.modrinth-show-dependencies');
  if (dependenciesButton) {
    await showModrinthDependencies(dependenciesButton);
    return;
  }
  const button = event.target.closest('.modrinth-install-project');
  if (button) await installModrinthProject(button);
});
[modsList, modrinthInstalledMods].filter(Boolean).forEach((list) => {
  list.addEventListener('click', async (event) => {
    const toggle = event.target.closest('.mod-toggle');
    if (toggle) {
      await toggleInstalledMod(toggle);
      return;
    }
    const deleteButton = event.target.closest('.mod-delete');
    if (deleteButton) {
      await deleteInstalledMod(deleteButton);
      return;
    }
    const undoButton = event.target.closest('.mod-delete-undo');
    if (undoButton) {
      await undoInstalledModDelete(undoButton);
    }
  });
});
modrinthPackSearchButton?.addEventListener('click', searchModrinthPacks);
modrinthPackSearch?.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') {
    event.preventDefault();
    searchModrinthPacks();
  }
});
[fields.packFilterVersion, fields.packFilterLoader].filter(Boolean).forEach((input) => {
  input.addEventListener('change', () => {
    updateModrinthLoaderLabels();
    setStatusText(
      modrinthPackStatus,
      `Modrinth pack filter: ${getSelectedPackVersion()} / ${formatLoaderName(getSelectedPackLoader())}.`
    );
  });
});
modrinthPackResults?.addEventListener('click', async (event) => {
  const detailsButton = event.target.closest('.modrinth-show-details');
  if (detailsButton) {
    await showModrinthDetails(detailsButton);
    return;
  }
  const versionsButton = event.target.closest('.modrinth-show-versions');
  if (versionsButton) {
    await showModrinthVersions(versionsButton);
    return;
  }
  const dependenciesButton = event.target.closest('.modrinth-show-dependencies');
  if (dependenciesButton) {
    await showModrinthDependencies(dependenciesButton);
    return;
  }
  const button = event.target.closest('.modrinth-install-pack');
  if (button) await installModrinthPack(button);
});
document.getElementById('select-skin').addEventListener('click', selectSkin);
document.getElementById('select-cape').addEventListener('click', selectCape);
document.getElementById('download-skin-by-nick')?.addEventListener('click', downloadSkinByNickname);
document.getElementById('choose-wallpaper').addEventListener('click', selectWallpaper);
document.getElementById('select-java').addEventListener('click', selectJava);
document.getElementById('save-profile-links').addEventListener('click', saveProfileLinks);
document.getElementById('connect-spotify').addEventListener('click', connectSpotify);
document.getElementById('disconnect-spotify').addEventListener('click', disconnectSpotify);
document.getElementById('refresh-spotify').addEventListener('click', refreshSpotifyNowPlaying);
document.getElementById('check-updates')?.addEventListener('click', checkUpdates);
document.getElementById('install-update')?.addEventListener('click', () => window.api.installUpdate());
document.getElementById('open-logs')?.addEventListener('click', () => window.api.openLogsFolder());
document.getElementById('export-diagnostics')?.addEventListener('click', exportDiagnostics);
document.getElementById('analyze-crash')?.addEventListener('click', analyzeCrash);
document.getElementById('repair-game')?.addEventListener('click', repairGame);
launchButton.addEventListener('click', launchMinecraft);
document.getElementById('clear-log').addEventListener('click', () => { launchLog.textContent = ''; });

fields.memoryMax.addEventListener('input', updateMemoryLabels);
fields.memoryMax.addEventListener('change', () => saveSettings());
fields.hideLauncherDuringGame.addEventListener('change', () => saveSettings());
fields.useUniqueMods?.addEventListener('change', () => saveSettings());
fields.appearanceTheme?.addEventListener('change', () => saveSettings());
fields.accentColor?.addEventListener('change', () => saveSettings());
fields.reduceMotion?.addEventListener('change', () => saveSettings());
fields.skinModel.addEventListener('change', async () => {
  await saveSettings();
  drawPlayerPreview();
});

[fields.minecraftVersion, fields.projectId, fields.buildProfile, fields.fabricLoaderVersion, fields.javaPath].filter(Boolean).forEach((input) => {
  input.addEventListener('change', async () => {
    if (input === fields.minecraftVersion) {
      versionLabel.textContent = fields.minecraftVersion.value.trim() || '1.20.1';
      if (fields.instanceVersion) {
        fields.instanceVersion.value = fields.minecraftVersion.value;
        syncCustomSelect(fields.instanceVersion);
      }
      updateLaunchInsights();
      updateModrinthLoaderLabels();
    }
    if (input === fields.buildProfile) {
      applyBuildProfileMemory(input.value);
    }
    await saveSettings();
    if (input === fields.minecraftVersion || input === fields.projectId || input === fields.buildProfile) {
      await refreshMods();
    }
    if (input === fields.projectId) {
      await refreshRegisteredServers();
    }
  });
});

fields.minecraftVersion.addEventListener('input', () => {
  versionLabel.textContent = fields.minecraftVersion.value.trim() || '1.20.1';
  updateLaunchInsights();
});

window.api.onLaunchProgress((data) => {
  if (data?.name) {
    launchStatus.textContent = `Загрузка: ${data.name}`;
  }
});

window.api.onLaunchLog(appendLog);
window.api.onLaunchDebug((data) => appendLog(`[debug] ${data}`));
window.api.onLaunchError((error) => {
  const text = String(error || '').trim();
  launchStatus.textContent = text || 'Ошибка процесса Minecraft';
  appendLog(`[error] ${text}`);
});
window.api.onLaunchClosed((code) => {
  launchStatus.textContent = `Minecraft завершился с кодом ${code}`;
  appendLog(`Процесс завершён. Код: ${code}`);
  setLaunchActive(false);
});
window.api.onWindowMaximizedState(setWindowMaximizeButton);
window.api.onUpdateStatus(renderUpdateStatus);

['copy', 'cut', 'contextmenu'].forEach((eventName) => {
  document.addEventListener(eventName, (event) => event.preventDefault());
});

async function init() {
  setAuthMode('login');
  prepareLauncherSections();
  setLauncherSection('main');
  setSettingsTab('info');
  installSvgIcons();
  setupCustomSelects();
  await loadTitlebarIcon();
  await updateWindowMaximizeButton();
  await refreshMods();

  const session = await window.api.getCurrentSession();
  if (session.success) {
    await enterLauncher(session.user);
  }
}

init();
startSpaceEffect();
