const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const router = express.Router();
const execAsync = util.promisify(exec);

/**
 * Get system health status
 */
router.get('/health', async (req, res) => {
  try {
    const { stdout } = await execAsync(`bash "${path.join(__dirname, '../../corporate-workflow.sh')}" health`);
    const healthData = JSON.parse(stdout);

    res.json({
      success: true,
      data: healthData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get system health',
      details: error.message
    });
  }
});

/**
 * Get system status overview
 */
router.get('/status', async (req, res) => {
  try {
    console.log('Starting system status check...');
    
    // Get basic system info first
    let systemInfo;
    try {
      const { stdout } = await execAsync(`node -e "
        const os = require('os');
        console.log(JSON.stringify({
          uptime: os.uptime(),
          totalMemory: os.totalmem(),
          freeMemory: os.freemem(),
          platform: os.platform(),
          arch: os.arch(),
          cpus: os.cpus().length
        }));
      "`);
      systemInfo = JSON.parse(stdout);
      console.log('System info retrieved successfully');
    } catch (error) {
      console.error('Error getting system info:', error.message);
      throw error;
    }

    // Get employee registry
    let registry;
    try {
      registry = await fs.readJson(path.join(__dirname, '../../ai-employees/employee-registry.json'));
      console.log('Employee registry loaded successfully');
    } catch (error) {
      console.error('Error reading employee registry:', error.message);
      throw error;
    }

    // Check Memory API status
    let memoryApiStatus = false;
    try {
      const { stdout } = await execAsync(`wget -qO- http://localhost:3333/health`);
      const healthData = JSON.parse(stdout);
      memoryApiStatus = healthData.status === 'healthy';
      console.log('Memory API status:', memoryApiStatus);
    } catch (error) {
      console.log('Memory API check failed:', error.message);
      memoryApiStatus = false;
    }

    // Get workflow status (simplified)
    const workflow = {
      status: 'idle',
      tasksCompleted: 0,
      successRate: 0,
      averageWorkload: 0.46
    };

    const statusOverview = {
      system: {
        platform: systemInfo.platform,
        architecture: systemInfo.arch,
        cpus: systemInfo.cpus,
        uptime: systemInfo.uptime,
        memory: {
          total: systemInfo.totalMemory,
          free: systemInfo.freeMemory,
          used: systemInfo.totalMemory - systemInfo.freeMemory,
          percentage: ((systemInfo.totalMemory - systemInfo.freeMemory) / systemInfo.totalMemory) * 100
        }
      },
      services: {
        corporateWorkflow: { status: 'idle' },
        memoryApi: { status: memoryApiStatus ? 'healthy' : 'offline' },
        apiBridge: { status: 'healthy', port: 3001 }
      },
      employees: {
        total: registry.employees ? Object.keys(registry.employees).length : 13,
        active: registry.employees ? Object.values(registry.employees).filter(emp => emp.status === 'active').length : 13,
        departments: registry.departments ? Object.keys(registry.departments).length : 4
      },
      workflow: workflow
    };

    console.log('Status overview created successfully');
    res.json({
      success: true,
      data: statusOverview,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('System status error:', error);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      error: 'Failed to get system status',
      details: error.message,
      stack: error.stack
    });
  }
});

/**
 * Get activity feed
 */
router.get('/activity', async (req, res) => {
  try {
    const { limit = 50 } = req.query;
    
    const { stdout } = await execAsync(`node "${path.join(__dirname, '../../ai-employees/status-monitor.js')}" activity ${limit}`);
    const activity = JSON.parse(stdout);

    res.json({
      success: true,
      data: activity,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get activity feed',
      details: error.message
    });
  }
});

/**
 * Get system alerts
 */
router.get('/alerts', async (req, res) => {
  try {
    const { status = 'active' } = req.query;
    
    // Check for various system alerts
    const alerts = [];

    // Check Memory API connectivity
    try {
      await execAsync(`wget -qO- http://localhost:3333/health`);
    } catch (error) {
      alerts.push({
        id: 'memory-api-offline',
        type: 'critical',
        title: 'Memory API Offline',
        message: 'Memory API service is not responding',
        timestamp: new Date().toISOString(),
        status: 'active'
      });
    }

    // Check disk space
    try {
      const { stdout } = await execAsync(`df -h . | awk 'NR==2 {print $5}' | sed 's/%//'`);
      const diskUsage = parseInt(stdout.trim());
      if (diskUsage > 90) {
        alerts.push({
          id: 'disk-space-high',
          type: 'warning',
          title: 'High Disk Usage',
          message: `Disk usage is at ${diskUsage}%`,
          timestamp: new Date().toISOString(),
          status: 'active'
        });
      }
    } catch (error) {
      // Ignore disk check errors
    }

    // Check memory usage
    try {
      const { stdout } = await execAsync(`node -e "
        const used = process.memoryUsage().heapUsed;
        const total = require('os').totalmem();
        const percentage = (used / total) * 100;
        console.log(percentage.toFixed(2));
      "`);
      const memoryUsage = parseFloat(stdout.trim());
      if (memoryUsage > 85) {
        alerts.push({
          id: 'memory-usage-high',
          type: 'warning',
          title: 'High Memory Usage',
          message: `Memory usage is at ${memoryUsage.toFixed(1)}%`,
          timestamp: new Date().toISOString(),
          status: 'active'
        });
      }
    } catch (error) {
      // Ignore memory check errors
    }

    const filteredAlerts = status === 'all' ? alerts : alerts.filter(alert => alert.status === status);

    res.json({
      success: true,
      data: filteredAlerts,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get system alerts',
      details: error.message
    });
  }
});

/**
 * Resolve system alert
 */
router.post('/alerts/:alertId/resolve', async (req, res) => {
  try {
    const { alertId } = req.params;
    const { reason = 'Manually resolved' } = req.body;

    // For now, just acknowledge the resolution
    // In a real system, this would update a persistent alert store
    
    res.json({
      success: true,
      data: {
        alertId: alertId,
        status: 'resolved',
        resolvedAt: new Date().toISOString(),
        reason: reason
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to resolve alert',
      details: error.message
    });
  }
});

/**
 * Execute emergency action
 */
router.post('/emergency/:action', async (req, res) => {
  try {
    const { action } = req.params;
    const { confirm = false } = req.body;

    if (!confirm) {
      return res.status(400).json({
        success: false,
        error: 'Emergency action requires confirmation'
      });
    }

    let result = {};

    switch (action) {
      case 'restart-memory-api':
        try {
          // Kill existing memory API process
          await execAsync(`pkill -f "node.*index.js.*3333" || true`);
          // Wait a moment
          await new Promise(resolve => setTimeout(resolve, 2000));
          // Restart memory API
          const { stdout } = await execAsync(`cd "${path.join(__dirname, '../../src')}" && npm start &`);
          result = { action: 'restart-memory-api', status: 'completed', output: stdout };
        } catch (error) {
          result = { action: 'restart-memory-api', status: 'failed', error: error.message };
        }
        break;

      case 'cleanup-temp-files':
        try {
          await execAsync(`find "${path.join(__dirname, '../..')}" -name "*.tmp" -delete`);
          await execAsync(`find "${path.join(__dirname, '../..')}" -name "workflow-*.json" -mtime +1 -delete`);
          result = { action: 'cleanup-temp-files', status: 'completed' };
        } catch (error) {
          result = { action: 'cleanup-temp-files', status: 'failed', error: error.message };
        }
        break;

      case 'reset-employee-status':
        try {
          const { stdout } = await execAsync(`node "${path.join(__dirname, '../../ai-employees/status-monitor.js')}" reset`);
          result = { action: 'reset-employee-status', status: 'completed', output: JSON.parse(stdout) };
        } catch (error) {
          result = { action: 'reset-employee-status', status: 'failed', error: error.message };
        }
        break;

      default:
        return res.status(400).json({
          success: false,
          error: 'Unknown emergency action'
        });
    }

    // Broadcast emergency action
    if (req.app.locals.broadcast) {
      req.app.locals.broadcast('system', {
        type: 'emergency_action',
        action: action,
        result: result
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
      error: 'Emergency action failed',
      details: error.message
    });
  }
});

/**
 * Get system configuration
 */
router.get('/config', async (req, res) => {
  try {
    const config = {
      apiBridge: {
        port: process.env.API_BRIDGE_PORT || 3001,
        version: '1.0.0'
      },
      memoryApi: {
        url: 'http://localhost:3333',
        endpoints: [
          '/health',
          '/api/memory/search',
          '/api/memory/context',
          '/api/memory/experience',
          '/api/memory/knowledge',
          '/api/memory/decision'
        ]
      },
      corporateWorkflow: {
        script: './corporate-workflow.sh',
        commands: ['run', 'status', 'health', 'employees']
      },
      features: {
        realTimeUpdates: true,
        memoryManagement: true,
        workflowControl: true,
        performanceTracking: true,
        emergencyActions: true
      }
    };

    res.json({
      success: true,
      data: config,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get system configuration',
      details: error.message
    });
  }
});

module.exports = router;