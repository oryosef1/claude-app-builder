# Memory Storage Guide for AI Employees

## Overview
As an AI employee, you are responsible for storing important memories from your work. This guide explains how to use the Memory API to save experiences, knowledge, and decisions.

## When to Save Memories

### Save These Types of Information:
1. **Important Decisions**: Architecture choices, technology selections, design patterns
2. **Problem Solutions**: How you solved complex issues or bugs
3. **Learning Experiences**: New techniques, patterns, or approaches discovered
4. **Project Context**: Key requirements, constraints, or business rules
5. **Error Resolutions**: How you fixed specific errors or issues
6. **Best Practices**: Coding standards, patterns, or methodologies adopted
7. **Team Insights**: Important discussions, feedback, or collaboration outcomes

### Memory Types:
- **experience**: Personal experiences, lessons learned, problem-solving approaches
- **knowledge**: Technical facts, documentation, how-to guides, best practices
- **decision**: Architecture decisions, technology choices, design rationale

## How to Store Memories

### Using PowerShell (Recommended for Windows)

```powershell
# Store an experience memory
$memory = @{
    employeeId = "emp_004"  # Your employee ID
    content = "Successfully implemented Redis caching for the dashboard API, reducing response times by 60%"
    context = @{
        project = "Dashboard Backend"
        task = "Performance Optimization"
        technologies = @("Redis", "Node.js", "Express")
    }
    metadata = @{
        importance = 8
        category = "performance_optimization"
        tags = @("caching", "redis", "optimization")
    }
} | ConvertTo-Json -Depth 10

$response = Invoke-WebRequest -Uri http://localhost:3335/api/memory/experience -Method POST -Body $memory -ContentType "application/json"
Write-Host "Memory stored: $($response.Content)"
```

### Memory Storage Examples

#### 1. Storing Architecture Decisions
```powershell
$memory = @{
    employeeId = "emp_002"  # Technical Lead
    content = "Decided to use Vue.js 3 with Composition API for the dashboard frontend due to better TypeScript support and reactive state management capabilities"
    context = @{
        project = "Multi-Agent Dashboard"
        decision_type = "framework_selection"
        alternatives_considered = @("React", "Angular", "Svelte")
    }
    metadata = @{
        importance = 9
        category = "architecture_decision"
        rationale = "Vue 3 offers better developer experience and smaller bundle sizes"
    }
} | ConvertTo-Json -Depth 10

Invoke-WebRequest -Uri http://localhost:3335/api/memory/decision -Method POST -Body $memory -ContentType "application/json"
```

#### 2. Storing Problem Solutions
```powershell
$memory = @{
    employeeId = "emp_004"  # Senior Developer
    content = "Fixed WebSocket connection issues by implementing proper CORS configuration and using Socket.io's built-in reconnection strategy"
    context = @{
        problem = "WebSocket connections dropping frequently"
        solution = "Added CORS middleware and reconnection logic"
        code_snippet = "io.on('connection', (socket) => { socket.on('disconnect', () => { /* reconnection handled by Socket.io */ }); });"
    }
    metadata = @{
        importance = 7
        category = "bug_fix"
        time_saved = "4 hours of debugging"
    }
} | ConvertTo-Json -Depth 10

Invoke-WebRequest -Uri http://localhost:3335/api/memory/experience -Method POST -Body $memory -ContentType "application/json"
```

#### 3. Storing Technical Knowledge
```powershell
$memory = @{
    employeeId = "emp_011"  # Technical Writer
    content = "Documented the complete API endpoint structure for the dashboard backend, including authentication flow and request/response formats"
    context = @{
        documentation_type = "API Reference"
        endpoints_documented = 25
        format = "OpenAPI 3.0"
    }
    metadata = @{
        importance = 8
        category = "documentation"
        location = "docs/API_DOCUMENTATION.md"
    }
} | ConvertTo-Json -Depth 10

Invoke-WebRequest -Uri http://localhost:3335/api/memory/knowledge -Method POST -Body $memory -ContentType "application/json"
```

## Best Practices

### 1. Be Specific and Detailed
- Include specific error messages, code snippets, or configuration details
- Mention version numbers, library names, and exact solutions

### 2. Add Context
- Always include project name, task description, and relevant background
- Link related memories by mentioning previous decisions or experiences

### 3. Set Appropriate Importance
- 1-3: Minor details, routine tasks
- 4-6: Useful information, standard solutions
- 7-8: Important decisions, significant learnings
- 9-10: Critical knowledge, major breakthroughs

### 4. Use Consistent Categories
- architecture_decision
- bug_fix
- performance_optimization
- security_improvement
- documentation
- best_practice
- team_collaboration
- error_resolution

### 5. Store Memories Promptly
- Save important memories immediately after completing significant tasks
- Don't wait until the end of the project - context may be lost

## Searching Your Memories

```powershell
# Search for specific memories
$searchQuery = @{
    employeeId = "emp_004"
    query = "Redis caching performance"
    limit = 5
} | ConvertTo-Json

$results = Invoke-WebRequest -Uri http://localhost:3335/api/memory/search -Method POST -Body $searchQuery -ContentType "application/json"
$memories = ($results.Content | ConvertFrom-Json).memories

foreach ($memory in $memories) {
    Write-Host "Score: $($memory.score) - $($memory.content)"
}
```

## Memory API Endpoints

- **Store Experience**: POST `http://localhost:3335/api/memory/experience`
- **Store Knowledge**: POST `http://localhost:3335/api/memory/knowledge`
- **Store Decision**: POST `http://localhost:3335/api/memory/decision`
- **Search Memories**: POST `http://localhost:3335/api/memory/search`
- **Get Stats**: GET `http://localhost:3335/api/memory/stats/{employeeId}`

## Troubleshooting

### Port Issues
The Memory API typically runs on port 3335. If it's not responding:
1. Check the `.memory-api-port` file for the current port
2. Verify the service is running: `Get-Process node`
3. Start the service if needed: `Start-Process node -ArgumentList "src/index.js"`

### Connection Issues
- Remember: WSL cannot connect to Windows localhost services
- Always use PowerShell or Windows Command Prompt for testing
- Use `Invoke-WebRequest` instead of curl

### JSON Formatting
- Use `ConvertTo-Json -Depth 10` to ensure nested objects are properly serialized
- Always set `-ContentType "application/json"` in requests

## Summary

Remember to save memories for:
- ✅ Important decisions and their rationale
- ✅ Solutions to complex problems
- ✅ New techniques or patterns learned
- ✅ Significant project milestones
- ✅ Team collaboration insights
- ✅ Performance improvements
- ✅ Security enhancements

Your memories help the entire AI team learn and improve over time!