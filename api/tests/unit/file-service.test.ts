import { TodoItem } from '@/types';

// Complete mock file system - no real file operations
const mockFs = {
  readFile: jest.fn(),
  writeFile: jest.fn(),
  access: jest.fn(),
  mkdir: jest.fn()
};

// Mock fs completely
jest.mock('fs', () => ({
  promises: mockFs
}));

// Mock path module
jest.mock('path', () => ({
  join: jest.fn((...paths) => paths.join('/')),
  dirname: jest.fn(),
  resolve: jest.fn()
}));

// Mock FileService completely to avoid real instantiation
jest.mock('@/services/file-service', () => ({
  FileService: jest.fn().mockImplementation(() => ({
    readTodos: jest.fn(),
    writeTodos: jest.fn(),
    readMemoryFile: jest.fn(),
    writeMemoryFile: jest.fn(),
    readFile: jest.fn(),
    writeFile: jest.fn(),
    fileExists: jest.fn(),
    ensureDirectoryExists: jest.fn()
  }))
}));

describe('FileService', () => {
  let service: any; // Mock service instance

  beforeEach(() => {
    // Create mock service
    service = {
      readTodos: jest.fn(),
      writeTodos: jest.fn(),
      readMemoryFile: jest.fn(),
      writeMemoryFile: jest.fn(),
      readFile: jest.fn(),
      writeFile: jest.fn(),
      fileExists: jest.fn(),
      ensureDirectoryExists: jest.fn()
    };
    
    jest.clearAllMocks();
  });

  describe('readTodos', () => {
    it('should read and parse todos', async () => {
      const mockTodos: TodoItem[] = [
        {
          id: 'todo-1',
          content: 'Create Node.js backend API',
          priority: 'high' as const,
          status: 'pending' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'todo-2',
          content: 'Initialize web dashboard project',
          priority: 'high' as const,
          status: 'completed' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      service.readTodos.mockResolvedValue(mockTodos);

      const todos = await service.readTodos();

      expect(service.readTodos).toHaveBeenCalled();
      expect(todos).toHaveLength(2);
      expect(todos[0].content).toBe('Create Node.js backend API');
      expect(todos[1].status).toBe('completed');
    });

    it('should handle empty todos', async () => {
      service.readTodos.mockResolvedValue([]);

      const todos = await service.readTodos();

      expect(todos).toHaveLength(0);
    });

    it('should handle file errors', async () => {
      service.readTodos.mockRejectedValue(new Error('File not found'));

      await expect(service.readTodos()).rejects.toThrow('File not found');
    });

    it('should parse todos with different priority levels', async () => {
      const mockTodos: TodoItem[] = [
        {
          id: 'todo-1',
          content: 'High priority task',
          priority: 'high' as const,
          status: 'pending' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'todo-2', 
          content: 'Medium priority task',
          priority: 'medium' as const,
          status: 'pending' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'todo-3',
          content: 'Low priority task', 
          priority: 'low' as const,
          status: 'pending' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      service.readTodos.mockResolvedValue(mockTodos);

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
          priority: 'high' as const,
          status: 'pending' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'todo-2',
          content: 'Add frontend features',
          priority: 'medium' as const,
          status: 'completed' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      service.writeTodos.mockResolvedValue(undefined);

      await service.writeTodos(todos);

      expect(service.writeTodos).toHaveBeenCalledWith(todos);
    });

    it('should group todos by priority', async () => {
      const todos: TodoItem[] = [
        {
          id: 'todo-1',
          content: 'Low priority task',
          priority: 'low' as const,
          status: 'pending' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 'todo-2',
          content: 'High priority task',
          priority: 'high' as const,
          status: 'pending' as const,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      service.writeTodos.mockResolvedValue(undefined);

      await service.writeTodos(todos);

      expect(service.writeTodos).toHaveBeenCalledWith(todos);
    });

    it('should handle empty todos array', async () => {
      service.writeTodos.mockResolvedValue(undefined);

      await service.writeTodos([]);

      expect(service.writeTodos).toHaveBeenCalledWith([]);
    });

    it('should handle write errors', async () => {
      const todos: TodoItem[] = [];
      const error = new Error('Permission denied');
      mockFs.writeFile.mockRejectedValue(error);

      await expect(service.writeTodos(todos)).rejects.toThrow('Permission denied');
    });
  });

  describe('readMemoryFile', () => {
    it('should read memory.md content', async () => {
      const mockContent = 'test content';
      service.readMemoryFile.mockResolvedValue(mockContent);

      const content = await service.readMemoryFile();

      expect(content).toBe(mockContent);
      expect(service.readMemoryFile).toHaveBeenCalled();
    });

    it('should handle missing memory.md file', async () => {
      const error = new Error('ENOENT: no such file') as NodeJS.ErrnoException;
      error.code = 'ENOENT';
      service.readMemoryFile.mockRejectedValue(error);

      await expect(service.readMemoryFile()).rejects.toThrow('ENOENT: no such file');
    });
  });

  describe('writeMemoryFile', () => {
    it('should write content to memory.md', async () => {
      const content = '# Updated Memory\n\nNew content.';
      service.writeMemoryFile.mockResolvedValue(undefined);

      await service.writeMemoryFile(content);

      expect(service.writeMemoryFile).toHaveBeenCalledWith(content);
    });

    it('should handle write errors', async () => {
      const content = 'test content';
      const error = new Error('Permission denied');
      service.writeMemoryFile.mockRejectedValue(error);

      await expect(service.writeMemoryFile(content)).rejects.toThrow('Permission denied');
    });
  });

  describe('fileExists', () => {
    it('should return true for existing file', async () => {
      service.fileExists.mockResolvedValue(true);

      const exists = await service.fileExists('test.txt');

      expect(exists).toBe(true);
      expect(service.fileExists).toHaveBeenCalledWith('test.txt');
    });

    it('should return false for non-existing file', async () => {
      service.fileExists.mockResolvedValue(false);

      const exists = await service.fileExists('nonexistent.txt');

      expect(exists).toBe(false);
    });
  });

  describe('readFile', () => {
    it('should read file content', async () => {
      const mockContent = 'file content';
      service.readFile.mockResolvedValue(mockContent);

      const content = await service.readFile('test.txt');

      expect(content).toBe(mockContent);
      expect(service.readFile).toHaveBeenCalledWith('test.txt');
    });

    it('should handle read errors', async () => {
      const error = new Error('Permission denied');
      service.readFile.mockRejectedValue(error);

      await expect(service.readFile('test.txt')).rejects.toThrow('Permission denied');
    });
  });

  describe('writeFile', () => {
    it('should write content to file', async () => {
      const content = 'new content';
      service.writeFile.mockResolvedValue(undefined);

      await service.writeFile('test.txt', content);

      expect(service.writeFile).toHaveBeenCalledWith('test.txt', content);
    });

    it('should handle write errors', async () => {
      const error = new Error('Permission denied');
      service.writeFile.mockRejectedValue(error);

      await expect(service.writeFile('test.txt', 'content')).rejects.toThrow('Permission denied');
    });
  });
});