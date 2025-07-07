import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  LinearProgress,
  Chip,
  useTheme,
} from '@mui/material';
import {
  TrendingUp,
  Computer,
  Memory,
  Speed,
  Storage,
} from '@mui/icons-material';
import { PerformanceMetrics } from '@/services/monitoring';

interface PerformanceChartsProps {
  metrics: PerformanceMetrics | null;
  isLoading?: boolean;
}

// Simple line chart component using SVG
const SimpleLineChart: React.FC<{
  data: number[];
  color: string;
  height?: number;
  width?: number;
  showGrid?: boolean;
}> = ({ data, color, height = 60, width = 200, showGrid = false }) => {
  if (data.length === 0) return null;

  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * width;
    const y = height - ((value - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');

  return (
    <Box sx={{ width: width, height: height, position: 'relative' }}>
      <svg width={width} height={height} style={{ display: 'block' }}>
        {showGrid && (
          <defs>
            <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
              <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e0e0e0" strokeWidth="0.5"/>
            </pattern>
          </defs>
        )}
        {showGrid && <rect width="100%" height="100%" fill="url(#grid)" />}
        <polyline
          fill="none"
          stroke={color}
          strokeWidth="2"
          points={points}
          style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
        />
        {/* Add dots for data points */}
        {data.map((value, index) => {
          const x = (index / (data.length - 1)) * width;
          const y = height - ((value - min) / range) * height;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="2"
              fill={color}
              style={{ filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.2))' }}
            />
          );
        })}
      </svg>
    </Box>
  );
};

// Gauge chart component
const GaugeChart: React.FC<{
  value: number;
  max?: number;
  label: string;
  color: string;
  size?: number;
}> = ({ value, max = 100, label, color, size = 80 }) => {
  const percentage = Math.min((value / max) * 100, 100);
  const angle = (percentage / 100) * 180; // Semi-circle gauge
  const radius = size / 2 - 10;
  const centerX = size / 2;
  const centerY = size / 2;

  // Calculate arc path
  const startAngle = 180;
  const endAngle = startAngle - angle;
  const startX = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
  const startY = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
  const endX = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
  const endY = centerY + radius * Math.sin((endAngle * Math.PI) / 180);
  const largeArcFlag = angle > 180 ? 1 : 0;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <svg width={size} height={size / 2 + 20} style={{ display: 'block' }}>
        {/* Background arc */}
        <path
          d={`M ${centerX - radius} ${centerY} A ${radius} ${radius} 0 0 1 ${centerX + radius} ${centerY}`}
          fill="none"
          stroke="#e0e0e0"
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Value arc */}
        <path
          d={`M ${startX} ${startY} A ${radius} ${radius} 0 ${largeArcFlag} 0 ${endX} ${endY}`}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
        />
        {/* Center text */}
        <text
          x={centerX}
          y={centerY + 5}
          textAnchor="middle"
          fontSize="12"
          fontWeight="bold"
          fill={color}
        >
          {value.toFixed(0)}%
        </text>
      </svg>
      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
        {label}
      </Typography>
    </Box>
  );
};

const PerformanceCharts: React.FC<PerformanceChartsProps> = ({
  metrics,
  isLoading = false,
}) => {
  const theme = useTheme();

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            System Performance Trends (Live)
          </Typography>
          <Box sx={{ width: '100%' }}>
            <LinearProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!metrics || metrics.timestamps.length === 0) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            System Performance Trends (Live)
          </Typography>
          <Typography color="text.secondary">
            No performance data available
          </Typography>
        </CardContent>
      </Card>
    );
  }

  const latestCpu = metrics.cpu_usage[metrics.cpu_usage.length - 1] || 0;
  const latestMemory = metrics.memory_usage[metrics.memory_usage.length - 1] || 0;
  const latestResponse = metrics.api_response_times[metrics.api_response_times.length - 1] || 0;
  const latestMemoryOps = metrics.memory_operations_per_second[metrics.memory_operations_per_second.length - 1] || 0;

  const getCpuColor = (value: number) => {
    if (value > 80) return theme.palette.error.main;
    if (value > 60) return theme.palette.warning.main;
    return theme.palette.success.main;
  };

  const getMemoryColor = (value: number) => {
    if (value > 90) return theme.palette.error.main;
    if (value > 70) return theme.palette.warning.main;
    return theme.palette.info.main;
  };

  const getResponseTimeColor = (value: number) => {
    if (value > 500) return theme.palette.error.main;
    if (value > 300) return theme.palette.warning.main;
    return theme.palette.success.main;
  };

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <TrendingUp color="primary" />
          System Performance Trends (Live)
          <Chip
            size="small"
            label={`${metrics.timestamps.length} data points`}
            variant="outlined"
            sx={{ ml: 'auto' }}
          />
        </Typography>

        <Grid container spacing={3}>
          {/* Real-time Gauges */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Current System Status
            </Typography>
            <Box sx={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 2 }}>
              <GaugeChart
                value={latestCpu}
                label="CPU Usage"
                color={getCpuColor(latestCpu)}
              />
              <GaugeChart
                value={latestMemory}
                label="Memory Usage"
                color={getMemoryColor(latestMemory)}
              />
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Performance Metrics
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Speed color="action" fontSize="small" />
                  <Typography variant="body2">API Response</Typography>
                </Box>
                <Chip
                  size="small"
                  label={`${latestResponse.toFixed(0)}ms`}
                  color={latestResponse > 500 ? 'error' : latestResponse > 300 ? 'warning' : 'success'}
                />
              </Box>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Storage color="action" fontSize="small" />
                  <Typography variant="body2">Memory Ops/sec</Typography>
                </Box>
                <Chip
                  size="small"
                  label={latestMemoryOps.toFixed(1)}
                  color="info"
                />
              </Box>
            </Box>
          </Grid>

          {/* Trend Charts */}
          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              CPU Usage (%)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <SimpleLineChart
                data={metrics.cpu_usage}
                color={getCpuColor(latestCpu)}
                width={180}
                height={60}
              />
              <Box>
                <Typography variant="h6" color={getCpuColor(latestCpu)}>
                  {latestCpu.toFixed(1)}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Current
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              {metrics.timestamps.slice(-4).map((time, index) => (
                <Typography key={index} variant="caption" color="text.secondary">
                  {time}
                </Typography>
              ))}
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Memory Usage (%)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <SimpleLineChart
                data={metrics.memory_usage}
                color={getMemoryColor(latestMemory)}
                width={180}
                height={60}
              />
              <Box>
                <Typography variant="h6" color={getMemoryColor(latestMemory)}>
                  {latestMemory.toFixed(1)}%
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Current
                </Typography>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
              {metrics.timestamps.slice(-4).map((time, index) => (
                <Typography key={index} variant="caption" color="text.secondary">
                  {time}
                </Typography>
              ))}
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              API Response Times (ms)
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <SimpleLineChart
                data={metrics.api_response_times}
                color={getResponseTimeColor(latestResponse)}
                width={180}
                height={60}
              />
              <Box>
                <Typography variant="h6" color={getResponseTimeColor(latestResponse)}>
                  {latestResponse.toFixed(0)}ms
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Current
                </Typography>
              </Box>
            </Box>
          </Grid>

          <Grid item xs={12} md={6}>
            <Typography variant="subtitle2" gutterBottom>
              Memory Operations/sec
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
              <SimpleLineChart
                data={metrics.memory_operations_per_second}
                color={theme.palette.info.main}
                width={180}
                height={60}
              />
              <Box>
                <Typography variant="h6" color="info.main">
                  {latestMemoryOps.toFixed(1)}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Current
                </Typography>
              </Box>
            </Box>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default PerformanceCharts;