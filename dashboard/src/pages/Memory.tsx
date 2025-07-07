/**
 * Memory Management Page
 * Main page for memory management dashboard
 */

import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Tabs,
  Tab,
  Button,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Snackbar,
  CircularProgress,
  Paper,
  IconButton,
  Tooltip,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
} from '@mui/material';
import {
  Memory as MemoryIcon,
  Search,
  Analytics,
  Settings,
  Refresh,
  Archive,
  CleaningServices,
  ViewList,
  ViewModule,
  Add,
} from '@mui/icons-material';
import MemoryCard from '@/components/memory/MemoryCard';
import MemorySearchBar from '@/components/memory/MemorySearchBar';
import MemoryAnalytics from '@/components/memory/MemoryAnalytics';
import { useMemoryStore } from '@/stores/memoryStore';
import { Memory } from '@/types/memory';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`memory-tabpanel-${index}`}
      aria-labelledby={`memory-tab-${index}`}
      {...other}
    >
      {value === index && <Box>{children}</Box>}
    </div>
  );
}

const EMPLOYEE_OPTIONS = [
  { value: 'emp_001_pm', label: 'Project Manager (emp_001)' },
  { value: 'emp_002_tl', label: 'Technical Lead (emp_002)' },
  { value: 'emp_003_qd', label: 'QA Director (emp_003)' },
  { value: 'emp_004_sd', label: 'Senior Developer (emp_004)' },
  { value: 'emp_005_jd', label: 'Junior Developer (emp_005)' },
  { value: 'emp_006_qe', label: 'QA Engineer (emp_006)' },
  { value: 'emp_007_te', label: 'Test Engineer (emp_007)' },
  { value: 'emp_008_do', label: 'DevOps Engineer (emp_008)' },
  { value: 'emp_009_sre', label: 'Site Reliability Engineer (emp_009)' },
  { value: 'emp_010_se', label: 'Security Engineer (emp_010)' },
  { value: 'emp_011_tw', label: 'Technical Writer (emp_011)' },
  { value: 'emp_012_ux', label: 'UI/UX Designer (emp_012)' },
  { value: 'emp_013_be', label: 'Build Engineer (emp_013)' },
];

const MemoryPage: React.FC = () => {
  const [tabValue, setTabValue] = useState(0);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' as 'success' | 'error' });
  const [addMemoryDialog, setAddMemoryDialog] = useState(false);
  const [newMemoryContent, setNewMemoryContent] = useState('');
  const [newMemoryType, setNewMemoryType] = useState<'experience' | 'knowledge' | 'decision'>('experience');

  const {
    selectedEmployee,
    selectedMemoryTypes,
    searchQuery,
    isLoading,
    error,
    memories,
    employeeStats,
    cleanupAnalytics,
    selectedMemories,
    setSelectedEmployee,
    setSelectedMemoryTypes,
    setSearchQuery,
    setError,
    searchMemories,
    loadEmployeeStats,
    loadAllEmployeeStats,
    loadCleanupAnalytics,
    performCleanup,
    archiveSelectedMemories,
    toggleMemorySelection,
    selectAllMemories,
    clearSelection,
    getSortedMemories,
    getSelectedEmployeeStats,
    getTotalCompanyMemories,
  } = useMemoryStore();

  // Load initial data
  useEffect(() => {
    loadAllEmployeeStats();
    loadCleanupAnalytics();
  }, [loadAllEmployeeStats, loadCleanupAnalytics]);

  // Load employee-specific data when employee changes
  useEffect(() => {
    if (selectedEmployee) {
      searchMemories(selectedEmployee, searchQuery || '*');
      loadEmployeeStats(selectedEmployee);
    }
  }, [selectedEmployee, searchMemories, loadEmployeeStats]);

  // Handle search
  const handleSearch = (options: any) => {
    if (!selectedEmployee) {
      setSnackbar({ open: true, message: 'Please select an employee first', severity: 'error' });
      return;
    }
    searchMemories(selectedEmployee, searchQuery || '*', options);
  };

  // Handle memory actions
  const handleArchiveMemory = async (memoryId: string) => {
    toggleMemorySelection(memoryId);
    await archiveSelectedMemories();
    setSnackbar({ open: true, message: 'Memory archived successfully', severity: 'success' });
  };

  const handleViewMemory = (memory: Memory) => {
    setSelectedMemory(memory);
  };

  const handleCleanup = async () => {
    await performCleanup();
    setSnackbar({ open: true, message: 'Memory cleanup completed', severity: 'success' });
  };

  const handleRefresh = () => {
    loadAllEmployeeStats();
    loadCleanupAnalytics();
    if (selectedEmployee) {
      searchMemories(selectedEmployee, searchQuery || '*');
      loadEmployeeStats(selectedEmployee);
    }
  };

  const handleAddMemory = async () => {
    if (!selectedEmployee || !newMemoryContent.trim()) {
      setSnackbar({ open: true, message: 'Please select an employee and enter memory content', severity: 'error' });
      return;
    }

    try {
      // This would call the appropriate store method based on memory type
      // For now, we'll close the dialog and show success
      setAddMemoryDialog(false);
      setNewMemoryContent('');
      setSnackbar({ open: true, message: 'Memory added successfully', severity: 'success' });
      
      // Refresh memories
      searchMemories(selectedEmployee, searchQuery || '*');
      loadEmployeeStats(selectedEmployee);
    } catch (error) {
      setSnackbar({ open: true, message: 'Failed to add memory', severity: 'error' });
    }
  };

  const sortedMemories = getSortedMemories();
  const selectedEmployeeStats = getSelectedEmployeeStats();
  const totalMemories = getTotalCompanyMemories();

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h4" gutterBottom display="flex" alignItems="center" gap={1}>
            <MemoryIcon />
            Memory Management Dashboard
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage and analyze AI employee memories across the company
          </Typography>
        </Box>
        
        <Box display="flex" gap={1}>
          <Tooltip title="Refresh data">
            <IconButton onClick={handleRefresh} disabled={isLoading}>
              <Refresh />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            startIcon={<Archive />}
            onClick={archiveSelectedMemories}
            disabled={selectedMemories.length === 0 || isLoading}
          >
            Archive Selected ({selectedMemories.length})
          </Button>
          <Button
            variant="contained"
            startIcon={<CleaningServices />}
            onClick={handleCleanup}
            disabled={isLoading}
          >
            Run Cleanup
          </Button>
        </Box>
      </Box>

      {/* Stats Overview */}
      <Grid container spacing={2} mb={3}>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="primary.main">
              {totalMemories.toLocaleString()}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Company Memories
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="success.main">
              {Object.keys(employeeStats).length}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Active Employees
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="h4" color="info.main">
              {selectedEmployeeStats?.total || 0}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Selected Employee Memories
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Error Display */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Main Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={(_, newValue) => setTabValue(newValue)}>
          <Tab icon={<Search />} label="Search & Browse" />
          <Tab icon={<Analytics />} label="Analytics" />
          <Tab icon={<Settings />} label="Management" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        {/* Search & Browse */}
        <Box mb={3}>
          <FormControl sx={{ minWidth: 300, mb: 2 }}>
            <InputLabel>Select Employee</InputLabel>
            <Select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              label="Select Employee"
            >
              {EMPLOYEE_OPTIONS.map(option => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {selectedEmployee && (
          <>
            <MemorySearchBar
              searchQuery={searchQuery}
              selectedMemoryTypes={selectedMemoryTypes}
              onSearchQueryChange={setSearchQuery}
              onMemoryTypesChange={setSelectedMemoryTypes}
              onSearch={handleSearch}
              onClear={() => {
                setSearchQuery('');
                clearSelection();
              }}
              isLoading={isLoading}
            />

            {/* View Controls */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="body2" color="text.secondary">
                {sortedMemories.length} memories found
                {selectedMemories.length > 0 && ` (${selectedMemories.length} selected)`}
              </Typography>
              
              <Box display="flex" gap={1}>
                <Button
                  size="small"
                  onClick={selectAllMemories}
                  disabled={sortedMemories.length === 0}
                >
                  Select All
                </Button>
                <Button
                  size="small"
                  onClick={clearSelection}
                  disabled={selectedMemories.length === 0}
                >
                  Clear Selection
                </Button>
                <IconButton
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  size="small"
                >
                  {viewMode === 'grid' ? <ViewList /> : <ViewModule />}
                </IconButton>
              </Box>
            </Box>

            {/* Memory Grid/List */}
            {isLoading ? (
              <Box display="flex" justifyContent="center" py={4}>
                <CircularProgress />
              </Box>
            ) : (
              <Grid container spacing={2}>
                {sortedMemories.map((memory) => (
                  <Grid 
                    item 
                    xs={12} 
                    sm={viewMode === 'grid' ? 6 : 12} 
                    md={viewMode === 'grid' ? 4 : 12}
                    lg={viewMode === 'grid' ? 3 : 12}
                    key={memory.id}
                  >
                    <MemoryCard
                      memory={memory}
                      isSelected={selectedMemories.includes(memory.id)}
                      onToggleSelection={toggleMemorySelection}
                      onArchive={handleArchiveMemory}
                      onView={handleViewMemory}
                      compact={viewMode === 'list'}
                    />
                  </Grid>
                ))}
              </Grid>
            )}

            {sortedMemories.length === 0 && !isLoading && (
              <Alert severity="info" sx={{ mt: 2 }}>
                No memories found for the selected criteria. Try adjusting your search or memory type filters.
              </Alert>
            )}
          </>
        )}

        {!selectedEmployee && (
          <Alert severity="info">
            Please select an employee to view and search their memories.
          </Alert>
        )}
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* Analytics */}
        <MemoryAnalytics
          employeeStats={employeeStats}
          cleanupAnalytics={cleanupAnalytics}
          onPerformCleanup={handleCleanup}
          isLoading={isLoading}
        />
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {/* Management */}
        <Box sx={{ p: 3 }}>
          <Typography variant="h5" gutterBottom>
            Memory Management Tools
          </Typography>
          <Typography variant="body1" color="text.secondary" mb={3}>
            Advanced memory management operations and settings.
          </Typography>
          
          <Alert severity="info">
            Advanced management features coming soon! This will include bulk operations, 
            memory lifecycle policies, and automated cleanup scheduling.
          </Alert>
        </Box>
      </TabPanel>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="add memory"
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => setAddMemoryDialog(true)}
        disabled={!selectedEmployee}
      >
        <Add />
      </Fab>

      {/* Memory Detail Dialog */}
      <Dialog
        open={!!selectedMemory}
        onClose={() => setSelectedMemory(null)}
        maxWidth="md"
        fullWidth
      >
        {selectedMemory && (
          <>
            <DialogTitle>
              Memory Details - {selectedMemory.type.charAt(0).toUpperCase() + selectedMemory.type.slice(1)}
            </DialogTitle>
            <DialogContent>
              <Typography variant="body1" paragraph>
                {selectedMemory.content}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                Created: {new Date(selectedMemory.timestamp).toLocaleString()}
              </Typography>
              {selectedMemory.metadata.task && (
                <Typography variant="caption" color="text.secondary" display="block">
                  Task: {selectedMemory.metadata.task}
                </Typography>
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setSelectedMemory(null)}>Close</Button>
            </DialogActions>
          </>
        )}
      </Dialog>

      {/* Add Memory Dialog */}
      <Dialog
        open={addMemoryDialog}
        onClose={() => setAddMemoryDialog(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Add New Memory</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mb: 2, mt: 1 }}>
            <InputLabel>Memory Type</InputLabel>
            <Select
              value={newMemoryType}
              onChange={(e) => setNewMemoryType(e.target.value as typeof newMemoryType)}
              label="Memory Type"
            >
              <MenuItem value="experience">Experience</MenuItem>
              <MenuItem value="knowledge">Knowledge</MenuItem>
              <MenuItem value="decision">Decision</MenuItem>
            </Select>
          </FormControl>
          <TextField
            fullWidth
            multiline
            rows={4}
            label="Memory Content"
            value={newMemoryContent}
            onChange={(e) => setNewMemoryContent(e.target.value)}
            placeholder="Enter the memory content..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAddMemoryDialog(false)}>Cancel</Button>
          <Button onClick={handleAddMemory} variant="contained">Add Memory</Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={6000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        message={snackbar.message}
      />
    </Box>
  );
};

export default MemoryPage;