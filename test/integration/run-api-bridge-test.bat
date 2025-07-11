@echo off
echo Running API Bridge Integration Tests...
cd /d "C:\Users\בית\Downloads\poe helper"
powershell -ExecutionPolicy Bypass -File "test\integration\api-bridge-test.ps1"