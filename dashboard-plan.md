# Building a Multi-Agent Claude Code Dashboard System

## System Architecture Overview

Based on comprehensive research, the optimal architecture for managing multiple Claude Code processes combines a modular backend with real-time dashboard capabilities. The system follows a **modular monolith** approach initially, with clear separation of concerns that allows future migration to microservices.

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Web Dashboard                             │
│                 (Vue.js/React App)                          │
│            • Process Status Monitoring                       │
│            • Task Assignment Interface                       │
│            • Real-time Log Streaming                        │
└─────────────────────┬───────────────────────────────────────┘
                      │ WebSocket/SSE
┌─────────────────────▼───────────────────────────────────────┐
│                Dashboard Backend                             │
│              (Node.js + Express)                            │
│         • WebSocket Server                                  │
│         • API Endpoints                                     │
│         • Session Management                                │
└─────────────────────┬───────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│            Process Orchestrator                              │
│         • Claude Process Manager                            │
│         • Task Queue (Bull/Redis)                          │
│         • Agent Registry                                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
         ┌────────────┼────────────┐
         │            │            │
┌────────▼──┐  ┌──────▼──┐  ┌──────▼──┐
│Code       │  │API      │  │QA       │
│Reviewer   │  │Developer│  │Tester   │
│Process    │  │Process  │  │Process  │
└───────────┘  └─────────┘  └─────────┘
         │            │            │
         └────────────┼────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────┐
│              Shared Infrastructure                          │
│  • Redis (Task Queue + State)                              │
│  • SQLite/PostgreSQL (Persistence)                         │
│  • File System (Logs + Artifacts)                          │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack Recommendations

### Backend Stack (Node.js)
- **Runtime**: Node.js 20+ (for native ES modules and better performance)
- **Framework**: Express.js with TypeScript
- **Process Management**: child_process module with PM2 for production
- **Task Queue**: Bull (Redis-based) for reliable task distribution
- **Real-time**: Socket.io for bidirectional communication, SSE for log streaming
- **Database**: SQLite for MVP, PostgreSQL for production
- **Monitoring**: Winston for logging, Prometheus for metrics

### Frontend Stack
- **Framework**: Vue.js 3 (simpler learning curve) or React
- **UI Library**: Vuetify or Tailwind CSS
- **State Management**: Pinia (Vue) or Redux Toolkit (React)
- **Real-time**: Socket.io-client and native EventSource
- **Charts**: Chart.js for process metrics visualization

## Step-by-Step Implementation Approach

### Phase 1: Core Infrastructure (Days 1-3)

**1. Project Setup**
```bash
mkdir claude-dashboard
cd claude-dashboard
npm init -y
npm install express socket.io bull redis sqlite3 winston
npm install -D typescript @types/node @types/express nodemon
```

**2. Basic Process Manager**
```typescript
// src/core/ProcessManager.ts
import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

interface ClaudeProcessConfig {
  id: string;
  name: string;
  systemPrompt: string;
  workingDirectory: string;
  allowedTools?: string[];
  maxTurns?: number;
}

export class ClaudeProcessManager extends EventEmitter {
  private processes: Map<string, ChildProcess> = new Map();
  private configs: Map<string, ClaudeProcessConfig> = new Map();

  async spawnProcess(config: ClaudeProcessConfig): Promise<void> {
    const args = [
      '--system-prompt', config.systemPrompt,
      '--cwd', config.workingDirectory,
      '--output-format', 'stream-json'
    ];

    if (config.allowedTools) {
      args.push('--allowedTools', config.allowedTools.join(','));
    }

    if (config.maxTurns) {
      args.push('--max-turns', config.maxTurns.toString());
    }

    const process = spawn('claude', args, {
      stdio: ['pipe', 'pipe', 'pipe']
    });

    this.processes.set(config.id, process);
    this.configs.set(config.id, config);

    // Setup event handlers
    process.stdout.on('data', (data) => {
      this.emit('process-output', { 
        processId: config.id, 
        data: data.toString() 
      });
    });

    process.stderr.on('data', (data) => {
      this.emit('process-error', { 
        processId: config.id, 
        error: data.toString() 
      });
    });

    process.on('exit', (code) => {
      this.emit('process-exit', { 
        processId: config.id, 
        code 
      });
      this.processes.delete(config.id);
    });
  }

  async sendToProcess(processId: string, message: string): Promise<void> {
    const process = this.processes.get(processId);
    if (!process) {
      throw new Error(`Process ${processId} not found`);
    }

    process.stdin.write(JSON.stringify({
      role: 'user',
      content: message
    }) + '\n');
  }

  async stopProcess(processId: string): Promise<void> {
    const process = this.processes.get(processId);
    if (process) {
      process.kill('SIGTERM');
      this.processes.delete(processId);
    }
  }

  getProcessStatus(processId: string): string {
    const process = this.processes.get(processId);
    return process && !process.killed ? 'running' : 'stopped';
  }

  getAllProcesses(): Array<{id: string, config: ClaudeProcessConfig, status: string}> {
    return Array.from(this.configs.entries()).map(([id, config]) => ({
      id,
      config,
      status: this.getProcessStatus(id)
    }));
  }
}
```

**3. Task Queue Setup**
```typescript
// src/core/TaskQueue.ts
import Bull from 'bull';
import { ClaudeProcessManager } from './ProcessManager';

interface Task {
  id: string;
  type: 'code_review' | 'api_development' | 'qa_testing';
  payload: any;
  assignedTo?: string;
}

export class TaskDistributor {
  private queue: Bull.Queue;
  private processManager: ClaudeProcessManager;

  constructor(processManager: ClaudeProcessManager) {
    this.queue = new Bull('claude-tasks', {
      redis: {
        host: 'localhost',
        port: 6379
      }
    });
    this.processManager = processManager;
    this.setupWorkers();
  }

  private setupWorkers() {
    this.queue.process('code_review', async (job) => {
      const reviewerProcess = this.findAvailableProcess('code_reviewer');
      if (reviewerProcess) {
        await this.processManager.sendToProcess(reviewerProcess.id, job.data.code);
        return await this.waitForResponse(reviewerProcess.id);
      }
      throw new Error('No code reviewer available');
    });

    this.queue.process('api_development', async (job) => {
      const developerProcess = this.findAvailableProcess('api_developer');
      if (developerProcess) {
        await this.processManager.sendToProcess(developerProcess.id, job.data.requirements);
        return await this.waitForResponse(developerProcess.id);
      }
      throw new Error('No API developer available');
    });
  }

  private findAvailableProcess(role: string) {
    const processes = this.processManager.getAllProcesses();
    return processes.find(p => 
      p.config.name.toLowerCase().includes(role) && 
      p.status === 'running'
    );
  }

  private async waitForResponse(processId: string, timeout = 30000): Promise<any> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error('Response timeout'));
      }, timeout);

      const handler = (data: any) => {
        if (data.processId === processId) {
          clearTimeout(timer);
          this.processManager.removeListener('process-output', handler);
          resolve(data.data);
        }
      };

      this.processManager.on('process-output', handler);
    });
  }

  async addTask(task: Omit<Task, 'id'>): Promise<string> {
    const job = await this.queue.add(task.type, task.payload);
    return job.id.toString();
  }
}
```

### Phase 2: Web API and Real-time Communication (Days 4-5)

**4. Express Server with WebSocket**
```typescript
// src/api/server.ts
import express from 'express';
import { createServer } from 'http';
import { Server as SocketServer } from 'socket.io';
import { ClaudeProcessManager } from '../core/ProcessManager';
import { TaskDistributor } from '../core/TaskQueue';

export class DashboardServer {
  private app: express.Application;
  private io: SocketServer;
  private processManager: ClaudeProcessManager;
  private taskDistributor: TaskDistributor;

  constructor() {
    this.app = express();
    const server = createServer(this.app);
    this.io = new SocketServer(server, {
      cors: {
        origin: "http://localhost:3000",
        methods: ["GET", "POST"]
      }
    });

    this.processManager = new ClaudeProcessManager();
    this.taskDistributor = new TaskDistributor(this.processManager);

    this.setupRoutes();
    this.setupWebSocket();
    this.setupProcessEventHandlers();
  }

  private setupRoutes() {
    this.app.use(express.json());

    // Process management endpoints
    this.app.post('/api/processes', async (req, res) => {
      try {
        const config = req.body;
        await this.processManager.spawnProcess(config);
        res.json({ success: true, processId: config.id });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    this.app.get('/api/processes', (req, res) => {
      const processes = this.processManager.getAllProcesses();
      res.json(processes);
    });

    this.app.delete('/api/processes/:id', async (req, res) => {
      try {
        await this.processManager.stopProcess(req.params.id);
        res.json({ success: true });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Task endpoints
    this.app.post('/api/tasks', async (req, res) => {
      try {
        const taskId = await this.taskDistributor.addTask(req.body);
        res.json({ taskId });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // Log streaming endpoint (SSE)
    this.app.get('/api/logs/:processId', (req, res) => {
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      const handler = (data: any) => {
        if (data.processId === req.params.processId) {
          res.write(`data: ${JSON.stringify(data)}\n\n`);
        }
      };

      this.processManager.on('process-output', handler);

      req.on('close', () => {
        this.processManager.removeListener('process-output', handler);
      });
    });
  }

  private setupWebSocket() {
    this.io.on('connection', (socket) => {
      console.log('Client connected:', socket.id);

      socket.on('subscribe-process', (processId: string) => {
        socket.join(`process-${processId}`);
      });

      socket.on('unsubscribe-process', (processId: string) => {
        socket.leave(`process-${processId}`);
      });

      socket.on('send-to-process', async (data: { processId: string, message: string }) => {
        try {
          await this.processManager.sendToProcess(data.processId, data.message);
          socket.emit('message-sent', { success: true });
        } catch (error) {
          socket.emit('error', { error: error.message });
        }
      });
    });
  }

  private setupProcessEventHandlers() {
    this.processManager.on('process-output', (data) => {
      this.io.to(`process-${data.processId}`).emit('process-output', data);
    });

    this.processManager.on('process-error', (data) => {
      this.io.to(`process-${data.processId}`).emit('process-error', data);
    });

    this.processManager.on('process-exit', (data) => {
      this.io.to(`process-${data.processId}`).emit('process-exit', data);
      this.io.emit('process-status-changed', {
        processId: data.processId,
        status: 'stopped'
      });
    });
  }

  start(port: number = 8080) {
    const server = this.app.listen(port, () => {
      console.log(`Dashboard server running on port ${port}`);
    });
    this.io.attach(server);
  }
}
```

### Phase 3: Dashboard Frontend (Days 6-7)

**5. Vue.js Dashboard Component**
```vue
<!-- src/frontend/components/ProcessDashboard.vue -->
<template>
  <div class="process-dashboard">
    <h1>Claude Code Process Manager</h1>
    
    <!-- Process Grid -->
    <div class="process-grid">
      <div 
        v-for="process in processes" 
        :key="process.id" 
        class="process-card"
        :class="{ 'running': process.status === 'running' }"
      >
        <div class="process-header">
          <h3>{{ process.config.name }}</h3>
          <span class="status-indicator" :class="process.status">
            {{ process.status }}
          </span>
        </div>
        
        <div class="process-info">
          <p><strong>Role:</strong> {{ process.config.systemPrompt.substring(0, 50) }}...</p>
          <p><strong>Working Dir:</strong> {{ process.config.workingDirectory }}</p>
        </div>
        
        <div class="process-controls">
          <button @click="viewLogs(process.id)" class="btn-primary">
            View Logs
          </button>
          <button @click="sendMessage(process.id)" class="btn-secondary">
            Send Task
          </button>
          <button @click="stopProcess(process.id)" class="btn-danger">
            Stop
          </button>
        </div>
      </div>
    </div>

    <!-- Add Process Form -->
    <div class="add-process-form">
      <h2>Spawn New Process</h2>
      <form @submit.prevent="spawnProcess">
        <select v-model="newProcess.role" required>
          <option value="">Select Role</option>
          <option value="code_reviewer">Code Reviewer</option>
          <option value="api_developer">API Developer</option>
          <option value="qa_tester">QA Tester</option>
        </select>
        
        <input 
          v-model="newProcess.workingDirectory" 
          placeholder="Working Directory"
          required
        />
        
        <button type="submit" class="btn-primary">
          Spawn Process
        </button>
      </form>
    </div>

    <!-- Log Viewer Modal -->
    <div v-if="showLogViewer" class="log-viewer-modal">
      <div class="log-viewer">
        <h3>Process Logs: {{ currentProcessId }}</h3>
        <div class="log-content" ref="logContent">
          <div v-for="(log, index) in logs" :key="index" class="log-line">
            {{ log }}
          </div>
        </div>
        <button @click="closeLogViewer" class="btn-secondary">
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue';
import io from 'socket.io-client';

export default {
  name: 'ProcessDashboard',
  setup() {
    const processes = ref([]);
    const logs = ref([]);
    const showLogViewer = ref(false);
    const currentProcessId = ref(null);
    const socket = ref(null);
    const eventSource = ref(null);
    
    const newProcess = ref({
      role: '',
      workingDirectory: '/workspace'
    });

    const roleConfigs = {
      code_reviewer: {
        systemPrompt: "You are a senior code reviewer focused on code quality, security, and best practices.",
        allowedTools: ["Read", "Bash(git*)"]
      },
      api_developer: {
        systemPrompt: "You are an experienced API developer specializing in RESTful services and microservices architecture.",
        allowedTools: ["Read", "Write", "Bash"]
      },
      qa_tester: {
        systemPrompt: "You are a QA engineer focused on test automation, edge cases, and ensuring code reliability.",
        allowedTools: ["Read", "Write", "Bash(npm test*)"]
      }
    };

    const fetchProcesses = async () => {
      try {
        const response = await fetch('http://localhost:8080/api/processes');
        processes.value = await response.json();
      } catch (error) {
        console.error('Failed to fetch processes:', error);
      }
    };

    const spawnProcess = async () => {
      const config = {
        id: `${newProcess.value.role}_${Date.now()}`,
        name: newProcess.value.role.replace('_', ' ').toUpperCase(),
        workingDirectory: newProcess.value.workingDirectory,
        ...roleConfigs[newProcess.value.role]
      };

      try {
        await fetch('http://localhost:8080/api/processes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(config)
        });
        
        await fetchProcesses();
        newProcess.value.role = '';
      } catch (error) {
        console.error('Failed to spawn process:', error);
      }
    };

    const stopProcess = async (processId) => {
      try {
        await fetch(`http://localhost:8080/api/processes/${processId}`, {
          method: 'DELETE'
        });
        await fetchProcesses();
      } catch (error) {
        console.error('Failed to stop process:', error);
      }
    };

    const viewLogs = (processId) => {
      currentProcessId.value = processId;
      showLogViewer.value = true;
      logs.value = [];
      
      // Subscribe to logs via SSE
      eventSource.value = new EventSource(
        `http://localhost:8080/api/logs/${processId}`
      );
      
      eventSource.value.onmessage = (event) => {
        const data = JSON.parse(event.data);
        logs.value.push(data.data);
      };
    };

    const closeLogViewer = () => {
      showLogViewer.value = false;
      if (eventSource.value) {
        eventSource.value.close();
        eventSource.value = null;
      }
    };

    const sendMessage = async (processId) => {
      const message = prompt('Enter task for this process:');
      if (message) {
        socket.value.emit('send-to-process', { processId, message });
      }
    };

    onMounted(() => {
      // Initialize WebSocket connection
      socket.value = io('http://localhost:8080');
      
      socket.value.on('process-status-changed', () => {
        fetchProcesses();
      });

      // Initial fetch
      fetchProcesses();
      
      // Refresh every 5 seconds
      const interval = setInterval(fetchProcesses, 5000);
      
      onUnmounted(() => {
        clearInterval(interval);
        if (socket.value) socket.value.disconnect();
        if (eventSource.value) eventSource.value.close();
      });
    });

    return {
      processes,
      logs,
      showLogViewer,
      currentProcessId,
      newProcess,
      spawnProcess,
      stopProcess,
      viewLogs,
      closeLogViewer,
      sendMessage
    };
  }
};
</script>

<style scoped>
.process-dashboard {
  padding: 20px;
  max-width: 1200px;
  margin: 0 auto;
}

.process-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.process-card {
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 15px;
  background: white;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.process-card.running {
  border-color: #4CAF50;
}

.process-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.status-indicator {
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: bold;
}

.status-indicator.running {
  background: #4CAF50;
  color: white;
}

.status-indicator.stopped {
  background: #f44336;
  color: white;
}

.process-controls {
  display: flex;
  gap: 10px;
  margin-top: 15px;
}

.btn-primary {
  background: #2196F3;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-secondary {
  background: #757575;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.btn-danger {
  background: #f44336;
  color: white;
  border: none;
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
}

.add-process-form {
  background: #f5f5f5;
  padding: 20px;
  border-radius: 8px;
  margin-top: 30px;
}

.add-process-form form {
  display: flex;
  gap: 10px;
  align-items: center;
}

.add-process-form select,
.add-process-form input {
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 4px;
  flex: 1;
}

.log-viewer-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.log-viewer {
  background: white;
  padding: 20px;
  border-radius: 8px;
  width: 80%;
  max-width: 800px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.log-content {
  background: #1e1e1e;
  color: #fff;
  font-family: monospace;
  padding: 10px;
  overflow-y: auto;
  flex: 1;
  max-height: 400px;
}

.log-line {
  margin-bottom: 5px;
  white-space: pre-wrap;
}
</style>
```

### Phase 4: Integration and Testing (Days 8-10)

**6. Main Application Entry Point**
```typescript
// src/index.ts
import { DashboardServer } from './api/server';

const server = new DashboardServer();

// Initialize default processes on startup
const defaultProcesses = [
  {
    id: 'code_reviewer_1',
    name: 'Code Reviewer',
    systemPrompt: 'You are a senior code reviewer focused on code quality, security, and best practices.',
    workingDirectory: '/workspace',
    allowedTools: ['Read', 'Bash(git*)'],
    maxTurns: 10
  },
  {
    id: 'api_developer_1',
    name: 'API Developer',
    systemPrompt: 'You are an experienced API developer specializing in RESTful services.',
    workingDirectory: '/workspace',
    allowedTools: ['Read', 'Write', 'Bash'],
    maxTurns: 15
  }
];

async function initializeProcesses() {
  const processManager = server.getProcessManager();
  
  for (const config of defaultProcesses) {
    try {
      await processManager.spawnProcess(config);
      console.log(`Spawned process: ${config.name}`);
    } catch (error) {
      console.error(`Failed to spawn ${config.name}:`, error);
    }
  }
}

// Start server
server.start(8080);

// Initialize default processes after a short delay
setTimeout(initializeProcesses, 2000);
```

## Communication Flow

### Task Distribution Flow
1. User submits task through dashboard
2. Task enters Redis queue with priority
3. Process Orchestrator finds available agent
4. Task assigned to specific Claude process
5. Process executes task using Claude Code
6. Results streamed back via WebSocket/SSE
7. Dashboard updates in real-time

### Process Communication Pattern
```
Dashboard → HTTP/WebSocket → Backend → Redis Queue → Process Manager
                                           ↓
                                    Claude Process
                                           ↓
                                    Process Output
                                           ↓
                              WebSocket/SSE → Dashboard
```

## Deployment and Scaling Considerations

### Development Deployment
```bash
# Start Redis
docker run -d -p 6379:6379 redis

# Start the application
npm run dev

# Frontend development server
cd frontend && npm run serve
```

### Production Deployment with PM2
```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'claude-dashboard',
    script: './dist/index.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 8080
    }
  }]
};
```

### Docker Deployment
```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 8080

CMD ["node", "dist/index.js"]
```

### Scaling Strategy

**Horizontal Scaling Path:**
1. **Phase 1**: Single server with multiple Claude processes
2. **Phase 2**: Add load balancer, multiple backend instances
3. **Phase 3**: Separate task queue workers from API servers
4. **Phase 4**: Implement full microservices with Kubernetes

**Resource Recommendations:**
- **Minimum**: 4GB RAM, 2 CPUs (supports 3-5 Claude processes)
- **Recommended**: 16GB RAM, 8 CPUs (supports 15-20 Claude processes)
- **Production**: 32GB+ RAM, 16+ CPUs with distributed architecture

## Key Features Summary

1. **Process Management**: Spawn, monitor, and control multiple Claude Code processes
2. **Role-based Agents**: Different system prompts for specialized tasks
3. **Real-time Monitoring**: Live status updates and log streaming
4. **Task Distribution**: Queue-based task assignment with priorities
5. **Interactive Dashboard**: Web interface for process control
6. **Scalable Architecture**: Start simple, scale as needed
7. **Error Handling**: Automatic retries and graceful degradation

This implementation provides a solid foundation for managing multiple Claude Code processes with different roles, offering both simplicity for initial deployment and clear paths for scaling as requirements grow.