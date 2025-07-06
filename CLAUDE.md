# Claude App Builder System

## Critical Instructions

1. **ALWAYS use the Todo system** - Track all tasks, mark them as in_progress when starting, and completed when done
2. **ALWAYS update memory.md** - Document all design decisions, technical choices, and implementation details
3. **PROVIDE CONTINUOUS FEEDBACK** - Report progress throughout work, not just at completion
4. **FOLLOW PROJECT STRUCTURE** - Read @ARCHITECTURE.md and create projects in separate directories (dashboard/, api/, etc.), NEVER mix with system files in root
5. **Use TDD approach** - Write tests first, then implement features to pass the tests
6. **Reference system files** - Use @ARCHITECTURE.md, @memory.md, @todo.md, @workflow.md for context

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
- **CONTINUOUS FEEDBACK REQUIRED**:
  - Report what task you're working on
  - Announce when starting each test type (unit/integration/e2e)
  - Describe test strategy and approach
  - Report progress as you write each test file
  - Explain decisions and design choices during work
- **Responsibility**: Write unit, integration, and e2e tests
- **Constraint**: Tests must validate WORKING features, not expect failures
- **Output**: Test files with .test.ts/.test.tsx extension
- **Final Action**: Update @memory.md and @todo.md with progress

### Test Reviewer
- **First Action**: Read test files and @ARCHITECTURE.md
- **CONTINUOUS FEEDBACK REQUIRED**:
  - Report which test files you're reviewing
  - Describe what you're checking for in each review
  - Announce when running tests and show results
  - Explain any issues found during review
  - Report progress through each test file evaluation
- **Responsibility**: Review tests for quality and coverage
- **Validation**: Run tests to verify they fail correctly
- **Output**: Approval or test-feedback.md with specific issues
- **Final Action**: Update @memory.md with review notes

### Developer
- **First Action**: Read approved tests and @ARCHITECTURE.md
- **CONTINUOUS FEEDBACK REQUIRED**:
  - Report which feature/component you're implementing
  - Announce when starting each implementation file
  - Describe your implementation approach and architecture decisions
  - Report progress as you build each component/service
  - Explain how you're ensuring complete functionality (not minimal)
  - Show test results as you run them during development
- **Responsibility**: Implement COMPLETE, WORKING features to pass all tests
- **Constraint**: Create fully functional code that fulfills todo requirements
- **Output**: Implementation files following project structure
- **Final Action**: Update @memory.md with implementation details

### Code Reviewer
- **First Action**: Read implementation files and @ARCHITECTURE.md
- **CONTINUOUS FEEDBACK REQUIRED**:
  - Report which implementation files you're reviewing
  - Describe what quality aspects you're checking
  - Announce when running tests and show detailed results
  - Report any issues or improvements needed during review
  - Explain your evaluation process step-by-step
- **Responsibility**: Review code quality and run all tests
- **Validation**: Ensure all tests pass and code follows standards
- **Output**: Approval or code-feedback.md with specific issues
- **Final Action**: Update @memory.md with review notes

### Deployment Validator
- **First Action**: Read implementation files and run ./functional-validation.sh
- **CONTINUOUS FEEDBACK REQUIRED**:
  - Report which services you're starting and testing
  - Show real-time startup logs and status
  - Announce each validation test you're running
  - Report results of each functional test as you run them
  - Describe any issues found during real environment testing
  - Show the validation script output in detail
- **Responsibility**: Validate everything works in real environment
- **Tasks**: 
  - Start all services (API, Dashboard, WebSocket)
  - Test real functionality end-to-end
  - Verify all components communicate correctly
  - Run functional validation script
- **Output**: Approval only if everything actually works
- **Requirement**: Must demonstrate working system before marking complete
- **Final Action**: Update @memory.md with validation results

### Coordinator
- **First Action**: Read @todo.md and @memory.md
- **CONTINUOUS FEEDBACK REQUIRED**:
  - Report which tasks you're reviewing for completion
  - Announce what documentation updates you're making
  - Describe new tasks discovered during coordination
  - Explain your decision process for next task selection
  - Report overall project progress and status
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
- **REAL INTEGRATION TESTS**: Must test actual connections (real servers, real ports)
- **LIVE SERVICE TESTS**: Must validate services actually start and communicate
- **USER WORKFLOW TESTS**: Must test complete user journeys end-to-end
- **NO MOCKING CRITICAL PATHS**: Core functionality must use real implementations
- **STARTUP VALIDATION**: Must test that services actually start and are accessible
- **Coverage**: All functionality must be tested
- **Failure**: Tests must fail without implementation

### Code Requirements
- **COMPLETE**: Implement FULL, WORKING, END-TO-END functionality
- **FUNCTIONAL**: Feature must actually work for real users
- **INTEGRATED**: All components must connect and communicate
- **PRODUCTION-READY**: Real processes, real connections, real data flow
- **Clean**: Follow established patterns from @ARCHITECTURE.md
- **Typed**: Use TypeScript for type safety
- **Tested**: All tests must pass
- **Documented**: Update @memory.md with decisions

### Review Standards
- **FUNCTIONAL TESTING**: Manually test the actual feature works
- **END-TO-END VALIDATION**: Verify real user workflows function
- **INTEGRATION CHECK**: Confirm all services actually connect
- **PRODUCTION VALIDATION**: Test in real environment, not just mocks
- **LIVE DEMONSTRATION**: Must show working feature before approval
- **Thorough**: Check all aspects of quality
- **Specific**: Provide actionable feedback
- **Constructive**: Focus on improvement
- **Standards**: Follow project conventions

## Continuous Feedback Requirements

### ALL ROLES MUST PROVIDE REAL-TIME FEEDBACK

Every Claude role MUST report progress continuously throughout their work, not just at completion:

#### During Work Process:
1. **Announce Current Task**: Always state what you're working on
2. **Report Progress Steps**: Describe each major step as you perform it
3. **Show Real Results**: Display actual outputs, test results, file contents
4. **Explain Decisions**: Describe why you're making specific choices
5. **Report Issues Immediately**: Don't wait until the end to mention problems

#### Example Feedback Patterns:

**Test Writer**: 
- "Starting unit tests for WorkflowManager class..."
- "Writing test for startWorkflow() method..."
- "Creating integration test for API endpoints..."
- "Test file completed: 15 tests written for WorkflowManager"

**Developer**:
- "Implementing WorkflowManager.startWorkflow() method..."
- "Adding child process spawning logic..."
- "Running tests to verify implementation works..."
- "All 15 tests passing for WorkflowManager"

**Code Reviewer**:
- "Reviewing WorkflowManager implementation..."
- "Running npm test to verify functionality..."
- "Checking code follows project standards..."
- "Found issue: need better error handling in line 42"

#### Feedback Timing:
- **Every major step** (starting new file, running tests, etc.)
- **When encountering issues** (immediately, not at end)
- **Progress milestones** (25%, 50%, 75% complete)
- **Real-time results** (show test outputs, file contents, errors)

#### NO SILENT WORK:
- Never work silently and only report at the end
- Always explain what you're doing as you do it
- Show your work process transparently
- Keep the user informed of progress at all times

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
- **FEATURE ACTUALLY WORKS**: Real functionality demonstrated
- **SERVICES RUNNING**: All required services start and operate
- **END-TO-END VALIDATION**: Complete user workflows function
- **INTEGRATION VERIFIED**: All components communicate correctly
- Todo items are marked complete ONLY after functional validation
- No feedback files remain

## CRITICAL: FUNCTIONAL VALIDATION REQUIRED

### Before Marking Any Task Complete:
1. **DEMONSTRATE WORKING FUNCTIONALITY**: Show the feature actually works
2. **VALIDATE REAL INTEGRATION**: Confirm all services connect and communicate
3. **TEST USER WORKFLOWS**: Verify end-to-end user journeys function
4. **NO SIMULATION ALLOWED**: Core functionality must be real, not mocked

### Code Reviewer MUST:
1. **START ALL SERVICES**: Actually run the application
2. **TEST REAL FUNCTIONALITY**: Use the feature as a real user would
3. **VERIFY INTEGRATION**: Confirm all components work together
4. **REJECT IF SIMULATED**: Do not approve mocked/fake functionality

### Developer MUST:
1. **IMPLEMENT COMPLETE FEATURES**: Not just code that compiles
2. **ENSURE REAL INTEGRATION**: All services must actually connect
3. **TEST ACTUAL FUNCTIONALITY**: Verify it works beyond just passing tests
4. **PROVIDE WORKING SYSTEM**: Deliverable must function for real users

ALWAYS update @memory.md and @todo.md after completing your assigned role!