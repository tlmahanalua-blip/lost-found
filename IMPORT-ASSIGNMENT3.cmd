@echo off
cd /d "%~dp0"
node --env-file-if-exists=.env scripts/import-db.mjs
pause
