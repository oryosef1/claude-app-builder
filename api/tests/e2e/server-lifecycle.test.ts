import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import request from 'supertest'
import { ServerManager } from '../../src/types/server.js'

// Import the actual implementation
import { createServerManager } from '../../src/server/server-manager.js'

describe('Server Lifecycle E2E', () => {
  let serverManager: ServerManager

  beforeEach(() => {
    serverManager = createServerManager({
      port: 0, // Let OS assign port
      cors: {
        origin: ['http://localhost:3000', 'http://localhost:3001'],
        credentials: true
      },
      rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: 100,
        message: 'Rate limit exceeded'
      }
    })
  })

  afterEach(async () => {
    if (serverManager.isRunning()) {
      await serverManager.stop()
    }
  })

  describe('complete server lifecycle', () => {
    it('should start, serve requests, and stop gracefully', async () => {
      // Server should not be running initially
      expect(serverManager.isRunning()).toBe(false)
      expect(serverManager.getPort()).toBe(0)
      
      // Start server
      await serverManager.start()
      expect(serverManager.isRunning()).toBe(true)
      expect(serverManager.getPort()).toBeGreaterThan(0)
      
      // Server should respond to health checks
      const healthResponse = await request(serverManager.app)
        .get('/api/health')
        .expect(200)
      
      expect(healthResponse.body.status).toBe('healthy')
      
      // Stop server
      await serverManager.stop()
      expect(serverManager.isRunning()).toBe(false)
      expect(serverManager.getPort()).toBe(0)
    })

    it('should handle multiple start/stop cycles', async () => {
      for (let i = 0; i < 3; i++) {
        await serverManager.start()
        expect(serverManager.isRunning()).toBe(true)
        
        const response = await request(serverManager.app)
          .get('/api/health')
          .expect(200)
        
        expect(response.body.status).toBe('healthy')
        
        await serverManager.stop()
        expect(serverManager.isRunning()).toBe(false)
      }
    })

    it('should assign different ports on each start', async () => {
      const ports: number[] = []
      
      for (let i = 0; i < 3; i++) {
        await serverManager.start()
        ports.push(serverManager.getPort())
        await serverManager.stop()
      }
      
      // All ports should be different (highly likely with OS port assignment)
      expect(new Set(ports).size).toBe(ports.length)
    })
  })

  describe('error handling', () => {
    it('should prevent multiple starts', async () => {
      await serverManager.start()
      
      await expect(serverManager.start()).rejects.toThrow('Server is already running')
      
      // Should still be running after failed start attempt
      expect(serverManager.isRunning()).toBe(true)
    })

    it('should handle stop when not running', async () => {
      expect(serverManager.isRunning()).toBe(false)
      
      // Should not throw when stopping non-running server
      await expect(serverManager.stop()).resolves.not.toThrow()
      expect(serverManager.isRunning()).toBe(false)
    })
  })

  describe('middleware integration', () => {
    beforeEach(async () => {
      await serverManager.start()
    })

    it('should handle CORS preflight requests', async () => {
      const response = await request(serverManager.app)
        .options('/api/health')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204)
      
      expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000')
    })

    it('should reject requests from unauthorized origins', async () => {
      const response = await request(serverManager.app)
        .get('/api/health')
        .set('Origin', 'http://malicious-site.com')
      
      // Request should succeed but CORS headers should not include unauthorized origin
      expect(response.status).toBe(200)
      expect(response.headers['access-control-allow-origin']).not.toBe('http://malicious-site.com')
    })

    it('should include rate limiting headers', async () => {
      const response = await request(serverManager.app)
        .get('/api/health')
        .expect(200)
      
      expect(response.headers['x-ratelimit-limit']).toBeDefined()
      expect(response.headers['x-ratelimit-remaining']).toBeDefined()
      expect(response.headers['x-ratelimit-reset']).toBeDefined()
    })

    it('should enforce rate limits', async () => {
      // Create server manager with very low rate limit for testing
      await serverManager.stop()
      
      const lowLimitServer = createServerManager({
        port: 0,
        cors: {
          origin: ['http://localhost:3000'],
          credentials: true
        },
        rateLimit: {
          windowMs: 60000, // 1 minute
          max: 2, // Only 2 requests per minute
          message: 'Rate limit exceeded'
        }
      })
      
      await lowLimitServer.start()
      
      try {
        // First two requests should succeed
        await request(lowLimitServer.app).get('/api/health').expect(200)
        await request(lowLimitServer.app).get('/api/health').expect(200)
        
        // Third request should be rate limited
        const response = await request(lowLimitServer.app)
          .get('/api/health')
          .expect(429)
        
        expect(response.body.message).toContain('Rate limit exceeded')
      } finally {
        await lowLimitServer.stop()
      }
    })

    it('should include security headers from Helmet', async () => {
      const response = await request(serverManager.app)
        .get('/api/health')
        .expect(200)
      
      // Check for common Helmet security headers
      expect(response.headers['x-content-type-options']).toBe('nosniff')
      expect(response.headers['x-frame-options']).toBeDefined()
      expect(response.headers['x-xss-protection']).toBeDefined()
    })
  })

  describe('performance and reliability', () => {
    beforeEach(async () => {
      await serverManager.start()
    })

    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 20
      const startTime = Date.now()
      
      const requests = Array.from({ length: concurrentRequests }, () =>
        request(serverManager.app).get('/api/health')
      )
      
      const responses = await Promise.all(requests)
      const totalTime = Date.now() - startTime
      
      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200)
        expect(response.body.status).toBe('healthy')
      })
      
      // Should handle all requests reasonably quickly
      expect(totalTime).toBeLessThan(5000) // 5 seconds for 20 concurrent requests
    })

    it('should maintain consistent response format', async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(serverManager.app).get('/api/health')
      )
      
      const responses = await Promise.all(requests)
      
      const firstResponse = responses[0].body
      responses.forEach(response => {
        expect(response.body).toHaveProperty('status', firstResponse.status)
        expect(response.body).toHaveProperty('version', firstResponse.version)
        expect(typeof response.body.timestamp).toBe('string')
        expect(typeof response.body.uptime).toBe('number')
      })
    })
  })
})