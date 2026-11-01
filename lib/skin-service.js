const fs = require('node:fs/promises');
const path = require('node:path');
const crypto = require('node:crypto');

class SkinService {
  constructor({ root, store, getSession, getAuth, saveSettings, getSettings, fetchImpl = fetch }) {
    Object.assign(this, { root, store, getSession, getAuth, saveSettings, getSettings, fetchImpl });
  }
  account(token) {
    const session = this.getSession(token);
    if (!session?.nickname) throw new Error('Сначала войдите в аккаунт.');
    return session;
  }
  key(session) { return crypto.createHash('sha256').update(session.minecraftAuth?.uuid || session.nickname).digest('hex'); }
  list(token) {
    const session = this.account(token);
    return this.store.get('skinAlbums', {})[this.key(session)] || [];
  }
  async apply({ sessionToken, filePath, skinId, model = 'default' }) {
    const session = this.account(sessionToken);
    const album = this.list(sessionToken);
    const saved = skinId ? album.find(item => item.id === skinId) : null;
    if (skinId && !saved) throw new Error('Скин не найден в альбоме этого аккаунта.');
    const source = saved?.path || filePath;
    if (!source) throw new Error('Выберите PNG-скин.');
    const stat = await fs.stat(source);
    if (!stat.isFile() || stat.size > 1024 * 1024) throw new Error('Скин должен быть PNG до 1 МБ.');
    const data = await fs.readFile(source);
    if (data.length < 24 || data.subarray(0, 8).toString('hex') !== '89504e470d0a1a0a' || data.readUInt32BE(16) !== 64 || ![32, 64].includes(data.readUInt32BE(20))) throw new Error('Нужен Minecraft-скин PNG 64×64 или 64×32.');
    const variant = (saved?.model || model) === 'slim' ? 'slim' : 'classic';
    if (session.microsoft || session.minecraftAuth) {
      const auth = await this.getAuth(sessionToken, session.nickname);
      this.account(sessionToken); // Account could have changed while refreshing its token.
      if (!auth?.access_token || !auth.uuid) throw new Error('Не удалось получить авторизацию Minecraft.');
      const form = new FormData();
      form.append('variant', variant);
      form.append('file', new Blob([data], { type: 'image/png' }), 'skin.png');
      const response = await this.fetchImpl('https://api.minecraftservices.com/minecraft/profile/skins', {
        method: 'POST', headers: { Authorization: `Bearer ${auth.access_token}` }, body: form, signal: AbortSignal.timeout(20000)
      });
      if (!response.ok) throw new Error(`Minecraft не принял скин (HTTP ${response.status}). Локальный скин не изменён.`);
    }
    const id = crypto.createHash('sha256').update(data).digest('hex') + (variant === 'slim' ? '-slim' : '-classic');
    const folder = path.join(this.root, this.key(session));
    await fs.mkdir(folder, { recursive: true });
    const destination = path.join(folder, id + '.png');
    await fs.writeFile(destination, data);
    const item = { id, name: saved?.name || path.basename(source), path: destination, model: variant === 'slim' ? 'slim' : 'default', preview: `data:image/png;base64,${data.toString('base64')}` };
    const albums = this.store.get('skinAlbums', {});
    albums[this.key(session)] = [item, ...album.filter(entry => entry.id !== id)].slice(0, 100);
    this.store.set('skinAlbums', albums);
    const settings = this.saveSettings({ ...this.getSettings(session.nickname), skin: destination, skinModel: item.model }, session.nickname);
    return { item, settings, licensed: Boolean(session.microsoft || session.minecraftAuth) };
  }
}
module.exports = { SkinService };
