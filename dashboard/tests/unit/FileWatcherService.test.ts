import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FileWatcherService } from '../../src/types/workflow';

class MockFileWatcherService implements FileWatcherService {
  private watchers: Map<string, (content: string) => void> = new Map();
  private fileContents: Map<string, string> = new Map();
  
  watchFile(filePath: string, callback: (content: string) => void): () => void {
    this.watchers.set(filePath, callback);
    return () => {
      this.watchers.delete(filePath);
    };
  }
  
  async readFile(filePath: string): Promise<string> {
    const content = this.fileContents.get(filePath);
    if (content === undefined) {
      throw new Error(`File not found: ${filePath}`);
    }
    return content;
  }
  
  async writeFile(filePath: string, content: string): Promise<void> {
    this.fileContents.set(filePath, content);
    const callback = this.watchers.get(filePath);
    if (callback) {
      callback(content);
    }
  }
  
  // Test helper methods
  triggerFileChange(filePath: string, content: string): void {
    this.fileContents.set(filePath, content);
    const callback = this.watchers.get(filePath);
    if (callback) {
      callback(content);
    }
  }
  
  hasWatcher(filePath: string): boolean {
    return this.watchers.has(filePath);
  }
  
  getWatcherCount(): number {
    return this.watchers.size;
  }
}

describe('FileWatcherService', () => {
  let service: MockFileWatcherService;
  
  beforeEach(() => {
    service = new MockFileWatcherService();
  });
  
  describe('watchFile', () => {
    it('should register file watcher', () => {
      const callback = vi.fn();
      service.watchFile('/path/to/file.txt', callback);
      
      expect(service.hasWatcher('/path/to/file.txt')).toBe(true);
    });
    
    it('should call callback when file changes', () => {
      const callback = vi.fn();
      service.watchFile('/path/to/file.txt', callback);
      
      service.triggerFileChange('/path/to/file.txt', 'new content');
      
      expect(callback).toHaveBeenCalledWith('new content');
    });
    
    it('should return unwatch function', () => {
      const callback = vi.fn();
      const unwatch = service.watchFile('/path/to/file.txt', callback);
      
      expect(typeof unwatch).toBe('function');
    });
    
    it('should stop watching after unwatch', () => {
      const callback = vi.fn();
      const unwatch = service.watchFile('/path/to/file.txt', callback);
      
      unwatch();
      
      expect(service.hasWatcher('/path/to/file.txt')).toBe(false);
    });
    
    it('should not call callback after unwatch', () => {
      const callback = vi.fn();
      const unwatch = service.watchFile('/path/to/file.txt', callback);
      
      unwatch();
      service.triggerFileChange('/path/to/file.txt', 'new content');
      
      expect(callback).not.toHaveBeenCalled();
    });
  });
  
  describe('readFile', () => {
    it('should read file content', async () => {
      await service.writeFile('/path/to/file.txt', 'test content');
      
      const content = await service.readFile('/path/to/file.txt');
      
      expect(content).toBe('test content');
    });
    
    it('should throw error for non-existent file', async () => {
      await expect(service.readFile('/non/existent/file.txt'))
        .rejects.toThrow('File not found: /non/existent/file.txt');
    });
  });
  
  describe('writeFile', () => {
    it('should write file content', async () => {
      await service.writeFile('/path/to/file.txt', 'test content');
      
      const content = await service.readFile('/path/to/file.txt');
      
      expect(content).toBe('test content');
    });
    
    it('should trigger file watcher on write', async () => {
      const callback = vi.fn();
      service.watchFile('/path/to/file.txt', callback);
      
      await service.writeFile('/path/to/file.txt', 'test content');
      
      expect(callback).toHaveBeenCalledWith('test content');
    });
    
    it('should overwrite existing file', async () => {
      await service.writeFile('/path/to/file.txt', 'original content');
      await service.writeFile('/path/to/file.txt', 'new content');
      
      const content = await service.readFile('/path/to/file.txt');
      
      expect(content).toBe('new content');
    });
  });
  
  describe('multiple watchers', () => {
    it('should handle multiple watchers on different files', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      service.watchFile('/file1.txt', callback1);
      service.watchFile('/file2.txt', callback2);
      
      expect(service.getWatcherCount()).toBe(2);
    });
    
    it('should trigger only relevant watchers', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      
      service.watchFile('/file1.txt', callback1);
      service.watchFile('/file2.txt', callback2);
      
      service.triggerFileChange('/file1.txt', 'content1');
      
      expect(callback1).toHaveBeenCalledWith('content1');
      expect(callback2).not.toHaveBeenCalled();
    });
  });
});