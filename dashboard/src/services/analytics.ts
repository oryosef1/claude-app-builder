// Analytics service for aggregating data from multiple sources
import { memoryService } from './memory';

// TypeScript interfaces for analytics data
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

class AnalyticsService {
  private baseUrl = 'http://localhost:3333/api';

  // Performance Analytics
  async getPerformanceTrends(
    timeRange: string = '30d',
    filters?: AnalyticsFilters
  ): Promise<PerformanceMetrics[]> {
    try {
      // Generate mock performance data based on employee registry
      const employees = await this.getEmployeeList();
      const days = this.getDaysFromTimeRange(timeRange);
      const performanceData: PerformanceMetrics[] = [];

      for (let i = 0; i < days; i++) {
        const timestamp = new Date();
        timestamp.setDate(timestamp.getDate() - i);

        employees.forEach(employee => {
          // Skip if employee filter is applied and doesn't match
          if (filters?.employees && !filters.employees.includes(employee.id)) return;
          if (filters?.departments && !filters.departments.includes(employee.department)) return;

          performanceData.push({
            timestamp: timestamp.toISOString(),
            employeeId: employee.id,
            taskCompletionRate: this.generateMetric(80, 100, i),
            averageTaskDuration: this.generateMetric(60, 180, i), // minutes
            qualityScore: this.generateMetric(75, 98, i),
            collaborationScore: this.generateMetric(70, 95, i),
            innovationScore: this.generateMetric(65, 90, i),
            memoryUtilization: this.generateMetric(50, 90, i),
          });
        });
      }

      return performanceData.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    } catch (error) {
      console.error('Error fetching performance trends:', error);
      return [];
    }
  }

  // Productivity Analytics
  async getProductivityInsights(
    groupBy: 'employee' | 'department' | 'role' = 'department'
  ): Promise<ProductivityData[]> {
    try {
      const employees = await this.getEmployeeList();
      const productivityMap = new Map<string, ProductivityData>();

      employees.forEach(employee => {
        const key = groupBy === 'employee' ? employee.id : 
                   groupBy === 'department' ? employee.department : employee.role;

        if (!productivityMap.has(key)) {
          productivityMap.set(key, {
            entity: key,
            tasksCompleted: 0,
            averageCompletionTime: 0,
            efficiencyScore: 0,
            bottleneckAreas: [],
            peakProductivityHours: [9, 10, 11, 14, 15, 16], // 9am-11am, 2pm-4pm
            collaborationFrequency: 0,
            knowledgeShareRate: 0,
          });
        }

        const data = productivityMap.get(key)!;
        data.tasksCompleted += this.generateMetric(20, 50);
        data.averageCompletionTime = this.generateMetric(90, 180); // minutes
        data.efficiencyScore = this.generateMetric(70, 95);
        data.collaborationFrequency = this.generateMetric(5, 20);
        data.knowledgeShareRate = this.generateMetric(60, 90);
        
        // Add some bottleneck areas
        const bottlenecks = ['Code Review', 'Requirements Gathering', 'Testing', 'Deployment'];
        data.bottleneckAreas = bottlenecks.slice(0, Math.floor(Math.random() * 3) + 1);
      });

      return Array.from(productivityMap.values());
    } catch (error) {
      console.error('Error fetching productivity insights:', error);
      return [];
    }
  }

  // Memory Analytics
  async getMemoryAnalytics(): Promise<MemoryAnalyticsData> {
    try {
      // Try to get real memory stats, fall back to mock data
      let totalMemories = 1247;
      let searchAccuracy = 94;
      
      try {
        const memoryStats = await memoryService.getCompanyMemoryStats();
        if (memoryStats) {
          totalMemories = memoryStats.totalMemories || totalMemories;
          searchAccuracy = memoryStats.searchAccuracy || searchAccuracy;
        }
      } catch (memoryError) {
        console.warn('Memory API unavailable, using mock data');
      }

      return {
        totalMemories,
        memoryGrowthRate: this.generateMetric(10, 25), // memories/day
        averageMemorySize: this.generateMetric(2, 8), // KB
        searchAccuracy,
        contextLoadTime: this.generateMetric(150, 300), // milliseconds
        memoryDistribution: {
          experience: Math.floor(totalMemories * 0.45),
          knowledge: Math.floor(totalMemories * 0.30),
          decision: Math.floor(totalMemories * 0.20),
          interaction: Math.floor(totalMemories * 0.05),
        },
        cleanupEfficiency: this.generateMetric(85, 98),
        archivalRate: this.generateMetric(50, 120), // memories/week
      };
    } catch (error) {
      console.error('Error fetching memory analytics:', error);
      throw error;
    }
  }

  // Business Intelligence
  async getBusinessMetrics(): Promise<BusinessMetrics> {
    try {
      const employees = await this.getEmployeeList();
      const totalEmployees = employees.length;

      return {
        totalTasksCompleted: this.generateMetric(800, 1200),
        averageTaskValue: this.generateMetric(150, 500), // USD
        resourceUtilization: this.generateMetric(75, 90), // %
        capacityAvailable: this.generateMetric(100, 200), // hours/week
        costPerTask: this.generateMetric(25, 75), // USD
        roi: this.generateMetric(250, 400), // %
        efficiencyTrends: Array.from({ length: 12 }, (_, i) => this.generateMetric(70, 95)),
        bottleneckCosts: [
          { area: 'Code Review', cost: this.generateMetric(5000, 15000) },
          { area: 'Testing', cost: this.generateMetric(3000, 10000) },
          { area: 'Requirements', cost: this.generateMetric(2000, 8000) },
          { area: 'Deployment', cost: this.generateMetric(1000, 5000) },
        ],
      };
    } catch (error) {
      console.error('Error fetching business metrics:', error);
      throw error;
    }
  }

  // Predictive Analytics
  async generatePredictions(
    forecastPeriod: string = '90d'
  ): Promise<PredictionData[]> {
    try {
      const days = this.getDaysFromTimeRange(forecastPeriod);
      
      return [
        {
          metric: 'Overall Productivity',
          currentValue: 87,
          predictedValue: 91,
          confidence: 78,
          trend: 'increasing',
          factors: ['Improved workflow automation', 'Better memory utilization', 'Team collaboration'],
          recommendations: ['Continue workflow optimization', 'Increase cross-team collaboration', 'Invest in advanced tooling'],
        },
        {
          metric: 'Task Completion Rate',
          currentValue: 94,
          predictedValue: 96,
          confidence: 85,
          trend: 'increasing',
          factors: ['Process improvements', 'Employee skill development', 'Better resource allocation'],
          recommendations: ['Maintain current process improvements', 'Continue skills training', 'Monitor capacity closely'],
        },
        {
          metric: 'Memory Utilization',
          currentValue: 73,
          predictedValue: 78,
          confidence: 72,
          trend: 'increasing',
          factors: ['Growing knowledge base', 'Improved context loading', 'Better memory search'],
          recommendations: ['Optimize memory cleanup', 'Improve search algorithms', 'Consider storage scaling'],
        },
        {
          metric: 'ROI',
          currentValue: 342,
          predictedValue: 385,
          confidence: 81,
          trend: 'increasing',
          factors: ['Efficiency gains', 'Cost optimization', 'Quality improvements'],
          recommendations: ['Invest in automation', 'Expand high-value activities', 'Optimize resource allocation'],
        },
      ];
    } catch (error) {
      console.error('Error generating predictions:', error);
      return [];
    }
  }

  // Custom Reports
  async generateCustomReport(
    config: ReportConfiguration
  ): Promise<ReportData> {
    try {
      const data: any[] = [];
      
      // Collect data based on configured metrics
      for (const metric of config.metrics) {
        switch (metric) {
          case 'performance':
            data.push(await this.getPerformanceTrends(config.timeRange, config.filters));
            break;
          case 'productivity':
            data.push(await this.getProductivityInsights());
            break;
          case 'memory':
            data.push(await this.getMemoryAnalytics());
            break;
          case 'business':
            data.push(await this.getBusinessMetrics());
            break;
        }
      }

      return {
        title: config.title,
        generatedAt: new Date(),
        data,
        charts: [], // Would contain chart data for each metric
        summary: this.generateReportSummary(data),
      };
    } catch (error) {
      console.error('Error generating custom report:', error);
      throw error;
    }
  }

  // Helper methods
  private async getEmployeeList() {
    // Mock employee data - in real implementation, fetch from employee registry
    return [
      { id: 'emp_001_pm', name: 'Alex Chen', role: 'Project Manager', department: 'Executive' },
      { id: 'emp_002_tl', name: 'Taylor Kim', role: 'Technical Lead', department: 'Executive' },
      { id: 'emp_003_qd', name: 'Jordan Lee', role: 'QA Director', department: 'Executive' },
      { id: 'emp_004_sd', name: 'Sam Patel', role: 'Senior Developer', department: 'Development' },
      { id: 'emp_005_jd', name: 'Jordan Rivera', role: 'Junior Developer', department: 'Development' },
      { id: 'emp_006_qe', name: 'Morgan Davis', role: 'QA Engineer', department: 'Development' },
      { id: 'emp_007_te', name: 'Casey Wilson', role: 'Test Engineer', department: 'Development' },
      { id: 'emp_008_do', name: 'Drew Thompson', role: 'DevOps Engineer', department: 'Operations' },
      { id: 'emp_009_sre', name: 'Riley Chen', role: 'Site Reliability Engineer', department: 'Operations' },
      { id: 'emp_010_se', name: 'Avery Johnson', role: 'Security Engineer', department: 'Operations' },
      { id: 'emp_011_tw', name: 'Blake Martinez', role: 'Technical Writer', department: 'Support' },
      { id: 'emp_012_ux', name: 'Quinn Anderson', role: 'UI/UX Designer', department: 'Support' },
      { id: 'emp_013_be', name: 'Sage Thompson', role: 'Build Engineer', department: 'Support' },
    ];
  }

  private getDaysFromTimeRange(timeRange: string): number {
    switch (timeRange) {
      case '7d': return 7;
      case '30d': return 30;
      case '90d': return 90;
      case '1y': return 365;
      default: return 30;
    }
  }

  private generateMetric(min: number, max: number, dayOffset: number = 0): number {
    // Generate realistic data with some variation based on day offset
    const baseValue = min + (max - min) * Math.random();
    const trendFactor = 1 + (dayOffset * 0.002); // Slight upward trend over time
    const noise = 1 + (Math.random() - 0.5) * 0.1; // ±5% random variation
    
    return Math.round(baseValue * trendFactor * noise);
  }

  private generateReportSummary(data: any[]): string {
    return `Analytics report generated with ${data.length} data sources. Key insights: Performance trending upward, productivity at 87% efficiency, memory utilization growing steadily at 73%.`;
  }
}

// Analytics data processing utilities
export class AnalyticsProcessor {
  // Time series analysis
  static calculateTrends(data: number[]): TrendAnalysis {
    if (data.length < 2) {
      return { slope: 0, direction: 'stable', confidence: 0, r2: 0 };
    }

    const n = data.length;
    const sumX = data.reduce((sum, _, i) => sum + i, 0);
    const sumY = data.reduce((sum, val) => sum + val, 0);
    const sumXY = data.reduce((sum, val, i) => sum + i * val, 0);
    const sumXX = data.reduce((sum, _, i) => sum + i * i, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const direction = slope > 0.1 ? 'up' : slope < -0.1 ? 'down' : 'stable';
    
    // Calculate R-squared for confidence
    const meanY = sumY / n;
    const ssTotal = data.reduce((sum, val) => sum + Math.pow(val - meanY, 2), 0);
    const ssResidual = data.reduce((sum, val, i) => {
      const predicted = meanY + slope * (i - sumX / n);
      return sum + Math.pow(val - predicted, 2);
    }, 0);
    
    const r2 = ssTotal > 0 ? 1 - (ssResidual / ssTotal) : 0;
    const confidence = Math.min(r2 * 100, 95); // Cap at 95%

    return { slope, direction, confidence: Math.round(confidence), r2 };
  }

  // Performance calculations
  static calculatePerformanceScore(metrics: any): number {
    const weights = {
      taskCompletion: 0.3,
      quality: 0.25,
      efficiency: 0.2,
      collaboration: 0.15,
      innovation: 0.1,
    };

    const score = 
      (metrics.taskCompletionRate || 0) * weights.taskCompletion +
      (metrics.qualityScore || 0) * weights.quality +
      (metrics.efficiencyScore || 0) * weights.efficiency +
      (metrics.collaborationScore || 0) * weights.collaboration +
      (metrics.innovationScore || 0) * weights.innovation;

    return Math.round(Math.min(score, 100));
  }

  // Generate forecast using simple linear regression
  static generateForecast(
    historicalData: number[],
    forecastPeriod: number
  ): ForecastResult {
    if (historicalData.length < 3) {
      throw new Error('Insufficient historical data for forecasting');
    }

    const trend = this.calculateTrends(historicalData);
    const values: number[] = [];
    const confidenceUpper: number[] = [];
    const confidenceLower: number[] = [];

    const lastValue = historicalData[historicalData.length - 1];
    const dataStdDev = this.calculateStandardDeviation(historicalData);

    for (let i = 1; i <= forecastPeriod; i++) {
      const predictedValue = lastValue + (trend.slope * i);
      const confidenceInterval = dataStdDev * Math.sqrt(i) * 1.96; // 95% confidence

      values.push(Math.max(0, predictedValue));
      confidenceUpper.push(Math.max(0, predictedValue + confidenceInterval));
      confidenceLower.push(Math.max(0, predictedValue - confidenceInterval));
    }

    return { values, confidenceUpper, confidenceLower, trend };
  }

  private static calculateStandardDeviation(data: number[]): number {
    const mean = data.reduce((sum, val) => sum + val, 0) / data.length;
    const variance = data.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / data.length;
    return Math.sqrt(variance);
  }
}

export default AnalyticsService;