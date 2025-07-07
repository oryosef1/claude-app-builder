import { create } from 'zustand';
import AnalyticsService, {
  PerformanceMetrics,
  ProductivityData,
  MemoryAnalyticsData,
  BusinessMetrics,
  PredictionData,
  AnalyticsFilters,
  ReportData,
  ReportConfiguration,
} from '@/services/analytics';

// Analytics store state interface
interface AnalyticsState {
  // Data
  performanceMetrics: PerformanceMetrics[];
  productivityData: ProductivityData[];
  memoryAnalytics: MemoryAnalyticsData | null;
  businessMetrics: BusinessMetrics | null;
  predictions: PredictionData[];
  customReports: ReportData[];

  // UI State
  loading: boolean;
  error: string | null;
  activeTab: number;
  timeRange: '7d' | '30d' | '90d' | '1y';
  filters: AnalyticsFilters;
  autoRefresh: boolean;
  refreshInterval: number; // seconds

  // Actions
  setActiveTab: (tab: number) => void;
  setTimeRange: (range: '7d' | '30d' | '90d' | '1y') => void;
  setFilters: (filters: AnalyticsFilters) => void;
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshInterval: (interval: number) => void;

  // Data fetching actions
  fetchPerformanceMetrics: (filters?: AnalyticsFilters) => Promise<void>;
  fetchProductivityData: (groupBy?: 'employee' | 'department' | 'role') => Promise<void>;
  fetchMemoryAnalytics: () => Promise<void>;
  fetchBusinessMetrics: () => Promise<void>;
  fetchPredictions: (forecastPeriod?: string) => Promise<void>;
  generateCustomReport: (config: ReportConfiguration) => Promise<void>;
  refreshAllData: () => Promise<void>;

  // Computed getters
  getPerformanceTrendsByEmployee: (employeeId: string) => PerformanceMetrics[];
  getProductivityByDepartment: (department: string) => ProductivityData[];
  getDepartmentPerformance: () => { [department: string]: number };
  getTopPerformers: (limit?: number) => ProductivityData[];
  getBottleneckAreas: () => { area: string; frequency: number }[];
  getMemoryGrowthRate: () => number;
  getOverallEfficiency: () => number;
  getROITrend: () => 'up' | 'down' | 'stable';
}

// Create analytics store
const useAnalyticsStore = create<AnalyticsState>((set, get) => {
  const analyticsService = new AnalyticsService();

  return {
    // Initial state
    performanceMetrics: [],
    productivityData: [],
    memoryAnalytics: null,
    businessMetrics: null,
    predictions: [],
    customReports: [],

    // UI state
    loading: false,
    error: null,
    activeTab: 0,
    timeRange: '30d',
    filters: {},
    autoRefresh: true,
    refreshInterval: 60, // 60 seconds

    // UI actions
    setActiveTab: (tab: number) => set({ activeTab: tab }),
    
    setTimeRange: (range: '7d' | '30d' | '90d' | '1y') => {
      set({ timeRange: range });
      // Refresh performance metrics when time range changes
      get().fetchPerformanceMetrics();
    },

    setFilters: (filters: AnalyticsFilters) => {
      set({ filters });
      // Refresh data when filters change
      get().refreshAllData();
    },

    setAutoRefresh: (enabled: boolean) => set({ autoRefresh: enabled }),
    setRefreshInterval: (interval: number) => set({ refreshInterval: interval }),

    // Data fetching actions
    fetchPerformanceMetrics: async (filters?: AnalyticsFilters) => {
      try {
        set({ loading: true, error: null });
        const currentFilters = filters || get().filters;
        const timeRange = get().timeRange;
        
        const performanceMetrics = await analyticsService.getPerformanceTrends(timeRange, currentFilters);
        set({ performanceMetrics, loading: false });
      } catch (error) {
        console.error('Failed to fetch performance metrics:', error);
        set({ error: 'Failed to load performance metrics', loading: false });
      }
    },

    fetchProductivityData: async (groupBy: 'employee' | 'department' | 'role' = 'department') => {
      try {
        set({ loading: true, error: null });
        const productivityData = await analyticsService.getProductivityInsights(groupBy);
        set({ productivityData, loading: false });
      } catch (error) {
        console.error('Failed to fetch productivity data:', error);
        set({ error: 'Failed to load productivity data', loading: false });
      }
    },

    fetchMemoryAnalytics: async () => {
      try {
        set({ loading: true, error: null });
        const memoryAnalytics = await analyticsService.getMemoryAnalytics();
        set({ memoryAnalytics, loading: false });
      } catch (error) {
        console.error('Failed to fetch memory analytics:', error);
        set({ error: 'Failed to load memory analytics', loading: false });
      }
    },

    fetchBusinessMetrics: async () => {
      try {
        set({ loading: true, error: null });
        const businessMetrics = await analyticsService.getBusinessMetrics();
        set({ businessMetrics, loading: false });
      } catch (error) {
        console.error('Failed to fetch business metrics:', error);
        set({ error: 'Failed to load business metrics', loading: false });
      }
    },

    fetchPredictions: async (forecastPeriod: string = '90d') => {
      try {
        set({ loading: true, error: null });
        const predictions = await analyticsService.generatePredictions(forecastPeriod);
        set({ predictions, loading: false });
      } catch (error) {
        console.error('Failed to fetch predictions:', error);
        set({ error: 'Failed to load predictions', loading: false });
      }
    },

    generateCustomReport: async (config: ReportConfiguration) => {
      try {
        set({ loading: true, error: null });
        const report = await analyticsService.generateCustomReport(config);
        const customReports = [...get().customReports, report];
        set({ customReports, loading: false });
      } catch (error) {
        console.error('Failed to generate custom report:', error);
        set({ error: 'Failed to generate report', loading: false });
      }
    },

    refreshAllData: async () => {
      const { fetchPerformanceMetrics, fetchProductivityData, fetchMemoryAnalytics, fetchBusinessMetrics, fetchPredictions } = get();
      
      try {
        set({ loading: true, error: null });
        
        // Fetch all data in parallel
        await Promise.all([
          fetchPerformanceMetrics(),
          fetchProductivityData(),
          fetchMemoryAnalytics(),
          fetchBusinessMetrics(),
          fetchPredictions(),
        ]);
        
        set({ loading: false });
      } catch (error) {
        console.error('Failed to refresh analytics data:', error);
        set({ error: 'Failed to refresh data', loading: false });
      }
    },

    // Computed getters
    getPerformanceTrendsByEmployee: (employeeId: string) => {
      return get().performanceMetrics.filter(metric => metric.employeeId === employeeId);
    },

    getProductivityByDepartment: (department: string) => {
      return get().productivityData.filter(data => data.entity === department);
    },

    getDepartmentPerformance: () => {
      const performanceMetrics = get().performanceMetrics;
      const departmentPerformance: { [department: string]: number } = {};
      
      // Group by department and calculate average performance
      const departments = ['Executive', 'Development', 'Operations', 'Support'];
      
      departments.forEach(dept => {
        const deptEmployees = [
          'emp_001_pm', 'emp_002_tl', 'emp_003_qd', // Executive
          'emp_004_sd', 'emp_005_jd', 'emp_006_qe', 'emp_007_te', // Development
          'emp_008_do', 'emp_009_sre', 'emp_010_se', // Operations
          'emp_011_tw', 'emp_012_ux', 'emp_013_be', // Support
        ];
        
        const deptStartIndex = departments.indexOf(dept) * (dept === 'Development' ? 4 : 3);
        const deptEndIndex = deptStartIndex + (dept === 'Development' ? 4 : 3);
        const deptEmpIds = deptEmployees.slice(deptStartIndex, deptEndIndex);
        
        const deptMetrics = performanceMetrics.filter(metric => 
          deptEmpIds.includes(metric.employeeId)
        );
        
        if (deptMetrics.length > 0) {
          const avgPerformance = deptMetrics.reduce((sum, metric) => 
            sum + (metric.taskCompletionRate + metric.qualityScore + metric.collaborationScore) / 3, 0
          ) / deptMetrics.length;
          
          departmentPerformance[dept] = Math.round(avgPerformance);
        } else {
          departmentPerformance[dept] = 0;
        }
      });
      
      return departmentPerformance;
    },

    getTopPerformers: (limit: number = 5) => {
      const productivityData = get().productivityData;
      return productivityData
        .sort((a, b) => b.efficiencyScore - a.efficiencyScore)
        .slice(0, limit);
    },

    getBottleneckAreas: () => {
      const productivityData = get().productivityData;
      const bottleneckCount: { [area: string]: number } = {};
      
      productivityData.forEach(data => {
        data.bottleneckAreas.forEach(area => {
          bottleneckCount[area] = (bottleneckCount[area] || 0) + 1;
        });
      });
      
      return Object.entries(bottleneckCount)
        .map(([area, frequency]) => ({ area, frequency }))
        .sort((a, b) => b.frequency - a.frequency);
    },

    getMemoryGrowthRate: () => {
      const memoryAnalytics = get().memoryAnalytics;
      return memoryAnalytics?.memoryGrowthRate || 0;
    },

    getOverallEfficiency: () => {
      const productivityData = get().productivityData;
      if (productivityData.length === 0) return 0;
      
      const totalEfficiency = productivityData.reduce((sum, data) => sum + data.efficiencyScore, 0);
      return Math.round(totalEfficiency / productivityData.length);
    },

    getROITrend: () => {
      const businessMetrics = get().businessMetrics;
      if (!businessMetrics || businessMetrics.efficiencyTrends.length < 2) return 'stable';
      
      const trends = businessMetrics.efficiencyTrends;
      const recent = trends.slice(-3);
      const earlier = trends.slice(-6, -3);
      
      const recentAvg = recent.reduce((sum, val) => sum + val, 0) / recent.length;
      const earlierAvg = earlier.reduce((sum, val) => sum + val, 0) / earlier.length;
      
      const difference = recentAvg - earlierAvg;
      return difference > 2 ? 'up' : difference < -2 ? 'down' : 'stable';
    },
  };
});

// Auto-refresh hook for analytics data (commented out - would need React import)
// export const useAnalyticsAutoRefresh = () => {
//   const { autoRefresh, refreshInterval, refreshAllData } = useAnalyticsStore();

//   React.useEffect(() => {
//     if (!autoRefresh) return;

//     const interval = setInterval(() => {
//       refreshAllData();
//     }, refreshInterval * 1000);

//     return () => clearInterval(interval);
//   }, [autoRefresh, refreshInterval, refreshAllData]);
// };

export default useAnalyticsStore;