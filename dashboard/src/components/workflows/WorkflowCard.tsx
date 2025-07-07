import React from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  Chip,
  Button,
  IconButton,
  LinearProgress,
  Divider,
  Tooltip,
  Avatar,
  AvatarGroup,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Pause,
  Settings,
  Visibility,
  CheckCircle,
  Error,
  Warning,
  Schedule,
  Group,
  Memory,
  Timeline,
} from '@mui/icons-material';

export interface WorkflowCardProps {
  id: string;
  name: string;
  type: 'corporate' | 'development' | 'testing' | 'deployment';
  status: 'running' | 'stopped' | 'paused' | 'completed' | 'failed';
  progress: number;
  employees: string[];
  startTime?: Date;
  estimatedCompletion?: Date;
  lastRun?: Date;
  description: string;
  memoryEnabled?: boolean;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onPause: (id: string) => void;
  onConfigure: (id: string) => void;
  onView: (id: string) => void;
}

// Employee ID to name mapping (simplified)
const employeeNames: Record<string, string> = {
  'emp_001_pm': 'Alex (PM)',
  'emp_002_tl': 'Taylor (TL)',
  'emp_003_qd': 'Morgan (QD)',
  'emp_004_sd': 'Sam (SD)',
  'emp_005_jd': 'Jordan (JD)',
  'emp_006_qe': 'Morgan (QE)',
  'emp_007_te': 'Casey (TE)',
  'emp_008_do': 'Drew (DO)',
  'emp_009_sre': 'Riley (SRE)',
  'emp_010_se': 'Avery (SE)',
  'emp_011_tw': 'Blake (TW)',
  'emp_012_ux': 'Quinn (UX)',
  'emp_013_be': 'Sage (BE)',
};

// Status color mapping
const getStatusColor = (status: WorkflowCardProps['status']): 'primary' | 'success' | 'error' | 'warning' | 'default' => {
  switch (status) {
    case 'running': return 'primary';
    case 'completed': return 'success';
    case 'failed': return 'error';
    case 'paused': return 'warning';
    default: return 'default';
  }
};

// Status icon mapping
const getStatusIcon = (status: WorkflowCardProps['status']) => {
  switch (status) {
    case 'running': return <PlayArrow fontSize="small" />;
    case 'completed': return <CheckCircle fontSize="small" />;
    case 'failed': return <Error fontSize="small" />;
    case 'paused': return <Warning fontSize="small" />;
    default: return <Stop fontSize="small" />;
  }
};

// Type color mapping
const getTypeColor = (type: WorkflowCardProps['type']) => {
  switch (type) {
    case 'corporate': return '#1976d2';
    case 'development': return '#2e7d32';
    case 'testing': return '#ed6c02';
    case 'deployment': return '#9c27b0';
    default: return '#757575';
  }
};

const WorkflowCard: React.FC<WorkflowCardProps> = ({
  id,
  name,
  type,
  status,
  progress,
  employees,
  startTime,
  estimatedCompletion,
  lastRun,
  description,
  memoryEnabled = false,
  onStart,
  onStop,
  onPause,
  onConfigure,
  onView,
}) => {
  const isRunning = status === 'running';
  const isPaused = status === 'paused';
  const isCompleted = status === 'completed';
  const isFailed = status === 'failed';

  const formatTime = (date: Date) => {
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTimeRemaining = () => {
    if (!estimatedCompletion || !isRunning) return null;
    const now = new Date();
    const remaining = estimatedCompletion.getTime() - now.getTime();
    if (remaining <= 0) return 'Overdue';
    
    const hours = Math.floor(remaining / (1000 * 60 * 60));
    const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m remaining`;
    }
    return `${minutes}m remaining`;
  };

  return (
    <Card 
      sx={{ 
        height: '100%',
        position: 'relative',
        transition: 'all 0.2s',
        '&:hover': {
          boxShadow: (theme) => theme.shadows[8],
          transform: 'translateY(-2px)',
        },
        borderLeft: `4px solid ${getTypeColor(type)}`,
      }}
    >
      <CardContent sx={{ pb: 2 }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="start" mb={2}>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography variant="h6" gutterBottom noWrap title={name}>
              {name}
            </Typography>
            <Box display="flex" alignItems="center" gap={1} mb={1}>
              <Chip 
                label={status}
                color={getStatusColor(status)}
                size="small"
                icon={getStatusIcon(status)}
                sx={{ fontWeight: 600 }}
              />
              <Chip 
                label={type}
                size="small"
                variant="outlined"
                sx={{ 
                  color: getTypeColor(type),
                  borderColor: getTypeColor(type),
                }}
              />
            </Box>
          </Box>
          <IconButton
            size="small"
            onClick={() => onConfigure(id)}
            sx={{ flexShrink: 0 }}
          >
            <Settings />
          </IconButton>
        </Box>

        {/* Description */}
        <Typography 
          variant="body2" 
          color="text.secondary" 
          mb={2}
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {description}
        </Typography>

        {/* Progress Bar (for running workflows) */}
        {isRunning && (
          <Box mb={2}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
              <Typography variant="body2" fontWeight={500}>
                Progress
              </Typography>
              <Typography variant="body2" color="primary">
                {Math.round(progress)}%
              </Typography>
            </Box>
            <LinearProgress 
              variant="determinate" 
              value={progress} 
              sx={{ 
                borderRadius: 2, 
                height: 6,
                backgroundColor: 'rgba(0,0,0,0.1)',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 2,
                },
              }}
            />
          </Box>
        )}

        {/* Employee Assignment */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
          <Box display="flex" alignItems="center" gap={1}>
            <Group fontSize="small" color="action" />
            <Typography variant="body2" color="text.secondary">
              {employees.length} employee{employees.length !== 1 ? 's' : ''}
            </Typography>
          </Box>
          <AvatarGroup max={3} sx={{ '& .MuiAvatar-root': { width: 24, height: 24, fontSize: '0.75rem' } }}>
            {employees.map((empId, index) => (
              <Tooltip key={empId} title={employeeNames[empId] || empId}>
                <Avatar sx={{ bgcolor: getTypeColor(type) }}>
                  {(employeeNames[empId] || empId).charAt(0)}
                </Avatar>
              </Tooltip>
            ))}
          </AvatarGroup>
        </Box>

        {/* Memory Integration Indicator */}
        {memoryEnabled && (
          <Box display="flex" alignItems="center" gap={1} mb={2}>
            <Memory fontSize="small" color="primary" />
            <Typography variant="caption" color="primary">
              Memory integration enabled
            </Typography>
          </Box>
        )}

        {/* Timing Information */}
        <Box mb={2}>
          {startTime && isRunning && (
            <Typography variant="caption" color="text.secondary" display="block">
              <Schedule fontSize="inherit" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
              Started: {formatTime(startTime)}
            </Typography>
          )}
          
          {estimatedCompletion && isRunning && (
            <Typography variant="caption" color="text.secondary" display="block">
              <Timeline fontSize="inherit" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
              {getTimeRemaining()}
            </Typography>
          )}
          
          {lastRun && !isRunning && (
            <Typography variant="caption" color="text.secondary" display="block">
              <Schedule fontSize="inherit" sx={{ mr: 0.5, verticalAlign: 'middle' }} />
              Last run: {formatTime(lastRun)}
            </Typography>
          )}
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Action Buttons */}
        <Box display="flex" gap={1} flexWrap="wrap">
          {/* Primary Action Button */}
          {isRunning ? (
            <>
              <Button
                size="small"
                variant="outlined"
                color="warning"
                startIcon={<Pause />}
                onClick={() => onPause(id)}
                sx={{ minWidth: 80 }}
              >
                Pause
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<Stop />}
                onClick={() => onStop(id)}
                sx={{ minWidth: 80 }}
              >
                Stop
              </Button>
            </>
          ) : isPaused ? (
            <>
              <Button
                size="small"
                variant="contained"
                color="primary"
                startIcon={<PlayArrow />}
                onClick={() => onStart(id)}
                sx={{ minWidth: 80 }}
              >
                Resume
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                startIcon={<Stop />}
                onClick={() => onStop(id)}
                sx={{ minWidth: 80 }}
              >
                Stop
              </Button>
            </>
          ) : (
            <Button
              size="small"
              variant="contained"
              color="primary"
              startIcon={<PlayArrow />}
              onClick={() => onStart(id)}
              sx={{ minWidth: 80 }}
              disabled={isFailed}
            >
              Start
            </Button>
          )}

          {/* Secondary Actions */}
          <Button
            size="small"
            variant="outlined"
            startIcon={<Visibility />}
            onClick={() => onView(id)}
            sx={{ minWidth: 80 }}
          >
            View
          </Button>
        </Box>

        {/* Status-specific Information */}
        {isFailed && (
          <Box mt={2}>
            <Typography variant="caption" color="error" display="block">
              ⚠️ Workflow failed. Check logs for details.
            </Typography>
          </Box>
        )}

        {isCompleted && (
          <Box mt={2}>
            <Typography variant="caption" color="success.main" display="block">
              ✅ Workflow completed successfully
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkflowCard;