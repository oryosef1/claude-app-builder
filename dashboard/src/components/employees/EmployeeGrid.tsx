import React, { useState } from 'react';
import {
  Box,
  Grid,
  Typography,
  Card,
  CardHeader,
  CardContent,
  Chip,
  Collapse,
  IconButton,
  Badge,
  Tooltip,
  LinearProgress
} from '@mui/material';
import {
  ExpandMore,
  ExpandLess,
  People,
  TrendingUp,
  Assignment,
  Speed
} from '@mui/icons-material';
import { Employee, EmployeeStatus, DepartmentStats } from '@/types/employee';
import EmployeeCard from './EmployeeCard';

interface EmployeeGridProps {
  employees: Employee[];
  employeeStatuses: Record<string, EmployeeStatus>;
  departmentStats: DepartmentStats[];
  groupBy?: 'department' | 'status' | 'level';
  showWorkload?: boolean;
  showPerformance?: boolean;
  onEmployeeClick: (employee: Employee) => void;
  onTaskAssign: (employeeId: string) => void;
  loading?: boolean;
}

const EmployeeGrid: React.FC<EmployeeGridProps> = ({
  employees,
  employeeStatuses,
  departmentStats,
  groupBy = 'department',
  showWorkload = true,
  showPerformance = false,
  onEmployeeClick,
  onTaskAssign,
  loading = false
}) => {
  const [expandedDepartments, setExpandedDepartments] = useState<Record<string, boolean>>({
    Executive: true,
    Development: true,
    Operations: true,
    Support: true
  });

  const toggleDepartment = (department: string) => {
    setExpandedDepartments(prev => ({
      ...prev,
      [department]: !prev[department]
    }));
  };

  const getDepartmentColor = (department: string) => {
    const colors = {
      'Executive': '#1976d2',
      'Development': '#388e3c', 
      'Operations': '#f57c00',
      'Support': '#7b1fa2'
    };
    return colors[department as keyof typeof colors] || '#757575';
  };

  const getDepartmentIcon = (department: string) => {
    switch (department) {
      case 'Executive': return '👥';
      case 'Development': return '💻';
      case 'Operations': return '⚙️';
      case 'Support': return '🛠️';
      default: return '📋';
    }
  };

  const getStatusCounts = (deptEmployees: Employee[]) => {
    const counts = deptEmployees.reduce((acc, emp) => {
      acc[emp.status] = (acc[emp.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      active: counts.active || 0,
      busy: counts.busy || 0,
      offline: counts.offline || 0
    };
  };

  const getAverageWorkload = (deptEmployees: Employee[]) => {
    if (deptEmployees.length === 0) return 0;
    return Math.round(
      deptEmployees.reduce((sum, emp) => sum + emp.workload, 0) / deptEmployees.length
    );
  };

  const groupEmployees = () => {
    if (groupBy === 'department') {
      const departments = ['Executive', 'Development', 'Operations', 'Support'];
      return departments.map(dept => ({
        key: dept,
        title: dept,
        employees: employees.filter(emp => emp.department === dept)
      }));
    }
    
    if (groupBy === 'status') {
      const statuses = ['active', 'busy', 'offline'];
      return statuses.map(status => ({
        key: status,
        title: status.charAt(0).toUpperCase() + status.slice(1),
        employees: employees.filter(emp => emp.status === status)
      }));
    }
    
    if (groupBy === 'level') {
      const levels = ['Senior', 'Mid', 'Junior'];
      return levels.map(level => ({
        key: level,
        title: level,
        employees: employees.filter(emp => emp.level === level)
      }));
    }
    
    return [];
  };

  const getDepartmentStats = (department: string) => {
    return departmentStats.find(stat => stat.name === department);
  };

  if (loading) {
    return (
      <Box>
        {[1, 2, 3, 4].map(i => (
          <Card key={i} sx={{ mb: 2 }}>
            <CardHeader title={<LinearProgress />} />
            <CardContent>
              <Grid container spacing={2}>
                {[1, 2, 3].map(j => (
                  <Grid item xs={12} md={6} lg={4} key={j}>
                    <LinearProgress sx={{ height: 200, borderRadius: 2 }} />
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        ))}
      </Box>
    );
  }

  return (
    <Box>
      {groupEmployees().map(group => {
        const isExpanded = expandedDepartments[group.key] ?? true;
        const deptStats = getDepartmentStats(group.key);
        const statusCounts = getStatusCounts(group.employees);
        const avgWorkload = getAverageWorkload(group.employees);
        
        return (
          <Card key={group.key} sx={{ mb: 3, overflow: 'visible' }}>
            <CardHeader
              avatar={
                <Box sx={{ 
                  fontSize: '2rem',
                  filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
                }}>
                  {getDepartmentIcon(group.key)}
                </Box>
              }
              title={
                <Box display="flex" alignItems="center" gap={2}>
                  <Typography variant="h6" fontWeight="bold">
                    {group.title}
                  </Typography>
                  <Badge 
                    badgeContent={group.employees.length} 
                    color="primary"
                    sx={{ '& .MuiBadge-badge': { fontSize: '0.75rem' } }}
                  >
                    <People />
                  </Badge>
                </Box>
              }
              subheader={
                <Box display="flex" alignItems="center" gap={2} mt={1}>
                  {/* Status Indicators */}
                  <Box display="flex" gap={1}>
                    <Chip 
                      label={`${statusCounts.active} Active`}
                      size="small"
                      sx={{ bgcolor: '#4caf50', color: 'white', fontSize: '0.7rem' }}
                    />
                    <Chip 
                      label={`${statusCounts.busy} Busy`}
                      size="small"
                      sx={{ bgcolor: '#ff9800', color: 'white', fontSize: '0.7rem' }}
                    />
                    {statusCounts.offline > 0 && (
                      <Chip 
                        label={`${statusCounts.offline} Offline`}
                        size="small"
                        sx={{ bgcolor: '#f44336', color: 'white', fontSize: '0.7rem' }}
                      />
                    )}
                  </Box>
                  
                  {/* Average Workload */}
                  {showWorkload && (
                    <Tooltip title="Average Workload">
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <TrendingUp sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="caption">
                          {avgWorkload}% avg
                        </Typography>
                      </Box>
                    </Tooltip>
                  )}
                  
                  {/* Department Performance */}
                  {showPerformance && deptStats && (
                    <Tooltip title="Department Performance">
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Speed sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="caption">
                          {deptStats.performance_average}%
                        </Typography>
                      </Box>
                    </Tooltip>
                  )}
                  
                  {/* Active Projects */}
                  {deptStats && (
                    <Tooltip title="Active Projects">
                      <Box display="flex" alignItems="center" gap={0.5}>
                        <Assignment sx={{ fontSize: 16, color: 'text.secondary' }} />
                        <Typography variant="caption">
                          {deptStats.total_projects} projects
                        </Typography>
                      </Box>
                    </Tooltip>
                  )}
                </Box>
              }
              action={
                <IconButton 
                  onClick={() => toggleDepartment(group.key)}
                  sx={{ 
                    color: getDepartmentColor(group.key),
                    '&:hover': { bgcolor: 'action.hover' }
                  }}
                >
                  {isExpanded ? <ExpandLess /> : <ExpandMore />}
                </IconButton>
              }
              sx={{
                borderBottom: `3px solid ${getDepartmentColor(group.key)}`,
                bgcolor: 'background.default'
              }}
            />
            
            <Collapse in={isExpanded} timeout="auto" unmountOnExit>
              <CardContent>
                {group.employees.length === 0 ? (
                  <Box 
                    display="flex" 
                    justifyContent="center" 
                    alignItems="center" 
                    minHeight={200}
                    color="text.secondary"
                  >
                    <Typography variant="body1">
                      No employees in this {groupBy}
                    </Typography>
                  </Box>
                ) : (
                  <Grid container spacing={3}>
                    {group.employees.map(employee => (
                      <Grid item xs={12} sm={6} lg={4} key={employee.id}>
                        <EmployeeCard
                          employee={employee}
                          status={employeeStatuses[employee.id]}
                          onViewDetails={onEmployeeClick}
                          onAssignTask={onTaskAssign}
                          compact={false}
                        />
                      </Grid>
                    ))}
                  </Grid>
                )}
              </CardContent>
            </Collapse>
          </Card>
        );
      })}
      
      {employees.length === 0 && !loading && (
        <Card>
          <CardContent>
            <Box 
              display="flex" 
              flexDirection="column"
              justifyContent="center" 
              alignItems="center" 
              minHeight={300}
              color="text.secondary"
            >
              <People sx={{ fontSize: 64, mb: 2, opacity: 0.5 }} />
              <Typography variant="h6" gutterBottom>
                No employees found
              </Typography>
              <Typography variant="body2">
                Try adjusting your filters or check your connection
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default EmployeeGrid;