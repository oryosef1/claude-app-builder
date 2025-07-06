# Simple To-Do List Application

## Project Requirements

Build a simple to-do list web application with the following features:

### Core Features
- Add new tasks
- Mark tasks as complete/incomplete
- Delete tasks
- Filter tasks (all, active, completed)
- Task counter showing remaining items

### Technical Requirements
- **Frontend**: React with TypeScript
- **Styling**: Simple CSS (no frameworks needed)
- **Storage**: LocalStorage for persistence
- **Build Tool**: Vite for development and building

### User Stories
1. As a user, I want to add new tasks so I can track what I need to do
2. As a user, I want to mark tasks as complete so I can see my progress
3. As a user, I want to delete tasks so I can remove items I no longer need
4. As a user, I want to filter my tasks so I can focus on specific categories
5. As a user, I want my tasks to persist so they're saved when I reload the page

### Acceptance Criteria
- Clean, intuitive user interface
- Responsive design that works on desktop and mobile
- Tasks persist between browser sessions
- No external dependencies except React and TypeScript
- Include basic unit tests for core functionality

### File Structure
```
todo-app/
├── src/
│   ├── components/
│   │   ├── TodoList.tsx
│   │   ├── TodoItem.tsx
│   │   ├── AddTodo.tsx
│   │   └── FilterButtons.tsx
│   ├── hooks/
│   │   └── useTodos.ts
│   ├── types/
│   │   └── Todo.ts
│   ├── utils/
│   │   └── localStorage.ts
│   ├── App.tsx
│   ├── App.css
│   └── main.tsx
├── public/
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```