#!/bin/bash

# Corporate Infrastructure API Bridge Startup Script
# This script starts the API bridge service that connects the dashboard to corporate infrastructure

echo "🚀 Starting Corporate Infrastructure API Bridge..."

# Check if Node.js is available
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed or not in PATH"
    exit 1
fi

# Check if npm is available
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed or not in PATH"
    exit 1
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Failed to install dependencies"
        exit 1
    fi
fi

# Check if Memory API is running
echo "🔍 Checking Memory API status..."
if curl -s -f http://localhost:3333/health > /dev/null 2>&1; then
    echo "✅ Memory API is running on port 3333"
else
    echo "⚠️  Warning: Memory API is not responding on port 3333"
    echo "   The API bridge will start but memory features may not work"
    echo "   To start Memory API: cd ../src && npm start"
fi

# Check if port 3001 is available
if lsof -i :3001 > /dev/null 2>&1; then
    echo "⚠️  Warning: Port 3001 is already in use"
    echo "   Attempting to start anyway (process may fail)"
fi

# Start the API bridge
echo "🏁 Starting API Bridge Server on port 3001..."
echo "   Dashboard can connect at: http://localhost:3001"
echo "   Health check: http://localhost:3001/health"
echo "   API Documentation: http://localhost:3001/api"
echo ""
echo "📊 Available API endpoints:"
echo "   - GET  /api/employees        - List all employees"
echo "   - POST /api/employees/:id/assign - Assign task to employee"
echo "   - GET  /api/workflows/status - Get workflow status"
echo "   - POST /api/workflows/start  - Start new workflow"
echo "   - POST /api/memory/search    - Search memories"
echo "   - GET  /api/performance/system - System performance"
echo "   - GET  /api/system/health    - System health check"
echo ""
echo "Press Ctrl+C to stop the server"
echo "=========================="

# Set environment variables
export NODE_ENV=production
export API_BRIDGE_PORT=3001

# Start the server
node server.js