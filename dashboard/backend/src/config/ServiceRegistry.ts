import { EventEmitter } from 'events';
import fetch from 'node-fetch';
import winston from 'winston';

export interface ServiceInfo {
  name: string;
  url: string;
  status: 'healthy' | 'unhealthy' | 'unknown';
  lastCheck: Date;
  responseTime?: number;
}

export class ServiceRegistry extends EventEmitter {
  private services: Map<string, ServiceInfo> = new Map();
  private healthCheckInterval: NodeJS.Timeout | null = null;
  private logger: winston.Logger;
  
  constructor(logger: winston.Logger) {
    super();
    this.logger = logger;
    
    // Initialize with environment URLs or defaults
    this.registerService('memory-api', {
      name: 'Memory API',
      url: process.env['MEMORY_API_URL'] || 'http://localhost:3333',
      status: 'unknown',
      lastCheck: new Date()
    });
    
    this.registerService('api-bridge', {
      name: 'API Bridge',
      url: process.env['API_BRIDGE_URL'] || 'http://localhost:3002',
      status: 'unknown',
      lastCheck: new Date()
    });
  }
  
  registerService(id: string, info: ServiceInfo): void {
    this.services.set(id, info);
    this.emit('service-registered', id, info);
  }
  
  async checkServiceHealth(id: string): Promise<boolean> {
    const service = this.services.get(id);
    if (!service) return false;
    
    try {
      const start = Date.now();
      const response = await fetch(`${service.url}/health`, {
        signal: AbortSignal.timeout(5000)
      });
      
      const responseTime = Date.now() - start;
      
      service.status = response.ok ? 'healthy' : 'unhealthy';
      service.responseTime = responseTime;
      service.lastCheck = new Date();
      
      this.emit('service-health-updated', id, service);
      return response.ok;
    } catch (error) {
      service.status = 'unhealthy';
      service.lastCheck = new Date();
      
      this.logger.error(`Health check failed for ${service.name}:`, error);
      this.emit('service-health-updated', id, service);
      return false;
    }
  }
  
  async discoverServices(): Promise<void> {
    // Try common ports for our services
    const commonPorts = {
      'memory-api': [3333, 3334, 3335],
      'api-bridge': [3002, 3003, 3004]
    };
    
    for (const [serviceId, ports] of Object.entries(commonPorts)) {
      for (const port of ports) {
        const url = `http://localhost:${port}`;
        try {
          const response = await fetch(`${url}/health`, { signal: AbortSignal.timeout(1000) });
          
          if (response.ok) {
            const data = await response.json() as any;
            
            // Verify it's the right service
            if (serviceId === 'memory-api' && data.service === 'memory-api') {
              this.updateServiceUrl(serviceId, url);
              this.logger.info(`Discovered Memory API at ${url}`);
              break;
            } else if (serviceId === 'api-bridge' && data.service === 'api-bridge') {
              this.updateServiceUrl(serviceId, url);
              this.logger.info(`Discovered API Bridge at ${url}`);
              break;
            }
          }
        } catch (error) {
          // Continue trying other ports
        }
      }
    }
  }
  
  updateServiceUrl(id: string, url: string): void {
    const service = this.services.get(id);
    if (service) {
      const oldUrl = service.url;
      service.url = url;
      
      if (oldUrl !== url) {
        this.logger.info(`Updated ${service.name} URL from ${oldUrl} to ${url}`);
        this.emit('service-url-updated', id, url, oldUrl);
      }
    }
  }
  
  getServiceUrl(id: string): string | null {
    const service = this.services.get(id);
    return service ? service.url : null;
  }
  
  getHealthyServiceUrl(id: string): string | null {
    const service = this.services.get(id);
    return (service && service.status === 'healthy') ? service.url : null;
  }
  
  getAllServices(): ServiceInfo[] {
    return Array.from(this.services.values());
  }
  
  startHealthChecks(intervalMs: number = 30000): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    // Initial check
    this.checkAllServices();
    
    // Regular checks
    this.healthCheckInterval = setInterval(() => {
      this.checkAllServices();
    }, intervalMs);
  }
  
  stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
  
  private async checkAllServices(): Promise<void> {
    const checks = Array.from(this.services.keys()).map(id => 
      this.checkServiceHealth(id)
    );
    
    await Promise.all(checks);
  }
}