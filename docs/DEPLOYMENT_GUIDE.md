# AI Company Memory System - Deployment Guide

## Overview

This guide provides comprehensive instructions for deploying the AI Company Memory System, including infrastructure setup, configuration, and monitoring procedures.

## Prerequisites

### System Requirements
- **Node.js**: Version 18.x or higher
- **npm**: Version 9.x or higher
- **Redis**: Version 6.x or higher (for caching)
- **Docker**: Version 20.x or higher (optional, for containerized deployment)
- **Docker Compose**: Version 2.x or higher (optional)

### External Services
- **Pinecone Account**: Vector database service
- **OpenAI API Key**: For embedding generation (optional but recommended)

### Hardware Requirements
- **CPU**: 2+ cores recommended
- **Memory**: 4GB RAM minimum, 8GB recommended
- **Storage**: 10GB available space
- **Network**: Stable internet connection for API calls

## Environment Setup

### 1. Clone and Install Dependencies

```bash
# Navigate to project directory
cd /path/to/ai-company-memory-system

# Install production dependencies
npm ci --only=production

# Or install all dependencies for development
npm install
```

### 2. Environment Configuration

Create a `.env` file in the project root:

```bash
# API Configuration
API_PORT=3000
CORS_ORIGIN=*
LOG_LEVEL=info

# Vector Database Configuration
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=ai-company-memory
PINECONE_WORKSPACE_PATH="default"

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0

# Encryption Configuration
ENCRYPTION_KEY=your_32_character_encryption_key_here
```

### 3. Required API Keys

#### Pinecone Setup
1. Visit [Pinecone Console](https://app.pinecone.io/)
2. Create a new account or sign in
3. Create a new index:
   - **Index Name**: `ai-company-memory`
   - **Dimensions**: `3072` (for text-embedding-3-large)
   - **Metric**: `cosine`
   - **Pod Type**: `p1.x1` (starter tier)
4. Copy your API key from the console

#### OpenAI Setup (Optional)
1. Visit [OpenAI Platform](https://platform.openai.com/)
2. Create an API key
3. Add credits to your account for embedding generation

## Deployment Options

### Option 1: Local Development Deployment

```bash
# Start Redis server
redis-server --daemonize yes

# Start the Memory System API
npm start
```

### Option 2: Production Deployment with PM2

```bash
# Install PM2 globally
npm install -g pm2

# Start services with PM2
pm2 start ecosystem.config.js

# Monitor services
pm2 monit

# View logs
pm2 logs memory-system
```

### Option 3: Docker Deployment

```bash
# Build and start services
docker-compose up -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Option 4: Automated Deployment

Use the provided deployment script:

```bash
# Make script executable
chmod +x deploy.sh

# Run deployment
./deploy.sh

# For Docker deployment
DEPLOYMENT_MODE=docker ./deploy.sh
```

## Configuration Files

### PM2 Configuration (`ecosystem.config.js`)

```javascript
module.exports = {
  apps: [{
    name: 'memory-system',
    script: 'src/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      API_PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    max_memory_restart: '1G',
    restart_delay: 1000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

### Docker Configuration

#### `Dockerfile`
```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY src/ ./src/
COPY .env ./

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/health || exit 1

CMD ["npm", "start"]
```

#### `docker-compose.yml`
```yaml
version: '3.8'

services:
  memory-system:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - REDIS_HOST=redis
    depends_on:
      - redis
    restart: unless-stopped
    volumes:
      - ./logs:/app/logs
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    restart: unless-stopped
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes

volumes:
  redis_data:
```

## Deployment Procedures

### Pre-Deployment Checklist

- [ ] Environment variables configured
- [ ] Pinecone API key validated
- [ ] OpenAI API key configured (if using embeddings)
- [ ] Redis server available
- [ ] Required ports available (3000, 6379)
- [ ] Sufficient disk space and memory
- [ ] Network connectivity to external services

### Step-by-Step Deployment

#### 1. Pre-Deployment Validation
```bash
# Check Node.js version
node --version

# Check npm version
npm --version

# Validate environment variables
npm run config-check  # If available

# Test external connectivity
curl -I https://api.pinecone.io/
curl -I https://api.openai.com/
```

#### 2. Dependency Installation
```bash
# Install production dependencies
npm ci --only=production

# Verify installation
npm ls --depth=0
```

#### 3. Service Startup
```bash
# Option A: Direct startup
npm start

# Option B: PM2 startup
pm2 start ecosystem.config.js

# Option C: Docker startup
docker-compose up -d
```

#### 4. Health Verification
```bash
# Check API health
curl http://localhost:3000/health

# Check Redis connectivity
redis-cli ping

# Run system tests
npm test  # If available
```

#### 5. Service Registration
```bash
# Register PM2 with system startup
pm2 startup
pm2 save

# Or configure systemd service
sudo systemctl enable memory-system
sudo systemctl start memory-system
```

### Post-Deployment Verification

#### Functional Tests
```bash
# Test memory storage
curl -X POST http://localhost:3000/api/memory/experience \
  -H "Content-Type: application/json" \
  -d '{"employeeId":"emp_001","content":"Test memory"}'

# Test memory search
curl -X POST http://localhost:3000/api/memory/search \
  -H "Content-Type: application/json" \
  -d '{"employeeId":"emp_001","query":"test"}'

# Test statistics
curl http://localhost:3000/api/memory/stats/emp_001
```

#### Performance Tests
```bash
# Load test with Apache Bench
ab -n 100 -c 10 http://localhost:3000/health

# Monitor resource usage
top -p $(pgrep -f "node.*index.js")
```

## Monitoring and Logging

### Log Configuration

Logs are written to multiple destinations:
- **Console**: Real-time monitoring
- **Files**: Persistent storage in `logs/` directory
- **JSON Format**: Structured logging for analysis

### Log Levels
- **ERROR**: System failures and exceptions
- **WARN**: Performance issues and deprecated usage
- **INFO**: Normal operations and requests
- **DEBUG**: Detailed debugging information

### Monitoring Endpoints

#### Health Check
```bash
# Basic health check
curl http://localhost:3000/health

# Response format
{
  "status": "healthy",
  "timestamp": "2025-07-06T12:00:00.000Z",
  "service": "AI Company Memory System",
  "version": "1.0.0"
}
```

#### Metrics Collection
```bash
# Memory statistics
curl http://localhost:3000/api/memory/stats

# Individual employee stats
curl http://localhost:3000/api/memory/stats/emp_001
```

### Alerting Configuration

Set up monitoring alerts for:
- API response time > 1000ms
- Memory usage > 80%
- Error rate > 5%
- Vector database connectivity failures
- Redis connection issues

## Backup and Recovery

### Data Backup Procedures

#### Vector Database Backup
```bash
# Pinecone provides automatic backups
# Configure backup policies in Pinecone console
```

#### Redis Backup
```bash
# Manual backup
redis-cli SAVE

# Automated backup
redis-cli BGSAVE

# Copy backup file
cp /var/lib/redis/dump.rdb /backup/redis-$(date +%Y%m%d).rdb
```

#### Configuration Backup
```bash
# Backup configuration files
tar -czf config-backup-$(date +%Y%m%d).tar.gz .env ecosystem.config.js docker-compose.yml
```

### Recovery Procedures

#### Service Recovery
```bash
# PM2 recovery
pm2 resurrect

# Docker recovery
docker-compose up -d

# Manual recovery
npm start
```

#### Data Recovery
```bash
# Redis recovery
redis-cli FLUSHALL
redis-cli < backup.rdb

# Pinecone recovery
# Use Pinecone console to restore from backup
```

## Security Considerations

### Network Security
- Configure firewall rules for required ports
- Use reverse proxy (nginx/Apache) for SSL termination
- Implement rate limiting at proxy level

### API Security
- Implement authentication and authorization
- Use HTTPS in production
- Validate all input data
- Implement proper CORS policies

### Data Security
- Encrypt sensitive data at rest
- Use secure encryption keys
- Implement proper access controls
- Regular security audits

## Troubleshooting

### Common Issues

#### API Startup Failures
```bash
# Check port availability
netstat -tlnp | grep 3000

# Check logs
tail -f logs/memory-api.log

# Verify environment variables
env | grep -E "(PINECONE|OPENAI|REDIS)"
```

#### Connection Issues
```bash
# Test Pinecone connectivity
curl -H "Api-Key: $PINECONE_API_KEY" https://api.pinecone.io/projects

# Test Redis connectivity
redis-cli -h $REDIS_HOST -p $REDIS_PORT ping

# Test OpenAI connectivity
curl -H "Authorization: Bearer $OPENAI_API_KEY" https://api.openai.com/v1/models
```

#### Performance Issues
```bash
# Check memory usage
free -m
ps aux | grep node

# Check CPU usage
top -p $(pgrep -f node)

# Check disk usage
df -h
du -sh logs/
```

### Diagnostic Commands

```bash
# System diagnostics
./deploy.sh --health-check

# Service status
pm2 status
docker-compose ps

# Network diagnostics
netstat -tlnp
ss -tlnp

# Resource diagnostics
htop
iotop
```

## Scaling Considerations

### Horizontal Scaling
- Use load balancer (nginx, HAProxy)
- Deploy multiple API instances
- Implement session affinity if needed
- Use Redis Cluster for caching

### Vertical Scaling
- Increase CPU cores and memory
- Optimize Node.js process settings
- Configure PM2 clustering
- Monitor resource utilization

### Database Scaling
- Use Pinecone's auto-scaling features
- Implement read replicas if available
- Optimize vector search queries
- Consider data archival strategies

## Maintenance

### Regular Maintenance Tasks
- Monitor log file sizes and rotate as needed
- Update dependencies regularly
- Monitor API key usage and limits
- Review and optimize memory usage
- Backup configuration and data

### Update Procedures
```bash
# Update dependencies
npm update

# Update system
pm2 reload ecosystem.config.js

# Update Docker images
docker-compose pull
docker-compose up -d
```

## Support and Documentation

### Additional Resources
- [API Documentation](./API_DOCUMENTATION.md)
- [Architecture Overview](../ARCHITECTURE.md)
- [Memory Management Guide](./MEMORY_MANAGEMENT_GUIDE.md)
- [Corporate Workflow Integration](./WORKFLOW_INTEGRATION.md)

### Support Channels
- Check logs in `logs/` directory
- Review deployment status in `deployment-status.json`
- Monitor system health via `/health` endpoint
- Review performance metrics via `/api/memory/stats`

### Emergency Procedures
1. **Service Failure**: Restart services using PM2 or Docker
2. **Database Issues**: Check connectivity and API keys
3. **Performance Degradation**: Scale resources or optimize queries
4. **Data Loss**: Restore from backups
5. **Security Breach**: Rotate API keys and review logs