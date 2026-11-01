class LauncherExperiments {
  constructor({ applyTheme, getAppearance }) {
    this.applyTheme = applyTheme;
    this.getAppearance = getAppearance;
    this.settings = {};
    this.cover = '';
    this.color = '';
    this.revision = 0;
    this.samples = Array(60).fill(0);
    this.canvas = document.getElementById('music-visualizer-canvas');
    this.status = document.getElementById('experiments-status');
    document.addEventListener('visibilitychange', () => this.syncMeter());
    window.addEventListener('pagehide', () => this.stopMeter());
  }

  configure(settings = {}) {
    const changed = this.settings.spotifyTheme !== Boolean(settings.spotifyTheme);
    this.settings = { spotifyTheme: Boolean(settings.spotifyTheme), visualizer: Boolean(settings.visualizer) };
    if (changed) this.updateTrack(this.track);
    else if (this.settings.spotifyTheme && this.color) this.applyColor();
    this.syncMeter();
  }

  applyColor() {
    this.applyTheme({ ...this.getAppearance(), accent: this.color });
  }

  updateTrack(track) {
    this.track = track;
    const cover = this.settings.spotifyTheme && track?.playing ? track.coverUrl || '' : '';
    if (this.cover === cover) return;
    this.cover = cover;
    this.color = '';
    const revision = ++this.revision;
    this.applyTheme(this.getAppearance());
    if (!cover) return;
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => {
      if (revision !== this.revision) return;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 24;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        context.drawImage(image, 0, 0, 24, 24);
        const data = context.getImageData(0, 0, 24, 24).data;
        const buckets = new Map();
        for (let i = 0; i < data.length; i += 4) {
          const rgb = [data[i], data[i + 1], data[i + 2]];
          if (Math.max(...rgb) < 45 || Math.min(...rgb) > 230) continue;
          const key = rgb.map(v => v >> 5).join(',');
          const bucket = buckets.get(key) || { weight: 0, rgb };
          bucket.weight += 1 + (Math.max(...rgb) - Math.min(...rgb)) / 128;
          buckets.set(key, bucket);
        }
        const best = [...buckets.values()].sort((a, b) => b.weight - a.weight)[0];
        if (!best) return;
        this.color = '#' + best.rgb.map(v => v.toString(16).padStart(2, '0')).join('');
        this.applyColor();
      } catch { this.status.textContent = 'Обложка недоступна для анализа цвета. Используется ваш цвет.'; }
    };
    image.onerror = () => {
      if (revision === this.revision) this.status.textContent = 'Не удалось загрузить обложку Spotify.';
    };
    image.src = cover;
  }

  syncMeter() {
    const enabled = this.settings.visualizer && !document.hidden;
    this.canvas.classList.toggle('hidden', !enabled);
    if (!enabled) { this.stopMeter(); return; }
    if (!this.timer) {
      if (!window.api?.getAudioPeak) {
        this.status.textContent = 'Визуализатор доступен в Windows-версии WebView2.';
        return;
      }
      this.timer = setInterval(() => this.sample(), 80);
    }
  }

  async sample() {
    if (this.pending || !this.timer) return;
    this.pending = true;
    try {
      const peak = await window.api.getAudioPeak();
      if (!this.timer) return;
      this.samples.shift();
      this.samples.push(Math.min(1, Math.max(0, Number(peak) || 0)));
      const context = this.canvas.getContext('2d');
      context.clearRect(0, 0, 480, 64);
      context.fillStyle = getComputedStyle(document.body).getPropertyValue('--accent').trim() || '#8b5cf6';
      this.samples.forEach((value, index) => {
        const height = Math.max(2, Math.sqrt(value) * 60);
        context.fillRect(index * 8, 64 - height, 5, height);
      });
    } catch {
      this.status.textContent = 'Звуковое устройство недоступно. Проверьте выход звука Windows.';
      this.stopMeter();
    } finally { this.pending = false; }
  }

  stopMeter() {
    clearInterval(this.timer);
    this.timer = null;
    window.api?.stopAudioMeter?.().catch(() => {});
    this.samples.fill(0);
    this.canvas.getContext('2d').clearRect(0, 0, 480, 64);
  }
}

window.LauncherExperiments = LauncherExperiments;
