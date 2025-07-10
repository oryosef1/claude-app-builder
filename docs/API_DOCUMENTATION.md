# Multi-Agent Dashboard API Documentation

## Overview
The Multi-Agent Dashboard API provides comprehensive endpoints for managing Claude Code processes, tasks, and AI employees in a distributed system. This RESTful API enables real-time monitoring, task distribution, and multi-agent coordination.

## Base URL
```
http://localhost:8080
```

## Authentication
Currently, the API operates without authentication. This is suitable for development environments but should be secured for production use.

## Response Format
All API responses follow a consistent format:

```json
{
  "success": boolean,
  "data": any,
  "error": string | undefined
}
```

## Rate Limiting
- Process management: 100 requests per minute
- Task operations: 200 requests per minute
- Employee queries: 500 requests per minute

## Error Handling
The API returns appropriate HTTP status codes:
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `404` - Not Found
- `500` - Internal Server Error

---

## Process Management Endpoints

### GET /processes
Retrieve all Claude Code processes.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "process_123",
      "config": {
        "role": "developer",
        "systemPrompt": "You are a senior developer...",
        "allowedTools": ["Bash", "Edit", "Write"],
        "maxTurns": 20,
        "workingDirectory": "/workspace"
      },
      "status": "running",
      "createdAt": "2025-07-09T18:20:25.000Z",
      "startedAt": "2025-07-09T18:20:26.000Z",
      "employeeId": "emp_004",
      "pid": 12345
    }
  ]
}
```

### GET /processes/:id
Retrieve a specific process by ID.

**Parameters:**
- `id` (string) - Process ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "process_123",
    "status": "running",
    "config": { ... },
    "createdAt": "2025-07-09T18:20:25.000Z",
    "employeeId": "emp_004"
  }
}
```

### POST /processes
Create a new Claude Code process.

**Request Body:**
```json
{
  "role": "developer",
  "systemPrompt": "You are a senior developer...",
  "allowedTools": ["Bash", "Edit", "Write", "Read"],
  "maxTurns": 20,
  "workingDirectory": "/workspace",
  "employeeId": "emp_004"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "processId": "process_123"
  }
}
```

### POST /processes/:id/stop
Stop a running process.

**Parameters:**
- `id` (string) - Process ID

**Response:**
```json
{
  "success": true,
  "message": "Process stopped"
}
```

### POST /processes/:id/restart
Restart a stopped process.

**Parameters:**
- `id` (string) - Process ID

**Response:**
```json
{
  "success": true,
  "message": "Process restarted"
}
```

### GET /processes/:id/logs
Retrieve process logs.

**Parameters:**
- `id` (string) - Process ID
- `limit` (query, optional) - Number of log entries (default: 100)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "timestamp": "2025-07-09T18:20:25.000Z",
      "level": "info",
      "message": "Process started",
      "processId": "process_123"
    }
  ]
}
```

---

## Task Management Endpoints

### GET /tasks
Retrieve all tasks.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "task_456",
      "title": "Implement authentication",
      "description": "Add JWT authentication to API",
      "status": "pending",
      "priority": "high",
      "requiredSkills": ["nodejs", "authentication"],
      "createdAt": "2025-07-09T18:20:25.000Z",
      "assignedTo": null,
      "estimatedDuration": 7200000
    }
  ]
}
```

### GET /tasks/:id
Retrieve a specific task by ID.

**Parameters:**
- `id` (string) - Task ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "task_456",
    "title": "Implement authentication",
    "status": "in_progress",
    "assignedTo": "emp_004",
    "processId": "process_123",
    "startedAt": "2025-07-09T18:20:30.000Z"
  }
}
```

### POST /tasks
Create a new task.

**Request Body:**
```json
{
  "title": "Implement authentication",
  "description": "Add JWT authentication to API",
  "priority": "high",
  "requiredSkills": ["nodejs", "authentication"],
  "estimatedDuration": 7200000,
  "data": {
    "files": ["/src/auth.js"],
    "requirements": "Use JWT tokens"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "taskId": "task_456"
  }
}
```

### POST /tasks/:id/assign
Assign a task to an employee.

**Parameters:**
- `id` (string) - Task ID

**Request Body:**
```json
{
  "employeeId": "emp_004"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Task assigned"
}
```

### DELETE /tasks/:id
Cancel a task.

**Parameters:**
- `id` (string) - Task ID

**Response:**
```json
{
  "success": true,
  "message": "Task cancelled"
}
```

---

## Employee Management Endpoints

### GET /employees
Retrieve all AI employees.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "emp_004",
      "name": "Sam Senior Developer",
      "department": "Development",
      "skills": ["nodejs", "typescript", "react"],
      "status": "available",
      "currentWorkload": 45,
      "maxWorkload": 100,
      "currentProjects": ["proj_001"],
      "performance": {
        "tasksCompleted": 23,
        "averageCompletionTime": 5400000,
        "successRate": 0.95
      }
    }
  ]
}
```

### GET /employees/:id
Retrieve a specific employee by ID.

**Parameters:**
- `id` (string) - Employee ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "emp_004",
    "name": "Sam Senior Developer",
    "status": "busy",
    "currentWorkload": 75,
    "currentProjects": ["proj_001", "proj_002"]
  }
}
```

### GET /employees/department/:department
Retrieve employees by department.

**Parameters:**
- `department` (string) - Department name

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "emp_004",
      "name": "Sam Senior Developer",
      "department": "Development",
      "status": "available"
    }
  ]
}
```

### GET /employees/skill/:skill
Retrieve employees by skill.

**Parameters:**
- `skill` (string) - Skill name

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "emp_004",
      "name": "Sam Senior Developer",
      "skills": ["nodejs", "typescript", "react"],
      "status": "available"
    }
  ]
}
```

### GET /employees/available
Retrieve available employees only.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "emp_004",
      "name": "Sam Senior Developer",
      "currentWorkload": 45,
      "status": "available"
    }
  ]
}
```

### POST /employees/:id/workload
Update employee workload.

**Parameters:**
- `id` (string) - Employee ID

**Request Body:**
```json
{
  "workload": 65
}
```

**Response:**
```json
{
  "success": true,
  "message": "Workload updated"
}
```

### POST /employees/:id/status
Update employee status.

**Parameters:**
- `id` (string) - Employee ID

**Request Body:**
```json
{
  "status": "busy"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Status updated"
}
```

### POST /employees/:id/assign-project
Assign a project to an employee.

**Parameters:**
- `id` (string) - Employee ID

**Request Body:**
```json
{
  "projectId": "proj_003"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Project assigned"
}
```

### POST /employees/find-best-match
Find the best employee for a task.

**Request Body:**
```json
{
  "requiredSkills": ["nodejs", "authentication"],
  "priority": "high"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "employee": {
      "id": "emp_004",
      "name": "Sam Senior Developer",
      "matchScore": 0.92,
      "estimatedWaitTime": 1800000
    },
    "recommendation": {
      "score": 0.92,
      "reasons": ["High skill match", "Available immediately", "Good performance history"]
    }
  }
}
```

### GET /departments
Retrieve all departments.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "Development",
      "employeeCount": 4,
      "averageWorkload": 62.5
    },
    {
      "name": "Operations",
      "employeeCount": 3,
      "averageWorkload": 48.3
    }
  ]
}
```

### GET /departments/:department/stats
Retrieve department statistics.

**Parameters:**
- `department` (string) - Department name

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "Development",
    "employeeCount": 4,
    "averageWorkload": 62.5,
    "totalCapacity": 400,
    "utilization": 0.625,
    "availableEmployees": 2
  }
}
```

---

## Statistics Endpoints

### GET /stats/processes
Retrieve process statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 8,
    "running": 5,
    "stopped": 2,
    "errored": 1
  }
}
```

### GET /stats/tasks
Retrieve task statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "pending": 12,
    "inProgress": 5,
    "completed": 23,
    "failed": 2
  }
}
```

### GET /stats/queue
Retrieve queue statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "waiting": 12,
    "active": 5,
    "completed": 23,
    "failed": 2,
    "delayed": 1,
    "paused": 0
  }
}
```

---

## WebSocket Events

The API also provides real-time updates via WebSocket connections on the same port.

### Connection
```javascript
const socket = io('http://localhost:8080');
```

### Event Types

#### Process Events
- `process_update` - Process status changes
- `log_stream` - Real-time log output

#### Task Events
- `task_update` - Task status changes
- `task_assigned` - Task assignment updates

#### Employee Events
- `agents_update` - Employee status changes
- `employee_stats` - Performance metric updates

#### System Events
- `system_metrics` - System health metrics (every 5 seconds)

### Example WebSocket Usage
```javascript
// Subscribe to process updates
socket.emit('subscribe_process', 'process_123');

// Listen for log streams
socket.on('log_stream', (data) => {
  console.log(`[${data.processId}] ${data.logEntry.message}`);
});

// Listen for system metrics
socket.on('system_metrics', (metrics) => {
  console.log('System health:', metrics);
});
```

---

## Integration Examples

### Starting a Development Task
```javascript
// 1. Find the best developer
const response = await fetch('/employees/find-best-match', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    requiredSkills: ['nodejs', 'react'],
    priority: 'high'
  })
});
const { data: bestMatch } = await response.json();

// 2. Create the task
const taskResponse = await fetch('/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Build user dashboard',
    description: 'Create React dashboard for user management',
    priority: 'high',
    requiredSkills: ['nodejs', 'react'],
    estimatedDuration: 14400000
  })
});
const { data: task } = await taskResponse.json();

// 3. Assign the task
await fetch(`/tasks/${task.taskId}/assign`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    employeeId: bestMatch.employee.id
  })
});
```

### Monitoring System Health
```javascript
// Get overall system statistics
const [processStats, taskStats, employees] = await Promise.all([
  fetch('/stats/processes').then(r => r.json()),
  fetch('/stats/tasks').then(r => r.json()),
  fetch('/employees').then(r => r.json())
]);

console.log('System Health:', {
  processes: processStats.data,
  tasks: taskStats.data,
  employees: employees.data.length
});
```

---

## Error Codes and Troubleshooting

### Common Error Responses

#### 404 - Resource Not Found
```json
{
  "success": false,
  "error": "Process not found"
}
```

#### 500 - Internal Server Error
```json
{
  "success": false,
  "error": "Failed to create process: spawn ENOENT"
}
```

### Troubleshooting Tips

1. **Process Creation Fails**: Ensure Claude Code CLI is installed and accessible
2. **Task Assignment Errors**: Verify employee exists and has required skills
3. **WebSocket Connection Issues**: Check CORS settings and firewall rules
4. **Performance Degradation**: Monitor system metrics endpoint for resource usage

---

## Rate Limits and Performance

### Request Limits
- **Process Management**: 100 requests/minute
- **Task Operations**: 200 requests/minute  
- **Employee Queries**: 500 requests/minute

### Performance Targets
- **API Response Time**: < 200ms for all endpoints
- **WebSocket Latency**: < 50ms for real-time updates
- **Process Startup Time**: < 3 seconds for Claude Code processes

### Monitoring
Use the `/stats/*` endpoints to monitor system performance and capacity planning.

---

## AI Company Memory System API

The dashboard integrates with the AI Company Memory System API for persistent context management.

### Base URL
```
http://localhost:3333
```

## Authentication

Currently, the API operates without authentication. In production environments, implement appropriate authentication and authorization mechanisms.

## API Endpoints

### Health Check

#### `GET /health`

Returns the current health status of the Memory System API.

**Response:**
```json
{
  "status": "healthy",
  "timestamp": "2025-07-06T12:00:00.000Z",
  "service": "AI Company Memory System",
  "version": "1.0.0"
}
```

### Memory Storage Operations

#### `POST /api/memory/experience`

Store experience memories for AI employees - captures lessons learned, challenges faced, and solutions discovered.

**Request Body:**
```json
{
  "employeeId": "emp_001",
  "content": "Successfully resolved database connection timeout by implementing connection pooling with retry logic",
  "context": {
    "project": "memory-system",
    "technology": "postgresql",
    "outcome": "success"
  },
  "metadata": {
    "difficulty": "medium",
    "impact": "high",
    "tags": ["database", "performance", "troubleshooting"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "memoryId": "mem_exp_001_1704567890",
  "employeeId": "emp_001",
  "type": "experience"
}
```

#### `POST /api/memory/knowledge`

Store knowledge memories containing factual information, documentation, and technical specifications.

**Request Body:**
```json
{
  "employeeId": "emp_001",
  "content": "Pinecone vector database requires 3072-dimension embeddings for text-embedding-3-large model",
  "context": {
    "domain": "vector-database",
    "technology": "pinecone",
    "category": "configuration"
  },
  "metadata": {
    "source": "official-documentation",
    "verified": true,
    "tags": ["pinecone", "embeddings", "configuration"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "memoryId": "mem_know_001_1704567890",
  "employeeId": "emp_001",
  "type": "knowledge"
}
```

#### `POST /api/memory/decision`

Store decision memories documenting architectural choices, trade-offs, and rationale.

**Request Body:**
```json
{
  "employeeId": "emp_001",
  "content": "Chose Redis for caching layer due to superior performance over in-memory solutions for distributed deployment",
  "context": {
    "decision_type": "architecture",
    "alternatives": ["in-memory", "memcached", "redis"],
    "chosen": "redis"
  },
  "metadata": {
    "impact": "high",
    "confidence": "high",
    "tags": ["architecture", "caching", "performance"]
  }
}
```

**Response:**
```json
{
  "success": true,
  "memoryId": "mem_dec_001_1704567890",
  "employeeId": "emp_001",
  "type": "decision"
}
```

#### `POST /api/memory/interaction`

Store AI interaction memories for learning and improvement.

**Request Body:**
```json
{
  "employeeId": "emp_001",
  "query": "How do I optimize vector search performance?",
  "response": "To optimize vector search performance, use appropriate indexing strategies, implement caching, and consider dimension reduction techniques",
  "context": {
    "session_id": "sess_001",
    "topic": "performance-optimization",
    "satisfaction": "high"
  }
}
```

**Response:**
```json
{
  "success": true,
  "memoryId": "mem_int_001_1704567890",
  "employeeId": "emp_001",
  "type": "interaction"
}
```

### Memory Retrieval Operations

#### `POST /api/memory/search`

Perform semantic search across all memory types for an employee.

**Request Body:**
```json
{
  "employeeId": "emp_001",
  "query": "database performance optimization",
  "options": {
    "limit": 10,
    "memoryTypes": ["experience", "knowledge", "decision"],
    "minScore": 0.7,
    "includeMetadata": true
  }
}
```

**Response:**
```json
{
  "success": true,
  "employeeId": "emp_001",
  "query": "database performance optimization",
  "results": [
    {
      "memoryId": "mem_exp_001_1704567890",
      "content": "Successfully resolved database connection timeout by implementing connection pooling with retry logic",
      "type": "experience",
      "score": 0.95,
      "metadata": {
        "difficulty": "medium",
        "impact": "high",
        "tags": ["database", "performance", "troubleshooting"]
      },
      "timestamp": "2025-07-06T12:00:00.000Z"
    }
  ],
  "total": 1
}
```

#### `POST /api/memory/context`

Get relevant context for a specific task or question.

**Request Body:**
```json
{
  "employeeId": "emp_001",
  "taskDescription": "Implement database connection pooling for the new microservice",
  "options": {
    "limit": 5,
    "contextTypes": ["experience", "knowledge", "decision"],
    "relevanceThreshold": 0.8
  }
}
```

**Response:**
```json
{
  "success": true,
  "employeeId": "emp_001",
  "taskDescription": "Implement database connection pooling for the new microservice",
  "context": {
    "relevant_memories": [
      {
        "content": "Successfully resolved database connection timeout by implementing connection pooling with retry logic",
        "type": "experience",
        "relevance": 0.95,
        "applicability": "high"
      }
    ],
    "key_insights": [
      "Connection pooling significantly improves database performance",
      "Retry logic is essential for handling transient connection failures"
    ],
    "recommendations": [
      "Use connection pooling libraries like pg-pool for PostgreSQL",
      "Implement exponential backoff for retry mechanisms"
    ]
  }
}
```

### Analytics and Statistics

#### `GET /api/memory/expertise/:employeeId/:domain`

Analyze employee expertise in a specific domain based on memory patterns.

**Parameters:**
- `employeeId`: Employee identifier (e.g., "emp_001")
- `domain`: Domain of expertise (e.g., "database", "frontend", "security")

**Response:**
```json
{
  "success": true,
  "expertise": {
    "employeeId": "emp_001",
    "domain": "database",
    "level": "expert",
    "score": 0.92,
    "experience_count": 45,
    "knowledge_count": 78,
    "decision_count": 23,
    "key_areas": [
      "performance optimization",
      "connection pooling",
      "query optimization"
    ],
    "confidence": "high"
  }
}
```

#### `GET /api/memory/stats/:employeeId`

Get comprehensive memory statistics for a specific employee.

**Parameters:**
- `employeeId`: Employee identifier (e.g., "emp_001")

**Response:**
```json
{
  "success": true,
  "statistics": {
    "employeeId": "emp_001",
    "total_memories": 146,
    "memory_breakdown": {
      "experience": 45,
      "knowledge": 78,
      "decision": 23,
      "interaction": 0
    },
    "memory_growth": {
      "last_week": 12,
      "last_month": 35,
      "trend": "increasing"
    },
    "top_domains": [
      {"domain": "database", "count": 34},
      {"domain": "performance", "count": 28},
      {"domain": "architecture", "count": 19}
    ],
    "memory_quality": {
      "average_relevance": 0.87,
      "completeness": "high"
    }
  }
}
```

#### `GET /api/memory/stats`

Get memory statistics for all employees in the system.

**Response:**
```json
{
  "success": true,
  "statistics": {
    "emp_001": {
      "total_memories": 146,
      "memory_breakdown": {
        "experience": 45,
        "knowledge": 78,
        "decision": 23,
        "interaction": 0
      }
    },
    "emp_002": {
      "total_memories": 89,
      "memory_breakdown": {
        "experience": 23,
        "knowledge": 45,
        "decision": 21,
        "interaction": 0
      }
    }
  }
}
```

### Documentation

#### `GET /api/docs`

Get basic API documentation and available endpoints.

**Response:**
```json
{
  "service": "AI Company Memory System API",
  "version": "1.0.0",
  "endpoints": {
    "POST /api/memory/experience": "Store experience memory",
    "POST /api/memory/knowledge": "Store knowledge memory",
    "POST /api/memory/decision": "Store decision memory",
    "POST /api/memory/search": "Search memories",
    "POST /api/memory/context": "Get relevant context for task",
    "GET /api/memory/expertise/:employeeId/:domain": "Get employee expertise",
    "GET /api/memory/stats/:employeeId": "Get memory statistics",
    "POST /api/memory/interaction": "Store interaction memory",
    "GET /api/memory/stats": "Get all employees statistics",
    "GET /health": "Health check",
    "GET /api/docs": "API documentation"
  }
}
```

## Error Handling

All endpoints return appropriate HTTP status codes and error messages:

### 400 Bad Request
```json
{
  "error": "Missing required fields: employeeId, content",
  "message": "Request validation failed"
}
```

### 404 Not Found
```json
{
  "error": "Endpoint not found",
  "message": "POST /api/invalid is not a valid endpoint"
}
```

### 500 Internal Server Error
```json
{
  "error": "Failed to store experience memory",
  "message": "Vector database connection failed"
}
```

## Employee IDs

The system supports 13 AI employees with the following IDs:
- `emp_001` - `emp_013`

Each employee has specialized roles and departmental affiliations that affect memory access patterns and sharing permissions.

## Memory Types

### Experience Memories
- Capture lessons learned and practical knowledge
- Focus on outcomes and problem-solving approaches
- Include difficulty and impact assessments

### Knowledge Memories
- Store factual information and documentation
- Technical specifications and configuration details
- Verified information with source attribution

### Decision Memories
- Document architectural and design choices
- Include alternatives considered and rationale
- Track decision impact and confidence levels

### Interaction Memories
- Record AI-human interactions for learning
- Capture query-response patterns
- Include satisfaction and effectiveness metrics

## Best Practices

### Memory Content
- Use clear, descriptive content that provides context
- Include relevant metadata for better searchability
- Tag memories with appropriate keywords

### Search Operations
- Use specific queries for better semantic matching
- Adjust relevance thresholds based on use case
- Combine multiple memory types for comprehensive results

### Context Retrieval
- Provide detailed task descriptions for better context matching
- Use appropriate relevance thresholds to filter results
- Consider both recent and historical memories

### Performance Optimization
- Implement caching for frequently accessed memories
- Use appropriate batch sizes for bulk operations
- Monitor memory growth and implement archival strategies

## Integration Examples

### Corporate Workflow Integration
```javascript
// Get relevant context before starting a task
const context = await fetch('/api/memory/context', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    employeeId: 'emp_001',
    taskDescription: 'Implement API rate limiting',
    options: { limit: 5, relevanceThreshold: 0.8 }
  })
});

// Store experience after task completion
await fetch('/api/memory/experience', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    employeeId: 'emp_001',
    content: 'Implemented rate limiting using Redis sliding window algorithm',
    context: { outcome: 'success', technology: 'redis' },
    metadata: { impact: 'high', difficulty: 'medium' }
  })
});
```

### Performance Monitoring
```javascript
// Monitor system performance
const stats = await fetch('/api/memory/stats').then(r => r.json());
console.log('Total memories across all employees:', 
  Object.values(stats.statistics).reduce((total, emp) => 
    total + emp.total_memories, 0));
```

## Rate Limits and Quotas

Currently, no rate limits are enforced. In production environments, implement appropriate rate limiting based on:
- Memory storage operations: 100 requests/minute per employee
- Search operations: 1000 requests/minute per employee
- Analytics operations: 50 requests/minute per employee

## Security Considerations

- Implement authentication and authorization
- Use HTTPS in production environments
- Validate and sanitize all input data
- Implement proper logging and monitoring
- Consider data encryption at rest
- Implement proper backup and recovery procedures

## Support and Troubleshooting

### Common Issues

1. **Connection Failures**: Verify Pinecone API key and network connectivity
2. **Slow Search Performance**: Check embedding generation and caching configuration
3. **Memory Storage Errors**: Validate request format and required fields
4. **High Memory Usage**: Implement archival strategies for old memories

### Logging

API operations are logged with appropriate levels:
- INFO: Normal operations and requests
- WARN: Performance issues and deprecated usage
- ERROR: Failures and exceptions

Log files are stored in the `logs/` directory.

### Health Monitoring

Use the `/health` endpoint to monitor API status and implement appropriate alerting for production deployments.