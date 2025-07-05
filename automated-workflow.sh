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

# Load environment variables from .env file
load_env() {
    if [ -f ".env" ]; then
        log_verbose "Loading environment variables from .env"
        export $(grep -v '^#' .env | xargs)
    fi
}

# Load environment variables
load_env

# GitHub configuration from environment
GITHUB_TOKEN=${GITHUB_TOKEN:-""}
GITHUB_USER=${GITHUB_USER:-""}
GITHUB_REPO=${GITHUB_REPO:-""}
GITHUB_REMOTE_URL=${GITHUB_REMOTE_URL:-""}
GIT_AUTO_PUSH=${GIT_AUTO_PUSH:-"false"}
GIT_USE_POWERSHELL=${GIT_USE_POWERSHELL:-"false"}

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
            log_verbose "Test Reviewer: Executing npx vitest run and validating test quality"
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
- ARCHITECTURE RULE: Frontend code (React) CANNOT use Node.js APIs (child_process, fs, path)
- ARCHITECTURE RULE: Backend code (Express) handles Node.js APIs, Frontend makes HTTP requests
- Always read @ARCHITECTURE.md, @memory.md and @todo.md first
- Update both files when done with specific interface definitions"

TEST_REVIEWER_SYSTEM="You are a Test Reviewer for the Claude App Builder project.

🚨 CRITICAL REQUIREMENT: YOU MUST ACTUALLY RUN THE TESTS! 🚨

MANDATORY STEPS - DO THESE IN ORDER:
1. **FIRST**: Navigate to the project directory (dashboard/, api/, etc.)
2. **SECOND**: Run 'npx vitest run' using the Bash tool - DO NOT SKIP THIS STEP
3. **THIRD**: If npx vitest run fails, IMMEDIATELY REJECT with exact error output
4. **FOURTH**: Only if tests run successfully, then review test quality

STEP-BY-STEP PROCESS:
Step 1: Use Bash tool: cd [project-directory] && npx vitest run
Step 2: If ANY test fails or doesn't run, create test-feedback.md with:
   - EXACT error messages from npx vitest run output
   - Which dependencies are missing
   - Which imports are broken
   - Specific fixes needed
Step 3: If ALL tests pass, then review for quality and coverage

REJECTION CRITERIA (MUST create test-feedback.md):
- npx vitest run command fails to execute
- ANY test fails when run
- Missing dependencies in package.json
- Broken imports or file paths
- Tests that expect failures instead of success

APPROVAL CRITERIA (ONLY approve if ALL are true):
- npx vitest run executes successfully with 0 failures
- All tests pass
- Good test coverage and quality
- Tests validate working functionality

ZERO TOLERANCE: Never approve without running npx vitest run successfully."

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

🚨 CRITICAL REQUIREMENT: YOU MUST ACTUALLY RUN ALL TESTS! 🚨

MANDATORY STEPS - DO THESE IN ORDER:
1. **FIRST**: Navigate to the project directory (dashboard/, api/, etc.)
2. **SECOND**: Run 'npm test' using the Bash tool - DO NOT SKIP THIS STEP
3. **THIRD**: If ANY test fails, IMMEDIATELY REJECT with exact error output
4. **FOURTH**: Only if ALL tests pass, then review code quality

STEP-BY-STEP PROCESS:
Step 1: Use Bash tool: cd [project-directory] && npx vitest run
Step 2: If ANY test fails, create code-feedback.md with:
   - EXACT error messages from npx vitest run output
   - Which specific tests are failing
   - What the implementation is missing
   - Specific code fixes needed to make tests pass
Step 3: If ALL tests pass (0 failures, 0 errors), then review code quality

REJECTION CRITERIA (MUST create code-feedback.md):
- npx vitest run command fails to execute
- ANY test fails when run (even 1 failure = rejection)
- Build/compilation errors
- Missing implementations that tests expect
- Code doesn't match test expectations

APPROVAL CRITERIA (ONLY approve if ALL are true):
- npx vitest run executes successfully with 0 failures, 0 errors
- ALL tests pass (100% success rate)
- Code follows project standards
- Implementation matches test expectations exactly

ZERO TOLERANCE: Never approve if any test fails. Always run npx vitest run first."

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

# Execute git command with PowerShell if needed
execute_git() {
    local git_command="$1"
    
    if [ "$GIT_USE_POWERSHELL" = "true" ]; then
        # Convert WSL path to Windows path for PowerShell
        local windows_path=$(wslpath -w "$(pwd)")
        powershell.exe -Command "cd '$windows_path'; $git_command"
    else
        eval "$git_command"
    fi
}

# Push to GitHub
push_to_github() {
    local message="$1"
    
    if [ "$GIT_AUTO_PUSH" = "true" ] && [ -n "$GITHUB_TOKEN" ]; then
        echo -e "${BLUE}Pushing to GitHub...${NC}"
        
        # Update remote URL with token if needed
        if [ -n "$GITHUB_REMOTE_URL" ]; then
            execute_git "git remote set-url origin $GITHUB_REMOTE_URL"
        fi
        
        # Push to GitHub
        if execute_git "git push origin master"; then
            echo -e "${GREEN}✓ Successfully pushed to GitHub${NC}"
            return 0
        else
            echo -e "${RED}✗ Failed to push to GitHub${NC}"
            return 1
        fi
    else
        log_verbose "Auto-push disabled or GitHub token not configured"
        return 0
    fi
}

# Auto-commit progress after successful phases
auto_commit() {
    local phase="$1"
    local iteration="$2"
    
    echo -e "${BLUE}Auto-committing progress...${NC}"
    execute_git "git add ."
    execute_git "git commit -m \"Iteration $iteration: $phase completed successfully

🤖 Generated with Claude App Builder
Co-Authored-By: Claude <noreply@anthropic.com>\"" || true
    
    # Auto-push if enabled
    push_to_github "Auto-push after $phase completion"
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
    local max_retries=3
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
        
        # Run tests to verify implementation (one-time execution, no watch mode)
        echo -e "${BLUE}Running tests to validate implementation...${NC}"
        if npx vitest run 2>&1 | tee /tmp/test_output.log; then
            echo -e "${GREEN}✓ All tests passed${NC}"
            
            # Verify build succeeds
            echo -e "${BLUE}Verifying build process...${NC}"
            if npm run build 2>&1 | tee /tmp/build_output.log; then
                echo -e "${GREEN}✓ Build successful${NC}"
                
                # Test application startup (if it's a web project)
                if [ -f "package.json" ] && grep -q "\"dev\":" package.json; then
                    echo -e "${BLUE}Testing application startup...${NC}"
                    if timeout 30s npm run dev 2>&1 | tee /tmp/dev_output.log &
                    then
                        DEV_PID=$!
                        sleep 10  # Give time for startup
                        if kill -0 $DEV_PID 2>/dev/null; then
                            echo -e "${GREEN}✓ Application starts successfully${NC}"
                            kill $DEV_PID 2>/dev/null
                            wait $DEV_PID 2>/dev/null
                        else
                            echo -e "${RED}✗ Application failed to start${NC}"
                            cat /tmp/dev_output.log
                            cd - > /dev/null
                            return 1
                        fi
                    else
                        echo -e "${RED}✗ Failed to start dev server${NC}"
                        cd - > /dev/null
                        return 1
                    fi
                fi
                
                cd - > /dev/null
                return 0
            else
                echo -e "${RED}✗ Build failed${NC}"
                echo -e "${YELLOW}Build output:${NC}"
                cat /tmp/build_output.log
                cd - > /dev/null
                return 1
            fi
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

# Validate that tests were actually executed
validate_test_execution() {
    local project_dir="$1"
    local reviewer_type="$2"  # "test" or "code"
    
    if [ ! -d "$project_dir" ]; then
        echo -e "${RED}ERROR: Project directory $project_dir not found${NC}"
        return 1
    fi
    
    echo -e "${BLUE}Validating that $reviewer_type reviewer actually ran tests...${NC}"
    
    # Check if package.json exists
    if [ ! -f "$project_dir/package.json" ]; then
        echo -e "${RED}ERROR: No package.json found in $project_dir${NC}"
        return 1
    fi
    
    # Actually run the tests to verify they work (one-time execution, no watch mode)
    cd "$project_dir"
    if npx vitest run 2>&1 | tee /tmp/validation_test_output.log; then
        local test_result=$(grep -E "(passing|failing|failing|error)" /tmp/validation_test_output.log || echo "")
        if echo "$test_result" | grep -qi "failing\|error\|failed"; then
            echo -e "${RED}ERROR: Tests are failing! $reviewer_type reviewer should have caught this.${NC}"
            echo -e "${YELLOW}Test output:${NC}"
            cat /tmp/validation_test_output.log
            cd - > /dev/null
            return 1
        else
            echo -e "${GREEN}✓ Tests are actually passing${NC}"
            cd - > /dev/null
            return 0
        fi
    else
        echo -e "${RED}ERROR: Tests failed to execute! $reviewer_type reviewer should have caught this.${NC}"
        cd - > /dev/null
        return 1
    fi
}

# Validate phase completion - ensures phases only proceed if prior phases succeeded
validate_phase_completion() {
    local phase="$1"
    local iteration="$2"
    
    log_verbose "Validating phase completion requirements for $phase"
    
    case "$phase" in
        "test_reviewer")
            # Test Writer must have completed successfully
            if ! find . -name "*.test.ts" -o -name "*.test.tsx" | grep -q .; then
                echo -e "${RED}ERROR: Cannot run Test Reviewer - no test files found${NC}"
                return 1
            fi
            ;;
        "developer")
            # Test Reviewer must have approved (no feedback file)
            if [ -f "test-feedback.md" ]; then
                echo -e "${RED}ERROR: Cannot run Developer - tests not approved (test-feedback.md exists)${NC}"
                return 1
            fi
            
            # Validate that tests were actually executed by Test Reviewer
            for project_dir in dashboard api cli; do
                if [ -d "$project_dir" ] && [ -f "$project_dir/package.json" ]; then
                    if ! validate_test_execution "$project_dir" "test"; then
                        echo -e "${RED}ERROR: Test Reviewer failed to properly validate tests${NC}"
                        return 1
                    fi
                fi
            done
            ;;
        "code_reviewer")
            # Developer must have created implementation files
            if ! find . -path "*/src/*" -name "*.ts" -o -name "*.tsx" | grep -q .; then
                echo -e "${RED}ERROR: Cannot run Code Reviewer - no implementation files found${NC}"
                return 1
            fi
            ;;
        "coordinator")
            # Code Reviewer must have approved (no feedback file)
            if [ -f "code-feedback.md" ]; then
                echo -e "${RED}ERROR: Cannot run Coordinator - code not approved (code-feedback.md exists)${NC}"
                return 1
            fi
            
            # Validate that tests were actually executed by Code Reviewer
            for project_dir in dashboard api cli; do
                if [ -d "$project_dir" ] && [ -f "$project_dir/package.json" ]; then
                    if ! validate_test_execution "$project_dir" "code"; then
                        echo -e "${RED}ERROR: Code Reviewer failed to properly validate tests${NC}"
                        return 1
                    fi
                fi
            done
            ;;
    esac
    
    log_verbose "Phase completion validation passed for $phase"
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
    current_time=$(date +%s)
    elapsed_time=$((current_time - workflow_start_time))
    task_count=$(count_incomplete_tasks)
    
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
    # Don't commit after individual phases - only after complete task approval
    # auto_commit "Test Writer" $iteration
    
    # Phase 2: Test Reviewer with proper rejection loop
    max_review_attempts=3
    review_attempt=0
    tests_approved=false
    
    while [ $review_attempt -lt $max_review_attempts ] && [ "$tests_approved" = false ]; do
        review_attempt=$((review_attempt + 1))
        
        # Always run Test Reviewer first
        if [ $review_attempt -eq 1 ]; then
            run_claude "TEST REVIEWER" \
                "🚨 MANDATORY: You MUST run tests using the Bash tool before making any decisions!

STEP 1: Navigate to project directory (dashboard/, api/, etc.) 
STEP 2: Use Bash tool to run: npx vitest run (one-time execution, NOT watch mode)
STEP 3: If ANY test fails or command doesn't work, create test-feedback.md with EXACT error messages
STEP 4: Only if ALL tests run successfully, then approve and update memory.md

DO NOT approve without running npx vitest run successfully. Zero tolerance for broken tests." \
                "$TEST_REVIEWER_SYSTEM"
        else
            run_claude "TEST REVIEWER (RE-REVIEW $review_attempt)" \
                "🚨 MANDATORY: Run tests again to verify the fixes work!

STEP 1: Navigate to project directory
STEP 2: Use Bash tool to run: npx vitest run (one-time execution, NOT watch mode)
STEP 3: If tests still fail, update test-feedback.md with remaining issues
STEP 4: Only approve if ALL tests pass (0 failures)

DO NOT approve without running npx vitest run successfully." \
                "$TEST_REVIEWER_SYSTEM"
        fi
        
        # Check if Test Reviewer rejected tests (created feedback file)
        if [ -f "test-feedback.md" ]; then
            echo -e "${YELLOW}Test review feedback found (attempt $review_attempt). Re-running test writer...${NC}"
            
            run_claude "TEST WRITER (REVISION $review_attempt)" \
                "Read test-feedback.md and revise the tests based on the feedback. Update the test files and remove test-feedback.md when done." \
                "$TEST_WRITER_SYSTEM"
            
            # Continue loop for next review attempt
            continue
        else
            # No feedback file means Test Reviewer approved the tests
            echo -e "${GREEN}Tests approved by Test Reviewer after $review_attempt attempt(s)${NC}"
            tests_approved=true
            break
        fi
    done
    
    # Check if tests were never approved
    if [ "$tests_approved" = false ]; then
        echo -e "${RED}Test review failed after $max_review_attempts attempts. Stopping workflow.${NC}"
        break
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
    
    # Phase 4: Code Reviewer with proper rejection loop
    max_code_review_attempts=3
    code_review_attempt=0
    
    while [ $code_review_attempt -lt $max_code_review_attempts ]; do
        code_review_attempt=$((code_review_attempt + 1))
        
        if [ $code_review_attempt -eq 1 ]; then
            run_claude "CODE REVIEWER" \
                "🚨 MANDATORY: You MUST run tests AND build validation using the Bash tool before making any decisions!

STEP 1: Navigate to project directory (dashboard/, api/, etc.)
STEP 2: Use Bash tool to run: npx vitest run (one-time test execution, NOT watch mode)
STEP 3: Use Bash tool to run: npm run build (check for compilation errors)
STEP 4: Use Bash tool to run: timeout 30s npm run dev (test app actually starts without errors)
STEP 5: Check for any console errors or startup failures in the dev server output
STEP 6: CRITICAL: Check for browser/Node.js compatibility issues (child_process, fs, path in browser code)
STEP 7: CRITICAL: Verify frontend/backend separation (no Node.js APIs in React components)
STEP 8: If ANY test fails OR build fails OR dev server fails OR architecture violations found, create code-feedback.md with EXACT error messages
STEP 9: Only if ALL tests pass AND build succeeds AND app starts successfully AND architecture is correct, then approve and update memory.md

DO NOT approve if any test fails, build fails, or application fails to start. Zero tolerance for failures." \
                "$CODE_REVIEWER_SYSTEM"
        else
            run_claude "CODE REVIEWER (RE-REVIEW $code_review_attempt)" \
                "🚨 MANDATORY: Run tests AND build validation again to verify all fixes work!

STEP 1: Navigate to project directory
STEP 2: Use Bash tool to run: npx vitest run (one-time execution, NOT watch mode)
STEP 3: Use Bash tool to run: npm run build (check compilation)
STEP 4: Use Bash tool to run: timeout 30s npm run dev (verify app starts without errors)
STEP 5: Check for console errors or startup failures in dev server output
STEP 6: CRITICAL: Check for browser/Node.js compatibility issues (child_process, fs, path in browser code)
STEP 7: CRITICAL: Verify frontend/backend separation (no Node.js APIs in React components)
STEP 8: If tests still fail OR build fails OR dev server fails OR architecture violations found, update code-feedback.md with remaining issues
STEP 9: Only approve if ALL tests pass (100% success rate) AND build succeeds AND app starts successfully AND architecture is correct

DO NOT approve if any test fails, build fails, or application fails to start. Zero tolerance for failures." \
                "$CODE_REVIEWER_SYSTEM"
        fi
        
        # Check if feedback file exists (code rejected)
        if [ -f "code-feedback.md" ]; then
            echo -e "${YELLOW}Code review feedback found (attempt $code_review_attempt). Re-running developer...${NC}"
            
            run_claude "DEVELOPER (REVISION $code_review_attempt)" \
                "Read code-feedback.md and revise the implementation based on feedback. Update code and remove code-feedback.md when done." \
                "$DEVELOPER_SYSTEM"
            
            # Continue loop for next review attempt
            continue
        else
            # Code approved, break out of loop
            echo -e "${GREEN}Code approved after $code_review_attempt attempt(s)${NC}"
            break
        fi
    done
    
    # Check if we exceeded max attempts
    if [ $code_review_attempt -eq $max_code_review_attempts ] && [ -f "code-feedback.md" ]; then
        echo -e "${RED}Code review failed after $max_code_review_attempts attempts. Stopping workflow.${NC}"
        break
    fi
    
    # Phase 5: Coordinator - only run if all phases succeeded
    if validate_phase_completion "coordinator" $iteration; then
        run_claude "COORDINATOR" \
            "Update todo.md to mark the completed task as done. Update memory.md with a summary of what was accomplished. Check if there are more incomplete high-priority tasks. If no more tasks, create a file called 'workflow-complete.flag' to signal completion." \
            "$COORDINATOR_SYSTEM"
        
        # Commit only after complete task is approved and coordinated
        echo -e "${BLUE}Task completed successfully! Committing changes...${NC}"
        auto_commit "Task Completed" $iteration
    else
        echo -e "${RED}Coordinator phase skipped - previous phases did not complete successfully${NC}"
        break
    fi
    
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
        execute_git "git add ."
        execute_git "git commit -m \"🎉 Project completed successfully

All features implemented and verified.

🤖 Generated with Claude App Builder
Co-Authored-By: Claude <noreply@anthropic.com>\"" || true
        
        local release_tag="release-$(date +%Y%m%d-%H%M%S)"
        execute_git "git tag \"$release_tag\" -m \"Completed project release\""
        
        # Push final release to GitHub
        echo -e "${GREEN}🎉 Project completed! Pushing final release to GitHub...${NC}"
        push_to_github "Final project release"
        
        # Push tags to GitHub
        if [ "$GIT_AUTO_PUSH" = "true" ] && [ -n "$GITHUB_TOKEN" ]; then
            execute_git "git push origin --tags"
            echo -e "${GREEN}✓ Release tags pushed to GitHub${NC}"
        fi
        
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