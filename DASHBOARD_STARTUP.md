# Dashboard Complete Startup Guide

## Start All Services (in separate PowerShell windows):

### Window 1 - Memory API (Port 3333)
```powershell
cd "C:\Users\בית\Downloads\poe helper"
npm start
```

### Window 2 - API Bridge (Port 3002)
```powershell
cd "C:\Users\בית\Downloads\poe helper\api-bridge"
node server.js
```

### Window 3 - Dashboard Backend (Port 8080)
```powershell
cd "C:\Users\בית\Downloads\poe helper\dashboard\backend"
npm run build
node dist/index.js
```

### Window 4 - Dashboard Frontend (Port 3000)
```powershell
cd "C:\Users\בית\Downloads\poe helper\dashboard\frontend"
npm run dev
```

## Verify Services Are Running:
- Memory API: http://localhost:3333/health
- API Bridge: http://localhost:3002/health
- Dashboard Backend: http://localhost:8080/health
- Dashboard Frontend: http://localhost:3000

## Once All Services Are Running:
1. The dashboard will automatically connect to the backend
2. Employee data will load from the AI employee registry
3. You can start creating tasks and spawning processes

## To See Data in Dashboard:
1. Click on "Employees" tab to see the 13 AI employees
2. Click on "Tasks" to create and assign tasks
3. Click on "Processes" to spawn new Claude processes