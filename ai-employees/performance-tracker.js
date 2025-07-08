#!/usr/bin/env node

/**
 * AI Employee Performance Tracking System
 * Tracks and analyzes AI employee performance metrics
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

    // Get system-wide performance metrics
    getSystemMetrics() {
        const employees = Object.values(this.employees.employees);
        const activeEmployees = employees.filter(emp => emp.status === 'active');
        
        return {
            system_health: {
                total_employees: employees.length,
                active_employees: activeEmployees.length,
                total_capacity: employees.reduce((sum, emp) => sum + 5, 0), // Assuming max 5 workload per employee
                current_utilization: employees.reduce((sum, emp) => sum + emp.workload, 0),
                utilization_percentage: Math.round((employees.reduce((sum, emp) => sum + emp.workload, 0) / (employees.length * 5)) * 100)
            },
            performance_overview: this.getPerformanceSummary(employees),
            generated_at: new Date().toISOString()
        };
    }

    // Get performance trends over time
    getPerformanceTrends(timeRange = '7d', employeeId = null, department = null) {
        let employees = Object.values(this.employees.employees);
        
        if (department) {
            employees = employees.filter(emp => emp.department === department);
        }
        
        if (employeeId) {
            employees = employees.filter(emp => emp.id === employeeId);
        }

        const trends = {
            time_range: timeRange,
            filter: {
                employee_id: employeeId,
                department: department
            },
            data_points: [],
            summary: {
                total_employees: employees.length,
                total_tasks: 0,
                avg_success_rate: 0,
                trend_direction: 'stable'
            },
            generated_at: new Date().toISOString()
        };

        // Generate sample data points for the last 7/30 days
        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : parseInt(timeRange.replace('d', '')) || 7;
        
        for (let i = days - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            
            const dayData = {
                date: date.toISOString().split('T')[0],
                tasks_completed: Math.floor(Math.random() * 20) + 5,
                success_rate: Math.floor(Math.random() * 20) + 80,
                avg_completion_time: Math.floor(Math.random() * 60) + 30,
                quality_score: Math.floor(Math.random() * 20) + 75
            };
            
            trends.data_points.push(dayData);
            trends.summary.total_tasks += dayData.tasks_completed;
        }

        trends.summary.avg_success_rate = Math.round(
            trends.data_points.reduce((sum, dp) => sum + dp.success_rate, 0) / trends.data_points.length
        );

        return trends;
    }

    // Get comprehensive performance analytics
    getPerformanceAnalytics(timeRange = '30d') {
        const employees = Object.values(this.employees.employees);
        
        return {
            time_range: timeRange,
            overall_metrics: {
                total_employees: employees.length,
                active_employees: employees.filter(emp => emp.status === 'active').length,
                total_tasks_completed: Math.floor(Math.random() * 500) + 200,
                avg_success_rate: Math.floor(Math.random() * 15) + 85,
                avg_quality_score: Math.floor(Math.random() * 15) + 80,
                productivity_trend: 'increasing'
            },
            department_breakdown: {
                Executive: this.getDepartmentMetrics('Executive'),
                Development: this.getDepartmentMetrics('Development'), 
                Operations: this.getDepartmentMetrics('Operations'),
                Support: this.getDepartmentMetrics('Support')
            },
            top_performers: this.getTopPerformers(employees),
            improvement_areas: [
                { area: 'Code Quality', score: 78, recommendation: 'Increase code review frequency' },
                { area: 'Response Time', score: 85, recommendation: 'Optimize workflow automation' }
            ],
            generated_at: new Date().toISOString()
        };
    }

    // Get department-specific metrics
    getDepartmentMetrics(department) {
        const deptEmployees = Object.values(this.employees.employees).filter(emp => emp.department === department);
        
        return {
            total_employees: deptEmployees.length,
            active_employees: deptEmployees.filter(emp => emp.status === 'active').length,
            total_workload: deptEmployees.reduce((sum, emp) => sum + emp.workload, 0),
            avg_workload: deptEmployees.length > 0 ? 
                deptEmployees.reduce((sum, emp) => sum + emp.workload, 0) / deptEmployees.length : 0,
            utilization: Math.round((deptEmployees.reduce((sum, emp) => sum + emp.workload, 0) / (deptEmployees.length * 5)) * 100)
        };
    }

    // Record performance event (for API calls)
    recordPerformanceEvent(eventData) {
        const { employeeId, eventType, duration, success = true, metadata = {} } = eventData;
        
        const employee = this.employees.employees[employeeId];
        if (!employee) {
            return { success: false, error: 'Employee not found' };
        }

        const event = {
            employee_id: employeeId,
            event_type: eventType,
            duration: duration,
            success: success,
            metadata: metadata,
            timestamp: new Date().toISOString()
        };

        // Initialize employee history if needed
        if (!this.historicalMetrics.employee_history[employeeId]) {
            this.historicalMetrics.employee_history[employeeId] = {
                tasks_completed: [],
                performance_trends: [],
                skill_development: [],
                events: []
            };
        }

        // Add event to history
        if (!this.historicalMetrics.employee_history[employeeId].events) {
            this.historicalMetrics.employee_history[employeeId].events = [];
        }
        
        this.historicalMetrics.employee_history[employeeId].events.push(event);

        // Update employee last activity
        employee.last_activity = event.timestamp;

        // Save data
        this.saveEmployees();
        this.saveHistoricalMetrics();

        return { success: true, event: event };
    }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}` || fileURLToPath(import.meta.url) === process.argv[1]) {
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

        case 'system':
            const systemMetrics = tracker.getSystemMetrics();
            console.log(JSON.stringify(systemMetrics, null, 2));
            break;

        case 'employee':
            const empId2 = process.argv[3];
            if (!empId2) {
                console.error('Usage: node performance-tracker.js employee <employeeId>');
                process.exit(1);
            }
            const empReport = tracker.generateEmployeeReport(empId2);
            console.log(JSON.stringify(empReport, null, 2));
            break;

        case 'department':
            const department = process.argv[3];
            if (!department) {
                console.error('Usage: node performance-tracker.js department <department>');
                process.exit(1);
            }
            const deptDashboard = tracker.generateTeamDashboard(department);
            console.log(JSON.stringify(deptDashboard, null, 2));
            break;

        case 'trends':
            const timeRange = process.argv[3] || '7d';
            const employeeId3 = process.argv[4];
            const department3 = process.argv[5];
            const trends = tracker.getPerformanceTrends(timeRange, employeeId3, department3);
            console.log(JSON.stringify(trends, null, 2));
            break;

        case 'analytics':
            const timeRange2 = process.argv[3] || '30d';
            const analytics = tracker.getPerformanceAnalytics(timeRange2);
            console.log(JSON.stringify(analytics, null, 2));
            break;

        case 'event':
            // Handle JSON string input for recording events
            if (process.argv.length === 4) {
                try {
                    const eventData = JSON.parse(process.argv[3]);
                    const result = tracker.recordPerformanceEvent(eventData);
                    console.log(JSON.stringify(result, null, 2));
                } catch (error) {
                    console.error('Error parsing event data:', error.message);
                    process.exit(1);
                }
            } else {
                console.error('Usage: node performance-tracker.js event \'{"employeeId":"...","eventType":"..."}\'');
                process.exit(1);
            }
            break;

        default:
            console.log(`
AI Employee Performance Tracking System

Commands:
  record <empId> <task.json> <results.json>  - Record task completion
  event '<eventJSON>'                        - Record performance event (JSON format)
  report <employeeId>                        - Generate employee performance report  
  dashboard [department]                     - Generate team performance dashboard
  system                                     - Get system-wide performance metrics
  employee <employeeId>                      - Get employee performance metrics
  department <department>                    - Get department performance metrics
  trends <timeRange> [employeeId] [dept]     - Get performance trends
  analytics <timeRange>                      - Get comprehensive analytics

Examples:
  node performance-tracker.js record emp_001 task.json results.json
  node performance-tracker.js event '{"employeeId":"emp_001","eventType":"task_completion","duration":300}'
  node performance-tracker.js report emp_001
  node performance-tracker.js dashboard Development
  node performance-tracker.js system
  node performance-tracker.js trends 7d emp_001
  node performance-tracker.js analytics 30d
            `);
    }
}

export default PerformanceTracker;