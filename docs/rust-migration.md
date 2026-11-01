# Перенос на Rust

Основной путь запуска — Rust (`npm start`). Cargo собирает `rust/main.rs` в `unique-launcher.exe`; упаковка переименовывает файл в `UNIQUE LAUNCHER.exe`. Исходники C# оставлены для сравнения и возврата через `npm run start:legacy`.

## Реализовано в Rust

- Окно Tao, WebView2 через Wry, встроенная иконка EXE.
- Контракт `window.api` сохранён; общий JavaScript bridge поддерживает обе оболочки.
- Интерфейс загружается с `http://unique.localhost/renderer/index.html` через внутренний протокол Wry, без HTTP-сервера. `file:///` не подходит для IPC Wry: преобразование такого адреса в HTTP-запрос завершается ошибкой до вызова обработчика.
- Microsoft-авторизация в Rust-режиме открывает HTTPS-ссылку нативным ShellExecuteW; ожидание OAuth callback начинается после успешного открытия браузера. Офлайн-вход не скачивает скины и не зависит от сети.
- Нативные диалоги, управление окном, drag and drop с путями только из системного события.
- Физическая и доступная память, текущая частота монитора, ограничение RAM для Minecraft.
- WASAPI-аудиометр, защита окна от захвата и сохранение её настройки.
- Значок игрового окна и группировка Minecraft в панели задач с проверкой Java-процесса.
- Запуск backend без консольного окна и Windows Job Object для завершения дочерних процессов.
- IPC через приватные stdin/stdout: локальный HTTP-порт в Rust-режиме не открывается.
- Ограничение числа незавершённых запросов, обработка ошибок, отказ новых запросов при падении backend.
- Startup timeout с учётом миграции игровых файлов, журнал stderr в `%LOCALAPPDATA%/UNIQUE LAUNCHER/logs/rust-backend.log`.

## Ещё не перенесено

`main.js` и сервисы `lib/` по-прежнему выполняются Node.js: Microsoft/offline auth, настройки и аккаунты, сборки, загрузчики, установка и запуск Minecraft, Modrinth, скины, Discord и Spotify. Эти функции не являются реализациями на Rust. HTML/CSS/JavaScript-интерфейс сохранён.

В старом backend зафиксирован `minecraft-launcher-core@2.8.1`; npm предупреждает о Log4j для версий ниже 3.16.10. Эта зависимость пока не обновлена: API 3.x несовместим с текущими вызовами `core`, `event`, `handler` и требует отдельной миграции и проверки игрового запуска. Сборка Rust-оболочки не устраняет этот риск backend.

В дальнейших изменениях backend-каналы можно переносить в обработчик Rust по одному, сохраняя форматы ответов и проверки сессии. До переноса хранения аккаунтов нельзя давать двум backend одновременно записывать `launcher-data.json`.

## Сборка и проверки

```powershell
npm install
npm run check
npm test
npm run test:backend
npm run check:rust
npm start
npm run dist:rust
npm run dist:installer
```

Требования: Windows x64, Rust stable, MSVC Build Tools с Windows SDK либо MinGW-w64, Node.js/npm, WebView2 Runtime. Для установщика дополнительно нужен NSIS 3. Скрипты поддерживают toolchain внутри `.tools` без изменения системного PATH. `Cargo.lock` фиксирует зависимости. `.tools` и `target` не входят в Git и дистрибутив.

JavaScript-тест `check-stdio-transport.js` проверяет ответы, Unicode, ошибки, события, закрытие канала и обработку падения backend в bridge. Rust-тесты проверяют протокол и расчёт памяти. Проверки не заменяют живой вход Microsoft, загрузку сборки и запуск игры.

`check-backend-stdio.js` дополнительно запускает настоящий backend с временным профилем: проверяет готовность, чтение настроек без аргументов, офлайн-вход, сессию и завершение по EOF. Путь к собранной папке можно передать аргументом: `node scripts/check-backend-stdio.js dist/rust`.
