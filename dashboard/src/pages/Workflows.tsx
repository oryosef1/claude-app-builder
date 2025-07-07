import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Button,
  Chip,
  LinearProgress,
  Divider,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Alert,
  Tabs,
  Tab,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  Refresh,
  Settings,
  Visibility,
  Edit,
  Delete,
  Add,
  CheckCircle,
  Error,
  Warning,
  Schedule,
  Group,
  Memory,
  Speed,
  Timeline,
} from '@mui/icons-material';

// Workflow types
interface Workflow {
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
  configuration: Record<string, any>;
}

// Mock workflow data
const mockWorkflows: Workflow[] = [
  {
    id: 'wf-001',
    name: 'AI Memory Management System',
    type: 'development',
    status: 'completed',
    progress: 100,
    employees: ['emp_004_sd', 'emp_002_tl', 'emp_006_qe'],
    startTime: new Date('2025-07-06T10:00:00'),
    lastRun: new Date('2025-07-07T14:30:00'),
    description: 'Implement comprehensive AI memory management with vector database integration',
    configuration: {
      maxConcurrentEmployees: 3,
      timeout: 3600,
      retryAttempts: 2,
      memoryEnabled: true,
    },
  },
  {
    id: 'wf-002',
    name: 'Master Control Dashboard',
    type: 'development',
    status: 'running',
    progress: 75,
    employees: ['emp_012_ux', 'emp_004_sd', 'emp_011_tw'],
    startTime: new Date('2025-07-07T09:00:00'),
    estimatedCompletion: new Date('2025-07-07T18:00:00'),
    description: 'Build comprehensive control dashboard for AI company operations',
    configuration: {
      maxConcurrentEmployees: 3,
      timeout: 7200,
      retryAttempts: 1,
      memoryEnabled: true,
    },
  },
  {
    id: 'wf-003',
    name: 'Corporate Infrastructure Testing',
    type: 'testing',
    status: 'stopped',
    progress: 0,
    employees: ['emp_006_qe', 'emp_007_te', 'emp_003_qd'],
    description: 'Comprehensive testing of all corporate infrastructure components',
    configuration: {
      maxConcurrentEmployees: 3,
      timeout: 1800,
      retryAttempts: 3,
      memoryEnabled: false,
    },
  },
];

// Workflow templates
const workflowTemplates = [
  {
    id: 'template-dev',
    name: 'Development Workflow',
    type: 'development',
    description: 'Standard development workflow with TDD approach',
    defaultEmployees: ['emp_004_sd', 'emp_002_tl', 'emp_006_qe'],
  },
  {
    id: 'template-test',
    name: 'Testing Workflow',
    type: 'testing',
    description: 'Comprehensive testing workflow for quality assurance',
    defaultEmployees: ['emp_006_qe', 'emp_007_te', 'emp_003_qd'],
  },
  {
    id: 'template-deploy',
    name: 'Deployment Workflow',
    type: 'deployment',
    description: 'Production deployment with infrastructure validation',
    defaultEmployees: ['emp_008_do', 'emp_009_sre', 'emp_010_se'],
  },
];

// Status color mapping
const getStatusColor = (status: Workflow['status']) => {
  switch (status) {
    case 'running': return 'primary';
    case 'completed': return 'success';
    case 'failed': return 'error';
    case 'paused': return 'warning';
    default: return 'default';
  }
};

// Status icon mapping
const getStatusIcon = (status: Workflow['status']) => {
  switch (status) {
    case 'running': return <PlayArrow />;
    case 'completed': return <CheckCircle />;
    case 'failed': return <Error />;
    case 'paused': return <Warning />;
    default: return <Stop />;
  }
};

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`workflow-tabpanel-${index}`}
      aria-labelledby={`workflow-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
};

const WorkflowsPage: React.FC = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>(mockWorkflows);
  const [selectedTab, setSelectedTab] = useState(0);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [selectedWorkflow, setSelectedWorkflow] = useState<Workflow | null>(null);
  const [newWorkflowName, setNewWorkflowName] = useState('');
  const [newWorkflowTemplate, setNewWorkflowTemplate] = useState('');

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setWorkflows(prev => prev.map(wf => {
        if (wf.status === 'running' && wf.progress < 100) {
          return {
            ...wf,
            progress: Math.min(100, wf.progress + Math.random() * 5),
          };
        }
        return wf;
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleStartWorkflow = (workflowId: string) => {
    setWorkflows(prev => prev.map(wf => 
      wf.id === workflowId 
        ? { ...wf, status: 'running', startTime: new Date(), progress: wf.progress || 0 }
        : wf
    ));
  };

  const handleStopWorkflow = (workflowId: string) => {
    setWorkflows(prev => prev.map(wf => 
      wf.id === workflowId 
        ? { ...wf, status: 'stopped', lastRun: new Date() }
        : wf
    ));
  };

  const handleCreateWorkflow = () => {
    if (newWorkflowName && newWorkflowTemplate) {
      const template = workflowTemplates.find(t => t.id === newWorkflowTemplate);
      if (template) {
        const newWorkflow: Workflow = {
          id: `wf-${Date.now()}`,
          name: newWorkflowName,
          type: template.type as Workflow['type'],
          status: 'stopped',
          progress: 0,
          employees: template.defaultEmployees,
          description: template.description,
          configuration: {
            maxConcurrentEmployees: 3,
            timeout: 3600,
            retryAttempts: 2,
            memoryEnabled: true,
          },
        };
        setWorkflows(prev => [...prev, newWorkflow]);
        setCreateDialogOpen(false);
        setNewWorkflowName('');
        setNewWorkflowTemplate('');
      }
    }
  };

  const runningWorkflows = workflows.filter(wf => wf.status === 'running');
  const completedWorkflows = workflows.filter(wf => wf.status === 'completed');
  const failedWorkflows = workflows.filter(wf => wf.status === 'failed');

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom>
            Workflow Control Center
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage AI company workflows, monitor progress, and configure automation settings
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setCreateDialogOpen(true)}
          sx={{ height: 'fit-content' }}
        >
          Create Workflow
        </Button>
      </Box>

      {/* Status Overview Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <PlayArrow color="primary" />
                <Box>
                  <Typography variant="h6">{runningWorkflows.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Running
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <CheckCircle color="success" />
                <Box>
                  <Typography variant="h6">{completedWorkflows.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Completed
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Error color="error" />
                <Box>
                  <Typography variant="h6">{failedWorkflows.length}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Failed
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" gap={2}>
                <Group color="action" />
                <Box>
                  <Typography variant="h6">
                    {workflows.reduce((acc, wf) => acc + wf.employees.length, 0)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Employees Active
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Main Content Tabs */}
      <Card>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={selectedTab}
            onChange={(e, newValue) => setSelectedTab(newValue)}
            aria-label="workflow tabs"
          >
            <Tab label="Active Workflows" icon={<Timeline />} iconPosition="start" />
            <Tab label="Workflow Templates" icon={<Settings />} iconPosition="start" />
            <Tab label="System Configuration" icon={<Speed />} iconPosition="start" />
          </Tabs>
        </Box>

        {/* Active Workflows Tab */}
        <TabPanel value={selectedTab} index={0}>
          <Box sx={{ p: 3 }}>
            {workflows.length === 0 ? (
              <Alert severity="info">
                No workflows created yet. Click "Create Workflow" to get started.
              </Alert>
            ) : (
              <Grid container spacing={3}>
                {workflows.map((workflow) => (
                  <Grid item xs={12} md={6} lg={4} key={workflow.id}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent>
                        <Box display="flex" justifyContent="between" alignItems="start" mb={2}>
                          <Box>
                            <Typography variant="h6" gutterBottom>
                              {workflow.name}
                            </Typography>
                            <Chip 
                              label={workflow.status}
                              color={getStatusColor(workflow.status)}
                              size="small"
                              icon={getStatusIcon(workflow.status)}
                            />
                          </Box>
                          <IconButton
                            size="small"
                            onClick={() => {
                              setSelectedWorkflow(workflow);
                              setConfigDialogOpen(true);
                            }}
                          >
                            <Settings />
                          </IconButton>
                        </Box>

                        <Typography variant="body2" color="text.secondary" mb={2}>
                          {workflow.description}
                        </Typography>

                        {workflow.status === 'running' && (
                          <Box mb={2}>
                            <Box display="flex" justifyContent="between" mb={1}>
                              <Typography variant="body2">Progress</Typography>
                              <Typography variant="body2">{Math.round(workflow.progress)}%</Typography>
                            </Box>
                            <LinearProgress 
                              variant="determinate" 
                              value={workflow.progress} 
                              sx={{ borderRadius: 2, height: 6 }}
                            />
                          </Box>
                        )}

                        <Box display="flex" alignItems="center" gap={1} mb={2}>
                          <Group fontSize="small" />
                          <Typography variant="body2">
                            {workflow.employees.length} employees
                          </Typography>
                        </Box>

                        {workflow.startTime && (
                          <Typography variant="caption" color="text.secondary" display="block" mb={1}>
                            Started: {workflow.startTime.toLocaleString()}
                          </Typography>
                        )}

                        {workflow.estimatedCompletion && workflow.status === 'running' && (
                          <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                            ETA: {workflow.estimatedCompletion.toLocaleString()}
                          </Typography>
                        )}

                        <Divider sx={{ my: 2 }} />

                        <Box display="flex" gap={1}>
                          {workflow.status === 'running' ? (
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              startIcon={<Stop />}
                              onClick={() => handleStopWorkflow(workflow.id)}
                            >
                              Stop
                            </Button>
                          ) : (
                            <Button
                              size="small"
                              variant="outlined"
                              color="primary"
                              startIcon={<PlayArrow />}
                              onClick={() => handleStartWorkflow(workflow.id)}
                            >
                              Start
                            </Button>
                          )}
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Visibility />}
                          >
                            View
                          </Button>
                        </Box>
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>
        </TabPanel>

        {/* Workflow Templates Tab */}
        <TabPanel value={selectedTab} index={1}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Workflow Templates
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Pre-configured workflow templates for common operations
            </Typography>

            <Grid container spacing={3}>
              {workflowTemplates.map((template) => (
                <Grid item xs={12} md={6} lg={4} key={template.id}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" gutterBottom>
                        {template.name}
                      </Typography>
                      <Chip 
                        label={template.type}
                        size="small"
                        sx={{ mb: 2 }}
                      />
                      <Typography variant="body2" color="text.secondary" mb={2}>
                        {template.description}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" display="block" mb={2}>
                        Default employees: {template.defaultEmployees.length}
                      </Typography>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => {
                          setNewWorkflowTemplate(template.id);
                          setCreateDialogOpen(true);
                        }}
                      >
                        Use Template
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Box>
        </TabPanel>

        {/* System Configuration Tab */}
        <TabPanel value={selectedTab} index={2}>
          <Box sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              System Configuration
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Global workflow settings and system configuration
            </Typography>

            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      Default Settings
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemIcon>
                          <Schedule />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Default Timeout"
                          secondary="3600 seconds (1 hour)"
                        />
                        <ListItemSecondaryAction>
                          <IconButton edge="end">
                            <Edit />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <Refresh />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Max Retry Attempts"
                          secondary="3 attempts"
                        />
                        <ListItemSecondaryAction>
                          <IconButton edge="end">
                            <Edit />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <Group />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Max Concurrent Employees"
                          secondary="5 employees"
                        />
                        <ListItemSecondaryAction>
                          <IconButton edge="end">
                            <Edit />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>

              <Grid item xs={12} md={6}>
                <Card>
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      System Features
                    </Typography>
                    <List>
                      <ListItem>
                        <ListItemIcon>
                          <Memory />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Memory Integration"
                          secondary="Enable AI memory for workflows"
                        />
                        <ListItemSecondaryAction>
                          <Switch defaultChecked />
                        </ListItemSecondaryAction>
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <Timeline />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Real-time Monitoring"
                          secondary="Live workflow progress tracking"
                        />
                        <ListItemSecondaryAction>
                          <Switch defaultChecked />
                        </ListItemSecondaryAction>
                      </ListItem>
                      <ListItem>
                        <ListItemIcon>
                          <Warning />
                        </ListItemIcon>
                        <ListItemText 
                          primary="Error Notifications"
                          secondary="Instant alerts for failures"
                        />
                        <ListItemSecondaryAction>
                          <Switch defaultChecked />
                        </ListItemSecondaryAction>
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>
      </Card>

      {/* Create Workflow Dialog */}
      <Dialog open={createDialogOpen} onClose={() => setCreateDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Workflow</DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 1 }}>
            <TextField
              fullWidth
              label="Workflow Name"
              value={newWorkflowName}
              onChange={(e) => setNewWorkflowName(e.target.value)}
              margin="normal"
            />
            <FormControl fullWidth margin="normal">
              <InputLabel>Template</InputLabel>
              <Select
                value={newWorkflowTemplate}
                onChange={(e) => setNewWorkflowTemplate(e.target.value)}
                label="Template"
              >
                {workflowTemplates.map((template) => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateWorkflow} variant="contained">Create</Button>
        </DialogActions>
      </Dialog>

      {/* Configuration Dialog */}
      <Dialog open={configDialogOpen} onClose={() => setConfigDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Workflow Configuration</DialogTitle>
        <DialogContent>
          {selectedWorkflow && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="h6" gutterBottom>
                {selectedWorkflow.name}
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Max Concurrent Employees"
                    type="number"
                    defaultValue={selectedWorkflow.configuration.maxConcurrentEmployees}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Timeout (seconds)"
                    type="number"
                    defaultValue={selectedWorkflow.configuration.timeout}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Retry Attempts"
                    type="number"
                    defaultValue={selectedWorkflow.configuration.retryAttempts}
                    margin="normal"
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControlLabel
                    control={
                      <Switch defaultChecked={selectedWorkflow.configuration.memoryEnabled} />
                    }
                    label="Enable Memory Integration"
                    sx={{ mt: 2 }}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfigDialogOpen(false)}>Cancel</Button>
          <Button variant="contained">Save Configuration</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WorkflowsPage;