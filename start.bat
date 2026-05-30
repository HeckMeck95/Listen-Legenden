@echo off
cd /d "%~dp0"

start "Listen-Legenden Server" cmd /k "node server.js"

timeout /t 2 >nul

start "" "http://localhost:3000/moderator.html"
start "" "http://localhost:3000/player.html"

exit