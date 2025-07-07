/**
 * MemoryAnalytics Component
 * Displays memory analytics and cleanup insights
 */

import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Chip,
  Button,
  Divider,
  Alert,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
} from '@mui/material';
import {
  TrendingUp,
  Storage,
  Archive,
  Delete,
  Lightbulb,
  Schedule,
  Assessment,
  CleaningServices,
  Insights,
} from '@mui/icons-material';
import { MemoryStats, CleanupAnalytics } from '@/types/memory';

interface MemoryAnalyticsProps {
  employeeStats: Record<string, MemoryStats>;
  cleanupAnalytics: CleanupAnalytics | null;
  onPerformCleanup: () => void;
  isLoading?: boolean;
}

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const MemoryAnalytics: React.FC<MemoryAnalyticsProps> = ({
  employeeStats,
  cleanupAnalytics,
  onPerformCleanup,
  isLoading = false,
}) => {
  // Calculate aggregate statistics
  const aggregateStats = React.useMemo(() => {
    const employees = Object.keys(employeeStats);
    const totalMemories = employees.reduce((sum, emp) => sum + (employeeStats[emp]?.total || 0), 0);
    const totalStorage = employees.reduce((sum, emp) => sum + (employeeStats[emp]?.storageSize || 0), 0);
    const totalExperience = employees.reduce((sum, emp) => sum + (employeeStats[emp]?.experience || 0), 0);
    const totalKnowledge = employees.reduce((sum, emp) => sum + (employeeStats[emp]?.knowledge || 0), 0);
    const totalDecision = employees.reduce((sum, emp) => sum + (employeeStats[emp]?.decision || 0), 0);
    const totalInteraction = employees.reduce((sum, emp) => sum + (employeeStats[emp]?.interaction || 0), 0);

    return {
      totalEmployees: employees.length,
      totalMemories,
      totalStorage,
      averageMemoriesPerEmployee: totalMemories / employees.length || 0,
      memoryTypes: {
        experience: totalExperience,
        knowledge: totalKnowledge,
        decision: totalDecision,
        interaction: totalInteraction,
      },
    };
  }, [employeeStats]);

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom display="flex" alignItems="center" gap={1}>
        <Assessment />
        Memory Analytics Dashboard
      </Typography>

      {/* Company Overview */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justify-content="space-between">
                <Box>
                  <Typography variant="h4" color="primary.main">
                    {aggregateStats.totalMemories.toLocaleString()}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Memories
                  </Typography>
                </Box>
                <TrendingUp color="primary" fontSize="large" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justify-content="space-between">
                <Box>
                  <Typography variant="h4" color="success.main">
                    {aggregateStats.totalEmployees}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Employees
                  </Typography>
                </Box>
                <Storage color="success" fontSize="large" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justify-content="space-between">
                <Box>
                  <Typography variant="h4" color="info.main">
                    {formatBytes(aggregateStats.totalStorage)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Storage Used
                  </Typography>
                </Box>
                <Archive color="info" fontSize="large" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justify-content="space-between">
                <Box>
                  <Typography variant="h4" color="warning.main">
                    {Math.round(aggregateStats.averageMemoriesPerEmployee)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Avg per Employee
                  </Typography>
                </Box>
                <Insights color="warning" fontSize="large" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Memory Type Distribution */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Memory Type Distribution
              </Typography>
              <Box mt={2}>
                {Object.entries(aggregateStats.memoryTypes).map(([type, count]) => {
                  const percentage = (count / aggregateStats.totalMemories) * 100 || 0;
                  const colors = {
                    experience: '#2196f3',
                    knowledge: '#4caf50',
                    decision: '#ff9800',
                    interaction: '#9c27b0',
                  };
                  
                  return (
                    <Box key={type} mb={2}>
                      <Box display="flex" justifyContent="space-between" mb={1}>
                        <Typography variant="body2" sx={{ textTransform: 'capitalize' }}>
                          {type}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {count} ({percentage.toFixed(1)}%)
                        </Typography>
                      </Box>
                      <LinearProgress 
                        variant="determinate" 
                        value={percentage} 
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          backgroundColor: 'grey.200',
                          '& .MuiLinearProgress-bar': {
                            backgroundColor: colors[type as keyof typeof colors],
                          },
                        }}
                      />
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom display="flex" alignItems="center" gap={1}>
                <CleaningServices />
                Cleanup Analytics
              </Typography>
              
              {cleanupAnalytics ? (
                <Box>
                  <Box display="flex" justify-content="space-between" alignItems="center" mb={2}>
                    <Typography variant="body2">
                      Last Cleanup: {formatDate(cleanupAnalytics.lastCleanup)}
                    </Typography>
                    <Button
                      variant="contained"
                      size="small"
                      startIcon={<CleaningServices />}
                      onClick={onPerformCleanup}
                      disabled={isLoading}
                    >
                      Run Cleanup
                    </Button>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box mb={2}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Cleanup Statistics
                    </Typography>
                    <Box display="flex" gap={1} flexWrap="wrap">
                      <Chip
                        icon={<Archive />}
                        label={`${cleanupAnalytics.archivedMemories} Archived`}
                        size="small"
                        color="info"
                      />
                      <Chip
                        icon={<Delete />}
                        label={`${cleanupAnalytics.deletedMemories} Deleted`}
                        size="small"
                        color="error"
                      />
                      <Chip
                        icon={<TrendingUp />}
                        label={`${cleanupAnalytics.storageOptimization}% Optimized`}
                        size="small"
                        color="success"
                      />
                    </Box>
                  </Box>

                  {cleanupAnalytics.recommendations.length > 0 && (
                    <Box>
                      <Typography variant="body2" color="text.secondary" gutterBottom>
                        Recommendations
                      </Typography>
                      <List dense>
                        {cleanupAnalytics.recommendations.slice(0, 3).map((rec, index) => (
                          <ListItem key={index} sx={{ px: 0 }}>
                            <ListItemIcon sx={{ minWidth: 32 }}>
                              <Lightbulb fontSize="small" color="warning" />
                            </ListItemIcon>
                            <ListItemText
                              primary={rec}
                              primaryTypographyProps={{ variant: 'body2' }}
                            />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}
                </Box>
              ) : (
                <Box textAlign="center" py={3}>
                  <Typography variant="body2" color="text.secondary" mb={2}>
                    No cleanup analytics available
                  </Typography>
                  <Button
                    variant="outlined"
                    startIcon={<CleaningServices />}
                    onClick={onPerformCleanup}
                    disabled={isLoading}
                  >
                    Run Initial Cleanup
                  </Button>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Top Employees by Memory Count */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Employee Memory Statistics
          </Typography>
          
          {aggregateStats.totalEmployees === 0 ? (
            <Alert severity="info">
              No employee memory data available. Make sure the Memory API is running on port 3333.
            </Alert>
          ) : (
            <Grid container spacing={2}>
              {Object.entries(employeeStats)
                .sort(([,a], [,b]) => (b?.total || 0) - (a?.total || 0))
                .slice(0, 8)
                .map(([employeeId, stats]) => (
                  <Grid item xs={12} sm={6} md={4} lg={3} key={employeeId}>
                    <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {employeeId.replace('emp_', 'Employee ')}
                      </Typography>
                      <Typography variant="h5" color="primary.main" gutterBottom>
                        {stats?.total || 0}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {formatBytes(stats?.storageSize || 0)}
                      </Typography>
                      <Box display="flex" justifyContent="center" gap={0.5} mt={1} flexWrap="wrap">
                        <Chip size="small" label={`E:${stats?.experience || 0}`} color="primary" />
                        <Chip size="small" label={`K:${stats?.knowledge || 0}`} color="success" />
                        <Chip size="small" label={`D:${stats?.decision || 0}`} color="warning" />
                        <Chip size="small" label={`I:${stats?.interaction || 0}`} color="secondary" />
                      </Box>
                    </Paper>
                  </Grid>
                ))}
            </Grid>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default MemoryAnalytics;