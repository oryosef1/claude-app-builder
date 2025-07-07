import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Switch,
  FormControlLabel,
  Grid,
  Chip,
  IconButton,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  ListItemSecondaryAction,
  Divider,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import {
  ExpandMore,
  Add,
  Remove,
  Group,
  Schedule,
  Refresh,
  Memory,
  Security,
  Notifications,
  Speed,
  Storage,
  CloudQueue,
} from '@mui/icons-material';

export interface WorkflowConfig {
  maxConcurrentEmployees: number;
  timeout: number;
  retryAttempts: number;
  memoryEnabled: boolean;
  priority: 'low' | 'normal' | 'high' | 'critical';
  notificationsEnabled: boolean;
  autoRestart: boolean;
  resourceLimits: {
    maxMemoryMB: number;
    maxCpuPercent: number;
  };
  employees: string[];
  tags: string[];
  environmentVars: Record<string, string>;
}

export interface WorkflowConfigurationProps {
  open: boolean;
  onClose: () => void;
  workflow: {
    id: string;
    name: string;
    type: string;
    configuration: WorkflowConfig;
  } | null;
  onSave: (config: WorkflowConfig) => void;
}

// Employee options
const employeeOptions = [
  { id: 'emp_001_pm', name: 'Alex (Project Manager)', department: 'Executive' },
  { id: 'emp_002_tl', name: 'Taylor (Technical Lead)', department: 'Executive' },
  { id: 'emp_003_qd', name: 'Morgan (QA Director)', department: 'Executive' },
  { id: 'emp_004_sd', name: 'Sam (Senior Developer)', department: 'Development' },
  { id: 'emp_005_jd', name: 'Jordan (Junior Developer)', department: 'Development' },
  { id: 'emp_006_qe', name: 'Morgan (QA Engineer)', department: 'Development' },
  { id: 'emp_007_te', name: 'Casey (Test Engineer)', department: 'Development' },
  { id: 'emp_008_do', name: 'Drew (DevOps Engineer)', department: 'Operations' },
  { id: 'emp_009_sre', name: 'Riley (SRE)', department: 'Operations' },
  { id: 'emp_010_se', name: 'Avery (Security Engineer)', department: 'Operations' },
  { id: 'emp_011_tw', name: 'Blake (Technical Writer)', department: 'Support' },
  { id: 'emp_012_ux', name: 'Quinn (UI/UX Designer)', department: 'Support' },
  { id: 'emp_013_be', name: 'Sage (Build Engineer)', department: 'Support' },
];

const WorkflowConfiguration: React.FC<WorkflowConfigurationProps> = ({
  open,
  onClose,
  workflow,
  onSave,
}) => {
  const [config, setConfig] = useState<WorkflowConfig>(() => ({
    maxConcurrentEmployees: 3,
    timeout: 3600,
    retryAttempts: 2,
    memoryEnabled: true,
    priority: 'normal',
    notificationsEnabled: true,
    autoRestart: false,
    resourceLimits: {
      maxMemoryMB: 512,
      maxCpuPercent: 80,
    },
    employees: [],
    tags: [],
    environmentVars: {},
    ...workflow?.configuration,
  }));

  const [newTag, setNewTag] = useState('');
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  const handleAddTag = () => {
    if (newTag && !config.tags.includes(newTag)) {
      setConfig(prev => ({
        ...prev,
        tags: [...prev.tags, newTag],
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setConfig(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag),
    }));
  };

  const handleAddEnvVar = () => {
    if (newEnvKey && newEnvValue) {
      setConfig(prev => ({
        ...prev,
        environmentVars: {
          ...prev.environmentVars,
          [newEnvKey]: newEnvValue,
        },
      }));
      setNewEnvKey('');
      setNewEnvValue('');
    }
  };

  const handleRemoveEnvVar = (key: string) => {
    setConfig(prev => ({
      ...prev,
      environmentVars: Object.fromEntries(
        Object.entries(prev.environmentVars).filter(([k]) => k !== key)
      ),
    }));
  };

  const handleEmployeeToggle = (employeeId: string) => {
    setConfig(prev => ({
      ...prev,
      employees: prev.employees.includes(employeeId)
        ? prev.employees.filter(id => id !== employeeId)
        : [...prev.employees, employeeId],
    }));
  };

  if (!workflow) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        <Box>
          <Typography variant="h6">Workflow Configuration</Typography>
          <Typography variant="body2" color="text.secondary">
            {workflow.name}
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ pt: 1 }}>
          {/* Basic Configuration */}
          <Accordion defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" alignItems="center" gap={1}>
                <Settings />
                <Typography variant="h6">Basic Configuration</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Max Concurrent Employees"
                    type="number"
                    value={config.maxConcurrentEmployees}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      maxConcurrentEmployees: parseInt(e.target.value) || 1,
                    }))}
                    inputProps={{ min: 1, max: 13 }}
                    helperText="Maximum number of employees working simultaneously"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Timeout (seconds)"
                    type="number"
                    value={config.timeout}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      timeout: parseInt(e.target.value) || 3600,
                    }))}
                    inputProps={{ min: 60 }}
                    helperText="Maximum time before workflow times out"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Retry Attempts"
                    type="number"
                    value={config.retryAttempts}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      retryAttempts: parseInt(e.target.value) || 0,
                    }))}
                    inputProps={{ min: 0, max: 10 }}
                    helperText="Number of retry attempts on failure"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth>
                    <InputLabel>Priority</InputLabel>
                    <Select
                      value={config.priority}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        priority: e.target.value as WorkflowConfig['priority'],
                      }))}
                      label="Priority"
                    >
                      <MenuItem value="low">Low</MenuItem>
                      <MenuItem value="normal">Normal</MenuItem>
                      <MenuItem value="high">High</MenuItem>
                      <MenuItem value="critical">Critical</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Employee Assignment */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" alignItems="center" gap={1}>
                <Group />
                <Typography variant="h6">Employee Assignment</Typography>
                <Chip 
                  label={`${config.employees.length} selected`}
                  size="small" 
                  color="primary" 
                />
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Typography variant="body2" color="text.secondary" mb={2}>
                Select employees to participate in this workflow
              </Typography>
              
              {['Executive', 'Development', 'Operations', 'Support'].map((department) => (
                <Box key={department} mb={2}>
                  <Typography variant="subtitle2" gutterBottom color="primary">
                    {department} Team
                  </Typography>
                  <Grid container spacing={1}>
                    {employeeOptions
                      .filter(emp => emp.department === department)
                      .map((employee) => (
                        <Grid item xs={12} sm={6} key={employee.id}>
                          <FormControlLabel
                            control={
                              <Switch
                                checked={config.employees.includes(employee.id)}
                                onChange={() => handleEmployeeToggle(employee.id)}
                              />
                            }
                            label={employee.name}
                          />
                        </Grid>
                      ))}
                  </Grid>
                </Box>
              ))}
            </AccordionDetails>
          </Accordion>

          {/* Advanced Features */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" alignItems="center" gap={1}>
                <Speed />
                <Typography variant="h6">Advanced Features</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12}>
                  <List>
                    <ListItem>
                      <ListItemIcon>
                        <Memory />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Memory Integration"
                        secondary="Enable AI memory for context-aware workflow execution"
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={config.memoryEnabled}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            memoryEnabled: e.target.checked,
                          }))}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <Notifications />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Notifications"
                        secondary="Send notifications for workflow events"
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={config.notificationsEnabled}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            notificationsEnabled: e.target.checked,
                          }))}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                    
                    <ListItem>
                      <ListItemIcon>
                        <Refresh />
                      </ListItemIcon>
                      <ListItemText 
                        primary="Auto Restart"
                        secondary="Automatically restart workflow on failure"
                      />
                      <ListItemSecondaryAction>
                        <Switch
                          checked={config.autoRestart}
                          onChange={(e) => setConfig(prev => ({
                            ...prev,
                            autoRestart: e.target.checked,
                          }))}
                        />
                      </ListItemSecondaryAction>
                    </ListItem>
                  </List>
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Resource Limits */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" alignItems="center" gap={1}>
                <Storage />
                <Typography variant="h6">Resource Limits</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Max Memory (MB)"
                    type="number"
                    value={config.resourceLimits.maxMemoryMB}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      resourceLimits: {
                        ...prev.resourceLimits,
                        maxMemoryMB: parseInt(e.target.value) || 512,
                      },
                    }))}
                    inputProps={{ min: 128 }}
                    helperText="Maximum memory usage per workflow"
                  />
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <TextField
                    fullWidth
                    label="Max CPU (%)"
                    type="number"
                    value={config.resourceLimits.maxCpuPercent}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      resourceLimits: {
                        ...prev.resourceLimits,
                        maxCpuPercent: parseInt(e.target.value) || 80,
                      },
                    }))}
                    inputProps={{ min: 10, max: 100 }}
                    helperText="Maximum CPU usage percentage"
                  />
                </Grid>
              </Grid>
            </AccordionDetails>
          </Accordion>

          {/* Tags */}
          <Accordion>
            <AccordionSummary expandIcon={<ExpandMore />}>
              <Box display="flex" alignItems="center" gap={1}>
                <CloudQueue />
                <Typography variant="h6">Tags & Environment</Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Box mb={3}>
                <Typography variant="subtitle2" gutterBottom>
                  Tags
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                  {config.tags.map((tag) => (
                    <Chip
                      key={tag}
                      label={tag}
                      onDelete={() => handleRemoveTag(tag)}
                      deleteIcon={<Remove />}
                      variant="outlined"
                    />
                  ))}
                </Box>
                <Box display="flex" gap={1}>
                  <TextField
                    size="small"
                    label="Add tag"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddTag()}
                  />
                  <IconButton onClick={handleAddTag} disabled={!newTag}>
                    <Add />
                  </IconButton>
                </Box>
              </Box>

              <Divider sx={{ my: 2 }} />

              <Box>
                <Typography variant="subtitle2" gutterBottom>
                  Environment Variables
                </Typography>
                {Object.entries(config.environmentVars).length > 0 && (
                  <List dense>
                    {Object.entries(config.environmentVars).map(([key, value]) => (
                      <ListItem key={key}>
                        <ListItemText 
                          primary={key}
                          secondary={value}
                        />
                        <ListItemSecondaryAction>
                          <IconButton 
                            edge="end" 
                            onClick={() => handleRemoveEnvVar(key)}
                            size="small"
                          >
                            <Remove />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    ))}
                  </List>
                )}
                <Grid container spacing={1} mt={1}>
                  <Grid item xs={5}>
                    <TextField
                      size="small"
                      label="Key"
                      value={newEnvKey}
                      onChange={(e) => setNewEnvKey(e.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={5}>
                    <TextField
                      size="small"
                      label="Value"
                      value={newEnvValue}
                      onChange={(e) => setNewEnvValue(e.target.value)}
                      fullWidth
                    />
                  </Grid>
                  <Grid item xs={2}>
                    <IconButton 
                      onClick={handleAddEnvVar} 
                      disabled={!newEnvKey || !newEnvValue}
                      size="small"
                    >
                      <Add />
                    </IconButton>
                  </Grid>
                </Grid>
              </Box>
            </AccordionDetails>
          </Accordion>

          {/* Configuration Summary */}
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              Configuration will be applied when the workflow is saved. 
              Changes take effect on the next workflow execution.
            </Typography>
          </Alert>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          onClick={handleSave} 
          variant="contained"
          disabled={config.employees.length === 0}
        >
          Save Configuration
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default WorkflowConfiguration;