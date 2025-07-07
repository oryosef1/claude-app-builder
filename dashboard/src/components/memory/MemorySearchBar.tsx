/**
 * MemorySearchBar Component
 * Advanced search interface for memories
 */

import React, { useState } from 'react';
import {
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  OutlinedInput,
  Button,
  Collapse,
  IconButton,
  Typography,
  Slider,
  FormControlLabel,
  Switch,
  Paper,
} from '@mui/material';
import {
  Search,
  FilterList,
  Clear,
  ExpandMore,
  ExpandLess,
  TuneRounded,
} from '@mui/icons-material';
import { SearchOptions } from '@/types/memory';

interface MemorySearchBarProps {
  searchQuery: string;
  selectedMemoryTypes: string[];
  onSearchQueryChange: (query: string) => void;
  onMemoryTypesChange: (types: string[]) => void;
  onSearch: (options: SearchOptions) => void;
  onClear: () => void;
  isLoading?: boolean;
}

const MEMORY_TYPES = [
  { value: 'experience', label: 'Experience', color: '#2196f3' },
  { value: 'knowledge', label: 'Knowledge', color: '#4caf50' },
  { value: 'decision', label: 'Decision', color: '#ff9800' },
  { value: 'interaction', label: 'Interaction', color: '#9c27b0' },
];

const MemorySearchBar: React.FC<MemorySearchBarProps> = ({
  searchQuery,
  selectedMemoryTypes,
  onSearchQueryChange,
  onMemoryTypesChange,
  onSearch,
  onClear,
  isLoading = false,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [relevanceThreshold, setRelevanceThreshold] = useState(0.5);
  const [limit, setLimit] = useState(50);
  const [dateRangeEnabled, setDateRangeEnabled] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleSearch = () => {
    const options: SearchOptions = {
      limit,
      memoryTypes: selectedMemoryTypes,
      relevanceThreshold,
    };

    if (dateRangeEnabled && startDate && endDate) {
      options.dateRange = {
        start: startDate,
        end: endDate,
      };
    }

    onSearch(options);
  };

  const handleClear = () => {
    onSearchQueryChange('');
    onMemoryTypesChange(['experience', 'knowledge', 'decision', 'interaction']);
    setRelevanceThreshold(0.5);
    setLimit(50);
    setDateRangeEnabled(false);
    setStartDate('');
    setEndDate('');
    onClear();
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
      {/* Main search bar */}
      <Box display="flex" gap={2} alignItems="center" mb={showAdvanced ? 2 : 0}>
        <TextField
          fullWidth
          placeholder="Search memories by content, task, or keywords..."
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
          onKeyPress={handleKeyPress}
          InputProps={{
            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />,
          }}
        />
        
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Memory Types</InputLabel>
          <Select
            multiple
            value={selectedMemoryTypes}
            onChange={(e) => onMemoryTypesChange(e.target.value as string[])}
            input={<OutlinedInput label="Memory Types" />}
            renderValue={(selected) => (
              <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                {selected.map((value) => {
                  const type = MEMORY_TYPES.find(t => t.value === value);
                  return (
                    <Chip
                      key={value}
                      label={type?.label || value}
                      size="small"
                      sx={{
                        backgroundColor: type?.color || '#gray',
                        color: 'white',
                        fontWeight: 'bold',
                      }}
                    />
                  );
                })}
              </Box>
            )}
          >
            {MEMORY_TYPES.map((type) => (
              <MenuItem key={type.value} value={type.value}>
                <Box display="flex" alignItems="center" gap={1}>
                  <Box
                    sx={{
                      width: 12,
                      height: 12,
                      borderRadius: '50%',
                      backgroundColor: type.color,
                    }}
                  />
                  {type.label}
                </Box>
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <IconButton
          onClick={() => setShowAdvanced(!showAdvanced)}
          sx={{ 
            border: 1,
            borderColor: 'divider',
            backgroundColor: showAdvanced ? 'primary.main' : 'transparent',
            color: showAdvanced ? 'white' : 'primary.main',
            '&:hover': {
              backgroundColor: showAdvanced ? 'primary.dark' : 'primary.light',
              color: 'white',
            }
          }}
        >
          <TuneRounded />
        </IconButton>

        <Button
          variant="contained"
          onClick={handleSearch}
          disabled={isLoading}
          startIcon={<Search />}
        >
          Search
        </Button>

        <Button
          variant="outlined"
          onClick={handleClear}
          startIcon={<Clear />}
        >
          Clear
        </Button>
      </Box>

      {/* Advanced search options */}
      <Collapse in={showAdvanced}>
        <Box sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
          <Typography variant="subtitle2" gutterBottom display="flex" alignItems="center" gap={1}>
            <FilterList /> Advanced Search Options
          </Typography>
          
          <Box display="flex" flexWrap="wrap" gap={3} mt={2}>
            {/* Relevance threshold */}
            <Box sx={{ minWidth: 200 }}>
              <Typography gutterBottom>
                Relevance Threshold: {(relevanceThreshold * 100).toFixed(0)}%
              </Typography>
              <Slider
                value={relevanceThreshold}
                onChange={(_, value) => setRelevanceThreshold(value as number)}
                min={0}
                max={1}
                step={0.1}
                marks={[
                  { value: 0, label: '0%' },
                  { value: 0.5, label: '50%' },
                  { value: 1, label: '100%' },
                ]}
              />
            </Box>

            {/* Result limit */}
            <Box sx={{ minWidth: 120 }}>
              <TextField
                label="Result Limit"
                type="number"
                value={limit}
                onChange={(e) => setLimit(parseInt(e.target.value) || 50)}
                inputProps={{ min: 1, max: 1000 }}
                size="small"
              />
            </Box>

            {/* Date range */}
            <Box>
              <FormControlLabel
                control={
                  <Switch
                    checked={dateRangeEnabled}
                    onChange={(e) => setDateRangeEnabled(e.target.checked)}
                  />
                }
                label="Date Range Filter"
              />
              
              {dateRangeEnabled && (
                <Box display="flex" gap={1} mt={1}>
                  <TextField
                    label="Start Date"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                  <TextField
                    label="End Date"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    size="small"
                  />
                </Box>
              )}
            </Box>
          </Box>
        </Box>
      </Collapse>
    </Paper>
  );
};

export default MemorySearchBar;