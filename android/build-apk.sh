#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"
SDK="${ANDROID_SDK_ROOT:-${ANDROID_HOME:-}}"
if [[ -z "$SDK" ]]; then echo 'Defina ANDROID_SDK_ROOT para o Android SDK (API 35, build-tools 35.0.0).'; exit 1; fi
BT="$SDK/build-tools/35.0.0"
PLATFORM="$SDK/platforms/android-35/android.jar"
BUILD="${CC_ANDROID_BUILD_DIR:-/tmp/comunidade-conectada-android-build}"
KEY="${CC_ANDROID_TEST_KEY:-$HOME/.android/debug.keystore}"
mkdir -p "$BUILD/classes" "$BUILD/dex" "$(dirname "$KEY")"
rm -f "$BUILD/app-unsigned.apk" "$BUILD/app-aligned.apk" "$BUILD/comunidade-conectada-teste.apk"
"$BT/aapt" package -f -M app/src/main/AndroidManifest.xml -S app/src/main/res -I "$PLATFORM" -F "$BUILD/app-unsigned.apk"
javac --release 8 -classpath "$PLATFORM" -d "$BUILD/classes" app/src/main/java/br/ilab/comunidadeconectada/MainActivity.java
jar cf "$BUILD/classes.jar" -C "$BUILD/classes" .
"$BT/d8" --min-api 23 --lib "$PLATFORM" --output "$BUILD/dex" "$BUILD/classes.jar"
(cd "$BUILD/dex" && "$BT/aapt" add "$BUILD/app-unsigned.apk" classes.dex)
"$BT/zipalign" -f 4 "$BUILD/app-unsigned.apk" "$BUILD/app-aligned.apk"
if [[ ! -f "$KEY" ]]; then keytool -genkeypair -keystore "$KEY" -storepass android -keypass android -alias androiddebugkey -keyalg RSA -keysize 2048 -validity 10000 -dname 'CN=Android Debug,O=Android,C=BR'; fi
"$BT/apksigner" sign --ks "$KEY" --ks-key-alias androiddebugkey --ks-pass pass:android --key-pass pass:android --out "$BUILD/comunidade-conectada-teste.apk" "$BUILD/app-aligned.apk"
"$BT/apksigner" verify --verbose "$BUILD/comunidade-conectada-teste.apk"
echo "$BUILD/comunidade-conectada-teste.apk"
