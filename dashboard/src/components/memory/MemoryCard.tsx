/**
 * MemoryCard Component
 * Displays individual memory item with actions
 */

import React from 'react';
import {
  Card,
  CardContent,
  CardActions,
  Typography,
  Chip,
  Box,
  IconButton,
  Checkbox,
  Tooltip,
  Button,
  Divider,
} from '@mui/material';
import {
  Archive,
  Restore,
  Delete,
  Visibility,
  Schedule,
  TrendingUp,
  Memory as MemoryIcon,
  Psychology,
  AccountTree,
  Chat,
} from '@mui/icons-material';
import { Memory } from '@/types/memory';

interface MemoryCardProps {
  memory: Memory;
  isSelected: boolean;
  onToggleSelection: (memoryId: string) => void;
  onArchive?: (memoryId: string) => void;
  onRestore?: (memoryId: string) => void;
  onDelete?: (memoryId: string) => void;
  onView?: (memory: Memory) => void;
  compact?: boolean;
}

const getMemoryTypeConfig = (type: Memory['type']) => {
  switch (type) {
    case 'experience':
      return {
        icon: <MemoryIcon />,
        color: '#2196f3' as const,
        label: 'Experience',
        description: 'Task outcome and learning'
      };
    case 'knowledge':
      return {
        icon: <Psychology />,
        color: '#4caf50' as const,
        label: 'Knowledge',
        description: 'Best practices and patterns'
      };
    case 'decision':
      return {
        icon: <AccountTree />,
        color: '#ff9800' as const,
        label: 'Decision',
        description: 'Architecture and design choices'
      };
    case 'interaction':
      return {
        icon: <Chat />,
        color: '#9c27b0' as const,
        label: 'Interaction',
        description: 'Communication and collaboration'
      };
    default:
      return {
        icon: <MemoryIcon />,
        color: '#757575' as const,
        label: 'Unknown',
        description: 'Unknown memory type'
      };
  }
};

const formatTimestamp = (timestamp: string) => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7);
    return `${weeks} week${weeks > 1 ? 's' : ''} ago`;
  } else {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months > 1 ? 's' : ''} ago`;
  }
};

const MemoryCard: React.FC<MemoryCardProps> = ({
  memory,
  isSelected,
  onToggleSelection,
  onArchive,
  onRestore,
  onDelete,
  onView,
  compact = false,
}) => {
  const typeConfig = getMemoryTypeConfig(memory.type);
  
  const handleCardClick = (event: React.MouseEvent) => {
    if (event.target instanceof HTMLInputElement) {
      return; // Don't trigger card click for checkbox
    }
    onView?.(memory);
  };

  return (
    <Card 
      sx={{ 
        height: compact ? 'auto' : 280,
        cursor: onView ? 'pointer' : 'default',
        transition: 'all 0.2s ease-in-out',
        '&:hover': {
          transform: onView ? 'translateY(-2px)' : 'none',
          boxShadow: onView ? 4 : 1,
        },
        border: isSelected ? `2px solid ${typeConfig.color}` : '1px solid #e0e0e0',
      }}
      onClick={handleCardClick}
    >
      <CardContent sx={{ pb: 1 }}>
        {/* Header with type and selection */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mb={1}>
          <Box display="flex" alignItems="center" gap={1}>
            <Box 
              sx={{ 
                color: typeConfig.color,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {typeConfig.icon}
            </Box>
            <Chip
              label={typeConfig.label}
              size="small"
              sx={{
                backgroundColor: typeConfig.color,
                color: 'white',
                fontWeight: 'bold',
              }}
            />
          </Box>
          <Checkbox
            checked={isSelected}
            onChange={() => onToggleSelection(memory.id)}
            size="small"
            sx={{ color: typeConfig.color }}
          />
        </Box>

        {/* Content preview */}
        <Typography 
          variant="body2" 
          color="text.secondary"
          sx={{
            display: '-webkit-box',
            WebkitLineClamp: compact ? 2 : 4,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            minHeight: compact ? 'auto' : '80px',
            mb: 2,
          }}
        >
          {memory.content}
        </Typography>

        {!compact && (
          <>
            <Divider sx={{ my: 1 }} />
            
            {/* Metadata */}
            <Box mb={1}>
              {memory.metadata.task && (
                <Typography variant="caption" display="block" color="text.secondary">
                  Task: {memory.metadata.task}
                </Typography>
              )}
              {memory.metadata.success !== undefined && (
                <Typography variant="caption" display="block" color="text.secondary">
                  Success: {memory.metadata.success ? '✅' : '❌'}
                </Typography>
              )}
            </Box>
          </>
        )}

        {/* Footer with timestamp and metrics */}
        <Box display="flex" alignItems="center" justifyContent="space-between" mt="auto">
          <Box display="flex" alignItems="center" gap={1}>
            <Schedule fontSize="small" color="disabled" />
            <Typography variant="caption" color="text.secondary">
              {formatTimestamp(memory.timestamp)}
            </Typography>
          </Box>
          
          <Box display="flex" alignItems="center" gap={1}>
            {memory.relevanceScore !== undefined && (
              <Tooltip title={`Relevance: ${(memory.relevanceScore * 100).toFixed(0)}%`}>
                <Box display="flex" alignItems="center" gap={0.5}>
                  <TrendingUp fontSize="small" color="disabled" />
                  <Typography variant="caption" color="text.secondary">
                    {(memory.relevanceScore * 100).toFixed(0)}%
                  </Typography>
                </Box>
              </Tooltip>
            )}
            {memory.importance !== undefined && (
              <Tooltip title={`Importance: ${memory.importance.toFixed(1)}`}>
                <Typography 
                  variant="caption" 
                  sx={{ 
                    fontWeight: 'bold',
                    color: memory.importance > 0.7 ? 'error.main' : 
                           memory.importance > 0.4 ? 'warning.main' : 'text.secondary'
                  }}
                >
                  ★{memory.importance.toFixed(1)}
                </Typography>
              </Tooltip>
            )}
          </Box>
        </Box>
      </CardContent>

      {!compact && (
        <CardActions sx={{ justifyContent: 'space-between', px: 2, py: 1 }}>
          <Box>
            {onView && (
              <Button size="small" startIcon={<Visibility />} onClick={() => onView(memory)}>
                View
              </Button>
            )}
          </Box>
          <Box>
            {onArchive && (
              <Tooltip title="Archive memory">
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); onArchive(memory.id); }}>
                  <Archive />
                </IconButton>
              </Tooltip>
            )}
            {onRestore && (
              <Tooltip title="Restore memory">
                <IconButton size="small" onClick={(e) => { e.stopPropagation(); onRestore(memory.id); }}>
                  <Restore />
                </IconButton>
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip title="Delete memory">
                <IconButton 
                  size="small" 
                  color="error" 
                  onClick={(e) => { e.stopPropagation(); onDelete(memory.id); }}
                >
                  <Delete />
                </IconButton>
              </Tooltip>
            )}
          </Box>
        </CardActions>
      )}
    </Card>
  );
};

export default MemoryCard;