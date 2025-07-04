# Claude App Builder System

## Critical Instructions

1. **ALWAYS use the Todo system** - Track all tasks, mark them as in_progress when starting, and completed when done
2. **ALWAYS update memory.md** - Document all design decisions, technical choices, and implementation details
3. **FOLLOW PROJECT STRUCTURE** - Read @ARCHITECTURE.md and create projects in separate directories (dashboard/, api/, etc.), NEVER mix with system files in root
4. **Use TDD approach** - Write tests first, then implement features to pass the tests
5. **Reference system files** - Use @ARCHITECTURE.md, @memory.md, @todo.md, @workflow.md for context

## System Overview

An automated system that uses Claude Code CLI to build complete applications through TDD workflow. The system can create any type of application by:
- Breaking down requirements into tasks
- Writing comprehensive tests
- Implementing code to pass tests
- Reviewing and iterating until complete

## Required Reading

Before starting any task, ALWAYS read these files:
- **@ARCHITECTURE.md** - System architecture and design patterns
- **@memory.md** - Current project context and decisions
- **@todo.md** - Task requirements and priorities
- **@workflow.md** - Detailed workflow documentation

## Development Workflow Roles

### Test Writer
- **First Action**: Read @ARCHITECTURE.md, @memory.md, @todo.md
- **Responsibility**: Write unit, integration, and e2e tests
- **Constraint**: Tests must validate WORKING features, not expect failures
- **Output**: Test files with .test.ts/.test.tsx extension
- **Final Action**: Update @memory.md and @todo.md with progress

### Test Reviewer
- **First Action**: Read test files and @ARCHITECTURE.md
- **Responsibility**: Review tests for quality and coverage
- **Validation**: Run tests to verify they fail correctly
- **Output**: Approval or test-feedback.md with specific issues
- **Final Action**: Update @memory.md with review notes

### Developer
- **First Action**: Read approved tests and @ARCHITECTURE.md
- **Responsibility**: Implement COMPLETE, WORKING features to pass all tests
- **Constraint**: Create fully functional code that fulfills todo requirements
- **Output**: Implementation files following project structure
- **Final Action**: Update @memory.md with implementation details

### Code Reviewer
- **First Action**: Read implementation files and @ARCHITECTURE.md
- **Responsibility**: Review code quality and run all tests
- **Validation**: Ensure all tests pass and code follows standards
- **Output**: Approval or code-feedback.md with specific issues
- **Final Action**: Update @memory.md with review notes

### Coordinator
- **First Action**: Read @todo.md and @memory.md
- **Responsibility**: Manage workflow progress and documentation
- **Tasks**: Mark todos complete, add new discovered tasks
- **Output**: Updated @todo.md and @memory.md
- **Decision**: Determine next task or signal completion

## File Management

### Core System Files (ROOT LEVEL ONLY)
- **@ARCHITECTURE.md** - Read for system design and patterns
- **@CLAUDE.md** - This file - role instructions
- **@README.md** - User documentation
- **@workflow.md** - Detailed workflow processes

### Project Management Files (ROOT LEVEL ONLY)
- **@todo.md** - Task definitions and progress tracking
- **@memory.md** - System knowledge and decisions
- **test-feedback.md** - Test improvement feedback (temporary)
- **code-feedback.md** - Code improvement feedback (temporary)
- **workflow-complete.flag** - Completion signal (temporary)

### Generated Project Files (IN PROJECT DIRECTORIES)
**CRITICAL: Create projects in separate directories, NOT in root!**
- **dashboard/src/** - Dashboard application source code
- **dashboard/tests/** - Dashboard test files
- **dashboard/package.json** - Dashboard dependencies and scripts
- **dashboard/tsconfig.json** - Dashboard TypeScript configuration
- **api/src/** - API source code (if needed)
- **[project-name]/[files]** - Each project in its own directory

## Quality Standards

### Test Requirements
- **Unit Tests**: Test individual functions/methods
- **Integration Tests**: Test module interactions
- **E2E Tests**: Test complete user workflows
- **Coverage**: All functionality must be tested
- **Failure**: Tests must fail without implementation

### Code Requirements
- **Minimal**: Only implement what tests require
- **Clean**: Follow established patterns from @ARCHITECTURE.md
- **Typed**: Use TypeScript for type safety
- **Tested**: All tests must pass
- **Documented**: Update @memory.md with decisions

### Review Standards
- **Thorough**: Check all aspects of quality
- **Specific**: Provide actionable feedback
- **Constructive**: Focus on improvement
- **Standards**: Follow project conventions

## Model Configuration

The workflow uses Sonnet model by default. If you need a different model, it can be configured in the workflow script.

## Usage Instructions

1. **Define Requirements**: Update @todo.md with your app requirements
2. **Set Context**: Add technical decisions to @memory.md
3. **Run Workflow**: Execute `./automated-workflow.sh`
4. **Monitor Progress**: Check @memory.md for updates

## Error Handling

- **Feedback Files**: test-feedback.md and code-feedback.md signal needed improvements
- **Retry Logic**: Workflow automatically retries failed phases
- **Safety Limits**: Maximum 20 iterations to prevent infinite loops
- **Clean Exit**: Temporary files are cleaned up on completion

## Success Criteria

- All tests pass
- Code follows project standards
- Documentation is updated
- Todo items are marked complete
- No feedback files remain

ALWAYS update @memory.md and @todo.md after completing your assigned role!