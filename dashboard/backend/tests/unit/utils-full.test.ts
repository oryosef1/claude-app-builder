import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import * as utils from '../../src/utils/index.js';
import { AIEmployee, ProcessConfig } from '../../src/types/index.js';

// Mock uuid
vi.mock('uuid', () => ({
  v4: vi.fn(() => 'mock-uuid-123')
}));

describe('Utils - Comprehensive Tests', () => {
  describe('generateId', () => {
    test('should generate UUID', () => {
      const id = utils.generateId();
      expect(id).toBe('mock-uuid-123');
    });
  });

  describe('delay', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test('should delay for specified milliseconds', async () => {
      const delayPromise = utils.delay(1000);
      
      // Fast-forward time
      vi.advanceTimersByTime(1000);
      
      await expect(delayPromise).resolves.toBeUndefined();
    });

    test('should handle zero delay', async () => {
      const delayPromise = utils.delay(0);
      vi.advanceTimersByTime(0);
      await expect(delayPromise).resolves.toBeUndefined();
    });
  });

  describe('formatBytes', () => {
    test('should format zero bytes', () => {
      expect(utils.formatBytes(0)).toBe('0 Bytes');
    });

    test('should format bytes', () => {
      expect(utils.formatBytes(100)).toBe('100 Bytes');
      expect(utils.formatBytes(1023)).toBe('1023 Bytes');
    });

    test('should format kilobytes', () => {
      expect(utils.formatBytes(1024)).toBe('1 KB');
      expect(utils.formatBytes(2048)).toBe('2 KB');
      expect(utils.formatBytes(1536)).toBe('1.5 KB');
    });

    test('should format megabytes', () => {
      expect(utils.formatBytes(1048576)).toBe('1 MB');
      expect(utils.formatBytes(1572864)).toBe('1.5 MB');
    });

    test('should format gigabytes', () => {
      expect(utils.formatBytes(1073741824)).toBe('1 GB');
      expect(utils.formatBytes(1610612736)).toBe('1.5 GB');
    });

    test('should format terabytes', () => {
      expect(utils.formatBytes(1099511627776)).toBe('1 TB');
      expect(utils.formatBytes(1649267441664)).toBe('1.5 TB');
    });
  });

  describe('formatDuration', () => {
    test('should format seconds only', () => {
      expect(utils.formatDuration(0)).toBe('0s');
      expect(utils.formatDuration(999)).toBe('0s');
      expect(utils.formatDuration(1000)).toBe('1s');
      expect(utils.formatDuration(59999)).toBe('59s');
    });

    test('should format minutes and seconds', () => {
      expect(utils.formatDuration(60000)).toBe('1m 0s');
      expect(utils.formatDuration(90000)).toBe('1m 30s');
      expect(utils.formatDuration(3599999)).toBe('59m 59s');
    });

    test('should format hours, minutes and seconds', () => {
      expect(utils.formatDuration(3600000)).toBe('1h 0m 0s');
      expect(utils.formatDuration(3660000)).toBe('1h 1m 0s');
      expect(utils.formatDuration(3661000)).toBe('1h 1m 1s');
      expect(utils.formatDuration(7322000)).toBe('2h 2m 2s');
    });
  });

  describe('sanitizeCommand', () => {
    test('should remove shell metacharacters', () => {
      expect(utils.sanitizeCommand('echo hello')).toBe('echo hello');
      expect(utils.sanitizeCommand('echo hello; rm -rf /')).toBe('echo hello rm -rf /');
      expect(utils.sanitizeCommand('cat file | grep test')).toBe('cat file  grep test');
      expect(utils.sanitizeCommand('$(malicious)')).toBe('malicious');
      expect(utils.sanitizeCommand('`evil`')).toBe('evil');
      expect(utils.sanitizeCommand('cmd && cmd2')).toBe('cmd  cmd2');
    });

    test('should handle all dangerous characters', () => {
      const dangerous = ';|&`$(){}[]';
      const result = utils.sanitizeCommand(dangerous);
      expect(result).toBe('');
    });
  });

  describe('validateTaskPriority', () => {
    test('should validate correct priorities', () => {
      expect(utils.validateTaskPriority('low')).toBe(true);
      expect(utils.validateTaskPriority('medium')).toBe(true);
      expect(utils.validateTaskPriority('high')).toBe(true);
      expect(utils.validateTaskPriority('urgent')).toBe(true);
    });

    test('should reject invalid priorities', () => {
      expect(utils.validateTaskPriority('critical')).toBe(false);
      expect(utils.validateTaskPriority('LOW')).toBe(false);
      expect(utils.validateTaskPriority('')).toBe(false);
      expect(utils.validateTaskPriority('normal')).toBe(false);
    });
  });

  describe('validateTaskStatus', () => {
    test('should validate correct statuses', () => {
      expect(utils.validateTaskStatus('pending')).toBe(true);
      expect(utils.validateTaskStatus('assigned')).toBe(true);
      expect(utils.validateTaskStatus('in_progress')).toBe(true);
      expect(utils.validateTaskStatus('completed')).toBe(true);
      expect(utils.validateTaskStatus('failed')).toBe(true);
    });

    test('should reject invalid statuses', () => {
      expect(utils.validateTaskStatus('done')).toBe(false);
      expect(utils.validateTaskStatus('PENDING')).toBe(false);
      expect(utils.validateTaskStatus('')).toBe(false);
      expect(utils.validateTaskStatus('cancelled')).toBe(false);
    });
  });

  describe('matchEmployeeSkills', () => {
    const employee: AIEmployee = {
      id: 'emp_001',
      name: 'Test Employee',
      role: 'Developer',
      systemPrompt: 'Test prompt',
      tools: ['Bash', 'Edit'],
      status: 'available',
      skills: ['JavaScript', 'TypeScript', 'React'],
      performance: {
        tasksCompleted: 10,
        averageResponseTime: 5000,
        successRate: 0.9
      }
    };

    test('should calculate perfect match', () => {
      const requiredSkills = ['JavaScript', 'TypeScript'];
      const score = utils.matchEmployeeSkills(employee, requiredSkills);
      expect(score).toBe(1);
    });

    test('should calculate partial match', () => {
      const requiredSkills = ['JavaScript', 'Python'];
      const score = utils.matchEmployeeSkills(employee, requiredSkills);
      expect(score).toBe(0.5);
    });

    test('should calculate no match', () => {
      const requiredSkills = ['Python', 'Java'];
      const score = utils.matchEmployeeSkills(employee, requiredSkills);
      expect(score).toBe(0);
    });

    test('should handle case insensitive matching', () => {
      const requiredSkills = ['javascript', 'TYPESCRIPT'];
      const score = utils.matchEmployeeSkills(employee, requiredSkills);
      expect(score).toBe(1);
    });

    test('should handle empty required skills', () => {
      const requiredSkills: string[] = [];
      const score = utils.matchEmployeeSkills(employee, requiredSkills);
      expect(score).toBe(NaN);
    });
  });

  describe('findBestEmployee', () => {
    const employees: AIEmployee[] = [
      {
        id: 'emp_001',
        name: 'JavaScript Expert',
        role: 'Developer',
        systemPrompt: '',
        tools: [],
        status: 'available',
        skills: ['JavaScript', 'Node.js'],
        performance: { tasksCompleted: 0, averageResponseTime: 0, successRate: 0 }
      },
      {
        id: 'emp_002',
        name: 'Python Expert',
        role: 'Developer',
        systemPrompt: '',
        tools: [],
        status: 'available',
        skills: ['Python', 'Django'],
        performance: { tasksCompleted: 0, averageResponseTime: 0, successRate: 0 }
      },
      {
        id: 'emp_003',
        name: 'Full Stack',
        role: 'Developer',
        systemPrompt: '',
        tools: [],
        status: 'busy',
        skills: ['JavaScript', 'Python', 'React'],
        performance: { tasksCompleted: 0, averageResponseTime: 0, successRate: 0 }
      }
    ];

    test('should find best employee by skill match', () => {
      const requiredSkills = ['JavaScript', 'React'];
      const best = utils.findBestEmployee(employees, requiredSkills);
      expect(best?.id).toBe('emp_001');
    });

    test('should return null if no employees available', () => {
      const busyEmployees = employees.map(emp => ({ ...emp, status: 'busy' as const }));
      const best = utils.findBestEmployee(busyEmployees, ['JavaScript']);
      expect(best).toBeNull();
    });

    test('should return first available if no skill match', () => {
      const requiredSkills = ['Ruby', 'Rails'];
      const best = utils.findBestEmployee(employees, requiredSkills);
      expect(best?.id).toBe('emp_001'); // First available
    });

    test('should handle empty employees array', () => {
      const best = utils.findBestEmployee([], ['JavaScript']);
      expect(best).toBeNull();
    });
  });

  describe('buildClaudeCommand', () => {
    test('should build command with all options', () => {
      const config: ProcessConfig = {
        employeeId: 'emp_001',
        taskId: 'task_001',
        priority: 'high',
        systemPrompt: 'You are a helpful assistant',
        tools: ['Bash', 'Edit', 'Read'],
        maxTurns: 20,
        workingDirectory: '/workspace'
      };

      const { command, args } = utils.buildClaudeCommand(config);
      
      expect(command).toBe('claude');
      expect(args).toEqual([
        '--system-prompt', 'You are a helpful assistant',
        '--allowedTools', 'Bash,Edit,Read',
        '--max-turns', '20',
        '--cwd', '/workspace'
      ]);
    });

    test('should build command with minimal options', () => {
      const config: ProcessConfig = {
        employeeId: 'emp_001',
        taskId: 'task_001',
        priority: 'medium'
      };

      const { command, args } = utils.buildClaudeCommand(config);
      
      expect(command).toBe('claude');
      expect(args).toEqual([]);
    });

    test('should handle empty tools array', () => {
      const config: ProcessConfig = {
        employeeId: 'emp_001',
        taskId: 'task_001',
        priority: 'high',
        tools: []
      };

      const { command, args } = utils.buildClaudeCommand(config);
      
      expect(command).toBe('claude');
      expect(args).toEqual([]);
    });
  });

  describe('parseLogLevel', () => {
    test('should parse valid log levels', () => {
      expect(utils.parseLogLevel('debug')).toBe('debug');
      expect(utils.parseLogLevel('info')).toBe('info');
      expect(utils.parseLogLevel('warn')).toBe('warn');
      expect(utils.parseLogLevel('error')).toBe('error');
    });

    test('should handle case insensitive', () => {
      expect(utils.parseLogLevel('DEBUG')).toBe('debug');
      expect(utils.parseLogLevel('Info')).toBe('info');
      expect(utils.parseLogLevel('WARN')).toBe('warn');
      expect(utils.parseLogLevel('Error')).toBe('error');
    });

    test('should default to info for invalid levels', () => {
      expect(utils.parseLogLevel('verbose')).toBe('info');
      expect(utils.parseLogLevel('critical')).toBe('info');
      expect(utils.parseLogLevel('')).toBe('info');
      expect(utils.parseLogLevel('invalid')).toBe('info');
    });
  });

  describe('isValidPort', () => {
    test('should validate port in valid range', () => {
      expect(utils.isValidPort(1024)).toBe(true);
      expect(utils.isValidPort(8080)).toBe(true);
      expect(utils.isValidPort(65535)).toBe(true);
    });

    test('should reject port outside valid range', () => {
      expect(utils.isValidPort(0)).toBe(false);
      expect(utils.isValidPort(1023)).toBe(false);
      expect(utils.isValidPort(65536)).toBe(false);
      expect(utils.isValidPort(-1)).toBe(false);
    });
  });

  describe('getRandomPort', () => {
    test('should generate port in valid range', () => {
      for (let i = 0; i < 100; i++) {
        const port = utils.getRandomPort();
        expect(port).toBeGreaterThanOrEqual(1024);
        expect(port).toBeLessThanOrEqual(65535);
      }
    });
  });

  describe('retryOperation', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    test('should succeed on first try', async () => {
      const operation = vi.fn().mockResolvedValue('success');
      
      const result = await utils.retryOperation(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('should retry on failure and succeed', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('First failure'))
        .mockRejectedValueOnce(new Error('Second failure'))
        .mockResolvedValue('success');
      
      const promise = utils.retryOperation(operation, 3);
      
      // Fast-forward through delays
      await vi.runAllTimersAsync();
      
      const result = await promise;
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    test('should throw after max retries', async () => {
      const operation = vi.fn().mockRejectedValue(new Error('Always fails'));
      
      const promise = utils.retryOperation(operation, 2);
      
      // Fast-forward through all retries
      await vi.runAllTimersAsync();
      
      await expect(promise).rejects.toThrow('Always fails');
      expect(operation).toHaveBeenCalledTimes(3); // Initial + 2 retries
    });

    test('should use exponential backoff', async () => {
      const operation = vi.fn()
        .mockRejectedValueOnce(new Error('Fail 1'))
        .mockRejectedValueOnce(new Error('Fail 2'))
        .mockResolvedValue('success');
      
      const promise = utils.retryOperation(operation, 3, 100);
      
      // First retry after 100ms
      vi.advanceTimersByTime(100);
      await Promise.resolve();
      
      // Second retry after 200ms (exponential)
      vi.advanceTimersByTime(200);
      await Promise.resolve();
      
      await vi.runAllTimersAsync();
      
      await expect(promise).resolves.toBe('success');
    });

    test('should handle non-Error objects', async () => {
      const operation = vi.fn().mockRejectedValue('String error');
      
      const promise = utils.retryOperation(operation, 0);
      
      await vi.runAllTimersAsync();
      
      await expect(promise).rejects.toThrow('Unknown error');
    });
  });

  describe('calculatePerformanceScore', () => {
    test('should calculate performance score correctly', () => {
      const employee: AIEmployee = {
        id: 'emp_001',
        name: 'Test',
        role: 'Developer',
        systemPrompt: '',
        tools: [],
        status: 'available',
        skills: [],
        performance: {
          tasksCompleted: 50,
          averageResponseTime: 15000, // 15 seconds
          successRate: 0.9
        }
      };

      const score = utils.calculatePerformanceScore(employee);
      
      // taskWeight: min(50/100, 1) * 0.3 = 0.5 * 0.3 = 0.15
      // speedWeight: max(0, 1 - 15000/30000) * 0.3 = 0.5 * 0.3 = 0.15
      // successWeight: 0.9 * 0.4 = 0.36
      // Total: 0.15 + 0.15 + 0.36 = 0.66
      
      expect(score).toBeCloseTo(0.66, 2);
    });

    test('should return 0 for employee with no completed tasks', () => {
      const employee: AIEmployee = {
        id: 'emp_001',
        name: 'Test',
        role: 'Developer',
        systemPrompt: '',
        tools: [],
        status: 'available',
        skills: [],
        performance: {
          tasksCompleted: 0,
          averageResponseTime: 5000,
          successRate: 1.0
        }
      };

      const score = utils.calculatePerformanceScore(employee);
      expect(score).toBe(0);
    });

    test('should cap task weight at 1', () => {
      const employee: AIEmployee = {
        id: 'emp_001',
        name: 'Test',
        role: 'Developer',
        systemPrompt: '',
        tools: [],
        status: 'available',
        skills: [],
        performance: {
          tasksCompleted: 200, // More than 100
          averageResponseTime: 0,
          successRate: 1.0
        }
      };

      const score = utils.calculatePerformanceScore(employee);
      
      // taskWeight: min(200/100, 1) * 0.3 = 1 * 0.3 = 0.3
      // speedWeight: max(0, 1 - 0/30000) * 0.3 = 1 * 0.3 = 0.3
      // successWeight: 1.0 * 0.4 = 0.4
      // Total: 0.3 + 0.3 + 0.4 = 1.0
      
      expect(score).toBeCloseTo(1.0, 2);
    });

    test('should handle slow response times', () => {
      const employee: AIEmployee = {
        id: 'emp_001',
        name: 'Test',
        role: 'Developer',
        systemPrompt: '',
        tools: [],
        status: 'available',
        skills: [],
        performance: {
          tasksCompleted: 50,
          averageResponseTime: 60000, // 60 seconds (slower than baseline)
          successRate: 0.5
        }
      };

      const score = utils.calculatePerformanceScore(employee);
      
      // taskWeight: 0.5 * 0.3 = 0.15
      // speedWeight: max(0, 1 - 60000/30000) * 0.3 = max(0, -1) * 0.3 = 0
      // successWeight: 0.5 * 0.4 = 0.2
      // Total: 0.15 + 0 + 0.2 = 0.35
      
      expect(score).toBeCloseTo(0.35, 2);
    });
  });

  describe('validateEnvironmentVariables', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    test('should validate when all required vars present', () => {
      process.env['NODE_ENV'] = 'test';
      
      const result = utils.validateEnvironmentVariables();
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should report missing required variables', () => {
      delete process.env['NODE_ENV'];
      
      const result = utils.validateEnvironmentVariables();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Missing required environment variable: NODE_ENV');
    });

    test('should validate dashboard port when present', () => {
      process.env['NODE_ENV'] = 'test';
      process.env['DASHBOARD_PORT'] = '8080';
      
      const result = utils.validateEnvironmentVariables();
      
      expect(result.valid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    test('should report invalid dashboard port', () => {
      process.env['NODE_ENV'] = 'test';
      process.env['DASHBOARD_PORT'] = '500';
      
      const result = utils.validateEnvironmentVariables();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid DASHBOARD_PORT: must be a number between 1024 and 65535');
    });

    test('should report non-numeric dashboard port', () => {
      process.env['NODE_ENV'] = 'test';
      process.env['DASHBOARD_PORT'] = 'abc';
      
      const result = utils.validateEnvironmentVariables();
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid DASHBOARD_PORT: must be a number between 1024 and 65535');
    });
  });
});