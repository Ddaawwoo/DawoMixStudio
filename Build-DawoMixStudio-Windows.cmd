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
echo Vytvarim Windows portable + installer verzi...
call npm run dist:win
if errorlevel 1 goto :error
echo.
echo HOTOVO. Vystup najdes ve slozce desktop\dist\
pause
exit /b 0
:error
echo Build selhal.
pause
exit /b 1
