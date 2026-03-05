@echo off
echo ============================================
echo  Restarting Fleet Backend Server
echo ============================================

echo [1/3] Stopping old backend process on port 8080...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr "0.0.0.0:8080"') do (
    echo     Killing PID %%a
    taskkill /F /PID %%a 2>nul
)
timeout /t 2 /nobreak >nul

echo [2/3] Starting new backend with updated code...
cd /d "%~dp0backend"
echo     Working directory: %CD%

echo [3/3] Server starting... (this window will show logs)
echo     Once you see "Application startup complete", the server is ready.
echo     Routes available:
echo       GET  /api/register-asset/ping
echo       GET  /api/register-asset/users
echo       GET  /api/register-asset/asset-types
echo       POST /api/register-asset/create
echo       GET  /api/register-asset/list
echo ============================================
echo.
python app.py
pause
