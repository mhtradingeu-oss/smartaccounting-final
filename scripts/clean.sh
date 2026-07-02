#!/bin/bash

echo "🧼 FULL CLEAN START"

# remove caches
rm -rf client/node_modules/.vite
rm -rf client/dist
rm -rf server/node_modules/.cache

# kill processes
pkill -f node
pkill -f vite

# clear ports
lsof -ti:5001 | xargs kill -9 2>/dev/null
lsof -ti:5173 | xargs kill -9 2>/dev/null

echo "✅ CLEAN COMPLETE"
