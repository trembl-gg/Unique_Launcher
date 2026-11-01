const crypto = require('node:crypto');

const copy = {
  ru: { success: 'Готово. Возвращайтесь в лаунчер', denied: 'Вход отменён', invalid: 'Не удалось подтвердить запрос', missing: 'Сервис не вернул код входа', expired: 'Время ожидания истекло', handled: 'Этот запрос уже обработан', failed: 'Не удалось завершить вход', notfound: 'Страница не найдена', successBody: 'Подключение подтверждено. Продолжите в UNIQUE Launcher — эта вкладка больше не нужна.', retryBody: 'Вернитесь в UNIQUE Launcher и повторите подключение. Пароли и коды на этой странице вводить не нужно.', close: 'Закрыть вкладку', fallback: 'Если вкладка не закрылась, переключитесь в окно лаунчера.', footer: 'Безопасное подключение к UNIQUE Launcher' },
  en: { success: 'All set. Return to your launcher', denied: 'Sign-in cancelled', invalid: 'Unable to verify this request', missing: 'No sign-in code was returned', expired: 'This request has expired', handled: 'This request was already handled', failed: 'Unable to complete sign-in', notfound: 'Page not found', successBody: 'Your connection is confirmed. Continue in UNIQUE Launcher — you can close this tab.', retryBody: 'Return to UNIQUE Launcher and try connecting again. You do not need to enter a password or code on this page.', close: 'Close this tab', fallback: 'If this tab stays open, switch to the launcher window.', footer: 'Secure connection to UNIQUE Launcher' },
  es: { success: 'Todo listo. Vuelve al launcher', denied: 'Inicio de sesión cancelado', invalid: 'No se pudo verificar la solicitud', missing: 'No se recibió el código de acceso', expired: 'La solicitud ha caducado', handled: 'Esta solicitud ya se ha procesado', failed: 'No se pudo completar el acceso', notfound: 'Página no encontrada', successBody: 'La conexión está confirmada. Continúa en UNIQUE Launcher; ya puedes cerrar esta pestaña.', retryBody: 'Vuelve a UNIQUE Launcher e intenta conectar de nuevo. No necesitas introducir contraseñas ni códigos en esta página.', close: 'Cerrar pestaña', fallback: 'Si la pestaña sigue abierta, vuelve a la ventana del launcher.', footer: 'Conexión segura con UNIQUE Launcher' }
};

function renderAuthCallback({ provider, status, language = 'ru', nonce = crypto.randomBytes(18).toString('base64') }) {
  const lang = copy[language] ? language : 'ru';
  const words = copy[lang];
  const service = provider === 'Spotify' ? 'Spotify' : 'Microsoft';
  const success = status === 'success';
  const title = words[status] || words.failed;
  const symbol = success ? '<path d="m6 12 4 4 8-8"/>' : '<path d="m8 8 8 8m0-8-8 8"/>';
  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title} · UNIQUE Launcher</title>
<style nonce="${nonce}">
:root{color-scheme:dark;font-family:Segoe UI,system-ui,sans-serif;color:#f2edff;background:#0c0914}*{box-sizing:border-box}body{margin:0;min-height:100svh;display:grid;place-items:center;padding:32px 24px;background:radial-gradient(ellipse at 20% 0%,#25183f 0,transparent 55%),#0c0914}main{width:min(100%,600px)}header{display:flex;align-items:center;gap:12px;margin-bottom:64px;color:#cbbde5;font-size:14px;font-weight:600;letter-spacing:.08em}.logo{display:grid;place-items:center;width:36px;height:36px;border-radius:10px;background:#a88be3;color:#140d22;font-size:23px;font-weight:750;letter-spacing:0}.status{display:grid;place-items:center;width:56px;height:56px;margin-bottom:24px;border-radius:16px;background:${success ? '#19382e' : '#40222d'};color:${success ? '#8ce2b8' : '#ffacba'}}svg{width:28px;height:28px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}h1{margin:0 0 20px;font-size:clamp(30px,5vw,44px);font-weight:650;line-height:1.14;letter-spacing:-.025em;text-wrap:balance}p{max-width:52ch;margin:0;color:#c5bbd6;font-size:17px;line-height:1.65}.service{display:flex;align-items:center;gap:10px;margin:32px 0;color:#e3daf2;font-size:14px}.service span{color:#bbaaD1}button{padding:14px 24px;border:0;border-radius:10px;background:#c3a6ff;color:#1a102a;font:600 15px Segoe UI,system-ui,sans-serif;cursor:pointer}button:hover{background:#d7c2ff}button:focus-visible{outline:3px solid #f4ebff;outline-offset:4px}.fallback{font-size:13px;margin-top:16px;color:#b9adce}footer{margin-top:64px;padding-top:24px;border-top:1px solid #392d4d;color:#b9adce;font-size:12px}::selection{background:#c3a6ff;color:#1a102a}@media(max-width:480px){body{padding:32px 24px}header{margin-bottom:40px}footer{margin-top:40px}button{width:100%}}</style></head>
<body><main><header><span class="logo" aria-hidden="true">U</span>UNIQUE LAUNCHER</header><div class="status"><svg viewBox="0 0 24 24" aria-hidden="true">${symbol}</svg></div><h1>${title}</h1><p>${success ? words.successBody : words.retryBody}</p><div class="service">${service}<span aria-hidden="true">→</span>UNIQUE Launcher</div><button type="button" id="close-tab">${words.close}</button><p class="fallback">${words.fallback}</p><footer>${words.footer}</footer></main><script nonce="${nonce}">document.getElementById('close-tab').addEventListener('click',()=>window.close());</script></body></html>`;
}

function sendAuthCallback(response, options) {
  const nonce = crypto.randomBytes(18).toString('base64');
  response.writeHead(options.code || 200, {
    'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store',
    'Content-Security-Policy': `default-src 'none'; style-src 'nonce-${nonce}'; script-src 'nonce-${nonce}'; base-uri 'none'; frame-ancestors 'none'`,
    'Referrer-Policy': 'no-referrer', 'X-Content-Type-Options': 'nosniff'
  });
  response.end(renderAuthCallback({ ...options, nonce }));
}

module.exports = { renderAuthCallback, sendAuthCallback };
