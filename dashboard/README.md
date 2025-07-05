# Claude App Builder Dashboard

A React-based web dashboard for monitoring and controlling Claude automated workflows.

## Features

- **Real-time Workflow Monitoring**: Live status updates and progress tracking
- **Workflow Control**: Start, stop, pause, and resume workflow operations
- **Task Management**: View and manage todo.md tasks with status indicators
- **Live Output Console**: Terminal-style display of workflow output
- **Memory Editor**: View and edit system memory content
- **Material-UI Interface**: Professional, responsive design

## Architecture

- **Frontend**: React 18 + TypeScript + Material-UI
- **Build Tool**: Vite for fast development and building
- **Testing**: Vitest + React Testing Library
- **API Communication**: Axios for HTTP requests to backend
- **State Management**: React hooks with potential Zustand integration

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test

# Build for production
npm run build
```

## API Integration

The dashboard communicates with the Express.js backend API at `/api` endpoints:

- `GET /api/health` - Health check
- `GET /api/workflow/status` - Workflow status
- `POST /api/workflow/{start,stop,pause,resume}` - Workflow control
- `GET /api/tasks` - Task management
- `GET/PUT /api/memory` - Memory operations

## Project Structure

```
dashboard/
├── src/
│   ├── components/          # React components (future)
│   ├── services/           # API clients
│   │   └── api.ts          # Main API service
│   ├── types/              # TypeScript interfaces
│   │   ├── workflow.ts     # Workflow types
│   │   └── api.ts          # API types
│   ├── App.tsx             # Main dashboard component
│   └── main.tsx            # React entry point
├── public/                 # Static assets
├── tests/                  # Test files
└── package.json           # Dependencies and scripts
```

## Backend Requirements

This dashboard requires the Express.js API server from the `../api/` directory to be running on port 3001. The Vite dev server proxies API requests to `http://localhost:3001/api`.