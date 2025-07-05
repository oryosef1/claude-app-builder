#!/bin/bash

# Verify Workflow Rejection Handling Fixes
# This script checks that the automated-workflow.sh contains the proper rejection loop logic

echo "🔍 Verifying Workflow Rejection Handling Fixes..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

WORKFLOW_FILE="automated-workflow.sh"
BACKUP_FILE="automated-workflow.sh.backup"

# Check if backup exists
if [ -f "$BACKUP_FILE" ]; then
    echo -e "${GREEN}✅ Backup file exists: $BACKUP_FILE${NC}"
else
    echo -e "${RED}❌ Backup file missing: $BACKUP_FILE${NC}"
fi

echo ""

# Check for Test Reviewer while loop
if grep -q "max_review_attempts=3" "$WORKFLOW_FILE" && \
   grep -q "while \[ \$review_attempt -lt \$max_review_attempts \]" "$WORKFLOW_FILE"; then
    echo -e "${GREEN}✅ Test Reviewer: Proper while loop with max_review_attempts=3${NC}"
else
    echo -e "${RED}❌ Test Reviewer: Missing proper while loop logic${NC}"
fi

# Check for Code Reviewer while loop  
if grep -q "max_code_review_attempts=3" "$WORKFLOW_FILE" && \
   grep -q "while \[ \$code_review_attempt -lt \$max_code_review_attempts \]" "$WORKFLOW_FILE"; then
    echo -e "${GREEN}✅ Code Reviewer: Proper while loop with max_code_review_attempts=3${NC}"
else
    echo -e "${RED}❌ Code Reviewer: Missing proper while loop logic${NC}"
fi

# Check for quality validation function
if grep -q "validate_phase_completion()" "$WORKFLOW_FILE"; then
    echo -e "${GREEN}✅ Quality Validation: validate_phase_completion() function exists${NC}"
else
    echo -e "${RED}❌ Quality Validation: validate_phase_completion() function missing${NC}"
fi

# Check for Coordinator validation
if grep -q "if validate_phase_completion \"coordinator\"" "$WORKFLOW_FILE"; then
    echo -e "${GREEN}✅ Coordinator: Only runs if validation passes${NC}"
else
    echo -e "${RED}❌ Coordinator: Missing validation check${NC}"
fi

# Check for max retry limits in run_claude_with_retry
if grep -q "max_retries=3" "$WORKFLOW_FILE"; then
    echo -e "${GREEN}✅ Retry Limits: max_retries=3 set consistently${NC}"
else
    echo -e "${RED}❌ Retry Limits: max_retries not set to 3${NC}"
fi

# Check for exit conditions
if grep -q "Test review failed after.*attempts. Stopping workflow" "$WORKFLOW_FILE" && \
   grep -q "Code review failed after.*attempts. Stopping workflow" "$WORKFLOW_FILE"; then
    echo -e "${GREEN}✅ Exit Conditions: Proper workflow termination on max attempts${NC}"
else
    echo -e "${RED}❌ Exit Conditions: Missing proper workflow termination${NC}"
fi

echo ""
echo -e "${BLUE}📊 Verification Complete${NC}"

# Count total checks
TOTAL_CHECKS=6
PASSED_CHECKS=$(grep -c "✅" /tmp/verify_output 2>/dev/null || echo "0")

echo ""
if [ "$PASSED_CHECKS" -eq "$TOTAL_CHECKS" ]; then
    echo -e "${GREEN}🎉 All rejection handling fixes verified successfully!${NC}"
    echo -e "${GREEN}The workflow should now properly handle rejections and stop on persistent failures.${NC}"
else
    echo -e "${YELLOW}⚠️  Some checks failed. Please review the fixes above.${NC}"
fi

echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Test with intentionally broken code to verify rejection loops work"
echo "2. Test with good code to verify success path still works"
echo "3. Monitor workflow behavior during actual execution"