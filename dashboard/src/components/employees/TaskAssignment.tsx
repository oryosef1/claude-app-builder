import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Box,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Typography,
  Grid,
  Card,
  CardContent,
  Avatar,
  Alert,
  Autocomplete,
  Slider,
  FormHelperText
} from '@mui/material';
import {
  Assignment,
  Person,
  Schedule,
  Flag,
  CheckCircle,
  Cancel
} from '@mui/icons-material';
import { Employee, TaskAssignment as TaskAssignmentType } from '@/types/employee';
import { useEmployeeStore } from '@/stores/employeeStore';

interface TaskAssignmentProps {
  open: boolean;
  onClose: () => void;
  preselectedEmployeeId?: string;
  onAssign: (assignment: TaskAssignmentType) => Promise<boolean>;
}

const TaskAssignment: React.FC<TaskAssignmentProps> = ({
  open,
  onClose,
  preselectedEmployeeId,
  onAssign
}) => {
  const { employees, getAvailableEmployees, assignmentFormData, updateAssignmentForm } = useEmployeeStore();
  
  const [formData, setFormData] = useState<Partial<TaskAssignmentType>>({
    employeeId: preselectedEmployeeId || '',
    title: '',
    description: '',
    priority: 'medium',
    estimatedHours: 8,
    skills_required: [],
    deadline: '',
    ...assignmentFormData
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [suggestedEmployees, setSuggestedEmployees] = useState<Employee[]>([]);

  // Skill options based on all employee skills
  const allSkills = Array.from(new Set(employees.flatMap(emp => emp.skills))).sort();
  
  // Priority options
  const priorityOptions = [
    { value: 'low', label: 'Low', color: '#4caf50' },
    { value: 'medium', label: 'Medium', color: '#ff9800' },
    { value: 'high', label: 'High', color: '#f44336' },
    { value: 'urgent', label: 'Urgent', color: '#d32f2f' }
  ];

  // Update form data in store when local form changes
  useEffect(() => {
    updateAssignmentForm(formData);
  }, [formData, updateAssignmentForm]);

  // Find suggested employees based on skills and availability
  useEffect(() => {
    if (formData.skills_required && formData.skills_required.length > 0) {
      const availableEmployees = getAvailableEmployees();
      const suggestions = availableEmployees
        .filter(emp => 
          formData.skills_required!.some(skill => emp.skills.includes(skill))
        )
        .sort((a, b) => {
          // Sort by skill match percentage and workload
          const aMatches = formData.skills_required!.filter(skill => a.skills.includes(skill)).length;
          const bMatches = formData.skills_required!.filter(skill => b.skills.includes(skill)).length;
          const matchDiff = bMatches - aMatches;
          if (matchDiff !== 0) return matchDiff;
          return a.workload - b.workload; // Lower workload first
        })
        .slice(0, 3);
      
      setSuggestedEmployees(suggestions);
    } else {
      setSuggestedEmployees([]);
    }
  }, [formData.skills_required, getAvailableEmployees]);

  const handleInputChange = (field: keyof TaskAssignmentType, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const validateForm = (): boolean => {
    if (!formData.employeeId) {
      setError('Please select an employee');
      return false;
    }
    if (!formData.title?.trim()) {
      setError('Please provide a task title');
      return false;
    }
    if (!formData.description?.trim()) {
      setError('Please provide a task description');
      return false;
    }
    if (formData.estimatedHours && (formData.estimatedHours < 1 || formData.estimatedHours > 80)) {
      setError('Estimated hours must be between 1 and 80');
      return false;
    }
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setLoading(true);
    setError('');
    
    try {
      const assignment: TaskAssignmentType = {
        id: `task_${Date.now()}`,
        employeeId: formData.employeeId!,
        title: formData.title!,
        description: formData.description!,
        priority: formData.priority || 'medium',
        estimatedHours: formData.estimatedHours || 8,
        skills_required: formData.skills_required || [],
        deadline: formData.deadline || undefined,
        created_at: new Date().toISOString(),
        assigned_by: 'Dashboard User'
      };
      
      const success = await onAssign(assignment);
      
      if (success) {
        setSuccess(true);
        setTimeout(() => {
          onClose();
          setSuccess(false);
          setFormData({
            employeeId: '',
            title: '',
            description: '',
            priority: 'medium',
            estimatedHours: 8,
            skills_required: [],
            deadline: ''
          });
        }, 1500);
      } else {
        setError('Failed to assign task. Please try again.');
      }
    } catch (err) {
      setError('An error occurred while assigning the task.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      onClose();
      setError('');
      setSuccess(false);
    }
  };

  const getEmployeeById = (id: string) => employees.find(emp => emp.id === id);

  const selectedEmployee = getEmployeeById(formData.employeeId || '');

  return (
    <Dialog 
      open={open} 
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{
        sx: { minHeight: '70vh' }
      }}
    >
      <DialogTitle>
        <Box display="flex" alignItems="center" gap={1}>
          <Assignment color="primary" />
          <Typography variant="h6">
            Assign New Task
          </Typography>
        </Box>
      </DialogTitle>
      
      <DialogContent dividers>
        {success ? (
          <Box display="flex" flexDirection="column" alignItems="center" py={4}>
            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h6" color="success.main" gutterBottom>
              Task Assigned Successfully!
            </Typography>
            <Typography variant="body2" color="text.secondary">
              The task has been assigned to {selectedEmployee?.name}
            </Typography>
          </Box>
        ) : (
          <Grid container spacing={3}>
            {/* Employee Selection */}
            <Grid item xs={12}>
              <FormControl fullWidth required>
                <InputLabel>Select Employee</InputLabel>
                <Select
                  value={formData.employeeId || ''}
                  label="Select Employee"
                  onChange={(e) => handleInputChange('employeeId', e.target.value)}
                >
                  {getAvailableEmployees().map(employee => (
                    <MenuItem key={employee.id} value={employee.id}>
                      <Box display="flex" alignItems="center" gap={2} width="100%">
                        <Avatar sx={{ width: 32, height: 32 }}>
                          <Person />
                        </Avatar>
                        <Box flexGrow={1}>
                          <Typography variant="body2" fontWeight="bold">
                            {employee.name}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {employee.role} • {employee.workload}% workload
                          </Typography>
                        </Box>
                        <Chip 
                          label={employee.department}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
                <FormHelperText>
                  Only showing employees with workload below 80%
                </FormHelperText>
              </FormControl>
            </Grid>

            {/* Selected Employee Info */}
            {selectedEmployee && (
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent sx={{ py: 2 }}>
                    <Box display="flex" alignItems="center" gap={2}>
                      <Avatar>
                        <Person />
                      </Avatar>
                      <Box flexGrow={1}>
                        <Typography variant="subtitle1" fontWeight="bold">
                          {selectedEmployee.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {selectedEmployee.role} • {selectedEmployee.department}
                        </Typography>
                        <Box display="flex" gap={1} mt={1}>
                          {selectedEmployee.skills.slice(0, 4).map(skill => (
                            <Chip 
                              key={skill}
                              label={skill.replace('_', ' ')}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Box>
                      </Box>
                      <Box textAlign="right">
                        <Typography variant="caption" color="text.secondary">
                          Current Workload
                        </Typography>
                        <Typography variant="h6" color="primary">
                          {selectedEmployee.workload}%
                        </Typography>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              </Grid>
            )}

            {/* Task Details */}
            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                label="Task Title"
                value={formData.title || ''}
                onChange={(e) => handleInputChange('title', e.target.value)}
                placeholder="Brief, descriptive title for the task"
              />
            </Grid>

            <Grid item xs={12}>
              <TextField
                fullWidth
                required
                multiline
                rows={4}
                label="Task Description"
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Detailed description of what needs to be done..."
              />
            </Grid>

            {/* Priority and Estimated Hours */}
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority || 'medium'}
                  label="Priority"
                  onChange={(e) => handleInputChange('priority', e.target.value)}
                >
                  {priorityOptions.map(option => (
                    <MenuItem key={option.value} value={option.value}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Flag sx={{ color: option.color, fontSize: 20 }} />
                        {option.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6}>
              <Box>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Estimated Hours: {formData.estimatedHours || 8}
                </Typography>
                <Slider
                  value={formData.estimatedHours || 8}
                  onChange={(_, value) => handleInputChange('estimatedHours', value)}
                  min={1}
                  max={40}
                  step={1}
                  marks={[
                    { value: 1, label: '1h' },
                    { value: 8, label: '1 day' },
                    { value: 16, label: '2 days' },
                    { value: 40, label: '1 week' }
                  ]}
                  valueLabelDisplay="auto"
                />
              </Box>
            </Grid>

            {/* Skills Required */}
            <Grid item xs={12}>
              <Autocomplete
                multiple
                options={allSkills}
                value={formData.skills_required || []}
                onChange={(_, value) => handleInputChange('skills_required', value)}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Required Skills"
                    placeholder="Select skills needed for this task"
                  />
                )}
                renderTags={(tagValue, getTagProps) =>
                  tagValue.map((option, index) => (
                    <Chip
                      label={option.replace('_', ' ')}
                      {...getTagProps({ index })}
                      size="small"
                      key={option}
                    />
                  ))
                }
              />
            </Grid>

            {/* Deadline */}
            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                type="datetime-local"
                label="Deadline (Optional)"
                value={formData.deadline || ''}
                onChange={(e) => handleInputChange('deadline', e.target.value)}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>

            {/* Suggested Employees */}
            {suggestedEmployees.length > 0 && (
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Suggested Employees Based on Skills:
                </Typography>
                <Box display="flex" gap={1} flexWrap="wrap">
                  {suggestedEmployees.map(emp => (
                    <Chip
                      key={emp.id}
                      label={`${emp.name} (${emp.workload}%)`}
                      onClick={() => handleInputChange('employeeId', emp.id)}
                      color={emp.id === formData.employeeId ? 'primary' : 'default'}
                      variant={emp.id === formData.employeeId ? 'filled' : 'outlined'}
                      clickable
                    />
                  ))}
                </Box>
              </Grid>
            )}

            {/* Error Display */}
            {error && (
              <Grid item xs={12}>
                <Alert severity="error" onClose={() => setError('')}>
                  {error}
                </Alert>
              </Grid>
            )}
          </Grid>
        )}
      </DialogContent>
      
      {!success && (
        <DialogActions sx={{ px: 3, py: 2 }}>
          <Button 
            onClick={handleClose} 
            disabled={loading}
            startIcon={<Cancel />}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit}
            variant="contained"
            disabled={loading}
            startIcon={<Assignment />}
          >
            {loading ? 'Assigning...' : 'Assign Task'}
          </Button>
        </DialogActions>
      )}
    </Dialog>
  );
};

export default TaskAssignment;