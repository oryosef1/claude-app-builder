import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import monitoringService, { 
  SystemHealthStatus, 
  EmployeeActivity, 
  EmployeeStatusLive, 
  PerformanceMetrics, 
  MemorySystemHealth, 
  SystemAlert,
  MonitoringStats
} from '@/services/monitoring';

interface MonitoringState {
  // Data state
  systemHealth: SystemHealthStatus | null;
  employeeActivities: EmployeeActivity[];
  employeeStatus: EmployeeStatusLive[];
  performanceMetrics: PerformanceMetrics | null;
  memoryHealth: MemorySystemHealth | null;
  activeAlerts: SystemAlert[];
  
  // UI state
  isLoading: boolean;
  lastUpdated: string | null;
  autoRefresh: boolean;
  refreshInterval: number; // in seconds
  
  // Error state
  error: string | null;
  
  // WebSocket state
  websocketConnected: boolean;
  
  // Actions
  fetchAllData: () => Promise<void>;
  fetchSystemHealth: () => Promise<void>;
  fetchEmployeeActivity: () => Promise<void>;
  fetchEmployeeStatus: () => Promise<void>;
  fetchPerformanceMetrics: () => Promise<void>;
  fetchMemoryHealth: () => Promise<void>;
  fetchActiveAlerts: () => Promise<void>;
  
  // Real-time updates
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshInterval: (seconds: number) => void;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
  
  // Alert actions
  resolveAlert: (alertId: string) => void;
  dismissAlert: (alertId: string) => void;
  
  // Utility actions
  clearError: () => void;
  reset: () => void;
}

// Computed getters for derived state
interface MonitoringGetters {
  // System status
  isSystemHealthy: () => boolean;
  criticalAlerts: () => SystemAlert[];
  recentActivities: () => EmployeeActivity[];
  
  // Employee analytics
  employeesByDepartment: () => Record<string, EmployeeStatusLive[]>;
  averageResponseTime: () => number;
  totalActiveEmployees: () => number;
  overloadedEmployees: () => EmployeeStatusLive[];
  
  // Performance analytics
  latestCpuUsage: () => number;
  latestMemoryUsage: () => number;
  performanceTrend: () => 'improving' | 'degrading' | 'stable';
  
  // Memory analytics
  memoryUsagePercent: () => number;
  memoryGrowthRate: () => number;
}

const initialState = {
  systemHealth: null,
  employeeActivities: [],
  employeeStatus: [],
  performanceMetrics: null,
  memoryHealth: null,
  activeAlerts: [],
  isLoading: false,
  lastUpdated: null,
  autoRefresh: true,
  refreshInterval: 30, // 30 seconds default
  error: null,
  websocketConnected: false,
};

export const useMonitoringStore = create<MonitoringState & MonitoringGetters>()(
  devtools(
    (set, get) => ({
      // Initial state
      ...initialState,
      
      // Actions
      fetchAllData: async () => {
        const state = get();
        if (state.isLoading) return;
        
        set({ isLoading: true, error: null });
        
        try {
          const data = await monitoringService.getMonitoringStats();
          
          set({
            systemHealth: data.system_health,
            employeeActivities: data.employee_activities,
            employeeStatus: data.employee_status,
            performanceMetrics: data.performance_metrics,
            memoryHealth: data.memory_health,
            activeAlerts: data.active_alerts,
            lastUpdated: new Date().toISOString(),
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Failed to fetch monitoring data',
            isLoading: false,
          });
        }
      },
      
      fetchSystemHealth: async () => {
        try {
          const systemHealth = await monitoringService.getSystemHealth();
          set({ systemHealth });
        } catch (error) {
          console.error('Failed to fetch system health:', error);
        }
      },
      
      fetchEmployeeActivity: async () => {
        try {
          const activities = await monitoringService.getEmployeeActivity();
          set({ employeeActivities: activities });
        } catch (error) {
          console.error('Failed to fetch employee activity:', error);
        }
      },
      
      fetchEmployeeStatus: async () => {
        try {
          const status = await monitoringService.getEmployeeStatus();
          set({ employeeStatus: status });
        } catch (error) {
          console.error('Failed to fetch employee status:', error);
        }
      },
      
      fetchPerformanceMetrics: async () => {
        try {
          const metrics = await monitoringService.getPerformanceMetrics();
          set({ performanceMetrics: metrics });
        } catch (error) {
          console.error('Failed to fetch performance metrics:', error);
        }
      },
      
      fetchMemoryHealth: async () => {
        try {
          const memoryHealth = await monitoringService.getMemorySystemHealth();
          set({ memoryHealth });
        } catch (error) {
          console.error('Failed to fetch memory health:', error);
        }
      },
      
      fetchActiveAlerts: async () => {
        try {
          const alerts = await monitoringService.getActiveAlerts();
          set({ activeAlerts: alerts });
        } catch (error) {
          console.error('Failed to fetch active alerts:', error);
        }
      },
      
      // Real-time controls
      setAutoRefresh: (enabled: boolean) => {
        set({ autoRefresh: enabled });
      },
      
      setRefreshInterval: (seconds: number) => {
        set({ refreshInterval: seconds });
      },
      
      connectWebSocket: () => {
        const ws = monitoringService.connectWebSocket((data) => {
          // Handle real-time updates
          if (data.type === 'employee_activity') {
            const activities = get().employeeActivities;
            set({ employeeActivities: [data.activity, ...activities.slice(0, 19)] });
          } else if (data.type === 'system_health') {
            set({ systemHealth: data.health });
          } else if (data.type === 'alert') {
            const alerts = get().activeAlerts;
            set({ activeAlerts: [data.alert, ...alerts] });
          }
        });
        
        if (ws) {
          set({ websocketConnected: true });
        }
      },
      
      disconnectWebSocket: () => {
        set({ websocketConnected: false });
      },
      
      // Alert actions
      resolveAlert: (alertId: string) => {
        const alerts = get().activeAlerts;
        const updatedAlerts = alerts.map(alert => 
          alert.id === alertId 
            ? { ...alert, type: 'resolved' as const, resolved: true, resolved_at: new Date().toISOString() }
            : alert
        );
        set({ activeAlerts: updatedAlerts });
      },
      
      dismissAlert: (alertId: string) => {
        const alerts = get().activeAlerts;
        const updatedAlerts = alerts.filter(alert => alert.id !== alertId);
        set({ activeAlerts: updatedAlerts });
      },
      
      // Utility actions
      clearError: () => set({ error: null }),
      
      reset: () => set(initialState),
      
      // Computed getters
      isSystemHealthy: () => {
        const health = get().systemHealth;
        if (!health) return false;
        
        const infraOnline = Object.values(health.infrastructure).every(status => status === 'online');
        const performanceGood = health.performance.cpu_usage < 80 && health.performance.ram_usage < 90;
        const responseTimesGood = health.response_times.api < 500;
        
        return infraOnline && performanceGood && responseTimesGood;
      },
      
      criticalAlerts: () => {
        const alerts = get().activeAlerts;
        return alerts.filter(alert => alert.severity === 'critical' || alert.severity === 'high');
      },
      
      recentActivities: () => {
        const activities = get().employeeActivities;
        return activities.slice(0, 10);
      },
      
      employeesByDepartment: () => {
        const employees = get().employeeStatus;
        const departments: Record<string, EmployeeStatusLive[]> = {};
        
        employees.forEach(emp => {
          if (!departments[emp.department]) {
            departments[emp.department] = [];
          }
          departments[emp.department].push(emp);
        });
        
        return departments;
      },
      
      averageResponseTime: () => {
        const employees = get().employeeStatus;
        const responseTimes = employees
          .filter(emp => emp.response_time)
          .map(emp => emp.response_time!);
        
        if (responseTimes.length === 0) return 0;
        return Math.round(responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length);
      },
      
      totalActiveEmployees: () => {
        const employees = get().employeeStatus;
        return employees.filter(emp => emp.status === 'active' || emp.status === 'busy').length;
      },
      
      overloadedEmployees: () => {
        const employees = get().employeeStatus;
        return employees.filter(emp => emp.workload >= 4);
      },
      
      latestCpuUsage: () => {
        const metrics = get().performanceMetrics;
        if (!metrics || metrics.cpu_usage.length === 0) return 0;
        return Math.round(metrics.cpu_usage[metrics.cpu_usage.length - 1]);
      },
      
      latestMemoryUsage: () => {
        const metrics = get().performanceMetrics;
        if (!metrics || metrics.memory_usage.length === 0) return 0;
        return Math.round(metrics.memory_usage[metrics.memory_usage.length - 1]);
      },
      
      performanceTrend: () => {
        const metrics = get().performanceMetrics;
        if (!metrics || metrics.cpu_usage.length < 2) return 'stable';
        
        const recent = metrics.cpu_usage.slice(-3);
        const trend = recent[recent.length - 1] - recent[0];
        
        if (trend > 10) return 'degrading';
        if (trend < -10) return 'improving';
        return 'stable';
      },
      
      memoryUsagePercent: () => {
        const memoryHealth = get().memoryHealth;
        return memoryHealth?.storage.usage_percent || 0;
      },
      
      memoryGrowthRate: () => {
        const memoryHealth = get().memoryHealth;
        return memoryHealth?.storage.growth_memories_per_day || 0;
      },
    }),
    { name: 'monitoring-store' }
  )
);

// Auto-refresh hook for real-time updates
export const useAutoRefresh = () => {
  const { autoRefresh, refreshInterval, fetchAllData } = useMonitoringStore();
  
  React.useEffect(() => {
    if (!autoRefresh) return;
    
    // Initial fetch
    fetchAllData();
    
    // Set up interval
    const interval = setInterval(fetchAllData, refreshInterval * 1000);
    
    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchAllData]);
};

// Make React available for the hook
import React from 'react';

export default useMonitoringStore;