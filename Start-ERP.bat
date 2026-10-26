@echo off
setlocal
title Radhika Jewellers ERP
cd /d "%~dp0"

echo ===================================================
echo     Radhika Jewellers - Gold Loan ERP Launcher
echo ===================================================
echo.

echo [1/3] Clearing stale dev caches to prevent 404 bugs...
if exist "frontend\.next\dev" (
    rd /s /q "frontend\.next\dev" 2>nul
)

echo [2/3] Starting backend (5000) and frontend (3001)...
start "Radhika ERP Server" cmd /c "npm run dev"

echo [3/3] Waiting for servers to initialize...
timeout /t 6 /nobreak >nul

echo Opening ERP in browser...
start "" http://localhost:3001

echo.
echo ERP is running! Keep this window open or minimize it.
echo.
pause
