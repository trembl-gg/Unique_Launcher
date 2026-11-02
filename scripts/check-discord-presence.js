const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const { DiscordActivity } = require('../lib/discord-activity');
const { DiscordPresence } = require('../lib/discord-presence');

(async () => {
  const url = 'https://github.com/trembl-gg/Unique_Launcher/releases/latest';
  const factory = new DiscordActivity('Unique Launcher');
  for (const [language, label] of [['ru', 'Скачать лаунчер'], ['en', 'Download launcher'], ['es', 'Descargar launcher']]) {
    for (const section of ['main', 'library', 'create', 'mods', 'profile', 'settings', 'unknown']) {
      for (const memoryMax of [null, 2048]) {
        const activity = factory.create({ language, section, memoryMax });
        assert(activity.details);
        assert.deepEqual(activity.buttons, [{ label, url }]);
      }
    }
  }
  const links = [
    { label: 'Download launcher', url }, { label: 'Bad', url: 'javascript:alert(1)' },
    { label: 'Bad', url: 'https://user:secret@example.com' }, { label: 'YouTube', url: 'https://youtube.com/test' },
    { label: 'Twitch', url: 'https://twitch.tv/test' }
  ];
  assert.deepEqual(factory.create({ language: 'en' }, links).buttons, [{ label: 'Download launcher', url }, links[3]]);
  assert.equal(factory.create({ language: 'xx' }).buttons[0].label, 'Скачать лаунчер');

  const clients = [], sent = [];
  let language = 'ru', fail = false, profileFails = false;
  let session = { nickname: 'QA', microsoft: true };
  class Client extends EventEmitter {
    constructor() { super(); clients.push(this); this.destroyed = 0; }
    login() { return Promise.resolve(); }
    destroy() { this.destroyed++; this.emit('disconnected'); return Promise.resolve(); }
    async request(command, payload) {
      assert.equal(command, 'SET_ACTIVITY');
      assert(payload.activity.buttons.length >= 1);
      assert.equal(payload.activity.buttons[0].url, url);
      if (fail) throw Error('RPC pipe closed');
      sent.push(payload.activity);
    }
  }
  const presence = new DiscordPresence({
    clientId: 'test', launcherName: 'Unique Launcher', getLanguage: () => language,
    sessionKey: 'session', store: { get: () => session },
    getUserProfile: () => { if (profileFails) throw Error('Profile unavailable'); return {}; },
    getDiscordButtons: () => links, withTimeout: promise => promise
  });
  presence.DiscordRPC = { register() {}, Client };
  const flush = async () => { for (let i = 0; i < 3; i++) await new Promise(resolve => setImmediate(resolve)); };
  try {
    await presence.updateDiscordRpc({ nickname: 'QA' });
    clients[0].emit('ready'); await flush();
    assert.equal(sent[0].buttons[0].label, 'Скачать лаунчер');
    assert.equal(sent[0].state, 'QA · Microsoft');
    session = { nickname: 'Karmic_Occul7i5t', microsoft: true };
    await presence.updateDiscordRpc();
    assert.equal(sent.at(-1).state, 'Karmic_Occul7i5t · Microsoft', 'idle heartbeat follows the selected Minecraft account');
    session = { nickname: 'OfflinePlayer', guest: true };
    await presence.updateDiscordRpc({ nickname: 'StaleNickname', microsoft: true });
    assert.equal(sent.at(-1).state, 'OfflinePlayer · Офлайн');
    presence.startPlayingDiscordRpc({ nickname: 'GamePlayer', microsoft: true }, { memory: { max: 2048 } });
    await flush();
    assert.equal(sent.at(-1).state, 'GamePlayer · Microsoft', 'playing activity keeps the game account');
    presence.stopPlayingDiscordRpc(); await flush();
    assert.equal(sent.at(-1).state, 'OfflinePlayer · Офлайн', 'stopping returns to the selected launcher account');
    language = 'en'; presence.section = 'create';
    await presence.updateDiscordRpc();
    assert.equal(sent.at(-1).details, 'Creating an instance');
    assert.equal(sent.at(-1).buttons[0].label, 'Download launcher');
    profileFails = true;
    await presence.updateDiscordRpc();
    assert.equal(sent.at(-1).buttons.length, 1, 'profile failures preserve the required download button');

    fail = true;
    await presence.updateDiscordRpc(); await flush();
    assert.equal(presence.rpcReady, false);
    assert.equal(clients[0].destroyed, 1, 'failed requests release the broken connection once');
    fail = false; presence.rpcDisabledUntil = 0;
    await presence.updateDiscordRpc();
    assert.equal(clients.length, 2);
    clients[1].emit('ready'); await flush();
    assert.equal(sent.at(-1).buttons[0].url, url);
    clients[0].emit('disconnected'); clients[0].emit('ready');
    assert.equal(presence.rpcClient, clients[1], 'late events cannot replace the new connection');

    clients[1].emit('disconnected'); await flush();
    presence.rpcDisabledUntil = 0; language = 'es';
    await presence.updateDiscordRpc(); clients[2].emit('ready'); await flush();
    assert.equal(sent.at(-1).buttons[0].label, 'Descargar launcher');
  } finally {
    clearInterval(presence.rpcInterval); presence.disconnectDiscordRpc(); await flush();
  }
  console.log('PASS: required Discord button in every state/language, invalid-link filtering, profile errors, RPC failures, reconnect and stale-client events');
})().catch(error => { console.error(error); process.exitCode = 1; });
