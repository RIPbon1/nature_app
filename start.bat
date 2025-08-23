@echo off
SETLOCAL
cd /d %~dp0
IF NOT EXIST node_modules (
  echo Installing dependencies...
  call npm install --no-audit --no-fund
)
echo Starting server...
call npm start
ENDLOCAL








