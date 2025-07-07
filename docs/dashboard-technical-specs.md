# Master Control Dashboard - Technical Specifications

## 🏗️ Technical Architecture

### Frontend Stack
```
React 18.2.0 + TypeScript 5.0.0
├── State Management: Zustand 4.4.0
├── UI Framework: Material-UI 5.14.0
├── Styling: Emotion + CSS-in-JS
├── Build Tool: Vite 4.4.0
├── Testing: Vitest + React Testing Library
└── Real-time: Socket.IO Client 4.7.0
```

### Backend Integration
```
Memory API (Node.js + Express)
├── Port: 3333
├── Endpoints: /api/memory/* (8 endpoints)
├── WebSocket: Real-time updates
└── Authentication: Corporate session tokens

Corporate Workflow (Bash + Node.js)
├── Employee Registry: ai-employees/employee-registry.json
├── Performance Tracker: ai-employees/performance-tracker.js
├── Status Monitor: ai-employees/status-monitor.js
└── Task Assignment: ai-employees/task-assignment.js
```

## 📁 Project Structure

### Dashboard Application Directory
```
dashboard/
├── public/
│   ├── favicon.ico
│   ├── logo-192.png
│   ├── logo-512.png
│   └── manifest.json
├── src/
│   ├── components/
│   │   ├── common/
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   └── StatusIndicator.tsx
│   │   ├── layout/
│   │   │   ├── Header.tsx
│   │   │   ├── Navigation.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── Footer.tsx
│   │   ├── dashboard/
│   │   │   ├── SystemHealth.tsx
│   │   │   ├── EmployeeGrid.tsx
│   │   │   ├── MemoryOverview.tsx
│   │   │   ├── WorkflowQueue.tsx
│   │   │   └── PerformanceMetrics.tsx
│   │   ├── employees/
│   │   │   ├── EmployeeCard.tsx
│   │   │   ├── EmployeeDetail.tsx
│   │   │   ├── DepartmentView.tsx
│   │   │   └── TaskAssignment.tsx
│   │   ├── memory/
│   │   │   ├── MemoryDashboard.tsx
│   │   │   ├── MemoryDistribution.tsx
│   │   │   ├── MemorySearch.tsx
│   │   │   └── MemoryAnalytics.tsx
│   │   └── workflows/
│   │       ├── WorkflowControl.tsx
│   │       ├── ActiveWorkflows.tsx
│   │       └── WorkflowTemplates.tsx
│   ├── pages/
│   │   ├── Dashboard.tsx
│   │   ├── Employees.tsx
│   │   ├── Memory.tsx
│   │   ├── Workflows.tsx
│   │   ├── Analytics.tsx
│   │   └── Settings.tsx
│   ├── hooks/
│   │   ├── useApi.ts
│   │   ├── useWebSocket.ts
│   │   ├── useLocalStorage.ts
│   │   ├── useEmployees.ts
│   │   ├── useMemory.ts
│   │   └── usePerformance.ts
│   ├── services/
│   │   ├── api.ts
│   │   ├── websocket.ts
│   │   ├── employees.ts
│   │   ├── memory.ts
│   │   └── workflows.ts
│   ├── stores/
│   │   ├── dashboardStore.ts
│   │   ├── employeeStore.ts
│   │   ├── memoryStore.ts
│   │   └── workflowStore.ts
│   ├── types/
│   │   ├── employee.ts
│   │   ├── memory.ts
│   │   ├── workflow.ts
│   │   ├── performance.ts
│   │   └── api.ts
│   ├── utils/
│   │   ├── formatting.ts
│   │   ├── validation.ts
│   │   ├── constants.ts
│   │   └── helpers.ts
│   ├── styles/
│   │   ├── theme.ts
│   │   ├── globals.css
│   │   └── components.css
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── package.json
├── tsconfig.json
├── vite.config.ts
├── tailwind.config.js
└── README.md
```

## 🔌 API Integration Specifications

### Memory API Endpoints
```typescript
// Base URL: http://localhost:3333/api/memory

interface MemoryStats {
  totalMemories: number;
  activeNamespaces: number;
  storageUsed: string;
  growthRate: string;
  searchAccuracy: number;
  contextLoadTime: number;
}

// GET /api/memory/stats/:employeeId
getEmployeeMemoryStats(employeeId: string): Promise<MemoryStats>

// GET /api/memory/analytics
getMemoryAnalytics(): Promise<{
  distribution: EmployeeMemoryDistribution[];
  types: MemoryTypeBreakdown;
  recentActivity: MemoryActivity[];
}>

// POST /api/memory/search
searchMemories(query: {
  text: string;
  employeeId?: string;
  memoryTypes?: string[];
  limit?: number;
  relevanceThreshold?: number;
}): Promise<MemorySearchResult[]>
```

### Employee Management APIs
```typescript
// Corporate workflow integration

interface Employee {
  id: string;
  name: string;
  role: string;
  department: string;
  level: string;
  status: 'active' | 'busy' | 'offline';
  workload: number; // 0-100 percentage
  currentTasks: Task[];
  performanceMetrics: PerformanceMetrics;
}

// Read from ai-employees/employee-registry.json
getEmployees(): Promise<Employee[]>

// Execute via corporate-workflow.sh
assignTask(employeeId: string, task: TaskAssignment): Promise<boolean>

// Read from ai-employees/performance-metrics.json
getPerformanceMetrics(employeeId?: string): Promise<PerformanceMetrics>
```

### Real-time WebSocket Events
```typescript
// WebSocket connection: ws://localhost:3333

interface WebSocketEvents {
  // System health updates
  'health:update': SystemHealthStatus;
  
  // Employee status changes
  'employee:status': { employeeId: string; status: EmployeeStatus };
  'employee:workload': { employeeId: string; workload: number };
  'employee:task:update': { employeeId: string; task: TaskUpdate };
  
  // Memory system events
  'memory:new': { employeeId: string; memory: MemoryRecord };
  'memory:search': { query: string; results: number };
  'memory:cleanup': { archived: number; deleted: number };
  
  // Workflow events
  'workflow:start': WorkflowInfo;
  'workflow:complete': WorkflowInfo;
  'workflow:error': { workflowId: string; error: string };
}
```

## 🎨 Component Specifications

### Core Components

#### SystemHealth.tsx
```typescript
interface SystemHealthProps {
  refreshInterval?: number; // Default: 30 seconds
  showDetails?: boolean;
}

interface SystemHealthData {
  overall: number; // 0-100 score
  services: {
    memoryApi: ServiceStatus;
    vectorDatabase: ServiceStatus;
    corporateWorkflow: ServiceStatus;
    redisCache: ServiceStatus;
  };
  performance: {
    cpuUsage: number;
    memoryUsage: number;
    diskIO: number;
    networkIO: number;
  };
}

const SystemHealth: React.FC<SystemHealthProps> = ({
  refreshInterval = 30000,
  showDetails = false
}) => {
  // Real-time health monitoring component
  // Color-coded status indicators
  // Click to expand detailed metrics
}
```

#### EmployeeGrid.tsx
```typescript
interface EmployeeGridProps {
  groupBy?: 'department' | 'role' | 'status';
  showWorkload?: boolean;
  showPerformance?: boolean;
  onEmployeeClick?: (employee: Employee) => void;
}

const EmployeeGrid: React.FC<EmployeeGridProps> = ({
  groupBy = 'department',
  showWorkload = true,
  showPerformance = false,
  onEmployeeClick
}) => {
  // 4-column department layout
  // Real-time status indicators
  // Workload progress bars
  // Click handler for employee details
}
```

#### MemoryOverview.tsx
```typescript
interface MemoryOverviewProps {
  showDistribution?: boolean;
  showGrowthTrend?: boolean;
  timeRange?: '24h' | '7d' | '30d';
}

const MemoryOverview: React.FC<MemoryOverviewProps> = ({
  showDistribution = true,
  showGrowthTrend = false,
  timeRange = '24h'
}) => {
  // Memory usage statistics
  // Employee distribution chart
  // Growth trend visualization
  // Quick cleanup actions
}
```

### Advanced Components

#### EmployeeDetail.tsx (Modal)
```typescript
interface EmployeeDetailProps {
  employee: Employee;
  isOpen: boolean;
  onClose: () => void;
  onTaskAssign?: (task: TaskAssignment) => void;
}

const EmployeeDetail: React.FC<EmployeeDetailProps> = ({
  employee,
  isOpen,
  onClose,
  onTaskAssign
}) => {
  // Full employee profile
  // Performance metrics visualization
  // Memory analytics for employee
  // Task assignment interface
  // Recent activity timeline
}
```

#### MemorySearch.tsx
```typescript
interface MemorySearchProps {
  initialQuery?: string;
  onResultSelect?: (memory: MemoryRecord) => void;
  filters?: MemorySearchFilters;
}

const MemorySearch: React.FC<MemorySearchProps> = ({
  initialQuery = '',
  onResultSelect,
  filters = {}
}) => {
  // Search input with autocomplete
  // Advanced filter options
  // Real-time search results
  // Result preview and selection
  // Search history and suggestions
}
```

## 📊 State Management

### Zustand Store Structure
```typescript
// stores/dashboardStore.ts
interface DashboardStore {
  // System state
  systemHealth: SystemHealthData | null;
  isLoading: boolean;
  error: string | null;
  
  // UI state
  selectedEmployee: Employee | null;
  activeModal: 'employee' | 'memory' | 'workflow' | null;
  filters: {
    department?: string;
    status?: string;
    timeRange?: string;
  };
  
  // Actions
  setSystemHealth: (health: SystemHealthData) => void;
  setSelectedEmployee: (employee: Employee | null) => void;
  setActiveModal: (modal: string | null) => void;
  updateFilters: (filters: Partial<Filters>) => void;
  refreshData: () => Promise<void>;
}

// stores/employeeStore.ts
interface EmployeeStore {
  employees: Employee[];
  departments: Department[];
  performanceMetrics: PerformanceMetrics[];
  
  // Actions
  loadEmployees: () => Promise<void>;
  updateEmployeeStatus: (id: string, status: EmployeeStatus) => void;
  assignTask: (employeeId: string, task: TaskAssignment) => Promise<boolean>;
  getEmployeesByDepartment: (dept: string) => Employee[];
}

// stores/memoryStore.ts
interface MemoryStore {
  stats: MemoryStats | null;
  distribution: EmployeeMemoryDistribution[];
  searchResults: MemorySearchResult[];
  recentActivity: MemoryActivity[];
  
  // Actions
  loadMemoryStats: () => Promise<void>;
  searchMemories: (query: MemorySearchQuery) => Promise<void>;
  clearSearch: () => void;
  refreshMemoryData: () => Promise<void>;
}
```

## 🔒 Security & Authentication

### Session Management
```typescript
interface AuthConfig {
  sessionTimeout: number; // 8 hours
  refreshInterval: number; // 15 minutes
  corporateToken: string; // From environment
}

// Corporate workflow integration
const authService = {
  validateSession: (): boolean => {
    // Check corporate session validity
    // Validate against employee registry
    // Return authentication status
  },
  
  getCurrentUser: (): Employee | null => {
    // Get current user from session
    // Return employee profile
  },
  
  hasPermission: (action: string, resource: string): boolean => {
    // Check role-based permissions
    // Corporate hierarchy validation
  }
};
```

### Data Protection
```typescript
// Sensitive data handling
const dataProtection = {
  sanitizeEmployeeData: (employee: Employee): PublicEmployee => {
    // Remove sensitive performance details
    // Filter based on user permissions
    // Return safe employee data
  },
  
  encryptLocalStorage: (data: any): string => {
    // Encrypt before storing locally
    // Use corporate encryption standards
  },
  
  validateApiResponse: (response: any): boolean => {
    // Validate API response structure
    // Check for injection attempts
    // Ensure data integrity
  }
};
```

## ⚡ Performance Optimization

### Loading Strategy
```typescript
// Code splitting and lazy loading
const LazyEmployeeDetail = React.lazy(() => import('./components/employees/EmployeeDetail'));
const LazyMemoryDashboard = React.lazy(() => import('./pages/Memory'));
const LazyAnalytics = React.lazy(() => import('./pages/Analytics'));

// Preloading critical data
const usePreloadData = () => {
  useEffect(() => {
    // Preload employee registry
    employeeStore.loadEmployees();
    
    // Preload system health
    dashboardStore.refreshData();
    
    // Preload memory stats
    memoryStore.loadMemoryStats();
  }, []);
};
```

### Caching Strategy
```typescript
// React Query for server state
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000, // 30 seconds
      cacheTime: 300000, // 5 minutes
      retry: 2,
      refetchOnWindowFocus: false,
    },
  },
});

// Custom hooks with caching
const useEmployees = () => {
  return useQuery({
    queryKey: ['employees'],
    queryFn: employeeService.getEmployees,
    staleTime: 60000, // 1 minute
  });
};

const useSystemHealth = () => {
  return useQuery({
    queryKey: ['system-health'],
    queryFn: systemService.getHealth,
    refetchInterval: 30000, // 30 seconds
  });
};
```

### Bundle Optimization
```typescript
// vite.config.ts
export default defineConfig({
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@mui/material', '@emotion/react'],
          charts: ['recharts', 'd3'],
          utils: ['lodash', 'date-fns'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
  plugins: [
    react(),
    // Bundle analyzer for optimization
    analyzer(),
  ],
});
```

## 🧪 Testing Strategy

### Unit Testing
```typescript
// components/dashboard/SystemHealth.test.tsx
describe('SystemHealth Component', () => {
  it('displays health score correctly', () => {
    const mockHealth = { overall: 85, services: {...} };
    render(<SystemHealth />);
    
    expect(screen.getByText('85/100')).toBeInTheDocument();
    expect(screen.getByText('Operational')).toBeInTheDocument();
  });
  
  it('updates in real-time', async () => {
    // Test WebSocket updates
    // Verify component re-renders
    // Check performance metrics
  });
});
```

### Integration Testing
```typescript
// tests/integration/dashboard.test.tsx
describe('Dashboard Integration', () => {
  it('loads all components successfully', async () => {
    // Mock API responses
    // Render full dashboard
    // Verify all sections load
    // Check real-time updates
  });
  
  it('handles employee assignment flow', async () => {
    // Test complete user flow
    // Employee selection
    // Task assignment
    // Confirmation
  });
});
```

### E2E Testing
```typescript
// tests/e2e/dashboard.spec.ts
test('executive overview workflow', async ({ page }) => {
  await page.goto('/dashboard');
  
  // Wait for dashboard to load
  await expect(page.locator('[data-testid="system-health"]')).toBeVisible();
  
  // Check employee status
  await page.click('[data-testid="development-department"]');
  
  // Verify employee details modal
  await page.click('[data-testid="employee-sam"]');
  await expect(page.locator('[data-testid="employee-detail-modal"]')).toBeVisible();
  
  // Test task assignment
  await page.click('[data-testid="assign-task-button"]');
  await page.fill('[data-testid="task-description"]', 'Update documentation');
  await page.click('[data-testid="assign-button"]');
  
  // Verify assignment success
  await expect(page.locator('[data-testid="success-message"]')).toBeVisible();
});
```

---

*Technical Specifications by Quinn UI/UX Designer*
*Prototype Phase: Task 6.6 - Master Control Dashboard*
*Architecture: React + TypeScript + Material-UI + Zustand*
*Integration: Memory API + Corporate Workflow + WebSocket*