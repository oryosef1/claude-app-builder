import { Router } from 'express';
import os from 'os';
import { AgentRegistry } from '../core/AgentRegistry.js';

export function createAdditionalRoutes(agentRegistry: AgentRegistry): Router {
  const router = Router();

  // Get all agents
  router.get('/agents', (_req, res) => {
    try {
      const agents = agentRegistry.getAllEmployees();
      res.json(agents.map(emp => ({
        id: emp.id,
        name: emp.name,
        role: emp.role,
        department: emp.department,
        skills: emp.skills,
        status: emp.status,
        currentTasks: emp.workload || 0,
        maxCapacity: 100
      })));
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get agents',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get specific agent
  router.get('/agents/:id', (req, res) => {
    try {
      const employee = agentRegistry.getEmployeeById(req.params.id);
      if (!employee) {
        res.status(404).json({ error: 'Agent not found' });
        return;
      }
      res.json({
        id: employee.id,
        name: employee.name,
        role: employee.role,
        department: employee.department,
        skills: employee.skills,
        status: employee.status,
        currentTasks: employee.workload || 0,
        maxCapacity: 100
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get agent',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Get system metrics
  router.get('/metrics', (_req, res) => {
    try {
      const cpus = os.cpus();
      const totalMemory = os.totalmem();
      const freeMemory = os.freemem();
      const usedMemory = totalMemory - freeMemory;
      
      // Calculate CPU usage
      let totalIdle = 0;
      let totalTick = 0;
      
      cpus.forEach(cpu => {
        for (const type in cpu.times) {
          totalTick += cpu.times[type as keyof typeof cpu.times];
        }
        totalIdle += cpu.times.idle;
      });
      
      const idle = totalIdle / cpus.length;
      const total = totalTick / cpus.length;
      const usage = 100 - ~~(100 * idle / total);
      
      res.json({
        cpu: usage,
        memory: {
          totalMemoryMB: Math.round(totalMemory / 1024 / 1024),
          usedMemoryMB: Math.round(usedMemory / 1024 / 1024),
          freeMemoryMB: Math.round(freeMemory / 1024 / 1024),
          percentUsed: Math.round((usedMemory / totalMemory) * 100)
        },
        uptime: process.uptime(),
        platform: os.platform(),
        nodeVersion: process.version
      });
    } catch (error) {
      res.status(500).json({
        error: 'Failed to get metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Create task (simplified)
  router.post('/tasks', (req, res) => {
    try {
      const { title, description, priority, requiredSkills } = req.body;
      
      if (!title) {
        res.status(400).json({ error: 'Title is required' });
        return;
      }
      
      const task = {
        id: `task_${Date.now()}`,
        title,
        description: description || '',
        priority: priority || 5,
        requiredSkills: requiredSkills || [],
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      
      res.status(201).json(task);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to create task',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  // Process spawn endpoint
  router.post('/processes/spawn', (req, res) => {
    try {
      const { role, systemPrompt, task } = req.body;
      
      if (!role) {
        res.status(400).json({ error: 'Role is required' });
        return;
      }
      
      const process = {
        id: `proc_${Date.now()}`,
        role,
        systemPrompt: systemPrompt || '',
        task: task || '',
        status: 'running',
        createdAt: new Date().toISOString()
      };
      
      res.json(process);
    } catch (error) {
      res.status(500).json({
        error: 'Failed to spawn process',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });

  return router;
}