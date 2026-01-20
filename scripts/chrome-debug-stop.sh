#!/bin/bash
# Stop Chrome debug session

PORT="${CHROME_DEBUG_PORT:-9222}"

echo "Stopping Chrome debug session..."

# Find and kill Chrome processes using the debug port
if [ "$(uname -s)" = "Darwin" ]; then
    # macOS
    pkill -f "remote-debugging-port=$PORT" 2>/dev/null || true
else
    # Linux
    pkill -f "remote-debugging-port=$PORT" 2>/dev/null || true
fi

sleep 1

if curl -s "http://127.0.0.1:$PORT/json/version" > /dev/null 2>&1; then
    echo "Warning: Chrome may still be running"
else
    echo "Chrome debug session stopped"
fi
