@echo off
setlocal
cd /d "%~dp0desktop"
where npm >nul 2>nul
if errorlevel 1 (
  echo Node.js / npm nebyl nalezen.
  echo Nainstaluj Node.js LTS a spusť tento soubor znovu.
  pause
  exit /b 1
)
if not exist node_modules (
  echo Instaluji desktop zavislosti...
  call npm install
  if errorlevel 1 goto :error
)
echo Spoustim DawoMixStudio Desktop...
call npm start
exit /b %errorlevel%
:error
echo Instalace nebo spusteni selhalo.
pause
exit /b 1
