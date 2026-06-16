#!/bin/zsh

set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
LINK_ROOT="$HOME/.goldman-news-live"
LAUNCH_AGENTS_DIR="$HOME/Library/LaunchAgents"
PLIST_TARGET="$LAUNCH_AGENTS_DIR/com.goldman.livefeed.hourly.plist"
LOG_DIR="$LINK_ROOT/tmp"

mkdir -p "$LAUNCH_AGENTS_DIR"
ln -sfn "$PROJECT_ROOT" "$LINK_ROOT"
mkdir -p "$LOG_DIR"

cat >"$PLIST_TARGET" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>com.goldman.livefeed.hourly</string>

    <key>ProgramArguments</key>
    <array>
      <string>/bin/sh</string>
      <string>-c</string>
      <string>LOG_FILE=$LOG_DIR/live-hourly.log; echo \"[\$(date '+%Y-%m-%d %H:%M:%S')] launchd trigger\" &gt;&gt; \$LOG_FILE; X_HEADLESS=1 /opt/homebrew/bin/node $LINK_ROOT/node_modules/tsx/dist/cli.mjs $LINK_ROOT/scripts/publish-live-feed.ts &gt;&gt; \$LOG_FILE 2&gt;&amp;1; STATUS=\$?; echo \"[\$(date '+%Y-%m-%d %H:%M:%S')] live:publish exit code: \$STATUS\" &gt;&gt; \$LOG_FILE; exit 0</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
      <key>PATH</key>
      <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin</string>
      <key>HOME</key>
      <string>$HOME</string>
      <key>SHELL</key>
      <string>/bin/zsh</string>
    </dict>

    <key>RunAtLoad</key>
    <true/>

    <key>StartInterval</key>
    <integer>3600</integer>
  </dict>
</plist>
PLIST

launchctl bootout "gui/$(id -u)" "$PLIST_TARGET" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "$PLIST_TARGET"
launchctl kickstart -k "gui/$(id -u)/com.goldman.livefeed.hourly"

echo "Installed launchd job at: $PLIST_TARGET"
echo "Symlinked project root: $LINK_ROOT"
echo "Publish log: $LOG_DIR/live-hourly.log"
