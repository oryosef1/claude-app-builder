import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Button,
  Tooltip,
  Collapse,
} from '@mui/material';
import {
  Memory,
  Storage,
  Search,
  Archive,
  Cloud,
  Speed,
  TrendingUp,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import { MemorySystemHealth } from '@/services/monitoring';

interface MemorySystemMonitorProps {
  memoryHealth: MemorySystemHealth | null;
  isLoading?: boolean;
}

const MemorySystemMonitor: React.FC<MemorySystemMonitorProps> = ({
  memoryHealth,
  isLoading = false,
}) => {
  const [expandedOperations, setExpandedOperations] = useState(false);

  const getOperationIcon = (operation: string) => {
    switch (operation) {
      case 'stored':
        return <Storage color="success" />;
      case 'searched':
        return <Search color="info" />;
      case 'context_loaded':
        return <Memory color="primary" />;
      case 'archived':
        return <Archive color="warning" />;
      default:
        return <Memory color="disabled" />;
    }
  };

  const getOperationColor = (operation: string) => {
    switch (operation) {
      case 'stored':
        return 'success';
      case 'searched':
        return 'info';
      case 'context_loaded':
        return 'primary';
      case 'archived':
        return 'warning';
      default:
        return 'default';
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffSeconds = Math.floor(diffMs / 1000);

    if (diffSeconds < 60) {
      return `${diffSeconds}s ago`;
    } else if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    } else {
      const diffHours = Math.floor(diffMinutes / 60);
      return `${diffHours}h ago`;
    }
  };

  const formatLastCleanup = (timestamp: string) => {
    if (!timestamp) return 'Never';
    const now = new Date();
    const time = new Date(timestamp);
    const diffHours = Math.floor((now.getTime() - time.getTime()) / (1000 * 60 * 60));
    
    if (diffHours < 1) return 'Less than 1h ago';
    if (diffHours === 1) return '1 hour ago';
    return `${diffHours} hours ago`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Memory System Real-time Monitor
          </Typography>
          <Box sx={{ width: '100%' }}>
            <LinearProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  if (!memoryHealth) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Memory System Real-time Monitor
          </Typography>
          <Typography color="text.secondary">
            Unable to load memory system data
          </Typography>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Memory color="primary" />
          Memory System Real-time Monitor
          <Chip
            size="small"
            label={memoryHealth.vector_db.status.toUpperCase()}
            color={memoryHealth.vector_db.status === 'online' ? 'success' : 'error'}
            variant="filled"
            sx={{ ml: 'auto' }}
          />
        </Typography>

        <Grid container spacing={2}>
          {/* Vector Database Status */}
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" gutterBottom>
              Vector Database
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Pinecone Status:</Typography>
                <Chip
                  size="small"
                  label={memoryHealth.vector_db.status === 'online' ? 'Online' : 'Offline'}
                  color={memoryHealth.vector_db.status === 'online' ? 'success' : 'error'}
                  icon={<Cloud />}
                />
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Vectors Stored:</Typography>
                <Tooltip title={`${memoryHealth.vector_db.vectors_stored.toLocaleString()} total vectors`}>
                  <Chip
                    size="small"
                    label={memoryHealth.vector_db.vectors_stored.toLocaleString()}
                    variant="outlined"
                  />
                </Tooltip>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Avg Latency:</Typography>
                <Chip
                  size="small"
                  label={`${memoryHealth.vector_db.avg_latency}ms`}
                  color={memoryHealth.vector_db.avg_latency > 200 ? 'warning' : 'success'}
                  variant="outlined"
                />
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Throughput:</Typography>
                <Chip
                  size="small"
                  label={`${memoryHealth.vector_db.throughput_ops_per_sec} ops/s`}
                  color="info"
                  variant="outlined"
                />
              </Box>
            </Box>
          </Grid>

          {/* Memory Analytics */}
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" gutterBottom>
              Memory Analytics
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Active Queries:</Typography>
                <Chip
                  size="small"
                  label={`${memoryHealth.analytics.active_queries_per_min}/min`}
                  color="primary"
                  variant="outlined"
                />
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Search Accuracy:</Typography>
                <Chip
                  size="small"
                  label={`${memoryHealth.analytics.search_accuracy_percent}%`}
                  color={memoryHealth.analytics.search_accuracy_percent >= 90 ? 'success' : 'warning'}
                  variant="outlined"
                />
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Context Hits:</Typography>
                <Chip
                  size="small"
                  label={`${memoryHealth.analytics.context_hit_rate_percent}%`}
                  color={memoryHealth.analytics.context_hit_rate_percent >= 80 ? 'success' : 'warning'}
                  variant="outlined"
                />
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Cache Hit Rate:</Typography>
                <Chip
                  size="small"
                  label={`${memoryHealth.analytics.cache_hit_rate_percent}%`}
                  color={memoryHealth.analytics.cache_hit_rate_percent >= 85 ? 'success' : 'warning'}
                  variant="outlined"
                />
              </Box>
            </Box>
          </Grid>

          {/* Storage Health */}
          <Grid item xs={12} md={4}>
            <Typography variant="subtitle2" gutterBottom>
              Storage Health
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="body2">Storage Usage</Typography>
                  <Typography variant="body2" fontWeight="bold">
                    {memoryHealth.storage.usage_mb}MB/{memoryHealth.storage.total_mb}MB
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={memoryHealth.storage.usage_percent}
                  color={memoryHealth.storage.usage_percent > 80 ? 'warning' : 'success'}
                  sx={{ height: 6, borderRadius: 3 }}
                />
                <Typography variant="caption" color="text.secondary">
                  {memoryHealth.storage.usage_percent}% used
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Growth Rate:</Typography>
                <Tooltip title="New memories per day">
                  <Chip
                    size="small"
                    label={`+${memoryHealth.storage.growth_memories_per_day}/day`}
                    color="info"
                    icon={<TrendingUp />}
                    variant="outlined"
                  />
                </Tooltip>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Last Cleanup:</Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatLastCleanup(memoryHealth.storage.last_cleanup)}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body2">Archived:</Typography>
                <Chip
                  size="small"
                  label={`${memoryHealth.storage.archived_memories} memories`}
                  color="warning"
                  variant="outlined"
                />
              </Box>
            </Box>
          </Grid>

          {/* Memory Operations Live Feed */}
          <Grid item xs={12}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">
                Memory Operations Live Feed
              </Typography>
              <Button
                size="small"
                onClick={() => setExpandedOperations(!expandedOperations)}
                endIcon={expandedOperations ? <ExpandLess /> : <ExpandMore />}
              >
                {expandedOperations ? 'Show Less' : `View All (${memoryHealth.operations.length})`}
              </Button>
            </Box>
            
            <Card variant="outlined">
              <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                <List sx={{ p: 0 }}>
                  <Collapse in={!expandedOperations}>
                    {memoryHealth.operations.slice(0, 3).map((operation, index) => (
                      <ListItem key={index} sx={{ px: 1, py: 0.5 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ width: 28, height: 28 }}>
                            {getOperationIcon(operation.operation)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Typography variant="body2" fontWeight="bold">
                                {operation.employee_name}
                              </Typography>
                              <Chip
                                size="small"
                                label={operation.operation}
                                color={getOperationColor(operation.operation) as any}
                                variant="outlined"
                              />
                              {operation.type && (
                                <Chip
                                  size="small"
                                  label={operation.type}
                                  variant="outlined"
                                />
                              )}
                              {operation.result_count && (
                                <Chip
                                  size="small"
                                  label={`${operation.result_count} results`}
                                  color="info"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {operation.description}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatRelativeTime(operation.timestamp)}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </Collapse>
                  
                  <Collapse in={expandedOperations}>
                    {memoryHealth.operations.map((operation, index) => (
                      <ListItem key={index} sx={{ px: 1, py: 0.5 }}>
                        <ListItemAvatar>
                          <Avatar sx={{ width: 28, height: 28 }}>
                            {getOperationIcon(operation.operation)}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Typography variant="body2" fontWeight="bold">
                                {operation.employee_name}
                              </Typography>
                              <Chip
                                size="small"
                                label={operation.operation}
                                color={getOperationColor(operation.operation) as any}
                                variant="outlined"
                              />
                              {operation.type && (
                                <Chip
                                  size="small"
                                  label={operation.type}
                                  variant="outlined"
                                />
                              )}
                              {operation.result_count && (
                                <Chip
                                  size="small"
                                  label={`${operation.result_count} results`}
                                  color="info"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" color="text.secondary">
                                {operation.description}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {formatRelativeTime(operation.timestamp)}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                    ))}
                  </Collapse>
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
};

export default MemorySystemMonitor;