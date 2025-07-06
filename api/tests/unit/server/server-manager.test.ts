import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { ServerManager, AppConfig } from '../../../src/types/server.js'

// Import the actual implementation
import { createServerManager } from '../../../src/server/server-manager.js'

describe('ServerManager', () => {
  let serverManager: ServerManager
  let mockConfig: AppConfig

  beforeEach(() => {
    mockConfig = {
      port: 0, // Use 0 to let OS assign available port
      cors: {
        origin: ['http://localhost:3000'],
        credentials: true
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: 'Too many requests'
      }
    }
    
    serverManager = createServerManager(mockConfig)
  })

  afterEach(async () => {
    if (serverManager.isRunning()) {
      await serverManager.stop()
    }
  })

  describe('initialization', () => {
    it('should create server manager with config', () => {
      expect(serverManager).toBeDefined()
      expect(serverManager.config).toEqual(mockConfig)
      expect(serverManager.app).toBeDefined()
      expect(serverManager.server).toBeNull()
    })

    it('should not be running initially', () => {
      expect(serverManager.isRunning()).toBe(false)
    })

    it('should return 0 as port when not running', () => {
      expect(serverManager.getPort()).toBe(0)
    })
  })

  describe('start', () => {
    it('should start server and update state', async () => {
      await serverManager.start()
      
      expect(serverManager.isRunning()).toBe(true)
      expect(serverManager.server).not.toBeNull()
      expect(serverManager.getPort()).toBeGreaterThan(0)
    })

    it('should throw error if already running', async () => {
      await serverManager.start()
      
      await expect(serverManager.start()).rejects.toThrow('Server is already running')
    })

    it('should use assigned port from OS when config port is 0', async () => {
      await serverManager.start()
      
      const assignedPort = serverManager.getPort()
      expect(assignedPort).toBeGreaterThan(0)
      expect(assignedPort).not.toBe(mockConfig.port)
    })
  })

  describe('stop', () => {
    it('should stop running server', async () => {
      await serverManager.start()
      expect(serverManager.isRunning()).toBe(true)
      
      await serverManager.stop()
      expect(serverManager.isRunning()).toBe(false)
      expect(serverManager.server).toBeNull()
      expect(serverManager.getPort()).toBe(0)
    })

    it('should not throw error if server not running', async () => {
      await expect(serverManager.stop()).resolves.not.toThrow()
    })

    it('should handle server close errors gracefully', async () => {
      await serverManager.start()
      
      // Mock server close to simulate error
      const originalClose = serverManager.server!.close
      serverManager.server!.close = vi.fn((callback?: Function) => {
        if (callback) callback(new Error('Mock close error'))
        return serverManager.server!
      })
      
      await expect(serverManager.stop()).rejects.toThrow('Mock close error')
      
      // Restore original close method
      serverManager.server!.close = originalClose
    })
  })

  describe('getPort', () => {
    it('should return 0 when server not running', () => {
      expect(serverManager.getPort()).toBe(0)
    })

    it('should return actual port when server is running', async () => {
      await serverManager.start()
      
      const port = serverManager.getPort()
      expect(port).toBeGreaterThan(0)
      expect(typeof port).toBe('number')
    })
  })
})