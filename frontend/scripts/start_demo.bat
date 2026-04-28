@echo off
REM Convenience wrapper to run the PowerShell demo helper from the repository root.
REM Usage: double-click or run from cmd/powershell: \"scripts\start_demo.bat\"
SET SCRIPTDIR=%~dp0
powershell -NoProfile -ExecutionPolicy Bypass -File "%SCRIPTDIR%start_demo.ps1" %*
pause
