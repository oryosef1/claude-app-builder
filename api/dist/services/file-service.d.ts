import { TodoItem } from '../types';
export declare class FileService {
    private readonly rootPath;
    constructor(rootPath?: string);
    readTodoFile(): Promise<TodoItem[]>;
    readTodos(): Promise<TodoItem[]>;
    writeTodoFile(todos: TodoItem[]): Promise<void>;
    writeTodos(todos: TodoItem[]): Promise<void>;
    readMemoryFile(): Promise<string>;
    readMemory(): Promise<string>;
    writeMemoryFile(content: string): Promise<void>;
    writeMemory(content: string): Promise<void>;
    addTodo(content: string, priority?: 'high' | 'medium' | 'low'): Promise<TodoItem>;
    updateTodo(id: string, updates: Partial<Omit<TodoItem, 'id' | 'createdAt'>>): Promise<TodoItem>;
    deleteTodo(id: string): Promise<boolean>;
    getTodoById(id: string): Promise<TodoItem | null>;
    appendToMemory(content: string): Promise<void>;
    backupFiles(): Promise<{
        todoBackup: string;
        memoryBackup: string;
    }>;
    private parseTodoContent;
    fileExists(filePath: string): Promise<boolean>;
    readFile(filePath: string): Promise<string>;
    writeFile(filePath: string, content: string): Promise<void>;
    private generateTodoContent;
}
//# sourceMappingURL=file-service.d.ts.map