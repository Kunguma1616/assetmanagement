@echo off
setlocal enabledelayedexpansion

REM Color codes for output
REM Cannot use colors in batch, so using simple text indicators

echo.
echo ========================================
echo  FLEET HEALTH MONITOR - BACKEND START
echo ========================================
echo.

REM Kill all Python processes
echo [*] Cleaning up existing Python processes...
taskkill /F /IM python.exe >nul 2>&1

REM Wait for processes to die
timeout /t 3 /nobreak

REM Check if we're in the right directory
if not exist "app.py" (
    echo [ERROR] app.py not found! 
    echo [*] Make sure you're in the backend directory
    echo [*] Usage: cd backend ^&^& start_backend.bat
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    echo [WARNING] .env file not found!
    echo [*] Creating from template...
    if exist ".env.template" (
        copy .env.template .env >nul
        echo [SUCCESS] Created .env from template
    ) else (
        echo [ERROR] .env.template not found either!
        pause
        exit /b 1
    )
)

REM Check Python installation
echo [*] Checking Python installation...
python --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Python not found!
    echo [*] Please install Python from https://www.python.org
    pause
    exit /b 1
)

python --version
echo [SUCCESS] Python is installed

REM Check required packages
echo.
echo [*] Checking required Python packages...
python -c "import fastapi" >nul 2>&1
if errorlevel 1 (
    echo [WARNING] FastAPI not installed
    echo [*] Installing dependencies...
    pip install -q -r requirements.txt
    if errorlevel 1 (
        echo [ERROR] Failed to install requirements
        pause
        exit /b 1
    )
)

REM Start the server
echo.
echo [*] Starting backend server on port 8000...
echo [*] Press CTRL+C to stop
echo.

python app.py

REM If app.py returns an error about port in use, try port 8001
if errorlevel 1 (
    echo.
    echo [ERROR] Failed to start on port 8000
    echo [*] Port may be in use. Trying port 8001...
    
    REM Modify port and try again
    python -c "
import re
with open('app.py', 'r') as f:
    content = f.read()
if 'port=8000' in content:
    content = content.replace('port=8000', 'port=8001')
    with open('app_temp.py', 'w') as f:
        f.write(content)
    print('[*] Modified app.py to use port 8001')
    print('[*] Restarting...')
"
    
    python app_temp.py
    if exist "app_temp.py" del app_temp.py
)

pause
