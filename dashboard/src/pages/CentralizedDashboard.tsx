import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Avatar,
  IconButton,
  Divider,
  Paper,
  Badge,
  CardHeader,
  CardActions,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  People,
  Assignment,
  Memory,
  Search,
  PlayArrow,
  Stop,
  Refresh,
  NotificationsActive,
  Dashboard as DashboardIcon,
  Analytics,
  CheckCircle,
  Warning,
  Error,
  Info,
} from '@mui/icons-material';

// TypeScript interfaces
interface ExecutiveSummaryMetric {
  title: string;
  value: string | number;
  trend: 'up' | 'down' | 'stable';
  trendValue: string;
  status: 'healthy' | 'warning' | 'critical';
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'error';
}

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  color: 'primary' | 'secondary' | 'success' | 'warning';
  onClick: () => void;
  disabled?: boolean;
  badge?: number;
}

interface EmployeeDepartment {
  name: string;
  employees: EmployeeStatus[];
  utilization: number;
  color: string;
}

interface EmployeeStatus {
  id: string;
  name: string;
  role: string;
  status: 'active' | 'busy' | 'offline';
  currentTask?: string;
  workload: number;
  performance: number;
  lastActivity: Date;
}

interface ActivityItem {
  id: string;
  employee: string;
  action: string;
  timestamp: Date;
  status: 'success' | 'warning' | 'error';
}

interface SystemAlert {
  id: string;
  title: string;
  severity: 'info' | 'warning' | 'error';
  timestamp: Date;
  resolved?: boolean;
}

const CentralizedDashboard: React.FC = () => {
  // State management
  const [summaryMetrics, setSummaryMetrics] = useState<ExecutiveSummaryMetric[]>([]);
  const [departments, setDepartments] = useState<EmployeeDepartment[]>([]);
  const [recentActivities, setRecentActivities] = useState<ActivityItem[]>([]);
  const [systemAlerts, setSystemAlerts] = useState<SystemAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize dashboard data
  useEffect(() => {
    loadDashboardData();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadDashboardData, 30000);
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setIsLoading(true);
      
      // Load executive summary metrics
      setSummaryMetrics([
        {
          title: 'System Health',
          value: '98%',
          trend: 'up',
          trendValue: '+2%',
          status: 'healthy',
          icon: <CheckCircle />,
          color: 'success',
        },
        {
          title: 'Active Projects',
          value: 12,
          trend: 'stable',
          trendValue: '0',
          status: 'healthy',
          icon: <Assignment />,
          color: 'primary',
        },
        {
          title: 'Employee Utilization',
          value: '87%',
          trend: 'up',
          trendValue: '+5%',
          status: 'healthy',
          icon: <People />,
          color: 'success',
        },
        {
          title: "Today's Output",
          value: 247,
          trend: 'up',
          trendValue: '+15%',
          status: 'healthy',
          icon: <TrendingUp />,
          color: 'success',
        },
      ]);

      // Load department data
      setDepartments([
        {
          name: 'Executive',
          utilization: 92,
          color: '#1976d2',
          employees: [
            { id: 'emp_001_pm', name: 'Alex Chen', role: 'Project Manager', status: 'active', workload: 85, performance: 95, lastActivity: new Date() },
            { id: 'emp_002_tl', name: 'Taylor Kim', role: 'Technical Lead', status: 'busy', workload: 90, performance: 92, lastActivity: new Date() },
            { id: 'emp_003_qd', name: 'Jordan Lee', role: 'QA Director', status: 'active', workload: 78, performance: 88, lastActivity: new Date() },
          ],
        },
        {
          name: 'Development',
          utilization: 89,
          color: '#2e7d33',
          employees: [
            { id: 'emp_004_sd', name: 'Sam Patel', role: 'Senior Developer', status: 'busy', currentTask: 'Dashboard Implementation', workload: 95, performance: 94, lastActivity: new Date() },
            { id: 'emp_005_jd', name: 'Jordan Rivera', role: 'Junior Developer', status: 'active', workload: 72, performance: 85, lastActivity: new Date() },
            { id: 'emp_006_qe', name: 'Morgan Davis', role: 'QA Engineer', status: 'active', workload: 80, performance: 90, lastActivity: new Date() },
            { id: 'emp_007_te', name: 'Casey Wilson', role: 'Test Engineer', status: 'offline', workload: 65, performance: 82, lastActivity: new Date() },
          ],
        },
        {
          name: 'Operations',
          utilization: 76,
          color: '#f57c00',
          employees: [
            { id: 'emp_008_do', name: 'Drew Thompson', role: 'DevOps Engineer', status: 'active', workload: 85, performance: 91, lastActivity: new Date() },
            { id: 'emp_009_sre', name: 'Riley Chen', role: 'Site Reliability Engineer', status: 'active', workload: 70, performance: 88, lastActivity: new Date() },
            { id: 'emp_010_se', name: 'Avery Johnson', role: 'Security Engineer', status: 'busy', workload: 73, performance: 86, lastActivity: new Date() },
          ],
        },
        {
          name: 'Support',
          utilization: 68,
          color: '#7b1fa2',
          employees: [
            { id: 'emp_011_tw', name: 'Blake Martinez', role: 'Technical Writer', status: 'active', workload: 75, performance: 89, lastActivity: new Date() },
            { id: 'emp_012_ux', name: 'Quinn Anderson', role: 'UI/UX Designer', status: 'busy', workload: 82, performance: 93, lastActivity: new Date() },
            { id: 'emp_013_be', name: 'Sage Thompson', role: 'Build Engineer', status: 'active', workload: 68, performance: 84, lastActivity: new Date() },
          ],
        },
      ]);

      // Load recent activities
      setRecentActivities([
        { id: '1', employee: 'Sam Patel', action: 'Completed Dashboard Implementation', timestamp: new Date(), status: 'success' },
        { id: '2', employee: 'Morgan Davis', action: 'QA Testing Complete', timestamp: new Date(), status: 'success' },
        { id: '3', employee: 'Alex Chen', action: 'Sprint Planning Session', timestamp: new Date(), status: 'success' },
        { id: '4', employee: 'Quinn Anderson', action: 'UI Design Review', timestamp: new Date(), status: 'warning' },
        { id: '5', employee: 'Drew Thompson', action: 'Infrastructure Update', timestamp: new Date(), status: 'success' },
      ]);

      // Load system alerts
      setSystemAlerts([
        { id: '1', title: 'Memory API performing optimally', severity: 'info', timestamp: new Date() },
        { id: '2', title: 'High CPU usage on employee emp_004_sd', severity: 'warning', timestamp: new Date() },
        { id: '3', title: 'All systems operational', severity: 'info', timestamp: new Date() },
      ]);

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const quickActions: QuickAction[] = [
    {
      id: 'assign-task',
      title: 'Assign New Task',
      description: 'Smart employee assignment',
      icon: <Assignment />,
      color: 'primary',
      onClick: () => window.location.href = '/employees',
    },
    {
      id: 'start-workflow',
      title: 'Start Workflow',
      description: 'Template-based project initiation',
      icon: <PlayArrow />,
      color: 'success',
      onClick: () => window.location.href = '/workflows',
    },
    {
      id: 'search-memory',
      title: 'Search Memory',
      description: 'Company-wide knowledge search',
      icon: <Search />,
      color: 'secondary',
      onClick: () => window.location.href = '/memory',
    },
    {
      id: 'emergency-stop',
      title: 'Emergency Controls',
      description: 'System-wide pause/resume',
      icon: <Stop />,
      color: 'warning',
      onClick: () => alert('Emergency controls activated'),
    },
    {
      id: 'analytics',
      title: 'View Analytics',
      description: 'Performance insights',
      icon: <Analytics />,
      color: 'primary',
      onClick: () => window.location.href = '/analytics',
    },
    {
      id: 'system-monitor',
      title: 'System Monitor',
      description: 'Real-time monitoring',
      icon: <DashboardIcon />,
      color: 'secondary',
      onClick: () => window.location.href = '/dashboard/monitoring',
    },
  ];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active': return <CheckCircle color="success" />;
      case 'busy': return <Warning color="warning" />;
      case 'offline': return <Error color="error" />;
      default: return <Info />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'success';
      case 'busy': return 'warning';
      case 'offline': return 'error';
      default: return 'default';
    }
  };

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Executive Dashboard
          </Typography>
          <Typography variant="subtitle1" color="textSecondary">
            Real-time overview of AI company operations
          </Typography>
        </Box>
        
        <Box display="flex" gap={2}>
          <IconButton onClick={loadDashboardData} disabled={isLoading}>
            <Refresh />
          </IconButton>
          <Badge badgeContent={systemAlerts.filter(a => !a.resolved).length} color="error">
            <IconButton>
              <NotificationsActive />
            </IconButton>
          </Badge>
        </Box>
      </Box>

      {/* Executive Summary Cards */}
      <Grid container spacing={3} mb={4}>
        {summaryMetrics.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card elevation={2}>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h4" fontWeight="bold" color={`${metric.color}.main`}>
                      {metric.value}
                    </Typography>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                      {metric.title}
                    </Typography>
                    <Box display="flex" alignItems="center" gap={1}>
                      {metric.trend === 'up' ? <TrendingUp fontSize="small" color="success" /> : 
                       metric.trend === 'down' ? <TrendingDown fontSize="small" color="error" /> : null}
                      <Typography variant="caption" color={metric.trend === 'up' ? 'success.main' : metric.trend === 'down' ? 'error.main' : 'textSecondary'}>
                        {metric.trendValue}
                      </Typography>
                    </Box>
                  </Box>
                  <Avatar sx={{ bgcolor: `${metric.color}.main`, width: 56, height: 56 }}>
                    {metric.icon}
                  </Avatar>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12} md={4}>
          <Card elevation={2}>
            <CardHeader
              title="Quick Actions"
              titleTypographyProps={{ variant: 'h6', fontWeight: 'bold' }}
            />
            <CardContent>
              <Grid container spacing={2}>
                {quickActions.map((action) => (
                  <Grid item xs={6} key={action.id}>
                    <Button
                      fullWidth
                      variant="outlined"
                      color={action.color}
                      startIcon={action.icon}
                      onClick={action.onClick}
                      disabled={action.disabled}
                      sx={{ 
                        minHeight: 64,
                        textAlign: 'left',
                        justifyContent: 'flex-start',
                        flexDirection: 'column',
                        alignItems: 'flex-start',
                      }}
                    >
                      <Typography variant="caption" fontWeight="bold">
                        {action.title}
                      </Typography>
                      <Typography variant="caption" color="textSecondary" sx={{ fontSize: '0.7rem' }}>
                        {action.description}
                      </Typography>
                    </Button>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Employee Status Overview */}
        <Grid item xs={12} md={8}>
          <Card elevation={2}>
            <CardHeader
              title="Employee Status Overview"
              titleTypographyProps={{ variant: 'h6', fontWeight: 'bold' }}
              action={
                <Typography variant="body2" color="textSecondary">
                  13 AI Employees Active
                </Typography>
              }
            />
            <CardContent>
              <Grid container spacing={2}>
                {departments.map((dept) => (
                  <Grid item xs={12} sm={6} md={3} key={dept.name}>
                    <Paper elevation={1} sx={{ p: 2, borderLeft: `4px solid ${dept.color}` }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="subtitle2" fontWeight="bold">
                          {dept.name}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {dept.utilization}%
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={dept.utilization} 
                        sx={{ mb: 2, height: 6, borderRadius: 3 }}
                      />
                      {dept.employees.map((employee) => (
                        <Box key={employee.id} display="flex" alignItems="center" gap={1} mb={1}>
                          {getStatusIcon(employee.status)}
                          <Typography variant="caption" sx={{ flexGrow: 1 }}>
                            {employee.name}
                          </Typography>
                          <Chip 
                            label={`${employee.workload}%`} 
                            size="small" 
                            color={getStatusColor(employee.status) as any}
                            variant="outlined"
                          />
                        </Box>
                      ))}
                    </Paper>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardHeader
              title="Recent Activity"
              titleTypographyProps={{ variant: 'h6', fontWeight: 'bold' }}
            />
            <CardContent>
              <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                {recentActivities.map((activity, index) => (
                  <Box key={activity.id}>
                    <Box display="flex" alignItems="center" gap={2} py={1}>
                      {getStatusIcon(activity.status)}
                      <Box flexGrow={1}>
                        <Typography variant="body2" fontWeight="medium">
                          {activity.employee}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {activity.action}
                        </Typography>
                      </Box>
                      <Typography variant="caption" color="textSecondary">
                        {activity.timestamp.toLocaleTimeString()}
                      </Typography>
                    </Box>
                    {index < recentActivities.length - 1 && <Divider />}
                  </Box>
                ))}
              </Box>
            </CardContent>
            <CardActions>
              <Button size="small" href="/dashboard/monitoring">View All Activity</Button>
            </CardActions>
          </Card>
        </Grid>

        {/* System Alerts & Notifications */}
        <Grid item xs={12} md={6}>
          <Card elevation={2}>
            <CardHeader
              title="System Alerts"
              titleTypographyProps={{ variant: 'h6', fontWeight: 'bold' }}
              action={
                <Badge badgeContent={systemAlerts.filter(a => !a.resolved).length} color="error">
                  <NotificationsActive />
                </Badge>
              }
            />
            <CardContent>
              <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                {systemAlerts.map((alert, index) => (
                  <Box key={alert.id}>
                    <Box display="flex" alignItems="center" gap={2} py={1}>
                      {alert.severity === 'error' ? <Error color="error" /> :
                       alert.severity === 'warning' ? <Warning color="warning" /> :
                       <Info color="info" />}
                      <Box flexGrow={1}>
                        <Typography variant="body2">
                          {alert.title}
                        </Typography>
                        <Typography variant="caption" color="textSecondary">
                          {alert.timestamp.toLocaleTimeString()}
                        </Typography>
                      </Box>
                      <Chip 
                        label={alert.severity} 
                        size="small" 
                        color={
                          alert.severity === 'error' ? 'error' :
                          alert.severity === 'warning' ? 'warning' : 'info'
                        }
                        variant="outlined"
                      />
                    </Box>
                    {index < systemAlerts.length - 1 && <Divider />}
                  </Box>
                ))}
              </Box>
            </CardContent>
            <CardActions>
              <Button size="small" href="/dashboard/monitoring">View All Alerts</Button>
            </CardActions>
          </Card>
        </Grid>
      </Grid>

      {/* Quick Analytics Overview */}
      <Card elevation={2} sx={{ mt: 3 }}>
        <CardHeader
          title="Performance Overview"
          titleTypographyProps={{ variant: 'h6', fontWeight: 'bold' }}
          action={
            <Button variant="outlined" href="/analytics" startIcon={<Analytics />}>
              View Full Analytics
            </Button>
          }
        />
        <CardContent>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h3" color="primary.main" fontWeight="bold">
                  87%
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Overall Productivity
                </Typography>
                <Typography variant="caption" color="success.main">
                  +5.2% vs last week
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h3" color="success.main" fontWeight="bold">
                  2.3h
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Avg Task Time
                </Typography>
                <Typography variant="caption" color="success.main">
                  -12min improvement
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h3" color="info.main" fontWeight="bold">
                  73%
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Memory Utilization
                </Typography>
                <Typography variant="caption" color="info.main">
                  +2.1% growth
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Box textAlign="center">
                <Typography variant="h3" color="success.main" fontWeight="bold">
                  342%
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  ROI
                </Typography>
                <Typography variant="caption" color="success.main">
                  +18% vs target
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </Box>
  );
};

export default CentralizedDashboard;