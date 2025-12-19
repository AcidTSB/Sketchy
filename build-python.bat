@echo off
REM ================================================================
REM Build Script: Dong goi Python script thanh .exe bang PyInstaller
REM ================================================================

echo [1/4] Checking PyInstaller installation...
pip show pyinstaller >nul 2>&1
if errorlevel 1 (
    echo PyInstaller not found. Installing...
    pip install pyinstaller
)

echo.
echo [2/4] Checking dependencies (torch, demucs)...
pip show torch >nul 2>&1
if errorlevel 1 (
    echo Error: torch not installed. Please run: pip install torch
    exit /b 1
)

pip show demucs >nul 2>&1
if errorlevel 1 (
    echo Error: demucs not installed. Please run: pip install demucs
    exit /b 1
)

echo.
echo [3/4] Building Python executable with PyInstaller...
echo This may take 5-10 minutes on first run...

REM Create resources folder if not exists
if not exist "resources" mkdir resources

REM Build the Python script into standalone .exe
REM --noconsole: No console window when running
REM --onefile: Single executable file
REM --name: Output filename
REM --distpath: Output directory
REM --hidden-import: Explicitly include these modules (Demucs dependencies)
pyinstaller ^
    --noconsole ^
    --onefile ^
    --name=demucs_engine ^
    --distpath=resources ^
    --hidden-import=torch ^
    --hidden-import=demucs ^
    --hidden-import=demucs.separate ^
    --hidden-import=demucs.pretrained ^
    --hidden-import=demucs.apply ^
    --hidden-import=demucs.audio ^
    --hidden-import=torchaudio ^
    electron/scripts/demucs_separate.py

if errorlevel 1 (
    echo.
    echo [ERROR] PyInstaller build failed!
    exit /b 1
)

echo.
echo [4/4] Cleaning up build artifacts...
REM Remove unnecessary PyInstaller build files
if exist "build" rmdir /s /q build
if exist "demucs_engine.spec" del demucs_engine.spec

echo.
echo ================================================================
echo BUILD SUCCESS!
echo ================================================================
echo.
echo Python executable created at: resources\demucs_engine.exe
echo.
echo Next steps:
echo   1. Test the executable: resources\demucs_engine.exe
echo   2. Build Electron app: pnpm package:win
echo.
echo The final installer will include Python dependencies!
echo ================================================================

pause
