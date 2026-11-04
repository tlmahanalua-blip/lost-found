@echo off
cd /d "%~dp0"
if not exist "scripts\update-windows.mjs" (
  echo Extract the FULL ZIP first, then run this launcher from the extracted folder.
  pause
  exit /b 1
)
node scripts/update-windows.mjs
pause
