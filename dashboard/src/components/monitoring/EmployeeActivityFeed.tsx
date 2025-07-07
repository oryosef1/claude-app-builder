import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Button,
  Switch,
  FormControlLabel,
  Tooltip,
  Fade,
} from '@mui/material';
import {
  Person,
  PlayArrow,
  CheckCircle,
  Memory,
  Storage,
  Update,
  Refresh,
  Pause,
  ExpandMore,
  ExpandLess,
} from '@mui/icons-material';
import { EmployeeActivity } from '@/services/monitoring';

interface EmployeeActivityFeedProps {
  activities: EmployeeActivity[];
  isLoading?: boolean;
  autoRefresh?: boolean;
  onToggleAutoRefresh?: (enabled: boolean) => void;
  onRefresh?: () => void;
}

const EmployeeActivityFeed: React.FC<EmployeeActivityFeedProps> = ({
  activities,
  isLoading = false,
  autoRefresh = true,
  onToggleAutoRefresh,
  onRefresh,
}) => {
  const [expanded, setExpanded] = useState(false);
  const [newActivityCount, setNewActivityCount] = useState(0);
  const [lastActivityCount, setLastActivityCount] = useState(activities.length);

  // Track new activities for animation
  useEffect(() => {
    if (activities.length > lastActivityCount) {
      setNewActivityCount(activities.length - lastActivityCount);
      const timer = setTimeout(() => setNewActivityCount(0), 3000);
      return () => clearTimeout(timer);
    }
    setLastActivityCount(activities.length);
  }, [activities.length, lastActivityCount]);

  const getActivityIcon = (type: EmployeeActivity['activity_type']) => {
    switch (type) {
      case 'task_started':
        return <PlayArrow color="primary" />;
      case 'task_completed':
        return <CheckCircle color="success" />;
      case 'context_loaded':
        return <Memory color="info" />;
      case 'memory_stored':
        return <Storage color="secondary" />;
      case 'status_update':
        return <Update color="action" />;
      default:
        return <Person color="disabled" />;
    }
  };

  const getActivityColor = (type: EmployeeActivity['activity_type']) => {
    switch (type) {
      case 'task_started':
        return 'primary';
      case 'task_completed':
        return 'success';
      case 'context_loaded':
        return 'info';
      case 'memory_stored':
        return 'secondary';
      case 'status_update':
        return 'default';
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

  const formatDuration = (durationMs?: number) => {
    if (!durationMs) return null;
    const seconds = Math.floor(durationMs / 1000);
    const minutes = Math.floor(seconds / 60);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    }
    return `${seconds}s`;
  };

  const displayedActivities = expanded ? activities : activities.slice(0, 7);

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Person color="primary" />
            Employee Activity Stream
            {newActivityCount > 0 && (
              <Fade in={true}>
                <Chip
                  size="small"
                  label={`+${newActivityCount}`}
                  color="success"
                  variant="filled"
                />
              </Fade>
            )}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControlLabel
              control={
                <Switch
                  checked={autoRefresh}
                  onChange={(e) => onToggleAutoRefresh?.(e.target.checked)}
                  size="small"
                />
              }
              label="Auto-refresh"
              sx={{ mr: 1 }}
            />
            
            <Tooltip title="Refresh now">
              <Button
                size="small"
                onClick={onRefresh}
                disabled={isLoading}
                startIcon={<Refresh />}
              >
                Refresh
              </Button>
            </Tooltip>
            
            <Tooltip title={autoRefresh ? "Pause stream" : "Resume stream"}>
              <Button
                size="small"
                variant="outlined"
                onClick={() => onToggleAutoRefresh?.(!autoRefresh)}
                startIcon={autoRefresh ? <Pause /> : <PlayArrow />}
              >
                {autoRefresh ? 'Pause' : 'Resume'}
              </Button>
            </Tooltip>
          </Box>
        </Box>

        {activities.length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography color="text.secondary">
              No recent employee activity
            </Typography>
          </Box>
        ) : (
          <>
            <List sx={{ p: 0 }}>
              {displayedActivities.map((activity, index) => (
                <ListItem
                  key={`${activity.timestamp}-${activity.employee_id}-${index}`}
                  sx={{
                    px: 0,
                    py: 1,
                    borderBottom: index < displayedActivities.length - 1 ? 1 : 0,
                    borderColor: 'divider',
                    backgroundColor: index < newActivityCount ? 'action.hover' : 'transparent',
                    transition: 'background-color 0.3s',
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: 'background.paper', border: 1, borderColor: 'divider' }}>
                      {getActivityIcon(activity.activity_type)}
                    </Avatar>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Box component="span" sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>
                          {activity.employee_name}
                        </Box>
                        <Chip
                          size="small"
                          label={activity.activity_type.replace('_', ' ')}
                          color={getActivityColor(activity.activity_type) as any}
                          variant="outlined"
                        />
                        {activity.success !== undefined && (
                          <Chip
                            size="small"
                            label={activity.success ? 'Success' : 'Failed'}
                            color={activity.success ? 'success' : 'error'}
                            variant="filled"
                          />
                        )}
                        {activity.duration_ms && (
                          <Chip
                            size="small"
                            label={formatDuration(activity.duration_ms)}
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {activity.description}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatRelativeTime(activity.timestamp)} • {activity.employee_role}
                        </Typography>
                      </Box>
                    }
                  />
                </ListItem>
              ))}
            </List>

            {activities.length > 7 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => setExpanded(!expanded)}
                  endIcon={expanded ? <ExpandLess /> : <ExpandMore />}
                >
                  {expanded ? 'Show Less' : `View All (${activities.length})`}
                </Button>
              </Box>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default EmployeeActivityFeed;