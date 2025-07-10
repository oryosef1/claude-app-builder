# Multi-Agent Coordination System Documentation

## Overview
The Multi-Agent Coordination System is the core intelligence layer of the dashboard, responsible for managing 13 AI employees across 4 departments, enabling intelligent task distribution, workload balancing, and collaborative workflow orchestration.

## Architecture

### AgentRegistry System
The `AgentRegistry` class serves as the central hub for all AI employee management, providing:
- **Employee Profile Management**: Complete employee data including skills, workload, and performance metrics
- **Department Organization**: Hierarchical structure across Executive, Development, Operations, and Support departments
- **Skill-Based Matching**: Intelligent algorithm for matching tasks to employees based on capabilities
- **Real-time Updates**: Event-driven notifications for status changes and performance updates

### Employee Data Structure
Each AI employee maintains a comprehensive profile:

```typescript
interface Employee {
  id: string;                    // Unique identifier (emp_001 - emp_013)
  name: string;                  // Full name and role
  role: string;                  // Specific job function
  department: string;            // Department assignment
  level: string;                 // Seniority level
  hire_date: string;             // Employment start date
  status: 'active' | 'inactive' | 'busy' | 'maintenance';
  skills: string[];              // Technical and soft skills
  system_prompt_file: string;    // Path to specialized system prompt
  current_projects: string[];    // Active project assignments
  workload: number;              // Current workload percentage (0-100)
  performance_metrics: {         // Performance tracking data
    [key: string]: number;
  };
}
```

## Employee Registry

### 13 AI Employees - 4 Departments

#### Executive Department (3 employees)
- **Alex Project Manager** (emp_001)
  - Skills: project-management, agile, stakeholder-communication
  - Role: Overall project coordination and client communication
  - System Prompt: Focused on strategic planning and risk management

- **Taylor Technical Lead** (emp_002)
  - Skills: system-architecture, technical-leadership, code-review
  - Role: Technical architecture and development guidance
  - System Prompt: Emphasizes architectural decisions and technical standards

- **Morgan QA Director** (emp_003)
  - Skills: quality-assurance, test-strategy, process-improvement
  - Role: Quality standards and testing strategy
  - System Prompt: Focuses on quality metrics and process optimization

#### Development Department (4 employees)
- **Sam Senior Developer** (emp_004)
  - Skills: nodejs, typescript, react, database-design
  - Role: Complex feature development and mentoring
  - System Prompt: Senior-level problem solving and best practices

- **Casey Junior Developer** (emp_005)
  - Skills: javascript, html, css, basic-react
  - Role: Feature implementation and bug fixes
  - System Prompt: Learning-focused with guidance requests

- **Jordan QA Engineer** (emp_006)
  - Skills: testing, automation, cypress, jest
  - Role: Test development and quality assurance
  - System Prompt: Quality-focused testing strategies

- **Riley Test Engineer** (emp_007)
  - Skills: automated-testing, performance-testing, selenium
  - Role: Test automation and performance validation
  - System Prompt: Technical testing and performance optimization

#### Operations Department (3 employees)
- **Drew DevOps Engineer** (emp_008)
  - Skills: docker, kubernetes, ci-cd, monitoring
  - Role: Infrastructure and deployment management
  - System Prompt: Infrastructure and deployment best practices

- **Avery SRE** (emp_009)
  - Skills: system-reliability, monitoring, incident-response
  - Role: System reliability and performance monitoring
  - System Prompt: Reliability engineering and incident management

- **Phoenix Security Engineer** (emp_010)
  - Skills: security, penetration-testing, compliance
  - Role: Security auditing and compliance
  - System Prompt: Security-first approach and threat assessment

#### Support Department (3 employees)
- **Blake Technical Writer** (emp_011)
  - Skills: documentation, technical-writing, api-documentation
  - Role: Documentation and user guides
  - System Prompt: Clear communication and user-focused documentation

- **Quinn UI/UX Designer** (emp_012)
  - Skills: ui-design, user-experience, prototyping
  - Role: User interface design and user experience
  - System Prompt: User-centered design and accessibility

- **River Build Engineer** (emp_013)
  - Skills: build-systems, automation, deployment
  - Role: Build automation and deployment pipelines
  - System Prompt: Build optimization and automation

## Task Distribution Algorithm

### Skill-Based Matching
The system uses a sophisticated algorithm to match tasks to employees:

1. **Skill Scoring**: Calculate skill match percentage based on required vs. available skills
2. **Availability Scoring**: Factor in current workload (100 - workload percentage)
3. **Priority Weighting**: Adjust scoring based on task priority
   - High priority: 80% skill match, 20% availability
   - Medium priority: 60% skill match, 40% availability
   - Low priority: 40% skill match, 60% availability

### Multi-Agent Team Assembly
For complex tasks requiring multiple employees:

```typescript
interface TeamAssemblyOptions {
  requiredSkills: string[];
  teamSize: number;
  preferences: {
    department?: string;      // Prefer specific department
    level?: string;          // Prefer specific seniority level
    excludeIds?: string[];   // Exclude specific employees
  };
}
```

### Load Balancing
The system continuously monitors and balances workload across:
- **Individual Employees**: Prevents overloading (max 100% workload)
- **Departments**: Ensures even distribution across teams
- **Skill Areas**: Prevents bottlenecks in specialized skills

## Real-Time Coordination

### Event-Driven Architecture
The AgentRegistry emits events for all state changes:

```typescript
// Registry events
'registry-updated'           // Employee data changed
'workload-updated'           // Employee workload changed
'status-updated'             // Employee status changed
'project-assigned'           // Project assigned to employee
'project-removed'            // Project removed from employee
'performance-updated'        // Performance metrics updated
```

### WebSocket Integration
Real-time updates are broadcast to the dashboard frontend:

```typescript
// Employee status updates
{
  type: 'agents_update',
  data: {
    type: 'status_updated',
    employeeId: 'emp_004',
    status: 'busy'
  }
}

// Workload distribution changes
{
  type: 'agents_update',
  data: {
    type: 'workload_updated',
    employeeId: 'emp_004',
    workload: 75
  }
}
```

## Performance Monitoring

### Individual Performance Metrics
Each employee tracks:
- **Task Completion Rate**: Percentage of successfully completed tasks
- **Average Response Time**: Time to complete assigned tasks
- **Error Rate**: Percentage of tasks requiring rework
- **Skill Utilization**: How effectively skills are being used

### Department-Level Analytics
Department statistics include:
- **Average Workload**: Department-wide workload distribution
- **Skill Coverage**: Available skills vs. required skills
- **Productivity Metrics**: Task throughput and quality measures
- **Resource Utilization**: Efficiency of employee allocation

## Integration Points

### Task Queue Integration
The AgentRegistry integrates with the TaskQueue system to:
- **Automatic Assignment**: Tasks are automatically assigned to best-matched employees
- **Workload Tracking**: Task assignments update employee workload in real-time
- **Performance Updates**: Task completion updates performance metrics

### Process Manager Integration
Coordinates with the ProcessManager to:
- **Process Spawning**: Employees spawn Claude Code processes with specialized prompts
- **Resource Allocation**: Manages system resources across active processes
- **Context Switching**: Handles multiple concurrent tasks per employee

### Memory System Integration
Connects to the AI Memory System (port 3333) for:
- **Context Loading**: Loads relevant memories before task assignment
- **Experience Sharing**: Shares learnings across employees with similar skills
- **Performance Optimization**: Uses historical data to improve matching algorithms

## API Reference

### Employee Management
```typescript
// Get all employees
GET /employees

// Get employee by ID
GET /employees/:id

// Get employees by department
GET /employees/department/:department

// Get employees by skill
GET /employees/skill/:skill

// Get available employees
GET /employees/available

// Update employee workload
POST /employees/:id/workload
Body: { workload: number }

// Update employee status
POST /employees/:id/status
Body: { status: 'active' | 'inactive' | 'busy' | 'maintenance' }

// Assign project to employee
POST /employees/:id/assign-project
Body: { projectId: string }

// Find best employee for task
POST /employees/find-best-match
Body: { requiredSkills: string[], priority: 'low' | 'medium' | 'high' }
```

### Department Management
```typescript
// Get all departments
GET /departments

// Get department statistics
GET /departments/:department/stats

// Get department workload distribution
GET /departments/workload-stats
```

## Advanced Features

### Collaborative Workflows
The system supports complex multi-agent workflows:

1. **Task Decomposition**: Large tasks are broken into subtasks
2. **Parallel Execution**: Multiple employees work on different aspects
3. **Dependency Management**: Tasks with dependencies are properly sequenced
4. **Quality Gates**: QA employees review work before task completion

### Adaptive Learning
The coordination system learns from:
- **Task Outcomes**: Successful patterns are reinforced
- **Employee Performance**: Matching algorithms improve over time
- **Workload Patterns**: Optimal distribution strategies emerge
- **Skill Development**: Employee capabilities are tracked and updated

### Failure Recovery
Built-in resilience features:
- **Task Reassignment**: Failed tasks are automatically reassigned
- **Load Redistribution**: Overloaded employees have tasks redistributed
- **Skill Gap Detection**: Missing skills trigger training recommendations
- **Performance Degradation**: Declining performance triggers support interventions

## Configuration and Customization

### Employee Registry File
The system reads from `/ai-employees/employee-registry.json`:

```json
{
  "company": {
    "name": "Claude AI Software Company",
    "founded": "2024",
    "mission": "AI-powered software development",
    "employees_count": 13
  },
  "employees": {
    "emp_001": {
      "id": "emp_001",
      "name": "Alex Project Manager",
      "role": "Project Manager",
      "department": "Executive",
      "level": "Senior",
      "hire_date": "2024-01-15",
      "status": "active",
      "skills": ["project-management", "agile", "stakeholder-communication"],
      "system_prompt_file": "ai-employees/prompts/project-manager.md",
      "current_projects": [],
      "workload": 0,
      "performance_metrics": {
        "tasks_completed": 0,
        "average_completion_time": 0,
        "success_rate": 1.0
      }
    }
  },
  "departments": {
    "Executive": {
      "head": "emp_001",
      "employees": ["emp_001", "emp_002", "emp_003"],
      "focus": "Strategic planning and oversight"
    }
  }
}
```

### System Prompt Integration
Each employee has a specialized system prompt file:
- **Location**: `/ai-employees/prompts/[role].md`
- **Content**: Role-specific instructions and behavioral guidelines
- **Usage**: Loaded when spawning Claude Code processes

## Best Practices

### Task Assignment
1. **Skill Matching**: Always prioritize skill alignment over availability
2. **Workload Balance**: Avoid overloading individual employees
3. **Learning Opportunities**: Assign challenging tasks to junior employees with senior mentorship
4. **Cross-Training**: Occasionally assign tasks outside primary skill areas

### Performance Monitoring
1. **Regular Reviews**: Monitor employee performance metrics weekly
2. **Trend Analysis**: Look for patterns in task completion and quality
3. **Intervention Triggers**: Set thresholds for performance degradation
4. **Skill Development**: Track and promote skill growth over time

### System Optimization
1. **Resource Monitoring**: Track CPU, memory, and process usage
2. **Scaling Strategies**: Plan for increased task volumes
3. **Failure Handling**: Implement robust error recovery mechanisms
4. **Performance Tuning**: Regularly optimize matching algorithms

## Troubleshooting

### Common Issues

1. **Employee Registry Not Found**
   - Check file path: `/ai-employees/employee-registry.json`
   - Verify file permissions and JSON format

2. **Skill Matching Failures**
   - Ensure required skills match employee skill sets
   - Check for typos in skill names

3. **Workload Imbalance**
   - Monitor department workload statistics
   - Implement load redistribution strategies

4. **Performance Degradation**
   - Check system metrics for resource constraints
   - Review task complexity and completion times

### Monitoring and Alerts
- **Employee Utilization**: Alert when departments exceed 80% capacity
- **Task Failures**: Alert when task failure rate exceeds 5%
- **Response Time**: Alert when task assignment takes >1 second
- **System Health**: Monitor registry file changes and backup status

---

*Generated with Claude Code - Technical Writer Documentation*