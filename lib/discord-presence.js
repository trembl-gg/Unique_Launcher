const { DiscordActivity } = require('./discord-activity');

class DiscordPresence {
  constructor({ clientId, launcherName, getUserProfile, getDiscordButtons, store, sessionKey, withTimeout, getLanguage = () => 'ru' }) {
    this.getLanguage = getLanguage;
    Object.assign(this, { DISCORD_CLIENT_ID: clientId, LAUNCHER_NAME: launcherName, getUserProfile, getDiscordButtons, store, SESSION_KEY: sessionKey, withTimeout });
    this.rpcDisabledUntil = 0;
    this.rpcContext = null;
    this.socialRotationStartedAt = Date.now();
  }
  disconnectDiscordRpc() {
    this.rpcReady = false;
    this.rpcConnecting = false;
    const client = this.rpcClient;
    this.rpcClient = null;
    if (typeof client?.destroy === 'function') Promise.resolve().then(() => client.destroy()).catch(() => {});
  }

  ensureDiscordRpc() {
    if (!this.DISCORD_CLIENT_ID || this.rpcReady || this.rpcConnecting || Date.now() < this.rpcDisabledUntil) {
      return;
    }

    this.rpcConnecting = true;
    try {
      this.DiscordRPC = this.DiscordRPC || require('discord-rpc');
      this.DiscordRPC.register(this.DISCORD_CLIENT_ID);
      const client = new this.DiscordRPC.Client({ transport: 'ipc' });
      this.rpcClient = client;
      const disconnected = () => {
        if (this.rpcClient !== client) return;
        this.disconnectDiscordRpc();
        this.rpcDisabledUntil = Date.now() + 15000;
      };
      client.on('disconnected', disconnected);
      client.on('error', disconnected);

      client.on('ready', () => {
        if (this.rpcClient !== client) return;
        this.rpcReady = true;
        this.rpcConnecting = false;
        this.rpcDisabledUntil = 0;
        if (this.rpcContext) {
          this.updateDiscordRpc(this.rpcContext);
        }
      });

      this.withTimeout(client.login({ clientId: this.DISCORD_CLIENT_ID }), 3500, 'Discord Activity connection timed out')
        .catch(() => {
          if (this.rpcClient === client) {
            this.disconnectDiscordRpc();
            this.rpcDisabledUntil = Date.now() + 60000;
          }
        })
        .finally(() => {
          if (this.rpcClient === client && !this.rpcReady) {
            this.rpcConnecting = false;
          }
        });
    } catch (err) {
      this.rpcConnecting = false;
      this.rpcDisabledUntil = Date.now() + 60000;
      this.disconnectDiscordRpc();
    }
  }

  async updateDiscordRpc(context = this.rpcContext) {
    if (!context) {
      return;
    }

    // Idle presence follows the selected account; a running game keeps its launch account.
    const session = !context.memoryMax ? this.store?.get(this.SESSION_KEY, null) : null;
    if (session?.nickname) {
      context = {
        ...context, nickname: session.nickname, guest: Boolean(session.guest),
        microsoft: Boolean(session.microsoft), remote: Boolean(session.remote),
        license: Boolean(session.license || session.microsoft || session.remote)
      };
    }
    if (this.rpcContext?.nickname !== context.nickname) {
      this.socialRotationStartedAt = Date.now();
      clearInterval(this.rpcInterval);
      this.rpcInterval = null;
    }
    this.rpcContext = context;
    if (!this.rpcInterval) {
      this.rpcInterval = setInterval(() => this.updateDiscordRpc(), 10000);
      this.rpcInterval.unref?.();
    }
    if (!this.rpcReady || !this.rpcClient) {
      this.ensureDiscordRpc();
      return;
    }

    let buttons = [];
    try { buttons = this.getDiscordButtons(context.nickname ? this.getUserProfile(context.nickname) : null); } catch { /* The required download button does not depend on profile links. */ }
    this.pendingActivity = new DiscordActivity(this.LAUNCHER_NAME).create({ ...context, section: this.section, language: this.getLanguage(context.nickname), socialIndex: Math.floor(Math.max(0, Date.now() - this.socialRotationStartedAt) / 10000) }, buttons);
    if (this.activitySending) return;
    this.activitySending = true;
    try {
      while (this.pendingActivity && this.rpcReady && this.rpcClient) {
        const activity = this.pendingActivity; this.pendingActivity = null;
        const client = this.rpcClient;
        try {
          await this.withTimeout(client.request('SET_ACTIVITY', { pid: process.pid, activity: {
            type: 0, name: activity.name, status_display_type: 2, details: activity.details, state: activity.state,
            timestamps: { start: Math.floor(activity.startTimestamp / 1000) }, buttons: activity.buttons, instance: false
          } }), 5000, 'Discord Activity update timed out');
        } catch {
          if (this.rpcClient === client) {
            this.disconnectDiscordRpc();
            this.rpcDisabledUntil = Date.now() + 15000;
          }
        }
      }
    } finally { this.activitySending = false; }
  }

  startPlayingDiscordRpc(user, settings) {
    this.rpcContext = {
      nickname: user.nickname,
      memoryMax: settings.memory.max,
      startTimestamp: Date.now(),
      guest: Boolean(user.guest),
      microsoft: Boolean(user.microsoft),
      license: Boolean(user.license || user.microsoft || user.remote),
      remote: Boolean(user.remote)
    };
    this.updateDiscordRpc(this.rpcContext);

  }

  setLauncherDiscordRpc(nickname) {
    if (!nickname) return;
    try {
      const stored = this.store.get(this.SESSION_KEY, null) || {};
      const guest = Boolean(stored.guest);
      const microsoft = Boolean(stored.microsoft);
      const remote = Boolean(stored.remote);
      const license = Boolean(stored.license || microsoft || remote);
      this.updateDiscordRpc({
        ...(this.rpcContext || {}),
        nickname,
        memoryMax: null,
        details: `In ${this.LAUNCHER_NAME}`,
        state: 'Launcher is open',
        startTimestamp: this.rpcContext?.startTimestamp || Date.now(),
        guest,
        microsoft,
        remote,
        license
      });
    } catch (e) {
      this.updateDiscordRpc({ ...(this.rpcContext || {}), nickname, memoryMax: null, details: `In ${this.LAUNCHER_NAME}`, state: 'Launcher is open', startTimestamp: this.rpcContext?.startTimestamp || Date.now() });
    }
  }

  stopPlayingDiscordRpc() {
    if (this.rpcInterval) {
      clearInterval(this.rpcInterval);
      this.rpcInterval = null;
    }

    const nickname = this.rpcContext?.nickname;
    this.rpcContext = {
      ...this.rpcContext,
      details: `In ${this.LAUNCHER_NAME}`,
      state: 'Launcher is open',
      startTimestamp: Date.now(),
      ...(nickname ? { nickname, memoryMax: null } : {})
    };
    this.updateDiscordRpc(this.rpcContext);
  }
}
module.exports = { DiscordPresence };
