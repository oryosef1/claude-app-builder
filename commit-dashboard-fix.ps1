# Git commit script for dashboard fixes
Write-Host "Committing dashboard fixes..." -ForegroundColor Green

# Navigate to project directory
Set-Location "C:\Users\בית\Downloads\poe helper"

# Stage all changes
Write-Host "Staging changes..." -ForegroundColor Yellow
git add -A

# Create commit
Write-Host "Creating commit..." -ForegroundColor Yellow
$commitMessage = @"
Fix dashboard frontend and backend integration

- Fixed Vite installation issue by using npx in package.json scripts
- Replaced mock backend with real integrated backend  
- Fixed employee data transformation to match frontend expectations
- Added debug server for troubleshooting
- Dashboard now successfully shows all 13 AI employees
- Real-time system metrics working correctly

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
"@

git commit -m $commitMessage

Write-Host "Commit created successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "To push to remote repository, run:" -ForegroundColor Yellow
Write-Host "  git push" -ForegroundColor Cyan