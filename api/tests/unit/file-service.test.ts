import { FileService } from '@/services/file-service';
import { TodoItem } from '@/types';
import fs from 'fs';
import path from 'path';

jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    access: jest.fn(),
    mkdir: jest.fn(),
  }
}));

describe('FileService', () => {
  let service: FileService;
  const mockFs = fs.promises as jest.Mocked<typeof fs.promises>;

  beforeEach(() => {
    service = new FileService('/test/path');
    jest.clearAllMocks();
  });

  describe('readTodos', () => {
    it('should read and parse todos from todo.md', async () => {
      const mockTodoContent = `# Todo List

## High Priority
- [ ] **URGENT: Create Node.js backend API**
- [x] Initialize web dashboard project
- [ ] Add WebSocket support

## Medium Priority
- [ ] Create project templates
- [ ] Add syntax highlighting`;

      mockFs.readFile.mockResolvedValue(mockTodoContent);

      const todos = await service.readTodos();

      expect(todos).toHaveLength(5);
      expect(todos[0]).toEqual({
        id: expect.any(String),
        content: 'Create Node.js backend API',
        priority: 'high',
        status: 'pending',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
      expect(todos[1]).toEqual({
        id: expect.any(String),
        content: 'Initialize web dashboard project',
        priority: 'high',
        status: 'completed',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
      expect(todos[2]).toEqual({
        id: expect.any(String),
        content: 'Add WebSocket support',
        priority: 'high',
        status: 'pending',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
      expect(todos[3]).toEqual({
        id: expect.any(String),
        content: 'Create project templates',
        priority: 'medium',
        status: 'pending',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
      expect(todos[4]).toEqual({
        id: expect.any(String),
        content: 'Add syntax highlighting',
        priority: 'medium',
        status: 'pending',
        createdAt: expect.any(Date),
        updatedAt: expect.any(Date)
      });
    });

    it('should handle empty todo.md file', async () => {
      mockFs.readFile.mockResolvedValue('# Claude App Builder Dashboard - Todo List\n\nNo todos yet.');

      const todos = await service.readTodos();

      expect(todos).toHaveLength(0);
    });

    it('should handle missing todo.md file', async () => {
      const error = new Error('ENOENT: no such file') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockFs.readFile.mockRejectedValue(error);

      const todos = await service.readTodos();

      expect(todos).toHaveLength(0);
    });

    it('should parse todos with different priority levels', async () => {
      const mockTodoContent = `# Todo List

## High Priority
- [ ] High priority task

## Medium Priority  
- [ ] Medium priority task

## Low Priority
- [ ] Low priority task`;

      mockFs.readFile.mockResolvedValue(mockTodoContent);

      const todos = await service.readTodos();

      expect(todos).toHaveLength(3);
      expect(todos[0].priority).toBe('high');
      expect(todos[1].priority).toBe('medium');
      expect(todos[2].priority).toBe('low');
    });
  });

  describe('writeTodos', () => {
    it('should write todos to todo.md in correct format', async () => {
      const todos: TodoItem[] = [
        {
          id: 'todo-1',
          content: 'Create backend API',
          priority: 'high',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'todo-2',
          content: 'Add frontend features',
          priority: 'medium',
          status: 'completed',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockFs.writeFile.mockResolvedValue();

      await service.writeTodos(todos);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('todo.md'),
        expect.stringContaining('- [ ] Create backend API'),
        'utf-8'
      );
      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('todo.md'),
        expect.stringContaining('- [x] Add frontend features'),
        'utf-8'
      );
    });

    it('should group todos by priority', async () => {
      const todos: TodoItem[] = [
        {
          id: 'todo-1',
          content: 'Low priority task',
          priority: 'low',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'todo-2',
          content: 'High priority task',
          priority: 'high',
          status: 'pending',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockFs.writeFile.mockResolvedValue();

      await service.writeTodos(todos);

      const writeCall = mockFs.writeFile.mock.calls[0];
      const content = writeCall[1] as string;

      expect(content.indexOf('## High Priority')).toBeLessThan(content.indexOf('## Low Priority'));
    });

    it('should handle empty todos array', async () => {
      mockFs.writeFile.mockResolvedValue();

      await service.writeTodos([]);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('todo.md'),
        expect.stringContaining('# Claude App Builder Dashboard - Todo List'),
        'utf-8'
      );
    });

    it('should handle write errors', async () => {
      const todos: TodoItem[] = [];
      const error = new Error('Permission denied');
      mockFs.writeFile.mockRejectedValue(error);

      await expect(service.writeTodos(todos)).rejects.toThrow('Permission denied');
    });
  });

  describe('readMemory', () => {
    it('should read memory.md content', async () => {
      const mockContent = 'test content';
      mockFs.readFile.mockResolvedValue(mockContent);

      const content = await service.readMemory();

      expect(content).toBe(mockContent);
      expect(mockFs.readFile).toHaveBeenCalledWith(
        expect.stringContaining('memory.md'),
        'utf-8'
      );
    });

    it('should handle missing memory.md file', async () => {
      const error = new Error('ENOENT: no such file') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      mockFs.readFile.mockRejectedValue(error);

      const content = await service.readMemory();

      expect(content).toBe('test content');
    });
  });

  describe('writeMemory', () => {
    it('should write content to memory.md', async () => {
      const content = '# Updated Memory\n\nNew content.';
      mockFs.writeFile.mockResolvedValue();

      await service.writeMemory(content);

      expect(mockFs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('memory.md'),
        content,
        'utf-8'
      );
    });

    it('should handle write errors', async () => {
      const content = 'test content';
      const error = new Error('Permission denied');
      mockFs.writeFile.mockRejectedValue(error);

      await expect(service.writeMemory(content)).rejects.toThrow('Permission denied');
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      mockFs.access.mockResolvedValue(undefined);

      const exists = await service.fileExists('test.txt');

      expect(exists).toBe(true);
      expect(mockFs.access).toHaveBeenCalledWith('/test/path/test.txt');
    });

    it('should return false for non-existing file', async () => {
      mockFs.access.mockRejectedValue(new Error('ENOENT: no such file'));

      const exists = await service.fileExists('nonexistent.txt');

      expect(exists).toBe(false);
    });
  });

  describe('readFile', () => {
    it('should read file content', async () => {
      const mockContent = 'file content';
      mockFs.readFile.mockResolvedValue(mockContent);

      const content = await service.readFile('test.txt');

      expect(content).toBe(mockContent);
      expect(mockFs.readFile).toHaveBeenCalledWith('/test/path/test.txt', 'utf-8');
    });

    it('should handle read errors', async () => {
      const error = new Error('Permission denied');
      mockFs.readFile.mockRejectedValue(error);

      await expect(service.readFile('test.txt')).rejects.toThrow('Permission denied');
    });
  });

  describe('writeFile', () => {
    it('should write content to file', async () => {
      const content = 'new content';
      mockFs.writeFile.mockResolvedValue();

      await service.writeFile('test.txt', content);

      expect(mockFs.writeFile).toHaveBeenCalledWith('/test/path/test.txt', content, 'utf-8');
    });

    it('should handle write errors', async () => {
      const error = new Error('Permission denied');
      mockFs.writeFile.mockRejectedValue(error);

      await expect(service.writeFile('test.txt', 'content')).rejects.toThrow('Permission denied');
    });
  });
});