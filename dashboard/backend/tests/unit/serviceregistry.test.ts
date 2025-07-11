import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import winston from 'winston';
import { ServiceRegistry } from '../../src/config/ServiceRegistry.js';

// Mock fetch
global.fetch = vi.fn();

describe('ServiceRegistry', () => {
  let registry: ServiceRegistry;
  let logger: winston.Logger;

  beforeEach(() => {
    vi.clearAllMocks();
    
    logger = winston.createLogger({
      level: 'error',
      transports: [new winston.transports.Console({ silent: true })]
    });
    
    registry = new ServiceRegistry(logger);
  });

  afterEach(() => {
    registry.stopHealthChecks();
  });

  describe('Service Registration', () => {
    test('should initialize with default services', () => {
      const services = registry.getAllServices();
      expect(services).toHaveLength(2);
      
      const memoryApi = services.find(s => s.name === 'Memory API');
      const apiBridge = services.find(s => s.name === 'API Bridge');
      
      expect(memoryApi).toBeDefined();
      expect(apiBridge).toBeDefined();
      expect(memoryApi?.url).toBe('http://localhost:3333');
      expect(apiBridge?.url).toBe('http://localhost:3002');
    });

    test('should register new service', () => {
      const serviceRegisteredHandler = vi.fn();
      registry.on('service-registered', serviceRegisteredHandler);
      
      registry.registerService('test-service', {
        name: 'Test Service',
        url: 'http://localhost:9999',
        status: 'unknown',
        lastCheck: new Date()
      });
      
      const services = registry.getAllServices();
      expect(services).toHaveLength(3);
      expect(serviceRegisteredHandler).toHaveBeenCalledWith('test-service', expect.any(Object));
    });

    test('should get service URL', () => {
      const url = registry.getServiceUrl('memory-api');
      expect(url).toBe('http://localhost:3333');
      
      const unknownUrl = registry.getServiceUrl('unknown-service');
      expect(unknownUrl).toBeNull();
    });

    test('should get healthy service URL', () => {
      // Initially unknown status
      const url = registry.getHealthyServiceUrl('memory-api');
      expect(url).toBeNull();
      
      // Update status to healthy
      registry.registerService('memory-api', {
        name: 'Memory API',
        url: 'http://localhost:3333',
        status: 'healthy',
        lastCheck: new Date()
      });
      
      const healthyUrl = registry.getHealthyServiceUrl('memory-api');
      expect(healthyUrl).toBe('http://localhost:3333');
    });
  });

  describe('Health Checks', () => {
    test('should check service health successfully', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy' })
      } as any);
      
      const healthUpdateHandler = vi.fn();
      registry.on('service-health-updated', healthUpdateHandler);
      
      const result = await registry.checkServiceHealth('memory-api');
      
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3333/health', { timeout: 5000 });
      expect(healthUpdateHandler).toHaveBeenCalledWith('memory-api', expect.objectContaining({
        status: 'healthy',
        responseTime: expect.any(Number)
      }));
    });

    test('should handle health check failure', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));
      
      const healthUpdateHandler = vi.fn();
      registry.on('service-health-updated', healthUpdateHandler);
      
      const result = await registry.checkServiceHealth('memory-api');
      
      expect(result).toBe(false);
      expect(healthUpdateHandler).toHaveBeenCalledWith('memory-api', expect.objectContaining({
        status: 'unhealthy'
      }));
    });

    test('should handle non-ok response', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 503
      } as any);
      
      const result = await registry.checkServiceHealth('memory-api');
      expect(result).toBe(false);
    });

    test('should return false for unknown service', async () => {
      const result = await registry.checkServiceHealth('unknown-service');
      expect(result).toBe(false);
    });
  });

  describe('Service Discovery', () => {
    test('should discover services on common ports', async () => {
      const mockFetch = vi.mocked(global.fetch);
      
      // First call fails (port 3333)
      mockFetch.mockRejectedValueOnce(new Error('Connection refused'));
      
      // Second call succeeds (port 3334)
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ service: 'memory-api', status: 'healthy' })
      } as any);
      
      // API Bridge discovery
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ service: 'api-bridge', status: 'healthy' })
      } as any);
      
      await registry.discoverServices();
      
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3333/health', { timeout: 1000 });
      expect(mockFetch).toHaveBeenCalledWith('http://localhost:3334/health', { timeout: 1000 });
      
      const memoryApiUrl = registry.getServiceUrl('memory-api');
      expect(memoryApiUrl).toBe('http://localhost:3334');
    });

    test('should skip discovery if service type mismatch', async () => {
      const mockFetch = vi.mocked(global.fetch);
      
      // Returns wrong service type
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ service: 'wrong-service', status: 'healthy' })
      } as any);
      
      await registry.discoverServices();
      
      // Should not update URLs
      const memoryApiUrl = registry.getServiceUrl('memory-api');
      expect(memoryApiUrl).toBe('http://localhost:3333');
    });
  });

  describe('URL Updates', () => {
    test('should update service URL and emit event', () => {
      const urlUpdateHandler = vi.fn();
      registry.on('service-url-updated', urlUpdateHandler);
      
      registry.updateServiceUrl('memory-api', 'http://localhost:3334');
      
      expect(urlUpdateHandler).toHaveBeenCalledWith(
        'memory-api',
        'http://localhost:3334',
        'http://localhost:3333'
      );
      
      const url = registry.getServiceUrl('memory-api');
      expect(url).toBe('http://localhost:3334');
    });

    test('should not emit event if URL unchanged', () => {
      const urlUpdateHandler = vi.fn();
      registry.on('service-url-updated', urlUpdateHandler);
      
      registry.updateServiceUrl('memory-api', 'http://localhost:3333');
      
      expect(urlUpdateHandler).not.toHaveBeenCalled();
    });

    test('should handle unknown service in URL update', () => {
      registry.updateServiceUrl('unknown-service', 'http://localhost:9999');
      // Should not throw
    });
  });

  describe('Health Check Intervals', () => {
    test('should start and stop health checks', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ status: 'healthy' })
      } as any);
      
      vi.useFakeTimers();
      
      registry.startHealthChecks(1000);
      
      // Initial check
      expect(mockFetch).toHaveBeenCalledTimes(2); // memory-api + api-bridge
      
      // Advance timer
      vi.advanceTimersByTime(1000);
      await vi.runAllTimersAsync();
      
      expect(mockFetch).toHaveBeenCalledTimes(4); // 2 more checks
      
      registry.stopHealthChecks();
      
      // Advance timer again
      vi.advanceTimersByTime(1000);
      await vi.runAllTimersAsync();
      
      // No more calls
      expect(mockFetch).toHaveBeenCalledTimes(4);
      
      vi.useRealTimers();
    });

    test('should handle multiple start calls', () => {
      registry.startHealthChecks(1000);
      registry.startHealthChecks(2000); // Should clear previous interval
      
      // Should not throw
    });
  });

  describe('Event Emitter', () => {
    test('should emit service-registered event', () => {
      const handler = vi.fn();
      registry.on('service-registered', handler);
      
      registry.registerService('new-service', {
        name: 'New Service',
        url: 'http://localhost:8888',
        status: 'unknown',
        lastCheck: new Date()
      });
      
      expect(handler).toHaveBeenCalledWith('new-service', expect.any(Object));
    });

    test('should emit service-health-updated event', async () => {
      const mockFetch = vi.mocked(global.fetch);
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ status: 'healthy' })
      } as any);
      
      const handler = vi.fn();
      registry.on('service-health-updated', handler);
      
      await registry.checkServiceHealth('memory-api');
      
      expect(handler).toHaveBeenCalledWith('memory-api', expect.objectContaining({
        status: 'healthy',
        responseTime: expect.any(Number),
        lastCheck: expect.any(Date)
      }));
    });

    test('should emit service-url-updated event', () => {
      const handler = vi.fn();
      registry.on('service-url-updated', handler);
      
      registry.updateServiceUrl('memory-api', 'http://localhost:4444');
      
      expect(handler).toHaveBeenCalledWith(
        'memory-api',
        'http://localhost:4444',
        'http://localhost:3333'
      );
    });
  });
});