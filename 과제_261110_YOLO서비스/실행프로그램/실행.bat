@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
    python -m venv .venv
    if errorlevel 1 goto failed
    ".venv\Scripts\python.exe" -m pip install -r requirements.txt
    if errorlevel 1 goto failed
)
".venv\Scripts\python.exe" run.py
if errorlevel 1 goto failed
echo.
echo Completed. Results: see README.md
pause
exit /b 0
:failed
echo.
echo Execution failed. Check the error above.
pause
exit /b 1
