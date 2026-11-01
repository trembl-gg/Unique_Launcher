const readline = require('node:readline');

const PREFIX = 'UNIQUE_RPC:';

function serveStdio({ handlers, input, output, emitEvent, onClose = () => {} }) {
  const send = message => output.write(`${PREFIX}${JSON.stringify(message)}\n`);
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  let pending = 0;
  lines.on('line', async line => {
    let request;
    try { request = JSON.parse(line); } catch { return; }
    const { id, channel, payload } = request || {};
    if (!Number.isSafeInteger(id) || typeof channel !== 'string') return;
    const respond = result => send({ type: 'invoke-result', id, ...result });
    const handler = handlers.get(channel);
    if (!handler) { respond({ ok: false, error: `Unknown backend channel: ${channel}` }); return; }
    if (pending >= 128) { respond({ ok: false, error: 'Too many pending requests.' }); return; }
    pending++;
    try {
      const result = await handler({ sender: { send: emitEvent } }, payload);
      respond({ ok: true, result: result === undefined ? null : result });
    } catch (error) { respond({ ok: false, error: error?.message || String(error) }); }
    finally { pending--; }
  });
  lines.on('close', onClose);
  send({ type: 'ready', handlers: handlers.size });
  return { close: () => lines.close() };
}

module.exports = { serveStdio, PREFIX };
