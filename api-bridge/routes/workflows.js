const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const { exec, spawn } = require('child_process');
const util = require('util');

const router = express.Router();
const execAsync = util.promisify(exec);

// Path to corporate workflow script
const CORPORATE_WORKFLOW_PATH = path.join(__dirname, '../../corporate-workflow.sh');
const WORKFLOW_STATUS_PATH = path.join(__dirname, '../../workflow-status.json');

// Active workflow processes
const activeWorkflows = new Map();

/**
 * Get workflow status
 */
router.get('/status', async (req, res) => {
  try {
    const { stdout } = await execAsync(`bash "${CORPORATE_WORKFLOW_PATH}" status`);
    const statusData = JSON.parse(stdout);

    res.json({
      success: true,
      data: {
        status: statusData,
        activeWorkflows: Array.from(activeWorkflows.keys()),
        totalProcesses: activeWorkflows.size
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get workflow status',
      details: error.message
    });
  }
});

/**
 * Start a new workflow
 */
router.post('/start', async (req, res) => {
  try {
    const { 
      workflowType = 'standard',
      task = 'Execute corporate workflow',
      priority = 'medium',
      assignedEmployees = [],
      configuration = {}
    } = req.body;

    const workflowId = `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Create workflow configuration
    const workflowConfig = {
      id: workflowId,
      type: workflowType,
      task: task,
      priority: priority,
      assignedEmployees: assignedEmployees,
      configuration: configuration,
      status: 'starting',
      startTime: new Date().toISOString(),
      progress: 0
    };

    // Save workflow status
    await fs.writeJson(path.join(__dirname, `../../workflow-${workflowId}.json`), workflowConfig);

    // Start workflow process
    const workflowProcess = spawn('bash', [CORPORATE_WORKFLOW_PATH, 'run'], {
      env: {
        ...process.env,
        WORKFLOW_ID: workflowId,
        WORKFLOW_TASK: task,
        WORKFLOW_PRIORITY: priority,
        WORKFLOW_EMPLOYEES: assignedEmployees.join(',')
      },
      stdio: ['pipe', 'pipe', 'pipe']
    });

    // Store process reference
    activeWorkflows.set(workflowId, {
      process: workflowProcess,
      config: workflowConfig,
      logs: []
    });

    // Handle process output
    workflowProcess.stdout.on('data', (data) => {
      const output = data.toString();
      activeWorkflows.get(workflowId)?.logs.push({
        type: 'stdout',
        message: output,
        timestamp: new Date().toISOString()
      });

      // Broadcast real-time update
      if (req.app.locals.broadcast) {
        req.app.locals.broadcast('workflows', {
          type: 'workflow_output',
          workflowId: workflowId,
          output: output
        });
      }
    });

    workflowProcess.stderr.on('data', (data) => {
      const error = data.toString();
      activeWorkflows.get(workflowId)?.logs.push({
        type: 'stderr',
        message: error,
        timestamp: new Date().toISOString()
      });

      // Broadcast error update
      if (req.app.locals.broadcast) {
        req.app.locals.broadcast('workflows', {
          type: 'workflow_error',
          workflowId: workflowId,
          error: error
        });
      }
    });

    workflowProcess.on('close', (code) => {
      const workflow = activeWorkflows.get(workflowId);
      if (workflow) {
        workflow.config.status = code === 0 ? 'completed' : 'failed';
        workflow.config.endTime = new Date().toISOString();
        workflow.config.exitCode = code;
        
        // Broadcast completion update
        if (req.app.locals.broadcast) {
          req.app.locals.broadcast('workflows', {
            type: 'workflow_completed',
            workflowId: workflowId,
            status: workflow.config.status,
            exitCode: code
          });
        }

        // Remove from active workflows after 5 minutes
        setTimeout(() => {
          activeWorkflows.delete(workflowId);
        }, 5 * 60 * 1000);
      }
    });

    res.json({
      success: true,
      data: {
        workflowId: workflowId,
        status: 'started',
        config: workflowConfig
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to start workflow',
      details: error.message
    });
  }
});

/**
 * Stop a workflow
 */
router.post('/:workflowId/stop', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const workflow = activeWorkflows.get(workflowId);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found or already completed'
      });
    }

    // Terminate the process
    workflow.process.kill('SIGTERM');
    
    // Update status
    workflow.config.status = 'stopped';
    workflow.config.endTime = new Date().toISOString();

    // Broadcast stop update
    if (req.app.locals.broadcast) {
      req.app.locals.broadcast('workflows', {
        type: 'workflow_stopped',
        workflowId: workflowId
      });
    }

    res.json({
      success: true,
      data: {
        workflowId: workflowId,
        status: 'stopped'
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to stop workflow',
      details: error.message
    });
  }
});

/**
 * Get workflow details
 */
router.get('/:workflowId', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const workflow = activeWorkflows.get(workflowId);

    if (!workflow) {
      // Check for completed workflow file
      const workflowFile = path.join(__dirname, `../../workflow-${workflowId}.json`);
      if (await fs.pathExists(workflowFile)) {
        const workflowData = await fs.readJson(workflowFile);
        return res.json({
          success: true,
          data: workflowData,
          timestamp: new Date().toISOString()
        });
      }

      return res.status(404).json({
        success: false,
        error: 'Workflow not found'
      });
    }

    res.json({
      success: true,
      data: {
        ...workflow.config,
        logs: workflow.logs.slice(-50), // Last 50 log entries
        isActive: true
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get workflow details',
      details: error.message
    });
  }
});

/**
 * Get workflow logs
 */
router.get('/:workflowId/logs', async (req, res) => {
  try {
    const { workflowId } = req.params;
    const { limit = 100 } = req.query;
    const workflow = activeWorkflows.get(workflowId);

    if (!workflow) {
      return res.status(404).json({
        success: false,
        error: 'Workflow not found or completed'
      });
    }

    const logs = workflow.logs.slice(-parseInt(limit));

    res.json({
      success: true,
      data: {
        workflowId: workflowId,
        logs: logs,
        totalLogs: workflow.logs.length
      },
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get workflow logs',
      details: error.message
    });
  }
});

/**
 * List all workflows
 */
router.get('/', async (req, res) => {
  try {
    const { status = 'all' } = req.query;
    const workflows = [];

    // Add active workflows
    for (const [id, workflow] of activeWorkflows) {
      if (status === 'all' || workflow.config.status === status) {
        workflows.push({
          ...workflow.config,
          isActive: true
        });
      }
    }

    // Add completed workflows from files
    const workflowFiles = await fs.readdir(__dirname + '/../..');
    for (const file of workflowFiles) {
      if (file.startsWith('workflow-') && file.endsWith('.json')) {
        const workflowData = await fs.readJson(path.join(__dirname, '../../', file));
        if (status === 'all' || workflowData.status === status) {
          workflows.push({
            ...workflowData,
            isActive: false
          });
        }
      }
    }

    res.json({
      success: true,
      data: workflows.sort((a, b) => new Date(b.startTime) - new Date(a.startTime)),
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to list workflows',
      details: error.message
    });
  }
});

/**
 * Get workflow templates
 */
router.get('/templates/list', async (req, res) => {
  try {
    const templates = [
      {
        id: 'development',
        name: 'Development Workflow',
        description: 'Standard development workflow with testing and deployment',
        defaultEmployees: ['emp_004_sd', 'emp_005_jd', 'emp_006_qe'],
        estimatedDuration: '2-4 hours',
        configuration: {
          includesTesting: true,
          includesDeployment: false,
          requiresApproval: true
        }
      },
      {
        id: 'testing',
        name: 'Testing Workflow', 
        description: 'Comprehensive testing workflow with QA validation',
        defaultEmployees: ['emp_006_qe', 'emp_007_te', 'emp_003_qd'],
        estimatedDuration: '1-2 hours',
        configuration: {
          includesTesting: true,
          includesDeployment: false,
          requiresApproval: true
        }
      },
      {
        id: 'deployment',
        name: 'Deployment Workflow',
        description: 'Production deployment with monitoring and rollback',
        defaultEmployees: ['emp_008_do', 'emp_009_sre', 'emp_010_se'],
        estimatedDuration: '30-60 minutes',
        configuration: {
          includesTesting: false,
          includesDeployment: true,
          requiresApproval: true
        }
      }
    ];

    res.json({
      success: true,
      data: templates,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get workflow templates',
      details: error.message
    });
  }
});

module.exports = router;