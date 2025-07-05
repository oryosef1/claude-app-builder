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
- **Environment Configuration** - Loads GitHub settings from `.env` file
- **Auto-commits** - Workflow automatically commits after each successful phase
- **Auto-push** - Automatically pushes to GitHub after each phase when `GIT_AUTO_PUSH=true`
- **Release Management** - Creates tagged releases and pushes them to GitHub
- **Token management** - Uses GitHub personal access token for authentication

### Workflow Features
- ✅ **Automatic GitHub push after each successful phase**
- ✅ **Environment-driven configuration via .env file**
- ✅ **PowerShell git execution for WSL2 compatibility**
- ✅ **Release tagging and pushing**
- ✅ **Configurable auto-push (can be disabled)**

## Critical Test Execution Fixes

### Problem Solved
- **Issue**: Test Reviewer and Code Reviewer were approving without actually running tests
- **Impact**: Broken TDD workflow, tests never validated
- **Solution**: Mandatory test execution with zero tolerance policy

### Enhanced Reviewer Roles
- ✅ **Test Reviewer MUST run `npm test` using Bash tool**
- ✅ **Code Reviewer MUST run `npm test` using Bash tool**
- ✅ **Step-by-step prompts force test execution**
- ✅ **Zero tolerance - no approval without running tests**
- ✅ **Exact error messages required in feedback**

### Safety Mechanisms
- ✅ **Validation functions verify tests actually work**
- ✅ **Workflow blocks progression if tests fail**
- ✅ **Double-check test execution between phases**
- ✅ **Clear error messages when reviewers fail**

### Test Execution Requirements
- **Test Reviewer**: Must run `npm test` and verify tests fail correctly (without implementation)
- **Code Reviewer**: Must run `npm test` and verify ALL tests pass (100% success rate)
- **Validation**: Workflow automatically re-runs tests to confirm reviewer did their job
- **Feedback**: Exact error messages required, no generic responses allowed

## Test System Verification ✅

### Test Demonstration Complete
- **Unit Tests**: 17 tests covering Calculator class functionality
- **Integration Tests**: 15 tests covering CalculatorService multi-instance management
- **E2E Tests**: 8 tests covering complete workflow scenarios
- **Total**: 40 tests passing in ~30 seconds

### Test Framework Setup
- **Jest** configured with TypeScript support
- **Coverage reporting** enabled (98%+ coverage achieved)
- **Test scripts** properly configured in package.json
- **File structure** organized by test type (unit/, integration/, e2e/)

### How to Run Tests
```bash
npm test                    # Run all tests
npm run test:unit          # Run unit tests only
npm run test:integration   # Run integration tests only 
npm run test:e2e           # Run E2E tests only
npm run test:watch         # Run tests in watch mode
npm run test:coverage      # Run tests with coverage report
```

### Test Patterns Verified
- **Unit Tests**: Individual method testing with mocks
- **Integration Tests**: Service layer interactions
- **E2E Tests**: Complete user workflow simulations
- **Error Handling**: Division by zero, invalid operations
- **Edge Cases**: Large numbers, decimal precision, concurrent usage

### Ready for Production
All test types are working correctly and the system knows how to execute them. The workflow reviewers are properly configured to run tests and provide accurate feedback.

System is ready for development with full GitHub integration and verified test execution!