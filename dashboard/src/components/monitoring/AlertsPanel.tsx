import React, { useState } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Box,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Chip,
  Button,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Collapse,
  Alert,
  AlertTitle,
  Tooltip,
} from '@mui/material';
import {
  Warning,
  Error,
  Info,
  CheckCircle,
  Close,
  MoreVert,
  Settings,
  Notifications,
  NotificationsOff,
  ExpandMore,
  ExpandLess,
  Refresh,
} from '@mui/icons-material';
import { SystemAlert } from '@/services/monitoring';

interface AlertsPanelProps {
  alerts: SystemAlert[];
  isLoading?: boolean;
  onResolveAlert?: (alertId: string) => void;
  onDismissAlert?: (alertId: string) => void;
  onRefresh?: () => void;
}

const AlertsPanel: React.FC<AlertsPanelProps> = ({
  alerts,
  isLoading = false,
  onResolveAlert,
  onDismissAlert,
  onRefresh,
}) => {
  const [expandedAlerts, setExpandedAlerts] = useState(false);
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null);
  const [selectedAlert, setSelectedAlert] = useState<string | null>(null);
  const [alertSettings, setAlertSettings] = useState({
    notifications: true,
    autoResolve: false,
    soundEnabled: true,
  });

  const getAlertIcon = (type: SystemAlert['type']) => {
    switch (type) {
      case 'critical':
        return <Error color="error" />;
      case 'warning':
        return <Warning color="warning" />;
      case 'info':
        return <Info color="info" />;
      case 'resolved':
        return <CheckCircle color="success" />;
      default:
        return <Info color="disabled" />;
    }
  };

  const getAlertColor = (severity: SystemAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      case 'low':
        return 'info';
      default:
        return 'default';
    }
  };

  const getAlertBackground = (type: SystemAlert['type']) => {
    switch (type) {
      case 'critical':
        return 'error.light';
      case 'warning':
        return 'warning.light';
      case 'info':
        return 'info.light';
      case 'resolved':
        return 'success.light';
      default:
        return 'grey.100';
    }
  };

  const formatRelativeTime = (timestamp: string) => {
    const now = new Date();
    const time = new Date(timestamp);
    const diffMs = now.getTime() - time.getTime();
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMinutes > 0) return `${diffMinutes}m ago`;
    return 'Just now';
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, alertId: string) => {
    setMenuAnchor(event.currentTarget);
    setSelectedAlert(alertId);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
    setSelectedAlert(null);
  };

  const handleResolveAlert = () => {
    if (selectedAlert && onResolveAlert) {
      onResolveAlert(selectedAlert);
    }
    handleMenuClose();
  };

  const handleDismissAlert = () => {
    if (selectedAlert && onDismissAlert) {
      onDismissAlert(selectedAlert);
    }
    handleMenuClose();
  };

  // Separate alerts by type
  const activeAlerts = alerts.filter(alert => alert.type !== 'resolved');
  const resolvedAlerts = alerts.filter(alert => alert.type === 'resolved');
  const criticalAlerts = activeAlerts.filter(alert => alert.severity === 'critical' || alert.severity === 'high');

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
          <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {alertSettings.notifications ? <Notifications color="primary" /> : <NotificationsOff color="disabled" />}
            System Alerts & Notifications
            {criticalAlerts.length > 0 && (
              <Chip
                size="small"
                label={`${criticalAlerts.length} Critical`}
                color="error"
                variant="filled"
              />
            )}
          </Typography>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Refresh alerts">
              <IconButton size="small" onClick={onRefresh} disabled={isLoading}>
                <Refresh />
              </IconButton>
            </Tooltip>
            <Tooltip title="Alert settings">
              <IconButton size="small">
                <Settings />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>

        {/* Alert Summary */}
        {activeAlerts.length === 0 && resolvedAlerts.length === 0 ? (
          <Alert severity="success">
            <AlertTitle>All Clear</AlertTitle>
            No active alerts or issues detected
          </Alert>
        ) : (
          <Box sx={{ mb: 2 }}>
            {criticalAlerts.length > 0 && (
              <Alert severity="error" sx={{ mb: 1 }}>
                <AlertTitle>Critical Issues Detected</AlertTitle>
                {criticalAlerts.length} critical alert{criticalAlerts.length > 1 ? 's' : ''} require immediate attention
              </Alert>
            )}
            
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                size="small"
                label={`${activeAlerts.length} Active`}
                color={activeAlerts.length > 0 ? 'warning' : 'success'}
                variant="outlined"
              />
              <Chip
                size="small"
                label={`${resolvedAlerts.length} Resolved`}
                color="success"
                variant="outlined"
              />
              <Chip
                size="small"
                label={`${criticalAlerts.length} Critical`}
                color={criticalAlerts.length > 0 ? 'error' : 'default'}
                variant="outlined"
              />
            </Box>
          </Box>
        )}

        {/* Active Alerts */}
        {activeAlerts.length > 0 && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
              Active Alerts
            </Typography>
            <List sx={{ p: 0 }}>
              {activeAlerts.map((alert, index) => (
                <ListItem
                  key={alert.id}
                  sx={{
                    px: 0,
                    py: 1,
                    borderBottom: index < activeAlerts.length - 1 ? 1 : 0,
                    borderColor: 'divider',
                    bgcolor: alert.severity === 'critical' || alert.severity === 'high' 
                      ? 'error.light' 
                      : 'transparent',
                    borderRadius: 1,
                    mb: 0.5,
                    opacity: alert.type === 'resolved' ? 0.6 : 1,
                  }}
                >
                  <ListItemAvatar>
                    <Avatar sx={{ width: 32, height: 32, bgcolor: getAlertBackground(alert.type) }}>
                      {getAlertIcon(alert.type)}
                    </Avatar>
                  </ListItemAvatar>
                  
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Typography variant="body2" fontWeight="bold">
                          {alert.title}
                        </Typography>
                        <Chip
                          size="small"
                          label={alert.severity.toUpperCase()}
                          color={getAlertColor(alert.severity) as any}
                          variant="filled"
                        />
                        {alert.employee_id && (
                          <Chip
                            size="small"
                            label={`Employee: ${alert.employee_id}`}
                            variant="outlined"
                          />
                        )}
                        {alert.department && (
                          <Chip
                            size="small"
                            label={`Dept: ${alert.department}`}
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          {alert.message}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {formatRelativeTime(alert.timestamp)}
                          {alert.resolved_at && ` • Resolved ${formatRelativeTime(alert.resolved_at)}`}
                        </Typography>
                      </Box>
                    }
                  />
                  
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, alert.id)}
                  >
                    <MoreVert />
                  </IconButton>
                </ListItem>
              ))}
            </List>
          </Box>
        )}

        {/* Resolved Alerts (Collapsible) */}
        {resolvedAlerts.length > 0 && (
          <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle2">
                Recent Resolved Alerts
              </Typography>
              <Button
                size="small"
                onClick={() => setExpandedAlerts(!expandedAlerts)}
                endIcon={expandedAlerts ? <ExpandLess /> : <ExpandMore />}
              >
                {expandedAlerts ? 'Hide' : `Show ${resolvedAlerts.length}`}
              </Button>
            </Box>
            
            <Collapse in={expandedAlerts}>
              <List sx={{ p: 0 }}>
                {resolvedAlerts.slice(0, 5).map((alert, index) => (
                  <ListItem
                    key={alert.id}
                    sx={{
                      px: 0,
                      py: 0.5,
                      borderBottom: index < Math.min(resolvedAlerts.length, 5) - 1 ? 1 : 0,
                      borderColor: 'divider',
                      opacity: 0.7,
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar sx={{ width: 28, height: 28, bgcolor: 'success.light' }}>
                        <CheckCircle color="success" fontSize="small" />
                      </Avatar>
                    </ListItemAvatar>
                    
                    <ListItemText
                      primary={
                        <Typography variant="body2" sx={{ textDecoration: 'line-through' }}>
                          {alert.title}
                        </Typography>
                      }
                      secondary={
                        <Typography variant="caption" color="text.secondary">
                          Resolved {formatRelativeTime(alert.resolved_at || alert.timestamp)}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Collapse>
          </Box>
        )}

        {/* Alert Actions Menu */}
        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
        >
          <MenuItem onClick={handleResolveAlert}>
            <CheckCircle fontSize="small" sx={{ mr: 1 }} />
            Mark as Resolved
          </MenuItem>
          <MenuItem onClick={handleDismissAlert}>
            <Close fontSize="small" sx={{ mr: 1 }} />
            Dismiss Alert
          </MenuItem>
          <Divider />
          <MenuItem onClick={handleMenuClose}>
            <Info fontSize="small" sx={{ mr: 1 }} />
            View Details
          </MenuItem>
        </Menu>
      </CardContent>
    </Card>
  );
};

export default AlertsPanel;