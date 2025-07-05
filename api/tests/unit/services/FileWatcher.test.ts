import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FileWatcher } from '../../../src/services/FileWatcher';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock chokidar to prevent actual file system watching in tests
const mockWatcher: any = {
  on: vi.fn((event: string, callback: Function): any => {
    if (event === 'add') {
      // Simulate immediate 'add' event for initial file content
      setTimeout(() => callback(), 20);
    }
    return mockWatcher;
  }),
  close: vi.fn(() => Promise.resolve()),
  emit: vi.fn()
};

vi.mock('chokidar', () => ({
  watch: vi.fn(() => mockWatcher)
}));

describe('FileWatcher', () => {
  let fileWatcher: FileWatcher;
  let testDir: string;
  let testFile: string;

  beforeEach(async () => {
    fileWatcher = new FileWatcher();
    testDir = path.join(__dirname, 'temp');
    testFile = path.join(testDir, 'test.txt');
    
    // Create test directory and file
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(testFile, 'initial content');
  });

  afterEach(async () => {
    await fileWatcher.cleanup();
    // Clean up test files
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('file watching', () => {
    it('should watch file for changes', async () => {
      const mockCallback = vi.fn();
      
      fileWatcher.watchFile(testFile, mockCallback);
      
      // Wait a bit for watcher to initialize
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Modify the file
      await fs.writeFile(testFile, 'modified content');
      
      // Wait for callback to be triggered
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockCallback).toHaveBeenCalledWith('modified content');
    });

    it('should handle multiple callbacks for same file', async () => {
      const mockCallback1 = vi.fn();
      const mockCallback2 = vi.fn();
      
      fileWatcher.watchFile(testFile, mockCallback1);
      fileWatcher.watchFile(testFile, mockCallback2);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      await fs.writeFile(testFile, 'new content');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockCallback1).toHaveBeenCalledWith('new content');
      expect(mockCallback2).toHaveBeenCalledWith('new content');
    });

    it('should handle watching multiple files', async () => {
      const testFile2 = path.join(testDir, 'test2.txt');
      await fs.writeFile(testFile2, 'file 2 content');
      
      const mockCallback1 = vi.fn();
      const mockCallback2 = vi.fn();
      
      fileWatcher.watchFile(testFile, mockCallback1);
      fileWatcher.watchFile(testFile2, mockCallback2);
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await fs.writeFile(testFile, 'modified file 1');
      await fs.writeFile(testFile2, 'modified file 2');
      
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockCallback1).toHaveBeenCalledWith('modified file 1');
      expect(mockCallback2).toHaveBeenCalledWith('modified file 2');
    });

    it('should unwatch file correctly', async () => {
      const mockCallback = vi.fn();
      
      fileWatcher.watchFile(testFile, mockCallback);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      fileWatcher.unwatchFile(testFile);
      
      await fs.writeFile(testFile, 'should not trigger callback');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockCallback).not.toHaveBeenCalledWith('should not trigger callback');
    });
  });

  describe('file operations', () => {
    it('should read file content', async () => {
      const content = await fileWatcher.readFile(testFile);
      expect(content).toBe('initial content');
    });

    it('should write file content', async () => {
      await fileWatcher.writeFile(testFile, 'new content');
      const content = await fs.readFile(testFile, 'utf8');
      expect(content).toBe('new content');
    });

    it('should handle reading non-existent file', async () => {
      const nonExistentFile = path.join(testDir, 'nonexistent.txt');
      await expect(fileWatcher.readFile(nonExistentFile)).rejects.toThrow();
    });

    it('should create file when writing to non-existent path', async () => {
      const newFile = path.join(testDir, 'new.txt');
      await fileWatcher.writeFile(newFile, 'new file content');
      
      const exists = await fs.access(newFile).then(() => true).catch(() => false);
      expect(exists).toBe(true);
      
      const content = await fs.readFile(newFile, 'utf8');
      expect(content).toBe('new file content');
    });
  });

  describe('error handling', () => {
    it('should handle file watch errors gracefully', async () => {
      const mockCallback = vi.fn();
      const nonExistentFile = path.join(testDir, 'nonexistent.txt');
      
      // Should not throw when watching non-existent file
      expect(() => {
        fileWatcher.watchFile(nonExistentFile, mockCallback);
      }).not.toThrow();
    });

    it('should handle file permission errors', async () => {
      // This test might be skipped on systems without permission restrictions
      if (process.platform === 'win32') {
        // Skip on Windows as permission handling is different
        return;
      }
      
      const restrictedFile = path.join(testDir, 'restricted.txt');
      await fs.writeFile(restrictedFile, 'restricted content');
      await fs.chmod(restrictedFile, 0o000);
      
      await expect(fileWatcher.readFile(restrictedFile)).rejects.toThrow();
      
      // Clean up
      await fs.chmod(restrictedFile, 0o644);
    });
  });

  describe('cleanup', () => {
    it('should cleanup all watchers', async () => {
      const mockCallback = vi.fn();
      
      fileWatcher.watchFile(testFile, mockCallback);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      await fileWatcher.cleanup();
      
      // After cleanup, file changes should not trigger callbacks
      await fs.writeFile(testFile, 'after cleanup');
      await new Promise(resolve => setTimeout(resolve, 100));
      
      expect(mockCallback).not.toHaveBeenCalledWith('after cleanup');
    });

    it('should handle cleanup when no watchers exist', async () => {
      await expect(fileWatcher.cleanup()).resolves.not.toThrow();
    });
  });
});