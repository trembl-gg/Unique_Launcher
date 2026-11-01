class BackendEvents {
  constructor() { this.clients = new Set(); this.history = []; this.sequence = 0; this.bytes = 0; }
  emit(channel, data) {
    const id = ++this.sequence;
    const payload = `id: ${id}\ndata: ${JSON.stringify({ channel, data })}\n\n`;
    if (channel.startsWith('launch-') || channel === 'game-crashed') {
      this.history.push({ id, payload }); this.bytes += Buffer.byteLength(payload);
      while (this.history.length > 250 || this.bytes > 512 * 1024) this.bytes -= Buffer.byteLength(this.history.shift().payload);
    }
    for (const client of this.clients) {
      try { client.write(payload); if (client.writableLength > 1024 * 1024) { client.destroy(); this.clients.delete(client); } }
      catch { this.clients.delete(client); }
    }
  }
  connect(client, lastId = 0) {
    for (const event of this.history) if (event.id > lastId) client.write(event.payload);
    this.clients.add(client);
  }
  disconnect(client) { this.clients.delete(client); }
}
module.exports = { BackendEvents };
