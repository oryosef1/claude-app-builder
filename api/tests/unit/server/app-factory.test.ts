import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { Express } from 'express'
import { AppFactory, AppConfig } from '../../../src/types/server.js'

// Import the actual implementation
import { createAppFactory } from '../../../src/server/app-factory.js'

describe('AppFactory', () => {
  let appFactory: AppFactory
  let app: Express

  beforeEach(() => {
    appFactory = createAppFactory()
  })

  describe('createDefaultConfig', () => {
    it('should create default configuration with correct structure', () => {
      const config = appFactory.createDefaultConfig()
      
      expect(config).toHaveProperty('port')
      expect(config).toHaveProperty('cors')
      expect(config).toHaveProperty('rateLimit')
      expect(typeof config.port).toBe('number')
      expect(config.port).toBeGreaterThan(0)
    })

    it('should have proper CORS configuration', () => {
      const config = appFactory.createDefaultConfig()
      
      expect(config.cors).toHaveProperty('origin')
      expect(config.cors).toHaveProperty('credentials')
      expect(Array.isArray(config.cors.origin)).toBe(true)
      expect(typeof config.cors.credentials).toBe('boolean')
    })

    it('should have proper rate limit configuration', () => {
      const config = appFactory.createDefaultConfig()
      
      expect(config.rateLimit).toHaveProperty('windowMs')
      expect(config.rateLimit).toHaveProperty('max')
      expect(config.rateLimit).toHaveProperty('message')
      expect(typeof config.rateLimit.windowMs).toBe('number')
      expect(typeof config.rateLimit.max).toBe('number')
      expect(typeof config.rateLimit.message).toBe('string')
    })
  })

  describe('createApp', () => {
    it('should create Express app with default configuration', () => {
      app = appFactory.createApp()
      
      expect(app).toBeDefined()
      expect(typeof app).toBe('function') // Express apps are functions
    })

    it('should create Express app with custom configuration', () => {
      const customConfig: Partial<AppConfig> = {
        port: 4000,
        cors: {
          origin: ['http://custom.localhost'],
          credentials: false
        }
      }
      
      app = appFactory.createApp(customConfig)
      expect(app).toBeDefined()
    })

    it('should have CORS middleware enabled', async () => {
      app = appFactory.createApp()
      
      const response = await request(app)
        .options('/api/test')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
      
      expect(response.status).toBe(204)
    })

    it('should have Helmet security middleware enabled', async () => {
      app = appFactory.createApp()
      
      const response = await request(app).get('/api/health')
      
      // Helmet adds security headers
      expect(response.headers).toHaveProperty('x-content-type-options')
      expect(response.headers['x-content-type-options']).toBe('nosniff')
    })

    it('should have rate limiting middleware enabled', async () => {
      app = appFactory.createApp()
      
      const response = await request(app).get('/api/health')
      
      // Rate limit headers should be present
      expect(response.headers).toHaveProperty('x-ratelimit-limit')
      expect(response.headers).toHaveProperty('x-ratelimit-remaining')
    })
  })
})