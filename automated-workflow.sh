#!/bin/bash

# Automated TDD Workflow for Claude App Builder using Claude Code CLI

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Processing mode configuration
# Usage: 
#   PROCESSING_MODE=sequential ./automated-workflow.sh    # Process tasks one by one (DEFAULT)
#   PROCESSING_MODE=batch ./automated-workflow.sh         # Process related tasks together
#   MAX_TASKS_PER_BATCH=5 ./automated-workflow.sh         # Limit batch size
#   VERBOSE=true ./automated-workflow.sh                  # Enable detailed logging
#   WORKFLOW_STATE_FILE=.workflow-state ./automated-workflow.sh  # Custom state file
PROCESSING_MODE=${PROCESSING_MODE:-"sequential"}  # Options: "batch" or "sequential"
MAX_TASKS_PER_BATCH=${MAX_TASKS_PER_BATCH:-10}  # Maximum tasks to process in batch mode
VERBOSE=${VERBOSE:-false}  # Enable verbose logging
WORKFLOW_STATE_FILE=${WORKFLOW_STATE_FILE:-".workflow-state.json"}  # Workflow state file

# Verbose logging function
log_verbose() {
    if [ "$VERBOSE" = "true" ]; then
        echo -e "${BLUE}[VERBOSE]${NC} $1"
    fi
}

# Enhanced error handling with context
handle_error() {
    local error_code=$1
    local context="$2"
    local phase="$3"
    local iteration="$4"
    
    echo -e "${RED}ERROR: $context${NC}"
    echo -e "${RED}Phase: $phase | Iteration: $iteration | Exit Code: $error_code${NC}"
    echo -e "${YELLOW}Suggestion: Check logs above for specific error details${NC}"
    
    # Save error state
    save_workflow_state "error" "$phase" "$iteration" "$context"
    
    return $error_code
}

# Save workflow state
save_workflow_state() {
    local status="$1"
    local current_phase="$2"
    local iteration="$3"
    local context="$4"
    
    cat > "$WORKFLOW_STATE_FILE" << EOF
{
    "status": "$status",
    "current_phase": "$current_phase",
    "iteration": $iteration,
    "timestamp": "$(date -Iseconds)",
    "processing_mode": "$PROCESSING_MODE",
    "context": "$context",
    "incomplete_tasks": $(count_incomplete_tasks)
}
EOF
    
    log_verbose "Workflow state saved to $WORKFLOW_STATE_FILE"
}

# Load workflow state
load_workflow_state() {
    if [ -f "$WORKFLOW_STATE_FILE" ]; then
        log_verbose "Loading workflow state from $WORKFLOW_STATE_FILE"
        echo -e "${BLUE}📁 Previous workflow state found${NC}"
        if [ "$VERBOSE" = "true" ]; then
            cat "$WORKFLOW_STATE_FILE"
        fi
    fi
}

# Show progress indicator during long operations
show_progress() {
    local pid=$1
    local message="$2"
    local chars="⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏"
    local delay=0.1
    
    while kill -0 $pid 2>/dev/null; do
        for (( i=0; i<${#chars}; i++ )); do
            if ! kill -0 $pid 2>/dev/null; then break; fi
            printf "\r${BLUE}${chars:$i:1} $message${NC}"
            sleep $delay
        done
    done
    printf "\r${GREEN}✓ $message - Complete${NC}\n"
}

# Show file counts after phase completion
show_file_counts() {
    local role="$1"
    
    case "$role" in
        "TEST WRITER"*)
            local test_files=$(find . -name "*.test.ts" -o -name "*.test.tsx" 2>/dev/null | wc -l)
            echo -e "${BLUE}📊 Tests created: $test_files files${NC}"
            ;;
        "DEVELOPER"*)
            local src_files=$(find . -path "./dashboard/src" -o -path "./api/src" -type f \( -name "*.ts" -o -name "*.tsx" \) 2>/dev/null | wc -l)
            local component_files=$(find . -path "*/components/*" -name "*.tsx" 2>/dev/null | wc -l)
            echo -e "${BLUE}📊 Source files: $src_files | Components: $component_files${NC}"
            ;;
        "CODE REVIEWER"*)
            echo -e "${BLUE}📊 Running final file count...${NC}"
            ;;
    esac
}

# Function to run Claude with a specific role
run_claude() {
    local role="$1"
    local prompt="$2"
    local system_prompt="$3"
    
    echo -e "${BLUE}=== Running Claude as: $role ===${NC}"
    log_verbose "Starting $role phase with system prompt length: ${#system_prompt} characters"
    log_verbose "Prompt preview: ${prompt:0:100}..."
    
    # Show what we're working on
    case "$role" in
        "TEST WRITER"*)
            echo -e "${YELLOW}📝 Writing comprehensive tests...${NC}"
            log_verbose "Test Writer: Analyzing existing codebase and creating test specifications"
            ;;
        "TEST REVIEWER"*)
            echo -e "${YELLOW}🔍 Reviewing tests and running validation...${NC}"
            log_verbose "Test Reviewer: Executing npm test and validating test quality"
            ;;
        "DEVELOPER"*)
            echo -e "${YELLOW}⚙️  Implementing features to pass tests...${NC}"
            log_verbose "Developer: Creating implementation to match test expectations exactly"
            ;;
        "CODE REVIEWER"*)
            echo -e "${YELLOW}🧪 Running all tests and reviewing code quality...${NC}"
            log_verbose "Code Reviewer: Running full test suite and quality validation"
            ;;
        "COORDINATOR"*)
            echo -e "${YELLOW}📊 Updating documentation and coordinating next steps...${NC}"
            log_verbose "Coordinator: Updating todo.md and memory.md with progress"
            ;;
    esac
    
    # Record start time
    local start_time=$(date +%s)
    
    # Create a combined prompt with system instructions
    local full_prompt="SYSTEM: $system_prompt

USER: $prompt"
    
    # Run Claude with all permissions allowed
    printf "%s\n" "$full_prompt" | claude --print \
        --dangerously-skip-permissions \
        --allowedTools "Bash,Edit,Write,Read,Grep,Glob,LS,MultiEdit,NotebookEdit,NotebookRead,WebFetch,WebSearch,TodoRead,TodoWrite,Task" \
        --model "sonnet" 2>/dev/null
    
    local exit_code=$?
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ $role phase completed successfully${NC} ${BLUE}(${duration}s)${NC}"
        
        # Show file counts after completion
        show_file_counts "$role"
    else
        echo -e "${RED}✗ $role phase failed with exit code: $exit_code${NC} ${BLUE}(${duration}s)${NC}"
        return $exit_code
    fi
    
    # Small delay between phases
    sleep 2
}

# System prompts for each role
TEST_WRITER_SYSTEM="You are a Test Writer for the Claude App Builder project. 

BEFORE WRITING ANY TESTS:
1. READ existing codebase in target project directory (dashboard/, api/, etc.)
2. EXAMINE existing package.json for available dependencies
3. REVIEW existing service interfaces and constructor signatures
4. VERIFY what services, classes, and functions actually exist
5. CHECK existing file structure and imports

WRITE TESTS THAT:
- Validate WORKING features for EXISTING code interfaces
- Use ONLY dependencies that exist in package.json
- Match ACTUAL constructor signatures from implementation
- Import from REAL file paths that exist
- Test ACTUAL service methods, not imagined ones

CRITICAL REQUIREMENTS:
- Follow @ARCHITECTURE.md project structure - create projects in separate directories
- Tests must be executable with current dependencies
- No tests for non-existent services or interfaces
- Create interface contracts in separate files for Developer to follow
- Always read @ARCHITECTURE.md, @memory.md and @todo.md first
- Update both files when done with specific interface definitions"

TEST_REVIEWER_SYSTEM="You are a Test Reviewer for the Claude App Builder project.

MANDATORY VALIDATION STEPS:
1. EXECUTE 'npm test' to verify ALL tests run successfully
2. If tests fail to execute, IMMEDIATELY REJECT with specific error details
3. Check that all imports resolve to existing files
4. Verify all dependencies exist in package.json
5. Confirm test syntax is valid TypeScript/JavaScript

ONLY APPROVE IF:
- ALL tests execute without errors
- All imports and dependencies are valid
- Tests check actual functionality, not failures
- Test logic is achievable with current implementation

IF TESTS FAIL:
- Create test-feedback.md with EXACT error messages
- Specify which imports/dependencies are missing
- List which service interfaces need to be created
- Demand fixes before re-review

ZERO TOLERANCE for non-executable tests. Be thorough but constructive in feedback."

DEVELOPER_SYSTEM="You are a Developer for the Claude App Builder project.

BEFORE IMPLEMENTING:
1. READ all test files to understand EXACT expectations
2. IDENTIFY required service interfaces from test imports
3. EXAMINE test constructor calls for exact parameter signatures
4. REVIEW test method calls to understand required functionality
5. CHECK test dependencies and package.json requirements

IMPLEMENT EXACTLY:
- Service interfaces that match test expectations PRECISELY
- Constructor signatures exactly as tests expect them
- Method names and return types exactly as tests call them
- Dependencies exactly as listed in test imports
- File structure exactly as tests import from

ZERO DEVIATION RULE:
- If tests expect ProcessManager, create ProcessManager
- If tests expect specific constructor params, implement those exact params
- If tests import from '@/services/x', create that exact path
- NO creative interpretation - implement EXACTLY what tests demand

CRITICAL REQUIREMENTS:
- Follow @ARCHITECTURE.md project structure - separate directories
- Create COMPLETE, WORKING features that fulfill todo requirements
- All tests MUST pass after implementation
- Update documentation with exact implementation details"

CODE_REVIEWER_SYSTEM="You are a Code Reviewer for the Claude App Builder project.

MANDATORY VALIDATION PROCESS:
1. EXECUTE 'npm test' and verify ALL tests pass with 100% success rate
2. If ANY test fails, IMMEDIATELY REJECT with exact error messages
3. Check code quality, structure, and adherence to standards
4. Verify project structure follows @ARCHITECTURE.md (separate directories)
5. Ensure implementation matches test expectations exactly

STRICT PASS REQUIREMENTS:
- ALL tests must execute successfully
- ALL tests must pass (0 failures, 0 errors)
- Code must follow established patterns
- TypeScript must compile without errors
- All imports must resolve correctly

IF TESTS FAIL:
- Create code-feedback.md with EXACT test failure output
- Copy/paste actual error messages
- Specify which tests are failing and why
- Demand specific fixes to make tests pass
- NO approval until 100% test success rate

ZERO TOLERANCE for failing tests. Provide specific, actionable feedback based on actual test results."

COORDINATOR_SYSTEM="You are the Workflow Coordinator for the Claude App Builder project.

DOCUMENTATION PRESERVATION RULES:
1. NEVER delete or clear todo.md content - only mark items as [x] complete
2. NEVER overwrite memory.md - always APPEND new sections to existing content
3. Preserve ALL project history and context
4. Keep complete audit trail of all work done

TASKS:
- Mark completed todo items as [x] but preserve all tasks in todo.md
- APPEND progress summaries to memory.md with clear section headers
- Determine if more tasks exist or if workflow should complete
- Create workflow-complete.flag only when ALL tasks marked [x]

CRITICAL: User controls when to clear documentation files, not the system."

# Initialize Git if not already done
initialize_git() {
    if [ ! -d ".git" ]; then
        echo -e "${BLUE}Initializing Git repository...${NC}"
        
        # Configure git user if not set
        if ! git config user.email >/dev/null 2>&1; then
            git config user.email "claude-app-builder@example.com"
            git config user.name "Claude App Builder"
        fi
        
        git init
        git add ARCHITECTURE.md CLAUDE.md README.md workflow.md automated-workflow.sh todo.md memory.md templates/
        git commit -m "Initial commit: Claude App Builder system setup"
    fi
}

# Auto-commit progress after successful phases
auto_commit() {
    local phase="$1"
    local iteration="$2"
    
    echo -e "${BLUE}Auto-committing progress...${NC}"
    git add .
    git commit -m "Iteration $iteration: $phase completed successfully

🤖 Generated with Claude App Builder
Co-Authored-By: Claude <noreply@anthropic.com>" || true
}

# Auto-install dependencies when package.json is created/updated
install_dependencies() {
    local project_dir="$1"
    
    if [ -f "$project_dir/package.json" ]; then
        echo -e "${BLUE}Installing dependencies in $project_dir...${NC}"
        cd "$project_dir"
        npm install
        cd - > /dev/null
        echo -e "${GREEN}Dependencies installed successfully${NC}"
    fi
}

# Run build verification
verify_build() {
    local project_dir="$1"
    
    if [ -f "$project_dir/package.json" ]; then
        echo -e "${BLUE}Verifying build in $project_dir...${NC}"
        cd "$project_dir"
        
        # Check if build script exists
        if npm run build 2>/dev/null; then
            echo -e "${GREEN}Build verification passed${NC}"
            cd - > /dev/null
            return 0
        else
            echo -e "${YELLOW}No build script found or build failed${NC}"
            cd - > /dev/null
            return 1
        fi
    fi
}

# Create checkpoint before major operations
create_checkpoint() {
    local checkpoint_name="$1"
    echo -e "${BLUE}Creating checkpoint: $checkpoint_name${NC}"
    git add .
    git commit -m "Checkpoint: $checkpoint_name" || true
    git tag "checkpoint-$(date +%s)" -m "$checkpoint_name"
}

# Rollback to last successful state
rollback() {
    local phase="$1"
    echo -e "${RED}Rolling back failed $phase...${NC}"
    git reset --hard HEAD~1
    echo -e "${YELLOW}Rolled back to previous state${NC}"
}

# Enhanced error handling with retry
run_claude_with_retry() {
    local role="$1"
    local prompt="$2"
    local system_prompt="$3"
    local max_retries=2
    local retry=0
    
    while [ $retry -le $max_retries ]; do
        if [ $retry -gt 0 ]; then
            echo -e "${YELLOW}Retry $retry for $role...${NC}"
        fi
        
        if run_claude "$role" "$prompt" "$system_prompt"; then
            return 0
        fi
        
        retry=$((retry + 1))
        if [ $retry -le $max_retries ]; then
            echo -e "${YELLOW}$role failed, will retry...${NC}"
            sleep 2
        fi
    done
    
    echo -e "${RED}$role failed after $max_retries retries${NC}"
    rollback "$role"
    return 1
}

# Apply project template
apply_template() {
    local template_name="$1"
    local project_dir="$2"
    local template_file="templates/${template_name}.json"
    
    if [ -f "$template_file" ]; then
        echo -e "${BLUE}Applying template: $template_name${NC}"
        # Template will be used by Claude to understand project structure
        return 0
    else
        echo -e "${YELLOW}Template $template_name not found, using default structure${NC}"
        return 1
    fi
}

# Detect project type from todo and suggest template
suggest_template() {
    local todo_content=$(cat todo.md 2>/dev/null || echo "")
    
    if echo "$todo_content" | grep -qi "dashboard\|react\|frontend"; then
        echo "react-dashboard"
    elif echo "$todo_content" | grep -qi "api\|backend\|server\|express"; then
        echo "node-api"
    else
        echo "react-dashboard"  # Default
    fi
}

# Validate test phase checkpoint
validate_test_checkpoint() {
    local project_dir="$1"
    
    echo -e "${BLUE}Validating test checkpoint for $project_dir...${NC}"
    
    if [ -d "$project_dir" ]; then
        cd "$project_dir"
        
        # Check if tests can import correctly
        if npm run build 2>/dev/null; then
            echo -e "${GREEN}✓ TypeScript compilation successful${NC}"
        else
            echo -e "${RED}✗ TypeScript compilation failed${NC}"
            cd - > /dev/null
            return 1
        fi
        
        # Check if test files have basic structure
        if [ -d "tests" ] && find tests -name "*.test.ts" -o -name "*.test.tsx" | grep -q .; then
            echo -e "${GREEN}✓ Test files found${NC}"
        else
            echo -e "${RED}✗ No test files found${NC}"
            cd - > /dev/null
            return 1
        fi
        
        cd - > /dev/null
    fi
    
    return 0
}

# Validate development phase checkpoint
validate_development_checkpoint() {
    local project_dir="$1"
    
    echo -e "${BLUE}Validating development checkpoint for $project_dir...${NC}"
    
    if [ -d "$project_dir" ]; then
        cd "$project_dir"
        
        # Run tests to verify implementation
        echo -e "${BLUE}Running tests to validate implementation...${NC}"
        if npm test 2>&1 | tee /tmp/test_output.log; then
            echo -e "${GREEN}✓ All tests passed${NC}"
            cd - > /dev/null
            return 0
        else
            echo -e "${RED}✗ Tests failed${NC}"
            echo -e "${YELLOW}Test output:${NC}"
            cat /tmp/test_output.log
            cd - > /dev/null
            return 1
        fi
    fi
    
    return 1
}

# Check if todo.md has incomplete tasks
has_incomplete_tasks() {
    if [ -f "todo.md" ]; then
        grep -q "\[\s*\]" todo.md
        return $?
    fi
    return 1
}

# Get incomplete tasks from todo.md
get_incomplete_tasks() {
    if [ -f "todo.md" ]; then
        grep -n "\[\s*\]" todo.md | head -20  # Get up to 20 incomplete tasks
    fi
}

# Count incomplete tasks
count_incomplete_tasks() {
    get_incomplete_tasks | wc -l
}

# Determine task selection strategy based on processing mode
get_task_selection_strategy() {
    local task_count=$(count_incomplete_tasks)
    
    case "$PROCESSING_MODE" in
        "sequential")
            echo "Process the FIRST incomplete task only. Do NOT work on multiple tasks simultaneously."
            ;;
        "batch")
            if [ "$task_count" -le "$MAX_TASKS_PER_BATCH" ]; then
                echo "Process ALL incomplete tasks together as they appear to be related."
            else
                echo "Process the first $MAX_TASKS_PER_BATCH related tasks together."
            fi
            ;;
        *)
            echo "Process ALL incomplete tasks together."
            ;;
    esac
}

# Watch for todo.md changes
watch_todo_changes() {
    echo -e "${BLUE}Watching todo.md for changes... (Press Ctrl+C to stop)${NC}"
    while true; do
        if has_incomplete_tasks; then
            echo -e "${GREEN}New incomplete tasks detected! Starting workflow...${NC}"
            return 0
        fi
        sleep 5
    done
}

# Enhanced interrupt handling
cleanup_on_exit() {
    echo -e "\n${YELLOW}Workflow interrupted. Saving state...${NC}"
    save_workflow_state "interrupted" "${current_phase:-unknown}" "${iteration:-0}" "User interrupted workflow"
    echo -e "${BLUE}State saved to $WORKFLOW_STATE_FILE${NC}"
    echo -e "${YELLOW}To resume, run the workflow again${NC}"
    exit 0
}

# Handle interrupts gracefully
trap cleanup_on_exit INT TERM

# Quality gate validation between phases
validate_quality_gate() {
    local phase="$1"
    local iteration="$2"
    
    log_verbose "Validating quality gate for $phase"
    
    case "$phase" in
        "after_test_writer")
            # Verify test files exist and are valid
            if ! find . -name "*.test.ts" -o -name "*.test.tsx" | grep -q .; then
                handle_error 1 "No test files found after Test Writer phase" "$phase" "$iteration"
                return 1
            fi
            log_verbose "Quality gate passed: Test files found"
            ;;
        "after_test_reviewer")
            # Verify no test-feedback.md exists (tests approved)
            if [ -f "test-feedback.md" ]; then
                log_verbose "Quality gate: Test feedback file exists, revision needed"
                return 1
            fi
            log_verbose "Quality gate passed: Tests approved by reviewer"
            ;;
        "after_developer")
            # Verify implementation files exist
            if ! find . -path "*/src/*" -name "*.ts" -o -name "*.tsx" | grep -q .; then
                handle_error 1 "No implementation files found after Developer phase" "$phase" "$iteration"
                return 1
            fi
            log_verbose "Quality gate passed: Implementation files found"
            ;;
        "after_code_reviewer")
            # Verify no code-feedback.md exists (code approved)
            if [ -f "code-feedback.md" ]; then
                log_verbose "Quality gate: Code feedback file exists, revision needed"
                return 1
            fi
            log_verbose "Quality gate passed: Code approved by reviewer"
            ;;
    esac
    
    return 0
}

# Main workflow loop
echo -e "${YELLOW}=== Starting Automated Claude App Builder TDD Workflow ===${NC}"
echo "This workflow will automatically run Claude Code in different roles."
echo -e "${BLUE}Processing Mode: $PROCESSING_MODE${NC}"
if [ "$PROCESSING_MODE" = "batch" ]; then
    echo -e "${BLUE}Max Tasks Per Batch: $MAX_TASKS_PER_BATCH${NC}"
fi
if [ "$VERBOSE" = "true" ]; then
    echo -e "${BLUE}Verbose Logging: ENABLED${NC}"
fi
echo -e "${BLUE}State File: $WORKFLOW_STATE_FILE${NC}"
echo ""

# Load previous workflow state if exists
load_workflow_state

# Initialize Git
initialize_git
log_verbose "Git repository initialized/verified"

# Continuous monitoring mode
while true; do
    # Check if there are incomplete tasks
    if ! has_incomplete_tasks; then
        echo -e "${GREEN}No incomplete tasks found. Entering watch mode...${NC}"
        watch_todo_changes
    fi
    
    iteration=0
    max_iterations=20  # Safety limit
    workflow_start_time=$(date +%s)
    
    # Estimate phases per iteration
    phases_per_iteration=5  # Test Writer, Test Reviewer, Developer, Code Reviewer, Coordinator
    
    while [ $iteration -lt $max_iterations ] && has_incomplete_tasks; do
    iteration=$((iteration + 1))
    
    # Calculate progress and estimated time
    local current_time=$(date +%s)
    local elapsed_time=$((current_time - workflow_start_time))
    local task_count=$(count_incomplete_tasks)
    
    echo -e "${YELLOW}=== Iteration $iteration ===${NC}"
    echo -e "${BLUE}📊 Progress: $elapsed_time seconds elapsed | $task_count tasks remaining${NC}"
    
    # Show estimated time remaining (rough estimate)
    if [ $iteration -gt 1 ] && [ $task_count -gt 0 ]; then
        local avg_time_per_iteration=$((elapsed_time / (iteration - 1)))
        local estimated_remaining=$((avg_time_per_iteration * task_count))
        local hours=$((estimated_remaining / 3600))
        local minutes=$(((estimated_remaining % 3600) / 60))
        echo -e "${BLUE}⏱️  Estimated time remaining: ${hours}h ${minutes}m${NC}"
    fi
    
    # Detect and suggest template
    suggested_template=$(suggest_template)
    echo -e "${BLUE}Suggested template: $suggested_template${NC}"
    
    # Create checkpoint before starting
    create_checkpoint "Before iteration $iteration"
    
    # Get task selection strategy based on processing mode
    task_strategy=$(get_task_selection_strategy)
    task_count=$(count_incomplete_tasks)
    
    echo -e "${BLUE}Task Strategy: $task_strategy${NC}"
    echo -e "${BLUE}Incomplete Tasks Found: $task_count${NC}"
    
    # Phase 1: Test Writer
    run_claude_with_retry "TEST WRITER" \
        "Read @ARCHITECTURE.md, @memory.md and @todo.md. 

TASK PROCESSING STRATEGY: $task_strategy

Follow the project structure in ARCHITECTURE.md - create projects in separate directories (e.g., dashboard/), NEVER mix with system files. Use the $suggested_template template structure from templates/ directory for guidance. Write comprehensive unit, integration, and e2e tests according to the task strategy above. Update memory.md with test design decisions and todo.md to show progress." \
        "$TEST_WRITER_SYSTEM"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Test writing failed after retries. Stopping workflow.${NC}"
        break
    fi
    auto_commit "Test Writer" $iteration
    
    # Phase 2: Test Reviewer
    run_claude "TEST REVIEWER" \
        "Review the tests that were just written. Check for completeness, edge cases, and proper structure. Run the tests with 'npm test' to verify they fail correctly. If improvements needed, create a file called 'test-feedback.md' with specific issues. If approved, update memory.md with approval." \
        "$TEST_REVIEWER_SYSTEM"
    
    # Check if feedback file exists
    if [ -f "test-feedback.md" ]; then
        echo -e "${YELLOW}Test review feedback found. Re-running test writer...${NC}"
        
        run_claude "TEST WRITER (REVISION)" \
            "Read test-feedback.md and revise the tests based on the feedback. Update the test files and remove test-feedback.md when done." \
            "$TEST_WRITER_SYSTEM"
        
        # Re-run reviewer
        run_claude "TEST REVIEWER (RE-REVIEW)" \
            "Re-review the revised tests. If approved, update memory.md. If still needs work, update test-feedback.md." \
            "$TEST_REVIEWER_SYSTEM"
    fi
    
    # Phase 3: Developer
    run_claude_with_retry "DEVELOPER" \
        "Read @ARCHITECTURE.md and the approved tests. Implement COMPLETE, WORKING features in the correct project directory structure (e.g., dashboard/). NEVER put project files in the root system directory. Use the $suggested_template template structure for guidance. Create fully functional code that fulfills the todo requirements. Update memory.md with implementation details when done." \
        "$DEVELOPER_SYSTEM"
    
    if [ $? -ne 0 ]; then
        echo -e "${RED}Development failed after retries. Stopping workflow.${NC}"
        break
    fi
    
    # Auto-install dependencies and verify build
    for project_dir in dashboard api cli; do
        if [ -d "$project_dir" ]; then
            install_dependencies "$project_dir"
            verify_build "$project_dir"
        fi
    done
    
    # Phase 4: Code Reviewer
    run_claude "CODE REVIEWER" \
        "Review the implementation. Run 'npm test' to verify all tests pass. Check code quality and standards. If improvements needed, create 'code-feedback.md' with specific issues. If approved, update memory.md." \
        "$CODE_REVIEWER_SYSTEM"
    
    # Check if feedback file exists
    if [ -f "code-feedback.md" ]; then
        echo -e "${YELLOW}Code review feedback found. Re-running developer...${NC}"
        
        run_claude "DEVELOPER (REVISION)" \
            "Read code-feedback.md and revise the implementation based on feedback. Update code and remove code-feedback.md when done." \
            "$DEVELOPER_SYSTEM"
        
        # Re-run code reviewer
        run_claude "CODE REVIEWER (RE-REVIEW)" \
            "Re-review the revised code. Run tests again. If approved, update memory.md. If still needs work, update code-feedback.md." \
            "$CODE_REVIEWER_SYSTEM"
    fi
    
    # Phase 5: Coordinator
    run_claude "COORDINATOR" \
        "Update todo.md to mark the completed task as done. Update memory.md with a summary of what was accomplished. Check if there are more incomplete high-priority tasks. If no more tasks, create a file called 'workflow-complete.flag' to signal completion." \
        "$COORDINATOR_SYSTEM"
    
    # Check if workflow is complete
    if [ -f "workflow-complete.flag" ]; then
        echo -e "${GREEN}=== Workflow Complete! All tasks finished. ===${NC}"
        
        # Final verification and commit
        for project_dir in dashboard api cli; do
            if [ -d "$project_dir" ]; then
                echo -e "${BLUE}Final verification for $project_dir...${NC}"
                install_dependencies "$project_dir"
                verify_build "$project_dir"
            fi
        done
        
        # Create final release commit
        git add .
        git commit -m "🎉 Project completed successfully

All features implemented and verified.

🤖 Generated with Claude App Builder
Co-Authored-By: Claude <noreply@anthropic.com>" || true
        
        git tag "release-$(date +%Y%m%d-%H%M%S)" -m "Completed project release"
        
        rm workflow-complete.flag
        break
    fi
    
    echo -e "${BLUE}Moving to next task...${NC}"
    echo ""
    
    # Small delay before next iteration
    sleep 3
    done
    
    if [ $iteration -eq $max_iterations ]; then
        echo -e "${YELLOW}Reached maximum iterations ($max_iterations). Stopping current batch.${NC}"
    fi
    
    echo -e "${GREEN}=== Current batch complete. Watching for new tasks... ===${NC}"
    echo "Add new tasks to todo.md or press Ctrl+C to exit."
    echo ""
done