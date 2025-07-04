# Claude App Builder API

Backend API for the Claude App Builder Dashboard system, providing REST endpoints and WebSocket communication for workflow management and file operations.

## Features

- **Workflow Management**: Start, stop, pause, and resume automated workflows
- **Real-time Communication**: WebSocket-based live updates for workflow status and logs
- **File Operations**: Full CRUD operations for todo.md and memory.md files
- **Process Management**: Spawn and control the automated-workflow.sh script
- **Logging System**: Comprehensive logging with filtering and pagination

## API Endpoints

### Workflow Management

- `GET /api/workflow/status` - Get current workflow status
- `POST /api/workflow/command` - Execute workflow command (start/stop/pause/resume)
- `GET /api/workflow/logs` - Get workflow logs with pagination
- `DELETE /api/workflow/logs` - Clear workflow logs

### File Operations

- `GET /api/files/todos` - Get all todo items
- `POST /api/files/todos` - Add new todo item
- `PUT /api/files/todos/:id` - Update todo item
- `DELETE /api/files/todos/:id` - Delete todo item
- `GET /api/files/memory` - Get memory.md content
- `PUT /api/files/memory` - Update memory.md content
- `POST /api/files/backup` - Create backup of files

### System

- `GET /health` - Health check endpoint
- `GET /api/websocket/status` - WebSocket connection status

## WebSocket Events

The API provides real-time updates through WebSocket connections:

- `workflow_status` - Workflow status changes
- `log_entry` - New log entries
- `todo_update` - Todo item changes
- `file_change` - File modification events

## Installation

```bash
npm install
```

## Development

```bash
npm run dev
```

## Production

```bash
npm run build
npm start
```

## Testing

```bash
npm test
npm run test:coverage
```

## Environment Variables

- `PORT` - Server port (default: 3001)
- `CORS_ORIGIN` - CORS origin (default: http://localhost:3000)

## Architecture

The API follows a clean architecture pattern:

- **Controllers**: Handle HTTP requests and responses
- **Services**: Business logic and external integrations
- **Routes**: API route definitions
- **Types**: TypeScript type definitions

## Integration with Dashboard

This API is designed to work with the Claude App Builder Dashboard frontend, providing:

- Complete workflow control
- Real-time status updates
- File management capabilities
- Live log streaming

## Process Management

The API can spawn and control the `automated-workflow.sh` script, providing:

- Process lifecycle management
- Output capture and parsing
- Real-time progress tracking
- Graceful shutdown handling

## Error Handling

All API endpoints return standardized error responses with:

- HTTP status codes
- Success/failure indicators
- Detailed error messages
- Timestamps

## Security

- CORS protection
- Input validation
- Error sanitization
- Graceful degradation