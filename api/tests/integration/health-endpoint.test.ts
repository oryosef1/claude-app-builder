import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { ServerManager, HealthStatus } from '../../src/types/server.js'

// Import the actual implementation
import { createServerManager } from '../../src/server/server-manager.js'

describe('Health Endpoint Integration', () => {
  let serverManager: ServerManager
  let baseURL: string

  beforeEach(async () => {
    serverManager = createServerManager({
      port: 0, // Let OS assign port
      cors: {
        origin: ['http://localhost:3000'],
        credentials: true
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: 'Too many requests'
      }
    })
    
    await serverManager.start()
    baseURL = `http://localhost:${serverManager.getPort()}`
  })

  afterEach(async () => {
    if (serverManager.isRunning()) {
      await serverManager.stop()
    }
  })

  describe('GET /api/health', () => {
    it('should return health status with 200 OK', async () => {
      const response = await request(serverManager.app)
        .get('/api/health')
        .expect(200)
      
      expect(response.body).toHaveProperty('status')
      expect(response.body).toHaveProperty('timestamp')
      expect(response.body).toHaveProperty('uptime')
      expect(response.body).toHaveProperty('version')
    })

    it('should return healthy status', async () => {
      const response = await request(serverManager.app)
        .get('/api/health')
      
      const health: HealthStatus = response.body
      expect(health.status).toBe('healthy')
      expect(typeof health.timestamp).toBe('string')
      expect(typeof health.uptime).toBe('number')
      expect(health.uptime).toBeGreaterThan(0)
    })

    it('should return valid timestamp in ISO format', async () => {
      const response = await request(serverManager.app)
        .get('/api/health')
      
      const health: HealthStatus = response.body
      expect(() => new Date(health.timestamp)).not.toThrow()
      expect(new Date(health.timestamp).toISOString()).toBe(health.timestamp)
    })

    it('should have proper Content-Type header', async () => {
      const response = await request(serverManager.app)
        .get('/api/health')
      
      expect(response.headers['content-type']).toMatch(/application\/json/)
    })

    it('should include security headers from Helmet', async () => {
      const response = await request(serverManager.app)
        .get('/api/health')
      
      expect(response.headers['x-content-type-options']).toBe('nosniff')
      expect(response.headers['x-frame-options']).toBeDefined()
    })

    it('should handle concurrent requests properly', async () => {
      const requests = Array.from({ length: 5 }, () => 
        request(serverManager.app).get('/api/health')
      )
      
      const responses = await Promise.all(requests)
      
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body.status).toBe('healthy')
      })
    })

    it('should respond within reasonable time', async () => {
      const startTime = Date.now()
      
      await request(serverManager.app)
        .get('/api/health')
        .expect(200)
      
      const responseTime = Date.now() - startTime
      expect(responseTime).toBeLessThan(1000) // Should respond within 1 second
    })
  })

  describe('404 handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      await request(serverManager.app)
        .get('/api/nonexistent')
        .expect(404)
    })

    it('should return JSON error for 404', async () => {
      const response = await request(serverManager.app)
        .get('/api/nonexistent')
        .expect(404)
      
      expect(response.body).toHaveProperty('error')
      expect(response.headers['content-type']).toMatch(/application\/json/)
    })
  })
})