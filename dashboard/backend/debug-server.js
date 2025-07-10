import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = createServer(app);
const PORT = 8080;

// Enable CORS for frontend
app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
  credentials: true
}));
app.use(express.json());

// Debug logging
console.log('🚀 Starting Debug Dashboard Backend...');
console.log('📁 Current directory:', __dirname);

// Load employee registry directly
let employees = [];
try {
  const registryPath = path.join(__dirname, '../../ai-employees/employee-registry.json');
  console.log('📂 Looking for employee registry at:', registryPath);
  
  if (fs.existsSync(registryPath)) {
    const registryData = fs.readFileSync(registryPath, 'utf8');
    const registry = JSON.parse(registryData);
    const rawEmployees = Object.values(registry.employees);
    
    // Transform employees to match frontend expectations
    employees = rawEmployees.map(emp => ({
      id: emp.id,
      name: emp.name,
      role: emp.role,
      department: emp.department,
      skills: emp.skills || [],
      availability: emp.status === 'active' ? 'available' : emp.status === 'busy' ? 'busy' : 'offline',
      currentTasks: emp.current_projects ? emp.current_projects.length : 0,
      maxTasks: 3, // Default max tasks
      performanceScore: emp.performance_metrics?.team_efficiency || 85 // Default performance
    }));
    
    console.log(`✅ Loaded ${employees.length} employees from registry`);
    employees.forEach((emp, index) => {
      console.log(`  ${index + 1}. ${emp.name} (${emp.role})`);
    });
  } else {
    console.error('❌ Employee registry file not found!');
  }
} catch (error) {
  console.error('❌ Error loading employee registry:', error);
}

// Initialize Socket.IO
const io = new Server(server, {
  cors: {
    origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:5173'],
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// API Routes
app.get('/health', (req, res) => {
  console.log('🏥 Health check requested');
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    service: 'Debug Dashboard Backend',
    employees: employees.length
  });
});

app.get('/api/health', (req, res) => {
  console.log('🏥 API Health check requested');
  res.json({ 
    status: 'healthy',
    services: [
      { name: 'Memory API', url: 'http://localhost:3333', status: 'healthy' },
      { name: 'API Bridge', url: 'http://localhost:3002', status: 'healthy' }
    ]
  });
});

app.get('/api/employees', (req, res) => {
  console.log('👥 Employees requested, returning', employees.length, 'employees');
  console.log('First employee:', employees[0]);
  res.json(employees);
});

app.get('/api/processes', (req, res) => {
  console.log('⚙️ Processes requested');
  res.json([]);
});

app.get('/api/tasks', (req, res) => {
  console.log('📋 Tasks requested');
  res.json([]);
});

app.get('/api/system/health', (req, res) => {
  console.log('💻 System health requested');
  res.json({
    memory: { used: 2048000000, total: 8192000000, percentage: 25 },
    cpu: { usage: 35.5, load: [1.2, 1.5, 1.8] },
    processes: { total: 0, running: 0, idle: 0, error: 0 },
    queue: { pending: 0, processing: 0, completed: 0, failed: 0 }
  });
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log('🔌 Client connected:', socket.id);
  
  // Send initial data
  console.log('📤 Sending initial data to client...');
  console.log('  - Sending', employees.length, 'employees');
  
  socket.emit('employees:updated', employees);
  socket.emit('processes:updated', []);
  socket.emit('tasks:updated', []);
  socket.emit('system:health', {
    memory: { used: 2048000000, total: 8192000000, percentage: 25 },
    cpu: { usage: 35.5, load: [1.2, 1.5, 1.8] },
    processes: { total: 0, running: 0, idle: 0, error: 0 },
    queue: { pending: 0, processing: 0, completed: 0, failed: 0 }
  });
  
  // Send periodic updates
  const interval = setInterval(() => {
    socket.emit('system:health', {
      memory: { used: 2048000000, total: 8192000000, percentage: Math.random() * 50 + 25 },
      cpu: { usage: Math.random() * 100, load: [1.2, 1.5, 1.8] },
      processes: { total: 0, running: 0, idle: 0, error: 0 },
      queue: { pending: 0, processing: 0, completed: 0, failed: 0 }
    });
  }, 5000);
  
  socket.on('disconnect', () => {
    console.log('🔌 Client disconnected:', socket.id);
    clearInterval(interval);
  });
});

// 404 handler
app.use((req, res) => {
  console.log('❌ 404 - Route not found:', req.method, req.path);
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`
  });
});

// Start server
server.listen(PORT, () => {
  console.log('');
  console.log('✅ Debug Dashboard Backend running on port', PORT);
  console.log('🌐 Frontend URL: http://localhost:3000');
  console.log('🔌 Backend URL: http://localhost:' + PORT);
  console.log('');
  console.log('📊 Status:');
  console.log('  - Employees loaded:', employees.length);
  console.log('  - WebSocket: Ready');
  console.log('  - CORS: Enabled for localhost:3000, 3001, 5173');
  console.log('');
  console.log('📡 Waiting for connections...');
  console.log('');
});