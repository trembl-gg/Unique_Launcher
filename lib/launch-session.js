const { execFile } = require('child_process');

/** Owns cancellation and completion of one launch, including preparation. */
class LaunchSession {
  constructor({ window, hideLauncherDuringGame, onFinish, record = () => {}, execute = execFile, platform = process.platform, engine = 'java' }) {
    this.engine = engine;
    this.execute = execute;
    this.platform = platform;
    this.window = window;
    this.hideLauncherDuringGame = hideLauncherDuringGame;
    this.onFinish = onFinish;
    this.record = record;
    this.stage = 'preparation';
    this.process = null;
    this.cancelled = false;
    this.finished = false;
    this.stopRequested = false;
    this.setStage('preparation');
  }

  setStage(stage) {
    this.stage = stage;
    this.record({ event: 'stage', stage });
  }

  checkpoint() {
    if (this.cancelled) {
      const error = new Error('Запуск отменён.');
      error.code = 'LAUNCH_CANCELLED';
      throw error;
    }
  }

  attach(process) {
    if (this.process) throw new Error('Minecraft process already attached');
    this.process = process;
    this.setStage('game-process');
    this.record({ event: 'process-attached', pid: process.pid || null });
    process.once('close', (code, signal) => this.finish(code, signal));
    process.once('error', error => this.finish(1, null, error));
  }

  finish(code = 0, signal = null, error = null) {
    if (this.finished) return;
    this.finished = true;
    signal ||= this.process?.signalCode || null;
    const reason = error?.message || (this.cancelled ? 'Launch cancelled by user during preparation'
      : this.stopRequested ? 'User requested a graceful game shutdown'
      : signal ? `Process terminated by signal ${signal}`
      : code === 0 ? 'Process exited normally'
      : 'Process exited with a nonzero or unknown code; see game stderr and crash reports for the cause');
    this.record({ event: 'finished', stage: this.stage, reason, method: this.stopMethod || (error ? 'launch-error' : 'process-exit'),
      pid: this.process?.pid || null, code, signal, requestedStop: this.stopRequested,
      errorCode: error?.code || null, stack: error?.stack || null });
    if (this.window && !this.window.isDestroyed()) this.window.show();
    this.onFinish(code);
  }

  async stop() {
    this.record({ event: 'stop-requested', stage: this.stage, pid: this.process?.pid || null, initiator: 'user' });
    if (!this.process) {
      this.stopRequested = true;
      this.cancelled = true;
      this.stopMethod = 'cancel-preparation';
      this.record({ event: 'stop-accepted', method: this.stopMethod, reason: 'Cancel remaining preparation before creating the game process' });
      return { success: true, stopped: false };
    }
    if (this.finished || this.process.exitCode !== null) {
      this.finish(this.process.exitCode || 0);
      return { success: true, stopped: true };
    }
    if (this.platform !== 'win32') {
      this.stopMethod = 'SIGTERM';
      this.stopRequested = true;
      this.process.kill('SIGTERM');
      this.record({ event: 'stop-accepted', method: this.stopMethod });
      return { success: true, stopped: false };
    }
    // WM_CLOSE lets Minecraft save worlds and shut down mods normally. Never
    // silently escalate this to TerminateProcess (which triggers crash helpers).
    const pid = Number(this.process.pid);
    if (!Number.isSafeInteger(pid) || pid <= 0) {
      this.record({ event: 'stop-rejected', reason: 'Minecraft process has no valid PID' });
      return { success: false, error: 'Не найден процесс Minecraft.' };
    }
    this.stopMethod = 'WM_CLOSE';
    const requested = await new Promise(resolve => {
      this.execute('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command',
        `$p = Get-Process -Id ${pid} -ErrorAction SilentlyContinue; if ($p) { $p.CloseMainWindow() }`],
      { windowsHide: true, timeout: 5000 }, (error, stdout) => resolve(!error && /true/i.test(stdout)));
    });
    if (requested) this.stopRequested = true;
    this.record({ event: requested ? 'stop-accepted' : 'stop-rejected', method: 'WM_CLOSE', pid,
      reason: requested ? 'CloseMainWindow accepted; waiting for actual process exit' : 'Game window did not accept CloseMainWindow' });
    return requested ? { success: true, stopped: false }
      : { success: false, error: 'Окно Minecraft ещё не готово к закрытию. Повторите после загрузки игры.' };
  }
}

module.exports = { LaunchSession };
