#!/bin/bash

echo "🧠 SMARTACCOUNTING ONE-CLICK START"

# -------------------------
# CLEAN OLD PROCESSES
# -------------------------
echo "🧹 Stopping old processes..."
pkill -f node
pkill -f vite

lsof -ti:5001 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

# -------------------------
# BACKEND START
# -------------------------
echo "🚀 Starting backend..."
cd server
node index.js &
BACKEND_PID=$!

cd ..

# -------------------------
# FRONTEND START
# -------------------------
echo "🚀 Starting frontend..."
cd client
npm run dev &
FRONTEND_PID=$!

cd ..

# -------------------------
# STATUS
# -------------------------
echo "=================================="
echo "✅ SYSTEM RUNNING"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
echo "=================================="
echo "🌐 Frontend: http://localhost:5173"
echo "🧠 Backend:  http://localhost:5001"
