import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';

const app = express();
const server = createServer(app);
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:3000", "http://localhost:5173"],
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Dashboard Backend'
  });
});

// Mock data for development
const mockProcesses = [
  { id: '1', name: 'Process 1', status: 'running', cpu: 45.2, memory: 128000000, uptime: 3600, role: 'Senior Developer', employeeId: 'emp_004', lastActivity: new Date(), errorCount: 0 },
  { id: '2', name: 'Process 2', status: 'idle', cpu: 12.5, memory: 64000000, uptime: 1800, role: 'Junior Developer', employeeId: 'emp_005', lastActivity: new Date(), errorCount: 1 }
];

const mockTasks = [
  { id: '1', title: 'Build Dashboard', description: 'Create Vue.js dashboard', status: 'running', priority: 'high', assignedTo: 'emp_004', createdAt: new Date(), updatedAt: new Date(), progress: 75 },
  { id: '2', title: 'API Integration', description: 'Connect to backend APIs', status: 'pending', priority: 'medium', createdAt: new Date(), updatedAt: new Date(), progress: 0 }
];

const mockEmployees = [
  { id: 'emp_004', name: 'Sam Senior Developer', role: 'Senior Developer', department: 'Development', skills: ['TypeScript', 'Vue.js'], availability: 'available', currentTasks: 1, maxTasks: 3, performanceScore: 95 },
  { id: 'emp_005', name: 'Casey Junior Developer', role: 'Junior Developer', department: 'Development', skills: ['JavaScript', 'HTML'], availability: 'busy', currentTasks: 2, maxTasks: 2, performanceScore: 82 }
];

const mockSystemHealth = {
  memory: { used: 2048000000, total: 8192000000, percentage: 25 },
  cpu: { usage: 35.5, load: [1.2, 1.5, 1.8] },
  processes: { total: 2, running: 1, idle: 1, error: 0 },
  queue: { pending: 3, processing: 1, completed: 15, failed: 1 }
};

// API Routes
app.get('/api/processes', (req, res) => {
  res.json(mockProcesses);
});

app.get('/api/tasks', (req, res) => {
  res.json(mockTasks);
});

app.get('/api/employees', (req, res) => {
  res.json(mockEmployees);
});

app.get('/api/system/health', (req, res) => {
  res.json(mockSystemHealth);
});

app.post('/api/processes', (req, res) => {
  const newProcess = {
    id: Date.now().toString(),
    ...req.body,
    status: 'pending',
    cpu: 0,
    memory: 0,
    uptime: 0,
    lastActivity: new Date(),
    errorCount: 0
  };
  mockProcesses.push(newProcess);
  res.json(newProcess);
});

app.post('/api/processes/:id/start', (req, res) => {
  const process = mockProcesses.find(p => p.id === req.params.id);
  if (process) {
    process.status = 'running';
    res.json(process);
  } else {
    res.status(404).json({ error: 'Process not found' });
  }
});

app.post('/api/processes/:id/stop', (req, res) => {
  const process = mockProcesses.find(p => p.id === req.params.id);
  if (process) {
    process.status = 'idle';
    res.json(process);
  } else {
    res.status(404).json({ error: 'Process not found' });
  }
});

// WebSocket connection
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // Send initial data
  socket.emit('processes:updated', mockProcesses);
  socket.emit('tasks:updated', mockTasks);
  socket.emit('employees:updated', mockEmployees);
  socket.emit('system:health', mockSystemHealth);
  
  // Simulate real-time updates
  const interval = setInterval(() => {
    // Update CPU usage randomly
    mockProcesses.forEach(process => {
      if (process.status === 'running') {
        process.cpu = Math.random() * 100;
        process.uptime += 1;
      }
    });
    
    mockSystemHealth.cpu.usage = Math.random() * 100;
    mockSystemHealth.memory.percentage = Math.random() * 50 + 25;
    
    socket.emit('processes:updated', mockProcesses);
    socket.emit('system:health', mockSystemHealth);
  }, 2000);
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    clearInterval(interval);
  });
});

const PORT = process.env.DASHBOARD_PORT || 8080;
server.listen(PORT, () => {
  console.log(`Dashboard Backend running on port ${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
});