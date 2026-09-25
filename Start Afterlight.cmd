@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Please install Node.js from https://nodejs.org and try again.
  pause
  exit /b 1
)
if not exist "node_modules\vite\bin\vite.js" (
  call npm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo Afterlight will be available at http://127.0.0.1:5173/
echo Keep this window open while playing. Press Ctrl+C to stop the server.
start "" "http://127.0.0.1:5173/"
call npm run dev
pause
