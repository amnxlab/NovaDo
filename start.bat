@echo off
REM TaskFlow - Windows Batch Wrapper
REM Calls the Python start script

python start.py
if errorlevel 1 (
    echo.
    echo Python start script failed. Make sure Python is installed.
    pause
)

