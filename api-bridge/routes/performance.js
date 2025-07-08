const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const router = express.Router();
const execAsync = util.promisify(exec);

/**
 * Get overall system performance
 */
router.get('/system', async (req, res) => {
  try {
    const { stdout } = await execAsync(`node "${path.join(__dirname, '../../ai-employees/performance-tracker.js')}" system`);
    const systemMetrics = JSON.parse(stdout);

    res.json({
      success: true,
      data: systemMetrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get system performance',
      details: error.message
    });
  }
});

/**
 * Get employee performance metrics
 */
router.get('/employee/:employeeId', async (req, res) => {
  try {
    const { stdout } = await execAsync(`node "${path.join(__dirname, '../../ai-employees/performance-tracker.js')}" employee ${req.params.employeeId}`);
    const employeeMetrics = JSON.parse(stdout);

    res.json({
      success: true,
      data: employeeMetrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get employee performance',
      details: error.message
    });
  }
});

/**
 * Get department performance metrics
 */
router.get('/department/:department', async (req, res) => {
  try {
    const { stdout } = await execAsync(`node "${path.join(__dirname, '../../ai-employees/performance-tracker.js')}" department ${req.params.department}`);
    const departmentMetrics = JSON.parse(stdout);

    res.json({
      success: true,
      data: departmentMetrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get department performance',
      details: error.message
    });
  }
});

/**
 * Get performance trends
 */
router.get('/trends', async (req, res) => {
  try {
    const { timeRange = '7d', employeeId, department } = req.query;
    
    let command = `node "${path.join(__dirname, '../../ai-employees/performance-tracker.js')}" trends ${timeRange}`;
    if (employeeId) command += ` ${employeeId}`;
    if (department) command += ` ${department}`;

    const { stdout } = await execAsync(command);
    const trends = JSON.parse(stdout);

    res.json({
      success: true,
      data: trends,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get performance trends',
      details: error.message
    });
  }
});

/**
 * Get real-time performance metrics
 */
router.get('/realtime', async (req, res) => {
  try {
    // Get current system stats
    const { stdout: cpuData } = await execAsync(`node -e "
      const os = require('os');
      const cpus = os.cpus();
      let totalIdle = 0, totalTick = 0;
      
      cpus.forEach(cpu => {
        for (type in cpu.times) {
          totalTick += cpu.times[type];
        }
        totalIdle += cpu.times.idle;
      });
      
      const idle = totalIdle / cpus.length;
      const total = totalTick / cpus.length;
      const usage = 100 - ~~(100 * idle / total);
      
      console.log(JSON.stringify({
        cpu: usage,
        memory: (process.memoryUsage().heapUsed / 1024 / 1024),
        uptime: process.uptime(),
        loadAverage: os.loadavg()
      }));
    "`);

    const systemStats = JSON.parse(cpuData);

    // Get Memory API status
    let memoryApiStatus = { status: 'unknown', responseTime: null };
    try {
      const start = Date.now();
      const { stdout } = await execAsync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:3333/health`);
      const responseTime = Date.now() - start;
      memoryApiStatus = {
        status: stdout.trim() === '200' ? 'healthy' : 'unhealthy',
        responseTime: responseTime
      };
    } catch (error) {
      memoryApiStatus = { status: 'offline', responseTime: null };
    }

    // Get active employees count
    const { stdout: employeeData } = await execAsync(`node "${path.join(__dirname, '../../ai-employees/status-monitor.js')}" summary`);
    const employeeSummary = JSON.parse(employeeData);

    const realtimeData = {
      system: {
        cpu: systemStats.cpu,
        memory: {
          used: systemStats.memory,
          total: require('os').totalmem() / 1024 / 1024,
          percentage: (systemStats.memory / (require('os').totalmem() / 1024 / 1024)) * 100
        },
        uptime: systemStats.uptime,
        loadAverage: systemStats.loadAverage
      },
      services: {
        memoryApi: memoryApiStatus,
        corporateWorkflow: { status: 'healthy' } // Assume healthy if we can execute
      },
      employees: employeeSummary,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: realtimeData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get realtime performance',
      details: error.message
    });
  }
});

/**
 * Get performance analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const { timeRange = '30d' } = req.query;
    
    const { stdout } = await execAsync(`node "${path.join(__dirname, '../../ai-employees/performance-tracker.js')}" analytics ${timeRange}`);
    const analytics = JSON.parse(stdout);

    res.json({
      success: true,
      data: analytics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get performance analytics',
      details: error.message
    });
  }
});

/**
 * Record performance event
 */
router.post('/event', async (req, res) => {
  try {
    const { employeeId, eventType, duration, success = true, metadata = {} } = req.body;
    
    if (!employeeId || !eventType) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: employeeId, eventType'
      });
    }

    const eventData = {
      employeeId,
      eventType,
      duration,
      success,
      metadata,
      timestamp: new Date().toISOString()
    };

    const { stdout } = await execAsync(`node "${path.join(__dirname, '../../ai-employees/performance-tracker.js')}" event '${JSON.stringify(eventData)}'`);
    const result = JSON.parse(stdout);

    // Broadcast real-time update
    if (req.app.locals.broadcast) {
      req.app.locals.broadcast('performance', {
        type: 'performance_event',
        data: eventData
      });
    }

    res.json({
      success: true,
      data: result,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to record performance event',
      details: error.message
    });
  }
});

module.exports = router;