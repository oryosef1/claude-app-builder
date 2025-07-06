# Claude AI Software Company - Project Structure

## 📁 Project Overview
This is the complete AI Software Company system with 13 specialized AI employees, corporate workflow automation, and comprehensive employee management infrastructure.

## 🏗️ Directory Structure

```
claude-ai-software-company/
├── 📋 Core System Files
│   ├── ARCHITECTURE.md          # System architecture documentation
│   ├── CLAUDE.md               # Claude role instructions
│   ├── README.md               # User documentation
│   ├── memory.md               # System knowledge and status
│   ├── todo.md                 # Task definitions and progress
│   └── PROJECT-STRUCTURE.md    # This file
│
├── 🤖 AI Employee Management
│   ├── ai-employees/
│   │   ├── employee-registry.json    # 13 AI employees database
│   │   ├── task-assignment.js        # Smart task assignment system
│   │   ├── performance-tracker.js    # Performance metrics tracking
│   │   ├── workflow-router.js        # 4 workflow types with routing
│   │   ├── status-monitor.js         # Real-time health monitoring
│   │   ├── workflow-definitions.json # Workflow templates
│   │   ├── performance-metrics.json  # Historical performance data
│   │   ├── alerts.json              # System alerts and notifications
│   │   └── status-log.json          # System status history
│   │
│   └── corporate-prompts/           # Corporate system prompts
│       ├── project-manager.md       # Executive team prompts
│       ├── technical-lead.md
│       ├── qa-director.md
│       ├── senior-developer.md      # Development team prompts
│       ├── junior-developer.md
│       ├── qa-engineer.md
│       ├── test-engineer.md
│       ├── devops-engineer.md       # Operations team prompts
│       ├── sre.md
│       ├── security-engineer.md
│       ├── technical-writer.md      # Support team prompts
│       ├── ui-ux-designer.md
│       └── build-engineer.md
│
├── 🔧 Corporate Workflow Engine
│   └── corporate-workflow.sh       # Main workflow automation script
│
├── 📚 Documentation
│   ├── docs/
│   │   ├── ai-company-plan.md      # Implementation roadmap
│   │   ├── ai-company-todo.md      # Detailed 65-task breakdown
│   │   └── archive/
│   │       ├── phase1-complete.md   # Phase 1 completion documentation
│   │       └── PROJECT-DOCS.md     # Legacy project documentation
│   │
│   └── templates/                  # Project templates
│       ├── node-api.json           # Node.js API template
│       └── react-dashboard.json    # React dashboard template
│
└── 🗂️ Legacy Archive
    └── archive/
        └── legacy-workflow/        # Original workflow system
            ├── automated-workflow.sh
            ├── functional-validation.sh
            └── workflow.md
```

## 🎯 Key System Components

### 1. Corporate Workflow Engine
- **Main Script**: `corporate-workflow.sh`
- **Purpose**: Orchestrates all AI employee activities
- **Features**: Multi-employee coordination, performance tracking, health monitoring

### 2. AI Employee Management
- **Registry**: 13 specialized AI employees across 4 departments
- **Assignment**: Smart task assignment based on skills and workload
- **Performance**: Comprehensive metrics tracking and analysis
- **Monitoring**: Real-time health and capacity monitoring

### 3. Corporate System Prompts
- **13 Specialized Prompts**: Each AI employee has corporate-grade behavior definition
- **Departments**: Executive, Development, Operations, Support
- **Professional Standards**: Enterprise-grade system prompts

### 4. Workflow Routing
- **4 Workflow Types**: software_development, ui_ux_project, infrastructure_project, quality_assurance
- **Phase Planning**: Multi-phase project planning with employee assignment
- **Optimization**: Duration estimation and capacity planning

## 🚀 Usage Commands

### Corporate Workflow Control
```bash
./corporate-workflow.sh run       # Execute corporate workflow
./corporate-workflow.sh status    # Show workflow monitoring
./corporate-workflow.sh employees # List all AI employees  
./corporate-workflow.sh health    # Show system health
```

### Employee Management
```bash
node ai-employees/task-assignment.js list                    # List all employees
node ai-employees/task-assignment.js assign <task> <skills>  # Assign task
node ai-employees/performance-tracker.js status             # Performance dashboard
node ai-employees/status-monitor.js health                  # System health check
```

## 📊 Current Status

### Phase 1: Foundation (COMPLETE ✅)
- **Progress**: 23/23 tasks complete (100%)
- **Status**: Production ready
- **System Health**: 80/100 (good)
- **Employee Availability**: 100% (13/13 active)

### Phase 2: Memory Revolution (NEXT)
- **Focus**: Vector database setup and AI memory management
- **Target**: Pinecone integration for persistent AI memory
- **Tasks**: 15 tasks across 3 steps

### Phase 3: Corporate Tools (PLANNED)
- **Focus**: Logging, monitoring, and role-specific tools
- **Target**: Advanced infrastructure and dashboards
- **Tasks**: 15 tasks across 3 steps

### Phase 4: Knowledge Management (PLANNED)
- **Focus**: RAG implementation and corporate knowledge base
- **Target**: AI learning and knowledge sharing
- **Tasks**: 15 tasks across 3 steps

## 🛠️ Technical Stack

- **Core**: Node.js, Bash scripting, JSON data storage
- **AI Integration**: Claude Code CLI with corporate prompts
- **Monitoring**: Real-time performance and health tracking
- **Future**: Vector databases (Pinecone), RAG implementation

## 📝 Next Steps

1. **Phase 2 Start**: Begin vector database setup (Task 4.1)
2. **Memory Integration**: Implement AI memory management
3. **Corporate Tools**: Build advanced monitoring and dashboards
4. **Knowledge Base**: Create RAG-powered corporate intelligence

---

**Last Updated**: 2025-07-06
**Status**: Clean, organized, and ready for Phase 2 development