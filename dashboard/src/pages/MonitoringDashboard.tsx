import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardContent,
  Button,
  Switch,
  FormControlLabel,
  Chip,
  IconButton,
  Tooltip,
  Alert,
  Fade,
  CircularProgress,
} from '@mui/material';
import {
  Dashboard,
  Refresh,
  Settings,
  Fullscreen,
  FullscreenExit,
  PlayArrow,
  Pause,
} from '@mui/icons-material';

// Import monitoring components
import SystemHealthMonitor from '@/components/monitoring/SystemHealthMonitor';
import EmployeeActivityFeed from '@/components/monitoring/EmployeeActivityFeed';
import EmployeeStatusGrid from '@/components/monitoring/EmployeeStatusGrid';
import PerformanceCharts from '@/components/monitoring/PerformanceCharts';
import MemorySystemMonitor from '@/components/monitoring/MemorySystemMonitor';
import AlertsPanel from '@/components/monitoring/AlertsPanel';

// Import store
import { useMonitoringStore } from '@/stores/monitoringStore';

const MonitoringDashboard: React.FC = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const {
    // Data
    systemHealth,
    employeeActivities,
    employeeStatus,
    performanceMetrics,
    memoryHealth,
    activeAlerts,
    
    // UI state
    isLoading,
    lastUpdated,
    autoRefresh,
    refreshInterval,
    error,
    
    // Actions
    fetchAllData,
    setAutoRefresh,
    setRefreshInterval,
    resolveAlert,
    dismissAlert,
    clearError,
    
    // Computed getters
    isSystemHealthy,
    criticalAlerts,
    totalActiveEmployees,
    overloadedEmployees,
    latestCpuUsage,
    latestMemoryUsage,
    memoryUsagePercent,
  } = useMonitoringStore();

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    // Initial fetch
    fetchAllData().catch(err => {
      setRefreshError(err.message);
      setTimeout(() => setRefreshError(null), 5000);
    });

    // Set up interval
    const interval = setInterval(async () => {
      try {
        await fetchAllData();
        setLastRefresh(new Date());
        setRefreshError(null);
      } catch (err) {
        setRefreshError(err instanceof Error ? err.message : 'Refresh failed');
        setTimeout(() => setRefreshError(null), 5000);
      }
    }, refreshInterval * 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, fetchAllData]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey) {
        switch (event.key) {
          case 'r':
            event.preventDefault();
            handleManualRefresh();
            break;
          case 'f':
            event.preventDefault();
            setIsFullscreen(!isFullscreen);
            break;
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const handleManualRefresh = async () => {
    try {
      await fetchAllData();
      setLastRefresh(new Date());
      setRefreshError(null);
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : 'Refresh failed');
      setTimeout(() => setRefreshError(null), 5000);
    }
  };

  const handleToggleAutoRefresh = (enabled: boolean) => {
    setAutoRefresh(enabled);
    if (enabled) {
      fetchAllData();
    }
  };

  const getSystemStatusColor = () => {
    if (criticalAlerts().length > 0) return 'error';
    if (!isSystemHealthy()) return 'warning';
    return 'success';
  };

  const getSystemStatusText = () => {
    if (criticalAlerts().length > 0) return 'Critical Issues';
    if (!isSystemHealthy()) return 'Warnings Present';
    return 'All Systems Operational';
  };

  return (
    <Box sx={{ 
      p: 3, 
      minHeight: '100vh',
      bgcolor: 'background.default',
      position: isFullscreen ? 'fixed' : 'relative',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: isFullscreen ? 9999 : 'auto',
      overflow: 'auto',
    }}>
      {/* Dashboard Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h4" fontWeight="bold" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Dashboard color="primary" />
            Real-time Monitoring Dashboard
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mt: 1 }}>
            <Chip
              label={getSystemStatusText()}
              color={getSystemStatusColor() as any}
              variant="filled"
              size="small"
            />
            <Typography variant="body2" color="text.secondary">
              {totalActiveEmployees()} of 13 employees active
            </Typography>
            {overloadedEmployees().length > 0 && (
              <Chip
                label={`${overloadedEmployees().length} overloaded`}
                color="warning"
                variant="outlined"
                size="small"
              />
            )}
            {lastUpdated && (
              <Typography variant="caption" color="text.secondary">
                Last updated: {new Date(lastUpdated).toLocaleTimeString()}
              </Typography>
            )}
          </Box>
        </Box>

        {/* Dashboard Controls */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <FormControlLabel
            control={
              <Switch
                checked={autoRefresh}
                onChange={(e) => handleToggleAutoRefresh(e.target.checked)}
                size="small"
              />
            }
            label="Auto-refresh"
          />
          
          <Tooltip title={`Refresh every ${refreshInterval}s`}>
            <Chip
              size="small"
              label={`${refreshInterval}s`}
              variant="outlined"
              onClick={() => {
                const newInterval = refreshInterval === 30 ? 10 : refreshInterval === 10 ? 60 : 30;
                setRefreshInterval(newInterval);
              }}
              clickable
            />
          </Tooltip>

          <Tooltip title="Refresh now (Ctrl+R)">
            <IconButton 
              onClick={handleManualRefresh} 
              disabled={isLoading}
              color="primary"
            >
              {isLoading ? <CircularProgress size={24} /> : <Refresh />}
            </IconButton>
          </Tooltip>

          <Tooltip title={isFullscreen ? "Exit fullscreen (Ctrl+F)" : "Enter fullscreen (Ctrl+F)"}>
            <IconButton onClick={() => setIsFullscreen(!isFullscreen)}>
              {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>
          </Tooltip>

          <Tooltip title="Dashboard settings">
            <IconButton>
              <Settings />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Error Alert */}
      {(error || refreshError) && (
        <Fade in={true}>
          <Alert 
            severity="error" 
            sx={{ mb: 2 }}
            onClose={() => {
              clearError();
              setRefreshError(null);
            }}
          >
            {error || refreshError}
          </Alert>
        </Fade>
      )}

      {/* Main Dashboard Grid */}
      <Grid container spacing={3}>
        {/* System Health Overview */}
        <Grid item xs={12}>
          <SystemHealthMonitor systemHealth={systemHealth} isLoading={isLoading} />
        </Grid>

        {/* Employee Activity and Status */}
        <Grid item xs={12} lg={6}>
          <EmployeeActivityFeed 
            activities={employeeActivities}
            isLoading={isLoading}
            autoRefresh={autoRefresh}
            onToggleAutoRefresh={handleToggleAutoRefresh}
            onRefresh={handleManualRefresh}
          />
        </Grid>

        <Grid item xs={12} lg={6}>
          <AlertsPanel 
            alerts={activeAlerts}
            isLoading={isLoading}
            onResolveAlert={resolveAlert}
            onDismissAlert={dismissAlert}
            onRefresh={handleManualRefresh}
          />
        </Grid>

        {/* Performance Charts */}
        <Grid item xs={12}>
          <PerformanceCharts metrics={performanceMetrics} isLoading={isLoading} />
        </Grid>

        {/* Employee Status Grid */}
        <Grid item xs={12}>
          <EmployeeStatusGrid employees={employeeStatus} isLoading={isLoading} />
        </Grid>

        {/* Memory System Monitor */}
        <Grid item xs={12}>
          <MemorySystemMonitor memoryHealth={memoryHealth} isLoading={isLoading} />
        </Grid>

        {/* Quick Stats Cards */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="primary.main">
                {latestCpuUsage()}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                CPU Usage
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="info.main">
                {latestMemoryUsage()}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                RAM Usage
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color="warning.main">
                {memoryUsagePercent()}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Memory DB Usage
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={3}>
          <Card>
            <CardContent sx={{ textAlign: 'center' }}>
              <Typography variant="h4" color={criticalAlerts().length > 0 ? 'error.main' : 'success.main'}>
                {activeAlerts.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Active Alerts
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Footer Info */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="caption" color="text.secondary">
          Claude AI Software Company • Real-time Monitoring Dashboard • {totalActiveEmployees()} AI Employees
          {lastRefresh && ` • Last refresh: ${lastRefresh.toLocaleTimeString()}`}
        </Typography>
      </Box>
    </Box>
  );
};

export default MonitoringDashboard;