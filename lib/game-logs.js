const fs = require('node:fs');
const path = require('node:path');

class GameLogs {
  constructor({ root, directory, secrets = [], emit = () => {}, language = 'ru' }) {
    this.root = root;
    this.started = Date.now();
    this.secrets = secrets.filter(value => typeof value === 'string' && value.length > 5);
    this.emit = emit;
    this.language = ['ru', 'en', 'es'].includes(language) ? language : 'en';
    try { fs.mkdirSync(directory, { recursive: true }); } catch { }
    this.file = path.join(directory, `minecraft-${new Date().toISOString().replace(/[:.]/g, '-')}.log`);
    this.bytes = 0;
    this.write('launcher', 'Preparing Minecraft');
  }
  redact(value) {
    let text = String(value);
    for (const secret of this.secrets) text = text.split(secret).join('[REDACTED]');
    return text.replace(/((?:--accessToken|--clientToken|[\w.-]*(?:token|signature|password))\s*[=: ]\s*)[^\s,"']+/gi, '$1[REDACTED]');
  }
  write(source, value) {
    const text = this.redact(value).slice(-65536);
    try {
      // Bound each session file; keep reading process pipes even at the limit.
      if (this.bytes < 16 * 1024 * 1024) {
        const level = source.includes('debug') || source === 'lifecycle' ? 'DEBUG' : /\b(error|fatal|severe)\b/i.test(text) ? 'ERROR' : /\bwarn(?:ing)?\b/i.test(text) ? 'WARN' : 'INFO';
        const line = `[${new Date().toISOString()}] [${level}] [${source}] ${text}\n`;
        fs.appendFileSync(this.file, line, 'utf8');
        this.bytes += Buffer.byteLength(line);
      }
    } catch { /* Disk failures must not stop the game. */ }
    return text;
  }
  lifecycle(event) {
    this.write('lifecycle', JSON.stringify(event));
    const copy = ({
      ru: { stage: 'Этап запуска', attached: 'Процесс игры создан', stop: 'Запрошена остановка игры', accepted: 'Запрос остановки принят', rejected: 'Не удалось остановить игру', cancelled: 'Запуск отменён пользователем', closed: 'Игра закрыта', failed: 'Игра завершилась с ошибкой', error: 'Ошибка запуска', signal: 'Сигнал', code: 'Код', method: 'Способ', methods: { 'cancel-preparation': 'отмена подготовки', WM_CLOSE: 'штатное закрытие окна', SIGTERM: 'сигнал завершения', 'launch-error': 'ошибка подготовки', 'process-exit': 'выход процесса' } },
      en: { stage: 'Launch stage', attached: 'Game process created', stop: 'Game stop requested', accepted: 'Stop request accepted', rejected: 'Unable to stop the game', cancelled: 'Launch cancelled by user', closed: 'Game closed', failed: 'Game exited with an error', error: 'Launch error', signal: 'Signal', code: 'Code', method: 'Method', methods: { 'cancel-preparation': 'cancel preparation', WM_CLOSE: 'close game window', SIGTERM: 'termination signal', 'launch-error': 'preparation error', 'process-exit': 'process exit' } },
      es: { stage: 'Etapa de inicio', attached: 'Proceso del juego creado', stop: 'Se solicitó detener el juego', accepted: 'Solicitud de cierre aceptada', rejected: 'No se pudo detener el juego', cancelled: 'Inicio cancelado por el usuario', closed: 'Juego cerrado', failed: 'El juego terminó con un error', error: 'Error de inicio', signal: 'Señal', code: 'Código', method: 'Método', methods: { 'cancel-preparation': 'cancelar preparación', WM_CLOSE: 'cerrar ventana del juego', SIGTERM: 'señal de cierre', 'launch-error': 'error de preparación', 'process-exit': 'salida del proceso' } }
    })[this.language];
    let level = 'debug', message;
    if (event.event === 'stage') message = `${copy.stage}: ${event.stage}`;
    if (event.event === 'process-attached') message = `${copy.attached} · PID ${event.pid}`;
    if (event.event === 'stop-requested') { level = 'info'; message = copy.stop; }
    if (event.event === 'stop-accepted') message = `${copy.accepted} · ${copy.methods[event.method] || event.method}`;
    if (event.event === 'stop-rejected') { level = 'warn'; message = copy.rejected; }
    if (event.event === 'finished') {
      const cancelled = event.errorCode === 'LAUNCH_CANCELLED' || event.method === 'cancel-preparation';
      level = cancelled ? 'warn' : event.method === 'launch-error' || event.errorCode || event.signal || event.code !== 0 ? 'error' : 'info';
      message = cancelled ? copy.cancelled : event.method === 'launch-error' || event.errorCode ? `${copy.error}: ${event.reason}` : event.code === 0 && !event.signal ? copy.closed : copy.failed;
      if (event.code != null) message += ` · ${copy.code}: ${event.code}`;
      if (event.signal) message += ` · ${copy.signal}: ${event.signal}`;
      if (event.requestedStop || level === 'error') message += ` · ${copy.method}: ${copy.methods[event.method] || event.method}`;
    }
    if (message) this.emit('launch-log', { level, message: this.redact(message) });
  }
  async collect(code, stopped = false) {
    this.write('exit', `code=${code}; requestedStop=${stopped}`);
    const candidates = [path.join(this.root, 'logs', 'latest.log')];
    for (const directory of [path.join(this.root, 'crash-reports'), this.root]) {
      try {
        const files = (await fs.promises.readdir(directory, { withFileTypes: true }))
          .filter(entry => entry.isFile() && /^(crash-.*\.txt|hs_err_pid\d+\.log)$/.test(entry.name));
        candidates.push(...files.map(entry => path.join(directory, entry.name)));
      } catch { /* Some versions create no crash-report folder. */ }
    }
    const recent = [];
    for (const file of candidates) {
      try {
        const stat = await fs.promises.lstat(file);
        if (stat.isFile() && !stat.isSymbolicLink() && stat.mtimeMs >= this.started - 2000) recent.push({ file, stat });
      } catch { }
    }
    for (const { file, stat } of recent.sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs).slice(0, 5)) {
      const handle = await fs.promises.open(file, 'r');
      try {
        const buffer = Buffer.alloc(Math.min(stat.size, 65536));
        const { bytesRead } = await handle.read(buffer, 0, buffer.length, Math.max(0, stat.size - buffer.length));
        const text = this.write(path.basename(file), buffer.subarray(0, bytesRead).toString('utf8'));
        if (!stopped && (code !== 0 || path.basename(file) !== 'latest.log')) this.emit('launch-log', `\n--- ${path.basename(file)} ---\n${text}`);
      } finally { await handle.close(); }
    }
    this.emit('launch-log', `Game log: ${this.file}`);
    return this.file;
  }
}
module.exports = { GameLogs };
