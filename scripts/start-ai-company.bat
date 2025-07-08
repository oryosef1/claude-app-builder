@echo off
title AI Company Startup
echo.
echo 🤖 AI Company Control Center - Starting Services...
echo.

cd /d "C:\Users\בית\Downloads\poe helper"

echo 🧠 Starting Memory API...
start "Memory API" cmd /k "npm start"
timeout /t 5 /nobreak >nul

echo 🌉 Starting API Bridge...
start "API Bridge" cmd /k "cd api-bridge && node server.js"
timeout /t 3 /nobreak >nul

echo.
echo ✅ Services started!
echo.
echo 📊 Service Health Checks:
echo    Memory API:  http://localhost:3333/health
echo    API Bridge:  http://localhost:3001/health
echo.

echo.
echo Press any key to exit...
pause >nul