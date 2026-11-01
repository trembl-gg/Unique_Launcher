const authScreen = document.getElementById('auth-screen');
document.addEventListener('contextmenu', event => {
  if (!event.target.closest?.('#launch-log')) event.preventDefault();
});
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
// news panel removed
const updateStatus = document.getElementById('update-status');
const updateMessage = document.getElementById('update-message');
const installUpdateButton = document.getElementById('install-update');
let launcherUpdateState = { state: 'idle' };
let updateCheckPending = null, updateCheckTimer = null, lastUpdateCheck = 0;
let notifiedReleaseVersion = '', displayedRelease = null;
const diagnosticsMessage = document.getElementById('diagnostics-message');
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
const sectionPanels = Array.from(document.querySelectorAll('[data-section-panel]'));
const settingsTabs = Array.from(document.querySelectorAll('.settings-tab'));
const settingsGroups = Array.from(document.querySelectorAll('[data-settings-group]'));
const buildLibrary = document.getElementById('build-library');
const buildLibraryGrid = document.getElementById('build-library-grid');
const buildLibraryStatus = document.getElementById('build-library-status');
const instanceList = document.getElementById('instance-list');
const instanceRail = document.getElementById('instance-rail');
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
const contentManagerList = document.getElementById('content-manager-list');
const contentManagerTabs = document.getElementById('content-manager-tabs');
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
  profileMemoryMax: document.getElementById('profile-memory-max'),
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
  showSnapshots: document.getElementById('show-snapshots'),
  useUniqueMods: document.getElementById('use-unique-mods'),
  profileYoutube: document.getElementById('profile-youtube'),
  profileTwitch: document.getElementById('profile-twitch'),
  appearanceTheme: document.getElementById('appearance-theme'),
  language: document.getElementById('language-select'),
  accentColor: document.getElementById('accent-color'),
  reduceMotion: document.getElementById('reduce-motion'),
  wallpaperCrop: document.getElementById('wallpaper-crop-picker')
};

let activeUser = null;
let currentSettings = null;
let currentProfile = null;
let systemInfo = null;
let settingsSaveRevision = 0;
let launchActive = false;
let gameRunning = false;
let launchPollTimer = null;
let launchPollBusy = false;
let launchRequestPending = false;
let activeContentType = 'mods';
let spotifyRefreshTimer = null;
let spotifyProgressTimer = null;
let serverRegistryRefreshTimer = null;
let apiHealthRefreshTimer = null;
let spotifyPlayback = null;
let spotifyRefreshInFlight = false;
let spotifyConnectAttempt = null;
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
  copy: '<svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true"><rect x="8" y="8" width="13" height="13" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></svg>',
  search: '<svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></svg>',
  plus: '<svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>',
  world: '<svg class="button-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18z"/></svg>',
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
  setButtonIconText(document.getElementById('modrinth-mod-search-button'), 'search', document.getElementById('modrinth-mod-search-button')?.textContent || 'Search');
  setButtonIconText(document.getElementById('modrinth-pack-search-button'), 'search', document.getElementById('modrinth-pack-search-button')?.textContent || 'Search');
  setButtonIconText(document.getElementById('modrinth-content-search-button'), 'search', document.getElementById('modrinth-content-search-button')?.textContent || 'Search');
  setButtonIconText(document.getElementById('modrinth-import-button'), 'download', document.getElementById('modrinth-import-button')?.textContent || 'Import');
  setButtonIconText(document.getElementById('refresh-instances'), 'refresh', document.getElementById('refresh-instances')?.textContent || 'Обновить');
  setButtonIconText(document.getElementById('create-instance'), 'catalog', document.getElementById('create-instance')?.textContent || 'Создать сборку');
  const logoutButton = document.getElementById('logout-button');
  if (logoutButton) {
    const label = logoutButton.textContent.trim() || 'Выйти';
    logoutButton.innerHTML = SVG_ICONS.logout;
    const text = document.createElement('span');
    text.className = 'logout-label';
    text.textContent = label;
    logoutButton.appendChild(text);
    logoutButton.setAttribute('aria-label', label);
    logoutButton.title = label;
  }
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
  setButtonIconText(document.getElementById('open-launch-logs'), 'folder', 'Папка логов');
  setButtonIconText(document.getElementById('open-logs'), 'folder', document.getElementById('open-logs')?.textContent || 'Открыть логи');
  setButtonIconText(document.getElementById('export-diagnostics'), 'report', document.getElementById('export-diagnostics')?.textContent || 'Собрать ZIP');
  setButtonIconText(document.getElementById('analyze-crash'), 'report', document.getElementById('analyze-crash')?.textContent || 'Анализ краша');
  for (const [id, icon] of [
    ['copy-launch-log', 'copy'], ['home-instance-content', 'catalog'], ['home-instance-files', 'folder'],
    ['home-instance-worlds', 'world'], ['home-instance-logs', 'report'], ['add-account', 'plus'],
    ['import-existing-instance', 'folder'], ['import-mrpack', 'download'], ['pack-import-url-button', 'link'],
    ['choose-game-storage', 'folder'], ['default-game-storage', 'folder'], ['download-skin-by-nick', 'download'],
    ['choose-horizon-client', 'folder'], ['choose-horizon-resources', 'folder']
  ]) {
    const button = document.getElementById(id);
    if (button) setButtonIconText(button, icon, button.textContent.trim());
  }
  for (const [id, icon] of [['update-notification', 'download'], ['install-update', 'download'], ['show-current-release', 'report'], ['release-download', 'download']]) {
    const button = document.getElementById(id);
    if (button) setButtonIconText(button, icon, button.textContent.trim());
  }
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

  state.wrapper.classList.remove('opens-up');
  if (open) {
    requestAnimationFrame(() => {
      const buttonRect = state.button.getBoundingClientRect();
      const menuHeight = Math.min(state.menu.scrollHeight || 0, 230);
      const shouldOpenUp = window.innerHeight - buttonRect.bottom < menuHeight + 12
        && buttonRect.top > menuHeight + 12;
      state.wrapper.classList.toggle('opens-up', shouldOpenUp);
    });
  }

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
  if (['active-instance', 'account-switch'].includes(select.id)) {
    wrapper.setAttribute('data-i18n-ignore', '');
    select.setAttribute('data-i18n-ignore', '');
  }
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

function setAuthMode() {
  loginForm?.classList.add('hidden');
  registerForm?.classList.add('hidden');
  guestForm?.classList.remove('hidden');
  loginTab?.classList.remove('active');
  registerTab?.classList.remove('active');
  guestTab?.classList.add('active');
  if (loginMessage) loginMessage.textContent = '';
  if (registerMessage) registerMessage.textContent = '';
  if (guestMessage) guestMessage.textContent = '';
  if (totpHint) totpHint.textContent = '';
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
  activeUserLabel?.classList.toggle('is-expanded', activeSection === 'profile');
  activeUserLabel?.setAttribute('aria-expanded', activeSection === 'profile' ? 'true' : 'false');

  sectionPanels.forEach((panel) => {
    const isActive = panel.dataset.sectionPanel === activeSection;
    panel.classList.toggle('hidden', !isActive);
    panel.setAttribute('aria-hidden', isActive ? 'false' : 'true');
  });

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
    refreshContentManager();
  }
  if (activeSection === 'library') {
    renderServerBuildResults();
  }
}

function setSettingsTab(tab = 'info') {
  const allowed = new Set(['info', 'game', 'debug', 'experiments']);
  const activeTab = allowed.has(tab) ? tab : 'info';

  settingsTabs.forEach((button) => {
    const active = button.dataset.settingsTab === activeTab;
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', active ? 'true' : 'false');
  });

  settingsGroups.forEach((group) => {
    group.classList.toggle('hidden', group.dataset.settingsGroup !== activeTab);
  });
  document.querySelector('.settings-panel')?.scrollTo(0, 0);
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
  image.alt = '';
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
    image.onerror = null;
    image.src = '../unique.png';
  };
  image.onload = () => image.classList.remove('is-empty');
  image.src = getCravatarUrl(skinName, size);
}

function setAvatarImageSource(image, source, nickname = '') {
  if (!image || !source) return;

  image.alt = '';
  image.decoding = 'async';
  image.referrerPolicy = 'no-referrer';
  image.dataset.fallbackSrc = '';
  image.onerror = () => {
    image.onerror = null;
    image.src = '../unique.png';
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
          <strong>${escapeHtml(server.name || 'Minecraft Launcher')}</strong>
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

const languageStrings = {
  ru: { play: 'Играть', stop: 'Остановить запуск', forceStop: 'Принудительно закрыть', library: 'Каталог сборок', create: 'Создать сборку', choose: 'Выбрать', selected: 'Выбрано', remove: 'Удалить', mods: 'Моды', resourcepack: 'Текстуры', shader: 'Шейдеры', textures: 'Текстуры', shaders: 'Шейдеры', worlds: 'Миры' },
  en: { play: 'Play', stop: 'Stop launch', forceStop: 'Force close', library: 'Instances', create: 'Create instance', choose: 'Select', selected: 'Selected', remove: 'Delete', mods: 'Mods', resourcepack: 'Textures', shader: 'Shaders', textures: 'Textures', shaders: 'Shaders', worlds: 'Worlds' },
  es: { play: 'Jugar', stop: 'Detener inicio', forceStop: 'Forzar cierre', library: 'Instancias', create: 'Crear instancia', choose: 'Seleccionar', selected: 'Seleccionada', remove: 'Eliminar', mods: 'Mods', resourcepack: 'Texturas', shader: 'Shaders', textures: 'Texturas', shaders: 'Shaders', worlds: 'Mundos' }
};

const staticTranslations = {
  'Назад': { en: 'Back', es: 'Atrás' },
  'Каталог сборок': { en: 'Instances', es: 'Instancias' },
  'Мои сборки': { en: 'My instances', es: 'Mis instancias' },
  'Обновить': { en: 'Refresh', es: 'Actualizar' },
  'Название': { en: 'Name', es: 'Nombre' },
  'Версия Minecraft': { en: 'Minecraft version', es: 'Versión de Minecraft' },
  'Создать сборку': { en: 'Create instance', es: 'Crear instancia' },
  'Импорт папки': { en: 'Import folder', es: 'Importar carpeta' },
  'Сборки Modrinth': { en: 'Modrinth instances', es: 'Instancias de Modrinth' },
  'Найти сборки': { en: 'Find instances', es: 'Buscar instancias' },
  'Моды': { en: 'Mods', es: 'Mods' },
  'Установленные моды': { en: 'Installed mods', es: 'Mods instalados' },
  'Открыть папку': { en: 'Open folder', es: 'Abrir carpeta' },
  'Настройки': { en: 'Settings', es: 'Ajustes' },
  'Внешний вид': { en: 'Appearance', es: 'Apariencia' },
  'Язык': { en: 'Language', es: 'Idioma' },
  'Тема': { en: 'Theme', es: 'Tema' },
  'Выбрать': { en: 'Select', es: 'Seleccionar' },
  'Удалить': { en: 'Delete', es: 'Eliminar' },
  'Текстуры': { en: 'Textures', es: 'Texturas' },
  'Шейдеры': { en: 'Shaders', es: 'Shaders' },
  'Миры': { en: 'Worlds', es: 'Mundos' }
};

const localizer = new window.Localizer({ ...staticTranslations, ...window.extraTranslations }, () => document.documentElement.lang || 'ru');
function translateStaticLabels(language) { localizer.refresh(); }
function applyLanguage(language) {
  const copy = languageStrings[language] || languageStrings.ru;
  document.documentElement.lang = language || 'ru';
  translateStaticLabels(language || 'ru');
  const streamerHints = {
    ru: 'Скрывает окно лаунчера от поддерживаемых способов захвата Windows 10 2004+ / Windows 11. Не гарантирует скрытие во всех программах. Проверьте предпросмотр перед трансляцией. Minecraft и внешние окна не скрываются.',
    en: 'Excludes the launcher from supported Windows 10 2004+ / Windows 11 capture methods. Not guaranteed in every recorder. Check your preview before streaming. Minecraft and external windows are not hidden.',
    es: 'Oculta el launcher en los métodos de captura compatibles de Windows 10 2004+ / Windows 11. No se garantiza en todos los grabadores. Comprueba la vista previa. Minecraft y las ventanas externas no se ocultan.'
  };
  document.getElementById('streamer-hint').textContent = streamerHints[language] || streamerHints.ru;
  renderSystemMemory();
  try { localStorage.setItem('unique-language', language); } catch { }
  const libraryButton = document.getElementById('open-build-library');
  if (libraryButton) setButtonIconText(libraryButton, 'catalog', copy.library);
  setLaunchActive(launchActive, gameRunning);
  if (createInstanceButton) createInstanceButton.textContent = copy.create;
  document.querySelectorAll('.instance-select').forEach((button) => {
    button.textContent = button.closest('.instance-card')?.classList.contains('active') ? copy.selected : copy.choose;
  });
  document.querySelectorAll('.instance-delete').forEach((button) => { button.textContent = copy.remove; });
  document.querySelectorAll('.instance-content').forEach((button) => { button.textContent = copy[button.dataset.content] || button.textContent; });
  renderUpdateStatus(launcherUpdateState);
  if (displayedRelease && !document.getElementById('release-panel').hidden) {
    if (displayedRelease.local) void showCurrentRelease();
    else showReleaseNotes(displayedRelease, true);
  }
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

function renderSelectedInstanceHeader() {
  const instance = getActiveBuildInstance();
  const instanceName = document.getElementById('launch-instance-name');
  if (instanceName) instanceName.textContent = instance?.name || 'Выберите сборку';
  if (serverInfo) {
    serverInfo.replaceChildren();
    if (instance) {
      for (const label of [formatLoaderName(instance.loader), `Minecraft ${instance.minecraftVersion}`]) {
        const tag = document.createElement('span');
        tag.className = 'instance-version-tag'; tag.textContent = label;
        serverInfo.appendChild(tag);
      }
    } else serverInfo.textContent = 'Создайте или импортируйте сборку';
  }
}
function renderInstanceRail() {
  renderSelectedInstanceHeader();
  if (!instanceRail) return;

  const activeId = currentSettings?.activeInstanceId || fields.activeInstance?.value || '';
  if (!buildInstances.length) {
    instanceRail.innerHTML = '<span class="instance-rail-empty" title="Создайте или импортируйте сборку">?</span>';
    return;
  }

  instanceRail.innerHTML = buildInstances.map((instance) => {
    const active = instance.id === activeId;
    const label = String(instance.name || 'U').trim().slice(0, 2).toUpperCase();
    const title = `${instance.name} — ${instance.minecraftVersion} ${formatLoaderName(instance.loader)}`;
    return `
      <button class="instance-rail-button ${active ? 'active' : ''}" type="button" data-instance-id="${escapeHtml(instance.id)}" title="${escapeHtml(title)}" aria-label="${escapeHtml(title)}">
        ${instance.icon ? `<img src="${escapeHtml(instance.icon)}" alt="" />` : `<span>${escapeHtml(label)}</span>`}
      </button>
    `;
  }).join('');
}
function renderInstanceList() {
  if (!instanceList) return;

  if (!buildInstances.length) {
    instanceList.innerHTML = '<div class="empty-row instance-empty">Сборок пока нет. Создай локальную сборку или установи Modrinth pack.</div>';
    return;
  }

  const activeId = currentSettings?.activeInstanceId || fields.activeInstance?.value || '';
  const query = document.getElementById('instance-search').value.trim().toLowerCase();
  const sort = document.getElementById('instance-sort').value;
  const visible = buildInstances.filter(instance => `${instance.name} ${instance.minecraftVersion} ${instance.loader}`.toLowerCase().includes(query));
  visible.sort((a, b) => sort === 'newest' ? String(b.createdAt).localeCompare(String(a.createdAt)) : (sort === 'favorite' ? Number(b.favorite) - Number(a.favorite) : 0) || a.name.localeCompare(b.name));
  instanceList.innerHTML = visible.map((instance) => {
    const active = instance.id === activeId;
    const source = instance.source === 'modrinth' ? 'Modrinth' : instance.source === 'server' ? 'Server' : instance.source === 'imported' ? 'Imported' : 'Custom';
    return `
      <article class="instance-card ${active ? 'active' : ''}">
        <button class="instance-icon instance-edit" type="button" data-instance-id="${escapeHtml(instance.id)}" title="Изменить аватарку и название" aria-label="Изменить оформление сборки">${instance.icon ? `<img src="${escapeHtml(instance.icon)}" alt="" loading="lazy" />` : escapeHtml(String(instance.name || 'U').slice(0, 2).toUpperCase())}</button>
        <div>
          <strong>${instance.favorite ? '★ ' : ''}${escapeHtml(instance.name)}</strong>
          <span>${escapeHtml(instance.minecraftVersion)} · ${escapeHtml(formatLoaderName(instance.loader))} · <span>${escapeHtml(source)}</span></span>
        </div>
        <button class="tiny-button instance-select" type="button" data-instance-id="${escapeHtml(instance.id)}">
          ${active ? 'Выбрано' : 'Выбрать'}
        </button>
        <div class="instance-content-actions" aria-label="Управление содержимым сборки">
          <button class="tiny-button instance-edit" type="button" data-instance-id="${escapeHtml(instance.id)}">Настройки сборки</button>
          <button class="tiny-button instance-favorite" type="button" data-instance-id="${escapeHtml(instance.id)}" aria-pressed="${Boolean(instance.favorite)}">${instance.favorite ? '★ В избранном' : '☆ В избранное'}</button>
          <button class="tiny-button instance-content" type="button" data-instance-id="${escapeHtml(instance.id)}" data-content="mods">Моды</button>
          <button class="tiny-button instance-content" type="button" data-instance-id="${escapeHtml(instance.id)}" data-content="resourcepack">Текстуры</button>
          <button class="tiny-button instance-content" type="button" data-instance-id="${escapeHtml(instance.id)}" data-content="shader">Шейдеры</button>
          <button class="tiny-button instance-content" type="button" data-instance-id="${escapeHtml(instance.id)}" data-content="worlds">Миры</button>
        </div>
        <button class="tiny-button instance-delete" type="button" data-instance-id="${escapeHtml(instance.id)}">Удалить</button>
      </article>
    `;
  }).join('') || '<div class="empty-row">По запросу ничего не найдено.</div>';
}

let editingInstanceId = '';
let editingInstanceIcon = '';
let instanceImageRevision = 0;
const instanceEditor = document.getElementById('instance-editor');
function updateInstanceIconPreview() {
  const preview = document.getElementById('instance-editor-preview');
  preview.hidden = !editingInstanceIcon;
  if (editingInstanceIcon) preview.src = editingInstanceIcon;
  else preview.removeAttribute('src');
}
function openInstanceEditor(id) {
  const instance = buildInstances.find(item => item.id === id);
  if (!instance) return;
  instanceImageRevision++;
  editingInstanceId = id;
  editingInstanceIcon = instance.icon || '';
  document.getElementById('instance-editor-name').value = instance.name;
  document.getElementById('instance-jvm-arguments').value = instance.jvmArguments || '';
  document.getElementById('instance-game-arguments').value = instance.gameArguments || '';
  document.getElementById('instance-editor-favorite').checked = Boolean(instance.favorite);
  document.getElementById('instance-icon-file').value = '';
  document.getElementById('instance-editor-error').textContent = '';
  updateInstanceIconPreview();
  instanceEditor.showModal();
}
async function updateInstanceAppearance(instanceId, changes) {
  const result = await window.api.updateBuildInstance({ nickname: activeUser?.nickname || '', instanceId, changes });
  if (!result.success) throw new Error(result.error || 'Не удалось сохранить сборку.');
  buildInstances = result.instances;
  renderActiveInstanceSelect();
  renderInstanceList();
  renderInstanceRail();
}
document.getElementById('instance-search').addEventListener('input', renderInstanceList);
document.getElementById('instance-sort').addEventListener('change', renderInstanceList);
document.getElementById('instance-editor-cancel').addEventListener('click', () => instanceEditor.close());
instanceEditor.addEventListener('close', () => { instanceImageRevision++; });
document.getElementById('instance-icon-reset').addEventListener('click', () => {
  instanceImageRevision++; editingInstanceIcon = ''; updateInstanceIconPreview();
});
document.getElementById('instance-icon-file').addEventListener('change', async event => {
  const file = event.target.files[0];
  if (!file) return;
  const revision = ++instanceImageRevision;
  const errorLabel = document.getElementById('instance-editor-error');
  errorLabel.textContent = '';
  try {
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) throw new Error('Выберите PNG, JPG или WebP до 10 МБ.');
    const bitmap = await createImageBitmap(file, { resizeWidth: 256, resizeQuality: 'high' });
    try {
      if (revision !== instanceImageRevision) return;
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      const size = Math.min(bitmap.width, bitmap.height);
      canvas.getContext('2d').drawImage(bitmap, (bitmap.width - size) / 2, (bitmap.height - size) / 2, size, size, 0, 0, 128, 128);
      editingInstanceIcon = canvas.toDataURL('image/png');
      updateInstanceIconPreview();
    } finally { bitmap.close(); }
  } catch (error) { if (revision === instanceImageRevision) errorLabel.textContent = error.message; }
});
document.getElementById('instance-editor-form').addEventListener('submit', async event => {
  event.preventDefault();
  const button = event.submitter;
  if (button) button.disabled = true;
  try {
    await updateInstanceAppearance(editingInstanceId, {
      name: document.getElementById('instance-editor-name').value,
      jvmArguments: document.getElementById('instance-jvm-arguments').value,
      gameArguments: document.getElementById('instance-game-arguments').value,
      icon: editingInstanceIcon,
      favorite: document.getElementById('instance-editor-favorite').checked
    });
    instanceEditor.close();
  } catch (error) { document.getElementById('instance-editor-error').textContent = error.message; }
  finally { if (button) button.disabled = false; }
});

const pendingPackIcons = new Set();
function copyPackIcon(instance) {
  if (instance.icon || !instance.iconSource || pendingPackIcons.has(instance.id)) return;
  pendingPackIcons.add(instance.id);
  const user = activeUser;
  const image = new Image();
  image.crossOrigin = 'anonymous';
  const timer = setTimeout(() => { image.onload = image.onerror = null; image.src = ''; }, 10000);
  image.onerror = () => clearTimeout(timer);
  image.onload = async () => {
    clearTimeout(timer);
    if (activeUser?.sessionToken !== user?.sessionToken) return;
    try {
      const canvas = document.createElement('canvas');
      canvas.width = canvas.height = 128;
      canvas.getContext('2d').drawImage(image, 0, 0, 128, 128);
      const result = await window.api.updateBuildInstance({ nickname: user.nickname, instanceId: instance.id, changes: { icon: canvas.toDataURL('image/png') } });
      if (result.success && activeUser?.sessionToken === user.sessionToken) {
        buildInstances = result.instances;
        renderInstanceList(); renderInstanceRail();
      }
    } catch { /* Keep initials if the CDN does not allow reading the image. */ }
  };
  image.src = instance.iconSource;
}
async function loadBuildInstances() {
  if (!window.api.listBuildInstances) return;
  const result = await window.api.listBuildInstances({ nickname: activeUser?.nickname || '' });
  if (!result.success) {
    buildInstances = [];
    renderActiveInstanceSelect();
    renderInstanceList();
  renderInstanceRail();
    return;
  }

  buildInstances = result.instances || [];
  buildInstances.forEach(copyPackIcon);
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
  renderInstanceRail();
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
  renderInstanceRail();
  await refreshMods();
  if (buildLibraryStatus) buildLibraryStatus.textContent = `Выбрана сборка ${result.instance?.name || ''}.`;
}

async function openInstanceContent(instanceId, contentType) {
  if (launchActive) { if (buildLibraryStatus) buildLibraryStatus.textContent = 'Сначала закройте Minecraft.'; return; }
  await selectBuildInstance(instanceId);
  activeContentType = contentType;
  setLauncherSection('mods');
  await refreshContentManager();
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
  renderInstanceRail();
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
  renderInstanceRail();
  await refreshMods();
  if (buildLibraryStatus) buildLibraryStatus.textContent = `Imported ${result.instance?.name || folder.name}.`;
}

async function importMrpack() {
  if (launchActive) { buildLibraryStatus.textContent = 'Сначала закройте Minecraft.'; return; }
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
  renderInstanceRail();
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

const launchLogEntries = [];
const visibleLogLevels = new Set(['info', 'warn', 'error']);
function renderLaunchLog() {
  const follow = launchLog.scrollTop + launchLog.clientHeight >= launchLog.scrollHeight - 32;
  const fragment = document.createDocumentFragment();
  for (const entry of launchLogEntries) {
    if (!visibleLogLevels.has(entry.level)) continue;
    const row = document.createElement('span');
    row.className = `launch-log-entry log-${entry.level}`;
    row.textContent = `[${entry.level.toUpperCase()}] ${entry.message}\n`;
    fragment.appendChild(row);
  }
  launchLog.replaceChildren(fragment);
  if (follow) launchLog.scrollTop = launchLog.scrollHeight;
}
function appendLog(value, fallbackLevel = 'info') {
  const text = String(value?.message ?? value ?? '').trim();
  if (!text || text.startsWith('[lifecycle]')) return;
  const explicitLevel = ['info', 'warn', 'error', 'debug'].includes(value?.level) ? value.level : null;
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim() || line.trimStart().startsWith('[lifecycle]')) continue;
    const level = explicitLevel || (/\b(error|fatal|severe)\b|ошибк|ошибка|аварийн/i.test(line) ? 'error' : /\bwarn(?:ing)?\b|предупрежден/i.test(line) ? 'warn' : /\bdebug\b/i.test(line) ? 'debug' : fallbackLevel);
    launchLogEntries.push({ level, message: localizer.value(line.replace(/^\[(?:debug|error|warn|info)\]\s*/i, ''), {}, 'text').slice(0, 8192) });
  }
  launchLogEntries.splice(0, Math.max(0, launchLogEntries.length - 400));
  renderLaunchLog();
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
    const position = currentSettings?.wallpaperPosition || { x: 50, y: 50 };
    wallpaperPreview.style.setProperty('--wallpaper-position', `${position.x ?? 50}% ${position.y ?? 50}%`);
    wallpaperPreview.style.setProperty('--wallpaper', `url("${result.preview}")`);
    if (fields.wallpaperCrop) { fields.wallpaperCrop.style.setProperty('--wallpaper', `url("${result.preview}")`); fields.wallpaperCrop.style.setProperty('--wallpaper-position', `${position.x ?? 50}% ${position.y ?? 50}%`); }
    wallpaperPreview.classList.add('has-wallpaper');
  }
}

function getAppearanceFromFields() {
  return {
    theme: fields.appearanceTheme?.value || currentSettings?.appearance?.theme || 'cosmic',
    accent: fields.accentColor?.value || currentSettings?.appearance?.accent || 'violet',
    reduceMotion: Boolean(fields.reduceMotion?.checked)
  };
}

function applyAppearance(appearanceOverride = null) {
  const appearance = appearanceOverride || currentSettings?.appearance || {};
  const theme = ['cosmic', 'light', 'deep', 'contrast'].includes(appearance.theme) ? appearance.theme : 'cosmic';
  const accent = String(appearance.accent || '').trim() || '';
  const reduceMotion = Boolean(appearance.reduceMotion);
  const accentText = (() => {
    const hex = accent.replace('#', '');
    if (!/^[0-9a-f]{6}$/i.test(hex)) return '#ffffff';
    const [r, g, b] = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
    return ((r * 299) + (g * 587) + (b * 114)) / 1000 > 150 ? '#111111' : '#ffffff';
  })();
  document.body.style.setProperty('--accent-text', accentText);

  document.body.dataset.theme = theme;
  // If accent is a named token, use dataset; otherwise clear dataset and apply RGB vars
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(accent)) {
    document.body.dataset.accent = '';
    const hex = accent.replace('#', '');
    const r = parseInt(hex.length === 3 ? hex[0] + hex[0] : hex.slice(0, 2), 16);
    const g = parseInt(hex.length === 3 ? hex[1] + hex[1] : hex.slice(2, 4), 16);
    const b = parseInt(hex.length === 3 ? hex[2] + hex[2] : hex.slice(4, 6), 16);
    const accentRgb = `${r}, ${g}, ${b}`;
    const lighten = (v) => Math.min(255, Math.round(v + (255 - v) * 0.28));
    const darken = (v) => Math.max(0, Math.round(v * 0.78));
    const rL = lighten(r), gL = lighten(g), bL = lighten(b);
    const rD = darken(r), gD = darken(g), bD = darken(b);
    document.body.style.setProperty('--accent', `#${hex}`);
    document.body.style.setProperty('--accent-light', `rgb(${rL}, ${gL}, ${bL})`);
    document.body.style.setProperty('--accent-dark', `rgb(${rD}, ${gD}, ${bD})`);
    document.body.style.setProperty('--accent-rgb', accentRgb);
    document.body.style.setProperty('--accent-2-rgb', `${rL}, ${gL}, ${bL}`);
    document.body.style.setProperty('--accent-glow', `rgba(${accentRgb}, 0.22)`);
    document.body.style.setProperty('--accent-glow-s', `rgba(${accentRgb}, 0.36)`);
  } else {
    document.body.dataset.accent = accent || 'violet';
  }
  document.body.classList.toggle('reduce-motion', reduceMotion);
  const styles = getComputedStyle(document.body);
  spaceAccentRgb = styles.getPropertyValue('--accent-rgb').trim() || spaceAccentRgb;
  spaceAccent2Rgb = styles.getPropertyValue('--accent-2-rgb').trim() || spaceAccent2Rgb;
}

function applySettingsToUi() {
  populateMinecraftVersions();
  document.getElementById('horizon-executable').value = currentSettings.horizonExecutable || '';
  document.getElementById('horizon-resources').value = currentSettings.horizonResources || '';
  applyMemoryLimit();
  const memory = currentSettings.memory;
  fields.memoryMax.value = memory.max;
  fields.memoryMaxLabel.textContent = memory.max;
  if (fields.profileMemoryMax) fields.profileMemoryMax.value = getBuildProfileMemoryMax(currentSettings.buildProfile) || memory.max;
  fields.minecraftVersion.value = currentSettings.minecraftVersion || '1.20.1';
  if (fields.buildProfile) {
    fields.buildProfile.value = currentSettings.buildProfile || 'normal';
  }
  if (fields.projectId) {
    fields.projectId.value = currentSettings.projectId || 'unique';
  }
  fields.fabricLoaderVersion.value = currentSettings.fabricLoaderVersion || 'latest';
  if (fields.activeInstance) fields.activeInstance.value = currentSettings.activeInstanceId || '';
  if (fields.instanceVersion && [...fields.instanceVersion.options].some(option => option.value === currentSettings.minecraftVersion)) fields.instanceVersion.value = currentSettings.minecraftVersion;
  if (fields.instanceLoader) fields.instanceLoader.value = currentSettings.modLoader || 'fabric';
  fields.javaPath.value = currentSettings.javaPath || '';
  if (fields.showSnapshots) fields.showSnapshots.checked = currentSettings.showSnapshots === true;
  fields.skinModel.value = currentSettings.skinModel || 'auto';
  if (fields.appearanceTheme) fields.appearanceTheme.value = currentSettings.appearance?.theme || 'cosmic';
  if (fields.language) fields.language.value = currentSettings.language || 'ru';
  applyLanguage(currentSettings.language || 'ru');
  if (fields.accentColor) {
    const acc = String(currentSettings.appearance?.accent || '');
    if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(acc)) {
      fields.accentColor.value = acc;
    } else {
      const map = { violet: '#8b5cf6', cyan: '#06b6d4', emerald: '#10b981', rose: '#f43f5e' };
      fields.accentColor.value = map[acc] || '#8b5cf6';
    }
  }
  if (fields.reduceMotion) fields.reduceMotion.checked = Boolean(currentSettings.appearance?.reduceMotion);
  versionLabel.textContent = fields.minecraftVersion.value;
  serverLabel.textContent = currentSettings.server.name;
  fields.hideLauncherDuringGame.checked = Boolean(currentSettings.hideLauncherDuringGame);
  if (fields.useUniqueMods) fields.useUniqueMods.checked = currentSettings.useUniqueMods !== false;
  wallpaperName.textContent = currentSettings.wallpaper ? shortPath(currentSettings.wallpaper) : 'обои не выбраны';
  const wallpaperPosition = currentSettings.wallpaperPosition || { x: 50, y: 50 };
  if (fields.wallpaperCrop) fields.wallpaperCrop.style.setProperty('--wallpaper-position', `${wallpaperPosition.x ?? 50}% ${wallpaperPosition.y ?? 50}%`);
  document.getElementById('wallpaper-crop-controls')?.classList.toggle('hidden', !currentSettings.wallpaper);
  fields.skinName.textContent = currentSettings.skin ? shortPath(currentSettings.skin) : 'не выбран';
  fields.capeName.textContent = currentSettings.cape ? shortPath(currentSettings.cape) : 'не выбран';
  applyAppearance();
  document.getElementById('spotify-theme').checked = Boolean(currentSettings.experiments?.spotifyTheme);
  document.getElementById('rust-minecraft').checked = Boolean(currentSettings.experiments?.rustMinecraft);
  syncHorizonControls();
  document.getElementById('music-visualizer').checked = Boolean(currentSettings.experiments?.visualizer);
  document.getElementById('streamer-mode').checked = Boolean(currentSettings.experiments?.streamerMode);
  applyStreamerMode(Boolean(currentSettings.experiments?.streamerMode));
  experiments.configure(currentSettings.experiments);
  updateLaunchInsights();
  syncAllCustomSelects();
  updateModrinthLoaderLabels();
  refreshUserHeadAvatar();
}

function updateLaunchInsights(serverName = '') {
  renderSelectedInstanceHeader();
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
  const custom = Number(currentSettings?.memoryProfiles?.[id] || 0);
  if (custom > 0) return custom;
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
  const revision = ++settingsSaveRevision;
  const max = Number(fields.memoryMax.value);
  currentSettings = {
    ...currentSettings,
    ...partial,
    loader: 'Fabric',
    fabricLoaderVersion: partial.fabricLoaderVersion || fields.fabricLoaderVersion.value.trim() || 'latest',
    memory: {
      min: 1024,
      max
    },
    skinModel: fields.skinModel.value || 'auto',
    minecraftVersion: partial.minecraftVersion || fields.minecraftVersion.value.trim() || '1.20.1',
    activeInstanceId: fields.activeInstance?.value || currentSettings?.activeInstanceId || '',
    modLoader: getSelectedModLoader(),
    projectId: fields.projectId?.value || currentSettings?.projectId || 'unique',
    buildProfile: fields.buildProfile?.value || currentSettings?.buildProfile || 'normal',
    javaPath: fields.javaPath.value.trim(),
    hideLauncherDuringGame: fields.hideLauncherDuringGame.checked,
    showSnapshots: fields.showSnapshots?.checked === true,
    useUniqueMods: fields.useUniqueMods ? fields.useUniqueMods.checked : currentSettings?.useUniqueMods !== false,
    language: fields.language?.value || currentSettings?.language || 'ru',
    appearance: getAppearanceFromFields(),
    experiments: {
      rustMinecraft: document.getElementById('rust-minecraft').checked,
      spotifyTheme: document.getElementById('spotify-theme').checked,
      visualizer: document.getElementById('music-visualizer').checked,
      streamerMode: document.getElementById('streamer-mode').checked
    }
  };

  const result = await window.api.saveSettings({
    nickname: activeUser?.nickname || '',
    settings: currentSettings
  });
  if (result.success && revision === settingsSaveRevision) {
    currentSettings = result.settings;
    applySettingsToUi();
  }
}

let contentRefreshRevision = 0;
async function refreshContentManager() {
  const revision = ++contentRefreshRevision;
  if (!contentManagerList) return;
  const contentLabels = { mods: 'Моды', resourcepack: 'Текстуры', shader: 'Шейдеры', worlds: 'Миры' };
  const contentLabel = contentLabels[activeContentType] || 'Содержимое';
  const heading = document.querySelector('[data-section-panel="mods"] .view-header h2');
  const searchHeading = document.querySelector('[data-section-panel="mods"] .section-head.compact h3');
  if (heading) heading.textContent = contentLabel;
  if (searchHeading) searchHeading.textContent = contentLabel + ' · Modrinth';
  if (modrinthModSearch) modrinthModSearch.placeholder = activeContentType === 'mods' ? 'Sodium, Iris, JourneyMap...' : contentLabel;
  if (checkModrinthUpdatesButton) checkModrinthUpdatesButton.classList.toggle('hidden', activeContentType !== 'mods');
  const title = document.querySelector('.installed-mods-panel h3');
  if (title) title.textContent = ({ mods: 'Моды сборки', resourcepack: 'Текстуры сборки', shader: 'Шейдеры сборки', worlds: 'Миры сборки' })[activeContentType] || 'Содержимое сборки';
  contentManagerTabs?.querySelectorAll('[data-content-tab]').forEach((button) => { const active = button.dataset.contentTab === activeContentType; button.classList.toggle('active', active); button.setAttribute('aria-pressed', String(active)); });
  if (activeContentType === 'mods') { contentManagerList.classList.add('hidden'); if (modrinthInstalledMods) modrinthInstalledMods.classList.remove('hidden'); await refreshMods(); return; }
  if (modrinthInstalledMods) modrinthInstalledMods.classList.add('hidden'); contentManagerList.classList.remove('hidden');
  const instanceId = currentSettings?.activeInstanceId;
  const result = await window.api.listGameContent({ type: activeContentType, instanceId, nickname: activeUser?.nickname });
  if (revision !== contentRefreshRevision || instanceId !== currentSettings?.activeInstanceId) return;
  contentManagerList.innerHTML = result.success && result.items.length ? result.items.map((item) => `<li class="mod-row"><div><strong>${escapeHtml(item.baseName)}</strong><small>${item.sizeMb} MB${item.enabled ? '' : ' · disabled'}</small></div><div class="mod-row-actions"><button class="mod-toggle ${item.enabled ? 'active' : ''}" type="button" data-content-name="${escapeHtml(item.name)}"><span></span></button><button class="icon-button content-delete" type="button" data-content-name="${escapeHtml(item.name)}" title="Delete">${SVG_ICONS.trash.replace('button-icon', '')}</button></div></li>`).join('') : `<li class="empty-row">${escapeHtml(result.error || 'Пока ничего не установлено.')}</li>`;
  contentManagerTabs?.querySelectorAll('[data-content-tab]').forEach((button) => button.classList.toggle('active', button.dataset.contentTab === activeContentType));

}
let modsRefreshRevision = 0;
async function refreshMods() {
  const revision = ++modsRefreshRevision;
  const instanceId = currentSettings?.activeInstanceId;
  const result = await window.api.listMods({
    instanceId,
    nickname: activeUser?.nickname || '',
    minecraftVersion: currentSettings?.minecraftVersion || fields.minecraftVersion?.value || '1.20.1',
    buildProfile: currentSettings?.buildProfile || fields.buildProfile?.value || 'normal'
  });
  if (revision !== modsRefreshRevision || instanceId !== currentSettings?.activeInstanceId) return;
  if (modsList) modsList.innerHTML = '';
  if (modrinthInstalledMods) modrinthInstalledMods.innerHTML = '';

  if (!result.success) {
    const errorHtml = `<li class="empty-row">Ошибка: ${escapeHtml(result.error)}</li>`;
    if (modsList) modsList.innerHTML = errorHtml;
    if (modrinthInstalledMods) modrinthInstalledMods.innerHTML = errorHtml;
    if (authModsCount) authModsCount.textContent = '0';
    return;
  }

  if (authModsCount) authModsCount.textContent = String(result.mods.length);
  if (result.userModsFolder) {
    modsFolder.textContent = 'Моды выбранной сборки';
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
  const list = projects.length ? projects : [{ id: 'unique', name: 'Minecraft Launcher', description: 'Main project' }];
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
    setStatusCard(serversHealthCard, serverHealthStatus, serverHealthDetail, 'idle', 'ожидание', 'Minecraft Launcher');
    renderServerBuildResults();
    return;
  }

  const primary = liveServers[0];
  renderSelectedInstanceHeader();
  if (serverLabel) {
    serverLabel.textContent = primary.name || 'Minecraft Launcher';
  }
  updateLaunchInsights(primary.name || 'Minecraft Launcher');

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
        <strong>${escapeHtml(server.name || 'Minecraft Launcher')}</strong>
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
    primary.name || 'Minecraft Launcher'
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
      setStatusCard(serversHealthCard, serverHealthStatus, serverHealthDetail, 'idle', 'ожидание', 'Minecraft Launcher');
      return;
    }

    renderRegisteredServers(result.servers || []);
  } catch (err) {
    serverRegistryList.innerHTML = '';
    setStatusCard(serversHealthCard, serverHealthStatus, serverHealthDetail, 'idle', 'ожидание', 'Minecraft Launcher');
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
  return; // The UNIQUE API service has been removed.
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
  renderCommandCenter();
}

function startApiHealthRefresh() {
  return;
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

// renderNews removed (news panel removed)

async function refreshLauncherContent() {
  const result = await window.api.getLauncherContent();
  renderBuildProfiles(result.buildProfiles || systemInfo?.buildProfiles || []);
  renderProjects(result.projects || systemInfo?.projects || []);
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
    const name = mod.displayName || (mod.baseName || mod.name).replace(/\.jar$/i, '');
    item.innerHTML = `
      <div class="mod-row-main">
        ${mod.iconUrl ? `<img class="mod-artwork" src="${escapeHtml(mod.iconUrl)}" alt="" loading="lazy" />` : '<span class="mod-artwork mod-artwork-fallback">◇</span>'}
        <span>${escapeHtml(name)}</span>
        <small>${escapeHtml(mod.sizeMb)} MB <span>${mod.enabled === false ? 'disabled' : ''}</span></small>
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
  const installText = ({ modpack: 'Установить сборку', mod: 'Установить мод', resourcepack: 'Установить текстуры', shader: 'Установить шейдер' })[projectType] || 'Установить';
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

let modrinthSearchRevision = 0;
async function searchModrinthMods() {
  const revision = ++modrinthSearchRevision;
  const contentType = activeContentType;
  const instanceId = currentSettings?.activeInstanceId;
  const loader = getSelectedModLoader();
  if (contentType === 'worlds') {
    setStatusText(modrinthModStatus, 'Каталог миров пока не подключён.');
    return;
  }
  if (loader === 'vanilla' && contentType === 'mods') {
    setStatusText(modrinthModStatus, 'Vanilla-сборка не поддерживает установку client mods.', 'error');
    renderModrinthProjects(modrinthModResults, []);
    return;
  }
  setStatusText(modrinthModStatus, contentType === 'mods' ? 'Ищу моды на Modrinth...' : contentType === 'shader' ? 'Ищу шейдеры на Modrinth...' : 'Ищу текстур-паки на Modrinth...');
  let result;
  try { result = await window.api.searchModrinth({
    type: contentType === 'mods' ? 'mod' : contentType,
    query: modrinthModSearch?.value || '',
    minecraftVersion: getSelectedMinecraftVersion(),
    loader,
    limit: 16
  }); } catch (error) { result = { success: false, error: error.message }; }
  if (revision !== modrinthSearchRevision || contentType !== activeContentType || instanceId !== currentSettings?.activeInstanceId) return;

  if (!result.success) {
    setStatusText(modrinthModStatus, result.error || 'Не удалось выполнить поиск Modrinth.', 'error');
    renderModrinthProjects(modrinthModResults, []);
    return;
  }

  renderModrinthProjects(modrinthModResults, result.projects || [], contentType === 'mods' ? 'mod' : contentType);
  setStatusText(modrinthModStatus, `Найдено: ${result.totalHits || result.projects?.length || 0}. Версия: ${getSelectedMinecraftVersion()}.`, 'success');
}

async function searchModrinthPacks() {
  const loader = getSelectedPackLoader();

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

async function importModrinthByRef(inputRef = '') {
  if (launchActive) { buildLibraryStatus.textContent = 'Сначала закройте Minecraft.'; return; }
  if (!window.api.importModrinthProject) return;
  const ref = typeof inputRef === 'string' && inputRef.trim() ? inputRef.trim() : modrinthImportRef?.value?.trim();
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
    buildLibraryStatus.textContent = result.error || 'Не удалось импортировать сборку.';
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
  buildLibraryStatus.textContent = `Импортирована сборка ${result.packName || result.project?.title || ref}.`;
}

async function installModrinthProject(button) {
  if (!button || !window.api.installModrinthProject) return;
  const previousText = button.textContent;
  const status = button.closest('#modrinth-mod-results') ? modrinthModStatus : modrinthContentStatus;
  const type = normalizeModrinthProjectType(button.dataset.projectType || getSelectedContentType());
  button.disabled = true;
  button.textContent = 'Installing...';
  setStatusText(status, `Installing ${formatModrinthProjectType(type)}...`);
  let result;
  try { result = await window.api.installModrinthProject({
    nickname: activeUser?.nickname || '',
    instanceId: currentSettings?.activeInstanceId,
    projectId: button.dataset.projectId,
    slug: button.dataset.projectSlug,
    type,
    versionId: button.dataset.versionId || '',
    minecraftVersion: getSelectedMinecraftVersion()
  }); } catch (error) { result = { success: false, error: error.message }; }

  button.disabled = false;
  button.textContent = previousText;

  if (!result.success) {
    setStatusText(status, result.error || 'Modrinth install failed.', 'error');
    return;
  }

  setStatusText(
    status,
    `${formatModrinthProjectType(type)} installed: ${result.installed?.[0]?.name || result.installedCount || 1}.`,
    'success'
  );
  await refreshContentManager();
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
  experiments.updateTrack(nowPlaying);
  const cover = document.getElementById('spotify-cover');
  if (cover) {
    const url = nowPlaying?.coverUrl || '';
    cover.classList.toggle('hidden', !url);
    cover.onerror = () => cover.classList.add('hidden');
    if (url) { if (cover.getAttribute('src') !== url) cover.src = url; }
    else cover.removeAttribute('src');
  }
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
  if (!activeUser || spotifyConnectAttempt) return;
  const attempt = { nickname: activeUser.nickname, flowId: null };
  spotifyConnectAttempt = attempt;
  const button = document.getElementById('connect-spotify');
  const cancel = document.getElementById('cancel-spotify');
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  spotifyNowPlaying.textContent = 'Открой браузер и разреши доступ Spotify...';
  try {
    const flow = await window.api.connectSpotify({ nickname: attempt.nickname });
    if (!flow.success) throw new Error(flow.error);
    attempt.flowId = flow.flowId;
    if (spotifyConnectAttempt !== attempt || activeUser?.nickname !== attempt.nickname) {
      await window.api.cancelSpotifyAuth(attempt);
      return;
    }
    cancel.classList.remove('hidden');
    await window.api.openExternal(flow.authorizationUrl);
    const result = await window.api.completeSpotifyAuth(attempt);
    if (spotifyConnectAttempt !== attempt || activeUser?.nickname !== attempt.nickname) return;
    if (!result.success) throw new Error(result.error);
    currentProfile = result.profile;
    applyProfileToUi();
    await refreshSpotifyNowPlaying();
  } catch (error) {
    if (spotifyConnectAttempt === attempt && activeUser?.nickname === attempt.nickname) {
      spotifyNowPlaying.textContent = error.message || 'Не удалось привязать Spotify. Попробуйте ещё раз.';
    }
    if (attempt.flowId) await window.api.cancelSpotifyAuth(attempt).catch(() => {});
  } finally {
    if (spotifyConnectAttempt === attempt) {
      spotifyConnectAttempt = null;
      button.disabled = false;
      button.removeAttribute('aria-busy');
      cancel.classList.add('hidden');
    }
  }
}

async function cancelSpotifyConnection() {
  const attempt = spotifyConnectAttempt;
  if (!attempt) return;
  spotifyConnectAttempt = null;
  const button = document.getElementById('connect-spotify');
  button.disabled = false;
  button.removeAttribute('aria-busy');
  document.getElementById('cancel-spotify').classList.add('hidden');
  spotifyNowPlaying.textContent = 'Привязка Spotify отменена.';
  if (attempt.flowId) await window.api.cancelSpotifyAuth(attempt).catch(() => {});
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

  const nickname = activeUser.nickname;
  spotifyRefreshInFlight = true;
  try {
    const result = await window.api.getSpotifyNowPlaying({ nickname });
    if (activeUser?.nickname !== nickname || !currentProfile?.spotifyConnected) return;
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
  } catch (error) {
    if (activeUser?.nickname === nickname && currentProfile?.spotifyConnected) {
      spotifyNowPlaying.textContent = error.message || 'Не удалось обновить Spotify.';
      setSpotifyPlayback(null);
    }
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
  if (currentSettings?.showSnapshots) versions.unshift(...(systemInfo?.snapshotVersions || []));
  const launchVersions = versions.includes(selectedVersion) ? versions : [selectedVersion, ...versions];

  select.textContent = '';
  for (const version of launchVersions) {
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
    fields.instanceVersion.value = versions.includes(selectedVersion) ? selectedVersion : versions[0] || '1.20.1';
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

function applyMemoryLimit() {
  const cap = Number(systemInfo?.maxGameMemoryMb) || (systemInfo?.totalMemoryMb ? Math.max(1024, Math.floor((systemInfo.totalMemoryMb - Math.max(1024, Math.min(2048, systemInfo.totalMemoryMb / 4))) / 256) * 256) : Number(fields.memoryMax.max));
  fields.memoryMax.max = String(cap);
  if (currentSettings?.memory) currentSettings.memory.max = Math.max(1024, Math.min(cap, Number(currentSettings.memory.max) || 4096));
}
function renderSystemMemory() {
  if (!systemMemory || !systemInfo) return;
  const lang = document.documentElement.lang || 'ru';
  const words = ({ ru: ['Установлено', 'доступно Windows', 'свободно', 'ГБ', 'Гц'], en: ['Installed', 'usable by Windows', 'free', 'GB', 'Hz'], es: ['Instalada', 'utilizable por Windows', 'libre', 'GB', 'Hz'] })[lang] || ['Installed', 'usable', 'free', 'GB', 'Hz'];
  const format = value => Number.isFinite(Number(value)) && value != null ? new Intl.NumberFormat(lang, { maximumFractionDigits: 1 }).format(value / 1024) : '—';
  systemMemory.textContent = `${words[0]}: ${format(systemInfo.installedMemoryMb ?? systemInfo.totalMemoryMb)} ${words[3]} · ${systemInfo.refreshRate || '—'} ${words[4]}`;
  systemMemory.title = `${words[1]}: ${format(systemInfo.totalMemoryMb)} ${words[3]}; ${words[2]}: ${format(systemInfo.availableMemoryMb)} ${words[3]}; ${systemInfo.monitorName || ''}`;
}
function updateHardwareInfo(data) {
  systemInfo = { ...systemInfo, ...data };
  applyMemoryLimit(); renderSystemMemory();
  if (currentSettings?.memory) { fields.memoryMax.value = currentSettings.memory.max; fields.memoryMaxLabel.textContent = currentSettings.memory.max; }
}
window.api.onHardwareInfo?.(updateHardwareInfo);
window.addEventListener('focus', () => { window.api.getHardwareInfo?.().then(updateHardwareInfo).catch(() => {}); });

async function loadAppState() {
  systemInfo = await window.api.getSystemInfo();
  currentSettings = await window.api.getSettings({ nickname: activeUser?.nickname || '' });
  if (!currentSettings.javaPath && systemInfo.recommendedJava?.path) {
    currentSettings.javaPath = systemInfo.recommendedJava.path;
  }
  modsFolder.textContent = systemInfo.modsFolder;
  renderSystemMemory();
  populateMinecraftVersions();
  await loadBuildInstances();
  renderBuildProfiles(systemInfo.buildProfiles || []);
  renderProjects(systemInfo.projects || []);
  renderCommandCenter();
  applySettingsToUi();
  modsFolder.textContent = 'Моды выбранной сборки';
  await Promise.all([
    refreshLauncherContent(),
    refreshMods(),
    refreshPreviews(),
    loadProfile(),
    loadModrinthTags().catch(() => null)
  ]);
  startSpotifyRefresh();
}

async function refreshAccountSwitcher() {
  const select = document.getElementById('account-switch');
  if (!select || !window.api.listAccounts) return;
  const result = await window.api.listAccounts();
  select.innerHTML = (result.accounts || []).map((account) => `<option value="${escapeHtml(account.sessionToken)}">${escapeHtml(account.nickname)}${account.microsoft ? ' · Microsoft' : ' · Offline'}</option>`).join('');
  if (activeUser?.sessionToken) select.value = activeUser.sessionToken;
}
async function enterLauncher(user) {
  document.getElementById('skin-album').replaceChildren();
  document.getElementById('skin-album').classList.add('hidden');
  activeUser = user;
  updateUserIdentity(activeUser.nickname);
  refreshAccountSwitcher().catch(() => {});
  authScreen.classList.add('hidden');
  launcherScreen.classList.remove('hidden');
  await loadAppState();
  startUpdateChecks();
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

  const button = document.getElementById('guest-button');
  if (button.disabled) return;
  button.disabled = true;
  button.setAttribute('aria-busy', 'true');
  try {
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
  } catch (error) {
    setMessage(guestMessage, error.message || 'Не удалось войти офлайн. Попробуйте ещё раз.');
  } finally {
    button.disabled = false;
    button.removeAttribute('aria-busy');
  }
}

async function microsoftLogin() {
  if (!window.api.startMicrosoftLogin || !window.api.completeMicrosoftLogin) {
    setMessage(loginMessage, 'Microsoft login is not available in this build.');
    return;
  }

  microsoftLoginButton.disabled = true;
  microsoftLoginButton.setAttribute('aria-busy', 'true');
  try {
  setMessage(loginMessage, 'Opening Microsoft login...', 'success');
  const flow = await window.api.startMicrosoftLogin();
  if (!flow.success) {
    microsoftLoginButton.disabled = false;
    setMessage(loginMessage, flow.error || 'Microsoft login failed.');
    return;
  }

  if (flow.browserOpened === false) await window.api.openExternal(flow.authorizationUrl);

  setMessage(loginMessage, 'Завершите вход в открывшемся браузере — лаунчер получит callback автоматически.', 'success');
  const result = await window.api.completeMicrosoftLogin({ flowId: flow.flowId });
  microsoftLoginButton.disabled = false;

  if (!result.success) {
    setMessage(loginMessage, result.error || 'Minecraft license login failed.');
    return;
  }

  await enterLauncher(result.user);
  } catch (error) {
    setMessage(loginMessage, error.message || 'Не удалось завершить вход. Попробуйте ещё раз.');
  } finally {
    microsoftLoginButton.disabled = false;
    microsoftLoginButton.removeAttribute('aria-busy');
  }
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

async function applyAccountSkin(filePath, skinId) {
  const status = document.getElementById('skin-apply-status');
  const user = activeUser;
  if (!user) return false;
  status.textContent = 'Применяю скин…';
  try {
    const result = await window.api.applySkin({ sessionToken: user.sessionToken, filePath, skinId, model: fields.skinModel.value });
    if (!result.success) throw new Error(result.error);
    if (activeUser?.sessionToken !== user.sessionToken) return false;
    currentSettings = result.settings;
    applySettingsToUi();
    await refreshPreviews();
    status.textContent = result.licensed ? 'Скин изменён в текущем аккаунте Minecraft.' : 'Скин сохранён для офлайн-профиля. Его видимость в игре зависит от поддержки скинов сборкой.';
    return true;
  } catch (error) { status.textContent = error.message; return false; }
}
document.getElementById('open-skin-album').addEventListener('click', async () => {
  const album = document.getElementById('skin-album');
  album.classList.toggle('hidden');
  if (album.classList.contains('hidden')) return;
  try {
    const result = await window.api.getSkinAlbum({ sessionToken: activeUser?.sessionToken });
    if (!result.success) throw new Error(result.error);
    album.innerHTML = result.items.map(item => `<button type="button" class="skin-album-item" data-skin-id="${escapeHtml(item.id)}"><img src="${escapeHtml(item.preview)}" alt="" /><span>${escapeHtml(item.name)}</span></button>`).join('') || '<p>Выбранные скины появятся здесь после применения.</p>';
  } catch (error) { album.textContent = error.message; }
});
document.getElementById('skin-album').addEventListener('click', async event => {
  const button = event.target.closest('[data-skin-id]');
  if (!button) return;
  button.disabled = true;
  try { await applyAccountSkin(null, button.dataset.skinId); }
  finally { button.disabled = false; }
});

async function selectSkin() {
  const file = await window.api.chooseFile({ filters: [{ name: 'Minecraft skin PNG', extensions: ['png'] }] });
  if (!file) return;

  if (!await applyAccountSkin(file.path)) return;
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

  if (!await applyAccountSkin(result.file.path)) return;
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

  await saveSettings({ wallpaper: file.path, wallpaperPosition: { x: 50, y: 50 } });
  if (fields.wallpaperCrop) fields.wallpaperCrop.style.setProperty('--wallpaper-position', '50% 50%');
  document.getElementById('wallpaper-crop-controls')?.classList.remove('hidden');
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
    if (result.stopped) setLaunchActive(false);
    launchStatus.textContent = result.success ? (result.stopped || !launchActive ? 'Minecraft закрыт.' : 'Остановка Minecraft...') : result.error;
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
  try {
    console.log(`[launcher] Launch requested by ${activeUser?.nickname || 'unknown'} at ${new Date().toISOString()}`);
    if (window.api.logLaunch) {
      window.api.logLaunch({
        nickname: activeUser?.nickname || '',
        instanceId: currentSettings?.activeInstanceId || '',
        loader: getSelectedModLoader(),
        version: fields.minecraftVersion?.value || ''
      }).catch(() => {});
    }
  } catch (e) {
    /* ignore logging errors */
  }

  let result;
  launchRequestPending = true;
  try {
    result = await window.api.launchMinecraft({ user: activeUser, memory: currentSettings.memory, settings: currentSettings });
  } catch (error) {
    launchStatus.textContent = error.message;
    appendLog(error.message);
    return;
  } finally {
    launchRequestPending = false;
    void refreshLaunchState();
  }

  if (!result.success) {
    if (result.code === 'LAUNCH_CANCELLED') {
      setLaunchActive(false);
      launchStatus.textContent = 'Запуск отменён.';
      return;
    }
    launchStatus.textContent = result.error;
    appendLog(`Ошибка: ${result.error}`);
    if (result.code === 'BUILD_INSTANCE_REQUIRED') {
      setLauncherSection('library');
    }
    if (result.code === 'JAVA_REQUIRED') {
      const major = Math.max(21, result.minimumJava || 21);
      const lang = currentSettings?.language || 'ru';
      const prompts = { ru: `Открыть установку Java ${major}?`, en: `Open Java ${major} installation?`, es: `¿Abrir la instalación de Java ${major}?` };
      const install = window.confirm(`${localizer.value(result.error, {}, 'text')}\n\n${prompts[lang] || prompts.ru}`);
      if (install) {
        if (major > 21) await window.api.openExternal(result.javaInstallUrl);
        else await window.api.installJava();
        launchStatus.textContent = `Открыта установка Java ${major}. После установки запусти Minecraft еще раз.`;
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

function setLaunchActive(active, running = false) {
  launchActive = active;
  syncHorizonControls();
  gameRunning = active && running;
  const copy = languageStrings[currentSettings?.language] || languageStrings.ru;
  const labels = ({ ru: ['Запустить', 'Остановить'], en: ['Launch', 'Stop'], es: ['Iniciar', 'Detener'] })[currentSettings?.language] || ['Запустить', 'Остановить'];
  setButtonIconText(launchButton, active ? 'stop' : 'play', active ? (running ? labels[1] : copy.stop) : labels[0]);
  launchButton.classList.toggle('danger', active);
  if (active && !launchPollTimer) launchPollTimer = setInterval(refreshLaunchState, 2000);
  if (!active && launchPollTimer) { clearInterval(launchPollTimer); launchPollTimer = null; }
}

async function refreshLaunchState() {
  if (launchPollBusy || !window.api.getLaunchState) return;
  launchPollBusy = true;
  try {
    const state = await window.api.getLaunchState();
    if (state.active || !launchRequestPending) setLaunchActive(state.active, state.running);
  } catch { /* Keep known state when the backend is temporarily unavailable. */ }
  finally { launchPollBusy = false; }
}

function startSpaceEffect() {
  const background = new window.AmbientBackground(spaceCanvas, () => [spaceAccentRgb, spaceAccent2Rgb]);
  background.start();
  window.addEventListener('pagehide', () => background.dispose(), { once: true });
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
  launcherUpdateState = payload;
  const state = payload.state || 'idle';
  const labels = {
    checking: 'проверка',
    available: 'доступно',
    none: 'актуально',
    unpublished: 'релиз не опубликован',
    idle: 'готово',
    error: 'ошибка'
  };
  if (updateStatus) updateStatus.textContent = labels[state] || state;
  if (updateHealthStatus) updateHealthStatus.textContent = labels[state] || state;
  if (installUpdateButton) installUpdateButton.classList.toggle('hidden', state !== 'available');
  const badge = document.getElementById('update-notification');
  badge.classList.toggle('hidden', state !== 'available');
  if (state === 'available') setButtonIconText(badge, 'download', `${localizer.value('Обновление', {}, 'text')} ${payload.release.version}`);
  if (!updateMessage) return;

  if (state === 'available') {
    updateMessage.textContent = 'Доступна новая версия. Посмотрите список изменений и скачайте её с GitHub.';
  } else if (state === 'none') {
    updateMessage.textContent = 'Установлена актуальная версия лаунчера.';
  } else if (state === 'unpublished') {
    updateMessage.textContent = 'Первый стабильный релиз ещё не опубликован на GitHub.';
  } else if (state === 'error') {
    updateMessage.textContent = payload.errorCode === 'RATE_LIMIT' ? 'GitHub ограничил число запросов. Повторите проверку позже.' : 'Не удалось проверить обновления. Проверьте подключение к интернету.';
  } else if (state === 'checking') {
    updateMessage.textContent = 'Проверяю доступные релизы...';
  }
}

function showReleaseNotes(release, available) {
  displayedRelease = release;
  document.getElementById('release-panel-title').textContent = available ? 'Доступно обновление' : 'Что нового';
  document.getElementById('release-title').textContent = release.title;
  const current = launcherUpdateState.currentVersion || systemInfo?.launcherVersion || release.version;
  document.getElementById('release-version').textContent = `${localizer.value('Установлена версия', {}, 'text')} ${current}${available ? ` → ${release.version}` : ''}`;
  const notes = document.getElementById('release-notes'); notes.replaceChildren();
  let list;
  for (const line of String(release.notes || '').slice(0, 64000).split(/\r?\n/).slice(0, 600)) {
    const text = line.trim();
    if (!text) { list = null; continue; }
    const heading = /^#{1,6}\s+(.+)$/.exec(text), item = /^[-*]\s+(.+)$/.exec(text);
    const element = document.createElement(heading ? 'h3' : item ? 'li' : 'p');
    element.textContent = heading?.[1] || item?.[1] || text;
    if (item) { if (!list) { list = document.createElement('ul'); notes.appendChild(list); } list.appendChild(element); }
    else { list = null; notes.appendChild(element); }
  }
  if (!notes.childNodes.length) { const paragraph = document.createElement('p'); paragraph.textContent = localizer.value('Автор релиза не добавил описание изменений.', {}, 'text'); notes.appendChild(paragraph); }
  notes.scrollTop = 0;
  document.getElementById('release-download').hidden = !available;
  document.getElementById('release-error').textContent = '';
  document.getElementById('release-panel').hidden = false;
  document.getElementById('update-notification').setAttribute('aria-expanded', 'true');
}
function closeReleaseNotes() {
  document.getElementById('release-panel').hidden = true;
  document.getElementById('update-notification').setAttribute('aria-expanded', 'false');
}
async function showCurrentRelease() {
  try {
    const result = await window.api.getCurrentRelease({ nickname: activeUser?.nickname, language: document.documentElement.lang });
    if (result.success) showReleaseNotes({ ...result.release, local: true }, false);
  } catch { renderUpdateStatus({ state: 'error' }); }
}
function notifyNewRelease() {
  const release = launcherUpdateState.release;
  if (launcherUpdateState.state === 'available' && activeUser && !document.hidden && !launchActive && release.version !== notifiedReleaseVersion) {
    notifiedReleaseVersion = release.version; showReleaseNotes(release, true);
  }
}
async function checkUpdates(automatic = false) {
  if (updateCheckPending) return updateCheckPending;
  const button = document.getElementById('check-updates'); button.disabled = true;
  renderUpdateStatus({ state: 'checking' });
  updateCheckPending = (async () => {
    try {
      const result = await window.api.checkForUpdates();
      renderUpdateStatus(result);
      if (automatic) notifyNewRelease();
      else if (result.state === 'available') showReleaseNotes(result.release, true);
    } catch { renderUpdateStatus({ state: 'error' }); }
    finally { lastUpdateCheck = Date.now(); button.disabled = false; updateCheckPending = null; }
  })();
  return updateCheckPending;
}
function startUpdateChecks() {
  if (updateCheckTimer) return;
  void checkUpdates(true);
  updateCheckTimer = window.setInterval(() => { if (activeUser && !document.hidden) void checkUpdates(true); }, 30 * 60 * 1000);
}
async function openUpdateRelease() {
  const button = document.getElementById('release-download');
  button.disabled = true;
  installUpdateButton.disabled = true;
  try {
    const result = await window.api.installUpdate();
    if (!result.success) throw new Error('Release unavailable');
    document.getElementById('release-error').textContent = '';
  } catch {
    if (launcherUpdateState.release) showReleaseNotes(launcherUpdateState.release, true);
    document.getElementById('release-error').textContent = 'Не удалось открыть релиз. Повторите проверку обновлений.';
  } finally { button.disabled = false; installUpdateButton.disabled = false; }
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

window.addEventListener('focus', refreshSpotifyNowPlaying);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    refreshSpotifyNowPlaying();
  }
});

loginTab?.addEventListener('click', () => setAuthMode());
registerTab?.addEventListener('click', () => setAuthMode());
guestTab?.addEventListener('click', () => setAuthMode());
sectionButtons.forEach((button) => {
  button.addEventListener('click', () => setLauncherSection(button.dataset.section));
});
settingsTabs.forEach((button) => {
  button.addEventListener('click', () => setSettingsTab(button.dataset.settingsTab));
});
loginForm?.addEventListener('submit', login);
registerForm?.addEventListener('submit', register);
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
  closeReleaseNotes();
  await cancelSpotifyConnection();
  await window.api.logout({ sessionToken: activeUser?.sessionToken });
  stopSpotifyRefresh();
  stopServerRegistryRefresh();
  stopApiHealthRefresh();
  activeUser = null;
  currentProfile = null;
  updateUserIdentity('');
  launcherScreen.classList.add('hidden');
  authScreen.classList.remove('hidden');
  setAuthMode();
});
document.getElementById('refresh-mods').addEventListener('click', refreshMods);
document.getElementById('refresh-mods-panel')?.addEventListener('click', refreshContentManager);
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
document.getElementById('pack-import-url-button').addEventListener('click', async event => {
  const ref = document.getElementById('pack-import-url').value.trim();
  if (!/^https:\/\/(www\.)?modrinth\.com\/modpack\/[\w-]+\/?(?:[?#].*)?$/.test(ref)) {
    buildLibraryStatus.textContent = 'Укажите ссылку https://modrinth.com/modpack/название'; return;
  }
  const button = event.currentTarget;
  button.disabled = true;
  buildLibraryStatus.textContent = 'Импортирую сборку из Modrinth…';
  try { await importModrinthByRef(ref); }
  catch (error) { buildLibraryStatus.textContent = error.message; }
  finally { button.disabled = false; }
});
instanceList?.addEventListener('click', async (event) => {
  const edit = event.target.closest('.instance-edit');
  if (edit) { openInstanceEditor(edit.dataset.instanceId); return; }
  const favorite = event.target.closest('.instance-favorite');
  if (favorite) {
    const instance = buildInstances.find(item => item.id === favorite.dataset.instanceId);
    if (instance) {
      favorite.disabled = true;
      try { await updateInstanceAppearance(instance.id, { favorite: !instance.favorite }); }
      catch (error) { buildLibraryStatus.textContent = error.message; }
      finally { favorite.disabled = false; }
    }
    return;
  }
  const selectButton = event.target.closest('.instance-select');
  if (selectButton) {
    await selectBuildInstance(selectButton.dataset.instanceId);
    return;
  }
  const contentButton = event.target.closest('.instance-content');
  if (contentButton) {
    await openInstanceContent(contentButton.dataset.instanceId, contentButton.dataset.content);
    return;
  }  const deleteButton = event.target.closest('.instance-delete');
  if (deleteButton) {
    const instanceId = deleteButton.dataset.instanceId;
    if (!instanceId) return;
    const ok = confirm('Удалить сборку? Это действие нельзя отменить.');
    if (!ok) return;
    const result = await window.api.deleteBuildInstance({ nickname: activeUser?.nickname || '', instanceId });
    if (!result || !result.success) {
      alert(result?.error || 'Не удалось удалить сборку.');
      return;
    }
    buildInstances = result.instances || buildInstances.filter((i) => i.id !== instanceId);
    currentSettings = result.settings || currentSettings;
    renderActiveInstanceSelect();
    renderInstanceList();
    renderInstanceRail();
    await refreshMods();
    return;
  }
});
instanceRail?.addEventListener('click', async (event) => {
  const button = event.target.closest('.instance-rail-button');
  if (!button) return;
  await selectBuildInstance(button.dataset.instanceId);
});
document.getElementById('rail-create-instance')?.addEventListener('click', openBuildLibrary);
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
document.getElementById('open-user-mods-panel')?.addEventListener('click', () => window.api.openGameContentFolder({
  nickname: activeUser?.nickname || '',
  instanceId: currentSettings?.activeInstanceId,
  type: activeContentType
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
  const projectButton = event.target.closest('.modrinth-install-project');
  if (projectButton && !launchActive) {
    await installModrinthProject(projectButton);
    await refreshContentManager();
  }
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
document.getElementById('cancel-spotify').addEventListener('click', cancelSpotifyConnection);
document.getElementById('disconnect-spotify').addEventListener('click', disconnectSpotify);
document.getElementById('refresh-spotify').addEventListener('click', refreshSpotifyNowPlaying);
document.getElementById('check-updates')?.addEventListener('click', () => checkUpdates());
document.getElementById('show-current-release').addEventListener('click', showCurrentRelease);
document.getElementById('update-notification').addEventListener('click', () => { if (launcherUpdateState.release) showReleaseNotes(launcherUpdateState.release, true); });
document.getElementById('close-release-panel').addEventListener('click', closeReleaseNotes);
document.getElementById('release-download').addEventListener('click', openUpdateRelease);
document.addEventListener('keydown', event => { if (event.key === 'Escape') closeReleaseNotes(); });
window.addEventListener('focus', () => {
  if (!activeUser) return;
  if (Date.now() - lastUpdateCheck >= 30 * 60 * 1000) void checkUpdates(true);
  else notifyNewRelease();
});
document.getElementById('install-update')?.addEventListener('click', openUpdateRelease);
document.getElementById('open-logs')?.addEventListener('click', () => window.api.openLogsFolder());
document.getElementById('open-launch-logs')?.addEventListener('click', () => window.api.openLogsFolder());
for (const [id, type] of [['home-instance-content', 'mods'], ['home-instance-worlds', 'worlds']]) {
  document.getElementById(id)?.addEventListener('click', () => {
    const instance = getActiveBuildInstance();
    if (instance) void openInstanceContent(instance.id, type);
    else setLauncherSection('library');
  });
}
document.getElementById('home-instance-files')?.addEventListener('click', async () => {
  const instance = getActiveBuildInstance();
  if (!instance) { setLauncherSection('library'); return; }
  try {
    const result = await window.api.openGameContentFolder({ nickname: activeUser?.nickname, instanceId: instance.id, type: 'instance' });
    if (!result.success) appendLog({ level: 'error', message: result.error || 'Не удалось открыть папку сборки.' });
  } catch (error) { appendLog({ level: 'error', message: error.message }); }
});
document.getElementById('home-instance-logs')?.addEventListener('click', async () => {
  try {
    const result = await window.api.openLogsFolder();
    if (!result.success) appendLog({ level: 'error', message: result.error || 'Не удалось открыть папку логов.' });
  } catch (error) { appendLog({ level: 'error', message: error.message }); }
});
async function refreshGameStorage() {
  try {
    const info = await window.api.getGameStorage();
    document.getElementById('game-storage-path').textContent = info.root + (info.pending ? ` → ${info.pending}` : '');
    document.getElementById('game-storage-status').textContent = info.error || (info.pending ? 'Перезапустите лаунчер для переноса файлов.' : '');
  } catch (error) { document.getElementById('game-storage-status').textContent = error.message; }
}
async function changeGameStorage(useDefault) {
  const buttons = ['choose-game-storage', 'default-game-storage'].map(id => document.getElementById(id));
  buttons.forEach(button => { button.disabled = true; });
  try {
    const folder = useDefault ? null : await window.api.chooseDirectory();
    if (!useDefault && !folder) return;
    const result = await window.api.changeGameStorage({ useDefault, path: folder?.path });
    if (!result.success) throw new Error(result.error);
    await refreshGameStorage();
  } catch (error) { document.getElementById('game-storage-status').textContent = error.message; }
  finally { buttons.forEach(button => { button.disabled = false; }); }
}
document.getElementById('choose-game-storage')?.addEventListener('click', () => changeGameStorage(false));
document.getElementById('default-game-storage')?.addEventListener('click', () => changeGameStorage(true));
refreshGameStorage();
document.getElementById('export-diagnostics')?.addEventListener('click', exportDiagnostics);
document.getElementById('analyze-crash')?.addEventListener('click', analyzeCrash);
contentManagerTabs?.addEventListener('click', async (event) => { const button = event.target.closest('[data-content-tab]'); if (!button || launchActive) return; activeContentType = button.dataset.contentTab; modrinthSearchRevision++; if (modrinthModResults) modrinthModResults.innerHTML = ''; await refreshContentManager(); });
contentManagerList?.addEventListener('click', async event => {
  const button = event.target.closest('[data-content-name]');
  if (!button || launchActive) return;
  button.disabled = true;
  try {
    const payload = { type: activeContentType, name: button.dataset.contentName, nickname: activeUser?.nickname, instanceId: currentSettings.activeInstanceId };
    const result = button.classList.contains('content-delete')
      ? await window.api.deleteGameContent(payload)
      : await window.api.setGameContentEnabled({ ...payload, enabled: !button.classList.contains('active') });
    if (!result.success) throw new Error(result.error);
    await refreshContentManager();
  } catch (error) { setStatusText(modrinthModStatus, error.message, 'error'); }
  finally { button.disabled = false; }
});
document.getElementById('account-switch')?.addEventListener('change', async (event) => { await cancelSpotifyConnection(); const result = await window.api.switchAccount({ sessionToken: event.target.value }); if (result.success) await enterLauncher(result.user); });
document.getElementById('add-account')?.addEventListener('click', () => { launcherScreen.classList.add('hidden'); authScreen.classList.remove('hidden'); setAuthMode('login'); });
launchButton.addEventListener('click', launchMinecraft);
document.getElementById('clear-log').addEventListener('click', () => { launchLogEntries.length = 0; renderLaunchLog(); });
document.querySelectorAll('[data-log-level]').forEach(input => input.addEventListener('change', () => {
  if (input.checked) visibleLogLevels.add(input.dataset.logLevel);
  else visibleLogLevels.delete(input.dataset.logLevel);
  renderLaunchLog();
}));

fields.memoryMax.addEventListener('input', updateMemoryLabels);
fields.profileMemoryMax?.addEventListener('change', async () => { const id = fields.buildProfile?.value || 'normal'; const value = Math.max(1024, Number(fields.profileMemoryMax.value) || 4096); currentSettings.memoryProfiles = { ...(currentSettings.memoryProfiles || {}), [id]: value }; fields.memoryMax.value = value; updateMemoryLabels(); await saveSettings({ memoryProfiles: currentSettings.memoryProfiles }); });
fields.memoryMax.addEventListener('change', () => saveSettings());
fields.hideLauncherDuringGame.addEventListener('change', () => saveSettings());
fields.showSnapshots?.addEventListener('change', () => saveSettings());
fields.useUniqueMods?.addEventListener('change', () => saveSettings());
fields.appearanceTheme?.addEventListener('change', () => saveSettings());
fields.accentColor?.addEventListener('input', () => applyAppearance(getAppearanceFromFields()));
fields.accentColor?.addEventListener('change', () => saveSettings());
fields.reduceMotion?.addEventListener('change', () => saveSettings());
fields.language?.addEventListener('change', async () => {
  applyLanguage(fields.language.value);
  await saveSettings({ language: fields.language.value });
});
let wallpaperCropPointerActive = false;
function updateWallpaperCropFromPointer(event, persist = false) {
  const crop = fields.wallpaperCrop;
  if (!crop || !currentSettings?.wallpaper) return;
  const rect = crop.getBoundingClientRect();
  const position = { x: Math.round(Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100))), y: Math.round(Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100))) };
  currentSettings = { ...currentSettings, wallpaperPosition: position };
  const cssPosition = `${position.x}% ${position.y}%`;
  crop.style.setProperty('--wallpaper-position', cssPosition);
  wallpaperPreview.style.setProperty('--wallpaper-position', cssPosition);
  if (persist) void saveSettings({ wallpaperPosition: position });
}
fields.wallpaperCrop?.addEventListener('pointerdown', (event) => { wallpaperCropPointerActive = true; fields.wallpaperCrop.setPointerCapture?.(event.pointerId); updateWallpaperCropFromPointer(event); });
fields.wallpaperCrop?.addEventListener('pointermove', (event) => { if (wallpaperCropPointerActive) updateWallpaperCropFromPointer(event); });
fields.wallpaperCrop?.addEventListener('pointerup', (event) => { if (wallpaperCropPointerActive) { wallpaperCropPointerActive = false; updateWallpaperCropFromPointer(event, true); } });
document.getElementById('save-appearance')?.addEventListener('click', async () => {
  await saveSettings();
  setStatusText(buildLibraryStatus, 'Внешний вид сохранён.');
});
fields.skinModel.addEventListener('change', async () => {
  if (currentSettings?.skin) await applyAccountSkin(currentSettings.skin);
  else await saveSettings();
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
    const progress = Number.isFinite(data.percent) ? ` · ${Math.max(0, Math.min(100, Math.round(data.percent)))}%` : '';
    launchStatus.textContent = `Загрузка: ${localizer.value(data.name, {}, 'text')}${progress}`;
  }
});

window.api.onLaunchLog(appendLog);
window.api.onLaunchDebug((data) => appendLog(data, 'debug'));
window.api.onLaunchError((error) => {
  const text = String(error || '').trim();
  launchStatus.textContent = text || 'Ошибка процесса Minecraft';
  appendLog({ level: 'error', message: text });
});
window.api.onLaunchStarted?.(() => {
  setLaunchActive(true, true);
  launchStatus.textContent = 'Minecraft запущен.';
});
window.api.onLaunchClosed((code) => {
  launchStatus.textContent = `Minecraft завершился с кодом ${code}`;
  setLaunchActive(false);
});
window.api.onWindowMaximizedState(setWindowMaximizeButton);
window.api.onUpdateStatus(renderUpdateStatus);

window.api.onGameCrashed?.(data => {
  document.getElementById('game-crash-code').textContent = String(data.code);
  const dialog = document.getElementById('game-crash-screen');
  if (!dialog.open) dialog.showModal();
});
document.getElementById('close-game-crash').addEventListener('click', () => document.getElementById('game-crash-screen').close());
document.getElementById('copy-launch-log')?.addEventListener('click', () => window.api.copyText(launchLog.textContent || ''));

function dismissStartupScreen() {
  const screen = document.getElementById('startup-screen');
  if (!screen || screen.classList.contains('hidden')) return;
  const status = document.getElementById('startup-status');
  if (status) status.textContent = 'Готово';
  screen.classList.add('hidden');
  window.setTimeout(() => screen.remove(), 300);
}

function showStartupAfterIcons() {
  const icon = document.querySelector('#startup-screen img');
  if (!icon || icon.complete) {
    requestAnimationFrame(dismissStartupScreen);
    return;
  }
  icon.addEventListener('load', dismissStartupScreen, { once: true });
  icon.addEventListener('error', dismissStartupScreen, { once: true });
  window.setTimeout(dismissStartupScreen, 2500);
}
async function init() {
  let initialLanguage = 'ru';
  try { initialLanguage = localStorage.getItem('unique-language') || 'ru'; } catch { }
  applyLanguage(initialLanguage);
  window.api.getSettings({}).then(settings => { if (!activeUser) applyLanguage(settings.language || initialLanguage); }).catch(() => {});
  setAuthMode();
  prepareLauncherSections();
  setLauncherSection('main');
  setSettingsTab('info');
  installSvgIcons();
  setupCustomSelects();
  // Parallelize non-dependent startup tasks
  showStartupAfterIcons();
  const pLoadTitle = loadTitlebarIcon().catch(() => {});
  const pUpdateWindow = updateWindowMaximizeButton();
  const pRefreshMods = refreshMods();
  const pSession = window.api.getCurrentSession();

  void Promise.allSettled([pUpdateWindow, pRefreshMods]);

  const session = await pSession;
  if (session && session.success) {
    await enterLauncher(session.user);
  }
  dismissStartupScreen();
}

const experiments = new window.LauncherExperiments({
  applyTheme: appearance => applyAppearance(appearance),
  getAppearance: () => currentSettings?.appearance || {}
});
let streamerApplied;
let streamerQueue = Promise.resolve();
function applyStreamerMode(enabled) {
  streamerQueue = streamerQueue.catch(() => {}).then(async () => {
    if (streamerApplied === enabled) return true;
    const status = document.getElementById('streamer-status');
    try {
      if (!window.api.setStreamerMode) { if (enabled) throw new Error('Streamer mode requires Windows WebView2.'); return false; }
      const result = await window.api.setStreamerMode(enabled);
      if (!result.success) throw new Error(result.error);
      streamerApplied = result.enabled;
      status.textContent = enabled ? 'Streamer mode: ON (BETA)' : '';
      return true;
    } catch (error) {
      document.getElementById('streamer-mode').checked = streamerApplied === true;
      status.textContent = `Streamer mode: ${error.message}`;
      return false;
    }
  });
  return streamerQueue;
}
document.getElementById('streamer-mode').addEventListener('change', async event => {
  const input = event.target;
  input.disabled = true;
  try { if (await applyStreamerMode(input.checked)) await saveSettings(); }
  finally { input.disabled = false; }
});
for (const id of ['spotify-theme', 'music-visualizer', 'rust-minecraft']) {
  document.getElementById(id).addEventListener('change', () => {
    saveSettings().catch(error => { document.getElementById('experiments-status').textContent = error.message; });
  });
}

let dropStatusTimer;
function reportFileDrop(message) {
  let status = document.getElementById('file-drop-status');
  if (!status) {
    status = document.createElement('div'); status.id = 'file-drop-status';
    status.setAttribute('role', 'status'); status.setAttribute('aria-live', 'polite');
    status.addEventListener('click', () => status.classList.add('hidden'));
    document.body.appendChild(status);
  }
  status.textContent = message;
  status.classList.remove('hidden');
  clearTimeout(dropStatusTimer);
  dropStatusTimer = setTimeout(() => status.classList.add('hidden'), 12000);
}
const fileDrops = new window.FileDropController({
  report: reportFileDrop,
  resolveTarget: element => {
    if (!(element instanceof Element)) return null;
    const skin = element.closest('#select-skin');
    if (skin) return { type: 'skin', element: skin };
    const cape = element.closest('#select-cape');
    if (cape) return { type: 'cape', element: cape };
    const panel = element.closest('.mods-panel');
    if (!panel) return null;
    return { type: element.closest('[data-content-tab]')?.dataset.contentTab || activeContentType, element: panel };
  },
  importFiles: async (type, files) => {
    if (!activeUser) throw new Error('Сначала войдите в аккаунт.');
    if (files.length > 100) throw new Error('Перетащите не больше 100 файлов за раз.');
    if (['skin', 'cape'].includes(type) && files.length !== 1) throw new Error('Для скина или плаща перетащите один файл.');
    if (!['skin', 'cape'].includes(type) && launchActive) throw new Error('Сначала закройте Minecraft.');
    const user = activeUser;
    const instanceId = currentSettings?.activeInstanceId;
    if (!window.api.getDroppedPaths) throw new Error('Перетаскивание поддерживается в версии лаунчера WebView2.');
    const paths = await window.api.getDroppedPaths(files);
    if (!paths.length) throw new Error('Не удалось прочитать путь. Для мира попробуйте ZIP с level.dat.');
    if (activeUser?.sessionToken !== user.sessionToken) throw new Error('Аккаунт изменился. Повторите действие.');
    reportFileDrop('Импортирую…');
    if (type === 'skin') {
      const applied = await applyAccountSkin(paths[0]);
      reportFileDrop(applied ? 'Скин применён.' : document.getElementById('skin-apply-status').textContent);
      return;
    }
    const result = await window.api.importDroppedContent({ sessionToken: user.sessionToken, instanceId, type, paths });
    if (!result.success) throw new Error(result.error);
    if (activeUser?.sessionToken === user.sessionToken) {
      if (type === 'cape' && result.imported.length) {
        await saveSettings({ cape: result.imported[0].path });
        await refreshPreviews();
      } else if (currentSettings?.activeInstanceId === instanceId) {
        activeContentType = type;
        await refreshContentManager();
      }
    }
    const summary = type === 'cape' && result.imported.length
      ? 'Плащ сохранён в профиле лаунчера. В игре его отображение зависит от поддержки сборкой.'
      : `Импортировано: ${result.imported.length}.`;
    reportFileDrop([summary, ...result.errors.map(item => `${item.name}: ${item.error}`)].join('\n'));
  }
});
window.addEventListener('pagehide', () => { fileDrops.dispose(); clearTimeout(dropStatusTimer); }, { once: true });

init().catch((error) => {
  dismissStartupScreen();
  setMessage(loginMessage, 'Ошибка загрузки: ' + error.message);
});
startSpaceEffect();

for (const [buttonId, setting, inputId] of [
  ['choose-horizon-client', 'horizonExecutable', 'horizon-executable'],
  ['choose-horizon-resources', 'horizonResources', 'horizon-resources']
]) {
  document.getElementById(buttonId).addEventListener('click', async () => {
    const status = document.getElementById('horizon-status');
    try {
      const file = setting === 'horizonExecutable'
        ? await window.api.chooseFile({ filters: [{ name: 'Horizon client', extensions: ['exe'] }] })
        : await window.api.chooseDirectory();
      const selected = typeof file === 'string' ? file : file?.path;
      if (!selected) return;
      await saveSettings({ [setting]: selected });
      document.getElementById(inputId).value = selected;
      status.textContent = 'Сохранено.';
    } catch (error) { status.textContent = error.message; }
  });
}
document.getElementById('horizon-download').addEventListener('click', () => window.api.openExternal('https://playhorizon.dev/'));
function syncHorizonControls() {
  const button = document.getElementById('launch-horizon');
  button.classList.toggle('hidden', !currentSettings?.experiments?.rustMinecraft);
  button.disabled = launchActive;
}
document.getElementById('launch-horizon').addEventListener('click', async event => {
  const status = document.getElementById('horizon-status');
  const instance = getActiveBuildInstance();
  if (!activeUser || launchActive) return;
  if (!instance) { setLauncherSection('library'); return; }
  launchRequestPending = true;
  setLaunchActive(true);
  const report = text => { status.textContent = text; launchStatus.textContent = text; appendLog(text); };
  report('Подготовка Rust-сборки: ' + instance.name);
  try {
    const result = await window.api.launchHorizon({ user: activeUser, instanceId: instance.id });
    report(result.success
      ? 'Запущена Rust-сборка: ' + instance.name + (result.content?.skippedJavaMods ? '. Java-модов не запущено: ' + result.content.skippedJavaMods : '')
      : result.error);
    if (!result.success) setLaunchActive(false);
  } catch (error) { report(error.message); setLaunchActive(false); }
  finally { launchRequestPending = false; void refreshLaunchState(); }
});
