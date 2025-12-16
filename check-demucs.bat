@echo off
REM Check Demucs Installation Script for Windows
echo ============================================================
echo DEMUCS INSTALLATION CHECK
echo ============================================================
echo.

REM Check if Python is installed
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Python is not installed or not in PATH
    echo.
    echo Please install Python 3.8+ from: https://www.python.org/downloads/
    echo Make sure to check "Add Python to PATH" during installation!
    echo.
    pause
    exit /b 1
)

echo Python found. Running diagnostics...
echo.

REM Run Python check script
python electron\scripts\check_demucs.py
if %errorlevel% neq 0 (
    echo.
    echo ============================================================
    echo INSTALLATION GUIDE
    echo ============================================================
    echo.
    echo To install Demucs and dependencies, run:
    echo.
    echo   pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu
    echo   pip install demucs
    echo.
    echo For more details, see: STEM_SEPARATION_SETUP.md
    echo.
    pause
    exit /b 1
)

echo.
pause
