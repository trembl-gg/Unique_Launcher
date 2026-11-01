const http = require('http');
const Module = require('module');
const path = require('path');

const root = path.resolve(process.env.UNIQUE_WEBVIEW2_ROOT || path.join(__dirname, '..'));
const handlers = new Map();
const { BackendEvents } = require(path.join(root, 'lib', 'backend-events'));
const events = new BackendEvents();
const stdioTransport = process.env.UNIQUE_BACKEND_TRANSPORT === 'stdio';

function emitEvent(channel, data) {
  if (stdioTransport) process.stdout.write(`UNIQUE_RPC:${JSON.stringify({ type: 'event', channel, data })}\n`);
  else events.emit(channel, data);
}

const { createElectronShim } = require('./electron-shim');
const electronShim = createElectronShim({ handlers, emitEvent, root });
const originalLoad = Module._load;

Module._load = function patchedLoad(request, parent, isMain) {
  if (request === 'electron') {
    return electronShim;
  }
  if (request === 'electron-updater') {
    return { autoUpdater: null };
  }
  return originalLoad.call(this, request, parent, isMain);
};

process.env.UNIQUE_WEBVIEW2_BACKEND = '1';
process.resourcesPath = root;
process.chdir(root);
require(path.join(root, 'main.js'));

function readBody(request) {
  return new Promise((resolve, reject) => {
    let body = '';
    request.setEncoding('utf8');
    request.on('data', (chunk) => {
      body += chunk;
      if (body.length > 50 * 1024 * 1024) {
        request.destroy(new Error('Request body is too large.'));
      }
    });
    request.on('end', () => resolve(body || 'null'));
    request.on('error', reject);
  });
}

function sendJson(response, statusCode, payload) {
  const body = JSON.stringify(payload);
  response.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
    'Cache-Control': 'no-store'
  });
  response.end(body);
}

async function handleInvoke(request, response, channel) {
  const handler = handlers.get(channel);
  if (!handler) {
    sendJson(response, 404, { ok: false, error: `Unknown backend channel: ${channel}` });
    return;
  }

  try {
    const body = await readBody(request);
    const payload = body ? JSON.parse(body) : null;
    const event = {
      sender: {
        send: emitEvent
      }
    };
    const result = await handler(event, payload);
    sendJson(response, 200, { ok: true, result });
  } catch (err) {
    sendJson(response, 500, { ok: false, error: err?.message || String(err) });
  }
}

function handleEvents(request, response) {
  response.writeHead(200, {
    'Content-Type': 'text/event-stream; charset=utf-8',
    'Cache-Control': 'no-cache, no-store',
    Connection: 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  response.write(': connected\n\n');
  events.connect(response, Number(request.headers['last-event-id']) || 0);
  const heartbeat = setInterval(() => response.write(': heartbeat\n\n'), 15000);
  request.on('close', () => { clearInterval(heartbeat); events.disconnect(response); });
}

function startHttpServer() {
const server = http.createServer((request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || '127.0.0.1'}`);

  if (request.method === 'GET' && url.pathname === '/health') {
    sendJson(response, 200, { ok: true, handlers: handlers.size });
    return;
  }

  if (request.method === 'GET' && url.pathname === '/events') {
    handleEvents(request, response);
    return;
  }

  if (request.method === 'POST' && url.pathname.startsWith('/invoke/')) {
    const channel = decodeURIComponent(url.pathname.slice('/invoke/'.length));
    handleInvoke(request, response, channel);
    return;
  }

  sendJson(response, 404, { ok: false, error: 'Not found.' });
});

const port = Number(process.env.UNIQUE_WEBVIEW2_BACKEND_PORT || 48129);
server.listen(port, '127.0.0.1', () => {
  process.stdout.write(`UNIQUE WebView2 backend listening on 127.0.0.1:${port}\n`);
});

process.on('SIGTERM', () => server.close(() => process.exit(0)));
process.on('SIGINT', () => server.close(() => process.exit(0)));
}

if (stdioTransport) {
  // Let the app.whenReady microtask complete before announcing readiness.
  Promise.resolve().then(() => {
    const { serveStdio } = require(path.join(root, 'lib', 'stdio-transport'));
    serveStdio({ handlers, input: process.stdin, output: process.stdout, emitEvent, onClose: () => process.exit(0) });
  });
} else startHttpServer();
