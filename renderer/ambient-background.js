class AmbientBackground {
  constructor(canvas, getColors) { this.canvas = canvas; this.getColors = getColors; }
  dispose() { this.cleanup?.(); this.cleanup = null; }
  start() {
    this.dispose();
    const spaceCanvas = this.canvas;
    const getColors = this.getColors;
    let spaceAnimationFrame = 0;
    if (!spaceCanvas) return;

    const ctx = spaceCanvas.getContext('2d');
    const stars = [];
    let width = 0;
    let height = 0;
    let dpr = 1;
    let lastFrameAt = 0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      spaceCanvas.width = Math.floor(width * dpr);
      spaceCanvas.height = Math.floor(height * dpr);
      spaceCanvas.style.width = `${width}px`;
      spaceCanvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      stars.length = 0;
      const starCount = Math.max(240, Math.min(650, Math.floor((width * height) / 3500)));
      for (let i = 0; i < starCount; i += 1) {
        stars.push({
          x: Math.random() * width,
          y: Math.random() * height,
          z: 0.25 + Math.random() * 1.2,
          size: 0.5 + Math.random() * 1.8,
          drift: 0.08 + Math.random() * 0.32,
          glow: 0.25 + Math.random() * 0.75
        });
      }
    }

    function drawNebula(time) {
      if (document.body.dataset?.theme === 'light') { ctx.clearRect(0, 0, width, height); return; }
      const [accentRgb, accent2Rgb] = getColors();
      const gradient = ctx.createLinearGradient(0, 0, width, height);
      gradient.addColorStop(0, 'rgba(12, 18, 38, 0.9)');
      gradient.addColorStop(0.45, `rgba(${accentRgb}, 0.18)`);
      gradient.addColorStop(1, 'rgba(3, 7, 18, 0.92)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);

      ctx.save();
      ctx.globalAlpha = 0.18;
      ctx.translate(Math.sin(time / 9000) * 24, Math.cos(time / 11000) * 18);
      for (let i = 0; i < 5; i += 1) {
        const y = (height / 6) * (i + 1);
        const band = ctx.createLinearGradient(0, y - 80, width, y + 80);
        band.addColorStop(0, `rgba(${accentRgb}, 0)`);
        band.addColorStop(0.5, i % 2 ? `rgba(${accentRgb}, 0.16)` : `rgba(${accent2Rgb}, 0.16)`);
        band.addColorStop(1, `rgba(${accentRgb}, 0)`);
        ctx.fillStyle = band;
        ctx.fillRect(0, y - 90, width, 180);
      }
      ctx.restore();
    }

    function tick(time) {
      spaceAnimationFrame = 0;
      if (document.hidden) {
        return;
      }

      const reduceMotion = document.body.classList.contains('reduce-motion');
      if (!reduceMotion) spaceAnimationFrame = requestAnimationFrame(tick);
      const frameInterval = reduceMotion ? 0 : 33;
      if (time - lastFrameAt < frameInterval) {
        return;
      }
      lastFrameAt = time;

      drawNebula(reduceMotion ? 0 : time);

      for (const star of stars) {
        if (!reduceMotion) {
          star.y += star.drift * star.z;
          star.x += Math.sin((time * 0.0002) + star.y * 0.01) * 0.08;
        }
        if (star.y > height + 8) {
          star.y = -8;
          star.x = Math.random() * width;
        }

        const alpha = 0.28 + Math.sin((reduceMotion ? 0 : time) * 0.002 * star.z + star.x) * 0.16 + star.glow * 0.34;
        const color = document.body.dataset?.theme === 'light' ? '73, 52, 111' : '255, 255, 255';
        ctx.fillStyle = `rgba(${color}, ${Math.max(0.12, Math.min(0.9, alpha))})`;
        ctx.fillRect(star.x, star.y, star.size, star.size);
      }
    }

    const invalidate = () => {
      cancelAnimationFrame(spaceAnimationFrame);
      spaceAnimationFrame = 0;
      lastFrameAt = 0;
      if (!document.hidden) spaceAnimationFrame = requestAnimationFrame(tick);
    };
    const onResize = () => { resize(); invalidate(); };
    const observer = new MutationObserver(invalidate);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class', 'style', 'data-theme', 'data-accent'] });
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', invalidate);
    this.cleanup = () => {
      cancelAnimationFrame(spaceAnimationFrame);
      observer.disconnect();
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', invalidate);
    };
    resize();
    invalidate();
  }
}
window.AmbientBackground = AmbientBackground;
