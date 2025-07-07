import React, { useEffect, useState } from 'react';
import {
  Box,
  Container,
  Typography,
  Paper,
  Grid,
  Card,
  CardContent,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  IconButton,
  Tooltip,
  Badge,
  Fab,
  Drawer,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  Snackbar
} from '@mui/material';
import {
  Add,
  Refresh,
  FilterList,
  Sort,
  ViewModule,
  ViewList,
  Search,
  People,
  TrendingUp,
  Assignment,
  Speed,
  Close,
  Department,
  Schedule
} from '@mui/icons-material';
import { useEmployeeStore } from '@/stores/employeeStore';
import { Employee, EmployeeFilter, EmployeeSortOption } from '@/types/employee';
import EmployeeGrid from '@/components/employees/EmployeeGrid';
import EmployeeCard from '@/components/employees/EmployeeCard';
import TaskAssignment from '@/components/employees/TaskAssignment';

const Employees: React.FC = () => {
  const {
    employees,
    selectedEmployee,
    departmentStats,
    employeeStatuses,
    filters,
    sortBy,
    sortOrder,
    loading,
    error,
    showEmployeeModal,
    showTaskAssignmentModal,
    loadEmployees,
    loadDepartmentStats,
    refreshAllStatuses,
    openEmployeeModal,
    closeEmployeeModal,
    openTaskAssignmentModal,
    closeTaskAssignmentModal,
    assignTask,
    updateFilters,
    setSorting,
    getFilteredEmployees
  } = useEmployeeStore();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notification, setNotification] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({ open: false, message: '', severity: 'info' });

  // Load data on component mount
  useEffect(() => {
    loadEmployees();
    loadDepartmentStats();
    
    // Set up periodic refresh for real-time updates
    const interval = setInterval(() => {
      refreshAllStatuses();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(interval);
  }, [loadEmployees, loadDepartmentStats, refreshAllStatuses]);

  // Filter employees based on search query
  const filteredEmployees = getFilteredEmployees().filter(emp => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      emp.name.toLowerCase().includes(query) ||
      emp.role.toLowerCase().includes(query) ||
      emp.department.toLowerCase().includes(query) ||
      emp.skills.some(skill => skill.toLowerCase().includes(query))
    );
  });

  const handleTaskAssignment = async (assignment: any) => {
    const success = await assignTask(assignment);
    if (success) {
      setNotification({
        open: true,
        message: `Task "${assignment.title}" assigned to ${getEmployeeName(assignment.employeeId)} successfully!`,
        severity: 'success'
      });
      closeTaskAssignmentModal();
    } else {
      setNotification({
        open: true,
        message: 'Failed to assign task. Please try again.',
        severity: 'error'
      });
    }
    return success;
  };

  const getEmployeeName = (employeeId: string) => {
    const employee = employees.find(emp => emp.id === employeeId);
    return employee?.name || 'Unknown Employee';
  };

  const handleFilterChange = (filterType: keyof EmployeeFilter, value: any) => {
    updateFilters({ [filterType]: value });
  };

  const clearFilters = () => {
    updateFilters({
      department: undefined,
      status: undefined,
      level: undefined,
      skills: undefined,
      workload_min: undefined,
      workload_max: undefined
    });
    setSearchQuery('');
  };

  const getFilterCount = () => {
    let count = 0;
    if (filters.department) count++;
    if (filters.status) count++;
    if (filters.level) count++;
    if (filters.skills && filters.skills.length > 0) count++;
    if (filters.workload_min !== undefined) count++;
    if (filters.workload_max !== undefined) count++;
    if (searchQuery) count++;
    return count;
  };

  const getTotalStats = () => {
    const active = employees.filter(emp => emp.status === 'active').length;
    const busy = employees.filter(emp => emp.status === 'busy').length;
    const avgWorkload = employees.length > 0 
      ? Math.round(employees.reduce((sum, emp) => sum + emp.workload, 0) / employees.length)
      : 0;
    const totalProjects = employees.reduce((sum, emp) => sum + emp.current_projects.length, 0);
    
    return { active, busy, avgWorkload, totalProjects };
  };

  const stats = getTotalStats();

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      {/* Header */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight="bold" gutterBottom>
            Employee Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage your {employees.length} AI employees across 4 departments
          </Typography>
        </Box>
        
        <Box display="flex" gap={2} alignItems="center">
          <Tooltip title="Refresh Data">
            <IconButton 
              onClick={() => {
                loadEmployees();
                refreshAllStatuses();
                loadDepartmentStats();
              }}
              disabled={loading}
            >
              <Refresh />
            </IconButton>
          </Tooltip>
          
          <Badge badgeContent={getFilterCount()} color="primary">
            <Button
              startIcon={<FilterList />}
              onClick={() => setShowFilters(true)}
              variant="outlined"
            >
              Filters
            </Button>
          </Badge>
          
          <ToggleButtonGroup
            value={viewMode}
            exclusive
            onChange={(_, newMode) => newMode && setViewMode(newMode)}
            size="small"
          >
            <ToggleButton value="grid">
              <ViewModule />
            </ToggleButton>
            <ToggleButton value="list">
              <ViewList />
            </ToggleButton>
          </ToggleButtonGroup>
        </Box>
      </Box>

      {/* Statistics Cards */}
      <Grid container spacing={3} mb={3}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="success.main" fontWeight="bold">
                    {stats.active}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Employees
                  </Typography>
                </Box>
                <People sx={{ fontSize: 40, color: 'success.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="warning.main" fontWeight="bold">
                    {stats.busy}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Busy Employees
                  </Typography>
                </Box>
                <Speed sx={{ fontSize: 40, color: 'warning.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="primary.main" fontWeight="bold">
                    {stats.avgWorkload}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Average Workload
                  </Typography>
                </Box>
                <TrendingUp sx={{ fontSize: 40, color: 'primary.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" justifyContent="space-between">
                <Box>
                  <Typography variant="h4" color="info.main" fontWeight="bold">
                    {stats.totalProjects}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Active Projects
                  </Typography>
                </Box>
                <Assignment sx={{ fontSize: 40, color: 'info.main' }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Search and Sort Controls */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={6}>
            <TextField
              fullWidth
              placeholder="Search employees by name, role, department, or skills..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
              }}
            />
          </Grid>
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSorting(e.target.value as EmployeeSortOption)}
              >
                <MenuItem value="name">Name</MenuItem>
                <MenuItem value="department">Department</MenuItem>
                <MenuItem value="workload">Workload</MenuItem>
                <MenuItem value="performance">Performance</MenuItem>
                <MenuItem value="status">Status</MenuItem>
                <MenuItem value="hire_date">Hire Date</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Chip 
                label={`${filteredEmployees.length} employees`}
                color="primary"
                variant="outlined"
              />
              <Tooltip title="Sort Order">
                <IconButton onClick={() => setSorting(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')}>
                  <Sort sx={{ 
                    transform: sortOrder === 'desc' ? 'rotate(180deg)' : 'none',
                    transition: 'transform 0.2s'
                  }} />
                </IconButton>
              </Tooltip>
            </Box>
          </Grid>
        </Grid>
      </Paper>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => {}}>
          {error}
        </Alert>
      )}

      {/* Employee Grid/List */}
      <EmployeeGrid
        employees={filteredEmployees}
        employeeStatuses={employeeStatuses}
        departmentStats={departmentStats}
        groupBy="department"
        showWorkload={true}
        showPerformance={true}
        onEmployeeClick={openEmployeeModal}
        onTaskAssign={openTaskAssignmentModal}
        loading={loading}
      />

      {/* Floating Action Button */}
      <Fab
        color="primary"
        sx={{ position: 'fixed', bottom: 24, right: 24 }}
        onClick={() => openTaskAssignmentModal()}
      >
        <Add />
      </Fab>

      {/* Filter Drawer */}
      <Drawer
        anchor="right"
        open={showFilters}
        onClose={() => setShowFilters(false)}
        PaperProps={{ sx: { width: 320, p: 2 } }}
      >
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
          <Typography variant="h6">Filters</Typography>
          <IconButton onClick={() => setShowFilters(false)}>
            <Close />
          </IconButton>
        </Box>
        
        <Divider sx={{ mb: 2 }} />
        
        <List>
          <ListItem>
            <FormControl fullWidth>
              <InputLabel>Department</InputLabel>
              <Select
                value={filters.department || ''}
                label="Department"
                onChange={(e) => handleFilterChange('department', e.target.value || undefined)}
              >
                <MenuItem value="">All Departments</MenuItem>
                <MenuItem value="Executive">Executive</MenuItem>
                <MenuItem value="Development">Development</MenuItem>
                <MenuItem value="Operations">Operations</MenuItem>
                <MenuItem value="Support">Support</MenuItem>
              </Select>
            </FormControl>
          </ListItem>
          
          <ListItem>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status || ''}
                label="Status"
                onChange={(e) => handleFilterChange('status', e.target.value || undefined)}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="busy">Busy</MenuItem>
                <MenuItem value="offline">Offline</MenuItem>
              </Select>
            </FormControl>
          </ListItem>
          
          <ListItem>
            <FormControl fullWidth>
              <InputLabel>Level</InputLabel>
              <Select
                value={filters.level || ''}
                label="Level"
                onChange={(e) => handleFilterChange('level', e.target.value || undefined)}
              >
                <MenuItem value="">All Levels</MenuItem>
                <MenuItem value="Senior">Senior</MenuItem>
                <MenuItem value="Mid">Mid</MenuItem>
                <MenuItem value="Junior">Junior</MenuItem>
              </Select>
            </FormControl>
          </ListItem>
        </List>
        
        <Box mt={2}>
          <Button
            fullWidth
            variant="outlined"
            onClick={clearFilters}
            startIcon={<Close />}
          >
            Clear All Filters
          </Button>
        </Box>
      </Drawer>

      {/* Task Assignment Modal */}
      <TaskAssignment
        open={showTaskAssignmentModal}
        onClose={closeTaskAssignmentModal}
        onAssign={handleTaskAssignment}
      />

      {/* Notification Snackbar */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={() => setNotification(prev => ({ ...prev, open: false }))}
      >
        <Alert 
          severity={notification.severity}
          onClose={() => setNotification(prev => ({ ...prev, open: false }))}
        >
          {notification.message}
        </Alert>
      </Snackbar>
    </Container>
  );
};

export default Employees;