@echo off
setlocal

rem Always run from this batch file's directory, even when opened by double-click.
cd /d "%~dp0"

title MealFit Frontend Server
echo ========================================
echo   MealFit Frontend Server
echo ========================================
echo.

rem Prevent a second Vite process from attempting to use the same port.
netstat -ano | findstr ":5173 " | findstr "LISTENING" >nul
if not errorlevel 1 (
    echo [INFO] Port 5173 is already in use.
    echo The frontend may already be running: http://localhost:5173
    pause
    exit /b 0
)

rem Node.js and npm must be installed or available on PATH.
where npm.cmd >nul 2>nul
if errorlevel 1 (
    echo [ERROR] npm was not found. Install Node.js or add npm to PATH.
    pause
    exit /b 1
)

if not exist "package.json" (
    echo [ERROR] package.json was not found.
    pause
    exit /b 1
)

rem Install the exact package-lock versions only when dependencies are missing.
if not exist "node_modules" (
    echo [INFO] node_modules is missing. Installing dependencies with npm ci...
    call npm.cmd ci
    if errorlevel 1 (
        echo [ERROR] Dependency installation failed.
        pause
        exit /b 1
    )
)

echo [INFO] Starting Vite on http://localhost:5173
echo [INFO] Press Ctrl+C to stop the server.
echo.

call npm.cmd run dev -- --host 0.0.0.0
set "EXIT_CODE=%ERRORLEVEL%"

echo.
if not "%EXIT_CODE%"=="0" echo [ERROR] Frontend stopped with exit code %EXIT_CODE%.
pause
exit /b %EXIT_CODE%

