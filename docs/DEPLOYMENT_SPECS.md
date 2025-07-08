# Deployment and Infrastructure Specifications

## Overview

This document defines the deployment architecture, infrastructure requirements, and operational procedures for the Multi-Agent Dashboard System.

## 1. Infrastructure Requirements

### 1.1 Development Environment
```yaml
# Development specifications
resources:
  cpu: 4 cores
  memory: 8GB RAM
  storage: 50GB SSD
  
services:
  - redis: 7.0+
  - node: 20+
  - postgresql: 15+ (optional)
  - claude-cli: latest

ports:
  - 3000: Frontend development server
  - 8080: Backend API server
  - 3333: Memory API service
  - 3002: API Bridge service
  - 6379: Redis server
```

### 1.2 Production Environment
```yaml
# Production specifications
resources:
  cpu: 16 cores
  memory: 32GB RAM
  storage: 200GB SSD
  
services:
  - redis-cluster: 7.0+
  - postgresql: 15+
  - nginx: 1.24+
  - docker: 24.0+
  - kubernetes: 1.28+ (optional)

load_balancer:
  type: nginx
  ssl_termination: true
  health_checks: enabled
  
monitoring:
  - prometheus
  - grafana
  - loki
  - jaeger
```

## 2. Docker Configuration

### 2.1 Multi-stage Backend Dockerfile
```dockerfile
# Dockerfile.backend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci --only=production

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production image
FROM node:20-alpine AS production

WORKDIR /app

# Install dumb-init for proper signal handling
RUN apk add --no-cache dumb-init

# Create non-root user
RUN addgroup -g 1001 -S nodejs
RUN adduser -S dashboard -u 1001

# Copy built application
COPY --from=builder --chown=dashboard:nodejs /app/dist ./dist
COPY --from=builder --chown=dashboard:nodejs /app/node_modules ./node_modules
COPY --from=builder --chown=dashboard:nodejs /app/package.json ./

# Switch to non-root user
USER dashboard

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:8080/health || exit 1

# Start application
ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "dist/index.js"]
```

### 2.2 Frontend Dockerfile
```dockerfile
# Dockerfile.frontend
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./
RUN npm ci

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Production image
FROM nginx:1.24-alpine AS production

# Copy built application
COPY --from=builder /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/nginx.conf

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000 || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
```

### 2.3 Docker Compose Configuration
```yaml
# docker-compose.yml
version: '3.8'

services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 3

  database:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: dashboard
      POSTGRES_USER: dashboard_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U dashboard_user"]
      interval: 10s
      timeout: 5s
      retries: 3

  backend:
    build:
      context: .
      dockerfile: Dockerfile.backend
    ports:
      - "8080:8080"
    environment:
      - NODE_ENV=production
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgresql://dashboard_user:${DB_PASSWORD}@database:5432/dashboard
      - MEMORY_API_URL=http://memory-api:3333
      - API_BRIDGE_URL=http://api-bridge:3002
    depends_on:
      redis:
        condition: service_healthy
      database:
        condition: service_healthy
    volumes:
      - ./logs:/app/logs
    restart: unless-stopped

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:3000"
    environment:
      - VITE_API_URL=http://localhost:8080
      - VITE_WS_URL=ws://localhost:8080
    depends_on:
      - backend
    restart: unless-stopped

  memory-api:
    image: dashboard/memory-api:latest
    ports:
      - "3333:3333"
    environment:
      - PINECONE_API_KEY=${PINECONE_API_KEY}
      - HUGGINGFACE_API_KEY=${HUGGINGFACE_API_KEY}
    restart: unless-stopped

  api-bridge:
    image: dashboard/api-bridge:latest
    ports:
      - "3002:3002"
    environment:
      - NODE_ENV=production
    volumes:
      - ./ai-employees:/app/ai-employees
    restart: unless-stopped

  nginx:
    image: nginx:1.24-alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - frontend
      - backend
    restart: unless-stopped

volumes:
  redis_data:
  postgres_data:
```

## 3. Kubernetes Deployment

### 3.1 Namespace and ConfigMap
```yaml
# k8s/namespace.yaml
apiVersion: v1
kind: Namespace
metadata:
  name: dashboard-system

---
# k8s/configmap.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: dashboard-config
  namespace: dashboard-system
data:
  NODE_ENV: "production"
  REDIS_URL: "redis://redis-service:6379"
  DATABASE_URL: "postgresql://dashboard_user:password@postgres-service:5432/dashboard"
  MEMORY_API_URL: "http://memory-api-service:3333"
  API_BRIDGE_URL: "http://api-bridge-service:3002"
```

### 3.2 Backend Deployment
```yaml
# k8s/backend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dashboard-backend
  namespace: dashboard-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: dashboard-backend
  template:
    metadata:
      labels:
        app: dashboard-backend
    spec:
      containers:
      - name: backend
        image: dashboard/backend:latest
        ports:
        - containerPort: 8080
        env:
        - name: NODE_ENV
          valueFrom:
            configMapKeyRef:
              name: dashboard-config
              key: NODE_ENV
        - name: REDIS_URL
          valueFrom:
            configMapKeyRef:
              name: dashboard-config
              key: REDIS_URL
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: dashboard-secrets
              key: DATABASE_URL
        resources:
          requests:
            memory: "512Mi"
            cpu: "250m"
          limits:
            memory: "1Gi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 30
          periodSeconds: 10
        readinessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 5

---
apiVersion: v1
kind: Service
metadata:
  name: dashboard-backend-service
  namespace: dashboard-system
spec:
  selector:
    app: dashboard-backend
  ports:
    - protocol: TCP
      port: 8080
      targetPort: 8080
  type: ClusterIP
```

### 3.3 Frontend Deployment
```yaml
# k8s/frontend-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: dashboard-frontend
  namespace: dashboard-system
spec:
  replicas: 2
  selector:
    matchLabels:
      app: dashboard-frontend
  template:
    metadata:
      labels:
        app: dashboard-frontend
    spec:
      containers:
      - name: frontend
        image: dashboard/frontend:latest
        ports:
        - containerPort: 3000
        resources:
          requests:
            memory: "256Mi"
            cpu: "100m"
          limits:
            memory: "512Mi"
            cpu: "200m"
        livenessProbe:
          httpGet:
            path: /
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10

---
apiVersion: v1
kind: Service
metadata:
  name: dashboard-frontend-service
  namespace: dashboard-system
spec:
  selector:
    app: dashboard-frontend
  ports:
    - protocol: TCP
      port: 3000
      targetPort: 3000
  type: ClusterIP
```

### 3.4 Ingress Configuration
```yaml
# k8s/ingress.yaml
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: dashboard-ingress
  namespace: dashboard-system
  annotations:
    nginx.ingress.kubernetes.io/ssl-redirect: "true"
    nginx.ingress.kubernetes.io/proxy-body-size: "10m"
    nginx.ingress.kubernetes.io/websocket-services: "dashboard-backend-service"
spec:
  tls:
  - hosts:
    - dashboard.company.com
    secretName: dashboard-tls
  rules:
  - host: dashboard.company.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: dashboard-backend-service
            port:
              number: 8080
      - path: /
        pathType: Prefix
        backend:
          service:
            name: dashboard-frontend-service
            port:
              number: 3000
```

## 4. CI/CD Pipeline

### 4.1 GitHub Actions Workflow
```yaml
# .github/workflows/deploy.yml
name: Deploy Dashboard

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7-alpine
        ports:
          - 6379:6379
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_PASSWORD: test
          POSTGRES_DB: dashboard_test
        ports:
          - 5432:5432
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test
      env:
        DATABASE_URL: postgresql://postgres:test@localhost:5432/dashboard_test
        REDIS_URL: redis://localhost:6379
    
    - name: Run E2E tests
      run: npm run test:e2e

  build:
    needs: test
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v2
    
    - name: Login to Container Registry
      uses: docker/login-action@v2
      with:
        registry: ${{ secrets.REGISTRY_URL }}
        username: ${{ secrets.REGISTRY_USERNAME }}
        password: ${{ secrets.REGISTRY_PASSWORD }}
    
    - name: Build and push backend
      uses: docker/build-push-action@v4
      with:
        context: .
        file: Dockerfile.backend
        push: true
        tags: ${{ secrets.REGISTRY_URL }}/dashboard/backend:${{ github.sha }}
    
    - name: Build and push frontend
      uses: docker/build-push-action@v4
      with:
        context: ./frontend
        file: Dockerfile.frontend
        push: true
        tags: ${{ secrets.REGISTRY_URL }}/dashboard/frontend:${{ github.sha }}

  deploy:
    needs: build
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Deploy to Kubernetes
      uses: azure/k8s-deploy@v1
      with:
        namespace: dashboard-system
        manifests: |
          k8s/backend-deployment.yaml
          k8s/frontend-deployment.yaml
          k8s/ingress.yaml
        images: |
          ${{ secrets.REGISTRY_URL }}/dashboard/backend:${{ github.sha }}
          ${{ secrets.REGISTRY_URL }}/dashboard/frontend:${{ github.sha }}
```

## 5. Monitoring and Alerting

### 5.1 Prometheus Configuration
```yaml
# monitoring/prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'dashboard-backend'
    static_configs:
      - targets: ['dashboard-backend-service:8080']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'dashboard-frontend'
    static_configs:
      - targets: ['dashboard-frontend-service:3000']
    metrics_path: '/metrics'
    scrape_interval: 30s

  - job_name: 'redis'
    static_configs:
      - targets: ['redis-service:6379']

  - job_name: 'postgres'
    static_configs:
      - targets: ['postgres-service:5432']

alerting:
  alertmanagers:
    - static_configs:
        - targets:
          - alertmanager:9093

rule_files:
  - "dashboard_rules.yml"
```

### 5.2 Grafana Dashboard
```json
{
  "dashboard": {
    "title": "Dashboard System Monitoring",
    "panels": [
      {
        "title": "Active Processes",
        "type": "stat",
        "targets": [
          {
            "expr": "dashboard_active_processes_total",
            "legendFormat": "Active Processes"
          }
        ]
      },
      {
        "title": "Task Queue Depth",
        "type": "graph",
        "targets": [
          {
            "expr": "dashboard_task_queue_depth",
            "legendFormat": "Queue Depth"
          }
        ]
      },
      {
        "title": "Response Times",
        "type": "graph",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, dashboard_request_duration_seconds_bucket)",
            "legendFormat": "95th percentile"
          }
        ]
      }
    ]
  }
}
```

## 6. Backup and Recovery

### 6.1 Database Backup Strategy
```bash
#!/bin/bash
# scripts/backup.sh

# Configuration
BACKUP_DIR="/backups/dashboard"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
RETENTION_DAYS=30

# Create backup directory
mkdir -p $BACKUP_DIR

# PostgreSQL backup
echo "Starting PostgreSQL backup..."
PGPASSWORD=$DB_PASSWORD pg_dump \
  -h $DB_HOST \
  -U $DB_USER \
  -d $DB_NAME \
  --verbose \
  --no-owner \
  --no-acl \
  --format=custom \
  --file=$BACKUP_DIR/dashboard_$TIMESTAMP.backup

# Compress backup
echo "Compressing backup..."
gzip $BACKUP_DIR/dashboard_$TIMESTAMP.backup

# Upload to S3
echo "Uploading to S3..."
aws s3 cp $BACKUP_DIR/dashboard_$TIMESTAMP.backup.gz \
  s3://dashboard-backups/database/

# Clean up old backups
echo "Cleaning up old backups..."
find $BACKUP_DIR -name "*.backup.gz" -mtime +$RETENTION_DAYS -delete

echo "Backup completed successfully"
```

### 6.2 Disaster Recovery Plan
```yaml
# Disaster Recovery Procedures

1. Database Recovery:
   - Restore from latest backup
   - Apply transaction logs if available
   - Verify data integrity

2. Application Recovery:
   - Deploy from latest stable image
   - Configure environment variables
   - Validate all services are running

3. Data Recovery:
   - Redis data restoration
   - Process state recovery
   - Task queue restoration

4. Monitoring Recovery:
   - Restore monitoring configurations
   - Verify alerting is working
   - Check dashboard accessibility

5. Testing:
   - Run health checks
   - Verify core functionality
   - Test with limited users
```

## 7. Security Hardening

### 7.1 Container Security
```dockerfile
# Security-hardened base image
FROM node:20-alpine AS production

# Update packages and remove unnecessary ones
RUN apk update && apk upgrade && \
    apk add --no-cache dumb-init && \
    apk del --no-cache git curl

# Create non-root user
RUN addgroup -g 1001 -S nodejs && \
    adduser -S dashboard -u 1001 -G nodejs

# Set file permissions
COPY --chown=dashboard:nodejs . .

# Use non-root user
USER dashboard

# Remove shell access
RUN rm -rf /bin/sh /bin/bash
```

### 7.2 Network Security
```yaml
# Network policies
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: dashboard-network-policy
  namespace: dashboard-system
spec:
  podSelector:
    matchLabels:
      app: dashboard-backend
  policyTypes:
  - Ingress
  - Egress
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: dashboard-frontend
    ports:
    - protocol: TCP
      port: 8080
  egress:
  - to:
    - podSelector:
        matchLabels:
          app: redis
    ports:
    - protocol: TCP
      port: 6379
```

---

**Document Version**: 1.0  
**Last Updated**: 2025-07-08  
**Author**: Taylor Technical Lead