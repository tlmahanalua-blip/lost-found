@echo off
cd /d "%~dp0"
echo Starting AITU Lost and Found at http://localhost:8000
echo Keep this window open. Press Ctrl+C to stop the server.
python -m http.server 8000 --bind 127.0.0.1 --directory dist
if errorlevel 1 (
  echo.
  echo Could not start the server. Check that Python is installed and available as python.
  pause
)
