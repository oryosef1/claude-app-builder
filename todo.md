# Claude App Builder Dashboard - Todo List

## High Priority - CRITICAL: CONNECT DASHBOARD TO REAL BACKEND
- [x] Initialize web dashboard project with React and TypeScript
- [x] Create main dashboard layout with sidebar navigation
- [x] Build workflow control panel (start/stop/pause workflow)
- [x] Implement real-time workflow status display
- [x] Create todo management interface (add/edit/remove tasks)
- [x] Build memory.md viewer and editor
- [x] Add workflow logs viewer with live updates
- [ ] **URGENT: Create Node.js backend API to control automated-workflow.sh**
- [ ] **URGENT: Add WebSocket/SSE for real-time communication between dashboard and workflow**
- [ ] **URGENT: Implement workflow process spawning and control (start/stop/pause)**
- [ ] **URGENT: Connect dashboard API calls to real backend endpoints**
- [ ] **URGENT: Add file operations API for todo.md and memory.md editing**
- [ ] **URGENT: Implement real-time log streaming from workflow to dashboard**

## Medium Priority
- [ ] Create project templates selector (Web App, CLI, API, etc.)
- [ ] Implement workflow configuration settings
- [ ] Add Claude role output viewer
- [ ] Build metrics dashboard (tasks completed, time taken, success rate)
- [ ] Create project file browser
- [ ] Add syntax highlighting for code viewer

## Low Priority
- [ ] Implement dark mode theme
- [ ] Add export functionality for generated projects
- [ ] Create workflow history/archive
- [ ] Build notification system for workflow events
- [ ] Add multi-project support

## Technical Requirements
- Frontend: React with TypeScript
- UI Framework: Material-UI or Tailwind CSS
- State Management: Redux or Zustand
- Backend: Node.js/Express API
- Real-time Updates: WebSockets or Server-Sent Events
- Process Management: Child process spawning for Claude CLI
- File Operations: fs module for reading/writing project files

## Acceptance Criteria
- Dashboard must control automated-workflow.sh
- Real-time status updates during workflow execution
- Easy todo.md editing with live preview
- Workflow logs must be searchable and filterable
- Clean, intuitive UI for non-technical users