# Claude App Builder Memory

## System Purpose
An automated application builder that uses Claude Code CLI to create any type of software through Test-Driven Development (TDD). The system runs Claude in different roles to ensure high-quality code output.

## Core Principles
- **TDD First**: Always write tests before implementation
- **Modular Roles**: Each Claude instance has a specific responsibility
- **Automated Workflow**: Minimal human intervention required
- **Quality Gates**: Multiple review stages ensure code quality

## Technical Architecture
- **Orchestration**: Bash script runs Claude CLI with different prompts
- **Communication**: Roles communicate through files (memory.md, todo.md, feedback files)
- **Feedback Loops**: Automatic re-runs when reviews fail
- **Safety**: Maximum iteration limit prevents infinite loops

## Workflow Process
1. User defines app requirements in todo.md
2. System runs through 5 roles automatically:
   - Test Writer → Test Reviewer → Developer → Code Reviewer → Coordinator
3. Each role updates documentation
4. Process repeats until all todos complete

## File Structure
```
claude-app-builder/
├── Core System Files
│   ├── automated-workflow.sh    # Main orchestration script
│   ├── CLAUDE.md               # System instructions
│   ├── ARCHITECTURE.md         # System architecture documentation
│   └── README.md               # User documentation
├── Project Management
│   ├── todo.md                 # Task definitions
│   ├── memory.md               # This file - system memory
│   └── workflow.md             # Detailed workflow documentation
└── [Generated Project Files]   # Created by workflow
```

## Current Status
- Core workflow system implemented
- Ready to build any type of application
- Supports feedback loops and quality checks

## Current Project: Dashboard
Building a web dashboard to control the Claude App Builder system:
- Visual interface for workflow management
- Real-time status monitoring
- Todo and memory file editing
- Project template selection
- Workflow logs and metrics

## Workflow Testing
The automated workflow successfully runs Claude Code CLI in different roles. Fixed issues:
- Tests now validate working features instead of expecting failures
- Developer creates complete implementations, not minimal stubs
- Test Reviewer checks for logical correctness in tests
- Output duplication reduced

## Workflow Improvements Applied
- Fixed test strategy: Tests now validate working features
- Fixed developer role: Creates complete implementations
- Fixed output duplication issues
- Enhanced test reviewer logic checking
- **ENFORCED PROJECT STRUCTURE**: Projects must be created in separate directories (dashboard/, api/, etc.), NEVER mixed with system files in root
- Updated all role prompts to reference @ARCHITECTURE.md for proper structure

## Advanced Features Added
- **Git Integration**: Auto-initialization, commits after each phase, checkpoints, and release tags
- **Dependency Management**: Auto npm install when package.json is created/updated
- **Build Verification**: Automatic build testing to ensure code compiles
- **Error Recovery**: Retry logic (2 attempts) and rollback on failures
- **Project Templates**: React dashboard and Node.js API templates with predefined structures
- **Template Detection**: Auto-suggests templates based on todo content
- **Final Verification**: Complete build and test verification before completion