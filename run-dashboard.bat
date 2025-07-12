@echo off
echo Starting POE Helper Dashboard...
echo.

cd /d "C:\Users\בית\Downloads\poe helper\dashboard\backend"
start "Dashboard Backend" cmd /k npm run dev

timeout /t 3 /nobreak > nul

cd /d "C:\Users\בית\Downloads\poe helper\dashboard\frontend"
start "Dashboard Frontend" cmd /k npm run dev

echo.
echo Dashboard is starting...
echo.
echo Please wait for the services to initialize.
echo.
echo Try these URLs in your browser:
echo   http://localhost:5173
echo   http://localhost:3000
echo   http://127.0.0.1:5173
echo   http://127.0.0.1:3000
echo.
pause