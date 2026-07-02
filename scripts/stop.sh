#!/bin/bash

echo "🛑 STOPPING SMARTACCOUNTING SYSTEM"

pkill -f node
pkill -f vite

lsof -ti:5001 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

echo "✅ ALL SERVICES STOPPED"
