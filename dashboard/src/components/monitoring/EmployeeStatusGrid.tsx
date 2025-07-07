import React from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Grid,
  Avatar,
  Chip,
  LinearProgress,
  Tooltip,
  Collapse,
  IconButton,
  Divider,
} from '@mui/material';
import {
  Person,
  Circle,
  Computer,
  Memory,
  Speed,
  AccessTime,
  ExpandMore,
  ExpandLess,
  Business,
} from '@mui/icons-material';
import { EmployeeStatusLive } from '@/services/monitoring';

interface EmployeeStatusGridProps {
  employees: EmployeeStatusLive[];
  isLoading?: boolean;
}

const EmployeeStatusGrid: React.FC<EmployeeStatusGridProps> = ({
  employees,
  isLoading = false,
}) => {
  const [expandedDepartments, setExpandedDepartments] = React.useState<Set<string>>(
    new Set(['Executive', 'Development']) // Expand these by default
  );

  const toggleDepartment = (department: string) => {
    const newExpanded = new Set(expandedDepartments);
    if (newExpanded.has(department)) {
      newExpanded.delete(department);
    } else {
      newExpanded.add(department);
    }
    setExpandedDepartments(newExpanded);
  };

  const getStatusColor = (status: 'active' | 'busy' | 'offline') => {
    switch (status) {
      case 'active':
        return 'success';
      case 'busy':
        return 'warning';
      case 'offline':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: 'active' | 'busy' | 'offline') => {
    return <Circle sx={{ fontSize: 12, color: `${getStatusColor(status)}.main` }} />;
  };

  const getWorkloadColor = (workload: number) => {
    if (workload >= 5) return 'error';
    if (workload >= 4) return 'warning';
    if (workload >= 2) return 'info';
    return 'success';
  };

  const getPerformanceColor = (value: number, type: 'cpu' | 'ram' | 'response') => {
    if (type === 'response') {
      if (value > 500) return 'error';
      if (value > 250) return 'warning';
      return 'success';
    } else {
      if (value > 80) return 'error';
      if (value > 60) return 'warning';
      return 'success';
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

  const getDepartmentIcon = (department: string) => {
    switch (department) {
      case 'Executive':
        return '🏢';
      case 'Development':
        return '💻';
      case 'Operations':
        return '⚙️';
      case 'Support':
        return '🤝';
      default:
        return '👥';
    }
  };

  // Group employees by department
  const employeesByDepartment = employees.reduce((acc, emp) => {
    if (!acc[emp.department]) {
      acc[emp.department] = [];
    }
    acc[emp.department].push(emp);
    return acc;
  }, {} as Record<string, EmployeeStatusLive[]>);

  // Department order for consistent layout
  const departmentOrder = ['Executive', 'Development', 'Operations', 'Support'];

  if (isLoading) {
    return (
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            Employee Status Monitor
          </Typography>
          <Box sx={{ width: '100%' }}>
            <LinearProgress />
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Business color="primary" />
          Live Employee Status Grid
          <Chip
            size="small"
            label={`${employees.length} Total`}
            variant="outlined"
            sx={{ ml: 'auto' }}
          />
        </Typography>

        {departmentOrder.map((department) => {
          const deptEmployees = employeesByDepartment[department] || [];
          if (deptEmployees.length === 0) return null;

          const isExpanded = expandedDepartments.has(department);
          const activeCount = deptEmployees.filter(emp => emp.status === 'active' || emp.status === 'busy').length;
          const avgWorkload = deptEmployees.reduce((sum, emp) => sum + emp.workload, 0) / deptEmployees.length;

          return (
            <Box key={department} sx={{ mb: 2 }}>
              {/* Department Header */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  p: 1,
                  bgcolor: 'action.hover',
                  borderRadius: 1,
                  cursor: 'pointer',
                  '&:hover': {
                    bgcolor: 'action.selected',
                  },
                }}
                onClick={() => toggleDepartment(department)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6">
                    {getDepartmentIcon(department)} {department} Department
                  </Typography>
                  <Chip
                    size="small"
                    label={`${activeCount}/${deptEmployees.length} Active`}
                    color={activeCount === deptEmployees.length ? 'success' : 'default'}
                    variant="outlined"
                  />
                  <Chip
                    size="small"
                    label={`${avgWorkload.toFixed(1)} Avg Load`}
                    color={getWorkloadColor(avgWorkload) as any}
                    variant="outlined"
                  />
                </Box>
                <IconButton size="small">
                  {isExpanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              </Box>

              {/* Department Employees */}
              <Collapse in={isExpanded}>
                <Box sx={{ mt: 1 }}>
                  <Grid container spacing={2}>
                    {deptEmployees.map((employee) => (
                      <Grid item xs={12} sm={6} md={4} key={employee.employee_id}>
                        <Card variant="outlined" sx={{ height: '100%' }}>
                          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                            {/* Employee Header */}
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Avatar sx={{ width: 32, height: 32, bgcolor: 'primary.main' }}>
                                {employee.name.split(' ')[0][0]}
                              </Avatar>
                              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                                <Typography variant="subtitle2" noWrap>
                                  {employee.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" noWrap>
                                  {employee.role}
                                </Typography>
                              </Box>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                {getStatusIcon(employee.status)}
                                <Typography variant="caption" color={`${getStatusColor(employee.status)}.main`}>
                                  {employee.status.toUpperCase()}
                                </Typography>
                              </Box>
                            </Box>

                            {/* Current Task */}
                            {employee.current_task && (
                              <Box sx={{ mb: 1 }}>
                                <Typography variant="caption" color="text.secondary">
                                  Current Task:
                                </Typography>
                                <Typography variant="body2" noWrap>
                                  {employee.current_task}
                                </Typography>
                              </Box>
                            )}

                            {/* Last Activity */}
                            <Box sx={{ mb: 1 }}>
                              <Typography variant="caption" color="text.secondary">
                                Last Activity: {formatRelativeTime(employee.last_activity)}
                              </Typography>
                            </Box>

                            {/* Workload */}
                            <Box sx={{ mb: 1 }}>
                              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                                <Typography variant="caption">Workload</Typography>
                                <Typography variant="caption" fontWeight="bold">
                                  {employee.workload}/5
                                </Typography>
                              </Box>
                              <LinearProgress
                                variant="determinate"
                                value={(employee.workload / 5) * 100}
                                color={getWorkloadColor(employee.workload) as any}
                                sx={{ height: 4, borderRadius: 2 }}
                              />
                            </Box>

                            {/* Performance Metrics */}
                            {(employee.cpu_usage || employee.ram_usage || employee.response_time) && (
                              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {employee.cpu_usage && (
                                  <Tooltip title={`CPU Usage: ${employee.cpu_usage}%`}>
                                    <Chip
                                      size="small"
                                      icon={<Computer />}
                                      label={`${employee.cpu_usage}%`}
                                      color={getPerformanceColor(employee.cpu_usage, 'cpu') as any}
                                      variant="outlined"
                                    />
                                  </Tooltip>
                                )}
                                {employee.ram_usage && (
                                  <Tooltip title={`RAM Usage: ${employee.ram_usage}%`}>
                                    <Chip
                                      size="small"
                                      icon={<Memory />}
                                      label={`${employee.ram_usage}%`}
                                      color={getPerformanceColor(employee.ram_usage, 'ram') as any}
                                      variant="outlined"
                                    />
                                  </Tooltip>
                                )}
                                {employee.response_time && (
                                  <Tooltip title={`Response Time: ${employee.response_time}ms`}>
                                    <Chip
                                      size="small"
                                      icon={<Speed />}
                                      label={`${employee.response_time}ms`}
                                      color={getPerformanceColor(employee.response_time, 'response') as any}
                                      variant="outlined"
                                    />
                                  </Tooltip>
                                )}
                                {employee.memory_count && (
                                  <Tooltip title={`Memory Items: ${employee.memory_count}`}>
                                    <Chip
                                      size="small"
                                      icon={<Memory />}
                                      label={`${employee.memory_count} items`}
                                      color="info"
                                      variant="outlined"
                                    />
                                  </Tooltip>
                                )}
                              </Box>
                            )}
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Collapse>
              
              {department !== 'Support' && <Divider sx={{ mt: 2 }} />}
            </Box>
          );
        })}
      </CardContent>
    </Card>
  );
};

export default EmployeeStatusGrid;