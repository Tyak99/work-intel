#!/bin/bash
# Check status of Chrome debug session

PORT="${CHROME_DEBUG_PORT:-9222}"

echo "Checking Chrome debug session on port $PORT..."
echo ""

if curl -s "http://127.0.0.1:$PORT/json/version" > /dev/null 2>&1; then
    echo "Status: RUNNING"
    echo ""
    echo "Browser Info:"
    curl -s "http://127.0.0.1:$PORT/json/version" | grep -E '"Browser"|"webSocketDebuggerUrl"'
    echo ""
    echo "Open Tabs:"
    curl -s "http://127.0.0.1:$PORT/json/list" | grep -E '"title"|"url"' | head -20
else
    echo "Status: NOT RUNNING"
    echo ""
    echo "Start with: ./scripts/chrome-debug.sh"
fi
