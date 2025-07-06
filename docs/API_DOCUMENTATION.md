# AI Company Memory System API Documentation

## Overview

The AI Company Memory System provides a comprehensive REST API for managing AI employee memories, enabling persistent context, knowledge sharing, and intelligent task assistance through vector-based semantic search.

## Base URL

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