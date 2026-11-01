class AmbientBackground {
  constructor(canvas, getColors) { this.canvas = canvas; this.getColors = getColors; }
  dispose() { this.cleanup?.(); this.cleanup = null; }
  start() {
    this.dispose();
    if (!this.canvas) return;
    const canvas = this.canvas, ctx = canvas.getContext('2d'), getColors = this.getColors;
    let frame = 0, width = 0, height = 0, lastFrame = 0, nebula, textureKey = '';
    const stars = [];
    const hash = (x, y) => {
      let n = Math.imul(x, 374761393) + Math.imul(y, 668265263);
      n = Math.imul(n ^ (n >>> 13), 1274126177);
      return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
    };
    function noise(x, y) {
      const ix = Math.floor(x), iy = Math.floor(y);
      const fx = x - ix, fy = y - iy;
      const u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy);
      const a = hash(ix, iy), b = hash(ix + 1, iy), c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    }
    function cloud(x, y, octaves = 5) {
      let result = 0, amplitude = .5;
      for (let i = 0; i < octaves; i++) {
        result += noise(x, y) * amplitude;
        x = x * 2.03 + 17.1; y = y * 2.03 + 9.2; amplitude *= .5;
      }
      return result;
    }
    function buildNebula() {
      nebula = document.createElement('canvas');
      nebula.width = Math.min(560, Math.max(320, Math.round(width / 3)));
      nebula.height = Math.max(180, Math.round(nebula.width * height / width));
      const surface = nebula.getContext('2d');
      const pixels = surface.createImageData(nebula.width, nebula.height);
      const accent = getColors()[0].split(',').map(Number);
      for (let y = 0; y < nebula.height; y++) for (let x = 0; x < nebula.width; x++) {
        const nx = x / nebula.width, ny = y / nebula.height;
        const qx = cloud(nx * 3.2 + 7, ny * 3.2, 3) - .45;
        const qy = cloud(nx * 3.2, ny * 3.2 + 31, 3) - .45;
        const mist = cloud(nx * 5.2 + qx * 2.8, ny * 5.2 + qy * 2.8);
        const left = Math.exp(-Math.pow((nx + .04 - .15 * Math.sin(ny * 5)) / .42, 2));
        const lower = Math.exp(-Math.pow((nx - .72) / .27, 2) - Math.pow((ny - 1.03) / .38, 2));
        const density = Math.max(0, Math.min(1.15, (mist - .24) * 3.1 * (left + lower * .9)));
        const dust = cloud(nx * 8 + qy * 3 + 52, ny * 8 + qx * 3, 3);
        const veil = Math.max(.12, Math.min(1, (dust - .2) * 2.8));
        const glow = density * veil;
        const core = Math.pow(glow, 2.3);
        const grain = (hash(x, y) - .5) * 3;
        const offset = (y * nebula.width + x) * 4;
        pixels.data[offset] = 10 + glow * (102 + (accent[0] || 124) * .15) + core * 66 + grain;
        pixels.data[offset + 1] = 3 + glow * 49 + core * 53 + grain;
        pixels.data[offset + 2] = 15 + glow * (136 + (accent[2] || 237) * .08) + core * 57 + grain;
        pixels.data[offset + 3] = 255;
      }
      surface.putImageData(pixels, 0, 0);
    }
    function resize() {
      width = window.innerWidth; height = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr); canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      textureKey = ''; stars.length = 0;
      const count = Math.max(1800, Math.min(6500, Math.floor(width * height / 340)));
      for (let i = 0; i < count; i++) stars.push({
        x: Math.random() * width, y: Math.random() * height,
        size: i % 53 === 0 ? 1.1 + Math.random() * .8 : .25 + Math.random() * .65,
        depth: .2 + Math.random() * .8, phase: Math.random() * 6.28,
        warm: Math.random() > .78
      });
    }
    function tick(time) {
      frame = 0;
      if (document.hidden) return;
      const reduced = document.body.classList.contains('reduce-motion');
      if (!reduced) frame = requestAnimationFrame(tick);
      if (!reduced && time - lastFrame < 33) return;
      lastFrame = time;
      const light = document.body.dataset?.theme === 'light';
      const key = `${light}:${getColors().join(':')}`;
      if (key !== textureKey) { if (!light) buildNebula(); textureKey = key; }
      if (light) ctx.clearRect(0, 0, width, height);
      else {
        const drift = reduced ? 0 : Math.sin(time / 33000) * 12;
        ctx.drawImage(nebula, -20 + drift, -20, width + 40, height + 40);
        if (!reduced) {
          ctx.globalCompositeOperation = 'screen';
          for (let i = 0; i < 3; i++) {
            const phase = time * .00012 + i * 2.1;
            const x = width * (.5 + Math.sin(phase) * .42);
            const y = height * (.5 + Math.cos(phase * .8 + i) * .4);
            const radius = Math.max(180, width * .24);
            const glow = ctx.createRadialGradient(x, y, 0, x, y, radius);
            glow.addColorStop(0, `rgba(${i === 1 ? '187,92,223' : '111,78,207'},.17)`);
            glow.addColorStop(.4, 'rgba(132,61,186,.06)');
            glow.addColorStop(1, 'rgba(80,32,130,0)');
            ctx.fillStyle = glow; ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
          }
          ctx.globalCompositeOperation = 'source-over';
        }
      }
      for (const star of stars) {
        const alpha = .34 + star.depth * .32 + (reduced ? 0 : Math.sin(time * (.001 + star.depth * .001) + star.phase) * .23);
        const color = light ? '73,52,111' : star.warm ? '255,218,185' : '230,223,255';
        const travel = reduced ? 0 : time * (.0018 + star.depth * .0035);
        const x = (star.x + travel) % width, y = (star.y + travel * .24) % height;
        ctx.fillStyle = `rgba(${color},${alpha})`;
        ctx.fillRect(x, y, star.size, star.size);
        if (star.size > 1.5 && !light) {
          ctx.fillStyle = `rgba(${color},${alpha * .12})`;
          ctx.fillRect(x - 1, y - 1, star.size + 2, star.size + 2);
        }
      }
      if (!reduced && !light) {
        const cycle = Math.floor(time / 12000), progress = (time % 12000 - 8500) / 1400;
        if (progress >= 0 && progress <= 1) {
          const x = width * (.15 + hash(cycle, 8) * .45) + progress * 300;
          const y = height * (.08 + hash(cycle, 19) * .45) + progress * 100;
          const tail = ctx.createLinearGradient(x - 90, y - 30, x, y);
          tail.addColorStop(0, 'rgba(208,183,255,0)');
          tail.addColorStop(1, `rgba(244,232,255,${Math.sin(progress * Math.PI) * .75})`);
          ctx.strokeStyle = tail; ctx.lineWidth = 1.2;
          ctx.beginPath(); ctx.moveTo(x - 90, y - 30); ctx.lineTo(x, y); ctx.stroke();
        }
      }
    }
    const invalidate = () => {
      cancelAnimationFrame(frame); frame = 0; lastFrame = 0;
      if (!document.hidden) frame = requestAnimationFrame(tick);
    };
    const onResize = () => { resize(); invalidate(); };
    const observer = new MutationObserver(invalidate);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'style', 'data-theme', 'data-accent'] });
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', invalidate);
    this.cleanup = () => {
      cancelAnimationFrame(frame); observer.disconnect();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', invalidate);
    };
    resize(); invalidate();
  }
}
window.AmbientBackground = AmbientBackground;
