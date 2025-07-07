// TypeScript type definitions for analytics dashboard

export interface AnalyticsFilters {
  timeRange?: '7d' | '30d' | '90d' | '1y';
  employees?: string[];
  departments?: string[];
  roles?: string[];
}

export interface ChartDataPoint {
  timestamp: string;
  [key: string]: any;
}

export interface MetricCard {
  title: string;
  value: string | number;
  trend: string;
  color: 'primary' | 'success' | 'warning' | 'error' | 'info';
  icon?: React.ReactNode;
}

export interface ChartProps {
  data: ChartDataPoint[];
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  interactive?: boolean;
}

export interface TimeRange {
  start: Date;
  end: Date;
  label: string;
}

export interface ExportOptions {
  format: 'pdf' | 'excel' | 'csv' | 'png';
  includeCharts?: boolean;
  includeData?: boolean;
  filename?: string;
}

export interface AnalyticsTab {
  id: string;
  label: string;
  icon: React.ReactNode;
  component: React.ComponentType<any>;
}

export interface PerformanceMetrics {
  timestamp: string;
  employeeId: string;
  taskCompletionRate: number; // 0-100%
  averageTaskDuration: number; // minutes
  qualityScore: number; // 0-100
  collaborationScore: number; // 0-100
  innovationScore: number; // 0-100
  memoryUtilization: number; // 0-100%
}

export interface ProductivityData {
  entity: string; // Employee ID, department, or role
  tasksCompleted: number;
  averageCompletionTime: number;
  efficiencyScore: number; // tasks/hour
  bottleneckAreas: string[];
  peakProductivityHours: number[];
  collaborationFrequency: number;
  knowledgeShareRate: number;
}

export interface MemoryAnalyticsData {
  totalMemories: number;
  memoryGrowthRate: number; // memories/day
  averageMemorySize: number; // KB
  searchAccuracy: number; // 0-100%
  contextLoadTime: number; // milliseconds
  memoryDistribution: {
    experience: number;
    knowledge: number;
    decision: number;
    interaction: number;
  };
  cleanupEfficiency: number; // 0-100%
  archivalRate: number; // memories/week
}

export interface BusinessMetrics {
  totalTasksCompleted: number;
  averageTaskValue: number; // estimated business value
  resourceUtilization: number; // 0-100%
  capacityAvailable: number; // hours/week
  costPerTask: number; // resource cost
  roi: number; // return on investment %
  efficiencyTrends: number[]; // weekly efficiency scores
  bottleneckCosts: { area: string; cost: number }[];
}

export interface PredictionData {
  metric: string;
  currentValue: number;
  predictedValue: number;
  confidence: number; // 0-100%
  trend: 'increasing' | 'decreasing' | 'stable';
  factors: string[]; // influencing factors
  recommendations: string[];
}

export interface TrendAnalysis {
  slope: number;
  direction: 'up' | 'down' | 'stable';
  confidence: number;
  r2: number; // correlation coefficient
}

export interface ForecastResult {
  values: number[];
  confidenceUpper: number[];
  confidenceLower: number[];
  trend: TrendAnalysis;
}

export interface ReportConfiguration {
  title: string;
  metrics: string[];
  filters: AnalyticsFilters;
  chartTypes: string[];
  timeRange: string;
}

export interface ReportData {
  title: string;
  generatedAt: Date;
  data: any[];
  charts: ChartDataPoint[][];
  summary: string;
}

// Department and employee type definitions
export interface Employee {
  id: string;
  name: string;
  role: string;
  department: 'Executive' | 'Development' | 'Operations' | 'Support';
  status: 'active' | 'busy' | 'offline';
  workload: number;
  performance: number;
  lastActivity: Date;
}

export interface Department {
  name: string;
  employees: Employee[];
  utilization: number;
  performance: number;
  color: string;
}

// Chart-specific type definitions
export interface LineChartData extends ChartDataPoint {
  value: number;
  trend?: number;
}

export interface BarChartData extends ChartDataPoint {
  category: string;
  value: number;
  comparison?: number;
}

export interface PieChartData {
  name: string;
  value: number;
  percentage: number;
  color: string;
}

export interface AreaChartData extends ChartDataPoint {
  value: number;
  upperBound?: number;
  lowerBound?: number;
}

// Analytics component props
export interface PerformanceTrendsProps {
  timeRange?: '7d' | '30d' | '90d' | '1y';
  employees?: string[];
  departments?: string[];
  showComparisons?: boolean;
}

export interface ProductivityInsightsProps {
  groupBy: 'employee' | 'department' | 'role';
  showEfficiencyMetrics?: boolean;
  showBottlenecks?: boolean;
}

export interface MemoryAnalyticsProps {
  showGrowthTrends?: boolean;
  showUtilization?: boolean;
  showSearchAccuracy?: boolean;
}

export interface BusinessIntelligenceProps {
  showROI?: boolean;
  showResourceOptimization?: boolean;
  showCapacityPlanning?: boolean;
}

export interface PredictiveAnalyticsProps {
  forecastPeriod: '30d' | '90d' | '6m' | '1y';
  showConfidenceIntervals?: boolean;
}

export interface CustomReportsProps {
  onReportGenerate?: (config: ReportConfiguration) => void;
  onReportExport?: (report: ReportData, options: ExportOptions) => void;
}

// Utility types for analytics calculations
export interface StatisticalData {
  mean: number;
  median: number;
  standardDeviation: number;
  variance: number;
  min: number;
  max: number;
  percentiles: { [key: number]: number };
}

export interface CorrelationMatrix {
  [metric1: string]: {
    [metric2: string]: number;
  };
}

export interface AnomalyDetection {
  dataPoint: ChartDataPoint;
  anomalyScore: number;
  isAnomaly: boolean;
  explanation: string;
}

export interface BenchmarkData {
  metric: string;
  currentValue: number;
  benchmarkValue: number;
  industryAverage: number;
  percentile: number;
  status: 'above' | 'below' | 'at' | 'unknown';
}

// API response types
export interface AnalyticsApiResponse<T> {
  data: T;
  success: boolean;
  message?: string;
  timestamp: string;
  cached?: boolean;
  cacheExpiresAt?: string;
}

export interface AnalyticsError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

// Store types
export interface AnalyticsStoreState {
  performanceMetrics: PerformanceMetrics[];
  productivityData: ProductivityData[];
  memoryAnalytics: MemoryAnalyticsData | null;
  businessMetrics: BusinessMetrics | null;
  predictions: PredictionData[];
  customReports: ReportData[];
  loading: boolean;
  error: string | null;
  activeTab: number;
  timeRange: '7d' | '30d' | '90d' | '1y';
  filters: AnalyticsFilters;
  autoRefresh: boolean;
  refreshInterval: number;
}

export interface AnalyticsStoreActions {
  setActiveTab: (tab: number) => void;
  setTimeRange: (range: '7d' | '30d' | '90d' | '1y') => void;
  setFilters: (filters: AnalyticsFilters) => void;
  setAutoRefresh: (enabled: boolean) => void;
  setRefreshInterval: (interval: number) => void;
  fetchPerformanceMetrics: (filters?: AnalyticsFilters) => Promise<void>;
  fetchProductivityData: (groupBy?: 'employee' | 'department' | 'role') => Promise<void>;
  fetchMemoryAnalytics: () => Promise<void>;
  fetchBusinessMetrics: () => Promise<void>;
  fetchPredictions: (forecastPeriod?: string) => Promise<void>;
  generateCustomReport: (config: ReportConfiguration) => Promise<void>;
  refreshAllData: () => Promise<void>;
}

// Export all types
export type {
  AnalyticsFilters,
  ChartDataPoint,
  MetricCard,
  ChartProps,
  TimeRange,
  ExportOptions,
  AnalyticsTab,
  Employee,
  Department,
  LineChartData,
  BarChartData,
  PieChartData,
  AreaChartData,
  StatisticalData,
  CorrelationMatrix,
  AnomalyDetection,
  BenchmarkData,
  AnalyticsApiResponse,
  AnalyticsError,
  AnalyticsStoreState,
  AnalyticsStoreActions,
};