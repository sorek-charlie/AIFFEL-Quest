@echo off
cd /d "%~dp0"
where python >nul 2>nul
if errorlevel 1 (
 echo Python 3 is required.
 pause
 exit /b 1
)
python launch_demo.py
