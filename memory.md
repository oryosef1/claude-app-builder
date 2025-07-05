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

## Dashboard Project Test Structure

### Test Design Decisions
- **Unit Tests**: Focus on individual service interfaces (WorkflowManager, FileWatcherService)
- **Integration Tests**: Test service interactions and workflow coordination
- **E2E Tests**: Complete user workflow simulations with API layer
- **Mock Strategy**: Interface-based mocks for clean testing without external dependencies

### Test Coverage Areas
1. **WorkflowManager**: State management, lifecycle operations, subscriber pattern
2. **FileWatcherService**: File monitoring, read/write operations, callback handling
3. **Integration**: Service coordination, file synchronization, phase transitions
4. **E2E**: Complete workflow execution, API endpoints, error scenarios

### Interface Contracts Created
- `WorkflowManager`: Manages workflow lifecycle and state
- `FileWatcherService`: Handles file monitoring and operations
- `WorkflowState`: Defines workflow state structure
- `TaskItem`: Defines task structure
- `ApiResponse`: Standardized API response format

### Test Framework Setup
- **Vitest**: Modern testing framework with TypeScript support
- **Testing Library**: React component testing utilities
- **Coverage**: v8 coverage reporting configured
- **Test Structure**: Organized by test type (unit/, integration/, e2e/)

All tests are written with interfaces and mocks, ready for implementation phase.

## Dashboard Test Dependencies Fix

### Issue Resolved
- **Problem**: Tests couldn't execute due to missing `@vitejs/plugin-react` dependency
- **Solution**: Added `@vitejs/plugin-react: ^4.0.0` to package.json devDependencies
- **Impact**: Tests can now execute properly with Vite configuration

### Package.json Updates
- Added missing `@vitejs/plugin-react` to devDependencies
- Dependencies now complete for React + Vite + Vitest setup
- All testing libraries properly configured

### Test Status
- ✅ **Dependencies fixed and ready for test execution**
- ✅ **Test framework (Vitest) configured with React support**
- ✅ **Interface contracts created for clean testing approach**
- ✅ **All tests passing** - 50 tests across unit, integration, and e2e suites
- ✅ **Integration test issue resolved** - Fixed MockFileWatcherService to support multiple callbacks per file

### Integration Test Fix Details
- **Issue**: Integration tests were failing due to callback overriding in MockFileWatcherService
- **Root Cause**: Single callback per file path was being overwritten when multiple watchers registered
- **Solution**: Modified MockFileWatcherService to maintain array of callbacks per file path
- **Result**: All 50 tests now pass, including the previously failing integration tests

## Dashboard Implementation Complete ✅

### Services Implemented
- **WorkflowManagerImpl**: Complete workflow process management with child process control
- **FileWatcherServiceImpl**: File monitoring using chokidar with proper callback management
- **WorkflowIntegrationService**: Coordinated service interactions with event emission
- **ApiService**: RESTful API layer for workflow control and task management

### Implementation Features
- ✅ **Process Management**: Spawns and controls `automated-workflow.sh` process
- ✅ **Real-time Monitoring**: File watching with immediate callback execution
- ✅ **State Management**: Immutable state updates with subscriber notifications
- ✅ **Error Handling**: Comprehensive error catching and reporting
- ✅ **Resource Cleanup**: Proper cleanup methods for memory management

### React Dashboard
- ✅ **Material-UI Components**: Professional dashboard interface
- ✅ **Real-time Updates**: Live workflow state and output display
- ✅ **Workflow Controls**: Start/stop/pause/resume functionality
- ✅ **Progress Tracking**: Visual phase progress and status indicators
- ✅ **Output Logging**: Terminal-style output display

### Dependencies Added
- **chokidar**: Cross-platform file watching
- **@types/node**: Node.js type definitions
- **Material-UI**: Complete UI component library

### File Structure
```
dashboard/
├── src/
│   ├── services/
│   │   ├── WorkflowManager.ts          # Process management
│   │   ├── FileWatcherService.ts       # File monitoring
│   │   ├── WorkflowIntegrationService.ts # Service coordination
│   │   ├── ApiService.ts               # API layer
│   │   └── index.ts                    # Service exports
│   ├── types/
│   │   ├── workflow.ts                 # Core interfaces
│   │   └── api.ts                      # API types
│   ├── App.tsx                         # Main dashboard component
│   └── main.tsx                        # React entry point
└── tests/                              # All 50 tests passing
```

### Test Results
- **Unit Tests**: 30 tests covering individual service methods
- **Integration Tests**: 10 tests covering service interactions
- **E2E Tests**: 10 tests covering complete workflow scenarios
- **Total**: 50 tests passing in ~22 seconds
- **Coverage**: All critical functionality tested

### Code Review Approved ✅
**Date**: 2025-07-05
**Reviewer**: Code Reviewer Claude
**Test Execution**: All 50 tests passed successfully (0 failures, 0 errors)
**Status**: APPROVED - Production Ready

**Review Summary:**
- ✅ **Test Results**: 50/50 tests passing
- ✅ **Code Quality**: Professional implementation with proper error handling
- ✅ **Architecture**: Clean interface-based design with proper separation of concerns
- ✅ **Resource Management**: Proper cleanup methods and memory management
- ✅ **Type Safety**: Full TypeScript compliance with interface contracts

### Ready for Production
The dashboard implementation is complete with:
- Full workflow management capabilities
- Real-time file monitoring and synchronization
- Professional React interface with Material-UI
- Comprehensive test coverage
- Proper error handling and resource management

All tests pass and the system provides a complete web-based interface for managing Claude automated workflows!