# Архитектура

```
┌─────────────┐     WS JSON      ┌──────────────────┐
│  Solid UI   │ ◄──────────────► │  Rust Node       │
│ (WebView /  │  127.0.0.1:ws    │  mesh TCP, UDP,  │
│  browser)   │                  │  mDNS, outbox    │
└─────────────┘                  └────────┬─────────┘
                                          │ TCP flood + Presence
                                          ▼
                                   другие ноды в LAN / по invite
```

## Репозитории

- **MRLess** — UI (Solid + Vite). В проде бандл кладётся в `www/` оболочки.
- **MRLess_server** — нода (`mrless` bin + `libmrless` static/cdylib) и хосты:
  - `ios/`, `macos/` — Swift + WKWebView, схема `mrless://app/…`
  - `android/` — Kotlin WebView + JNI
  - `windows/` — portable: exe + www + bat

## Данные на диске

В Application Support / filesDir / `%APPDATA%` (по instance):

`identity.json`, `config.json`, `messages.json`, `contacts.json`, `groups.json`, `outbox.json`, `files/`.

## Протокол UI

`UiIn` / `UiOut` в `protocol.rs` — JSON по WebSocket. Примеры: `send`, `get_storage`, `delete_messages`, `export_file`.
