@echo off
chcp 65001 >nul 2>&1
setlocal enabledelayedexpansion

echo ========================================
echo   AI Writing Tool - Build & Release
echo ========================================
echo.

cd /d "%~dp0"

node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Node.js not found. Please install Node.js first.
    echo Download: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

echo [INFO] Node.js version:
node --version
echo.

echo [Step 1/5] Configuring environment...
set ELECTRON_CACHE=%~dp0.electron-cache
set ELECTRON_MIRROR=https://npmmirror.com/mirrors/electron/
set ELECTRON_BUILDER_BINARIES_MIRROR=https://npmmirror.com/mirrors/electron-builder-binaries/
set PATH=C:\Windows\System32;C:\Windows\System32\WindowsPowerShell\v1.0;C:\Program Files\PowerShell\7;%PATH%

if exist "%~dp0.env" (
    for /f "usebackq tokens=1,* delims==" %%i in ("%~dp0.env") do (
        if "%%i"=="GH_TOKEN" set "GH_TOKEN=%%j"
    )
    echo GitHub Token: loaded from .env
) else (
    echo GitHub Token: .env file not found
)

echo.
echo Choose action:
echo   1. Build only (local test)
echo   2. Build and release to GitHub (auto-update)
echo.
set "choice="
set /p "choice=Enter choice (1/2): "

if "%choice%"=="1" goto :build_local
if "%choice%"=="2" goto :build_release

echo Invalid choice
pause
exit /b 1

:build_local
echo.
echo [Step 2/5] Cleaning old build...
if exist "%~dp0dist" rmdir /s /q "%~dp0dist"
echo [Step 3/5] Building...
call npm run build
goto :check_result

:build_release
if "%GH_TOKEN%"=="" (
    echo.
    echo [ERROR] GitHub Token not configured!
    echo Create a .env file in the project root with:
    echo   GH_TOKEN=ghp_your_token_here
    echo.
    pause
    exit /b 1
)
echo.
echo [Step 2/5] Cleaning old build...
if exist "%~dp0dist" rmdir /s /q "%~dp0dist"
echo [Step 3/5] Building and releasing to GitHub...
set "GH_TOKEN=%GH_TOKEN%"
call npm run release
goto :check_result

:check_result
if %ERRORLEVEL% EQU 0 (
    echo.
    echo [Step 4/5] Build success!
    echo Installer: dist\AI Writing Tool Setup *.exe
    echo Portable:  dist\win-unpacked\AI Writing Tool.exe
    echo.
    if "%choice%"=="2" (
        echo [Step 5/5] Released to GitHub Releases!
        echo Users will get auto-update prompt on app start.
        echo.
        echo View: https://github.com/xingling80/Ai-writing-tool/releases
    ) else (
        echo [Step 5/5] Remember to bump version in package.json before release
    )
    echo.
) else (
    echo.
    echo [ERROR] Build failed. Check error messages above.
    echo.
    echo Common issues:
    echo   1. Network timeout - check proxy or internet connection
    echo   2. File in use - close AI Writing Tool before building
    echo   3. Invalid token - check GH_TOKEN in .env
    echo   4. Missing deps - run "npm install" first
)

echo.
pause
endlocal