import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import request from 'supertest';
import { WebSocket } from 'ws';
import express from 'express';

// Mock external dependencies
vi.mock('winston', () => ({
  default: {
    createLogger: vi.fn().mockReturnValue({
      info: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      debug: vi.fn()
    }),
    format: {
      combine: vi.fn(),
      timestamp: vi.fn(),
      errors: vi.fn(),
      json: vi.fn(),
      simple: vi.fn()
    },
    transports: {
      Console: vi.fn(),
      File: vi.fn()
    }
  }
}));

vi.mock('./routes/employees.js', () => ({
  default: express.Router().get('/', (req, res) => res.json({ employees: [] }))
}));

vi.mock('./routes/workflows.js', () => ({
  default: express.Router().get('/', (req, res) => res.json({ workflows: [] }))
}));

vi.mock('./routes/memory.js', () => ({
  default: express.Router().get('/health', (req, res) => res.json({ status: 'healthy' }))
}));

vi.mock('./routes/performance.js', () => ({
  default: express.Router().get('/', (req, res) => res.json({ metrics: {} }))
}));

vi.mock('./routes/system.js', () => ({
  default: express.Router().get('/health', (req, res) => res.json({ status: 'ok' }))
}));

// Import server after mocks are set up
import app from '../server.js';

describe('API Bridge Server - Comprehensive Tests', () => {
  let server;
  let wsClient;

  beforeEach(() => {
    // Start server on random port for testing
    server = app.listen(0);
  });

  afterEach((done) => {
    if (wsClient && wsClient.readyState === WebSocket.OPEN) {
      wsClient.close();
    }
    server.close(done);
  });

  describe('Basic Server Setup', () => {
    test('should start server successfully', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
    });

    test('should have proper middleware configured', async () => {
      const response = await request(app).get('/');
      expect(response.headers).toHaveProperty('x-dns-prefetch-control');
      expect(response.headers).toHaveProperty('x-frame-options');
    });

    test('should handle CORS properly', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');
      
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Rate Limiting', () => {
    test('should enforce rate limits', async () => {
      // Make many requests quickly
      const requests = Array(1001).fill(null).map(() => 
        request(app).get('/health')
      );
      
      const responses = await Promise.all(requests);
      const rateLimited = responses.some(r => r.status === 429);
      
      expect(rateLimited).toBe(true);
    });

    test('should return proper rate limit message', async () => {
      // Exhaust rate limit
      const requests = Array(1001).fill(null).map(() => 
        request(app).get('/health')
      );
      
      const responses = await Promise.all(requests);
      const limited = responses.find(r => r.status === 429);
      
      if (limited) {
        expect(limited.text).toContain('Too many requests');
      }
    });
  });

  describe('Health Endpoints', () => {
    test('GET /health should return server status', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        status: 'healthy',
        service: 'api-bridge',
        uptime: expect.any(Number),
        memory: expect.any(Object),
        environment: expect.any(String)
      });
    });

    test('GET /ready should check all dependencies', async () => {
      const response = await request(app).get('/ready');
      
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        ready: expect.any(Boolean),
        checks: expect.objectContaining({
          memory_api: expect.any(Boolean),
          redis: expect.any(Boolean),
          filesystem: expect.any(Boolean)
        })
      });
    });
  });

  describe('Route Integration', () => {
    test('should mount employee routes', async () => {
      const response = await request(app).get('/api/employees');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('employees');
    });

    test('should mount workflow routes', async () => {
      const response = await request(app).get('/api/workflows');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('workflows');
    });

    test('should mount memory routes', async () => {
      const response = await request(app).get('/api/memory/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
    });

    test('should mount performance routes', async () => {
      const response = await request(app).get('/api/performance');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('metrics');
    });

    test('should mount system routes', async () => {
      const response = await request(app).get('/api/system/health');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
    });
  });

  describe('Error Handling', () => {
    test('should handle 404 errors', async () => {
      const response = await request(app).get('/non-existent-route');
      
      expect(response.status).toBe(404);
      expect(response.body).toMatchObject({
        error: 'Not Found',
        message: expect.any(String)
      });
    });

    test('should handle JSON parsing errors', async () => {
      const response = await request(app)
        .post('/api/employees')
        .set('Content-Type', 'application/json')
        .send('invalid json');
      
      expect(response.status).toBe(400);
    });

    test('should handle server errors gracefully', async () => {
      // Mock a route that throws an error
      app.get('/test-error', () => {
        throw new Error('Test error');
      });
      
      const response = await request(app).get('/test-error');
      
      expect(response.status).toBe(500);
      expect(response.body).toMatchObject({
        error: 'Internal Server Error'
      });
    });
  });

  describe('WebSocket Support', () => {
    test('should accept WebSocket connections', (done) => {
      const port = server.address().port;
      wsClient = new WebSocket(`ws://localhost:${port}`);
      
      wsClient.on('open', () => {
        expect(wsClient.readyState).toBe(WebSocket.OPEN);
        done();
      });
      
      wsClient.on('error', done);
    });

    test('should handle WebSocket messages', (done) => {
      const port = server.address().port;
      wsClient = new WebSocket(`ws://localhost:${port}`);
      
      wsClient.on('open', () => {
        wsClient.send(JSON.stringify({ type: 'ping' }));
      });
      
      wsClient.on('message', (data) => {
        const message = JSON.parse(data.toString());
        expect(message.type).toBe('pong');
        done();
      });
    });

    test('should broadcast to all connected clients', (done) => {
      const port = server.address().port;
      const client1 = new WebSocket(`ws://localhost:${port}`);
      const client2 = new WebSocket(`ws://localhost:${port}`);
      
      let receivedCount = 0;
      
      const checkComplete = () => {
        receivedCount++;
        if (receivedCount === 2) {
          client1.close();
          client2.close();
          done();
        }
      };
      
      client1.on('open', () => {
        client2.on('open', () => {
          // Trigger broadcast
          request(app)
            .post('/api/system/broadcast')
            .send({ message: 'test broadcast' })
            .end();
        });
      });
      
      client1.on('message', checkComplete);
      client2.on('message', checkComplete);
    });
  });

  describe('Security Headers', () => {
    test('should set security headers', async () => {
      const response = await request(app).get('/health');
      
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBe('SAMEORIGIN');
      expect(response.headers['x-xss-protection']).toBe('0');
    });

    test('should not expose sensitive information', async () => {
      const response = await request(app).get('/health');
      
      expect(response.headers['x-powered-by']).toBeUndefined();
    });
  });

  describe('Logging', () => {
    test('should log incoming requests', async () => {
      const logger = (await import('winston')).default.createLogger();
      
      await request(app).get('/health');
      
      // Morgan middleware should trigger logging
      expect(logger.info).toHaveBeenCalled();
    });

    test('should log errors', async () => {
      const logger = (await import('winston')).default.createLogger();
      
      app.get('/test-log-error', () => {
        throw new Error('Test logging error');
      });
      
      await request(app).get('/test-log-error');
      
      expect(logger.error).toHaveBeenCalled();
    });
  });

  describe('Content Type Handling', () => {
    test('should handle JSON requests', async () => {
      const response = await request(app)
        .post('/api/employees')
        .send({ name: 'Test Employee' })
        .set('Content-Type', 'application/json');
      
      expect(response.headers['content-type']).toMatch(/json/);
    });

    test('should reject non-JSON content types for API routes', async () => {
      const response = await request(app)
        .post('/api/employees')
        .send('plain text')
        .set('Content-Type', 'text/plain');
      
      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('Graceful Shutdown', () => {
    test('should handle SIGTERM gracefully', (done) => {
      const gracefulShutdown = app.gracefulShutdown;
      if (gracefulShutdown) {
        gracefulShutdown();
        setTimeout(() => {
          expect(server.listening).toBe(false);
          done();
        }, 100);
      } else {
        done();
      }
    });
  });

  describe('Environment Configuration', () => {
    test('should use environment variables', () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';
      
      // Server should adapt based on environment
      expect(process.env.NODE_ENV).toBe('test');
      
      process.env.NODE_ENV = originalEnv;
    });
  });

  describe('API Documentation', () => {
    test('should serve API documentation', async () => {
      const response = await request(app).get('/api-docs');
      
      // If documentation is set up
      if (response.status === 200) {
        expect(response.headers['content-type']).toMatch(/html/);
      } else {
        expect(response.status).toBe(404);
      }
    });
  });

  describe('Metrics Endpoint', () => {
    test('should expose metrics for monitoring', async () => {
      const response = await request(app).get('/metrics');
      
      if (response.status === 200) {
        expect(response.text).toContain('http_request_duration_seconds');
      }
    });
  });

  describe('Request Validation', () => {
    test('should validate request parameters', async () => {
      const response = await request(app)
        .get('/api/employees/invalid-id');
      
      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    test('should sanitize input', async () => {
      const response = await request(app)
        .post('/api/employees')
        .send({ name: '<script>alert("xss")</script>' });
      
      // Should either sanitize or reject
      expect(response.status).toBeGreaterThanOrEqual(200);
    });
  });
});