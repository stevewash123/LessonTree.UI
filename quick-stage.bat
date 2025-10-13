@echo off
echo ======================================
echo Quick LessonTree Staging Script
echo ======================================

REM Kill any existing processes on these ports
echo Cleaning up existing processes...
taskkill /F /IM node.exe 2>nul
taskkill /F /IM dotnet.exe 2>nul
netstat -ano | findstr :4200 | for /f "tokens=5" %%a in ('more') do taskkill /F /PID %%a 2>nul
netstat -ano | findstr :5046 | for /f "tokens=5" %%a in ('more') do taskkill /F /PID %%a 2>nul
timeout /t 3 >nul

REM Ensure Windows-compatible dependencies are installed
echo Checking and installing Windows dependencies...
cd /d C:\Projects\LessonTree\LessonTree_UI
if not exist "node_modules\@esbuild\win32-x64" (
    echo Installing Windows-specific binaries...
    npm install --force
)

REM Start both servers in parallel
echo Starting API and UI servers...
start "LessonTree API" cmd /k "cd /d C:\Projects\LessonTree\LessonTree_API\LessonTree.Api && dotnet run --urls http://0.0.0.0:5046"
start "LessonTree UI" cmd /k "cd /d C:\Projects\LessonTree\LessonTree_UI && ng serve --host 0.0.0.0 --port 4200 --ssl false --hmr --live-reload --watch --poll 1000"

REM Give both services a moment to initialize
timeout /t 3 >nul

echo.
echo ======================================
echo Services starting...
echo API:  http://localhost:5046
echo UI:   http://localhost:4200
echo ======================================
echo.
echo Wait 30-45 seconds for Angular compilation to complete
echo Then open Chrome and navigate to: http://localhost:4200
echo.
pause