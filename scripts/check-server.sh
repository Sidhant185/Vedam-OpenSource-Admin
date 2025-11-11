#!/bin/bash
# Quick script to check if dev server is running

PORT=8000

echo "🔍 Checking dev server status..."
echo ""

# Check if port is in use
if lsof -ti:$PORT > /dev/null 2>&1; then
    echo "✅ Port $PORT is in use"
    echo ""
    echo "Processes using port $PORT:"
    lsof -ti:$PORT | while read pid; do
        ps -p $pid -o pid,comm,args 2>/dev/null | tail -n 1
    done
    echo ""
    echo "🌐 Testing server response..."
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT 2>/dev/null)
    if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "404" ]; then
        echo "✅ Server is responding (HTTP $HTTP_CODE)"
        echo ""
        echo "📍 Access your app at: http://localhost:$PORT"
        echo "   or open in browser: http://localhost:$PORT/index.html"
    else
        echo "⚠️  Port is in use but server may not be responding (HTTP $HTTP_CODE)"
    fi
else
    echo "❌ Port $PORT is not in use - server is not running"
    echo ""
    echo "💡 To start the server, run:"
    echo "   npm run dev"
fi

