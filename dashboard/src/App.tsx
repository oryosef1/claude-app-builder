import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, AppBar, Toolbar, Typography, Button, Avatar } from '@mui/material';
import { Dashboard, People, Memory, AccountTree, Analytics as AnalyticsIcon, Settings } from '@mui/icons-material';
import Employees from '@/pages/Employees';
import MemoryPage from '@/pages/Memory';
import WorkflowsPage from '@/pages/Workflows';
import MonitoringDashboard from '@/pages/MonitoringDashboard';
import CentralizedDashboard from '@/pages/CentralizedDashboard';
import Analytics from '@/pages/Analytics';

// Create theme
const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          textTransform: 'none',
          fontWeight: 600,
        },
      },
    },
  },
});

// Simple header component
const Header: React.FC = () => {
  return (
    <AppBar position="sticky" elevation={1}>
      <Toolbar>
        <Box display="flex" alignItems="center" gap={2} flexGrow={1}>
          <Avatar sx={{ bgcolor: 'secondary.main' }}>
            🤖
          </Avatar>
          <Box>
            <Typography variant="h6" fontWeight="bold">
              Claude AI Software Company
            </Typography>
            <Typography variant="caption" color="inherit" sx={{ opacity: 0.8 }}>
              Master Control Dashboard
            </Typography>
          </Box>
        </Box>
        
        <Box display="flex" gap={1}>
          <Button color="inherit" startIcon={<Dashboard />}>
            Dashboard
          </Button>
          <Button color="inherit" startIcon={<People />}>
            Employees
          </Button>
          <Button color="inherit" startIcon={<Memory />}>
            Memory
          </Button>
          <Button color="inherit" startIcon={<AccountTree />}>
            Workflows
          </Button>
          <Button color="inherit" startIcon={<AnalyticsIcon />}>
            Analytics
          </Button>
          <Button color="inherit" startIcon={<Settings />}>
            Settings
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};


// Placeholder pages
const SettingsPage = () => <Box sx={{ p: 3 }}><Typography variant="h4">Settings</Typography></Box>;

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
          <Header />
          
          <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default' }}>
            <Routes>
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<CentralizedDashboard />} />
              <Route path="/dashboard/monitoring" element={<MonitoringDashboard />} />
              <Route path="/employees" element={<Employees />} />
              <Route path="/memory" element={<MemoryPage />} />
              <Route path="/workflows" element={<WorkflowsPage />} />
              <Route path="/analytics" element={<Analytics />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </Box>
        </Box>
      </Router>
    </ThemeProvider>
  );
}

export default App;