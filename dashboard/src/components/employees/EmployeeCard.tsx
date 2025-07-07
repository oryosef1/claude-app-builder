import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Avatar,
  LinearProgress,
  Box,
  Button,
  Badge,
  Tooltip,
  IconButton
} from '@mui/material';
import {
  Person,
  Assignment,
  Speed,
  Star,
  MoreVert,
  Circle as CircleIcon
} from '@mui/icons-material';
import { Employee, EmployeeStatus } from '@/types/employee';

interface EmployeeCardProps {
  employee: Employee;
  status?: EmployeeStatus;
  onViewDetails: (employee: Employee) => void;
  onAssignTask: (employeeId: string) => void;
  compact?: boolean;
}

const EmployeeCard: React.FC<EmployeeCardProps> = ({
  employee,
  status,
  onViewDetails,
  onAssignTask,
  compact = false
}) => {
  const getStatusColor = (status: Employee['status']) => {
    switch (status) {
      case 'active': return '#4caf50';
      case 'busy': return '#ff9800';
      case 'offline': return '#f44336';
      default: return '#9e9e9e';
    }
  };

  const getWorkloadColor = (workload: number) => {
    if (workload < 50) return 'success';
    if (workload < 80) return 'warning';
    return 'error';
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

  const getPerformanceScore = () => {
    const metrics = Object.values(employee.performance_metrics);
    return metrics.length > 0 ? Math.round(metrics.reduce((sum, val) => sum + val, 0) / metrics.length) : 0;
  };

  const formatResponseTime = (ms?: number) => {
    if (!ms) return 'N/A';
    return ms < 1000 ? `${Math.round(ms)}ms` : `${(ms / 1000).toFixed(1)}s`;
  };

  return (
    <Card 
      sx={{ 
        height: compact ? 280 : 350,
        display: 'flex',
        flexDirection: 'column',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: 4
        }
      }}
    >
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        {/* Header with Avatar and Status */}
        <Box display="flex" alignItems="center" mb={2}>
          <Badge
            overlap="circular"
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            badgeContent={
              <CircleIcon 
                sx={{ 
                  color: getStatusColor(employee.status),
                  fontSize: 12
                }}
              />
            }
          >
            <Avatar 
              sx={{ 
                width: compact ? 40 : 48, 
                height: compact ? 40 : 48,
                bgcolor: getDepartmentColor(employee.department)
              }}
            >
              <Person />
            </Avatar>
          </Badge>
          
          <Box ml={2} flexGrow={1}>
            <Typography variant={compact ? "body1" : "h6"} fontWeight="bold" noWrap>
              {employee.name}
            </Typography>
            <Typography variant="body2" color="text.secondary" noWrap>
              {employee.role}
            </Typography>
          </Box>
          
          <IconButton size="small">
            <MoreVert />
          </IconButton>
        </Box>

        {/* Department and Level */}
        <Box display="flex" gap={1} mb={2}>
          <Chip 
            label={employee.department}
            size="small"
            sx={{ 
              bgcolor: getDepartmentColor(employee.department),
              color: 'white',
              fontSize: '0.75rem'
            }}
          />
          <Chip 
            label={employee.level}
            size="small"
            variant="outlined"
          />
        </Box>

        {/* Workload Progress */}
        <Box mb={2}>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={0.5}>
            <Typography variant="body2" color="text.secondary">
              Workload
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {employee.workload}%
            </Typography>
          </Box>
          <LinearProgress 
            variant="determinate" 
            value={employee.workload}
            color={getWorkloadColor(employee.workload)}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>

        {/* Performance Score */}
        <Box display="flex" alignItems="center" mb={2}>
          <Star sx={{ color: '#ffd700', mr: 1, fontSize: 20 }} />
          <Typography variant="body2" color="text.secondary">
            Performance: 
          </Typography>
          <Typography variant="body2" fontWeight="bold" ml={0.5}>
            {getPerformanceScore()}%
          </Typography>
        </Box>

        {/* Current Projects */}
        {employee.current_projects.length > 0 && (
          <Box mb={2}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Current Projects:
            </Typography>
            <Box>
              {employee.current_projects.slice(0, compact ? 1 : 2).map((project, index) => (
                <Typography 
                  key={index}
                  variant="body2" 
                  sx={{ 
                    fontSize: '0.75rem',
                    bgcolor: 'action.hover',
                    px: 1,
                    py: 0.5,
                    borderRadius: 1,
                    mb: 0.5,
                    display: 'block'
                  }}
                  noWrap
                >
                  {project}
                </Typography>
              ))}
              {employee.current_projects.length > (compact ? 1 : 2) && (
                <Typography variant="body2" color="text.secondary" fontSize="0.75rem">
                  +{employee.current_projects.length - (compact ? 1 : 2)} more
                </Typography>
              )}
            </Box>
          </Box>
        )}

        {/* Status Information */}
        {status && (
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
            <Tooltip title="Response Time">
              <Box display="flex" alignItems="center">
                <Speed sx={{ fontSize: 16, mr: 0.5, color: 'text.secondary' }} />
                <Typography variant="caption">
                  {formatResponseTime(status.response_time)}
                </Typography>
              </Box>
            </Tooltip>
            <Typography variant="caption" color="text.secondary">
              {status.current_task || 'Available'}
            </Typography>
          </Box>
        )}

        {/* Skills Preview */}
        {!compact && employee.skills.length > 0 && (
          <Box>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Skills:
            </Typography>
            <Box display="flex" flexWrap="wrap" gap={0.5}>
              {employee.skills.slice(0, 3).map((skill) => (
                <Chip
                  key={skill}
                  label={skill.replace('_', ' ')}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
              ))}
              {employee.skills.length > 3 && (
                <Chip
                  label={`+${employee.skills.length - 3}`}
                  size="small"
                  variant="outlined"
                  sx={{ fontSize: '0.7rem', height: 20 }}
                />
              )}
            </Box>
          </Box>
        )}
      </CardContent>

      {/* Actions */}
      <CardActions sx={{ pt: 0, justifyContent: 'space-between' }}>
        <Button 
          size="small" 
          onClick={() => onViewDetails(employee)}
          startIcon={<Person />}
        >
          Details
        </Button>
        <Button 
          size="small" 
          onClick={() => onAssignTask(employee.id)}
          startIcon={<Assignment />}
          disabled={employee.workload >= 100}
          color="primary"
        >
          Assign Task
        </Button>
      </CardActions>
    </Card>
  );
};

export default EmployeeCard;