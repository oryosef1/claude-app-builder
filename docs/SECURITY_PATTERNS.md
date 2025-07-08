# Security Architecture and Patterns

## Overview

This document defines the security architecture, authentication patterns, and security best practices for the Multi-Agent Dashboard System.

## 1. Authentication & Authorization

### 1.1 JWT Authentication
```typescript
// JWT token management
export class AuthenticationService {
  private readonly JWT_SECRET = process.env.JWT_SECRET!;
  private readonly JWT_EXPIRY = '24h';

  generateToken(user: User): string {
    return jwt.sign(
      {
        userId: user.id,
        role: user.role,
        permissions: user.permissions
      },
      this.JWT_SECRET,
      { expiresIn: this.JWT_EXPIRY }
    );
  }

  verifyToken(token: string): JWTPayload {
    return jwt.verify(token, this.JWT_SECRET) as JWTPayload;
  }
}

// Authentication middleware
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = authService.verifyToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};
```

### 1.2 Role-Based Access Control
```typescript
// RBAC implementation
export const authorize = (requiredPermissions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const userPermissions = req.user?.permissions || [];
    
    const hasPermission = requiredPermissions.some(permission => 
      userPermissions.includes(permission)
    );

    if (!hasPermission) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

// Usage
app.post('/api/processes', 
  authenticate, 
  authorize(['process:create']), 
  processController.create
);
```

## 2. Input Validation & Sanitization

### 2.1 Request Validation
```typescript
// Validation schemas
export const processConfigSchema = Joi.object({
  id: Joi.string().required().regex(/^[a-zA-Z0-9_-]+$/),
  name: Joi.string().required().min(3).max(100),
  systemPrompt: Joi.string().required().min(10).max(2000),
  workingDirectory: Joi.string().required().regex(/^\/[a-zA-Z0-9\/_-]+$/),
  allowedTools: Joi.array().items(Joi.string().valid(...ALLOWED_TOOLS)),
  maxTurns: Joi.number().integer().min(1).max(100)
});

// Validation middleware
export const validateRequest = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const { error, value } = schema.validate(req.body);
    
    if (error) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.details.map(d => d.message)
      });
    }

    req.body = value;
    next();
  };
};
```

### 2.2 SQL Injection Prevention
```typescript
// Parameterized queries
export class SecureRepository {
  async findProcessById(id: string): Promise<Process | null> {
    const query = 'SELECT * FROM processes WHERE id = ?';
    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  async updateProcessStatus(id: string, status: ProcessStatus): Promise<void> {
    const query = 'UPDATE processes SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?';
    await this.db.query(query, [status, id]);
  }
}
```

## 3. Process Security

### 3.1 Process Isolation
```typescript
// Secure process spawning
export class SecureProcessManager {
  private readonly MAX_PROCESSES = 20;
  private readonly PROCESS_TIMEOUT = 30000;
  private readonly ALLOWED_TOOLS = ['Read', 'Write', 'Bash', 'Edit'];

  async spawnProcess(config: ProcessConfig): Promise<string> {
    // Validate configuration
    this.validateProcessConfig(config);

    // Check resource limits
    if (this.activeProcesses.size >= this.MAX_PROCESSES) {
      throw new SecurityError('Maximum process limit reached');
    }

    // Sanitize working directory
    const workingDir = this.sanitizeWorkingDirectory(config.workingDirectory);

    // Spawn with restricted permissions
    const process = spawn('claude', [
      '--system-prompt', config.systemPrompt,
      '--cwd', workingDir,
      '--allowedTools', config.allowedTools.join(','),
      '--max-turns', config.maxTurns.toString(),
      '--timeout', this.PROCESS_TIMEOUT.toString()
    ], {
      stdio: ['pipe', 'pipe', 'pipe'],
      uid: 1000, // Run as non-root user
      gid: 1000
    });

    return config.id;
  }

  private sanitizeWorkingDirectory(dir: string): string {
    // Prevent directory traversal
    const normalizedDir = path.normalize(dir);
    
    if (normalizedDir.includes('..')) {
      throw new SecurityError('Invalid working directory');
    }

    return normalizedDir;
  }
}
```

### 3.2 Resource Limits
```typescript
// Resource monitoring and limits
export class ResourceMonitor {
  private readonly MAX_MEMORY_MB = 512;
  private readonly MAX_CPU_PERCENT = 80;

  async monitorProcess(processId: string): Promise<void> {
    const process = this.processes.get(processId);
    if (!process) return;

    const usage = await this.getProcessUsage(process.pid);

    if (usage.memory > this.MAX_MEMORY_MB) {
      await this.terminateProcess(processId, 'Memory limit exceeded');
    }

    if (usage.cpu > this.MAX_CPU_PERCENT) {
      await this.throttleProcess(processId);
    }
  }

  private async getProcessUsage(pid: number): Promise<ProcessUsage> {
    return new Promise((resolve) => {
      pidusage(pid, (err, stats) => {
        if (err) {
          resolve({ memory: 0, cpu: 0 });
        } else {
          resolve({
            memory: stats.memory / 1024 / 1024, // Convert to MB
            cpu: stats.cpu
          });
        }
      });
    });
  }
}
```

## 4. Rate Limiting

### 4.1 API Rate Limiting
```typescript
// Rate limiting configuration
const rateLimiters = {
  processSpawn: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // 5 processes per window
    message: 'Too many processes created'
  }),
  
  taskSubmission: rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 20, // 20 tasks per minute
    message: 'Too many tasks submitted'
  }),

  general: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100, // 100 requests per 15 minutes
    message: 'Too many requests'
  })
};

// Apply rate limiting
app.use('/api', rateLimiters.general);
app.post('/api/processes', rateLimiters.processSpawn, processController.create);
app.post('/api/tasks', rateLimiters.taskSubmission, taskController.create);
```

## 5. Data Encryption

### 5.1 Sensitive Data Encryption
```typescript
// Data encryption service
export class EncryptionService {
  private readonly algorithm = 'aes-256-gcm';
  private readonly key = Buffer.from(process.env.ENCRYPTION_KEY!, 'hex');

  encrypt(text: string): EncryptedData {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipher(this.algorithm, this.key);
    cipher.setAAD(Buffer.from('additional data'));

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const tag = cipher.getAuthTag();

    return {
      encrypted,
      iv: iv.toString('hex'),
      tag: tag.toString('hex')
    };
  }

  decrypt(encryptedData: EncryptedData): string {
    const decipher = crypto.createDecipher(this.algorithm, this.key);
    decipher.setAAD(Buffer.from('additional data'));
    decipher.setAuthTag(Buffer.from(encryptedData.tag, 'hex'));

    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }
}
```

## 6. Audit Logging

### 6.1 Security Event Logging
```typescript
// Audit logging service
export class AuditLogger {
  async logSecurityEvent(event: SecurityEvent): Promise<void> {
    const auditEntry = {
      timestamp: new Date(),
      eventType: event.type,
      userId: event.userId,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      details: event.details,
      severity: event.severity
    };

    await this.auditRepository.create(auditEntry);

    // Send alerts for critical events
    if (event.severity === 'critical') {
      await this.alertService.sendSecurityAlert(auditEntry);
    }
  }
}

// Usage in middleware
export const auditMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const originalSend = res.send;
  
  res.send = function(data) {
    // Log the API call
    auditLogger.logSecurityEvent({
      type: 'api_call',
      userId: req.user?.userId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode
      },
      severity: res.statusCode >= 400 ? 'high' : 'low'
    });

    return originalSend.call(this, data);
  };

  next();
};
```

---

**Document Version**: 1.0  
**Last Updated**: 2025-07-08  
**Author**: Taylor Technical Lead