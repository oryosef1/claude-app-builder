# Multi-Agent Dashboard System - Troubleshooting Guide

## Overview
This guide provides comprehensive troubleshooting procedures for the Multi-Agent Dashboard System, covering common issues, diagnostic techniques, and resolution steps.

## Quick Reference

### Service Health Check
```bash
# Check all services
curl http://localhost:8080/health  # Dashboard Backend
curl http://localhost:3333/health  # Memory API
curl http://localhost:3002/health  # API Bridge
curl http://localhost:3000         # Frontend Dashboard

# Check Redis
redis-cli ping

# Check Claude Code CLI
claude --version
```

### Common Service Ports
- **Frontend Dashboard**: 3000
- **Dashboard Backend**: 8080
- **Memory API**: 3333
- **API Bridge**: 3002
- **Redis**: 6379

## System Issues

### 1. Services Won't Start

#### Dashboard Backend Fails to Start
**Symptoms:**
- Error: `EADDRINUSE: address already in use :::8080`
- Backend not responding to requests
- PM2 shows service as stopped

**Diagnostic Commands:**
```bash
# Check port usage
netstat -tlnp | grep 8080
lsof -i :8080

# Check service logs
pm2 logs dashboard-backend
tail -f dashboard/backend/logs/error.log

# Check environment variables
cd dashboard/backend && node -e "console.log(process.env.PORT)"
```

**Solutions:**
1. **Port Conflict**: Stop existing service on port 8080
   ```bash
   sudo lsof -ti:8080 | xargs kill -9
   ```

2. **Missing Environment Variables**:
   ```bash
   # Check .env file exists
   ls -la dashboard/backend/.env
   
   # Verify required variables
   grep -E "(PORT|REDIS_HOST|MEMORY_API_URL)" dashboard/backend/.env
   ```

3. **Redis Connection Issues**:
   ```bash
   # Start Redis if not running
   redis-server --daemonize yes
   
   # Test Redis connectivity
   redis-cli -h localhost -p 6379 ping
   ```

#### Memory API Fails to Start
**Symptoms:**
- Error: `Failed to connect to Pinecone`
- API returning 500 errors
- Memory operations not working

**Diagnostic Commands:**
```bash
# Check API logs
tail -f logs/memory-api.log

# Test Pinecone connectivity
curl -H "Api-Key: YOUR_API_KEY" https://api.pinecone.io/projects

# Check environment variables
env | grep PINECONE_API_KEY
```

**Solutions:**
1. **Invalid API Key**:
   ```bash
   # Verify API key in .env
   grep PINECONE_API_KEY .env
   
   # Test key validity
   curl -H "Api-Key: YOUR_KEY" https://api.pinecone.io/projects
   ```

2. **Missing Index**:
   - Create index in Pinecone console
   - Verify index name matches configuration

#### Frontend Won't Load
**Symptoms:**
- Blank page or loading spinner
- Connection errors in browser console
- 404 errors for static assets

**Diagnostic Commands:**
```bash
# Check frontend service
curl http://localhost:3000

# Check build status
cd dashboard/frontend && npm run build

# Check development server
cd dashboard/frontend && npm run dev
```

**Solutions:**
1. **Build Issues**:
   ```bash
   cd dashboard/frontend
   rm -rf node_modules package-lock.json
   npm install
   npm run build
   ```

2. **Environment Variables**:
   ```bash
   # Check .env file
   cat dashboard/frontend/.env
   
   # Verify API URL
   grep VITE_API_URL dashboard/frontend/.env
   ```

### 2. Connection Issues

#### Backend Services Not Communicating
**Symptoms:**
- Dashboard shows "Disconnected" status
- API calls failing with network errors
- WebSocket connection drops

**Diagnostic Commands:**
```bash
# Test service connectivity
curl http://localhost:8080/health
curl http://localhost:3333/health
curl http://localhost:3002/health

# Check network routes
netstat -rn

# Test WebSocket connection
wscat -c ws://localhost:8080
```

**Solutions:**
1. **Service Dependencies**:
   ```bash
   # Start services in order
   redis-server --daemonize yes
   cd . && npm start &              # Memory API
   cd api-bridge && node server.js & # API Bridge
   cd dashboard/backend && npm start # Dashboard Backend
   ```

2. **Firewall Issues**:
   ```bash
   # Check firewall rules
   sudo ufw status
   
   # Allow required ports
   sudo ufw allow 3000
   sudo ufw allow 8080
   sudo ufw allow 3333
   sudo ufw allow 3002
   ```

#### WebSocket Connection Problems
**Symptoms:**
- Real-time updates not working
- Dashboard shows connection issues
- Console errors about WebSocket

**Diagnostic Commands:**
```bash
# Test WebSocket endpoint
curl -H "Upgrade: websocket" http://localhost:8080

# Check WebSocket logs
grep -i websocket dashboard/backend/logs/error.log
```

**Solutions:**
1. **CORS Configuration**:
   ```bash
   # Check CORS settings in backend
   grep -i cors dashboard/backend/src/index.js
   
   # Update CORS origin if needed
   export WEBSOCKET_CORS_ORIGIN=http://localhost:3000
   ```

2. **Network Proxy Issues**:
   - Configure proxy to support WebSocket upgrades
   - Check for interference from antivirus/firewall

### 3. Performance Issues

#### Slow Response Times
**Symptoms:**
- API calls taking >2 seconds
- Dashboard feels sluggish
- High CPU/memory usage

**Diagnostic Commands:**
```bash
# Check system resources
top -p $(pgrep -f "node")
free -m
df -h

# Check API response times
curl -w "@curl-format.txt" http://localhost:8080/health

# Monitor process metrics
pm2 monit
```

**Solutions:**
1. **Resource Optimization**:
   ```bash
   # Increase memory limits
   pm2 delete dashboard-backend
   pm2 start ecosystem.config.js
   
   # Monitor memory usage
   pm2 show dashboard-backend
   ```

2. **Database Optimization**:
   ```bash
   # Clear Redis cache
   redis-cli FLUSHALL
   
   # Optimize Pinecone queries
   # Review vector search parameters
   ```

#### High Memory Usage
**Symptoms:**
- System running out of memory
- Process crashes with OOM errors
- Swap usage increasing

**Diagnostic Commands:**
```bash
# Check memory usage by process
ps aux --sort=-%mem | head -20

# Check memory leaks
node --expose-gc dashboard/backend/src/index.js

# Monitor memory over time
watch -n 1 'free -m'
```

**Solutions:**
1. **Memory Leak Detection**:
   ```bash
   # Enable memory monitoring
   node --max-old-space-size=4096 dashboard/backend/src/index.js
   
   # Use memory profiler
   npm install -g clinic
   clinic doctor -- node dashboard/backend/src/index.js
   ```

2. **Process Limits**:
   ```bash
   # Set memory limits in PM2
   pm2 start ecosystem.config.js --max-memory-restart 1G
   
   # Configure swap if needed
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

## Process Management Issues

### 4. Claude Code Process Problems

#### Processes Won't Spawn
**Symptoms:**
- Error: `claude: command not found`
- Process creation fails
- Empty process list in dashboard

**Diagnostic Commands:**
```bash
# Check Claude Code installation
which claude
claude --version

# Check process logs
grep -i "spawn" dashboard/backend/logs/error.log

# Test manual process creation
claude --system-prompt "You are helpful" --max-turns 5
```

**Solutions:**
1. **Claude Code Installation**:
   ```bash
   # Install Claude Code CLI
   npm install -g @anthropic-ai/claude-code
   
   # Configure authentication
   claude auth login
   ```

2. **Path Issues**:
   ```bash
   # Check PATH
   echo $PATH
   
   # Update PATH if needed
   export PATH=$PATH:/usr/local/bin
   
   # Add to shell profile
   echo 'export PATH=$PATH:/usr/local/bin' >> ~/.bashrc
   ```

#### Process Crashes
**Symptoms:**
- Processes stopping unexpectedly
- Error status in dashboard
- Task failures

**Diagnostic Commands:**
```bash
# Check process logs
pm2 logs dashboard-backend | grep -i error

# Check system resources
dmesg | grep -i "killed process"

# Check process limits
ulimit -a
```

**Solutions:**
1. **Resource Limits**:
   ```bash
   # Increase process limits
   ulimit -n 4096
   
   # Set in PM2 config
   max_memory_restart: '2G'
   ```

2. **Error Handling**:
   ```bash
   # Enable process restart
   pm2 start ecosystem.config.js --restart-delay 1000
   
   # Monitor process health
   pm2 monitor
   ```

### 5. Task Management Issues

#### Tasks Stuck in Pending
**Symptoms:**
- Tasks not being assigned
- Queue backing up
- No employee assignments

**Diagnostic Commands:**
```bash
# Check task queue status
curl http://localhost:8080/stats/queue

# Check employee availability
curl http://localhost:8080/employees/available

# Check Redis queue
redis-cli LLEN task_queue
```

**Solutions:**
1. **Employee Availability**:
   ```bash
   # Check employee status
   curl http://localhost:8080/employees
   
   # Update employee availability
   curl -X POST http://localhost:8080/employees/emp_001/status \
     -H "Content-Type: application/json" \
     -d '{"status": "active"}'
   ```

2. **Queue Processing**:
   ```bash
   # Clear stuck tasks
   redis-cli DEL task_queue
   
   # Restart task processing
   pm2 restart dashboard-backend
   ```

#### Task Assignment Failures
**Symptoms:**
- Tasks assigned to unavailable employees
- Skill matching not working
- Manual assignment fails

**Diagnostic Commands:**
```bash
# Check employee skills
curl http://localhost:8080/employees/emp_001

# Check task requirements
curl http://localhost:8080/tasks/task_123

# Check assignment logs
grep -i "assign" dashboard/backend/logs/error.log
```

**Solutions:**
1. **Skill Matching**:
   ```bash
   # Update employee skills
   curl -X POST http://localhost:8080/employees/emp_001/skills \
     -H "Content-Type: application/json" \
     -d '{"skills": ["nodejs", "react"]}'
   ```

2. **Manual Assignment**:
   ```bash
   # Force task assignment
   curl -X POST http://localhost:8080/tasks/task_123/assign \
     -H "Content-Type: application/json" \
     -d '{"employeeId": "emp_001"}'
   ```

## Database Issues

### 6. Redis Problems

#### Redis Connection Failures
**Symptoms:**
- Error: `Redis connection refused`
- Task queue not working
- Cache misses

**Diagnostic Commands:**
```bash
# Check Redis status
redis-cli ping

# Check Redis logs
sudo tail -f /var/log/redis/redis-server.log

# Check Redis configuration
redis-cli INFO
```

**Solutions:**
1. **Start Redis**:
   ```bash
   # Start Redis server
   redis-server --daemonize yes
   
   # Or use system service
   sudo systemctl start redis
   sudo systemctl enable redis
   ```

2. **Configuration Issues**:
   ```bash
   # Check Redis config
   redis-cli CONFIG GET "*"
   
   # Fix common issues
   redis-cli CONFIG SET maxmemory 256mb
   redis-cli CONFIG SET maxmemory-policy allkeys-lru
   ```

### 7. Pinecone Vector Database Issues

#### Vector Search Failures
**Symptoms:**
- Memory search not working
- API errors from Pinecone
- Context loading failures

**Diagnostic Commands:**
```bash
# Test Pinecone connectivity
curl -H "Api-Key: YOUR_KEY" https://api.pinecone.io/describe_index_stats

# Check memory API logs
grep -i pinecone logs/memory-api.log

# Test vector operations
curl -X POST http://localhost:3333/api/memory/search \
  -H "Content-Type: application/json" \
  -d '{"employeeId":"emp_001","query":"test"}'
```

**Solutions:**
1. **API Key Issues**:
   ```bash
   # Verify API key
   echo $PINECONE_API_KEY
   
   # Test key validity
   curl -H "Api-Key: $PINECONE_API_KEY" https://api.pinecone.io/projects
   ```

2. **Index Configuration**:
   ```bash
   # Check index exists
   curl -H "Api-Key: $PINECONE_API_KEY" \
     https://api.pinecone.io/indexes/ai-company-memory
   
   # Verify index dimensions
   # Should be 3072 for text-embedding-3-large
   ```

## Monitoring and Debugging

### 8. Log Analysis

#### Common Log Patterns
```bash
# Error patterns to look for
grep -i "error" logs/*.log
grep -i "timeout" logs/*.log
grep -i "connection" logs/*.log
grep -i "memory" logs/*.log

# Performance patterns
grep -i "slow" logs/*.log
grep -i "high" logs/*.log
grep -i "limit" logs/*.log
```

#### Log File Locations
- Dashboard Backend: `dashboard/backend/logs/`
- Memory API: `logs/`
- PM2 Logs: `~/.pm2/logs/`
- System Logs: `/var/log/`

### 9. System Monitoring

#### Real-time Monitoring
```bash
# System resources
htop
iotop
netstat -tlnp

# Service monitoring
pm2 monit
docker stats

# Application monitoring
curl http://localhost:8080/stats/processes
curl http://localhost:8080/stats/tasks
```

#### Performance Metrics
```bash
# API response times
curl -w "@curl-format.txt" http://localhost:8080/health

# Database performance
redis-cli --latency
redis-cli --stat

# Memory usage
ps aux --sort=-%mem | head -10
```

## Emergency Procedures

### 10. Service Recovery

#### Complete System Reset
```bash
# Stop all services
pm2 stop all
docker-compose down

# Clear caches
redis-cli FLUSHALL
rm -rf dashboard/backend/logs/*
rm -rf logs/*

# Restart services
redis-server --daemonize yes
pm2 start ecosystem.config.js
```

#### Data Recovery
```bash
# Backup current state
tar -czf backup-$(date +%Y%m%d).tar.gz logs/ dashboard/backend/logs/

# Restore from backup
tar -xzf backup-YYYYMMDD.tar.gz

# Reset database
redis-cli FLUSHALL
# Re-initialize Pinecone index if needed
```

### 11. Security Issues

#### Authentication Problems
**Symptoms:**
- Unauthorized access errors
- API key validation failures
- Session timeouts

**Solutions:**
1. **API Key Rotation**:
   ```bash
   # Update Pinecone API key
   export PINECONE_API_KEY=new_key
   
   # Update OpenAI API key
   export OPENAI_API_KEY=new_key
   
   # Restart services
   pm2 restart all
   ```

2. **Security Audit**:
   ```bash
   # Check for exposed secrets
   grep -r "api_key" . --exclude-dir=node_modules
   
   # Review file permissions
   find . -name "*.env" -exec ls -la {} \;
   ```

## Prevention and Maintenance

### 12. Regular Maintenance

#### Daily Tasks
```bash
# Check service health
./health-check.sh

# Monitor logs for errors
tail -f logs/error.log | grep -i error

# Check disk space
df -h
```

#### Weekly Tasks
```bash
# Update dependencies
npm audit fix

# Rotate logs
logrotate -f /etc/logrotate.d/dashboard

# Performance review
pm2 show dashboard-backend
```

#### Monthly Tasks
```bash
# Security updates
npm audit
npm update

# Database maintenance
redis-cli BGREWRITEAOF

# Performance optimization
npm run analyze # if available
```

### 13. Monitoring Setup

#### Automated Monitoring
```bash
# Create monitoring script
cat > monitor.sh << 'EOF'
#!/bin/bash
while true; do
  if ! curl -s http://localhost:8080/health > /dev/null; then
    echo "Dashboard backend down, restarting..."
    pm2 restart dashboard-backend
  fi
  sleep 60
done
EOF

chmod +x monitor.sh
```

#### Alert Configuration
```bash
# Set up email alerts
sudo apt install mailutils

# Configure alert thresholds
echo "Dashboard health check failed" | mail -s "Alert" admin@company.com
```

## Getting Help

### 14. Support Resources

#### Documentation
- API Documentation: `docs/API_DOCUMENTATION.md`
- User Guide: `docs/DASHBOARD_USER_GUIDE.md`
- Deployment Guide: `docs/DEPLOYMENT_GUIDE.md`

#### Community Support
- GitHub Issues: Project repository
- Stack Overflow: Tag with `claude-dashboard`
- Discord: Join the community server

#### Professional Support
- Contact system administrator
- Review service level agreements
- Escalate to technical lead

### 15. Diagnostic Tools

#### Built-in Tools
```bash
# Health check endpoints
curl http://localhost:8080/health
curl http://localhost:3333/health
curl http://localhost:3002/health

# System stats
curl http://localhost:8080/stats/processes
curl http://localhost:8080/stats/tasks
curl http://localhost:8080/stats/queue
```

#### External Tools
```bash
# Install diagnostic tools
npm install -g clinic
npm install -g autocannon

# Performance testing
autocannon -c 10 -d 30 http://localhost:8080

# Memory profiling
clinic doctor -- node dashboard/backend/src/index.js
```

---

*This troubleshooting guide covers the most common issues encountered with the Multi-Agent Dashboard System. For additional support, consult the other documentation files or contact your system administrator.*