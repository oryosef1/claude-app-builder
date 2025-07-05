# Test Rejection Scenario

This file contains an intentionally broken todo to test the workflow rejection handling.

## Test Task (Intentionally Broken)

- [ ] Create a function called `calculateSum` that takes two parameters and MUST throw an error on purpose

This task is designed to fail code review repeatedly to test the new rejection loops.

### Expected Behavior:
1. TEST WRITER writes tests for calculateSum function
2. TEST REVIEWER should approve valid tests
3. DEVELOPER implements calculateSum that throws error (as required)
4. CODE REVIEWER should REJECT the implementation (throwing errors is bad practice)
5. DEVELOPER (REVISION) should try to fix but task description still requires error throwing
6. CODE REVIEWER (RE-REVIEW) should REJECT again
7. After 3 attempts, workflow should STOP and NOT continue to Coordinator
8. Task should NOT be marked as complete

### Success Criteria for Rejection Loop Test:
- Workflow stops after max code review attempts
- No progression to Coordinator phase
- Task remains incomplete in todo.md
- code-feedback.md file remains showing rejection

This verifies the rejection handling fixes work correctly.