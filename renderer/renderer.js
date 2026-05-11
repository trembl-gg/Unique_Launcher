const authScreen = document.getElementById('auth-screen');
const launcherScreen = document.getElementById('launcher-screen');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginTab = document.getElementById('login-tab');
const registerTab = document.getElementById('register-tab');
const loginMessage = document.getElementById('login-message');
const registerMessage = document.getElementById('register-message');
const totpHint = document.getElementById('totp-hint');
const launchStatus = document.getElementById('launch-status');
const launchLog = document.getElementById('launch-log');
const modsList = document.getElementById('mods-list');
const modsFolder = document.getElementById('mods-folder');
const authModsCount = document.getElementById('auth-mods-count');
const serverInfo = document.getElementById('server-info');
const serverLabel = document.getElementById('server-label');
const activeUserLabel = document.getElementById('active-user');
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
const sectionTabs = Array.from(document.querySelectorAll('.section-tab'));
const imageIds = new WeakMap();
let nextImageId = 1;

const fields = {
  loginNick: document.getElementById('login-nick'),
  loginPassword: document.getElementById('login-password'),
  loginTotp: document.getElementById('login-totp'),
  registerNick: document.getElementById('register-nick'),
  registerPassword: document.getElementById('register-password'),
  registerTotp: document.getElementById('register-totp'),
  memoryMax: document.getElementById('memory-max'),
  memoryMaxLabel: document.getElementById('memory-max-label'),
  minecraftVersion: document.getElementById('minecraft-version'),
  fabricLoaderVersion: document.getElementById('fabric-loader-version'),
  javaPath: document.getElementById('java-path'),
  skinPreview: document.getElementById('skin-preview'),
  skinName: document.getElementById('skin-name'),
  skinModel: document.getElementById('skin-model'),
  capePreview: document.getElementById('cape-preview'),
  capeName: document.getElementById('cape-name'),
  hideLauncherDuringGame: document.getElementById('hide-launcher-during-game'),
  profileYoutube: document.getElementById('profile-youtube'),
  profileTwitch: document.getElementById('profile-twitch')
};

let activeUser = null;
let currentSettings = null;
let currentProfile = null;
let systemInfo = null;
let launchActive = false;
let spaceAnimationFrame = null;
let spotifyRefreshTimer = null;
let spotifyProgressTimer = null;
let spotifyPlayback = null;
let spotifyRefreshInFlight = false;
const SPOTIFY_REFRESH_INTERVAL_MS = 2500;
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
  setButtonIconText(document.getElementById('logout-button'), 'logout', document.getElementById('logout-button')?.textContent || 'Выйти');
  setButtonIconText(document.getElementById('refresh-mods'), 'refresh', document.getElementById('refresh-mods')?.textContent || 'Обновить');
  setButtonIconText(document.getElementById('select-java'), 'java', document.getElementById('select-java')?.textContent || 'Выбрать');
  setButtonIconText(document.getElementById('choose-wallpaper'), 'folder', document.getElementById('choose-wallpaper')?.textContent || 'Выбрать PNG/JPG');
  setButtonIconText(document.getElementById('save-profile-links'), 'save', document.getElementById('save-profile-links')?.textContent || 'Сохранить профиль');
  setButtonIconText(document.getElementById('connect-spotify'), 'music', document.getElementById('connect-spotify')?.textContent || 'Привязать Spotify');
  setButtonIconText(document.getElementById('refresh-spotify'), 'refresh', document.getElementById('refresh-spotify')?.textContent || 'Обновить');
  setButtonIconText(document.getElementById('disconnect-spotify'), 'link', document.getElementById('disconnect-spotify')?.textContent || 'Отключить');
  setButtonIconText(document.getElementById('clear-log'), 'trash', document.getElementById('clear-log')?.textContent || 'Очистить');
  setButtonIconText(launchButton, 'play', launchButton?.textContent || 'Запустить Fabric');
  prependTileIcon(document.getElementById('select-skin'), 'skin');
  prependTileIcon(document.getElementById('select-cape'), 'cape');
}

function setAuthMode(mode) {
  const isLogin = mode === 'login';
  loginForm.classList.toggle('hidden', !isLogin);
  registerForm.classList.toggle('hidden', isLogin);
  loginTab.classList.toggle('active', isLogin);
  registerTab.classList.toggle('active', !isLogin);
  loginMessage.textContent = '';
  registerMessage.textContent = '';
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
  const allowed = new Set(['main', 'settings', 'profile']);
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

  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, 'rgba(17, 24, 39, 0.76)');
  gradient.addColorStop(1, 'rgba(76, 29, 149, 0.24)');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
  for (let x = 18; x < width; x += 18) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, height);
    ctx.stroke();
  }

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

function applySettingsToUi() {
  const memory = currentSettings.memory;
  fields.memoryMax.value = memory.max;
  fields.memoryMaxLabel.textContent = memory.max;
  fields.minecraftVersion.value = currentSettings.minecraftVersion || '1.20.1';
  fields.fabricLoaderVersion.value = currentSettings.fabricLoaderVersion || 'latest';
  fields.javaPath.value = currentSettings.javaPath || '';
  fields.skinModel.value = currentSettings.skinModel || 'auto';
  versionLabel.textContent = fields.minecraftVersion.value;
  serverInfo.textContent = `${currentSettings.server.host}:${currentSettings.server.port}`;
  serverLabel.textContent = currentSettings.server.name;
  fields.hideLauncherDuringGame.checked = Boolean(currentSettings.hideLauncherDuringGame);
  wallpaperName.textContent = currentSettings.wallpaper ? shortPath(currentSettings.wallpaper) : 'обои не выбраны';
  fields.skinName.textContent = currentSettings.skin ? shortPath(currentSettings.skin) : 'не выбран';
  fields.capeName.textContent = currentSettings.cape ? shortPath(currentSettings.cape) : 'не выбран';
}

async function refreshPreviews() {
  await Promise.all([
    setWallpaperPreview(currentSettings.wallpaper),
    setImagePreview(fields.skinPreview, currentSettings.skin),
    setImagePreview(fields.capePreview, currentSettings.cape),
    refreshPlayerPreviewAssets()
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
    javaPath: fields.javaPath.value.trim(),
    hideLauncherDuringGame: fields.hideLauncherDuringGame.checked
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
  const result = await window.api.listMods();
  modsList.innerHTML = '';

  if (!result.success) {
    modsList.innerHTML = `<li class="empty-row">Ошибка: ${result.error}</li>`;
    authModsCount.textContent = '0';
    return;
  }

  authModsCount.textContent = String(result.mods.length);

  if (result.mods.length === 0) {
    modsList.innerHTML = '<li class="empty-row">Папка mods пока пустая</li>';
    return;
  }

  result.mods.forEach((mod) => {
    const item = document.createElement('li');
    item.innerHTML = `<span>${mod.name}</span><small>${mod.sizeMb} МБ</small>`;
    modsList.appendChild(item);
  });
}

function formatSpotifyTime(ms) {
  const totalSeconds = Math.max(0, Math.floor(Number(ms || 0) / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
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
  profileStatus.textContent = activeUser ? activeUser.nickname : 'UNIQUE';
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

async function loadAppState() {
  systemInfo = await window.api.getSystemInfo();
  currentSettings = await window.api.getSettings({ nickname: activeUser?.nickname || '' });
  modsFolder.textContent = systemInfo.modsFolder;
  systemMemory.textContent = `${systemInfo.totalMemoryMb} МБ RAM | ${systemInfo.refreshRate} Hz`;
  applySettingsToUi();
  await Promise.all([refreshMods(), refreshPreviews(), loadProfile()]);
  startSpotifyRefresh();
}

async function enterLauncher(user) {
  activeUser = user;
  activeUserLabel.textContent = activeUser.nickname;
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
  const file = await window.api.chooseFile({ filters: [{ name: 'HD skin PNG', extensions: ['png'] }] });
  if (!file) return;

  await saveSettings({ skin: file.path });
  fields.skinName.textContent = file.name;
  await setImagePreview(fields.skinPreview, file.path);
  await refreshPlayerPreviewAssets();
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

  await saveSettings();
  setLaunchActive(true);
  launchStatus.textContent = 'Подготовка Fabric-клиента...';
  appendLog('Запуск Minecraft Fabric...');

  const result = await window.api.launchMinecraft({
    user: activeUser,
    memory: currentSettings.memory,
    settings: currentSettings
  });

  if (!result.success) {
    launchStatus.textContent = result.error;
    appendLog(`Ошибка: ${result.error}`);
    setLaunchActive(false);
    return;
  }

  const modsText = result.syncedMods.length > 0
    ? `Синхронизировано модов: ${result.syncedMods.length}.`
    : 'Моды уже актуальны.';
  const wallpaperText = result.wallpaperPack ? ` Обои: ${result.wallpaperPack}.` : '';
  const skinText = result.playerAssetsPack ? ` Скин: ${result.playerAssetsPack}.` : '';
  const fabricText = result.fabric ? ` Fabric Loader: ${result.fabric.loaderVersion}.` : '';
  const fpsText = result.maxFps ? ` FPS limit: ${result.maxFps}.` : '';
  launchStatus.textContent = `${modsText}${wallpaperText}${skinText}${fabricText}${fpsText}`;
}

function updateMemoryLabels() {
  fields.memoryMaxLabel.textContent = fields.memoryMax.value;
}

function setLaunchActive(active) {
  launchActive = active;
  setButtonIconText(launchButton, active ? 'stop' : 'play', active ? 'Остановить запуск' : 'Запустить Fabric');
  launchButton.classList.toggle('danger', active);
}

function startSpaceEffect() {
  if (!spaceCanvas) return;

  const ctx = spaceCanvas.getContext('2d');
  const stars = [];
  const starCount = 160;
  let width = 0;
  let height = 0;
  let dpr = 1;

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
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, 'rgba(12, 18, 38, 0.9)');
    gradient.addColorStop(0.45, 'rgba(35, 20, 68, 0.52)');
    gradient.addColorStop(1, 'rgba(3, 7, 18, 0.92)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.translate(Math.sin(time / 9000) * 24, Math.cos(time / 11000) * 18);
    for (let i = 0; i < 5; i += 1) {
      const y = (height / 6) * (i + 1);
      const band = ctx.createLinearGradient(0, y - 80, width, y + 80);
      band.addColorStop(0, 'rgba(124, 58, 237, 0)');
      band.addColorStop(0.5, i % 2 ? 'rgba(34, 211, 238, 0.16)' : 'rgba(167, 139, 250, 0.16)');
      band.addColorStop(1, 'rgba(124, 58, 237, 0)');
      ctx.fillStyle = band;
      ctx.fillRect(0, y - 90, width, 180);
    }
    ctx.restore();
  }

  function tick(time) {
    drawNebula(time);

    for (const star of stars) {
      star.y += star.drift * star.z;
      star.x += Math.sin((time * 0.0002) + star.y * 0.01) * 0.08;
      if (star.y > height + 8) {
        star.y = -8;
        star.x = Math.random() * width;
      }

      const alpha = 0.28 + Math.sin(time * 0.002 * star.z + star.x) * 0.16 + star.glow * 0.34;
      ctx.fillStyle = `rgba(255, 255, 255, ${Math.max(0.12, Math.min(0.9, alpha))})`;
      ctx.fillRect(star.x, star.y, star.size, star.size);
    }

    spaceAnimationFrame = requestAnimationFrame(tick);
  }

  window.addEventListener('resize', resize);
  resize();
  spaceAnimationFrame = requestAnimationFrame(tick);
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

window.addEventListener('focus', refreshSpotifyNowPlaying);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    refreshSpotifyNowPlaying();
  }
});

loginTab.addEventListener('click', () => setAuthMode('login'));
registerTab.addEventListener('click', () => setAuthMode('register'));
sectionTabs.forEach((button) => {
  button.addEventListener('click', () => setLauncherSection(button.dataset.section));
});
loginForm.addEventListener('submit', login);
registerForm.addEventListener('submit', register);
document.getElementById('window-minimize').addEventListener('click', () => controlWindow('minimize'));
windowMaximizeButton.addEventListener('click', () => controlWindow('maximize'));
document.getElementById('window-close').addEventListener('click', () => controlWindow('close'));
document.getElementById('logout-button').addEventListener('click', async () => {
  await window.api.logout({ sessionToken: activeUser?.sessionToken });
  stopSpotifyRefresh();
  activeUser = null;
  currentProfile = null;
  launcherScreen.classList.add('hidden');
  authScreen.classList.remove('hidden');
  setAuthMode('login');
});
document.getElementById('refresh-mods').addEventListener('click', refreshMods);
document.getElementById('select-skin').addEventListener('click', selectSkin);
document.getElementById('select-cape').addEventListener('click', selectCape);
document.getElementById('choose-wallpaper').addEventListener('click', selectWallpaper);
document.getElementById('select-java').addEventListener('click', selectJava);
document.getElementById('save-profile-links').addEventListener('click', saveProfileLinks);
document.getElementById('connect-spotify').addEventListener('click', connectSpotify);
document.getElementById('disconnect-spotify').addEventListener('click', disconnectSpotify);
document.getElementById('refresh-spotify').addEventListener('click', refreshSpotifyNowPlaying);
launchButton.addEventListener('click', launchMinecraft);
document.getElementById('clear-log').addEventListener('click', () => { launchLog.textContent = ''; });

document.querySelectorAll('.preset-button').forEach((button) => {
  button.addEventListener('click', async () => {
    fields.memoryMax.value = button.dataset.max;
    updateMemoryLabels();
    await saveSettings();
  });
});

fields.memoryMax.addEventListener('input', updateMemoryLabels);
fields.memoryMax.addEventListener('change', () => saveSettings());
fields.hideLauncherDuringGame.addEventListener('change', () => saveSettings());
fields.skinModel.addEventListener('change', async () => {
  await saveSettings();
  drawPlayerPreview();
});

[fields.minecraftVersion, fields.fabricLoaderVersion, fields.javaPath].forEach((input) => {
  input.addEventListener('change', () => saveSettings());
});

fields.minecraftVersion.addEventListener('input', () => {
  versionLabel.textContent = fields.minecraftVersion.value.trim() || '1.20.1';
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

async function init() {
  setAuthMode('login');
  prepareLauncherSections();
  setLauncherSection('main');
  installSvgIcons();
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
