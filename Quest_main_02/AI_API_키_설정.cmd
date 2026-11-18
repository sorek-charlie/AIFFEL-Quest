@echo off
cd /d "%~dp0"
start "" ".venv\Scripts\pythonw.exe" -m scripts.provider_keys_setup
