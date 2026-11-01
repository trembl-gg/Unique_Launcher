const childProcess = require('child_process');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

function getPackageVersion(root) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version || '0.0.0';
  } catch (err) {
    return '0.0.0';
  }
}

function openTarget(target) {
  const value = String(target || '').trim();
  if (!value) return;
  if (process.platform === 'win32') {
    // Do not use `cmd /c start`: command separators such as `&` truncate OAuth query parameters.
    childProcess.spawn('rundll32.exe', ['url.dll,FileProtocolHandler', value], {
      detached: true,
      stdio: 'ignore',
      windowsHide: true
    }).unref();
    return;
  }
  const command = process.platform === 'darwin' ? 'open' : 'xdg-open';
  childProcess.spawn(command, [value], { detached: true, stdio: 'ignore' }).unref();
}

function parsePng(buffer) {
  if (buffer.length < 33 || buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') {
    return null;
  }

  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const bitDepth = buffer[24];
  const colorType = buffer[25];
  const chunks = [];
  let offset = 8;
  while (offset + 12 <= buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const start = offset + 8;
    const end = start + length;
    if (end > buffer.length) break;
    if (type === 'IDAT') chunks.push(buffer.subarray(start, end));
    if (type === 'IEND') break;
    offset = end + 4;
  }

  return { width, height, bitDepth, colorType, idat: Buffer.concat(chunks) };
}

function paeth(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

function decodePngRgba(buffer) {
  const png = parsePng(buffer);
  if (!png || png.bitDepth !== 8 || ![2, 6].includes(png.colorType) || !png.idat.length) {
    return null;
  }

  const zlib = require('zlib');
  const channels = png.colorType === 6 ? 4 : 3;
  const bpp = channels;
  const rowBytes = png.width * channels;
  const inflated = zlib.inflateSync(png.idat);
  const raw = Buffer.alloc(png.height * rowBytes);
  let source = 0;

  for (let y = 0; y < png.height; y += 1) {
    const filter = inflated[source++];
    const rowStart = y * rowBytes;
    const previousRowStart = (y - 1) * rowBytes;

    for (let x = 0; x < rowBytes; x += 1) {
      const value = inflated[source++];
      const left = x >= bpp ? raw[rowStart + x - bpp] : 0;
      const up = y > 0 ? raw[previousRowStart + x] : 0;
      const upLeft = y > 0 && x >= bpp ? raw[previousRowStart + x - bpp] : 0;
      let next = value;
      if (filter === 1) next = value + left;
      else if (filter === 2) next = value + up;
      else if (filter === 3) next = value + Math.floor((left + up) / 2);
      else if (filter === 4) next = value + paeth(left, up, upLeft);
      raw[rowStart + x] = next & 0xff;
    }
  }

  const rgba = Buffer.alloc(png.width * png.height * 4);
  for (let src = 0, dst = 0; src < raw.length; src += channels, dst += 4) {
    rgba[dst] = raw[src];
    rgba[dst + 1] = raw[src + 1];
    rgba[dst + 2] = raw[src + 2];
    rgba[dst + 3] = channels === 4 ? raw[src + 3] : 255;
  }
  return { width: png.width, height: png.height, rgba };
}

function convertImageToPng(filePath, fallbackBuffer) {
  if (process.platform !== 'win32') return fallbackBuffer;

  const tempPath = path.join(os.tmpdir(), `unique-${crypto.randomBytes(8).toString('hex')}.png`);
  const escapedSource = String(filePath).replace(/'/g, "''");
  const escapedTarget = tempPath.replace(/'/g, "''");
  const script = [
    'Add-Type -AssemblyName System.Drawing',
    `$img=[System.Drawing.Image]::FromFile('${escapedSource}')`,
    `$img.Save('${escapedTarget}', [System.Drawing.Imaging.ImageFormat]::Png)`,
    '$img.Dispose()'
  ].join('; ');

  const result = childProcess.spawnSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', script], {
    encoding: 'utf8',
    timeout: 15000,
    windowsHide: true
  });

  if (result.status === 0 && fs.existsSync(tempPath)) {
    const png = fs.readFileSync(tempPath);
    fs.rmSync(tempPath, { force: true });
    return png;
  }

  return fallbackBuffer;
}

function createNativeImage(filePath) {
  const buffer = fs.existsSync(filePath) ? fs.readFileSync(filePath) : Buffer.alloc(0);
  const png = parsePng(buffer);
  const decoded = png ? decodePngRgba(buffer) : null;

  return {
    isEmpty: () => buffer.length === 0,
    getSize: () => ({
      width: png?.width || decoded?.width || 0,
      height: png?.height || decoded?.height || 0
    }),
    toBitmap: () => {
      if (decoded?.rgba) return decoded.rgba;
      const size = png ? png.width * png.height * 4 : 0;
      const rgba = Buffer.alloc(size, 255);
      return rgba;
    },
    toPNG: () => (png ? buffer : convertImageToPng(filePath, buffer)),
    resize: () => createNativeImage(filePath)
  };
}

function createElectronShim({ handlers, emitEvent, root }) {
  const userData = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'minecraft-launcher');

  const fakeWindow = {
    isDestroyed: () => false,
    isMaximized: () => false,
    minimize: () => emitEvent('window-control', 'minimize'),
    maximize: () => emitEvent('window-maximized-state', true),
    unmaximize: () => emitEvent('window-maximized-state', false),
    close: () => process.exit(0),
    show: () => emitEvent('window-control', 'show'),
    hide: () => emitEvent('window-control', 'hide'),
    getBounds: () => ({ x: 0, y: 0, width: 1920, height: 1080 }),
    webContents: { send: emitEvent },
    on: () => {},
    once: () => {},
    loadFile: () => {}
  };

  return {
    app: {
      isPackaged: true,
      getVersion: () => getPackageVersion(root),
      getPath: (name) => {
        if (name === 'userData') return userData;
        if (name === 'temp') return os.tmpdir();
        if (name === 'logs') return path.join(userData, 'logs');
        return userData;
      },
      whenReady: () => Promise.resolve(),
      on: () => {},
      quit: () => process.exit(0),
      setAppUserModelId: () => {}
    },
    BrowserWindow: Object.assign(function BrowserWindow() { return fakeWindow; }, {
      fromWebContents: () => fakeWindow,
      getAllWindows: () => [fakeWindow]
    }),
    ipcMain: {
      handle: (channel, handler) => handlers.set(channel, handler),
      on: () => {},
      once: () => {},
      removeListener: () => {},
      removeAllListeners: () => {}
    },
    dialog: {
      showOpenDialog: async () => ({ canceled: true, filePaths: [] }),
      showSaveDialog: async () => ({ canceled: true, filePath: '' })
    },
    nativeImage: {
      createFromPath: createNativeImage
    },
    Menu: {
      setApplicationMenu: () => {}
    },
    screen: {
      getPrimaryDisplay: () => ({ displayFrequency: Number(process.env.UNIQUE_REFRESH_RATE || 60) }),
      getDisplayMatching: () => ({ displayFrequency: Number(process.env.UNIQUE_REFRESH_RATE || 60) })
    },
    shell: {
      openPath: async (target) => {
        openTarget(target);
        return '';
      },
      openExternal: async (target) => {
        openTarget(target);
        return true;
      },
      showItemInFolder: (target) => {
        if (process.platform === 'win32') {
          childProcess.spawn('explorer.exe', ['/select,', String(target || '')], {
            detached: true,
            stdio: 'ignore',
            windowsHide: true
          }).unref();
          return;
        }
        openTarget(path.dirname(String(target || '')));
      }
    },
    clipboard: {
      writeText: (text) => {
        const child = childProcess.spawn('clip.exe', { windowsHide: true });
        child.stdin.end(String(text || ''));
      }
    }
  };
}

module.exports = { createElectronShim };
