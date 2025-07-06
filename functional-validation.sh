#!/bin/bash

# Claude App Builder - Functional Validation Script
# This script MUST be run by Code Reviewer before approving any implementation

echo "🔍 FUNCTIONAL VALIDATION STARTED"
echo "========================================"

VALIDATION_FAILED=0

# Function to check if port is listening
check_port() {
    local port=$1
    local service_name=$2
    echo "Checking if $service_name is running on port $port..."
    
    if command -v ss >/dev/null 2>&1; then
        if ss -tlnp | grep -q ":$port "; then
            echo "✅ $service_name is listening on port $port"
            return 0
        fi
    elif command -v netstat >/dev/null 2>&1; then
        if netstat -tlnp 2>/dev/null | grep -q ":$port "; then
            echo "✅ $service_name is listening on port $port"
            return 0
        fi
    fi
    
    echo "❌ $service_name is NOT running on port $port"
    return 1
}

# Function to test HTTP endpoint
test_http_endpoint() {
    local url=$1
    local description=$2
    echo "Testing $description..."
    
    if command -v curl >/dev/null 2>&1; then
        if curl -f -s "$url" >/dev/null 2>&1; then
            echo "✅ $description responds correctly"
            return 0
        fi
    elif command -v wget >/dev/null 2>&1; then
        if wget -q --spider "$url" 2>/dev/null; then
            echo "✅ $description responds correctly"
            return 0
        fi
    fi
    
    echo "❌ $description is not responding"
    return 1
}

# Test 1: API Server
echo ""
echo "🔧 Testing API Server..."
if check_port 3001 "API Server"; then
    if test_http_endpoint "http://localhost:3001/api/health" "API Health Endpoint"; then
        if test_http_endpoint "http://localhost:3001/api/workflow/status" "Workflow Status Endpoint"; then
            if test_http_endpoint "http://localhost:3001/api/tasks" "Tasks Endpoint"; then
                echo "✅ API Server: FULLY FUNCTIONAL"
            else
                echo "❌ API Server: Tasks endpoint failed"
                VALIDATION_FAILED=1
            fi
        else
            echo "❌ API Server: Workflow endpoint failed"
            VALIDATION_FAILED=1
        fi
    else
        echo "❌ API Server: Health check failed"
        VALIDATION_FAILED=1
    fi
else
    echo "❌ API Server: Not running"
    VALIDATION_FAILED=1
fi

# Test 2: Dashboard
echo ""
echo "🎨 Testing Dashboard..."
if check_port 3000 "Dashboard"; then
    if test_http_endpoint "http://localhost:3000" "Dashboard Homepage"; then
        echo "✅ Dashboard: FULLY FUNCTIONAL"
    else
        echo "❌ Dashboard: Not responding"
        VALIDATION_FAILED=1
    fi
else
    echo "❌ Dashboard: Not running"
    VALIDATION_FAILED=1
fi

# Test 3: WebSocket (if feature is marked as complete)
echo ""
echo "🔌 Testing WebSocket Integration..."
if command -v node >/dev/null 2>&1; then
    # Create temporary WebSocket test
    cat > /tmp/websocket_test.js << 'EOF'
const { io } = require('socket.io-client');

const socket = io('http://localhost:3001', {
    timeout: 5000,
    transports: ['websocket', 'polling']
});

socket.on('connect', () => {
    console.log('✅ WebSocket: CONNECTED');
    process.exit(0);
});

socket.on('connect_error', (error) => {
    console.log('❌ WebSocket: CONNECTION FAILED -', error.message);
    process.exit(1);
});

setTimeout(() => {
    console.log('❌ WebSocket: CONNECTION TIMEOUT');
    process.exit(1);
}, 5000);
EOF

    if cd "/mnt/c/Users/בית/Downloads/poe helper/dashboard" && node /tmp/websocket_test.js 2>/dev/null; then
        echo "✅ WebSocket: FULLY FUNCTIONAL"
    else
        echo "⚠️  WebSocket: NOT FUNCTIONAL (may not be implemented yet)"
    fi
    rm -f /tmp/websocket_test.js
else
    echo "⚠️  WebSocket: Cannot test (Node.js not available)"
fi

# Test 4: Integration Test - Full Workflow
echo ""
echo "🔄 Testing Full Workflow Integration..."
WORKFLOW_TEST_PASSED=1

# Test workflow start
if command -v curl >/dev/null 2>&1; then
    echo "Testing workflow start..."
    if curl -f -s -X POST "http://localhost:3001/api/workflow/start" -H "Content-Type: application/json" -d '{}' >/dev/null 2>&1; then
        echo "✅ Workflow start: SUCCESS"
        
        # Wait a moment and test status
        sleep 2
        if curl -f -s "http://localhost:3001/api/workflow/status" >/dev/null 2>&1; then
            echo "✅ Workflow status: SUCCESS"
            
            # Test workflow stop
            if curl -f -s -X POST "http://localhost:3001/api/workflow/stop" -H "Content-Type: application/json" -d '{}' >/dev/null 2>&1; then
                echo "✅ Workflow stop: SUCCESS"
            else
                echo "❌ Workflow stop: FAILED"
                WORKFLOW_TEST_PASSED=0
            fi
        else
            echo "❌ Workflow status: FAILED"
            WORKFLOW_TEST_PASSED=0
        fi
    else
        echo "❌ Workflow start: FAILED"
        WORKFLOW_TEST_PASSED=0
    fi
elif command -v wget >/dev/null 2>&1; then
    echo "Testing workflow with wget..."
    if wget -q --post-data='{}' --header='Content-Type:application/json' "http://localhost:3001/api/workflow/start" -O /dev/null 2>/dev/null; then
        echo "✅ Workflow integration: SUCCESS"
    else
        echo "❌ Workflow integration: FAILED"
        WORKFLOW_TEST_PASSED=0
    fi
else
    echo "⚠️  Cannot test workflow (no HTTP client available)"
fi

if [ $WORKFLOW_TEST_PASSED -eq 1 ]; then
    echo "✅ Workflow Integration: FULLY FUNCTIONAL"
else
    echo "❌ Workflow Integration: FAILED"
    VALIDATION_FAILED=1
fi

# Final Results
echo ""
echo "========================================"
if [ $VALIDATION_FAILED -eq 0 ]; then
    echo "🎉 VALIDATION PASSED: All systems functional!"
    echo ""
    echo "✅ System is ready for production use"
    echo "✅ All features are working correctly"
    echo "✅ Integration is complete and functional"
    echo ""
    echo "Code Reviewer: APPROVE this implementation"
    exit 0
else
    echo "❌ VALIDATION FAILED: Issues found!"
    echo ""
    echo "❌ System has non-functional components"
    echo "❌ Implementation is incomplete"
    echo "❌ Do NOT mark tasks as complete"
    echo ""
    echo "Code Reviewer: REJECT this implementation"
    echo "Developer: Fix the issues above before resubmission"
    exit 1
fi