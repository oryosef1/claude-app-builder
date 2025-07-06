#!/bin/bash

# AI Company Memory System Deployment Script
# DevOps Engineer - Automated Deployment

set -e

echo "🚀 AI Company Memory System - Deployment Script"
echo "=================================================="

# Configuration
API_PORT=${API_PORT:-3000}
REDIS_PORT=${REDIS_PORT:-6379}
DEPLOYMENT_MODE=${DEPLOYMENT_MODE:-local}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Pre-deployment checks
check_requirements() {
    log_info "Checking deployment requirements..."
    
    # Check if Node.js is installed
    if ! command -v node &> /dev/null; then
        log_error "Node.js is not installed"
        exit 1
    fi
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        log_error "npm is not installed"
        exit 1
    fi
    
    # Check if Docker is available for containerized deployment
    if command -v docker &> /dev/null; then
        log_info "Docker available - can use containerized deployment"
    else
        log_warning "Docker not available - using local deployment only"
    fi
    
    # Check environment variables
    if [ -z "$PINECONE_API_KEY" ]; then
        log_error "PINECONE_API_KEY not set"
        exit 1
    fi
    
    if [ -z "$OPENAI_API_KEY" ] || [ "$OPENAI_API_KEY" = "your_openai_api_key_here" ]; then
        log_warning "OpenAI API key not configured - some features will be limited"
    fi
    
    log_info "Requirements check passed"
}

# Install dependencies
install_dependencies() {
    log_info "Installing dependencies..."
    npm ci --only=production
    log_info "Dependencies installed"
}

# Start services
start_services() {
    log_info "Starting AI Company Memory System services..."
    
    if [ "$DEPLOYMENT_MODE" = "docker" ] && command -v docker-compose &> /dev/null; then
        log_info "Starting services with Docker Compose..."
        docker-compose up -d
        
        # Wait for services to be ready
        log_info "Waiting for services to be ready..."
        sleep 10
        
        # Check service health
        if docker-compose ps | grep -q "Up"; then
            log_info "Services started successfully"
        else
            log_error "Failed to start services"
            docker-compose logs
            exit 1
        fi
    else
        log_info "Starting services locally..."
        
        # Start Redis in background if not running
        if ! pgrep -f redis-server > /dev/null; then
            log_info "Starting Redis server..."
            redis-server --daemonize yes --port $REDIS_PORT
        fi
        
        # Start Memory API
        log_info "Starting Memory Management API..."
        npm start &
        API_PID=$!
        
        # Wait for API to be ready
        log_info "Waiting for API to be ready..."
        sleep 5
        
        # Check if API is running
        if curl -f http://localhost:$API_PORT/health > /dev/null 2>&1; then
            log_info "Memory Management API started successfully"
        else
            log_error "Failed to start Memory Management API"
            kill $API_PID 2>/dev/null || true
            exit 1
        fi
    fi
}

# Health checks
health_checks() {
    log_info "Performing health checks..."
    
    # API health check
    if curl -f http://localhost:$API_PORT/health > /dev/null 2>&1; then
        log_info "✅ Memory Management API is healthy"
    else
        log_error "❌ Memory Management API health check failed"
        return 1
    fi
    
    # Redis health check
    if redis-cli -p $REDIS_PORT ping > /dev/null 2>&1; then
        log_info "✅ Redis is healthy"
    else
        log_error "❌ Redis health check failed"
        return 1
    fi
    
    # Vector database connectivity check
    log_info "Testing vector database connectivity..."
    if node -e "
        import('./src/test/vector-db-test.js')
        .then(() => console.log('✅ Vector database connectivity verified'))
        .catch(err => { console.error('❌ Vector database connectivity failed:', err.message); process.exit(1); })
    " > /dev/null 2>&1; then
        log_info "✅ Vector database connectivity verified"
    else
        log_warning "⚠️  Vector database connectivity test failed - may need configuration"
    fi
    
    log_info "Health checks completed"
}

# Deployment summary
deployment_summary() {
    log_info "Deployment Summary"
    log_info "=================="
    log_info "Memory Management API: http://localhost:$API_PORT"
    log_info "Redis Server: localhost:$REDIS_PORT"
    log_info "API Documentation: http://localhost:$API_PORT/docs"
    log_info "Health Check: http://localhost:$API_PORT/health"
    log_info ""
    log_info "Available API Endpoints:"
    log_info "- POST /api/memory/experience - Store experience memories"
    log_info "- POST /api/memory/knowledge - Store knowledge memories"
    log_info "- POST /api/memory/decision - Store decision memories"
    log_info "- POST /api/memory/search - Semantic memory search"
    log_info "- POST /api/memory/context - Get relevant context"
    log_info "- GET /api/memory/expertise/:employeeId/:domain - Expertise analysis"
    log_info "- GET /api/memory/stats/:employeeId - Memory statistics"
    log_info "- POST /api/memory/interaction - Store AI interactions"
}

# Main deployment process
main() {
    log_info "Starting deployment process..."
    
    # Source environment variables
    if [ -f .env ]; then
        source .env
    fi
    
    check_requirements
    install_dependencies
    start_services
    health_checks
    deployment_summary
    
    log_info "🎉 Deployment completed successfully!"
}

# Handle script interruption
trap 'log_error "Deployment interrupted"; exit 1' INT TERM

# Run main function
main "$@"