#!/bin/bash

# Automated TDD Workflow for Claude App Builder using Claude Code CLI

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to run Claude with a specific role
run_claude() {
    local role="$1"
    local prompt="$2"
    local system_prompt="$3"
    
    echo -e "${BLUE}=== Running Claude as: $role ===${NC}"
    
    # Create a combined prompt with system instructions
    local full_prompt="SYSTEM: $system_prompt

USER: $prompt"
    
    # Run Claude with all permissions allowed
    printf "%s\n" "$full_prompt" | claude --print \
        --dangerously-skip-permissions \
        --allowedTools "Bash,Edit,Write,Read,Grep,Glob,LS,MultiEdit,NotebookEdit,NotebookRead,WebFetch,WebSearch,TodoRead,TodoWrite,Task" \
        --model "sonnet" 2>/dev/null
    
    local exit_code=$?
    
    if [ $exit_code -eq 0 ]; then
        echo -e "${GREEN}✓ $role phase completed successfully${NC}"
    else
        echo -e "${RED}✗ $role phase failed with exit code: $exit_code${NC}"
        return $exit_code
    fi
    
    # Small delay between phases
    sleep 2
}

# System prompts for each role
TEST_WRITER_SYSTEM="You are a Test Writer for the Claude App Builder project. Write comprehensive tests that validate WORKING features. CRITICAL: Follow @ARCHITECTURE.md project structure - create projects in separate directories (dashboard/, api/, etc.), NEVER in root. Tests should check for actual functionality, not expect failures. Always read @ARCHITECTURE.md, @memory.md and @todo.md first. Update both files when done."

TEST_REVIEWER_SYSTEM="You are a Test Reviewer for the Claude App Builder project. Review tests for logical correctness, completeness, and proper structure. Check for impossible test logic (like expecting failures while checking properties). Verify tests will actually validate working features. Be thorough but constructive in feedback."

DEVELOPER_SYSTEM="You are a Developer for the Claude App Builder project. Implement COMPLETE, WORKING features that fulfill the todo requirements. CRITICAL: Follow @ARCHITECTURE.md project structure - create projects in separate directories (dashboard/, api/, etc.), NEVER put project files in root system directory. Create fully functional code, not minimal stubs. Update documentation when done."

CODE_REVIEWER_SYSTEM="You are a Code Reviewer for the Claude App Builder project. Review code quality, run all tests, ensure standards are met. Verify project structure follows @ARCHITECTURE.md (projects in separate directories, not root). Provide specific actionable feedback."

COORDINATOR_SYSTEM="You are the Workflow Coordinator for the Claude App Builder project. Update todo.md and memory.md, summarize progress, determine next steps."

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

# Check if todo.md has incomplete tasks
has_incomplete_tasks() {
    if [ -f "todo.md" ]; then
        grep -q "\[\s*\]" todo.md
        return $?
    fi
    return 1
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

# Handle Ctrl+C gracefully
trap 'echo -e "\n${YELLOW}Shutting down gracefully...${NC}"; exit 0' INT

# Main workflow loop
echo -e "${YELLOW}=== Starting Automated Claude App Builder TDD Workflow ===${NC}"
echo "This workflow will automatically run Claude Code in different roles."
echo ""

# Initialize Git
initialize_git

# Continuous monitoring mode
while true; do
    # Check if there are incomplete tasks
    if ! has_incomplete_tasks; then
        echo -e "${GREEN}No incomplete tasks found. Entering watch mode...${NC}"
        watch_todo_changes
    fi
    
    iteration=0
    max_iterations=20  # Safety limit
    
    while [ $iteration -lt $max_iterations ] && has_incomplete_tasks; do
    iteration=$((iteration + 1))
    echo -e "${YELLOW}=== Iteration $iteration ===${NC}"
    
    # Detect and suggest template
    suggested_template=$(suggest_template)
    echo -e "${BLUE}Suggested template: $suggested_template${NC}"
    
    # Create checkpoint before starting
    create_checkpoint "Before iteration $iteration"
    
    # Phase 1: Test Writer
    run_claude_with_retry "TEST WRITER" \
        "Read @ARCHITECTURE.md, @memory.md and @todo.md. Find the next incomplete high-priority task. Follow the project structure in ARCHITECTURE.md - create projects in separate directories (e.g., dashboard/), NEVER mix with system files. Use the $suggested_template template structure from templates/ directory for guidance. Write comprehensive unit, integration, and e2e tests. Update memory.md with test design decisions and todo.md to show progress." \
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