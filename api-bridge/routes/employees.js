const express = require('express');
const fs = require('fs-extra');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');

const router = express.Router();
const execAsync = util.promisify(exec);

// Path to corporate infrastructure files
const EMPLOYEE_REGISTRY_PATH = path.join(__dirname, '../../ai-employees/employee-registry.json');
const CORPORATE_WORKFLOW_PATH = path.join(__dirname, '../../corporate-workflow.sh');

/**
 * Get all employees
 */
router.get('/', async (req, res) => {
  try {
    const registry = await fs.readJson(EMPLOYEE_REGISTRY_PATH);
    res.json({
      success: true,
      data: registry.employees,
      departments: registry.departments,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to load employee registry',
      details: error.message
    });
  }
});

/**
 * Get employee by ID
 */
router.get('/:id', async (req, res) => {
  try {
    const registry = await fs.readJson(EMPLOYEE_REGISTRY_PATH);
    const employee = registry.employees.find(emp => emp.id === req.params.id);
    
    if (!employee) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    res.json({
      success: true,
      data: employee,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to load employee',
      details: error.message
    });
  }
});

/**
 * Get employee status and performance
 */
router.get('/:id/status', async (req, res) => {
  try {
    // Get current status from status monitor
    const { stdout } = await execAsync(`node "${path.join(__dirname, '../../ai-employees/status-monitor.js')}" status ${req.params.id}`);
    const statusData = JSON.parse(stdout);

    // Get performance data
    const { stdout: perfData } = await execAsync(`node "${path.join(__dirname, '../../ai-employees/performance-tracker.js')}" employee ${req.params.id}`);
    const performanceData = JSON.parse(perfData);

    res.json({
      success: true,
      data: {
        status: statusData,
        performance: performanceData
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get employee status',
      details: error.message
    });
  }
});

/**
 * Assign task to employee
 */
router.post('/:id/assign', async (req, res) => {
  try {
    const { task, priority = 'medium', skills = [], estimatedHours = 1 } = req.body;
    
    if (!task) {
      return res.status(400).json({
        success: false,
        error: 'Task description is required'
      });
    }

    // Use corporate workflow task assignment
    const assignmentCommand = `node "${path.join(__dirname, '../../ai-employees/task-assignment.js')}" assign "${task}" "${skills.join(',')}" ${priority} ${estimatedHours}`;
    const { stdout } = await execAsync(assignmentCommand);
    
    const assignmentResult = JSON.parse(stdout);

    // Broadcast real-time update
    if (req.app.locals.broadcast) {
      req.app.locals.broadcast('employees', {
        type: 'task_assigned',
        employeeId: req.params.id,
        task: task,
        assignment: assignmentResult
      });
    }

    res.json({
      success: true,
      data: assignmentResult,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to assign task',
      details: error.message
    });
  }
});

/**
 * Update employee status
 */
router.put('/:id/status', async (req, res) => {
  try {
    const { status, workload } = req.body;
    
    // Update status using status monitor
    const updateCommand = `node "${path.join(__dirname, '../../ai-employees/status-monitor.js')}" update ${req.params.id} ${status} ${workload}`;
    await execAsync(updateCommand);

    // Broadcast real-time update
    if (req.app.locals.broadcast) {
      req.app.locals.broadcast('employees', {
        type: 'status_updated',
        employeeId: req.params.id,
        status: status,
        workload: workload
      });
    }

    res.json({
      success: true,
      message: 'Employee status updated',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to update employee status',
      details: error.message
    });
  }
});

/**
 * Get employee performance metrics
 */
router.get('/:id/performance', async (req, res) => {
  try {
    const { stdout } = await execAsync(`node "${path.join(__dirname, '../../ai-employees/performance-tracker.js')}" metrics ${req.params.id}`);
    const metrics = JSON.parse(stdout);

    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get performance metrics',
      details: error.message
    });
  }
});

/**
 * Get department summary
 */
router.get('/departments/:department', async (req, res) => {
  try {
    const registry = await fs.readJson(EMPLOYEE_REGISTRY_PATH);
    const departmentEmployees = registry.employees.filter(emp => emp.department === req.params.department);
    
    // Get performance data for department
    const { stdout } = await execAsync(`node "${path.join(__dirname, '../../ai-employees/performance-tracker.js')}" department ${req.params.department}`);
    const departmentMetrics = JSON.parse(stdout);

    res.json({
      success: true,
      data: {
        employees: departmentEmployees,
        metrics: departmentMetrics,
        count: departmentEmployees.length
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get department data',
      details: error.message
    });
  }
});

/**
 * Get real-time employee activity
 */
router.get('/activity/live', async (req, res) => {
  try {
    // Get recent activity from all employees
    const { stdout } = await execAsync(`node "${path.join(__dirname, '../../ai-employees/status-monitor.js')}" activity`);
    const activity = JSON.parse(stdout);

    res.json({
      success: true,
      data: activity,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: 'Failed to get employee activity',
      details: error.message
    });
  }
});

module.exports = router;