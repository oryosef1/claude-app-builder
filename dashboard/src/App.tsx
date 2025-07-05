import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  CssBaseline,
  ThemeProvider,
  createTheme,
  AppBar,
  Toolbar,
  Typography,
  Grid,
  Paper,
  Card,
  CardContent,
  CardActions,
  Button,
  LinearProgress,
  Alert,
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Pause,
  Task,
  Memory,
  CheckCircle,
  Error,
  Warning,
  Info,
} from '@mui/icons-material';
import { WorkflowState, TaskItem } from './types/workflow';
import { apiService } from './services/api';

// Create Material-UI theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
  },
});

const App: React.FC = () => {
  const [workflowState, setWorkflowState] = useState<WorkflowState>({
    phase: 'idle',
    status: 'stopped',
    progress: 0,
    output: [],
  });
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [memory, setMemory] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [memoryDialogOpen, setMemoryDialogOpen] = useState(false);

  // Fetch initial data
  useEffect(() => {
    fetchData();
    // Set up polling for real-time updates
    const interval = setInterval(fetchData, 2000);
    return () => clearInterval(interval);
  }, []);

  const fetchData = async () => {
    try {
      const [statusResponse, tasksResponse, memoryResponse] = await Promise.all([
        apiService.getWorkflowStatus(),
        apiService.getTasks(),
        apiService.getMemory(),
      ]);

      setWorkflowState(statusResponse.state);
      setTasks(tasksResponse.tasks);
      setMemory(memoryResponse.content);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch data:', err);
      setError('Failed to connect to API server');
    }
  };

  const handleWorkflowAction = async (action: 'start' | 'stop' | 'pause' | 'resume') => {
    setLoading(true);
    try {
      switch (action) {
        case 'start':
          await apiService.startWorkflow();
          break;
        case 'stop':
          await apiService.stopWorkflow();
          break;
        case 'pause':
          await apiService.pauseWorkflow();
          break;
        case 'resume':
          await apiService.resumeWorkflow();
          break;
      }
      await fetchData();
    } catch (err) {
      setError(`Failed to ${action} workflow`);
    } finally {
      setLoading(false);
    }
  };

  const handleMemoryUpdate = async () => {
    try {
      await apiService.updateMemory(memory);
      setMemoryDialogOpen(false);
      await fetchData();
    } catch (err) {
      setError('Failed to update memory');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'running':
        return 'success';
      case 'paused':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'default';
    }
  };

  const getPhaseIcon = (phase: string) => {
    switch (phase) {
      case 'complete':
        return <CheckCircle color="success" />;
      case 'error':
        return <Error color="error" />;
      default:
        return <Info color="primary" />;
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ flexGrow: 1 }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Claude App Builder Dashboard
            </Typography>
            <Button color="inherit" onClick={() => setMemoryDialogOpen(true)}>
              <Memory sx={{ mr: 1 }} />
              Memory
            </Button>
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}

          <Grid container spacing={3}>
            {/* Workflow Status */}
            <Grid item xs={12} md={8}>
              <Card>
                <CardContent>
                  <Typography variant="h5" gutterBottom>
                    Workflow Status
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    {getPhaseIcon(workflowState.phase)}
                    <Typography variant="h6" sx={{ ml: 1, mr: 2 }}>
                      {workflowState.phase.replace('-', ' ').toUpperCase()}
                    </Typography>
                    <Chip
                      label={workflowState.status.toUpperCase()}
                      color={getStatusColor(workflowState.status) as any}
                      size="small"
                    />
                  </Box>
                  <LinearProgress 
                    variant="determinate" 
                    value={workflowState.progress} 
                    sx={{ mb: 2 }}
                  />
                  <Typography variant="body2" color="text.secondary">
                    Progress: {workflowState.progress}%
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    startIcon={<PlayArrow />}
                    onClick={() => handleWorkflowAction('start')}
                    disabled={loading || workflowState.status === 'running'}
                    variant="contained"
                    color="primary"
                  >
                    Start
                  </Button>
                  <Button
                    startIcon={<Stop />}
                    onClick={() => handleWorkflowAction('stop')}
                    disabled={loading || workflowState.status === 'stopped'}
                    variant="outlined"
                    color="secondary"
                  >
                    Stop
                  </Button>
                  <Button
                    startIcon={<Pause />}
                    onClick={() => handleWorkflowAction('pause')}
                    disabled={loading || workflowState.status !== 'running'}
                    variant="outlined"
                  >
                    Pause
                  </Button>
                  <Button
                    onClick={() => handleWorkflowAction('resume')}
                    disabled={loading || workflowState.status !== 'paused'}
                    variant="outlined"
                  >
                    Resume
                  </Button>
                </CardActions>
              </Card>
            </Grid>

            {/* Task Management */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Typography variant="h5" gutterBottom>
                    <Task sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Tasks
                  </Typography>
                  <List dense>
                    {tasks.map((task) => (
                      <ListItem key={task.id}>
                        <ListItemIcon>
                          {task.status === 'completed' ? (
                            <CheckCircle color="success" />
                          ) : task.status === 'in_progress' ? (
                            <Warning color="warning" />
                          ) : (
                            <Info color="action" />
                          )}
                        </ListItemIcon>
                        <ListItemText
                          primary={task.content}
                          secondary={`Priority: ${task.priority} | Status: ${task.status}`}
                        />
                      </ListItem>
                    ))}
                  </List>
                </CardContent>
              </Card>
            </Grid>

            {/* Output Console */}
            <Grid item xs={12}>
              <Card>
                <CardContent>
                  <Typography variant="h5" gutterBottom>
                    Live Output
                  </Typography>
                  <Paper 
                    sx={{ 
                      p: 2, 
                      backgroundColor: '#1e1e1e', 
                      color: '#fff', 
                      fontFamily: 'monospace',
                      maxHeight: 400,
                      overflowY: 'auto'
                    }}
                  >
                    {workflowState.output.length > 0 ? (
                      workflowState.output.map((line, index) => (
                        <div key={index}>{line}</div>
                      ))
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No output yet. Start a workflow to see live output.
                      </Typography>
                    )}
                  </Paper>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Container>

        {/* Memory Editor Dialog */}
        <Dialog 
          open={memoryDialogOpen} 
          onClose={() => setMemoryDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>System Memory Editor</DialogTitle>
          <DialogContent>
            <TextField
              multiline
              rows={20}
              value={memory}
              onChange={(e) => setMemory(e.target.value)}
              fullWidth
              variant="outlined"
              placeholder="Enter system memory content..."
              sx={{ fontFamily: 'monospace' }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMemoryDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleMemoryUpdate} variant="contained">
              Save
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </ThemeProvider>
  );
};

export default App;