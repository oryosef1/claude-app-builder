import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Tabs,
  Tab,
  FormControl,
  Select,
  MenuItem,
  InputLabel,
  Switch,
  FormControlLabel,
  Chip,
  LinearProgress,
  Alert,
  IconButton,
  Divider,
  Paper,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  Analytics as AnalyticsIcon,
  Refresh,
  Download,
  Timeline,
  Speed,
  Memory,
  Business,
  PsychologyAlt,
  Assessment,
  ShowChart,
  PieChart,
  BarChart,
  TrendingFlat,
  CheckCircle,
  Warning,
  Error,
} from '@mui/icons-material';
import useAnalyticsStore from '@/stores/analyticsStore';
import type { MetricCard } from '@/types/analytics';

// Tab Panel Component
interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`analytics-tabpanel-${index}`}
    aria-labelledby={`analytics-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
  </div>
);

// Metric Card Component
const AnalyticsMetricCard: React.FC<MetricCard> = ({ title, value, trend, color, icon }) => {
  const getTrendIcon = () => {
    if (trend.includes('+')) return <TrendingUp fontSize="small" />;
    if (trend.includes('-')) return <TrendingDown fontSize="small" />;
    return <TrendingFlat fontSize="small" />;
  };

  const getTrendColor = () => {
    if (trend.includes('+')) return 'success.main';
    if (trend.includes('-')) return 'error.main';
    return 'text.secondary';
  };

  return (
    <Card elevation={2}>
      <CardContent>
        <Box display="flex" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h3" fontWeight="bold" color={`${color}.main`}>
              {value}
            </Typography>
            <Typography variant="body2" color="textSecondary" gutterBottom>
              {title}
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              {getTrendIcon()}
              <Typography variant="caption" color={getTrendColor()}>
                {trend}
              </Typography>
            </Box>
          </Box>
          {icon && (
            <Avatar sx={{ bgcolor: `${color}.main`, width: 56, height: 56 }}>
              {icon}
            </Avatar>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

// Simple Chart Component (placeholder for recharts)
const SimpleLineChart: React.FC<{ data: any[]; title: string; height?: number }> = ({ title, height = 200 }) => (
  <Card elevation={1}>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box 
        sx={{ 
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.50',
          borderRadius: 1,
        }}
      >
        <ShowChart sx={{ fontSize: 48, color: 'grey.400' }} />
        <Typography variant="body2" color="textSecondary" sx={{ ml: 2 }}>
          Chart visualization would appear here
        </Typography>
      </Box>
    </CardContent>
  </Card>
);

const SimpleBarChart: React.FC<{ data: any[]; title: string; height?: number }> = ({ title, height = 200 }) => (
  <Card elevation={1}>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box 
        sx={{ 
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.50',
          borderRadius: 1,
        }}
      >
        <BarChart sx={{ fontSize: 48, color: 'grey.400' }} />
        <Typography variant="body2" color="textSecondary" sx={{ ml: 2 }}>
          Bar chart visualization would appear here
        </Typography>
      </Box>
    </CardContent>
  </Card>
);

const SimplePieChart: React.FC<{ data: any[]; title: string; height?: number }> = ({ title, height = 200 }) => (
  <Card elevation={1}>
    <CardContent>
      <Typography variant="h6" gutterBottom>
        {title}
      </Typography>
      <Box 
        sx={{ 
          height,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'grey.50',
          borderRadius: 1,
        }}
      >
        <PieChart sx={{ fontSize: 48, color: 'grey.400' }} />
        <Typography variant="body2" color="textSecondary" sx={{ ml: 2 }}>
          Pie chart visualization would appear here
        </Typography>
      </Box>
    </CardContent>
  </Card>
);

// Performance Trends Component
const PerformanceTrends: React.FC = () => {
  const { performanceMetrics, fetchPerformanceMetrics, timeRange } = useAnalyticsStore();

  useEffect(() => {
    fetchPerformanceMetrics();
  }, [fetchPerformanceMetrics, timeRange]);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <SimpleLineChart data={performanceMetrics} title="Employee Performance Over Time" height={300} />
      </Grid>
      <Grid item xs={12} md={6}>
        <SimpleLineChart data={performanceMetrics} title="Task Completion Rate" />
      </Grid>
      <Grid item xs={12} md={6}>
        <SimpleLineChart data={performanceMetrics} title="Quality Score Trends" />
      </Grid>
      <Grid item xs={12} md={6}>
        <SimpleBarChart data={performanceMetrics} title="Collaboration Score by Department" />
      </Grid>
      <Grid item xs={12} md={6}>
        <SimpleBarChart data={performanceMetrics} title="Memory Utilization" />
      </Grid>
    </Grid>
  );
};

// Productivity Insights Component
const ProductivityInsights: React.FC = () => {
  const { productivityData, fetchProductivityData } = useAnalyticsStore();

  useEffect(() => {
    fetchProductivityData('department');
  }, [fetchProductivityData]);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}>
        <SimpleBarChart data={productivityData} title="Productivity by Department" height={300} />
      </Grid>
      <Grid item xs={12} md={4}>
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Top Performers
            </Typography>
            <List>
              {productivityData.slice(0, 5).map((item, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <Avatar sx={{ bgcolor: 'primary.main', width: 32, height: 32 }}>
                      {index + 1}
                    </Avatar>
                  </ListItemIcon>
                  <ListItemText
                    primary={item.entity}
                    secondary={`${item.efficiencyScore}% efficiency`}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <SimpleLineChart data={productivityData} title="Tasks Completed Trends" />
      </Grid>
      <Grid item xs={12} md={6}>
        <SimpleBarChart data={productivityData} title="Average Completion Time" />
      </Grid>
    </Grid>
  );
};

// Memory Analytics Component
const MemoryAnalyticsComponent: React.FC = () => {
  const { memoryAnalytics, fetchMemoryAnalytics } = useAnalyticsStore();

  useEffect(() => {
    fetchMemoryAnalytics();
  }, [fetchMemoryAnalytics]);

  if (!memoryAnalytics) {
    return <LinearProgress />;
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={3}>
        <AnalyticsMetricCard
          title="Total Memories"
          value={memoryAnalytics.totalMemories.toLocaleString()}
          trend="+15/day"
          color="primary"
          icon={<Memory />}
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <AnalyticsMetricCard
          title="Search Accuracy"
          value={`${memoryAnalytics.searchAccuracy}%`}
          trend="+2.1%"
          color="success"
          icon={<CheckCircle />}
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <AnalyticsMetricCard
          title="Context Load Time"
          value={`${memoryAnalytics.contextLoadTime}ms`}
          trend="-23ms"
          color="info"
          icon={<Speed />}
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <AnalyticsMetricCard
          title="Cleanup Efficiency"
          value={`${memoryAnalytics.cleanupEfficiency}%`}
          trend="+1.2%"
          color="success"
          icon={<CheckCircle />}
        />
      </Grid>
      <Grid item xs={12} md={8}>
        <SimpleLineChart data={[]} title="Memory Growth Over Time" height={300} />
      </Grid>
      <Grid item xs={12} md={4}>
        <SimplePieChart data={[]} title="Memory Type Distribution" height={300} />
      </Grid>
      <Grid item xs={12} md={6}>
        <SimpleBarChart data={[]} title="Memory Usage by Employee" />
      </Grid>
      <Grid item xs={12} md={6}>
        <SimpleLineChart data={[]} title="Search Accuracy Trends" />
      </Grid>
    </Grid>
  );
};

// Business Intelligence Component
const BusinessIntelligence: React.FC = () => {
  const { businessMetrics, fetchBusinessMetrics } = useAnalyticsStore();

  useEffect(() => {
    fetchBusinessMetrics();
  }, [fetchBusinessMetrics]);

  if (!businessMetrics) {
    return <LinearProgress />;
  }

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={3}>
        <AnalyticsMetricCard
          title="Total Tasks"
          value={businessMetrics.totalTasksCompleted.toLocaleString()}
          trend="+247"
          color="primary"
          icon={<Assessment />}
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <AnalyticsMetricCard
          title="Resource Utilization"
          value={`${businessMetrics.resourceUtilization}%`}
          trend="+5.2%"
          color="success"
          icon={<Speed />}
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <AnalyticsMetricCard
          title="ROI"
          value={`${businessMetrics.roi}%`}
          trend="+18%"
          color="success"
          icon={<TrendingUp />}
        />
      </Grid>
      <Grid item xs={12} md={3}>
        <AnalyticsMetricCard
          title="Cost per Task"
          value={`$${businessMetrics.costPerTask}`}
          trend="-$5"
          color="success"
          icon={<Business />}
        />
      </Grid>
      <Grid item xs={12} md={8}>
        <SimpleLineChart data={businessMetrics.efficiencyTrends} title="Efficiency Trends (12 weeks)" height={300} />
      </Grid>
      <Grid item xs={12} md={4}>
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Bottleneck Costs
            </Typography>
            <List>
              {businessMetrics.bottleneckCosts.map((item, index) => (
                <ListItem key={index}>
                  <ListItemIcon>
                    <Warning color="warning" />
                  </ListItemIcon>
                  <ListItemText
                    primary={item.area}
                    secondary={`$${item.cost.toLocaleString()}`}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} md={6}>
        <SimpleBarChart data={[]} title="Value by Department" />
      </Grid>
      <Grid item xs={12} md={6}>
        <SimpleLineChart data={[]} title="Capacity Utilization" />
      </Grid>
    </Grid>
  );
};

// Predictive Analytics Component
const PredictiveAnalytics: React.FC = () => {
  const { predictions, fetchPredictions } = useAnalyticsStore();

  useEffect(() => {
    fetchPredictions('90d');
  }, [fetchPredictions]);

  return (
    <Grid container spacing={3}>
      {predictions.map((prediction, index) => (
        <Grid item xs={12} md={6} key={index}>
          <Card elevation={2}>
            <CardContent>
              <Box display="flex" justifyContent="between" alignItems="center" mb={2}>
                <Typography variant="h6">
                  {prediction.metric}
                </Typography>
                <Chip 
                  label={`${prediction.confidence}% confidence`}
                  color={prediction.confidence > 80 ? 'success' : prediction.confidence > 60 ? 'warning' : 'error'}
                  size="small"
                />
              </Box>
              
              <Box display="flex" alignItems="center" gap={2} mb={2}>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Current
                  </Typography>
                  <Typography variant="h4" fontWeight="bold">
                    {prediction.currentValue}
                  </Typography>
                </Box>
                <Box>
                  {prediction.trend === 'increasing' ? <TrendingUp color="success" /> :
                   prediction.trend === 'decreasing' ? <TrendingDown color="error" /> :
                   <TrendingFlat color="action" />}
                </Box>
                <Box>
                  <Typography variant="caption" color="textSecondary">
                    Predicted
                  </Typography>
                  <Typography variant="h4" fontWeight="bold" color={
                    prediction.trend === 'increasing' ? 'success.main' :
                    prediction.trend === 'decreasing' ? 'error.main' : 'text.primary'
                  }>
                    {prediction.predictedValue}
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Key Factors:
              </Typography>
              <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                {prediction.factors.map((factor, idx) => (
                  <Chip key={idx} label={factor} size="small" variant="outlined" />
                ))}
              </Box>

              <Typography variant="subtitle2" gutterBottom>
                Recommendations:
              </Typography>
              <List dense>
                {prediction.recommendations.map((rec, idx) => (
                  <ListItem key={idx} sx={{ py: 0.5 }}>
                    <ListItemIcon sx={{ minWidth: 24 }}>
                      <CheckCircle fontSize="small" color="primary" />
                    </ListItemIcon>
                    <ListItemText 
                      primary={rec}
                      primaryTypographyProps={{ variant: 'body2' }}
                    />
                  </ListItem>
                ))}
              </List>
            </CardContent>
          </Card>
        </Grid>
      ))}
      
      <Grid item xs={12}>
        <SimpleLineChart data={[]} title="Forecast Trends with Confidence Intervals" height={300} />
      </Grid>
    </Grid>
  );
};

// Custom Reports Component
const CustomReports: React.FC = () => {
  const { customReports } = useAnalyticsStore();

  return (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Alert severity="info">
          Custom report generation feature coming soon. This will allow you to create custom analytics reports with selected metrics, time ranges, and export options.
        </Alert>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Quick Reports
            </Typography>
            <Box display="flex" flexDirection="column" gap={2}>
              <Button variant="outlined" startIcon={<Assessment />}>
                Employee Performance Report
              </Button>
              <Button variant="outlined" startIcon={<Timeline />}>
                Department Productivity Report
              </Button>
              <Button variant="outlined" startIcon={<Memory />}>
                Memory Utilization Report
              </Button>
              <Button variant="outlined" startIcon={<Business />}>
                Business Intelligence Report
              </Button>
            </Box>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card elevation={2}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Recent Reports
            </Typography>
            {customReports.length === 0 ? (
              <Typography variant="body2" color="textSecondary">
                No custom reports generated yet.
              </Typography>
            ) : (
              <List>
                {customReports.map((report, index) => (
                  <ListItem key={index}>
                    <ListItemText
                      primary={report.title}
                      secondary={`Generated: ${report.generatedAt.toLocaleDateString()}`}
                    />
                    <IconButton>
                      <Download />
                    </IconButton>
                  </ListItem>
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

// Main Analytics Component
const Analytics: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    timeRange,
    setTimeRange,
    autoRefresh,
    setAutoRefresh,
    refreshAllData,
    loading,
    error,
    memoryAnalytics,
    businessMetrics,
    getOverallEfficiency,
    getROITrend,
  } = useAnalyticsStore();

  useEffect(() => {
    refreshAllData();
  }, [refreshAllData]);

  const keyMetrics: MetricCard[] = [
    {
      title: 'Overall Productivity',
      value: `${getOverallEfficiency()}%`,
      trend: '+5.2%',
      color: 'success',
      icon: <Speed />,
    },
    {
      title: 'Average Task Time',
      value: '2.3h',
      trend: '-12min',
      color: 'success',
      icon: <Timeline />,
    },
    {
      title: 'Memory Utilization',
      value: memoryAnalytics ? `${Math.round((memoryAnalytics.totalMemories / 2000) * 100)}%` : '73%',
      trend: '+2.1%',
      color: 'info',
      icon: <Memory />,
    },
    {
      title: 'ROI',
      value: businessMetrics ? `${businessMetrics.roi}%` : '342%',
      trend: getROITrend() === 'up' ? '+18%' : getROITrend() === 'down' ? '-18%' : '0%',
      color: 'success',
      icon: <Business />,
    },
  ];

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Corporate Analytics Dashboard
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Performance insights and business intelligence
          </Typography>
        </Box>
        
        <Box display="flex" gap={2} alignItems="center">
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Time Range</InputLabel>
            <Select
              value={timeRange}
              label="Time Range"
              onChange={(e) => setTimeRange(e.target.value as any)}
            >
              <MenuItem value="7d">7 Days</MenuItem>
              <MenuItem value="30d">30 Days</MenuItem>
              <MenuItem value="90d">90 Days</MenuItem>
              <MenuItem value="1y">1 Year</MenuItem>
            </Select>
          </FormControl>
          
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
              />
            }
            label="Auto Refresh"
          />
          
          <IconButton onClick={refreshAllData} disabled={loading}>
            <Refresh />
          </IconButton>
          
          <Button variant="outlined" startIcon={<Download />}>
            Export
          </Button>
        </Box>
      </Box>

      {/* Error Alert */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading Progress */}
      {loading && <LinearProgress sx={{ mb: 3 }} />}

      {/* Key Metrics Summary */}
      <Grid container spacing={3} mb={4}>
        {keyMetrics.map((metric, index) => (
          <Grid item xs={12} md={3} key={index}>
            <AnalyticsMetricCard {...metric} />
          </Grid>
        ))}
      </Grid>

      {/* Analytics Tabs */}
      <Paper elevation={1} sx={{ mb: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={handleTabChange}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<Timeline />} label="Performance Trends" />
          <Tab icon={<Speed />} label="Productivity Insights" />
          <Tab icon={<Memory />} label="Memory Analytics" />
          <Tab icon={<Business />} label="Business Intelligence" />
          <Tab icon={<PsychologyAlt />} label="Predictive Analytics" />
          <Tab icon={<Assessment />} label="Custom Reports" />
        </Tabs>
      </Paper>

      {/* Tab Content */}
      <TabPanel value={activeTab} index={0}>
        <PerformanceTrends />
      </TabPanel>
      <TabPanel value={activeTab} index={1}>
        <ProductivityInsights />
      </TabPanel>
      <TabPanel value={activeTab} index={2}>
        <MemoryAnalyticsComponent />
      </TabPanel>
      <TabPanel value={activeTab} index={3}>
        <BusinessIntelligence />
      </TabPanel>
      <TabPanel value={activeTab} index={4}>
        <PredictiveAnalytics />
      </TabPanel>
      <TabPanel value={activeTab} index={5}>
        <CustomReports />
      </TabPanel>
    </Box>
  );
};

export default Analytics;