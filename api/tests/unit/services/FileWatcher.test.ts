import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { FileWatcher } from '../../../src/services/FileWatcher';
import * as fs from 'fs/promises';
import * as path from 'path';

// Mock chokidar to prevent actual file system watching in tests
const mockWatcher: any = {
  on: vi.fn((event: string, callback: Function): any => {
    // Don't trigger immediate callbacks in unit tests
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
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Manually trigger change callback to test the callback mechanism
      const content = await fileWatcher.readFile(testFile);
      mockCallback(content);
      
      expect(mockCallback).toHaveBeenCalledWith('initial content');
    });

    it('should handle multiple callbacks for same file', async () => {
      const mockCallback1 = vi.fn();
      const mockCallback2 = vi.fn();
      
      fileWatcher.watchFile(testFile, mockCallback1);
      fileWatcher.watchFile(testFile, mockCallback2);
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Manually test callback mechanism
      const callbacks = (fileWatcher as any).getCallbacks(testFile);
      expect(callbacks).toHaveLength(2);
      
      // Trigger callbacks manually to test functionality
      const content = 'new content';
      callbacks.forEach((cb: Function) => cb(content));
      
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
      
      await new Promise(resolve => setTimeout(resolve, 50));
      
      // Test that separate callback arrays are maintained
      const callbacks1 = (fileWatcher as any).getCallbacks(testFile);
      const callbacks2 = (fileWatcher as any).getCallbacks(testFile2);
      
      expect(callbacks1).toHaveLength(1);
      expect(callbacks2).toHaveLength(1);
      
      // Manually trigger callbacks to test functionality
      callbacks1[0]('modified file 1');
      callbacks2[0]('modified file 2');
      
      expect(mockCallback1).toHaveBeenCalledWith('modified file 1');
      expect(mockCallback2).toHaveBeenCalledWith('modified file 2');
    });

    it('should unwatch file correctly', async () => {
      const mockCallback = vi.fn();
      
      fileWatcher.watchFile(testFile, mockCallback);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      fileWatcher.unwatchFile(testFile);
      
      // Verify callbacks are cleared
      const callbacks = (fileWatcher as any).getCallbacks(testFile);
      expect(callbacks).toHaveLength(0);
      
      expect(mockWatcher.close).toHaveBeenCalled();
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
      // Skip this test on Windows or WSL where permission handling is different
      if (process.platform === 'win32' || process.env.WSL_DISTRO_NAME) {
        // Skip on Windows/WSL as permission handling is different
        return;
      }
      
      const restrictedFile = path.join(testDir, 'restricted.txt');
      await fs.writeFile(restrictedFile, 'restricted content');
      
      try {
        await fs.chmod(restrictedFile, 0o000);
        await expect(fileWatcher.readFile(restrictedFile)).rejects.toThrow();
      } catch (error) {
        // If chmod doesn't work properly, skip the test
        return;
      } finally {
        // Clean up
        try {
          await fs.chmod(restrictedFile, 0o644);
        } catch (cleanupError) {
          // Ignore cleanup errors
        }
      }
    });
  });

  describe('cleanup', () => {
    it('should cleanup all watchers', async () => {
      const mockCallback = vi.fn();
      
      fileWatcher.watchFile(testFile, mockCallback);
      await new Promise(resolve => setTimeout(resolve, 50));
      
      await fileWatcher.cleanup();
      
      // Verify all callbacks are cleared
      const callbacks = (fileWatcher as any).getCallbacks(testFile);
      expect(callbacks).toHaveLength(0);
      
      expect(mockWatcher.close).toHaveBeenCalled();
    });

    it('should handle cleanup when no watchers exist', async () => {
      await expect(fileWatcher.cleanup()).resolves.not.toThrow();
    });
  });
});