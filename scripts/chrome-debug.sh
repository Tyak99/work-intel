#!/bin/bash
# Launch Chrome with remote debugging for AI agent browser testing
# This creates a persistent profile where you can sign into services ONCE,
# and AI agents can then use those authenticated sessions.

set -e

PORT="${CHROME_DEBUG_PORT:-9222}"
PROFILE_DIR="${CHROME_PROFILE_DIR:-$HOME/.chrome-debug-profile}"

# Detect OS and set Chrome path
case "$(uname -s)" in
    Darwin)
        CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
        ;;
    Linux)
        # Try common Linux Chrome locations
        if [ -x "/usr/bin/google-chrome" ]; then
            CHROME_PATH="/usr/bin/google-chrome"
        elif [ -x "/usr/bin/google-chrome-stable" ]; then
            CHROME_PATH="/usr/bin/google-chrome-stable"
        elif [ -x "/usr/bin/chromium-browser" ]; then
            CHROME_PATH="/usr/bin/chromium-browser"
        else
            echo "Error: Chrome not found. Please install Google Chrome."
            exit 1
        fi
        ;;
    MINGW*|MSYS*|CYGWIN*)
        CHROME_PATH="/c/Program Files/Google/Chrome/Application/chrome.exe"
        ;;
    *)
        echo "Error: Unsupported OS"
        exit 1
        ;;
esac

# Check if Chrome is already running with debugging
if curl -s "http://127.0.0.1:$PORT/json/version" > /dev/null 2>&1; then
    echo "Chrome debug session already running on port $PORT"
    echo ""
    echo "Browser info:"
    curl -s "http://127.0.0.1:$PORT/json/version" | head -5
    exit 0
fi

echo "Starting Chrome with remote debugging..."
echo "  Port: $PORT"
echo "  Profile: $PROFILE_DIR"
echo ""
echo "IMPORTANT: Sign into these services in the browser window that opens:"
echo "  - Gmail/Google (for Nylas OAuth)"
echo "  - GitHub"
echo "  - Jira"
echo ""
echo "Your sessions will persist across restarts."
echo ""

# Launch Chrome
"$CHROME_PATH" \
    --remote-debugging-port="$PORT" \
    --user-data-dir="$PROFILE_DIR" \
    --no-first-run \
    --no-default-browser-check \
    "$@" &

# Wait for Chrome to start
sleep 2

if curl -s "http://127.0.0.1:$PORT/json/version" > /dev/null 2>&1; then
    echo "Chrome started successfully!"
    echo ""
    echo "WebSocket URL for MCP connection:"
    WS_URL=$(curl -s "http://127.0.0.1:$PORT/json/version" | grep -o '"webSocketDebuggerUrl":"[^"]*"' | cut -d'"' -f4)
    echo "  $WS_URL"
    echo ""
    echo "To update your Playwright MCP to use this browser, run:"
    echo "  claude mcp remove playwright"
    echo "  claude mcp add playwright -- npx @playwright/mcp@latest --cdp-endpoint http://127.0.0.1:$PORT"
    echo ""
    echo "Or add a separate authenticated browser MCP:"
    echo "  claude mcp add chrome-auth -- npx @anthropic-ai/mcp-server-playwright --cdp-endpoint http://127.0.0.1:$PORT"
else
    echo "Warning: Chrome may still be starting. Check manually."
fi
