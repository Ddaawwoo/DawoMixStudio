@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul || (
  echo Program potrebuje Node.js. Stahnete jej z https://nodejs.org/
  pause
  exit /b 1
)
start "Dawo Mix Studio Server" /min node server.mjs
timeout /t 1 /nobreak >nul
set "EDGE=%ProgramFiles(x86)%\Microsoft\Edge\Application\msedge.exe"
if not exist "%EDGE%" set "EDGE=%ProgramFiles%\Microsoft\Edge\Application\msedge.exe"
if exist "%EDGE%" (
  start "" "%EDGE%" --app=http://127.0.0.1:3217 --start-maximized
) else (
  start "" http://127.0.0.1:3217
)
endlocal
