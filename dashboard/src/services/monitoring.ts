import axios from 'axios';

const API_BASE = 'http://localhost:3333';
const CORPORATE_BASE = '../ai-employees'; // Relative to dashboard for corporate infrastructure

// Real-time monitoring data interfaces
export interface SystemHealthStatus {
  infrastructure: {
    memory_api: 'online' | 'offline' | 'degraded';
    vector_db: 'online' | 'offline' | 'degraded';
    redis: 'online' | 'offline' | 'degraded';
    workflow: 'online' | 'offline' | 'degraded';
    corporate: 'online' | 'offline' | 'degraded';
  };
  performance: {
    cpu_usage: number;
    ram_usage: number;
    disk_usage: number;
    network_usage: number;
    load_average: number;
  };
  response_times: {
    api: number;
    search: number;
    context: number;
    storage: number;
    cleanup: number;
  };
  last_updated: string;
}

export interface EmployeeActivity {
  timestamp: string;
  employee_id: string;
  employee_name: string;
  employee_role: string;
  activity_type: 'task_started' | 'task_completed' | 'context_loaded' | 'memory_stored' | 'status_update';
  description: string;
  task_id?: string;
  success?: boolean;
  duration_ms?: number;
}

export interface EmployeeStatusLive {
  employee_id: string;
  name: string;
  role: string;
  department: string;
  status: 'active' | 'busy' | 'offline';
  last_activity: string;
  current_task?: string;
  cpu_usage?: number;
  ram_usage?: number;
  response_time?: number;
  memory_count?: number;
  workload: number;
}

export interface PerformanceMetrics {
  timestamps: string[];
  cpu_usage: number[];
  memory_usage: number[];
  api_response_times: number[];
  memory_operations_per_second: number[];
}

export interface MemorySystemHealth {
  vector_db: {
    status: 'online' | 'offline';
    vectors_stored: number;
    avg_latency: number;
    throughput_ops_per_sec: number;
  };
  analytics: {
    active_queries_per_min: number;
    search_accuracy_percent: number;
    context_hit_rate_percent: number;
    cache_hit_rate_percent: number;
  };
  storage: {
    usage_mb: number;
    total_mb: number;
    usage_percent: number;
    growth_memories_per_day: number;
    last_cleanup: string;
    archived_memories: number;
  };
  operations: MemoryOperation[];
}

export interface MemoryOperation {
  timestamp: string;
  employee_id: string;
  employee_name: string;
  operation: 'stored' | 'searched' | 'context_loaded' | 'archived';
  type?: 'experience' | 'knowledge' | 'decision' | 'interaction';
  description: string;
  result_count?: number;
}

export interface SystemAlert {
  id: string;
  type: 'warning' | 'critical' | 'info' | 'resolved';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  timestamp: string;
  employee_id?: string;
  department?: string;
  resolved?: boolean;
  resolved_at?: string;
}

export interface MonitoringStats {
  system_health: SystemHealthStatus;
  employee_activities: EmployeeActivity[];
  employee_status: EmployeeStatusLive[];
  performance_metrics: PerformanceMetrics;
  memory_health: MemorySystemHealth;
  active_alerts: SystemAlert[];
}

class MonitoringService {
  private api = axios.create({
    baseURL: API_BASE,
    timeout: 10000,
  });

  // Get comprehensive system health status
  async getSystemHealth(): Promise<SystemHealthStatus> {
    try {
      // Check Memory API health
      const memoryHealth = await this.api.get('/health');
      
      // Simulate checking other services (in production these would be real health checks)
      const health: SystemHealthStatus = {
        infrastructure: {
          memory_api: memoryHealth.status === 200 ? 'online' : 'offline',
          vector_db: 'online', // Would check Pinecone status
          redis: 'online', // Would check Redis status
          workflow: 'online', // Would check corporate-workflow.sh status
          corporate: 'online', // Would check corporate infrastructure
        },
        performance: {
          cpu_usage: 45, // Would get from system monitoring
          ram_usage: 72,
          disk_usage: 28,
          network_usage: 41,
          load_average: 1.35,
        },
        response_times: {
          api: 234,
          search: 89,
          context: 156,
          storage: 67,
          cleanup: 1200,
        },
        last_updated: new Date().toISOString(),
      };

      return health;
    } catch (error) {
      console.error('Failed to get system health:', error);
      // Return offline status
      return {
        infrastructure: {
          memory_api: 'offline',
          vector_db: 'offline',
          redis: 'offline',
          workflow: 'offline',
          corporate: 'offline',
        },
        performance: { cpu_usage: 0, ram_usage: 0, disk_usage: 0, network_usage: 0, load_average: 0 },
        response_times: { api: 0, search: 0, context: 0, storage: 0, cleanup: 0 },
        last_updated: new Date().toISOString(),
      };
    }
  }

  // Get live employee activity feed
  async getEmployeeActivity(limit: number = 20): Promise<EmployeeActivity[]> {
    try {
      // In production, this would read from activity logs or WebSocket
      // For now, simulate recent activities
      const activities: EmployeeActivity[] = [
        {
          timestamp: new Date(Date.now() - 30000).toISOString(),
          employee_id: 'emp_004_sd',
          employee_name: 'Sam Senior Developer',
          employee_role: 'Senior Developer',
          activity_type: 'task_started',
          description: 'Started Task 6.10 real-time monitoring implementation',
          task_id: 'task_6_10',
        },
        {
          timestamp: new Date(Date.now() - 60000).toISOString(),
          employee_id: 'emp_001_pm',
          employee_name: 'Alex Project Manager',
          employee_role: 'Project Manager',
          activity_type: 'status_update',
          description: 'Updated project timeline for Step 6.5 completion',
        },
        {
          timestamp: new Date(Date.now() - 120000).toISOString(),
          employee_id: 'emp_006_qe',
          employee_name: 'Morgan QA Engineer',
          employee_role: 'QA Engineer',
          activity_type: 'task_completed',
          description: 'Completed memory persistence testing validation',
          success: true,
          duration_ms: 45000,
        },
        {
          timestamp: new Date(Date.now() - 180000).toISOString(),
          employee_id: 'emp_002_tl',
          employee_name: 'Taylor Technical Lead',
          employee_role: 'Technical Lead',
          activity_type: 'memory_stored',
          description: 'Stored architecture decision for monitoring dashboard',
        },
        {
          timestamp: new Date(Date.now() - 240000).toISOString(),
          employee_id: 'emp_012_ux',
          employee_name: 'Quinn UI/UX Designer',
          employee_role: 'UI/UX Designer',
          activity_type: 'task_completed',
          description: 'Finished monitoring dashboard wireframes and prototypes',
          success: true,
          duration_ms: 120000,
        },
      ];

      return activities.slice(0, limit);
    } catch (error) {
      console.error('Failed to get employee activity:', error);
      return [];
    }
  }

  // Get live employee status for all 13 employees
  async getEmployeeStatus(): Promise<EmployeeStatusLive[]> {
    try {
      // In production, this would integrate with corporate infrastructure
      const employees: EmployeeStatusLive[] = [
        // Executive Department
        {
          employee_id: 'emp_001_pm',
          name: 'Alex Project Manager',
          role: 'Project Manager',
          department: 'Executive',
          status: 'active',
          last_activity: new Date(Date.now() - 120000).toISOString(),
          current_task: 'Sprint Planning',
          cpu_usage: 23,
          ram_usage: 45,
          response_time: 187,
          workload: 3,
        },
        {
          employee_id: 'emp_002_tl',
          name: 'Taylor Technical Lead',
          role: 'Technical Lead',
          department: 'Executive',
          status: 'active',
          last_activity: new Date(Date.now() - 30000).toISOString(),
          current_task: 'Architecture Review',
          cpu_usage: 67,
          ram_usage: 78,
          response_time: 234,
          workload: 4,
        },
        {
          employee_id: 'emp_003_qd',
          name: 'Jordan QA Director',
          role: 'QA Director',
          department: 'Executive',
          status: 'active',
          last_activity: new Date(Date.now() - 300000).toISOString(),
          current_task: 'Quality Review',
          cpu_usage: 12,
          ram_usage: 34,
          response_time: 156,
          workload: 2,
        },
        // Development Department
        {
          employee_id: 'emp_004_sd',
          name: 'Sam Senior Developer',
          role: 'Senior Developer',
          department: 'Development',
          status: 'busy',
          last_activity: new Date(Date.now() - 15000).toISOString(),
          current_task: 'Monitoring Dashboard Implementation',
          cpu_usage: 78,
          ram_usage: 89,
          response_time: 298,
          memory_count: 186,
          workload: 5,
        },
        {
          employee_id: 'emp_005_jd',
          name: 'Casey Junior Developer',
          role: 'Junior Developer',
          department: 'Development',
          status: 'active',
          last_activity: new Date(Date.now() - 60000).toISOString(),
          current_task: 'Bug Fixes',
          cpu_usage: 34,
          ram_usage: 56,
          response_time: 145,
          memory_count: 76,
          workload: 2,
        },
        {
          employee_id: 'emp_006_qe',
          name: 'Morgan QA Engineer',
          role: 'QA Engineer',
          department: 'Development',
          status: 'active',
          last_activity: new Date(Date.now() - 45000).toISOString(),
          current_task: 'Memory Testing',
          cpu_usage: 45,
          ram_usage: 67,
          response_time: 201,
          memory_count: 98,
          workload: 3,
        },
        {
          employee_id: 'emp_007_te',
          name: 'Riley Test Engineer',
          role: 'Test Engineer',
          department: 'Development',
          status: 'active',
          last_activity: new Date(Date.now() - 180000).toISOString(),
          current_task: 'Test Automation',
          cpu_usage: 29,
          ram_usage: 43,
          response_time: 178,
          memory_count: 67,
          workload: 2,
        },
        // Operations Department
        {
          employee_id: 'emp_008_do',
          name: 'Drew DevOps Engineer',
          role: 'DevOps Engineer',
          department: 'Operations',
          status: 'active',
          last_activity: new Date(Date.now() - 240000).toISOString(),
          current_task: 'Infrastructure Monitoring',
          cpu_usage: 41,
          ram_usage: 52,
          response_time: 189,
          workload: 3,
        },
        {
          employee_id: 'emp_009_sre',
          name: 'Avery Site Reliability Engineer',
          role: 'Site Reliability Engineer',
          department: 'Operations',
          status: 'active',
          last_activity: new Date(Date.now() - 90000).toISOString(),
          current_task: 'Performance Monitoring',
          cpu_usage: 38,
          ram_usage: 61,
          response_time: 167,
          workload: 2,
        },
        {
          employee_id: 'emp_010_se',
          name: 'Sage Security Engineer',
          role: 'Security Engineer',
          department: 'Operations',
          status: 'active',
          last_activity: new Date(Date.now() - 360000).toISOString(),
          current_task: 'Security Audit',
          cpu_usage: 15,
          ram_usage: 28,
          response_time: 134,
          workload: 1,
        },
        // Support Department
        {
          employee_id: 'emp_011_tw',
          name: 'Blake Technical Writer',
          role: 'Technical Writer',
          department: 'Support',
          status: 'active',
          last_activity: new Date(Date.now() - 150000).toISOString(),
          current_task: 'Documentation Update',
          cpu_usage: 22,
          ram_usage: 39,
          response_time: 142,
          workload: 2,
        },
        {
          employee_id: 'emp_012_ux',
          name: 'Quinn UI/UX Designer',
          role: 'UI/UX Designer',
          department: 'Support',
          status: 'active',
          last_activity: new Date(Date.now() - 300000).toISOString(),
          current_task: 'Dashboard Design',
          cpu_usage: 31,
          ram_usage: 47,
          response_time: 158,
          workload: 3,
        },
        {
          employee_id: 'emp_013_be',
          name: 'River Build Engineer',
          role: 'Build Engineer',
          department: 'Support',
          status: 'active',
          last_activity: new Date(Date.now() - 420000).toISOString(),
          current_task: 'Build Optimization',
          cpu_usage: 26,
          ram_usage: 41,
          response_time: 171,
          workload: 1,
        },
      ];

      return employees;
    } catch (error) {
      console.error('Failed to get employee status:', error);
      return [];
    }
  }

  // Get real-time performance metrics for charts
  async getPerformanceMetrics(): Promise<PerformanceMetrics> {
    try {
      // Generate sample time series data for the last hour
      const now = Date.now();
      const timestamps: string[] = [];
      const cpu_usage: number[] = [];
      const memory_usage: number[] = [];
      const api_response_times: number[] = [];
      const memory_operations_per_second: number[] = [];

      // Generate data points for last 12 intervals (5 minutes each)
      for (let i = 11; i >= 0; i--) {
        const timestamp = new Date(now - i * 5 * 60 * 1000);
        timestamps.push(timestamp.toLocaleTimeString('en-US', { hour12: false }));
        
        // Simulate realistic performance trends
        cpu_usage.push(30 + Math.sin(i * 0.5) * 20 + Math.random() * 10);
        memory_usage.push(50 + Math.cos(i * 0.3) * 25 + Math.random() * 10);
        api_response_times.push(200 + Math.sin(i * 0.4) * 100 + Math.random() * 50);
        memory_operations_per_second.push(20 + Math.cos(i * 0.6) * 15 + Math.random() * 10);
      }

      return {
        timestamps,
        cpu_usage,
        memory_usage,
        api_response_times,
        memory_operations_per_second,
      };
    } catch (error) {
      console.error('Failed to get performance metrics:', error);
      return {
        timestamps: [],
        cpu_usage: [],
        memory_usage: [],
        api_response_times: [],
        memory_operations_per_second: [],
      };
    }
  }

  // Get memory system health and operations
  async getMemorySystemHealth(): Promise<MemorySystemHealth> {
    try {
      // Check Memory API status first
      await this.api.get('/health');

      const memoryHealth: MemorySystemHealth = {
        vector_db: {
          status: 'online',
          vectors_stored: 3247,
          avg_latency: 89,
          throughput_ops_per_sec: 156,
        },
        analytics: {
          active_queries_per_min: 23,
          search_accuracy_percent: 94,
          context_hit_rate_percent: 89,
          cache_hit_rate_percent: 91,
        },
        storage: {
          usage_mb: 847,
          total_mb: 2048,
          usage_percent: 42,
          growth_memories_per_day: 15,
          last_cleanup: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
          archived_memories: 234,
        },
        operations: [
          {
            timestamp: new Date(Date.now() - 26000).toISOString(),
            employee_id: 'emp_004_sd',
            employee_name: 'Sam',
            operation: 'stored',
            type: 'experience',
            description: 'Real-time dashboard implementation progress',
          },
          {
            timestamp: new Date(Date.now() - 48000).toISOString(),
            employee_id: 'emp_001_pm',
            employee_name: 'Alex',
            operation: 'searched',
            description: 'project planning best practices',
            result_count: 7,
          },
          {
            timestamp: new Date(Date.now() - 62000).toISOString(),
            employee_id: 'emp_006_qe',
            employee_name: 'Morgan',
            operation: 'stored',
            type: 'knowledge',
            description: 'Testing automation patterns and best practices',
          },
          {
            timestamp: new Date(Date.now() - 97000).toISOString(),
            employee_id: 'emp_002_tl',
            employee_name: 'Taylor',
            operation: 'context_loaded',
            description: '5 memories for architecture review session',
            result_count: 5,
          },
          {
            timestamp: new Date(Date.now() - 124000).toISOString(),
            employee_id: 'system',
            employee_name: 'System',
            operation: 'archived',
            description: 'Archived 3 old memories from emp_005_jd',
            result_count: 3,
          },
        ],
      };

      return memoryHealth;
    } catch (error) {
      console.error('Failed to get memory system health:', error);
      return {
        vector_db: { status: 'offline', vectors_stored: 0, avg_latency: 0, throughput_ops_per_sec: 0 },
        analytics: { active_queries_per_min: 0, search_accuracy_percent: 0, context_hit_rate_percent: 0, cache_hit_rate_percent: 0 },
        storage: { usage_mb: 0, total_mb: 0, usage_percent: 0, growth_memories_per_day: 0, last_cleanup: '', archived_memories: 0 },
        operations: [],
      };
    }
  }

  // Get active system alerts
  async getActiveAlerts(): Promise<SystemAlert[]> {
    try {
      // In production, this would integrate with status-monitor.js alerts
      const alerts: SystemAlert[] = [
        {
          id: 'alert_cpu_sam_001',
          type: 'warning',
          severity: 'medium',
          title: 'High CPU Usage',
          message: 'Sam (Senior Developer) has high CPU usage - 78% utilization',
          timestamp: new Date(Date.now() - 300000).toISOString(),
          employee_id: 'emp_004_sd',
        },
        {
          id: 'alert_response_time_001',
          type: 'info',
          severity: 'low',
          title: 'Elevated Response Time',
          message: 'API response time elevated - 298ms avg (target: <250ms)',
          timestamp: new Date(Date.now() - 180000).toISOString(),
        },
        {
          id: 'alert_redis_recovery_001',
          type: 'resolved',
          severity: 'medium',
          title: 'Redis Connection Recovered',
          message: 'Redis connection timeout - auto-recovered in 1.2s',
          timestamp: new Date(Date.now() - 600000).toISOString(),
          resolved: true,
          resolved_at: new Date(Date.now() - 540000).toISOString(),
        },
        {
          id: 'alert_memory_cleanup_001',
          type: 'info',
          severity: 'low',
          title: 'Memory Cleanup Completed',
          message: 'Memory cleanup completed - archived 12 memories',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
        },
      ];

      return alerts;
    } catch (error) {
      console.error('Failed to get active alerts:', error);
      return [];
    }
  }

  // Get all monitoring data in one call
  async getMonitoringStats(): Promise<MonitoringStats> {
    try {
      const [systemHealth, employeeActivities, employeeStatus, performanceMetrics, memoryHealth, activeAlerts] = 
        await Promise.all([
          this.getSystemHealth(),
          this.getEmployeeActivity(),
          this.getEmployeeStatus(),
          this.getPerformanceMetrics(),
          this.getMemorySystemHealth(),
          this.getActiveAlerts(),
        ]);

      return {
        system_health: systemHealth,
        employee_activities: employeeActivities,
        employee_status: employeeStatus,
        performance_metrics: performanceMetrics,
        memory_health: memoryHealth,
        active_alerts: activeAlerts,
      };
    } catch (error) {
      console.error('Failed to get monitoring stats:', error);
      throw error;
    }
  }

  // WebSocket connection for real-time updates (placeholder)
  connectWebSocket(onMessage: (data: any) => void): WebSocket | null {
    try {
      // In production, this would connect to a real WebSocket endpoint
      // const ws = new WebSocket('ws://localhost:3333/ws/monitor/live-feed');
      // ws.onmessage = (event) => onMessage(JSON.parse(event.data));
      // return ws;
      
      console.log('WebSocket connection would be established here');
      return null;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      return null;
    }
  }
}

export default new MonitoringService();