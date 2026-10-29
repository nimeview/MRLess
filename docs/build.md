# Сборка приложений

Нужны оба репозитория рядом: `MRLess/` и `MRLess_server/`.

Общая упаковка UI во все оболочки:

```bash
cd MRLess_server
chmod +x scripts/*.sh macos/build-rust.sh ios/build-rust.sh android/build-rust.sh
./scripts/pack-ui.sh
```

Артефакты: `MRLess_server/dist/<platform>/`.

## macOS (.app)

```bash
./scripts/build-macos.sh
open dist/macos/MRLess.app
```

Требуется Xcode + Apple Development team. Перед подписанием укажи свой Team ID
через `DEVELOPMENT_TEAM=...`.

Dev без .app: из `MRLess` → `bun run app`.

## iOS (.app → устройство)

```bash
./scripts/build-ios.sh
ios-deploy --bundle dist/ios/MRLess.app
```

Или открой `ios/MRLess.xcodeproj` в Xcode и Run.

## Windows (portable)

На **Windows** (MSVC + Rust):

```powershell
cd MRLess_server
# pack-ui: bun build в ../MRLess, скопировать dist → windows\www
cargo build --release --bin mrless
copy target\release\mrless.exe dist\windows\
xcopy /E /I windows\www dist\windows\www
copy windows\MRLess.bat dist\windows\
```

Или из bash с установленным `x86_64-pc-windows-msvc` / `cargo-xwin`:

```bash
./scripts/build-windows.sh
```

Запуск: `MRLess.bat` — поднимает ноду с `--www` и открывает браузер на http://127.0.0.1:3000.

## Android (APK)

Нужны Android SDK + NDK:

```bash
export ANDROID_HOME=~/Library/Android/sdk
export ANDROID_NDK_HOME=$ANDROID_HOME/ndk/<version>
./scripts/build-android.sh
```

Первый раз удобнее открыть `android/` в Android Studio (подтянет Gradle wrapper), затем `./gradlew assembleRelease`.

APK: `dist/android/MRLess.apk`.

## Что куда кладётся

| Платформа | Оболочка | Нода |
|-----------|----------|------|
| macOS | Swift + WKWebView (`macos/`) | `libmrless.a` in-process |
| iOS | Swift + WKWebView (`ios/`) | `libmrless.a` in-process |
| Android | Kotlin + WebView (`android/`) | `libmrless.so` via JNI |
| Windows | `mrless.exe` + browser UI | тот же бинарь + `--www` |
