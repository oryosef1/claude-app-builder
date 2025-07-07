#!/bin/bash

# AI Company Deployment Validation Script
# DevOps Engineer: Drew
# Date: 2025-07-07

echo "🚀 AI SOFTWARE COMPANY - DEPLOYMENT VALIDATION"
echo "=============================================="
echo ""

# Function to check service health
check_service() {
    local service_name="$1"
    local url="$2"
    local port="$3"
    
    echo "🔍 Checking $service_name on port $port..."
    
    if wget -q --spider "$url" 2>/dev/null; then
        local response=$(wget -q -O - "$url" 2>/dev/null)
        echo "✅ $service_name: ONLINE"
        echo "   Response: $response"
        return 0
    else
        echo "❌ $service_name: OFFLINE"
        return 1
    fi
}

# Function to check process
check_process() {
    local process_name="$1"
    local search_pattern="$2"
    
    echo "🔍 Checking $process_name process..."
    
    if ps aux | grep "$search_pattern" | grep -v grep > /dev/null; then
        local pid=$(ps aux | grep "$search_pattern" | grep -v grep | awk '{print $2}' | head -1)
        echo "✅ $process_name: RUNNING (PID: $pid)"
        return 0
    else
        echo "❌ $process_name: NOT RUNNING"
        return 1
    fi
}

echo "📊 INFRASTRUCTURE HEALTH CHECK"
echo "==============================="

# Check core services
services_ok=0

# Memory API (Port 3333)
if check_service "Memory API" "http://localhost:3333/health" "3333"; then
    ((services_ok++))
fi
echo ""

# API Bridge (Port 3001)
if check_service "API Bridge" "http://localhost:3001/health" "3001"; then
    ((services_ok++))
fi
echo ""

# Dashboard (Port 5173 - Development) or (Port 3000 - Production)
echo "🔍 Checking Dashboard accessibility..."
if wget -q --spider "http://localhost:5173" 2>/dev/null; then
    echo "✅ Dashboard (Dev): ACCESSIBLE on port 5173"
    ((services_ok++))
elif wget -q --spider "http://localhost:3000" 2>/dev/null; then
    echo "✅ Dashboard (Prod): ACCESSIBLE on port 3000"
    ((services_ok++))
else
    echo "⚠️  Dashboard: NOT ACCESSIBLE (Vite build issues - manual deployment required)"
fi
echo ""

echo "🔧 PROCESS MONITORING"
echo "===================="

# Check Node.js processes
check_process "Memory API Server" "node.*index.js"
check_process "API Bridge Server" "node server.js"
echo ""

echo "📈 PERFORMANCE METRICS"
echo "======================"

# System resources
echo "🔍 System Resource Usage:"
echo "   Memory: $(free -h | awk '/^Mem:/ {print $3 "/" $2}')"
echo "   Uptime: $(uptime | awk -F'up ' '{print $2}' | awk -F',' '{print $1}')"
echo ""

# Service uptime from logs
echo "🔍 Service Uptime:"
if [ -f "api-bridge/api-bridge.log" ]; then
    local api_start=$(grep "started on port 3001" api-bridge/api-bridge.log | tail -1 | grep -o '[0-9-]*T[0-9:]*' | head -1)
    echo "   API Bridge: Started at $api_start"
fi

if [ -f "memory-api.log" ]; then
    echo "   Memory API: Running (log file exists)"
fi
echo ""

echo "📋 DEPLOYMENT SUMMARY"
echo "===================="
echo "Services Online: $services_ok/3"

if [ $services_ok -eq 3 ]; then
    echo "🎉 DEPLOYMENT STATUS: ✅ FULLY OPERATIONAL"
    echo ""
    echo "🌐 Service Endpoints:"
    echo "   • Memory API:     http://localhost:3333"
    echo "   • API Bridge:     http://localhost:3001"
    echo "   • Dashboard:      http://localhost:5173 (dev) or http://localhost:3000 (prod)"
    echo ""
    echo "🔗 Quick Access URLs:"
    echo "   • Health Check:   http://localhost:3333/health"
    echo "   • API Bridge:     http://localhost:3001/health"
    echo "   • Employee Data:  http://localhost:3001/api/employees"
    echo ""
elif [ $services_ok -eq 2 ]; then
    echo "⚠️  DEPLOYMENT STATUS: PARTIALLY OPERATIONAL"
    echo "   Core services running, dashboard may need manual deployment"
else
    echo "❌ DEPLOYMENT STATUS: CRITICAL ISSUES"
    echo "   Multiple services offline - manual intervention required"
fi

echo "📝 Next Steps:"
echo "   1. For dashboard deployment issues, run: cd dashboard && npm run build"
echo "   2. Monitor logs in api-bridge/api-bridge.log and memory-api.log"
echo "   3. Access Master Control Dashboard at configured port"
echo ""
echo "🏁 Deployment validation complete."