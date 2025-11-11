# Dev Server Guide

## How to Check if Server is Running

### Option 1: Use the Check Script
```bash
./scripts/check-server.sh
```

### Option 2: Manual Check
```bash
# Check if port 8000 is in use
lsof -ti:8000

# Test if server responds
curl http://localhost:8000
```

## How to Start the Dev Server

### Start on Default Port (8000)
```bash
npm run dev
```

**Note:** If port 8000 is already in use (like a Python server), you'll get an error.

### Start on a Different Port
```bash
PORT=8001 npm run dev
```

Or modify `scripts/dev-server.js` to use a different default port.

## Where to Access the Server

Once the server is running, you'll see:
```
🚀 Dev server running at http://localhost:8000
📁 Serving from: /path/to/project
🔧 Environment variables loaded from .env
```

**Access your app:**
- Main page: http://localhost:8000
- Dashboard: http://localhost:8000/index.html
- Forms: http://localhost:8000/forms.html

## Troubleshooting

### Port Already in Use
If you see: `❌ Port 8000 is already in use`

**Solution 1:** Stop the other server
```bash
# Find what's using port 8000
lsof -ti:8000

# Kill the process (replace PID with actual process ID)
kill <PID>
```

**Solution 2:** Use a different port
```bash
PORT=8001 npm run dev
```

### Server Not Responding
1. Check if `.env` file exists:
   ```bash
   test -f .env && echo "✅ .env exists" || echo "❌ Create .env file"
   ```

2. Check server logs in the terminal where you ran `npm run dev`

3. Verify Node.js is installed:
   ```bash
   node --version
   ```

### Environment Variables Not Loading
- Make sure `.env` file exists in the project root
- Check that `.env` contains all required variables (see `.env.example`)
- Restart the server after modifying `.env`

## Server Output Location

The server logs appear in the **terminal where you run `npm run dev`**.

You'll see:
- ✅ Server start message
- 📁 Directory being served
- 🔧 Environment variable confirmation
- ❌ Any errors (file not found, port conflicts, etc.)

## Stop the Server

Press `Ctrl+C` in the terminal where the server is running.

