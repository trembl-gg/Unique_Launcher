const { DiscordActivity } = require('./discord-activity');

class DiscordPresence {
  constructor({ clientId, launcherName, getUserProfile, getDiscordButtons, store, sessionKey, withTimeout }) {
    Object.assign(this, { DISCORD_CLIENT_ID: clientId, LAUNCHER_NAME: launcherName, getUserProfile, getDiscordButtons, store, SESSION_KEY: sessionKey, withTimeout });
    this.rpcDisabledUntil = 0;
    this.rpcContext = null;
  }
  disconnectDiscordRpc() {
    this.rpcReady = false;
    this.rpcConnecting = false;
    if (this.rpcClient) {
      if (typeof this.rpcClient.destroy === 'function') {
        Promise.resolve(this.rpcClient.destroy()).catch(() => {});
      }
    }
    this.rpcClient = null;
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
        this.rpcReady = false;
        this.rpcConnecting = false;
        this.rpcClient = null;
        this.rpcDisabledUntil = Date.now() + 15000;
      };
      client.on('disconnected', disconnected);
      client.on('error', disconnected);

      client.on('ready', () => {
        if (this.rpcClient !== client) return;
        this.rpcReady = true;
        this.rpcConnecting = false;
        if (this.rpcContext) {
          this.updateDiscordRpc(this.rpcContext);
        }
      });

      this.withTimeout(client.login({ clientId: this.DISCORD_CLIENT_ID }), 3500, 'Discord Activity connection timed out')
        .catch(() => {
          if (this.rpcClient === client) {
            this.disconnectDiscordRpc();
          }
          this.rpcDisabledUntil = Date.now() + 60000;
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

    this.rpcContext = context;
    if (!this.rpcInterval) {
      this.rpcInterval = setInterval(() => this.updateDiscordRpc(), 15000);
      this.rpcInterval.unref?.();
    }
    if (!this.rpcReady || !this.rpcClient) {
      this.ensureDiscordRpc();
      return;
    }

    const profile = context.nickname ? this.getUserProfile(context.nickname) : null;
    const activity = new DiscordActivity(this.LAUNCHER_NAME).create(context, this.getDiscordButtons(profile));

    const client = this.rpcClient;
    client.setActivity(activity).catch(() => {
      if (this.rpcClient === client) this.disconnectDiscordRpc();
    });
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

    if (this.rpcInterval) {
      clearInterval(this.rpcInterval);
    }

    this.rpcInterval = setInterval(() => {
      this.updateDiscordRpc(this.rpcContext);
    }, 15000);
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
