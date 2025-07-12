import { v4 as uuidv4 } from 'uuid';
import { AIEmployee, ProcessConfig } from '../types/index.js';

export const generateId = (): string => uuidv4();

export const delay = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

export const formatBytes = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const formatDuration = (milliseconds: number): string => {
  const seconds = Math.floor(milliseconds / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

export const sanitizeCommand = (command: string): string => {
  return command.replace(/[;&|`$(){}[\]]/g, '');
};

export const validateTaskPriority = (priority: string): boolean => {
  return ['low', 'medium', 'high', 'urgent'].includes(priority);
};

export const validateTaskStatus = (status: string): boolean => {
  return ['pending', 'assigned', 'in_progress', 'completed', 'failed'].includes(status);
};

export const matchEmployeeSkills = (employee: AIEmployee, requiredSkills: string[]): number => {
  const employeeSkills = employee.skills.map(skill => skill.toLowerCase());
  const required = requiredSkills.map(skill => skill.toLowerCase());
  
  const matches = required.filter(skill => employeeSkills.includes(skill));
  return matches.length / required.length;
};

export const findBestEmployee = (employees: AIEmployee[], requiredSkills: string[]): AIEmployee | null => {
  const availableEmployees = employees.filter(emp => emp.status === 'available');
  
  if (availableEmployees.length === 0) {
    return null;
  }
  
  let bestEmployee = availableEmployees[0]!;
  let bestScore = matchEmployeeSkills(bestEmployee, requiredSkills);
  
  for (let i = 1; i < availableEmployees.length; i++) {
    const employee = availableEmployees[i]!;
    const score = matchEmployeeSkills(employee, requiredSkills);
    
    if (score > bestScore) {
      bestEmployee = employee;
      bestScore = score;
    }
  }
  
  return bestScore > 0 ? bestEmployee : availableEmployees[0] || null;
};

export const buildClaudeCommand = (config: ProcessConfig): { command: string; args: string[] } => {
  const claudeArgs: string[] = [
    'claude',
    '--print',
    '--dangerously-skip-permissions',
    '--model', 'sonnet'
  ];
  
  if (config.tools && config.tools.length > 0) {
    claudeArgs.push('--allowedTools', config.tools.join(','));
  } else {
    // Default tools from corporate workflow
    claudeArgs.push('--allowedTools', 'Bash,Edit,Write,Read,TodoRead,TodoWrite');
  }
  
  if (config.maxTurns) {
    claudeArgs.push('--max-turns', config.maxTurns.toString());
  }
  
  // Use wsl.exe to run claude in WSL environment from Windows
  return {
    command: 'wsl.exe',
    args: claudeArgs
  };
};

export const parseLogLevel = (level: string): 'debug' | 'info' | 'warn' | 'error' => {
  const normalized = level.toLowerCase();
  if (['debug', 'info', 'warn', 'error'].includes(normalized)) {
    return normalized as 'debug' | 'info' | 'warn' | 'error';
  }
  return 'info';
};

export const isValidPort = (port: number): boolean => {
  return port >= 1024 && port <= 65535;
};

export const getRandomPort = (): number => {
  return Math.floor(Math.random() * (65535 - 1024) + 1024);
};

export const retryOperation = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('Unknown error');
      
      if (i === maxRetries) {
        throw lastError;
      }
      
      await delay(delayMs * Math.pow(2, i)); // Exponential backoff
    }
  }
  
  throw lastError!;
};

export const calculatePerformanceScore = (employee: AIEmployee): number => {
  const { tasksCompleted, averageResponseTime, successRate } = employee.performance;
  
  if (tasksCompleted === 0) {
    return 0;
  }
  
  const taskWeight = Math.min(tasksCompleted / 100, 1) * 0.3;
  const speedWeight = Math.max(0, 1 - averageResponseTime / 30000) * 0.3; // 30s baseline
  const successWeight = successRate * 0.4;
  
  return taskWeight + speedWeight + successWeight;
};

export const validateEnvironmentVariables = (): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  const requiredVars = ['NODE_ENV'];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  }
  
  if (process.env['DASHBOARD_PORT']) {
    const port = parseInt(process.env['DASHBOARD_PORT'], 10);
    if (isNaN(port) || !isValidPort(port)) {
      errors.push('Invalid DASHBOARD_PORT: must be a number between 1024 and 65535');
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
};