@echo off
REM ================================================================
REM Build Script DA SUA LOI: Them lenh --collect-all
REM ================================================================

echo [1/3] Checking PyInstaller...
pip show pyinstaller >nul 2>&1
if errorlevel 1 pip install pyinstaller

echo.
echo [2/3] Building Python executable...
echo Please wait... this ensures files.txt is included!

if not exist "resources" mkdir resources

REM --- ĐOẠN LỆNH ĐÃ ĐƯỢC CẬP NHẬT ---
pyinstaller ^
    --noconsole ^
    --onefile ^
    --name=demucs_engine ^
    --distpath=resources ^
    --collect-all demucs ^
    --hidden-import=numpy ^
    --hidden-import=numpy.core.multiarray ^
    --hidden-import=torch ^
    --hidden-import=demucs ^
    electron/scripts/demucs_separate.py

if errorlevel 1 (
    echo.
    echo [ERROR] Build failed!
    pause
    exit /b 1
)

echo.
echo [3/3] Cleaning up...
if exist "build" rmdir /s /q build
if exist "demucs_engine.spec" del demucs_engine.spec

echo.
echo ================================================================
echo BUILD SUCCESS! Fixed 'files.txt' error.
echo Location: resources\demucs_engine.exe
echo ================================================================
pause