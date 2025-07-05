# Claude App Builder - System Memory

## System Overview
Claude App Builder is an automated TDD workflow system that uses Claude Code CLI to build applications. It orchestrates 5 different Claude roles to create high-quality software through test-driven development.

## Core Architecture

### 5 Claude Roles
1. **Test Writer** - Creates comprehensive test suites
2. **Test Reviewer** - Reviews and validates test quality  
3. **Developer** - Implements code to pass tests
4. **Code Reviewer** - Reviews code quality and runs tests
5. **Coordinator** - Manages workflow and documentation

### Key Files
- `automated-workflow.sh` - Main orchestration script
- `CLAUDE.md` - Role instructions and system behavior
- `ARCHITECTURE.md` - Detailed system design
- `todo.md` - Task definitions and progress
- `memory.md` - This file - system knowledge
- `workflow.md` - Detailed workflow processes

### Communication System
- File-based communication between roles
- Feedback loops using temporary files (test-feedback.md, code-feedback.md)
- Quality gates between phases
- Auto-commit and checkpoint system

## Design Principles

### Test-Driven Development
- Tests written first, then implementation
- All tests must pass before proceeding
- Comprehensive coverage (unit, integration, e2e)

### Project Structure
- System files stay in root directory
- Generated projects go in separate directories (dashboard/, api/, etc.)
- Clean separation between system and project code

### Quality Assurance
- Multiple review stages
- Feedback loops for improvement
- Retry logic and error handling
- Safety limits to prevent infinite loops

## Current Status
-  Core system is clean and ready
-  All generated project files removed
-  System files preserved and organized
- <� Ready for new development projects

## Usage
1. Add requirements to todo.md
2. Run `./automated-workflow.sh`
3. Monitor progress in this file
4. Review generated code in project directories

## GitHub Integration

### Connection Setup
- ✅ **Remote configured** - Connected to `oryosef1/claude-app-builder` 
- ✅ **Authentication working** - Personal access token with `workflow` scope
- ✅ **Push functionality tested** - Successfully pushed cleanup commit `5347e9c`
- ✅ **Automated workflow integration** - Script uses PowerShell for git operations

### How It Works
- **WSL2 Workaround** - Uses `powershell.exe` for git commands due to library issues
- **Auto-commits** - Workflow automatically commits after each successful phase
- **Push integration** - Can push to GitHub at completion or manually
- **Token management** - Uses GitHub personal access token for authentication

System is ready for development with full GitHub integration!