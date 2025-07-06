#!/usr/bin/env node

/**
 * AI Employee Performance Tracking System
 * Tracks and analyzes AI employee performance metrics
 */

const fs = require('fs');
const path = require('path');

class PerformanceTracker {
    constructor() {
        this.registryPath = path.join(__dirname, 'employee-registry.json');
        this.metricsPath = path.join(__dirname, 'performance-metrics.json');
        this.employees = this.loadEmployees();
        this.historicalMetrics = this.loadHistoricalMetrics();
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

    loadHistoricalMetrics() {
        try {
            const data = fs.readFileSync(this.metricsPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            // Create new metrics file if it doesn't exist
            const initialMetrics = {
                created: new Date().toISOString(),
                daily_snapshots: [],
                employee_history: {}
            };
            this.saveHistoricalMetrics(initialMetrics);
            return initialMetrics;
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

    saveHistoricalMetrics(metrics = this.historicalMetrics) {
        try {
            fs.writeFileSync(this.metricsPath, JSON.stringify(metrics, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving historical metrics:', error);
            return false;
        }
    }

    // Record task completion with performance data
    recordTaskCompletion(employeeId, taskData, results) {
        const employee = this.employees.employees[employeeId];
        if (!employee) {
            return { success: false, error: 'Employee not found' };
        }

        const completion = {
            employee_id: employeeId,
            task_id: taskData.id,
            task_title: taskData.title,
            completion_date: new Date().toISOString(),
            time_taken: results.time_taken || null,
            quality_score: results.quality_score || null,
            success: results.success || false,
            feedback_rating: results.feedback_rating || null,
            complexity: taskData.complexity || 1
        };

        // Initialize employee history if needed
        if (!this.historicalMetrics.employee_history[employeeId]) {
            this.historicalMetrics.employee_history[employeeId] = {
                tasks_completed: [],
                performance_trends: [],
                skill_development: []
            };
        }

        // Add to employee history
        this.historicalMetrics.employee_history[employeeId].tasks_completed.push(completion);

        // Update current performance metrics
        this.updateCurrentMetrics(employee, completion);

        // Calculate performance trends
        this.calculatePerformanceTrends(employeeId);

        // Save both files
        this.saveEmployees();
        this.saveHistoricalMetrics();

        return { success: true, completion: completion };
    }

    updateCurrentMetrics(employee, completion) {
        const metrics = employee.performance_metrics;
        
        // Role-specific metric updates
        switch (employee.role) {
            case 'Project Manager':
                metrics.projects_completed = (metrics.projects_completed || 0) + 1;
                if (completion.success) {
                    metrics.on_time_delivery = Math.min(100, (metrics.on_time_delivery || 90) + 1);
                }
                if (completion.feedback_rating) {
                    metrics.client_satisfaction = Math.round(
                        ((metrics.client_satisfaction || 90) + completion.feedback_rating) / 2
                    );
                }
                break;

            case 'Technical Lead':
                metrics.architecture_decisions = (metrics.architecture_decisions || 0) + 1;
                if (completion.quality_score) {
                    metrics.system_reliability = Math.min(100, 
                        Math.round(((metrics.system_reliability || 95) + completion.quality_score) / 2)
                    );
                }
                break;

            case 'Senior Developer':
            case 'Junior Developer':
                metrics.features_delivered = (metrics.features_delivered || 0) + 1;
                if (completion.quality_score) {
                    metrics.code_quality_score = Math.min(100,
                        Math.round(((metrics.code_quality_score || 85) + completion.quality_score) / 2)
                    );
                }
                break;

            case 'QA Engineer':
            case 'Test Engineer':
                metrics.tests_executed = (metrics.tests_executed || 0) + 1;
                if (completion.success) {
                    metrics.test_efficiency = Math.min(100, (metrics.test_efficiency || 90) + 1);
                }
                break;

            default:
                // Generic task completion tracking
                if (!metrics.tasks_completed) metrics.tasks_completed = 0;
                metrics.tasks_completed++;
        }

        // Update last activity
        employee.last_activity = completion.completion_date;
    }

    calculatePerformanceTrends(employeeId) {
        const history = this.historicalMetrics.employee_history[employeeId];
        const recentTasks = history.tasks_completed.slice(-10); // Last 10 tasks

        if (recentTasks.length < 2) return;

        const trends = {
            date: new Date().toISOString(),
            avg_quality: this.calculateAverage(recentTasks, 'quality_score'),
            avg_completion_time: this.calculateAverage(recentTasks, 'time_taken'),
            success_rate: recentTasks.filter(t => t.success).length / recentTasks.length * 100,
            complexity_handled: this.calculateAverage(recentTasks, 'complexity')
        };

        history.performance_trends.push(trends);

        // Keep only last 30 trend records
        if (history.performance_trends.length > 30) {
            history.performance_trends = history.performance_trends.slice(-30);
        }
    }

    calculateAverage(array, field) {
        const values = array.map(item => item[field]).filter(val => val !== null && val !== undefined);
        return values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : null;
    }

    // Generate performance report for employee
    generateEmployeeReport(employeeId) {
        const employee = this.employees.employees[employeeId];
        if (!employee) {
            return { error: 'Employee not found' };
        }

        const history = this.historicalMetrics.employee_history[employeeId];
        const recentTasks = history ? history.tasks_completed.slice(-10) : [];
        const trends = history ? history.performance_trends.slice(-5) : [];

        return {
            employee_info: {
                id: employee.id,
                name: employee.name,
                role: employee.role,
                department: employee.department,
                hire_date: employee.hire_date,
                current_workload: employee.workload
            },
            current_metrics: employee.performance_metrics,
            recent_performance: {
                tasks_completed: recentTasks.length,
                avg_quality: this.calculateAverage(recentTasks, 'quality_score'),
                success_rate: recentTasks.length > 0 ? 
                    recentTasks.filter(t => t.success).length / recentTasks.length * 100 : 0,
                avg_completion_time: this.calculateAverage(recentTasks, 'time_taken')
            },
            performance_trends: trends,
            recommendations: this.generateRecommendations(employee, recentTasks, trends)
        };
    }

    generateRecommendations(employee, recentTasks, trends) {
        const recommendations = [];

        if (recentTasks.length === 0) {
            recommendations.push("No recent task history available for analysis");
            return recommendations;
        }

        const successRate = recentTasks.filter(t => t.success).length / recentTasks.length * 100;
        const avgQuality = this.calculateAverage(recentTasks, 'quality_score');

        // Success rate analysis
        if (successRate < 70) {
            recommendations.push("Consider additional training or mentorship to improve task success rate");
        } else if (successRate > 90) {
            recommendations.push("Excellent success rate - consider taking on more challenging tasks");
        }

        // Quality analysis
        if (avgQuality && avgQuality < 70) {
            recommendations.push("Focus on improving work quality through code reviews and best practices");
        } else if (avgQuality && avgQuality > 90) {
            recommendations.push("High quality work - consider mentoring other team members");
        }

        // Workload analysis
        if (employee.workload > 4) {
            recommendations.push("High workload detected - consider redistributing tasks");
        } else if (employee.workload < 1) {
            recommendations.push("Low workload - available for additional assignments");
        }

        // Role-specific recommendations
        switch (employee.role) {
            case 'Junior Developer':
                if (avgQuality && avgQuality > 80) {
                    recommendations.push("Ready for more complex development tasks");
                }
                break;
            case 'Senior Developer':
                if (successRate > 95) {
                    recommendations.push("Consider taking on architecture or leadership responsibilities");
                }
                break;
        }

        return recommendations;
    }

    // Generate team performance dashboard
    generateTeamDashboard(department = null) {
        const employees = department ?
            Object.values(this.employees.employees).filter(emp => emp.department === department) :
            Object.values(this.employees.employees);

        const dashboard = {
            department: department || 'All',
            generated_at: new Date().toISOString(),
            team_summary: {
                total_employees: employees.length,
                active_employees: employees.filter(emp => emp.status === 'active').length,
                total_workload: employees.reduce((sum, emp) => sum + emp.workload, 0),
                avg_workload: employees.length > 0 ? 
                    employees.reduce((sum, emp) => sum + emp.workload, 0) / employees.length : 0
            },
            top_performers: this.getTopPerformers(employees),
            performance_summary: this.getPerformanceSummary(employees),
            workload_distribution: this.getWorkloadDistribution(employees)
        };

        return dashboard;
    }

    getTopPerformers(employees) {
        return employees
            .filter(emp => emp.status === 'active')
            .map(emp => {
                const history = this.historicalMetrics.employee_history[emp.id];
                const recentTasks = history ? history.tasks_completed.slice(-10) : [];
                const successRate = recentTasks.length > 0 ?
                    recentTasks.filter(t => t.success).length / recentTasks.length * 100 : 0;
                
                return {
                    id: emp.id,
                    name: emp.name,
                    role: emp.role,
                    success_rate: successRate,
                    tasks_completed: recentTasks.length,
                    avg_quality: this.calculateAverage(recentTasks, 'quality_score')
                };
            })
            .sort((a, b) => b.success_rate - a.success_rate)
            .slice(0, 5);
    }

    getPerformanceSummary(employees) {
        const allHistory = employees.map(emp => 
            this.historicalMetrics.employee_history[emp.id] || { tasks_completed: [] }
        );
        
        const allTasks = allHistory.flatMap(h => h.tasks_completed);
        
        return {
            total_tasks_completed: allTasks.length,
            overall_success_rate: allTasks.length > 0 ?
                allTasks.filter(t => t.success).length / allTasks.length * 100 : 0,
            avg_quality_score: this.calculateAverage(allTasks, 'quality_score'),
            avg_completion_time: this.calculateAverage(allTasks, 'time_taken')
        };
    }

    getWorkloadDistribution(employees) {
        const distribution = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, '5+': 0 };
        
        employees.forEach(emp => {
            const workload = emp.workload;
            if (workload >= 5) {
                distribution['5+']++;
            } else {
                distribution[workload]++;
            }
        });

        return distribution;
    }
}

// CLI Interface
if (require.main === module) {
    const tracker = new PerformanceTracker();
    const command = process.argv[2];

    switch (command) {
        case 'record':
            const employeeId = process.argv[3];
            const taskFile = process.argv[4];
            const resultsFile = process.argv[5];
            
            if (!employeeId || !taskFile || !resultsFile) {
                console.error('Usage: node performance-tracker.js record <employeeId> <task.json> <results.json>');
                process.exit(1);
            }
            
            try {
                const taskData = JSON.parse(fs.readFileSync(taskFile, 'utf8'));
                const results = JSON.parse(fs.readFileSync(resultsFile, 'utf8'));
                const result = tracker.recordTaskCompletion(employeeId, taskData, results);
                console.log(JSON.stringify(result, null, 2));
            } catch (error) {
                console.error('Error:', error.message);
                process.exit(1);
            }
            break;

        case 'report':
            const empId = process.argv[3];
            if (!empId) {
                console.error('Usage: node performance-tracker.js report <employeeId>');
                process.exit(1);
            }
            const report = tracker.generateEmployeeReport(empId);
            console.log(JSON.stringify(report, null, 2));
            break;

        case 'dashboard':
            const dept = process.argv[3];
            const dashboard = tracker.generateTeamDashboard(dept);
            console.log(JSON.stringify(dashboard, null, 2));
            break;

        default:
            console.log(`
AI Employee Performance Tracking System

Commands:
  record <empId> <task.json> <results.json>  - Record task completion
  report <employeeId>                        - Generate employee performance report  
  dashboard [department]                     - Generate team performance dashboard

Examples:
  node performance-tracker.js record emp_001 task.json results.json
  node performance-tracker.js report emp_001
  node performance-tracker.js dashboard Development
            `);
    }
}

module.exports = PerformanceTracker;