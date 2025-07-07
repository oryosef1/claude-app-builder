import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  IconButton,
  Divider,
  LinearProgress,
  Avatar,
  Collapse,
  Alert,
  Tooltip,
  Grid,
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  CheckCircle,
  Error,
  Warning,
  Schedule,
  Memory,
  Speed,
  Group,
  Timeline,
  PlayArrow,
  Pause,
  Stop,
  Refresh,
} from '@mui/icons-material';

export interface WorkflowStep {
  id: string;
  name: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  employeeId?: string;
  startTime?: Date;
  endTime?: Date;
  duration?: number;
  progress?: number;
  logs?: string[];
  memoryOperations?: {
    retrieved: number;
    stored: number;
  };
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  name: string;
  status: 'running' | 'completed' | 'failed' | 'paused';
  startTime: Date;
  endTime?: Date;
  progress: number;
  currentStep?: string;
  steps: WorkflowStep[];
  employees: string[];
  memoryEnabled: boolean;
  statistics: {
    totalSteps: number;
    completedSteps: number;
    failedSteps: number;
    activeEmployees: number;
    memoryOperations: number;
  };
}

export interface WorkflowMonitorProps {
  execution: WorkflowExecution;
  onPause?: (executionId: string) => void;
  onResume?: (executionId: string) => void;
  onStop?: (executionId: string) => void;
  onRefresh?: (executionId: string) => void;
}

// Employee names mapping
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

const getStepStatusColor = (status: WorkflowStep['status']) => {
  switch (status) {
    case 'running': return 'primary';
    case 'completed': return 'success';
    case 'failed': return 'error';
    case 'skipped': return 'warning';
    default: return 'default';
  }
};

const getStepStatusIcon = (status: WorkflowStep['status']) => {
  switch (status) {
    case 'running': return <PlayArrow color="primary" />;
    case 'completed': return <CheckCircle color="success" />;
    case 'failed': return <Error color="error" />;
    case 'skipped': return <Warning color="warning" />;
    default: return <Schedule color="disabled" />;
  }
};

const formatDuration = (seconds: number) => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  if (hours > 0) {
    return `${hours}h ${minutes}m ${secs}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
};

const WorkflowMonitor: React.FC<WorkflowMonitorProps> = ({
  execution,
  onPause,
  onResume,
  onStop,
  onRefresh,
}) => {
  const [expandedSteps, setExpandedSteps] = useState<Set<string>>(new Set());
  const [realTimeUpdate, setRealTimeUpdate] = useState(new Date());

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRealTimeUpdate(new Date());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleStepToggle = (stepId: string) => {
    setExpandedSteps(prev => {
      const newSet = new Set(prev);
      if (newSet.has(stepId)) {
        newSet.delete(stepId);
      } else {
        newSet.add(stepId);
      }
      return newSet;
    });
  };

  const getElapsedTime = () => {
    const now = execution.endTime || realTimeUpdate;
    const elapsed = Math.floor((now.getTime() - execution.startTime.getTime()) / 1000);
    return formatDuration(elapsed);
  };

  const currentStep = execution.steps.find(step => step.id === execution.currentStep);
  const isRunning = execution.status === 'running';
  const isPaused = execution.status === 'paused';

  return (
    <Card>
      <CardContent>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="start" mb={3}>
          <Box>
            <Typography variant="h6" gutterBottom>
              {execution.name}
            </Typography>
            <Box display="flex" alignItems="center" gap={1}>
              <Chip 
                label={execution.status}
                color={getStepStatusColor(execution.status as any)}
                size="small"
              />
              <Typography variant="body2" color="text.secondary">
                {getElapsedTime()} elapsed
              </Typography>
            </Box>
          </Box>
          <Box display="flex" gap={1}>
            {isRunning && onPause && (
              <IconButton size="small" onClick={() => onPause(execution.id)}>
                <Pause />
              </IconButton>
            )}
            {isPaused && onResume && (
              <IconButton size="small" onClick={() => onResume(execution.id)}>
                <PlayArrow />
              </IconButton>
            )}
            {(isRunning || isPaused) && onStop && (
              <IconButton size="small" onClick={() => onStop(execution.id)}>
                <Stop />
              </IconButton>
            )}
            {onRefresh && (
              <IconButton size="small" onClick={() => onRefresh(execution.id)}>
                <Refresh />
              </IconButton>
            )}
          </Box>
        </Box>

        {/* Progress Bar */}
        <Box mb={3}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Typography variant="body2" fontWeight={500}>
              Overall Progress
            </Typography>
            <Typography variant="body2" color="primary">
              {Math.round(execution.progress)}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={execution.progress} 
            sx={{ 
              borderRadius: 2, 
              height: 8,
              backgroundColor: 'rgba(0,0,0,0.1)',
            }}
          />
        </Box>

        {/* Current Step */}
        {currentStep && isRunning && (
          <Alert severity="info" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Current:</strong> {currentStep.name}
              {currentStep.employeeId && (
                <span> • Assigned to {employeeNames[currentStep.employeeId]}</span>
              )}
            </Typography>
          </Alert>
        )}

        {/* Statistics Grid */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h6" color="primary">
                {execution.statistics.completedSteps}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Completed
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h6" color="error">
                {execution.statistics.failedSteps}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Failed
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h6" color="action">
                {execution.statistics.activeEmployees}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Active
              </Typography>
            </Box>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Box textAlign="center">
              <Typography variant="h6" color="secondary">
                {execution.statistics.memoryOperations}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                Memory Ops
              </Typography>
            </Box>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }} />

        {/* Steps List */}
        <Typography variant="h6" gutterBottom>
          Workflow Steps
        </Typography>
        <List>
          {execution.steps.map((step, index) => (
            <React.Fragment key={step.id}>
              <ListItem
                button
                onClick={() => handleStepToggle(step.id)}
                sx={{
                  borderRadius: 1,
                  mb: 0.5,
                  bgcolor: step.status === 'running' ? 'action.hover' : 'transparent',
                }}
              >
                <ListItemIcon>
                  {getStepStatusIcon(step.status)}
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box display="flex" alignItems="center" gap={1}>
                      <Typography variant="body1">
                        {index + 1}. {step.name}
                      </Typography>
                      {step.employeeId && (
                        <Tooltip title={employeeNames[step.employeeId]}>
                          <Avatar sx={{ width: 20, height: 20, fontSize: '0.75rem' }}>
                            {employeeNames[step.employeeId]?.charAt(0) || 'U'}
                          </Avatar>
                        </Tooltip>
                      )}
                    </Box>
                  }
                  secondary={
                    <Box display="flex" alignItems="center" gap={2} mt={0.5}>
                      {step.duration && (
                        <Typography variant="caption">
                          <Schedule fontSize="inherit" sx={{ mr: 0.5 }} />
                          {formatDuration(step.duration)}
                        </Typography>
                      )}
                      {step.memoryOperations && (
                        <Typography variant="caption">
                          <Memory fontSize="inherit" sx={{ mr: 0.5 }} />
                          {step.memoryOperations.retrieved}R/{step.memoryOperations.stored}S
                        </Typography>
                      )}
                      {step.progress !== undefined && step.status === 'running' && (
                        <Typography variant="caption">
                          {Math.round(step.progress)}%
                        </Typography>
                      )}
                    </Box>
                  }
                />
                <IconButton size="small">
                  {expandedSteps.has(step.id) ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </ListItem>

              {/* Expanded Step Details */}
              <Collapse in={expandedSteps.has(step.id)} timeout="auto" unmountOnExit>
                <Box sx={{ pl: 6, pr: 2, pb: 2 }}>
                  {step.status === 'running' && step.progress !== undefined && (
                    <Box mb={2}>
                      <LinearProgress 
                        variant="determinate" 
                        value={step.progress} 
                        sx={{ borderRadius: 1, height: 4 }}
                      />
                    </Box>
                  )}
                  
                  <Grid container spacing={2}>
                    {step.startTime && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">
                          Start Time: {step.startTime.toLocaleString()}
                        </Typography>
                      </Grid>
                    )}
                    {step.endTime && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="caption" color="text.secondary">
                          End Time: {step.endTime.toLocaleString()}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>

                  {step.logs && step.logs.length > 0 && (
                    <Box mt={2}>
                      <Typography variant="caption" color="text.secondary" gutterBottom>
                        Recent Logs:
                      </Typography>
                      <Box 
                        sx={{ 
                          bgcolor: 'grey.100', 
                          p: 1, 
                          borderRadius: 1, 
                          fontFamily: 'monospace',
                          fontSize: '0.75rem',
                          maxHeight: 120,
                          overflow: 'auto',
                        }}
                      >
                        {step.logs.slice(-5).map((log, logIndex) => (
                          <Typography 
                            key={logIndex} 
                            variant="caption" 
                            component="div"
                            sx={{ fontFamily: 'inherit' }}
                          >
                            {log}
                          </Typography>
                        ))}
                      </Box>
                    </Box>
                  )}
                </Box>
              </Collapse>
            </React.Fragment>
          ))}
        </List>

        {/* Memory Integration Status */}
        {execution.memoryEnabled && (
          <Box mt={3}>
            <Alert severity="info" icon={<Memory />}>
              <Typography variant="body2">
                Memory integration enabled • {execution.statistics.memoryOperations} operations performed
              </Typography>
            </Alert>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default WorkflowMonitor;