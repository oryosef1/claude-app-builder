#!/usr/bin/env node

/**
 * AI Employee Task Assignment System
 * Manages task assignment and routing to AI employees
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class AIEmployeeManager {
    constructor() {
        this.registryPath = path.join(__dirname, 'employee-registry.json');
        this.employees = this.loadEmployees();
    }

    loadEmployees() {
        try {
            const data = fs.readFileSync(this.registryPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('Error loading employee registry:', error);
            return null;
        }
    }

    saveEmployees() {
        try {
            fs.writeFileSync(this.registryPath, JSON.stringify(this.employees, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving employee registry:', error);
            return false;
        }
    }

    // Find best employee for a task based on skills and workload
    findBestEmployee(requiredSkills, department = null, level = null) {
        const candidates = Object.values(this.employees.employees).filter(emp => {
            // Filter by status
            if (emp.status !== 'active') return false;
            
            // Filter by department if specified
            if (department && emp.department !== department) return false;
            
            // Filter by level if specified  
            if (level && emp.level !== level) return false;
            
            // Check if employee has any required skills
            const hasSkills = requiredSkills.some(skill => 
                emp.skills.includes(skill)
            );
            
            return hasSkills;
        });

        if (candidates.length === 0) {
            return null;
        }

        // Sort by workload (ascending) and skill match (descending)
        candidates.sort((a, b) => {
            const aSkillMatch = requiredSkills.filter(skill => a.skills.includes(skill)).length;
            const bSkillMatch = requiredSkills.filter(skill => b.skills.includes(skill)).length;
            
            // Prioritize skill match, then lower workload
            if (bSkillMatch !== aSkillMatch) {
                return bSkillMatch - aSkillMatch;
            }
            return a.workload - b.workload;
        });

        return candidates[0];
    }

    // Assign task to employee
    assignTask(employeeId, taskData) {
        const employee = this.employees.employees[employeeId];
        if (!employee) {
            return { success: false, error: 'Employee not found' };
        }

        if (employee.status !== 'active') {
            return { success: false, error: 'Employee not active' };
        }

        // Add task to employee's current projects
        employee.current_projects.push({
            id: taskData.id,
            title: taskData.title,
            priority: taskData.priority,
            assigned_date: new Date().toISOString(),
            status: 'assigned'
        });

        // Increase workload
        employee.workload += taskData.complexity || 1;

        // Save changes
        if (this.saveEmployees()) {
            return { 
                success: true, 
                employee: employee,
                message: `Task assigned to ${employee.name} (${employee.role})`
            };
        } else {
            return { success: false, error: 'Failed to save assignment' };
        }
    }

    // Auto-assign task based on requirements
    autoAssignTask(taskData) {
        const { skills, department, level } = taskData.requirements || {};
        
        const employee = this.findBestEmployee(skills || [], department, level);
        
        if (!employee) {
            return { 
                success: false, 
                error: 'No suitable employee found',
                requirements: taskData.requirements
            };
        }

        return this.assignTask(employee.id, taskData);
    }

    // Complete task and update metrics
    completeTask(employeeId, taskId, results) {
        const employee = this.employees.employees[employeeId];
        if (!employee) {
            return { success: false, error: 'Employee not found' };
        }

        // Find and remove task from current projects
        const taskIndex = employee.current_projects.findIndex(t => t.id === taskId);
        if (taskIndex === -1) {
            return { success: false, error: 'Task not found' };
        }

        const task = employee.current_projects[taskIndex];
        employee.current_projects.splice(taskIndex, 1);
        
        // Decrease workload
        employee.workload = Math.max(0, employee.workload - 1);

        // Update performance metrics based on results
        if (results.success) {
            this.updatePerformanceMetrics(employee, task, results);
        }

        return this.saveEmployees() ? 
            { success: true, employee: employee } :
            { success: false, error: 'Failed to save completion' };
    }

    updatePerformanceMetrics(employee, task, results) {
        const metrics = employee.performance_metrics;
        
        // Update role-specific metrics
        switch (employee.role) {
            case 'Project Manager':
                if (results.onTime) metrics.on_time_delivery++;
                metrics.projects_completed++;
                break;
            case 'Senior Developer':
            case 'Junior Developer':
                metrics.features_delivered++;
                if (results.quality) metrics.code_quality_score = Math.min(100, metrics.code_quality_score + 1);
                break;
            case 'QA Engineer':
            case 'Test Engineer':
                metrics.tests_executed++;
                if (results.bugsFound) metrics.bugs_found += results.bugsFound;
                break;
            default:
                // Generic completion tracking
                if (!metrics.tasks_completed) metrics.tasks_completed = 0;
                metrics.tasks_completed++;
        }
    }

    // Get employee status and current workload
    getEmployeeStatus(employeeId = null) {
        if (employeeId) {
            return this.employees.employees[employeeId] || null;
        }
        
        // Return summary of all employees
        return Object.values(this.employees.employees).map(emp => ({
            id: emp.id,
            name: emp.name,
            role: emp.role,
            department: emp.department,
            status: emp.status,
            workload: emp.workload,
            current_projects: emp.current_projects.length
        }));
    }

    // Get team capacity for planning
    getTeamCapacity(department = null) {
        const employees = department ? 
            Object.values(this.employees.employees).filter(emp => emp.department === department) :
            Object.values(this.employees.employees);
            
        return employees
            .filter(emp => emp.status === 'active')
            .reduce((capacity, emp) => {
                capacity.total++;
                capacity.available += emp.workload < 3 ? 1 : 0; // Consider available if workload < 3
                capacity.workload += emp.workload;
                return capacity;
            }, { total: 0, available: 0, workload: 0 });
    }

    // Generate Claude command for employee
    generateClaudeCommand(employeeId, taskData, userPrompt) {
        const employee = this.employees.employees[employeeId];
        if (!employee) {
            throw new Error('Employee not found');
        }

        const systemPromptPath = path.join(__dirname, '..', employee.system_prompt_file);
        
        // Enhanced system prompt with employee context
        const employeeContext = `
EMPLOYEE CONTEXT:
- Name: ${employee.name}
- Role: ${employee.role} 
- Department: ${employee.department}
- Current Workload: ${employee.workload}/5
- Skills: ${employee.skills.join(', ')}
- Performance: ${JSON.stringify(employee.performance_metrics, null, 2)}

TASK CONTEXT:
- Task ID: ${taskData.id}
- Priority: ${taskData.priority}
- Requirements: ${JSON.stringify(taskData.requirements || {}, null, 2)}

CORPORATE BEHAVIOR:
You are a professional AI employee at Claude AI Software Company. 
Respond with the expertise and communication style of your role.
Provide high-quality work that reflects well on the company.
        `;

        return {
            command: `echo "${userPrompt}" | claude --print --dangerously-skip-permissions --allowedTools "Bash,Edit,Write,Read,Grep,Glob,LS,MultiEdit"`,
            systemPrompt: `${fs.readFileSync(systemPromptPath, 'utf8')}\n\n${employeeContext}`,
            employee: employee
        };
    }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('/task-assignment.js')) {
    const manager = new AIEmployeeManager();
    const command = process.argv[2];

    switch (command) {
        case 'status':
            const employeeId = process.argv[3];
            console.log(JSON.stringify(manager.getEmployeeStatus(employeeId), null, 2));
            break;
            
        case 'capacity':
            const department = process.argv[3];
            console.log(JSON.stringify(manager.getTeamCapacity(department), null, 2));
            break;
            
        case 'assign':
            const taskFile = process.argv[3];
            if (!taskFile) {
                console.error('Usage: node task-assignment.js assign <task.json>');
                process.exit(1);
            }
            try {
                const taskData = JSON.parse(fs.readFileSync(taskFile, 'utf8'));
                const result = manager.autoAssignTask(taskData);
                console.log(JSON.stringify(result, null, 2));
            } catch (error) {
                console.error('Error:', error.message);
                process.exit(1);
            }
            break;
            
        case 'complete':
            const empId = process.argv[3];
            const taskId = process.argv[4];
            const resultsFile = process.argv[5];
            if (!empId || !taskId) {
                console.error('Usage: node task-assignment.js complete <employeeId> <taskId> [results.json]');
                process.exit(1);
            }
            try {
                const results = resultsFile ? 
                    JSON.parse(fs.readFileSync(resultsFile, 'utf8')) : 
                    { success: true };
                const result = manager.completeTask(empId, taskId, results);
                console.log(JSON.stringify(result, null, 2));
            } catch (error) {
                console.error('Error:', error.message);
                process.exit(1);
            }
            break;
            
        case 'claude':
            const employeeIdForClaude = process.argv[3];
            const taskDataFile = process.argv[4];
            const prompt = process.argv[5];
            if (!employeeIdForClaude || !taskDataFile || !prompt) {
                console.error('Usage: node task-assignment.js claude <employeeId> <task.json> "<prompt>"');
                process.exit(1);
            }
            try {
                const taskData = JSON.parse(fs.readFileSync(taskDataFile, 'utf8'));
                const claudeCommand = manager.generateClaudeCommand(employeeIdForClaude, taskData, prompt);
                console.log(JSON.stringify(claudeCommand, null, 2));
            } catch (error) {
                console.error('Error:', error.message);
                process.exit(1);
            }
            break;
            
        default:
            console.log(`
AI Employee Management System

Commands:
  status [employeeId]           - Get employee status
  capacity [department]         - Get team capacity
  assign <task.json>           - Auto-assign task
  complete <empId> <taskId>    - Complete task
  claude <empId> <task.json> "<prompt>" - Generate Claude command

Examples:
  node task-assignment.js status
  node task-assignment.js status emp_001
  node task-assignment.js capacity Development
  node task-assignment.js assign example-task.json
            `);
    }
}

export default AIEmployeeManager;