import React from 'react';
import {
  Card,
  CardContent,
  Grid,
  Typography,
  Box,
  Chip,
  LinearProgress,
  Tooltip,
} from '@mui/material';
import {
  CheckCircle,
  Warning,
  Error,
  Memory,
  Storage,
  NetworkCheck,
  Speed,
} from '@mui/icons-material';
import { SystemHealthStatus } from '@/services/monitoring';

interface SystemHealthMonitorProps {
  systemHealth: SystemHealthStatus | null;
  isLoading?: boolean;
}

const SystemHealthMonitor: React.FC<SystemHealthMonitorProps> = ({
  systemHealth,
  isLoading = false,
}) => {
  const getStatusIcon = (status: 'online' | 'offline' | 'degraded') => {
    switch (status) {
      case 'online':
        return <CheckCircle color="success" fontSize="small" />;
      case 'degraded':
        return <Warning color="warning" fontSize="small" />;
      case 'offline':
        return <Error color="error" fontSize="small" />;
      default:
        return <Error color="disabled" fontSize="small" />;
    }
  };

  const getStatusColor = (status: 'online' | 'offline' | 'degraded') => {
    switch (status) {
      case 'online':
        return 'success';
      case 'degraded':
        return 'warning';
      case 'offline':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPerformanceColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'error';
    if (value >= thresholds.warning) return 'warning';
    return 'success';
  };

  const formatResponseTime = (ms: number) => {
    if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
    return `${ms}ms`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            System Health Monitor
          </Typography>
          <Box sx={{ width: '100%' }}>
            <LinearProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!systemHealth) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            System Health Monitor
          </Typography>
          <Typography color="text.secondary">
            Unable to load system health data
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <NetworkCheck color="primary" />
          System Health Monitor
          <Chip
            size="small"
            label={`Updated ${new Date(systemHealth.last_updated).toLocaleTimeString()}`}
            variant="outlined"
            sx={{ ml: 'auto' }}
          />
        </Typography>

        <Grid container spacing={2}>
          {/* Infrastructure Status */}
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" gutterBottom>
              Infrastructure Status
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {Object.entries(systemHealth.infrastructure).map(([service, status]) => (
                <Box key={service} sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  {getStatusIcon(status)}
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {service.replace('_', ' ')}: 
                  </Typography>
                  <Chip
                    size="small"
                    label={status.toUpperCase()}
                    color={getStatusColor(status) as any}
                    variant={status === 'online' ? 'filled' : 'outlined'}
                  />
                </Box>
              ))}
            </Box>
          </Grid>

          {/* Performance Metrics */}
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" gutterBottom>
              Performance Metrics
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="body2">CPU</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {systemHealth.performance.cpu_usage.toFixed(0)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={systemHealth.performance.cpu_usage}
                  color={getPerformanceColor(systemHealth.performance.cpu_usage, { warning: 70, critical: 90 })}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="body2">RAM</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {systemHealth.performance.ram_usage.toFixed(0)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={systemHealth.performance.ram_usage}
                  color={getPerformanceColor(systemHealth.performance.ram_usage, { warning: 80, critical: 95 })}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="body2">Disk</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {systemHealth.performance.disk_usage.toFixed(0)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={systemHealth.performance.disk_usage}
                  color={getPerformanceColor(systemHealth.performance.disk_usage, { warning: 80, critical: 95 })}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>

              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="body2">Network</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {systemHealth.performance.network_usage.toFixed(0)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={systemHealth.performance.network_usage}
                  color={getPerformanceColor(systemHealth.performance.network_usage, { warning: 70, critical: 90 })}
                  sx={{ height: 6, borderRadius: 3 }}
                />
              </Box>
            </Box>
          </Grid>

          {/* Response Times */}
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" gutterBottom>
              Response Times
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {Object.entries(systemHealth.response_times).map(([endpoint, time]) => (
                <Box key={endpoint} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                    {endpoint}:
                  </Typography>
                  <Tooltip title={`${time}ms average response time`}>
                    <Chip
                      size="small"
                      label={formatResponseTime(time)}
                      color={time > 1000 ? 'error' : time > 500 ? 'warning' : 'success'}
                      variant="outlined"
                    />
                  </Tooltip>
                </Box>
              ))}
              
              <Box sx={{ mt: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1, border: 1, borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary">
                  Load Average: {systemHealth.performance.load_average.toFixed(2)}
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default SystemHealthMonitor;