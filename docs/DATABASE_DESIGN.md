# Database Schema and Data Flow Design

## Overview

This document defines the database schema, data models, and data flow patterns for the Multi-Agent Dashboard System. The design supports both development (SQLite) and production (PostgreSQL) environments while maintaining data consistency and optimal performance.

## 1. Database Schema

### 1.1 Core Tables

#### 1.1.1 processes Table
```sql
CREATE TABLE processes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  employee_id TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('starting', 'running', 'stopped', 'error', 'crashed')),
  pid INTEGER,
  system_prompt TEXT NOT NULL,
  working_directory TEXT NOT NULL,
  allowed_tools TEXT, -- JSON array of allowed tools
  max_turns INTEGER DEFAULT 20,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP,
  stopped_at TIMESTAMP,
  resource_usage JSON, -- CPU, memory usage tracking
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE INDEX idx_processes_status ON processes(status);
CREATE INDEX idx_processes_employee ON processes(employee_id);
CREATE INDEX idx_processes_created ON processes(created_at);
```

#### 1.1.2 employees Table
```sql
CREATE TABLE employees (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT NOT NULL,
  level TEXT NOT NULL CHECK (level IN ('Junior', 'Mid', 'Senior')),
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'busy', 'maintenance')),
  skills JSON NOT NULL, -- Array of skills
  current_workload INTEGER DEFAULT 0,
  max_concurrent_tasks INTEGER DEFAULT 5,
  system_prompt_template TEXT NOT NULL,
  performance_metrics JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_employees_status ON employees(status);
CREATE INDEX idx_employees_department ON employees(department);
CREATE INDEX idx_employees_workload ON employees(current_workload);
```

#### 1.1.3 tasks Table
```sql
CREATE TABLE tasks (
  id TEXT PRIMARY KEY,
  process_id TEXT,
  employee_id TEXT NOT NULL,
  type TEXT NOT NULL,
  priority INTEGER DEFAULT 0 CHECK (priority IN (0, 1, 2)), -- 0=low, 1=medium, 2=high
  status TEXT NOT NULL CHECK (status IN ('pending', 'assigned', 'running', 'completed', 'failed', 'cancelled')),
  title TEXT NOT NULL,
  description TEXT,
  payload JSON,
  result JSON,
  error_message TEXT,
  estimated_duration INTEGER, -- in minutes
  actual_duration INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  assigned_at TIMESTAMP,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  created_by TEXT,
  FOREIGN KEY (process_id) REFERENCES processes(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_priority ON tasks(priority);
CREATE INDEX idx_tasks_employee ON tasks(employee_id);
CREATE INDEX idx_tasks_process ON tasks(process_id);
CREATE INDEX idx_tasks_created ON tasks(created_at);
```

#### 1.1.4 task_queue Table
```sql
CREATE TABLE task_queue (
  id TEXT PRIMARY KEY,
  task_id TEXT NOT NULL,
  queue_name TEXT NOT NULL,
  priority INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  delay_until TIMESTAMP,
  payload JSON,
  status TEXT NOT NULL CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'delayed')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  FOREIGN KEY (task_id) REFERENCES tasks(id)
);

CREATE INDEX idx_task_queue_status ON task_queue(status);
CREATE INDEX idx_task_queue_priority ON task_queue(priority);
CREATE INDEX idx_task_queue_delay ON task_queue(delay_until);
```

### 1.2 Logging and Monitoring Tables

#### 1.2.1 process_logs Table
```sql
CREATE TABLE process_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  process_id TEXT NOT NULL,
  log_level TEXT NOT NULL CHECK (log_level IN ('DEBUG', 'INFO', 'WARN', 'ERROR', 'FATAL')),
  message TEXT NOT NULL,
  metadata JSON,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (process_id) REFERENCES processes(id)
);

CREATE INDEX idx_process_logs_process ON process_logs(process_id);
CREATE INDEX idx_process_logs_level ON process_logs(log_level);
CREATE INDEX idx_process_logs_timestamp ON process_logs(timestamp);

-- Partitioning for large log volumes (PostgreSQL)
CREATE TABLE process_logs_2025_01 PARTITION OF process_logs
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

#### 1.2.2 performance_metrics Table
```sql
CREATE TABLE performance_metrics (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  process_id TEXT,
  employee_id TEXT,
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  value REAL NOT NULL,
  unit TEXT,
  tags JSON,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (process_id) REFERENCES processes(id),
  FOREIGN KEY (employee_id) REFERENCES employees(id)
);

CREATE INDEX idx_metrics_process ON performance_metrics(process_id);
CREATE INDEX idx_metrics_employee ON performance_metrics(employee_id);
CREATE INDEX idx_metrics_type ON performance_metrics(metric_type);
CREATE INDEX idx_metrics_timestamp ON performance_metrics(timestamp);
```

#### 1.2.3 system_events Table
```sql
CREATE TABLE system_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  event_type TEXT NOT NULL,
  source TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  message TEXT NOT NULL,
  details JSON,
  resolved BOOLEAN DEFAULT FALSE,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP
);

CREATE INDEX idx_system_events_type ON system_events(event_type);
CREATE INDEX idx_system_events_severity ON system_events(severity);
CREATE INDEX idx_system_events_resolved ON system_events(resolved);
CREATE INDEX idx_system_events_timestamp ON system_events(timestamp);
```

### 1.3 Configuration and Settings Tables

#### 1.3.1 system_config Table
```sql
CREATE TABLE system_config (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  data_type TEXT NOT NULL CHECK (data_type IN ('string', 'number', 'boolean', 'json')),
  description TEXT,
  is_secret BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default configuration
INSERT INTO system_config (key, value, data_type, description) VALUES
('max_concurrent_processes', '20', 'number', 'Maximum number of concurrent Claude processes'),
('default_process_timeout', '1800', 'number', 'Default process timeout in seconds'),
('task_queue_batch_size', '10', 'number', 'Number of tasks to process in batch'),
('log_retention_days', '30', 'number', 'Days to retain process logs'),
('metrics_retention_days', '90', 'number', 'Days to retain performance metrics');
```

#### 1.3.2 employee_templates Table
```sql
CREATE TABLE employee_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL,
  department TEXT NOT NULL,
  system_prompt TEXT NOT NULL,
  default_tools JSON,
  default_max_turns INTEGER DEFAULT 20,
  skill_requirements JSON,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

## 2. Data Models

### 2.1 TypeScript Interfaces

#### 2.1.1 Core Models
```typescript
// types/Process.ts
export interface Process {
  id: string;
  name: string;
  employeeId: string;
  status: ProcessStatus;
  pid?: number;
  systemPrompt: string;
  workingDirectory: string;
  allowedTools: string[];
  maxTurns: number;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  stoppedAt?: Date;
  resourceUsage?: ResourceUsage;
}

export type ProcessStatus = 'starting' | 'running' | 'stopped' | 'error' | 'crashed';

export interface ResourceUsage {
  cpuPercent: number;
  memoryMB: number;
  uptimeSeconds: number;
}

// types/Employee.ts
export interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  level: EmployeeLevel;
  status: EmployeeStatus;
  skills: string[];
  currentWorkload: number;
  maxConcurrentTasks: number;
  systemPromptTemplate: string;
  performanceMetrics: PerformanceMetrics;
  createdAt: Date;
  updatedAt: Date;
}

export type EmployeeLevel = 'Junior' | 'Mid' | 'Senior';
export type EmployeeStatus = 'active' | 'inactive' | 'busy' | 'maintenance';

export interface PerformanceMetrics {
  tasksCompleted: number;
  averageTaskDuration: number;
  successRate: number;
  qualityScore: number;
}

// types/Task.ts
export interface Task {
  id: string;
  processId?: string;
  employeeId: string;
  type: string;
  priority: TaskPriority;
  status: TaskStatus;
  title: string;
  description?: string;
  payload?: any;
  result?: any;
  errorMessage?: string;
  estimatedDuration?: number;
  actualDuration?: number;
  createdAt: Date;
  assignedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  createdBy?: string;
}

export type TaskPriority = 0 | 1 | 2; // low, medium, high
export type TaskStatus = 'pending' | 'assigned' | 'running' | 'completed' | 'failed' | 'cancelled';
```

#### 2.1.2 Monitoring Models
```typescript
// types/Monitoring.ts
export interface ProcessLog {
  id: number;
  processId: string;
  logLevel: LogLevel;
  message: string;
  metadata?: any;
  timestamp: Date;
}

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

export interface PerformanceMetric {
  id: number;
  processId?: string;
  employeeId?: string;
  metricType: string;
  metricName: string;
  value: number;
  unit?: string;
  tags?: Record<string, string>;
  timestamp: Date;
}

export interface SystemEvent {
  id: number;
  eventType: string;
  source: string;
  severity: EventSeverity;
  message: string;
  details?: any;
  resolved: boolean;
  timestamp: Date;
  resolvedAt?: Date;
}

export type EventSeverity = 'low' | 'medium' | 'high' | 'critical';
```

## 3. Data Flow Patterns

### 3.1 Task Processing Flow

#### 3.1.1 Task Creation and Assignment
```
User Request → Task Creation → Queue Assignment → Employee Matching → Process Assignment
     ↓               ↓              ↓                  ↓                    ↓
Task Record     Task Queue      Priority Queue    Employee Selection    Process Binding
```

**Detailed Flow:**
1. **Task Creation**: User submits task through dashboard
2. **Validation**: Task payload validated against schema
3. **Skill Matching**: System matches task requirements to employee skills
4. **Queue Assignment**: Task added to appropriate priority queue
5. **Employee Selection**: Available employee selected based on workload and skills
6. **Process Assignment**: Task assigned to employee's active process or new process spawned
7. **Execution**: Process executes task using Claude Code
8. **Result Handling**: Results stored and events broadcasted

#### 3.1.2 Process Lifecycle Management
```
Process Request → Configuration → Spawn → Monitor → Cleanup
      ↓               ↓           ↓        ↓          ↓
Process Record    Config Setup   Claude   Metrics   Resource
                               Process   Collection  Cleanup
```

**State Transitions:**
```
starting → running → stopped
    ↓        ↓         ↓
   error   crashed   completed
```

### 3.2 Real-time Data Flow

#### 3.2.1 WebSocket Event Broadcasting
```
Process Event → Event Handler → WebSocket Server → Connected Clients
     ↓              ↓               ↓                    ↓
Log Entry      Event Processing   Room Broadcasting   UI Updates
```

**Event Types:**
- `process-started`: New process spawned
- `process-stopped`: Process terminated
- `process-output`: Process log output
- `process-error`: Process error occurred
- `task-assigned`: Task assigned to process
- `task-completed`: Task completed
- `system-alert`: System-wide alert

#### 3.2.2 Log Streaming Flow
```
Process Output → Log Parser → Database Storage → Stream Aggregation → Client Delivery
     ↓              ↓             ↓                    ↓                    ↓
Raw Output     Structured Log  Log Record        Filtered Stream      Live Display
```

### 3.3 Data Persistence Patterns

#### 3.3.1 Write-Heavy Operations
```typescript
// Batch insert pattern for high-volume logs
export class LogBatchProcessor {
  private batch: ProcessLog[] = [];
  private batchSize = 100;
  private flushInterval = 5000; // 5 seconds

  constructor(private repository: LogRepository) {
    setInterval(() => this.flush(), this.flushInterval);
  }

  addLog(log: ProcessLog): void {
    this.batch.push(log);
    if (this.batch.length >= this.batchSize) {
      this.flush();
    }
  }

  private async flush(): Promise<void> {
    if (this.batch.length === 0) return;
    
    const logs = this.batch.splice(0);
    await this.repository.insertBatch(logs);
  }
}
```

#### 3.3.2 Read-Heavy Operations
```typescript
// Caching pattern for frequently accessed data
export class CachedEmployeeRepository {
  private cache = new Map<string, Employee>();
  private cacheTimeout = 300000; // 5 minutes

  async findById(id: string): Promise<Employee | null> {
    // Check cache first
    const cached = this.cache.get(id);
    if (cached) return cached;

    // Fetch from database
    const employee = await this.repository.findById(id);
    if (employee) {
      this.cache.set(id, employee);
      setTimeout(() => this.cache.delete(id), this.cacheTimeout);
    }

    return employee;
  }
}
```

## 4. Performance Optimization

### 4.1 Indexing Strategy

#### 4.1.1 Query Optimization
```sql
-- Composite index for common queries
CREATE INDEX idx_tasks_status_priority ON tasks(status, priority);
CREATE INDEX idx_tasks_employee_status ON tasks(employee_id, status);
CREATE INDEX idx_processes_employee_status ON processes(employee_id, status);

-- Partial index for active processes
CREATE INDEX idx_processes_active ON processes(employee_id) WHERE status = 'running';

-- Expression index for JSON queries (PostgreSQL)
CREATE INDEX idx_employees_skills ON employees USING GIN (skills);
```

#### 4.1.2 Partitioning Strategy
```sql
-- Time-based partitioning for logs (PostgreSQL)
CREATE TABLE process_logs (
  id BIGSERIAL,
  process_id TEXT NOT NULL,
  log_level TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) PARTITION BY RANGE (timestamp);

-- Monthly partitions
CREATE TABLE process_logs_2025_01 PARTITION OF process_logs
FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');
```

### 4.2 Connection Pooling

#### 4.2.1 Database Connection Management
```typescript
// config/database.ts
export class DatabaseManager {
  private pool: Pool;

  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432'),
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 20, // Maximum connections
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
      maxUses: 7500 // Prevent connection leaks
    });
  }

  async query(text: string, params?: any[]): Promise<QueryResult> {
    const client = await this.pool.connect();
    try {
      return await client.query(text, params);
    } finally {
      client.release();
    }
  }
}
```

## 5. Data Migration Strategy

### 5.1 Database Migrations

#### 5.1.1 Migration Framework
```typescript
// migrations/MigrationManager.ts
export interface Migration {
  id: string;
  description: string;
  up: (db: Database) => Promise<void>;
  down: (db: Database) => Promise<void>;
}

export class MigrationManager {
  private migrations: Migration[] = [];

  register(migration: Migration): void {
    this.migrations.push(migration);
  }

  async migrate(): Promise<void> {
    // Get current migration version
    const currentVersion = await this.getCurrentVersion();
    
    // Run pending migrations
    for (const migration of this.migrations) {
      if (migration.id > currentVersion) {
        await migration.up(this.database);
        await this.updateVersion(migration.id);
        logger.info(`Applied migration: ${migration.id}`);
      }
    }
  }

  private async getCurrentVersion(): Promise<string> {
    const result = await this.database.query(
      'SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1'
    );
    return result.rows[0]?.version || '0';
  }
}
```

#### 5.1.2 Sample Migration
```typescript
// migrations/001_create_initial_tables.ts
export const migration001: Migration = {
  id: '001',
  description: 'Create initial tables',
  
  async up(db: Database): Promise<void> {
    await db.query(`
      CREATE TABLE employees (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        role TEXT NOT NULL,
        department TEXT NOT NULL,
        status TEXT NOT NULL,
        skills JSON NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.query(`
      CREATE TABLE processes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        employee_id TEXT NOT NULL,
        status TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (employee_id) REFERENCES employees(id)
      )
    `);
  },

  async down(db: Database): Promise<void> {
    await db.query('DROP TABLE IF EXISTS processes');
    await db.query('DROP TABLE IF EXISTS employees');
  }
};
```

### 5.2 Data Seeding

#### 5.2.1 Employee Data Seeding
```typescript
// seeders/EmployeeSeeder.ts
export class EmployeeSeeder {
  async seed(db: Database): Promise<void> {
    const employees = [
      {
        id: 'emp_001',
        name: 'Alex Project Manager',
        role: 'Project Manager',
        department: 'Executive',
        level: 'Senior',
        status: 'active',
        skills: ['sprint_planning', 'resource_allocation', 'stakeholder_communication'],
        systemPromptTemplate: 'You are a senior project manager...'
      },
      // ... more employees
    ];

    for (const employee of employees) {
      await db.query(
        'INSERT INTO employees (id, name, role, department, level, status, skills, system_prompt_template) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [employee.id, employee.name, employee.role, employee.department, employee.level, employee.status, JSON.stringify(employee.skills), employee.systemPromptTemplate]
      );
    }
  }
}
```

## 6. Backup and Recovery

### 6.1 Backup Strategy

#### 6.1.1 Automated Backups
```bash
#!/bin/bash
# scripts/backup.sh

# Database backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/dashboard"
DB_NAME="dashboard_production"

# Create backup directory
mkdir -p $BACKUP_DIR

# PostgreSQL backup
pg_dump -h localhost -U dashboard_user -d $DB_NAME > $BACKUP_DIR/dashboard_$TIMESTAMP.sql

# Compress backup
gzip $BACKUP_DIR/dashboard_$TIMESTAMP.sql

# Remove backups older than 30 days
find $BACKUP_DIR -name "*.sql.gz" -type f -mtime +30 -delete

# Upload to S3 (optional)
aws s3 cp $BACKUP_DIR/dashboard_$TIMESTAMP.sql.gz s3://dashboard-backups/
```

#### 6.1.2 Point-in-Time Recovery
```sql
-- Enable WAL archiving (PostgreSQL)
archive_mode = on
archive_command = 'cp %p /var/lib/postgresql/wal_archive/%f'
wal_level = replica

-- Recovery command
SELECT pg_start_backup('backup_label');
-- Copy data files
SELECT pg_stop_backup();
```

## 7. Testing Data

### 7.1 Test Data Generation

#### 7.1.1 Test Data Factory
```typescript
// tests/factories/TaskFactory.ts
export class TaskFactory {
  static create(overrides: Partial<Task> = {}): Task {
    return {
      id: randomId(),
      processId: overrides.processId || 'test-process',
      employeeId: overrides.employeeId || 'emp_001',
      type: overrides.type || 'code_review',
      priority: overrides.priority || 1,
      status: overrides.status || 'pending',
      title: overrides.title || 'Test Task',
      description: overrides.description || 'Test task description',
      payload: overrides.payload || { code: 'console.log("test")' },
      createdAt: overrides.createdAt || new Date(),
      ...overrides
    };
  }

  static createMany(count: number, overrides: Partial<Task> = {}): Task[] {
    return Array.from({ length: count }, () => this.create(overrides));
  }
}
```

#### 7.1.2 Database Test Utilities
```typescript
// tests/utils/DatabaseTestUtils.ts
export class DatabaseTestUtils {
  static async setupTestDatabase(): Promise<Database> {
    const db = new Database(':memory:');
    
    // Run migrations
    await migrationManager.migrate();
    
    // Seed test data
    await new EmployeeSeeder().seed(db);
    
    return db;
  }

  static async cleanupTestDatabase(db: Database): Promise<void> {
    await db.query('DELETE FROM tasks');
    await db.query('DELETE FROM processes');
    await db.query('DELETE FROM process_logs');
  }
}
```

## Conclusion

This database design provides a robust foundation for the Multi-Agent Dashboard System with proper normalization, indexing, and performance optimization. The schema supports all core functionality while maintaining flexibility for future enhancements.

Key features include:
- Comprehensive process and task tracking
- Performance monitoring and logging
- Scalable architecture with proper indexing
- Data migration and seeding capabilities
- Backup and recovery procedures
- Testing utilities and data factories

The design balances normalization with performance, ensuring data integrity while supporting high-throughput operations required for real-time process management.

---

**Document Version**: 1.0  
**Last Updated**: 2025-07-08  
**Author**: Taylor Technical Lead  
**Next Review**: 2025-07-15