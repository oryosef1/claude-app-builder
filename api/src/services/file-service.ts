import { promises as fs } from 'fs';
import { join } from 'path';
import { TodoItem } from '../types';

export class FileService {
  private readonly rootPath: string;

  constructor(rootPath: string = '/mnt/c/Users/בית/Downloads/poe helper') {
    this.rootPath = rootPath;
  }

  async readTodoFile(): Promise<TodoItem[]> {
    try {
      const filePath = join(this.rootPath, 'todo.md');
      const content = await fs.readFile(filePath, 'utf-8');
      return this.parseTodoContent(content);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return [];
      }
      throw new Error(`Failed to read todo file: ${error}`);
    }
  }

  // Alias for backwards compatibility with tests
  async readTodos(): Promise<TodoItem[]> {
    return this.readTodoFile();
  }

  async writeTodoFile(todos: TodoItem[]): Promise<void> {
    try {
      const filePath = join(this.rootPath, 'todo.md');
      const content = this.generateTodoContent(todos);
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write todo file: ${error}`);
    }
  }

  // Alias for backwards compatibility with tests
  async writeTodos(todos: TodoItem[]): Promise<void> {
    return this.writeTodoFile(todos);
  }

  async readMemoryFile(): Promise<string> {
    try {
      const filePath = join(this.rootPath, 'memory.md');
      return await fs.readFile(filePath, 'utf-8');
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return '';
      }
      throw new Error(`Failed to read memory file: ${error}`);
    }
  }

  // Alias for backwards compatibility with tests
  async readMemory(): Promise<string> {
    return this.readMemoryFile();
  }

  async writeMemoryFile(content: string): Promise<void> {
    try {
      const filePath = join(this.rootPath, 'memory.md');
      await fs.writeFile(filePath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write memory file: ${error}`);
    }
  }

  // Alias for backwards compatibility with tests
  async writeMemory(content: string): Promise<void> {
    return this.writeMemoryFile(content);
  }

  async addTodo(content: string, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<TodoItem> {
    const todos = await this.readTodoFile();
    
    const newTodo: TodoItem = {
      id: `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      content,
      priority,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    todos.push(newTodo);
    await this.writeTodoFile(todos);
    
    return newTodo;
  }

  async updateTodo(id: string, updates: Partial<Omit<TodoItem, 'id' | 'createdAt'>>): Promise<TodoItem> {
    const todos = await this.readTodoFile();
    const todoIndex = todos.findIndex(todo => todo.id === id);
    
    if (todoIndex === -1) {
      throw new Error(`Todo with id ${id} not found`);
    }

    const updatedTodo: TodoItem = {
      ...todos[todoIndex],
      ...updates,
      updatedAt: new Date()
    };

    todos[todoIndex] = updatedTodo;
    await this.writeTodoFile(todos);
    
    return updatedTodo;
  }

  async deleteTodo(id: string): Promise<boolean> {
    const todos = await this.readTodoFile();
    const initialLength = todos.length;
    const filteredTodos = todos.filter(todo => todo.id !== id);
    
    if (filteredTodos.length === initialLength) {
      throw new Error(`Todo with id ${id} not found`);
    }

    await this.writeTodoFile(filteredTodos);
    return true;
  }

  async getTodoById(id: string): Promise<TodoItem | null> {
    const todos = await this.readTodoFile();
    return todos.find(todo => todo.id === id) || null;
  }

  async appendToMemory(content: string): Promise<void> {
    const currentContent = await this.readMemoryFile();
    const newContent = currentContent + '\n\n' + content;
    await this.writeMemoryFile(newContent);
  }

  async backupFiles(): Promise<{ todoBackup: string; memoryBackup: string }> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = join(this.rootPath, 'backups');
    
    try {
      await fs.mkdir(backupDir, { recursive: true });
    } catch (error) {
      // Directory might already exist
    }

    const todoContent = await this.readTodoFile();
    const memoryContent = await this.readMemoryFile();
    
    const todoBackupPath = join(backupDir, `todo-${timestamp}.json`);
    const memoryBackupPath = join(backupDir, `memory-${timestamp}.md`);
    
    await fs.writeFile(todoBackupPath, JSON.stringify(todoContent, null, 2));
    await fs.writeFile(memoryBackupPath, memoryContent);
    
    return {
      todoBackup: todoBackupPath,
      memoryBackup: memoryBackupPath
    };
  }

  private parseTodoContent(content: string): TodoItem[] {
    const todos: TodoItem[] = [];
    const lines = content.split('\n');
    
    let currentSection = '';
    let currentPriority: 'high' | 'medium' | 'low' = 'medium';
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Parse section headers
      if (trimmed.startsWith('## High Priority')) {
        currentPriority = 'high';
        currentSection = 'high';
        continue;
      } else if (trimmed.startsWith('## Medium Priority')) {
        currentPriority = 'medium';
        currentSection = 'medium';
        continue;
      } else if (trimmed.startsWith('## Low Priority')) {
        currentPriority = 'low';
        currentSection = 'low';
        continue;
      }
      
      // Parse todo items
      if (trimmed.startsWith('- [x]') || trimmed.startsWith('- [ ]')) {
        const isCompleted = trimmed.startsWith('- [x]');
        let content = trimmed.substring(5).trim();
        
        // Remove **URGENT:** prefix and other markdown formatting
        content = content.replace(/^\*\*URGENT:\s*/, '').replace(/\*\*/g, '');
        
        if (content) {
          const todo: TodoItem = {
            id: `todo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            content,
            priority: currentPriority,
            status: isCompleted ? 'completed' : 'pending',
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          todos.push(todo);
        }
      }
    }
    
    return todos;
  }

  // Additional methods expected by tests
  async fileExists(filePath: string): Promise<boolean> {
    try {
      const fullPath = join(this.rootPath, filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  async readFile(filePath: string): Promise<string> {
    try {
      const fullPath = join(this.rootPath, filePath);
      return await fs.readFile(fullPath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read file ${filePath}: ${error}`);
    }
  }

  async writeFile(filePath: string, content: string): Promise<void> {
    try {
      const fullPath = join(this.rootPath, filePath);
      await fs.writeFile(fullPath, content, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to write file ${filePath}: ${error}`);
    }
  }

  private generateTodoContent(todos: TodoItem[]): string {
    if (todos.length === 0) {
      return '# Claude App Builder Dashboard - Todo List\n\nNo todos yet.\n';
    }
    
    const sections = {
      high: todos.filter(t => t.priority === 'high'),
      medium: todos.filter(t => t.priority === 'medium'),
      low: todos.filter(t => t.priority === 'low')
    };
    
    let content = '# Claude App Builder Dashboard - Todo List\n\n';
    
    if (sections.high.length > 0) {
      content += '## High Priority\n';
      for (const todo of sections.high) {
        const checkbox = todo.status === 'completed' ? '[x]' : '[ ]';
        content += `- ${checkbox} ${todo.content}\n`;
      }
      content += '\n';
    }
    
    if (sections.medium.length > 0) {
      content += '## Medium Priority\n';
      for (const todo of sections.medium) {
        const checkbox = todo.status === 'completed' ? '[x]' : '[ ]';
        content += `- ${checkbox} ${todo.content}\n`;
      }
      content += '\n';
    }
    
    if (sections.low.length > 0) {
      content += '## Low Priority\n';
      for (const todo of sections.low) {
        const checkbox = todo.status === 'completed' ? '[x]' : '[ ]';
        content += `- ${checkbox} ${todo.content}\n`;
      }
      content += '\n';
    }
    
    return content;
  }
}