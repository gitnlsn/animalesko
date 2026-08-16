#!/usr/bin/env bash
#
# Build, run and release the Animalesko native apps.
#
#   ./scripts/mobile.sh <command>
#
# Run `./scripts/mobile.sh help` for the list.
#
# Every command is also reachable through pnpm (see package.json); this file is
# where the actual sequence lives, so the two cannot drift.

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO_ROOT="$(cd "$APP_DIR/../.." && pwd)"
APP_ID="org.animalesko.app"

cd "$APP_DIR"

# --- output -----------------------------------------------------------------

if [ -t 1 ]; then
  BOLD=$'\033[1m'; RED=$'\033[31m'; GREEN=$'\033[32m'; YELLOW=$'\033[33m'; DIM=$'\033[2m'; OFF=$'\033[0m'
else
  BOLD=""; RED=""; GREEN=""; YELLOW=""; DIM=""; OFF=""
fi

step() { printf '\n%s==>%s %s%s%s\n' "$GREEN" "$OFF" "$BOLD" "$1" "$OFF"; }
info() { printf '    %s%s%s\n' "$DIM" "$1" "$OFF"; }
warn() { printf '%s warn %s %s\n' "$YELLOW" "$OFF" "$1" >&2; }
die()  { printf '\n%s error%s %s\n\n' "$RED" "$OFF" "$1" >&2; exit 1; }

need() {
  command -v "$1" >/dev/null 2>&1 || die "\`$1\` is not on PATH. $2"
}

# --- android sdk ------------------------------------------------------------

# Gradle and adb both need this, and the Android Studio default install is not
# on PATH. Resolved once here rather than exported in every shell.
android_sdk() {
  if [ -n "${ANDROID_HOME:-}" ]; then echo "$ANDROID_HOME"; return; fi
  if [ -n "${ANDROID_SDK_ROOT:-}" ]; then echo "$ANDROID_SDK_ROOT"; return; fi
  if [ -d "$HOME/Library/Android/sdk" ]; then echo "$HOME/Library/Android/sdk"; return; fi
  die "Android SDK not found. Install Android Studio, or set ANDROID_HOME."
}

adb_bin() { echo "$(android_sdk)/platform-tools/adb"; }

# --- web bundle -------------------------------------------------------------

# NEXT_PUBLIC_API_URL is inlined into the JavaScript at build time, so it is the
# one input that decides which server the shipped app talks to. Getting it wrong
# produces an app that builds, installs, launches — and reaches nothing.
build_web() {
  local api_url="$1"

  step "Building web bundle"
  info "API: $api_url"

  NEXT_PUBLIC_API_URL="$api_url" pnpm exec next build

  [ -d "$APP_DIR/out" ] || die "next build produced no out/ directory."
}

# --- commands ---------------------------------------------------------------

cmd_help() {
  cat <<EOF
${BOLD}Animalesko mobile${OFF}

  ${BOLD}Development${OFF}
    dev-android        Build, install and launch on a running emulator/device
    dev-ios            Build, sync and open Xcode

  ${BOLD}Release${OFF}
    release-android    Build a signed .aab for the Play Console
    release-ios        Build and open Xcode ready to Archive
    bump [major|minor|patch]
                       Raise the version on both platforms (default: patch)

  ${BOLD}Utilities${OFF}
    doctor             Check the toolchain and report what is missing
    version            Print the current version

  ${BOLD}Environment${OFF}
    API_URL            Override the API the build points at
    DEV_API_URL        Dev default (http://localhost:3000)
    PROD_API_URL       Release default (https://app.animalesko.org)
EOF
}

cmd_version() {
  local code name
  code=$(grep -oE 'versionCode +[0-9]+' android/app/build.gradle | grep -oE '[0-9]+')
  name=$(grep -oE 'versionName +"[^"]+"' android/app/build.gradle | sed -E 's/.*"(.*)"/\1/')
  printf 'versionName  %s\nversionCode  %s\n' "$name" "$code"
}

cmd_doctor() {
  local sdk missing=0

  step "Toolchain"

  if command -v node >/dev/null; then info "node        $(node --version)"; else warn "node missing"; missing=1; fi
  if command -v pnpm >/dev/null; then info "pnpm        $(pnpm --version)"; else warn "pnpm missing"; missing=1; fi

  if command -v xcodebuild >/dev/null 2>&1; then
    info "xcode       $(xcodebuild -version 2>/dev/null | head -1)"
  else
    warn "Xcode missing — iOS commands will not work"
  fi

  if sdk=$(android_sdk 2>/dev/null); then
    info "android sdk $sdk"
  else
    warn "Android SDK missing — Android commands will not work"
  fi

  step "Release readiness"

  if [ -f "$APP_DIR/android/keystore.properties" ]; then
    info "android signing   configured"
  else
    warn "android signing   NO KEYSTORE — release-android will produce an unsigned .aab that Play rejects."
    info "                  see 'One-time setup' in apps/mobile/README.md"
  fi

  if grep -q "DEVELOPMENT_TEAM" ios/App/App.xcodeproj/project.pbxproj 2>/dev/null; then
    info "ios signing       team set"
  else
    warn "ios signing       no DEVELOPMENT_TEAM — needs an Apple Developer Program account"
  fi

  step "Version"
  cmd_version

  [ "$missing" -eq 0 ] || die "Core tooling is missing; fix the warnings above."
}

cmd_dev_android() {
  need pnpm "Install it with: corepack enable"
  local adb; adb="$(adb_bin)"
  [ -x "$adb" ] || die "adb not found at $adb"

  local devices
  devices=$("$adb" devices | tail -n +2 | grep -c "device$" || true)
  [ "$devices" -gt 0 ] || die "No emulator or device. Start one from Android Studio, then re-run."

  step "Forwarding port 3000 to this machine"
  # Inside an emulator `localhost` is the emulator itself. A reverse tunnel is
  # more reliable than the 10.0.2.2 host alias and works over USB too.
  "$adb" reverse tcp:3000 tcp:3000
  info "emulator localhost:3000 -> host localhost:3000"

  build_web "${API_URL:-${DEV_API_URL:-http://localhost:3000}}"

  step "Syncing into the Android project"
  # CAP_DEV opens allowMixedContent: the bundle is served from https://localhost
  # and a plain-http dev server would otherwise be blocked as mixed content
  # before CORS is even consulted. Never set for a release.
  CAP_DEV=true pnpm exec cap sync android

  step "Installing"
  (cd android && ANDROID_HOME="$(android_sdk)" ./gradlew installDebug -q)

  step "Launching"
  "$adb" shell am force-stop "$APP_ID" >/dev/null 2>&1 || true
  "$adb" shell monkey -p "$APP_ID" -c android.intent.category.LAUNCHER 1 >/dev/null 2>&1

  printf '\n%s running%s  %s\n' "$GREEN" "$OFF" "$APP_ID"
  info "logs: $(adb_bin) logcat -s Capacitor/Console"
}

cmd_dev_ios() {
  need xcodebuild "Install Xcode from the App Store."

  build_web "${API_URL:-${DEV_API_URL:-http://localhost:3000}}"

  step "Syncing into the iOS project"
  pnpm exec cap sync ios

  step "Opening Xcode"
  info "press ⌘R to run on a simulator"
  pnpm exec cap open ios
}

# Refuses to build a release against anything that is not https, because the
# failure is silent and permanent: an app shipped pointing at a dev host is
# broken for every user until the next store review.
assert_release_api_url() {
  local url="$1"

  case "$url" in
    https://*) ;;
    *) die "Release builds require an https API URL, got: $url
      Set PROD_API_URL or API_URL to the apps/app deployment." ;;
  esac

  case "$url" in
    *localhost*|*127.0.0.1*|*10.0.2.2*|*192.168.*)
      die "Release API URL points at a local address: $url" ;;
  esac
}

cmd_release_android() {
  local url="${API_URL:-${PROD_API_URL:-https://app.animalesko.org}}"
  assert_release_api_url "$url"

  if [ ! -f "$APP_DIR/android/keystore.properties" ] \
     && [ -z "${ANDROID_KEYSTORE_FILE:-}" ]; then
    die "No signing key. Play rejects an unsigned bundle.
      Create android/keystore.properties — see apps/mobile/README.md."
  fi

  step "Release build"
  cmd_version

  build_web "$url"

  step "Syncing into the Android project"
  # Deliberately without CAP_DEV, so allowMixedContent stays off.
  pnpm exec cap sync android

  step "Assembling the app bundle"
  (cd android && ANDROID_HOME="$(android_sdk)" ./gradlew bundleRelease)

  local aab="$APP_DIR/android/app/build/outputs/bundle/release/app-release.aab"
  [ -f "$aab" ] || die "bundleRelease produced no .aab"

  printf '\n%s built%s  %s%s%s (%s)\n' "$GREEN" "$OFF" "$BOLD" "$aab" "$OFF" "$(du -h "$aab" | cut -f1)"
  info "upload at https://play.google.com/console -> Testing -> Internal testing"
  info "promote to production only after the internal track looks right"
}

cmd_release_ios() {
  need xcodebuild "Install Xcode from the App Store."

  local url="${API_URL:-${PROD_API_URL:-https://app.animalesko.org}}"
  assert_release_api_url "$url"

  step "Release build"
  cmd_version

  build_web "$url"

  step "Syncing into the iOS project"
  pnpm exec cap sync ios

  step "Opening Xcode"
  cat <<EOF
    Xcode cannot archive from the command line without a signing team, so the
    last two steps are manual:

      1. Product > Destination > Any iOS Device
      2. Product > Archive
      3. Distribute App > App Store Connect > Upload

    Then release through TestFlight before submitting for review.
EOF
  pnpm exec cap open ios
}

# Keeps both platforms on one version. They are independent numbers that nobody
# benefits from having diverge, and a mismatch makes a bug report ambiguous.
cmd_bump() {
  local part="${1:-patch}"
  local code name major minor patch next_name next_code

  code=$(grep -oE 'versionCode +[0-9]+' android/app/build.gradle | grep -oE '[0-9]+')
  name=$(grep -oE 'versionName +"[^"]+"' android/app/build.gradle | sed -E 's/.*"(.*)"/\1/')

  IFS=. read -r major minor patch <<<"$name"
  major=${major:-1}; minor=${minor:-0}; patch=${patch:-0}

  case "$part" in
    major) next_name="$((major + 1)).0.0" ;;
    minor) next_name="${major}.$((minor + 1)).0" ;;
    patch) next_name="${major}.${minor}.$((patch + 1))" ;;
    *) die "Unknown part '$part'. Use major, minor or patch." ;;
  esac

  # Must strictly increase — both stores reject a duplicate, and they do it
  # after the upload rather than before the build.
  next_code=$((code + 1))

  step "Bumping $name ($code) -> $next_name ($next_code)"

  sed -i '' -E "s/versionCode +[0-9]+/versionCode $next_code/" android/app/build.gradle
  sed -i '' -E "s/versionName +\"[^\"]+\"/versionName \"$next_name\"/" android/app/build.gradle

  sed -i '' -E "s/CURRENT_PROJECT_VERSION = [0-9]+;/CURRENT_PROJECT_VERSION = $next_code;/g" \
    ios/App/App.xcodeproj/project.pbxproj
  sed -i '' -E "s/MARKETING_VERSION = [^;]+;/MARKETING_VERSION = $next_name;/g" \
    ios/App/App.xcodeproj/project.pbxproj

  cmd_version
  info "commit this before building, so the artefact is traceable to a revision"
}

# --- dispatch ---------------------------------------------------------------

case "${1:-help}" in
  dev-android|dev:android)         shift; cmd_dev_android "$@" ;;
  dev-ios|dev:ios)                 shift; cmd_dev_ios "$@" ;;
  release-android|release:android) shift; cmd_release_android "$@" ;;
  release-ios|release:ios)         shift; cmd_release_ios "$@" ;;
  bump)                            shift; cmd_bump "$@" ;;
  doctor)                          shift; cmd_doctor "$@" ;;
  version)                         shift; cmd_version "$@" ;;
  help|-h|--help)                  cmd_help ;;
  *) printf '%sUnknown command:%s %s\n\n' "$RED" "$OFF" "$1" >&2; cmd_help; exit 1 ;;
esac
