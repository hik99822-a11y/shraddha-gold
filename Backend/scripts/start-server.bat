@echo off
TITLE Shraddha Gold - Automated Server & Tunnel
echo =======================================================
echo 🚀 SHRADDHA GOLD WINDOWS STARTUP AUTOMATION
echo =======================================================

:: Navigate to the directory where this script is located
cd /d "%~dp0"

:: Check if Node.js is installed
node -v >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed or not in your PATH.
    echo Please install Node.js to run this server.
    pause
    exit /b
)

:: Check if Cloudflared is installed
cloudflared --version >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Cloudflared is not installed or not in your PATH.
    echo Please install Cloudflare Tunnel and add it to your PATH.
    pause
    exit /b
)

:loop
:: Run the Node.js wrapper script
echo Starting the wrapper script...
node startupHelper.cjs

:: If the script crashes or closes, restart it automatically
echo.
echo [WARNING] Script crashed or closed! Restarting in 5 seconds...
timeout /t 5
goto loop
