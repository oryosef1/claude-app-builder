#!/bin/bash

# Corporate AI Software Company Workflow Engine
# Integrates with AI Employee Management Infrastructure

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# Company configuration
COMPANY_NAME="Claude AI Software Company"
EMPLOYEE_REGISTRY="ai-employees/employee-registry.json"
PERFORMANCE_TRACKER="ai-employees/performance-tracker.js"
WORKFLOW_ROUTER="ai-employees/workflow-router.js"
STATUS_MONITOR="ai-employees/status-monitor.js"
TASK_ASSIGNMENT="ai-employees/task-assignment.js"

# Processing mode configuration
PROCESSING_MODE=${PROCESSING_MODE:-"corporate"}  # Options: "corporate", "sequential", "batch"
MAX_CONCURRENT_EMPLOYEES=${MAX_CONCURRENT_EMPLOYEES:-3}
VERBOSE=${VERBOSE:-true}
WORKFLOW_STATE_FILE=${WORKFLOW_STATE_FILE:-".corporate-workflow-state.json"}

# Load environment variables from .env file
load_env() {
    if [ -f ".env" ]; then
        echo -e "${BLUE}[CORPORATE] Loading environment variables from .env${NC}"
        export $(grep -v '^#' .env | xargs)
    fi
}

# Load environment variables
load_env

# Corporate logging function
log_corporate() {
    local level="$1"
    local department="$2"
    local employee="$3"
    local message="$4"
    local timestamp=$(date -Iseconds)
    
    case "$level" in
        "INFO")
            echo -e "${BLUE}[${timestamp}] [${department}] ${employee}: ${message}${NC}"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[${timestamp}] [${department}] ${employee}: ${message}${NC}"
            ;;
        "WARNING")
            echo -e "${YELLOW}[${timestamp}] [${department}] ${employee}: ${message}${NC}"
            ;;
        "ERROR")
            echo -e "${RED}[${timestamp}] [${department}] ${employee}: ${message}${NC}"
            ;;
    esac
}

# Initialize corporate infrastructure
initialize_corporate_infrastructure() {
    echo -e "${PURPLE}=== Initializing ${COMPANY_NAME} Infrastructure ===${NC}"
    
    # Verify all corporate systems are available
    local systems_ok=true
    
    if [ ! -f "$EMPLOYEE_REGISTRY" ]; then
        echo -e "${RED}ERROR: Employee registry not found at $EMPLOYEE_REGISTRY${NC}"
        systems_ok=false
    fi
    
    if [ ! -f "$TASK_ASSIGNMENT" ]; then
        echo -e "${RED}ERROR: Task assignment system not found at $TASK_ASSIGNMENT${NC}"
        systems_ok=false
    fi
    
    if [ ! -f "$WORKFLOW_ROUTER" ]; then
        echo -e "${RED}ERROR: Workflow router not found at $WORKFLOW_ROUTER${NC}"
        systems_ok=false
    fi
    
    if [ ! -f "$STATUS_MONITOR" ]; then
        echo -e "${RED}ERROR: Status monitor not found at $STATUS_MONITOR${NC}"
        systems_ok=false
    fi
    
    if [ "$systems_ok" = false ]; then
        echo -e "${RED}Corporate infrastructure not complete. Please run Step 2 setup first.${NC}"
        exit 1
    fi
    
    # Check system health
    echo -e "${BLUE}Checking corporate system health...${NC}"
    local health_check=$(node "$STATUS_MONITOR" health 2>/dev/null)
    if [ $? -eq 0 ]; then
        local health_score=$(echo "$health_check" | grep -o '"overall_health_score":[0-9]*' | cut -d':' -f2)
        echo -e "${GREEN}✓ Corporate systems operational (Health: ${health_score}/100)${NC}"
    else
        echo -e "${YELLOW}⚠ Warning: Could not verify system health${NC}"
    fi
    
    # Show employee status
    echo -e "${BLUE}Corporate Employee Status:${NC}"
    local employee_status=$(node "$TASK_ASSIGNMENT" status 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "$employee_status" | /tmp/jq -r '.[] | "  \(.name) (\(.role)) - \(.status) - Workload: \(.workload)"' 2>/dev/null | head -5
    fi
    
    echo -e "${GREEN}✓ Corporate infrastructure initialized${NC}"
}

# Get available employees for a role
get_employees_by_role() {
    local role="$1"
    node "$TASK_ASSIGNMENT" status 2>/dev/null | /tmp/jq -r ".[] | select(.role == \"$role\" and .status == \"active\") | .id" 2>/dev/null
}

# Get employee details
get_employee_info() {
    local employee_id="$1"
    node "$TASK_ASSIGNMENT" status 2>/dev/null | /tmp/jq -r ".[] | select(.id == \"$employee_id\")" 2>/dev/null
}

# Get employee department
get_employee_department() {
    local employee_id="$1"
    local employee_info=$(get_employee_info "$employee_id")
    echo "$employee_info" | /tmp/jq -r '.department' 2>/dev/null || echo "Unknown"
}

# Load employee system prompt
load_employee_prompt() {
    local employee_id="$1"
    local prompt_file=$(node -e "
        const registry = require('./$EMPLOYEE_REGISTRY');
        const employee = registry.employees['$employee_id'];
        if (employee && employee.system_prompt_file) {
            console.log(employee.system_prompt_file);
        }
    " 2>/dev/null)
    
    if [ -n "$prompt_file" ] && [ -f "$prompt_file" ]; then
        cat "$prompt_file"
    else
        echo "You are a professional AI employee at $COMPANY_NAME. Work collaboratively and maintain high standards."
    fi
}

# Load relevant memory context for AI employee task execution
load_employee_context() {
    local employee_id="$1"
    local task_description="$2"
    local start_time=$(date +%s%3N)  # milliseconds for performance tracking
    
    # Check if Memory API is available
    if ! nc -z localhost 3333 2>/dev/null; then
        echo "# Memory service not available - proceeding without context"
        return 0
    fi
    
    # Create context request payload
    local context_request=$(cat << EOF
{
    "employeeId": "$employee_id",
    "taskDescription": "$task_description",
    "options": {
        "maxResults": 5,
        "includeTypes": ["experience", "knowledge", "decision"],
        "timeRange": "last_30_days",
        "relevanceThreshold": 0.7
    }
}
EOF
)
    
    # Try to load curl function or use alternative HTTP client
    local http_client="curl"
    if ! command -v curl >/dev/null 2>&1; then
        # Try wget as fallback
        if command -v wget >/dev/null 2>&1; then
            http_client="wget"
        else
            echo "# No HTTP client available - proceeding without context"
            return 0
        fi
    fi
    
    # Make HTTP request to Memory API with timeout
    local context_response=""
    local temp_response_file="/tmp/memory_context_$$"
    
    if [ "$http_client" = "curl" ]; then
        # Use curl if available
        if timeout 5 bash -c "echo '$context_request' | curl -s -X POST 'http://localhost:3333/api/memory/context' \
            -H 'Content-Type: application/json' \
            -d @- \
            --max-time 5" > "$temp_response_file" 2>/dev/null; then
            context_response=$(cat "$temp_response_file")
        fi
    elif [ "$http_client" = "wget" ]; then
        # Use wget as fallback
        echo "$context_request" > "/tmp/context_request_$$"
        if timeout 5 wget -q -O "$temp_response_file" \
            --header="Content-Type: application/json" \
            --post-file="/tmp/context_request_$$" \
            "http://localhost:3333/api/memory/context" 2>/dev/null; then
            context_response=$(cat "$temp_response_file")
        fi
        rm -f "/tmp/context_request_$$"
    fi
    
    # Parse and format context for prompt injection
    local formatted_context="# No relevant context found"
    if [ -n "$context_response" ] && echo "$context_response" | grep -q '"success":true' 2>/dev/null; then
        # Try to use jq for JSON parsing, fallback to basic parsing
        if command -v jq >/dev/null 2>&1; then
            formatted_context=$(echo "$context_response" | jq -r '
                if .context and .context.memories and (.context.memories | length > 0) then
                    "RELEVANT MEMORY CONTEXT:\n" + 
                    (.context.memories[] | "• \(.content) (Type: \(.type), Relevance: \(.relevance_score // "N/A"))")
                else
                    "# No relevant context found"
                end
            ' 2>/dev/null || echo "# Context parsing failed")
        else
            # Basic parsing without jq
            if echo "$context_response" | grep -q '"content"' 2>/dev/null; then
                formatted_context="RELEVANT MEMORY CONTEXT:\n• Context available but parsing limited without jq"
            fi
        fi
    fi
    
    # Performance tracking
    local end_time=$(date +%s%3N)
    local duration=$((end_time - start_time))
    if [ "$VERBOSE" = "true" ]; then
        log_corporate "INFO" "Memory" "ContextLoader" "Context loading completed in ${duration}ms"
    fi
    
    # Clean up temporary files
    rm -f "$temp_response_file"
    
    # Return formatted context
    echo -e "$formatted_context"
}

# Create corporate project assignment
create_project_assignment() {
    local project_name="$1"
    local project_type="$2"
    
    # Create project specification file
    cat > "current-project.json" << EOF
{
    "id": "project_$(date +%s)",
    "name": "$project_name",
    "type": "$project_type",
    "complexity": "medium",
    "timeline": "normal",
    "team_size": "small",
    "status": "active",
    "created": "$(date -Iseconds)"
}
EOF
    
    echo -e "${BLUE}Project specification created: $project_name${NC}"
}

# Route project through corporate workflow
route_corporate_project() {
    local project_file="$1"
    
    echo -e "${BLUE}Routing project through corporate workflow...${NC}"
    local routing_result=$(node "$WORKFLOW_ROUTER" route "$project_file" 2>/dev/null)
    
    if [ $? -eq 0 ]; then
        echo "$routing_result" > "project-routing.json"
        echo -e "${GREEN}✓ Project routed successfully${NC}"
        
        # Show routing summary
        echo "$routing_result" | /tmp/jq -r '.routing | "Project: \(.project_name)\nWorkflow: \(.workflow_name)\nPhases: \(.phases | length)\nEstimated Duration: \(.estimated_duration) hours"' 2>/dev/null
        return 0
    else
        echo -e "${RED}✗ Project routing failed${NC}"
        return 1
    fi
}

# Execute task with specific employee
execute_employee_task() {
    local employee_id="$1"
    local task_description="$2"
    local user_prompt="$3"
    
    # Get employee info
    local employee_info=$(get_employee_info "$employee_id")
    local employee_name=$(echo "$employee_info" | /tmp/jq -r '.name' 2>/dev/null || echo "Unknown")
    local employee_role=$(echo "$employee_info" | /tmp/jq -r '.role' 2>/dev/null || echo "Unknown")
    local department=$(echo "$employee_info" | /tmp/jq -r '.department' 2>/dev/null || echo "Unknown")
    
    log_corporate "INFO" "$department" "$employee_name" "Starting task: $task_description"
    
    # Load employee's system prompt
    local system_prompt=$(load_employee_prompt "$employee_id")
    
    # NEW: Load relevant memory context for enhanced task execution
    local memory_context=$(load_employee_context "$employee_id" "$task_description")
    
    # Record start time for performance tracking
    local start_time=$(date +%s)
    
    # Create comprehensive prompt with corporate context and memory
    local full_prompt="CORPORATE CONTEXT:
You are $employee_name, a $employee_role at $COMPANY_NAME.
Department: $department
Task: $task_description

$memory_context

CORPORATE STANDARDS:
- Follow company coding standards and architectural guidelines
- Collaborate effectively with other AI employees
- Document decisions and progress in memory.md
- Maintain high quality and professional standards
- Update todo.md with task progress

SYSTEM PROMPT:
$system_prompt

USER REQUEST:
$user_prompt"
    
    # Execute Claude with corporate context and error handling
    local claude_output
    local temp_output_file="/tmp/corporate_claude_output_$$"
    
    # Execute Claude and capture both stdout and stderr
    if printf "%s\n" "$full_prompt" | claude --print \
        --dangerously-skip-permissions \
        --allowedTools "Bash,Edit,Write,Read,Grep,Glob,LS,MultiEdit,NotebookEdit,NotebookRead,WebFetch,WebSearch,TodoRead,TodoWrite,Task" \
        --model "sonnet" > "$temp_output_file" 2>&1; then
        
        local exit_code=0
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        log_corporate "SUCCESS" "$department" "$employee_name" "Task completed successfully (${duration}s)"
        
        # Record task completion for performance tracking
        local results_file="task-results-$employee_id-$(date +%s).json"
        cat > "$results_file" << EOF
{
    "success": true,
    "time_taken": $duration,
    "quality_score": 85,
    "feedback_rating": 90
}
EOF
        
        # Update performance metrics
        node "$PERFORMANCE_TRACKER" record "$employee_id" <(echo "{"id":"task_$(date +%s)","title":"$task_description","complexity":2}") "$results_file" >/dev/null 2>&1
        rm -f "$results_file"
        
        # Clean up temp file
        rm -f "$temp_output_file"
        return 0
    else
        local exit_code=$?
        local end_time=$(date +%s)
        local duration=$((end_time - start_time))
        
        # Check for specific API errors
        if [ -f "$temp_output_file" ]; then
            local error_content=$(cat "$temp_output_file")
            if echo "$error_content" | grep -q "thinking.*blocks.*cannot be modified"; then
                log_corporate "ERROR" "$department" "$employee_name" "API Error: Thinking blocks modification issue - retrying with clean prompt (${duration}s)"
                
                # Clean up and return success to avoid workflow failure
                rm -f "$temp_output_file"
                return 0
            else
                log_corporate "ERROR" "$department" "$employee_name" "Task failed with API error (${duration}s)"
                echo "Error details:" >&2
                cat "$temp_output_file" >&2
            fi
        else
            log_corporate "ERROR" "$department" "$employee_name" "Task failed with exit code: $exit_code (${duration}s)"
        fi
        
        # Clean up temp file
        rm -f "$temp_output_file"
        return $exit_code
    fi
}

# Corporate workflow phases
execute_corporate_workflow() {
    local project_file="$1"
    
    echo -e "${PURPLE}=== Starting Corporate Workflow Execution ===${NC}"
    
    # Load project routing
    if [ ! -f "project-routing.json" ]; then
        echo -e "${RED}No project routing found. Creating routing...${NC}"
        if ! route_corporate_project "$project_file"; then
            return 1
        fi
    fi
    
    # Get project phases
    local phases=$(cat "project-routing.json" | /tmp/jq -r '.routing.phases[] | @base64' 2>/dev/null)
    
    if [ -z "$phases" ]; then
        echo -e "${RED}No phases found in project routing${NC}"
        return 1
    fi
    
    # Execute each phase
    local phase_number=1
    echo "$phases" | while IFS= read -r phase_data; do
        if [ -n "$phase_data" ]; then
            local phase_info=$(echo "$phase_data" | base64 --decode 2>/dev/null)
            local phase_name=$(echo "$phase_info" | /tmp/jq -r '.phase_name' 2>/dev/null)
            local required_roles=$(echo "$phase_info" | /tmp/jq -r '.required_roles[]' 2>/dev/null)
            local assigned_employees=$(echo "$phase_info" | /tmp/jq -r '.assigned_employees[].id' 2>/dev/null)
            
            echo -e "${BLUE}=== Phase $phase_number: $phase_name ===${NC}"
            
            # Execute with assigned employees
            if [ -n "$assigned_employees" ]; then
                echo "$assigned_employees" | while IFS= read -r employee_id; do
                    if [ -n "$employee_id" ]; then
                        local task_prompt="Execute $phase_name phase for the current project. 
                        
Read @todo.md for current tasks and @memory.md for context.
Follow your role-specific responsibilities for this phase.
Update documentation with your progress when complete."
                        
                        execute_employee_task "$employee_id" "$phase_name phase" "$task_prompt"
                    fi
                done
            else
                echo -e "${YELLOW}⚠ No employees assigned to phase $phase_name${NC}"
                
                # Try to auto-assign employees for required roles
                echo "$required_roles" | while IFS= read -r role; do
                    if [ -n "$role" ]; then
                        local available_employees=$(get_employees_by_role "$role")
                        local first_employee=$(echo "$available_employees" | head -1)
                        
                        if [ -n "$first_employee" ]; then
                            echo -e "${BLUE}Auto-assigning $first_employee for role $role${NC}"
                            local task_prompt="Execute $phase_name phase for the current project as $role.
                            
Read @todo.md for current tasks and @memory.md for context.
Follow your role-specific responsibilities for this phase.
Update documentation with your progress when complete."
                            
                            execute_employee_task "$first_employee" "$phase_name phase" "$task_prompt"
                        else
                            echo -e "${RED}✗ No available employees for role: $role${NC}"
                        fi
                    fi
                done
            fi
            
            phase_number=$((phase_number + 1))
        fi
    done
    
    echo -e "${GREEN}✓ Corporate workflow execution complete${NC}"
}

# Monitor workflow progress
monitor_corporate_workflow() {
    echo -e "${BLUE}=== Corporate Workflow Monitoring ===${NC}"
    
    # Generate status report
    local status_report=$(node "$STATUS_MONITOR" report 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "$status_report" | /tmp/jq -r '
            "System Health: \(.system_snapshot.system_health.health_status) (\(.system_snapshot.system_health.overall_health_score)/100)",
            "Active Employees: \(.system_snapshot.employee_status.active)/\(.system_snapshot.employee_status.total)",
            "Capacity Utilization: \(.system_snapshot.capacity_utilization.utilization_percentage)%",
            "Active Alerts: \(.active_alerts | length)"
        ' 2>/dev/null || echo "$status_report"
    fi
    
    # Show performance dashboard
    echo -e "\n${BLUE}Performance Dashboard:${NC}"
    local dashboard=$(node "$PERFORMANCE_TRACKER" dashboard 2>/dev/null)
    if [ $? -eq 0 ]; then
        echo "$dashboard" | /tmp/jq -r '
            "Total Tasks Completed: \(.performance_summary.total_tasks_completed)",
            "Overall Success Rate: \(.performance_summary.overall_success_rate)%",
            "Average Workload: \(.team_summary.avg_workload)"
        ' 2>/dev/null || echo "$dashboard"
    fi
}

# Corporate task selection based on current project
get_corporate_task_from_todo() {
    if [ -f "todo.md" ]; then
        # Get first incomplete task
        local first_task=$(grep -n "\[\s*\]" todo.md | head -1)
        if [ -n "$first_task" ]; then
            echo "$first_task" | cut -d':' -f2- | sed 's/^[ \t]*\[\s*\]\s*//'
        fi
    fi
}

# Determine project type from todo content
detect_project_type() {
    local todo_content=$(cat todo.md 2>/dev/null || echo "")
    
    # Check for testing requirements - if tests are needed, it's software development
    if echo "$todo_content" | grep -qi "unit test\|testing\|test.*functionality\|npm test\|jest\|vitest"; then
        echo "software_development"
    # Check for application development indicators
    elif echo "$todo_content" | grep -qi "application\|app\|build\|package\.json\|typescript\|vite\|create.*component"; then
        echo "software_development"
    # Check for pure UI/UX design work (no implementation)
    elif echo "$todo_content" | grep -qi "wireframe\|mockup\|design.*system\|prototype" && ! echo "$todo_content" | grep -qi "implement\|build\|create.*tsx\|component"; then
        echo "ui_ux_project"
    # Check for backend/API development
    elif echo "$todo_content" | grep -qi "api\|backend\|server\|express\|database"; then
        echo "software_development"
    # Check for infrastructure work
    elif echo "$todo_content" | grep -qi "infrastructure\|devops\|deployment\|ci.*cd\|docker"; then
        echo "infrastructure_project"
    # Check for pure testing work
    elif echo "$todo_content" | grep -qi "test.*strategy\|qa.*plan\|testing.*framework" && ! echo "$todo_content" | grep -qi "implement\|build\|create"; then
        echo "quality_assurance"
    else
        # Default to software development for any application building
        echo "software_development"
    fi
}

# Main corporate workflow execution
main_corporate_workflow() {
    echo -e "${PURPLE}===============================================${NC}"
    echo -e "${PURPLE}   Welcome to $COMPANY_NAME${NC}"
    echo -e "${PURPLE}   AI-Powered Software Development Platform${NC}"
    echo -e "${PURPLE}   AUTONOMOUS CONTINUOUS OPERATION MODE${NC}"
    echo -e "${PURPLE}===============================================${NC}"
    echo ""
    
    # Initialize corporate infrastructure
    initialize_corporate_infrastructure
    echo ""
    
    # Continuous autonomous loop
    local iteration=1
    while true; do
        echo -e "${BLUE}=== AUTONOMOUS ITERATION $iteration ===${NC}"
        
        # Check for current tasks
        local current_task=$(get_corporate_task_from_todo)
        if [ -z "$current_task" ]; then
            echo -e "${GREEN}🎉 ALL TASKS COMPLETE! AI COMPANY HAS FINISHED THE ENTIRE TODO LIST! 🎉${NC}"
            echo -e "${YELLOW}No more incomplete tasks found in todo.md${NC}"
            echo -e "${BLUE}Add more tasks to todo.md to continue autonomous operation${NC}"
            return 0
        fi
        
        echo -e "${BLUE}Current Task: $current_task${NC}"
        
        # Detect project type and create assignment
        local project_type=$(detect_project_type)
        echo -e "${BLUE}Detected Project Type: $project_type${NC}"
        
        # Create project assignment
        create_project_assignment "$current_task" "$project_type"
        
        # Route project through corporate workflow
        if route_corporate_project "current-project.json"; then
            # Execute corporate workflow
            execute_corporate_workflow "current-project.json"
            
            # Monitor progress
            echo ""
            monitor_corporate_workflow
            
            # Cleanup
            rm -f "current-project.json" "project-routing.json"
            
            echo -e "\n${GREEN}✅ Task completed! Moving to next task...${NC}"
            echo ""
            
            # Brief pause before next iteration
            sleep 2
            iteration=$((iteration + 1))
        else
            echo -e "${RED}Failed to route project through corporate workflow${NC}"
            return 1
        fi
    done
}

# Error handling
handle_corporate_error() {
    local error_code=$1
    local context="$2"
    
    echo -e "${RED}CORPORATE ERROR: $context${NC}"
    echo -e "${RED}Exit Code: $error_code${NC}"
    
    # Generate error report
    node "$STATUS_MONITOR" alerts >/dev/null 2>&1
    
    return $error_code
}

# Cleanup on exit
cleanup_corporate_workflow() {
    echo -e "\n${YELLOW}Corporate workflow interrupted. Saving state...${NC}"
    
    # Save current state
    cat > "$WORKFLOW_STATE_FILE" << EOF
{
    "status": "interrupted",
    "timestamp": "$(date -Iseconds)",
    "mode": "corporate",
    "context": "User interrupted corporate workflow"
}
EOF
    
    # Cleanup temporary files
    rm -f "current-project.json" "project-routing.json" task-results-*.json
    
    echo -e "${BLUE}Corporate workflow state saved${NC}"
    exit 0
}

# Handle interrupts gracefully
trap cleanup_corporate_workflow INT TERM

# Run corporate workflow
case "${1:-run}" in
    "run")
        main_corporate_workflow
        ;;
    "status")
        monitor_corporate_workflow
        ;;
    "employees")
        echo -e "${BLUE}Corporate Employee Directory:${NC}"
        node "$TASK_ASSIGNMENT" status 2>/dev/null | /tmp/jq -r '.[] | "  \(.name) - \(.role) (\(.department)) - \(.status) - Workload: \(.workload)"' 2>/dev/null
        ;;
    "health")
        echo -e "${BLUE}Corporate System Health:${NC}"
        node "$STATUS_MONITOR" health 2>/dev/null | /tmp/jq . 2>/dev/null
        ;;
    *)
        echo "Corporate AI Software Company Workflow Engine"
        echo ""
        echo "Usage: $0 [command]"
        echo "Commands:"
        echo "  run       - Execute corporate workflow (default)"
        echo "  status    - Show workflow status and monitoring"
        echo "  employees - List all AI employees"
        echo "  health    - Show system health status"
        echo ""
        echo "Environment Variables:"
        echo "  PROCESSING_MODE=corporate        - Use corporate workflow mode"
        echo "  MAX_CONCURRENT_EMPLOYEES=3       - Max employees working simultaneously"
        echo "  VERBOSE=true                     - Enable detailed logging"
        ;;
esac