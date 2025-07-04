# PoE Overlay TDD Workflow

## Workflow Overview
Automated TDD pipeline with multiple Claude instances, each with specific roles:

1. **Test Writer** → Writes unit, integration, and e2e tests
2. **Test Reviewer** → Reviews and validates test quality
3. **Developer** → Implements code to pass tests
4. **Code Reviewer** → Reviews code and runs tests
5. **Coordinator** → Updates memory/todo and manages workflow

## Roles and Responsibilities

### 1. Test Writer Claude
```
Role: Write comprehensive tests based on todo.md tasks
Input: @memory.md, @todo.md
Tasks:
- Read current todo item
- Write unit tests for individual functions
- Write integration tests for module interactions
- Write e2e tests for user workflows
- Update @memory.md with test decisions
- Update @todo.md marking test writing as complete
Output: Test files (*.test.ts)
```

### 2. Test Reviewer Claude
```
Role: Validate test quality and coverage
Input: Test files, @memory.md
Tasks:
- Review test logic and coverage
- Check for edge cases
- Verify tests actually fail without implementation
- Run tests to ensure they fail correctly
- If issues found: Return to Test Writer with feedback
- If approved: Update @memory.md and pass to Developer
Output: Approved tests or feedback
```

### 3. Developer Claude
```
Role: Implement code to make tests pass
Input: Approved tests, @memory.md, @todo.md
Tasks:
- Read failing tests
- Implement minimal code to pass tests
- Follow architecture from @memory.md
- Update @memory.md with implementation details
- Do NOT add extra features beyond test requirements
Output: Implementation files
```

### 4. Code Reviewer Claude
```
Role: Review code quality and test results
Input: Implementation files, test files, @memory.md
Tasks:
- Review code for quality and standards
- Run all tests (unit, integration, e2e)
- Verify all tests pass
- Check code follows project architecture
- If issues: Return to Developer with feedback
- If approved: Update @memory.md with review notes
Output: Approved code or feedback
```

### 5. Coordinator Claude
```
Role: Manage workflow and documentation
Input: All outputs, @memory.md, @todo.md
Tasks:
- Verify task completion
- Update @todo.md (mark items complete, add new discovered tasks)
- Update @memory.md with summary of changes
- Determine next todo item
- If todo not empty: Restart workflow with next item
- If todo empty: Generate project summary
Output: Updated documentation, next action
```

## Test Types

### Unit Tests
- Test individual functions/methods
- Mock all dependencies
- Focus on single responsibility
- Example: `priceChecker.parseItem()` returns correct item data

### Integration Tests
- Test module interactions
- Use real dependencies where possible
- Example: Price checker module correctly calls PoE API

### E2E Tests
- Test complete user workflows
- Simulate real user interactions
- Example: User presses Ctrl+D → overlay shows → price displayed

## Workflow Execution

```bash
# Pseudocode for workflow automation
while (todo_has_incomplete_items):
    task = get_next_todo_item()
    
    # Phase 1: Test Writing
    tests = test_writer_claude(task, memory, todo)
    while not test_reviewer_claude.approve(tests):
        feedback = test_reviewer_claude.get_feedback()
        tests = test_writer_claude.revise(tests, feedback)
    
    # Phase 2: Implementation
    code = developer_claude(tests, memory, todo)
    while not code_reviewer_claude.approve(code, tests):
        feedback = code_reviewer_claude.get_feedback()
        code = developer_claude.revise(code, feedback)
    
    # Phase 3: Coordination
    coordinator_claude.update_documentation(task, tests, code)
    coordinator_claude.mark_task_complete(task)
```

## File Structure
```
poe-overlay/
├── src/
│   ├── modules/
│   │   ├── priceChecker/
│   │   │   ├── priceChecker.ts
│   │   │   ├── priceChecker.unit.test.ts
│   │   │   ├── priceChecker.integration.test.ts
│   │   │   └── priceChecker.e2e.test.ts
│   │   └── overlay/
│   │       ├── overlay.ts
│   │       └── tests/
│   └── main.ts
├── tests/
│   └── e2e/
├── todo.md
├── memory.md
├── CLAUDE.md
└── workflow.md
```

## Implementation Commands

Each Claude instance should be run with specific prompts:

### Test Writer
```
You are a Test Writer for the PoE Overlay project. Read @memory.md and @todo.md. 
Write comprehensive unit, integration, and e2e tests for the current task.
Follow TDD principles - tests should fail without implementation.
Update documentation when complete.
```

### Test Reviewer
```
You are a Test Reviewer. Review the provided tests for completeness, edge cases, 
and proper failure behavior. Run tests to verify they fail correctly.
Provide specific feedback if improvements needed.
```

### Developer
```
You are a Developer implementing code to pass tests. Write minimal code to make 
all tests pass. Do not add features beyond test requirements.
Follow architecture guidelines from @memory.md.
```

### Code Reviewer
```
You are a Code Reviewer. Review implementation for quality, run all tests,
verify they pass. Ensure code follows project standards.
Provide specific feedback if improvements needed.
```

### Coordinator
```
You are the Workflow Coordinator. Update @todo.md and @memory.md based on 
completed work. Determine next task or declare project complete.
Summarize progress and learnings.
```