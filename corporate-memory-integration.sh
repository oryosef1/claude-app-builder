#!/bin/bash

# Corporate Memory Integration Functions
# Integrates with Memory API for context loading and persistence

# Load memory API configuration
MEMORY_API_URL=${MEMORY_API_URL:-"http://localhost:3333"}
MEMORY_API_KEY=${PINECONE_API_KEY:-""}

# Load relevant context for an employee before task execution
load_employee_context() {
    local employee_id="$1"
    local task_description="$2"
    local max_memories=${3:-5}
    
    # Skip if memory API is not available
    if ! curl -s -f "${MEMORY_API_URL}/health" >/dev/null 2>&1; then
        echo "MEMORY CONTEXT: Memory API unavailable. Proceeding without context."
        return 0
    fi
    
    # Query for relevant memories
    local query_payload=$(cat <<EOF
{
    "namespace": "${employee_id}",
    "query": "${task_description}",
    "topK": ${max_memories},
    "includeMetadata": true
}
EOF
    )
    
    local memories=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "X-API-Key: ${MEMORY_API_KEY}" \
        -d "${query_payload}" \
        "${MEMORY_API_URL}/api/memory/query" 2>/dev/null)
    
    if [ $? -eq 0 ] && [ -n "$memories" ]; then
        # Format memories for context
        echo "RELEVANT MEMORY CONTEXT:"
        echo "$memories" | jq -r '.memories[]? | "- [\(.metadata.timestamp)] \(.content)"' 2>/dev/null || echo "No previous memories found."
        echo ""
    else
        echo "MEMORY CONTEXT: No relevant memories found for this task."
    fi
}

# Store employee output as memory for future reference
store_employee_memory() {
    local employee_id="$1"
    local task_description="$2"
    local ai_output="$3"
    local success="$4"
    local duration="$5"
    
    # Skip if memory API is not available
    if ! curl -s -f "${MEMORY_API_URL}/health" >/dev/null 2>&1; then
        return 0
    fi
    
    # Create memory payload
    local memory_payload=$(cat <<EOF
{
    "namespace": "${employee_id}",
    "content": "Task: ${task_description}\n\nResult: ${ai_output:0:2000}",
    "metadata": {
        "type": "task_execution",
        "task": "${task_description}",
        "success": ${success},
        "duration": ${duration},
        "timestamp": "$(date -Iseconds)",
        "employee_id": "${employee_id}"
    }
}
EOF
    )
    
    # Store memory
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "X-API-Key: ${MEMORY_API_KEY}" \
        -d "${memory_payload}" \
        "${MEMORY_API_URL}/api/memory/store" >/dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        return 0
    else
        return 1
    fi
}

# Bulk load memories for a team
load_team_context() {
    local team_members=("$@")
    local task_description="${team_members[-1]}"
    unset 'team_members[-1]'
    
    echo "TEAM MEMORY CONTEXT:"
    for member in "${team_members[@]}"; do
        echo "=== $member ==="
        load_employee_context "$member" "$task_description" 3
    done
}

# Search across all employee memories
search_company_memory() {
    local search_query="$1"
    local limit=${2:-10}
    
    if ! curl -s -f "${MEMORY_API_URL}/health" >/dev/null 2>&1; then
        echo "Memory API unavailable"
        return 1
    fi
    
    # Search across all namespaces
    local search_payload=$(cat <<EOF
{
    "query": "${search_query}",
    "topK": ${limit},
    "includeAllNamespaces": true
}
EOF
    )
    
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "X-API-Key: ${MEMORY_API_KEY}" \
        -d "${search_payload}" \
        "${MEMORY_API_URL}/api/memory/search"
}

# Get employee performance history from memory
get_employee_history() {
    local employee_id="$1"
    local days=${2:-7}
    
    if ! curl -s -f "${MEMORY_API_URL}/health" >/dev/null 2>&1; then
        echo "Memory API unavailable"
        return 1
    fi
    
    # Get recent memories for employee
    local history_payload=$(cat <<EOF
{
    "namespace": "${employee_id}",
    "filter": {
        "type": "task_execution",
        "timestamp": {
            "\$gte": "$(date -d "${days} days ago" -Iseconds)"
        }
    },
    "limit": 50
}
EOF
    )
    
    curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "X-API-Key: ${MEMORY_API_KEY}" \
        -d "${history_payload}" \
        "${MEMORY_API_URL}/api/memory/list"
}

# Export these functions
export -f load_employee_context
export -f store_employee_memory
export -f load_team_context
export -f search_company_memory
export -f get_employee_history