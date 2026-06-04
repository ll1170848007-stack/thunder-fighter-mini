@echo off
setlocal
cd /d "%~dp0"
echo Starting Star Raid local server...
echo Open http://localhost:8088
where python >nul 2>nul
if %errorlevel%==0 (
  python -m http.server 8088
  goto :eof
)
where py >nul 2>nul
if %errorlevel%==0 (
  py -m http.server 8088
  goto :eof
)
echo Python was not found. You can still double-click index.html to play.
pause
