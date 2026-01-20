#\!/bin/bash
# Launch Chromium headless with remote debugging for AI agent browser testing
# Uses the pre-authenticated profile

set -e

PORT="${CHROME_DEBUG_PORT:-9222}"
PROFILE_DIR="${CHROME_PROFILE_DIR:-$HOME/snap/chromium/common/chrome-debug-profile}"

# Check if already running
if curl -s "http://127.0.0.1:$PORT/json/version" > /dev/null 2>&1; then
    echo "Chrome debug session already running on port $PORT"
    curl -s "http://127.0.0.1:$PORT/json/version"
    exit 0
fi

# Clean up lock files from previous sessions
rm -f "$PROFILE_DIR/SingletonLock" "$PROFILE_DIR/SingletonSocket" "$PROFILE_DIR/SingletonCookie" 2>/dev/null || true

echo "Starting Chromium headless with remote debugging..."
echo "  Port: $PORT"
echo "  Profile: $PROFILE_DIR"

# Launch Chromium headless
chromium-browser \
    --headless=new \
    --remote-debugging-port="$PORT" \
    --remote-debugging-address=0.0.0.0 \
    --user-data-dir="$PROFILE_DIR" \
    --no-first-run \
    --no-default-browser-check \
    --disable-gpu \
    --no-sandbox \
    --disable-dev-shm-usage \
    "$@" 2>/dev/null &

# Wait for Chromium to start
sleep 4

if curl -s "http://127.0.0.1:$PORT/json/version" > /dev/null 2>&1; then
    echo ""
    echo "Chromium started successfully\!"
    curl -s "http://127.0.0.1:$PORT/json/version"
else
    echo "Warning: Chromium may still be starting. Check with: curl http://127.0.0.1:$PORT/json/version"
fi
