#!/usr/bin/env node

/**
 * AI Employee Status Monitoring System
 * Real-time monitoring and alerting for AI employee status and workload
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class StatusMonitor {
    constructor() {
        this.registryPath = path.join(__dirname, 'employee-registry.json');
        this.statusLogPath = path.join(__dirname, 'status-log.json');
        this.alertsPath = path.join(__dirname, 'alerts.json');
        this.employees = this.loadEmployees();
        this.statusLog = this.loadStatusLog();
        this.alerts = this.loadAlerts();
        this.thresholds = this.getDefaultThresholds();
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

    loadStatusLog() {
        try {
            const data = fs.readFileSync(this.statusLogPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            const initialLog = {
                created: new Date().toISOString(),
                snapshots: []
            };
            this.saveStatusLog(initialLog);
            return initialLog;
        }
    }

    loadAlerts() {
        try {
            const data = fs.readFileSync(this.alertsPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            const initialAlerts = {
                created: new Date().toISOString(),
                active_alerts: [],
                resolved_alerts: []
            };
            this.saveAlerts(initialAlerts);
            return initialAlerts;
        }
    }

    saveStatusLog(log = this.statusLog) {
        try {
            fs.writeFileSync(this.statusLogPath, JSON.stringify(log, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving status log:', error);
            return false;
        }
    }

    saveAlerts(alerts = this.alerts) {
        try {
            fs.writeFileSync(this.alertsPath, JSON.stringify(alerts, null, 2));
            return true;
        } catch (error) {
            console.error('Error saving alerts:', error);
            return false;
        }
    }

    getDefaultThresholds() {
        return {
            high_workload: 4,
            critical_workload: 5,
            low_utilization: 0.5,
            max_inactive_hours: 24,
            min_success_rate: 70,
            max_response_time: 300, // 5 minutes
            department_capacity_warning: 80 // percentage
        };
    }

    // Take a snapshot of current system status
    takeStatusSnapshot() {
        const timestamp = new Date().toISOString();
        const snapshot = {
            timestamp: timestamp,
            system_health: this.calculateSystemHealth(),
            department_status: this.getDepartmentStatus(),
            employee_status: this.getEmployeeStatusSummary(),
            capacity_utilization: this.calculateCapacityUtilization(),
            active_alerts: this.alerts.active_alerts.length,
            performance_summary: this.getPerformanceSummary()
        };

        // Add to status log
        this.statusLog.snapshots.push(snapshot);

        // Keep only last 100 snapshots
        if (this.statusLog.snapshots.length > 100) {
            this.statusLog.snapshots = this.statusLog.snapshots.slice(-100);
        }

        this.saveStatusLog();
        return snapshot;
    }

    calculateSystemHealth() {
        const employees = Object.values(this.employees.employees);
        const activeEmployees = employees.filter(emp => emp.status === 'active');
        
        const healthMetrics = {
            employee_availability: (activeEmployees.length / employees.length) * 100,
            average_workload: activeEmployees.reduce((sum, emp) => sum + emp.workload, 0) / activeEmployees.length,
            overloaded_employees: activeEmployees.filter(emp => emp.workload >= this.thresholds.high_workload).length,
            underutilized_employees: activeEmployees.filter(emp => emp.workload <= this.thresholds.low_utilization).length
        };

        // Calculate overall health score (0-100)
        let healthScore = 100;
        
        // Deduct for overloaded employees
        healthScore -= (healthMetrics.overloaded_employees / activeEmployees.length) * 30;
        
        // Deduct for too many underutilized employees  
        if (healthMetrics.underutilized_employees > activeEmployees.length * 0.3) {
            healthScore -= 20;
        }
        
        // Deduct for low availability
        if (healthMetrics.employee_availability < 90) {
            healthScore -= (90 - healthMetrics.employee_availability);
        }

        healthMetrics.overall_health_score = Math.max(0, Math.round(healthScore));
        healthMetrics.health_status = this.getHealthStatus(healthMetrics.overall_health_score);

        return healthMetrics;
    }

    getHealthStatus(score) {
        if (score >= 90) return 'excellent';
        if (score >= 75) return 'good';
        if (score >= 60) return 'fair';
        if (score >= 40) return 'poor';
        return 'critical';
    }

    getDepartmentStatus() {
        const departments = this.employees.departments;
        const departmentStatus = {};

        for (const [deptName, deptInfo] of Object.entries(departments)) {
            const deptEmployees = deptInfo.employees.map(id => this.employees.employees[id]);
            const activeEmployees = deptEmployees.filter(emp => emp.status === 'active');
            
            departmentStatus[deptName] = {
                total_employees: deptEmployees.length,
                active_employees: activeEmployees.length,
                total_workload: activeEmployees.reduce((sum, emp) => sum + emp.workload, 0),
                average_workload: activeEmployees.length > 0 ? 
                    activeEmployees.reduce((sum, emp) => sum + emp.workload, 0) / activeEmployees.length : 0,
                capacity_utilization: this.calculateDepartmentCapacity(activeEmployees),
                department_head: this.employees.employees[deptInfo.head]?.name || 'Unknown',
                status: this.getDepartmentHealthStatus(activeEmployees)
            };
        }

        return departmentStatus;
    }

    calculateDepartmentCapacity(employees) {
        if (employees.length === 0) return 0;
        const maxCapacity = employees.length * 5; // Assuming max 5 workload per employee
        const currentWorkload = employees.reduce((sum, emp) => sum + emp.workload, 0);
        return Math.round((currentWorkload / maxCapacity) * 100);
    }

    getDepartmentHealthStatus(employees) {
        const overloaded = employees.filter(emp => emp.workload >= this.thresholds.high_workload).length;
        const underutilized = employees.filter(emp => emp.workload <= this.thresholds.low_utilization).length;
        const total = employees.length;

        if (overloaded > total * 0.5) return 'overloaded';
        if (underutilized > total * 0.5) return 'underutilized';
        if (overloaded > 0) return 'stressed';
        return 'healthy';
    }

    getEmployeeStatusSummary() {
        const employees = Object.values(this.employees.employees);
        const summary = {
            total: employees.length,
            active: employees.filter(emp => emp.status === 'active').length,
            inactive: employees.filter(emp => emp.status !== 'active').length,
            overloaded: employees.filter(emp => emp.workload >= this.thresholds.high_workload).length,
            underutilized: employees.filter(emp => emp.workload <= this.thresholds.low_utilization).length,
            optimal: employees.filter(emp => 
                emp.workload > this.thresholds.low_utilization && 
                emp.workload < this.thresholds.high_workload
            ).length
        };

        return summary;
    }

    calculateCapacityUtilization() {
        const employees = Object.values(this.employees.employees)
            .filter(emp => emp.status === 'active');
        
        if (employees.length === 0) return { utilization: 0, capacity: 'unknown' };

        const totalCapacity = employees.length * 5; // Max 5 workload per employee
        const currentWorkload = employees.reduce((sum, emp) => sum + emp.workload, 0);
        const utilization = Math.round((currentWorkload / totalCapacity) * 100);

        let capacityStatus;
        if (utilization < 50) capacityStatus = 'underutilized';
        else if (utilization < 80) capacityStatus = 'optimal';
        else if (utilization < 95) capacityStatus = 'high';
        else capacityStatus = 'critical';

        return {
            total_capacity: totalCapacity,
            current_workload: currentWorkload,
            utilization_percentage: utilization,
            capacity_status: capacityStatus,
            available_capacity: totalCapacity - currentWorkload
        };
    }

    getPerformanceSummary() {
        // This would integrate with the performance tracker
        return {
            note: "Performance summary would integrate with performance-tracker.js",
            metrics_available: false
        };
    }

    // Check for conditions that should trigger alerts
    checkAlerts() {
        const newAlerts = [];
        const employees = Object.values(this.employees.employees);
        const timestamp = new Date().toISOString();

        // Check for overloaded employees
        employees.forEach(emp => {
            if (emp.status === 'active' && emp.workload >= this.thresholds.critical_workload) {
                newAlerts.push({
                    id: `overload_${emp.id}_${Date.now()}`,
                    type: 'critical_workload',
                    severity: 'high',
                    employee_id: emp.id,
                    employee_name: emp.name,
                    message: `${emp.name} has critical workload (${emp.workload}/${this.thresholds.critical_workload})`,
                    created_at: timestamp,
                    resolved: false
                });
            } else if (emp.status === 'active' && emp.workload >= this.thresholds.high_workload) {
                newAlerts.push({
                    id: `highload_${emp.id}_${Date.now()}`,
                    type: 'high_workload',
                    severity: 'medium',
                    employee_id: emp.id,
                    employee_name: emp.name,
                    message: `${emp.name} has high workload (${emp.workload}/${this.thresholds.high_workload})`,
                    created_at: timestamp,
                    resolved: false
                });
            }
        });

        // Check department capacity
        const departmentStatus = this.getDepartmentStatus();
        for (const [deptName, status] of Object.entries(departmentStatus)) {
            if (status.capacity_utilization >= this.thresholds.department_capacity_warning) {
                newAlerts.push({
                    id: `dept_capacity_${deptName}_${Date.now()}`,
                    type: 'department_capacity',
                    severity: 'medium',
                    department: deptName,
                    message: `${deptName} department at ${status.capacity_utilization}% capacity`,
                    created_at: timestamp,
                    resolved: false
                });
            }
        }

        // Check system health
        const systemHealth = this.calculateSystemHealth();
        if (systemHealth.overall_health_score < 60) {
            newAlerts.push({
                id: `system_health_${Date.now()}`,
                type: 'system_health',
                severity: systemHealth.overall_health_score < 40 ? 'critical' : 'high',
                message: `System health score is ${systemHealth.overall_health_score}/100 (${systemHealth.health_status})`,
                created_at: timestamp,
                resolved: false
            });
        }

        // Add new alerts to active alerts (avoiding duplicates)
        const existingAlertTypes = new Set(
            this.alerts.active_alerts.map(alert => `${alert.type}_${alert.employee_id || alert.department || 'system'}`)
        );

        newAlerts.forEach(alert => {
            const alertKey = `${alert.type}_${alert.employee_id || alert.department || 'system'}`;
            if (!existingAlertTypes.has(alertKey)) {
                this.alerts.active_alerts.push(alert);
            }
        });

        this.saveAlerts();
        return newAlerts;
    }

    // Resolve an alert
    resolveAlert(alertId) {
        const alertIndex = this.alerts.active_alerts.findIndex(alert => alert.id === alertId);
        if (alertIndex === -1) {
            return { success: false, error: 'Alert not found' };
        }

        const alert = this.alerts.active_alerts[alertIndex];
        alert.resolved = true;
        alert.resolved_at = new Date().toISOString();

        // Move to resolved alerts
        this.alerts.resolved_alerts.push(alert);
        this.alerts.active_alerts.splice(alertIndex, 1);

        // Keep only last 50 resolved alerts
        if (this.alerts.resolved_alerts.length > 50) {
            this.alerts.resolved_alerts = this.alerts.resolved_alerts.slice(-50);
        }

        this.saveAlerts();
        return { success: true, alert: alert };
    }

    // Generate comprehensive status report
    generateStatusReport() {
        const snapshot = this.takeStatusSnapshot();
        const alerts = this.checkAlerts();
        
        return {
            generated_at: new Date().toISOString(),
            system_snapshot: snapshot,
            new_alerts: alerts,
            active_alerts: this.alerts.active_alerts,
            recommendations: this.generateRecommendations(snapshot),
            trending: this.analyzeTrends()
        };
    }

    generateRecommendations(snapshot) {
        const recommendations = [];

        // Workload recommendations
        if (snapshot.employee_status.overloaded > 0) {
            recommendations.push({
                priority: 'high',
                category: 'workload',
                message: `${snapshot.employee_status.overloaded} employees are overloaded. Consider redistributing tasks.`,
                action: 'Redistribute high-priority tasks to underutilized employees'
            });
        }

        if (snapshot.employee_status.underutilized > snapshot.employee_status.total * 0.3) {
            recommendations.push({
                priority: 'medium',
                category: 'utilization',
                message: 'High number of underutilized employees detected.',
                action: 'Consider assigning additional projects or training initiatives'
            });
        }

        // Capacity recommendations
        if (snapshot.capacity_utilization.utilization_percentage > 90) {
            recommendations.push({
                priority: 'high',
                category: 'capacity',
                message: 'System approaching maximum capacity.',
                action: 'Consider hiring additional AI employees or optimizing workflows'
            });
        }

        // Health recommendations
        if (snapshot.system_health.overall_health_score < 75) {
            recommendations.push({
                priority: 'medium',
                category: 'health',
                message: 'System health below optimal levels.',
                action: 'Review workload distribution and employee wellness'
            });
        }

        return recommendations;
    }

    analyzeTrends() {
        const recentSnapshots = this.statusLog.snapshots.slice(-10);
        if (recentSnapshots.length < 2) {
            return { message: 'Insufficient data for trend analysis' };
        }

        const first = recentSnapshots[0];
        const last = recentSnapshots[recentSnapshots.length - 1];

        return {
            workload_trend: this.calculateTrend(
                first.capacity_utilization?.utilization_percentage || 0,
                last.capacity_utilization?.utilization_percentage || 0
            ),
            health_trend: this.calculateTrend(
                first.system_health?.overall_health_score || 0,
                last.system_health?.overall_health_score || 0
            ),
            alerts_trend: this.calculateTrend(first.active_alerts, last.active_alerts)
        };
    }

    calculateTrend(oldValue, newValue) {
        if (oldValue === 0) return 'stable';
        const change = ((newValue - oldValue) / oldValue) * 100;
        if (Math.abs(change) < 5) return 'stable';
        return change > 0 ? 'increasing' : 'decreasing';
    }
}

// CLI Interface
if (import.meta.url === `file://${process.argv[1]}`) {
    const monitor = new StatusMonitor();
    const command = process.argv[2];

    switch (command) {
        case 'snapshot':
            const snapshot = monitor.takeStatusSnapshot();
            console.log(JSON.stringify(snapshot, null, 2));
            break;

        case 'alerts':
            const alerts = monitor.checkAlerts();
            console.log(JSON.stringify({
                new_alerts: alerts,
                active_alerts: monitor.alerts.active_alerts
            }, null, 2));
            break;

        case 'resolve':
            const alertId = process.argv[3];
            if (!alertId) {
                console.error('Usage: node status-monitor.js resolve <alertId>');
                process.exit(1);
            }
            const result = monitor.resolveAlert(alertId);
            console.log(JSON.stringify(result, null, 2));
            break;

        case 'report':
            const report = monitor.generateStatusReport();
            console.log(JSON.stringify(report, null, 2));
            break;

        case 'health':
            const health = monitor.calculateSystemHealth();
            console.log(JSON.stringify(health, null, 2));
            break;

        default:
            console.log(`
AI Employee Status Monitoring System

Commands:
  snapshot     - Take current status snapshot
  alerts       - Check for new alerts and show active alerts
  resolve <id> - Resolve an active alert
  report       - Generate comprehensive status report
  health       - Show current system health

Examples:
  node status-monitor.js snapshot
  node status-monitor.js alerts
  node status-monitor.js resolve alert_id_123
  node status-monitor.js report
            `);
    }
}

export default StatusMonitor;