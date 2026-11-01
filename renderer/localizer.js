class Localizer {
  constructor(dictionary, language) {
    this.dictionary = dictionary;
    this.aliases = new Map();
    for (const [source, values] of Object.entries(dictionary)) {
      for (const value of [source, ...Object.values(values)]) this.aliases.set(value.replace(/\s+/g, ' ').trim(), source);
    }
    this.language = language;
    this.sources = new WeakMap();
    this.observer = new MutationObserver(records => {
      this.observer.disconnect();
      for (const record of records) {
        if (record.type === 'characterData') this.text(record.target);
        else if (record.type === 'attributes') this.attributes(record.target);
        else for (const node of record.addedNodes) this.translate(node);
      }
      this.observe();
    });
  }
  observe() { this.observer.observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['title', 'placeholder', 'aria-label'] }); }
  value(value, target, field) {
    const state = this.sources.get(target) || {};
    const previous = state[field];
    const normalized = value.trim().replace(/\s+/g, ' ');
    const source = previous && previous.output === value ? previous.source : (this.dictionary[normalized] ? normalized : this.aliases.get(normalized) || normalized);
    const entry = this.dictionary[source];
    if (!entry) {
      for (const pattern of window.translationPatterns || []) {
        const match = source.match(pattern.match);
        if (match) {
          const template = pattern[this.language()] || pattern.ru;
          const output = template.replace(/\{(\d+)\}/g, (_, index) => match[Number(index)] || '');
          state[field] = { source, output }; this.sources.set(target, state);
          return output;
        }
      }
      return value;
    }
    const result = this.language() === 'ru' ? (entry.ru || source) : (entry[this.language()] || source);
    const output = value.replace(value.trim(), result);
    state[field] = { source, output }; this.sources.set(target, state);
    return output;
  }
  text(node) {
    if (node.parentElement?.closest('script, style, pre, code, textarea, [data-i18n-ignore], .instance-card strong, .mod-row-main span')) return;
    const result = this.value(node.nodeValue, node, 'text');
    if (result !== node.nodeValue) node.nodeValue = result;
  }
  attributes(element) {
    if (element.closest?.('[data-i18n-ignore]')) return;
    for (const name of ['title', 'placeholder', 'aria-label', 'alt']) {
      if (!element.hasAttribute?.(name)) continue;
      const current = element.getAttribute(name), next = this.value(current, element, name);
      if (current !== next) element.setAttribute(name, next);
    }
  }
  translate(root = document.body) {
    if (root.nodeType === Node.TEXT_NODE) { this.text(root); return; }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    this.attributes(root);
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      if (walker.currentNode.nodeType === Node.TEXT_NODE) this.text(walker.currentNode);
      else this.attributes(walker.currentNode);
    }
  }
  refresh() { this.observer.disconnect(); this.translate(); this.observe(); }
}
window.Localizer = Localizer;
window.extraTranslations = {
  'Импорт по ссылке': { en: 'Import from URL', es: 'Importar desde URL' },
  'Ссылка на сборку Modrinth': { en: 'Modrinth modpack URL', es: 'URL del modpack Modrinth' },
  'Информация': { en: 'Information', es: 'Información' },
  'Техническая информация': { en: 'Technical information', es: 'Información técnica' },
  'Экспериментальные': { en: 'Experimental', es: 'Experimental' },
  'Экспериментальные функции': { en: 'Experimental features', es: 'Funciones experimentales' },
  'Максимум ОЗУ': { en: 'Maximum RAM', es: 'RAM máxima' },
  'Профиль': { en: 'Profile', es: 'Perfil' },
  'Профиль игрока': { en: 'Player profile', es: 'Perfil del jugador' },
  'Выйти': { en: 'Sign out', es: 'Cerrar sesión' },
  'Добро пожаловать': { en: 'Welcome', es: 'Bienvenido' },
  'Войти с Microsoft': { en: 'Sign in with Microsoft', es: 'Iniciar sesión con Microsoft' },
  'Играть офлайн': { en: 'Play offline', es: 'Jugar sin conexión' },
  'Никнейм для офлайн-игры': { en: 'Offline username', es: 'Nombre sin conexión' },
  'или': { en: 'or', es: 'o' },
  'Сохранить': { en: 'Save', es: 'Guardar' },
  'Отмена': { en: 'Cancel', es: 'Cancelar' },
  'Альбом скинов': { en: 'Skin library', es: 'Biblioteca de skins' },
  'Модель скина': { en: 'Skin model', es: 'Modelo de skin' },
  'Скачать': { en: 'Download', es: 'Descargar' },
  'Найти': { en: 'Search', es: 'Buscar' },
  'Оформление': { en: 'Customize', es: 'Personalizar' },
  'Оформление сборки': { en: 'Customize instance', es: 'Personalizar instancia' },
  'Аватарка': { en: 'Icon', es: 'Icono' },
  'Убрать аватарку': { en: 'Remove icon', es: 'Quitar icono' },
  'В избранном': { en: 'Favorite', es: 'Favorito' },
  '★ В избранном': { en: '★ Favorite', es: '★ Favorito' },
  '☆ В избранное': { en: '☆ Add favorite', es: '☆ Añadir a favoritos' },
  'Сначала избранные': { en: 'Favorites first', es: 'Favoritos primero' },
  'По названию': { en: 'Name', es: 'Nombre' },
  'Сначала новые': { en: 'Newest first', es: 'Más recientes' },
  'Обои главного меню': { en: 'Launcher wallpaper', es: 'Fondo del launcher' },
  'Выбрать PNG/JPG': { en: 'Choose PNG/JPG', es: 'Elegir PNG/JPG' },
  'Настройки лаунчера': { en: 'Launcher settings', es: 'Ajustes del launcher' },
  'Скрывать лаунчер во время игры': { en: 'Hide launcher while playing', es: 'Ocultar launcher al jugar' },
  'Акцент': { en: 'Accent color', es: 'Color de acento' },
  'Уменьшить анимации': { en: 'Reduce motion', es: 'Reducir animaciones' },
  'Изменения сохраняются автоматически': { en: 'Changes are saved automatically', es: 'Los cambios se guardan automáticamente' },
  'Журнал запуска': { en: 'Launch log', es: 'Registro de inicio' },
  'Очистить': { en: 'Clear', es: 'Limpiar' },
  'Диагностика': { en: 'Diagnostics', es: 'Diagnóstico' },
  'Открыть логи': { en: 'Open logs', es: 'Abrir registros' },
  'Починить игру': { en: 'Repair game', es: 'Reparar juego' },
  'Import folder': { ru: 'Импорт папки', en: 'Import folder', es: 'Importar carpeta' },
  'Import .mrpack': { ru: 'Импорт .mrpack', en: 'Import .mrpack', es: 'Importar .mrpack' },
  'Check Modrinth updates': { ru: 'Проверить обновления модов', en: 'Check mod updates', es: 'Buscar actualizaciones de mods' },
  'Поиск сборок по названию, версии или загрузчику': { en: 'Search by name, version or loader', es: 'Buscar por nombre, versión o cargador' },
  'Экспорт серверных модов': { en: 'Export server mods', es: 'Exportar mods del servidor' }
};
