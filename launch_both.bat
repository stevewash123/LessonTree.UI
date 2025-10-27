@echo off
echo ==========================================
echo     LessonTree - Full Stack Launcher
echo ==========================================
echo.
echo This will start both the API and Frontend
echo API: http://localhost:5046
echo Frontend: http://localhost:4200
echo.

:: Check if we're in the right directory
if not exist "LessonTree_API\LessonTree.Api" (
    echo ERROR: LessonTree_API folder not found!
    echo Please run this script from the LessonTree root directory.
    pause
    exit /b 1
)

if not exist "LessonTree_UI\src" (
    echo ERROR: LessonTree_UI folder not found!
    echo Please run this script from the LessonTree root directory.
    pause
    exit /b 1
)

echo Starting API server in background...
echo.

:: Start API in a new window
start "LessonTree API" cmd /k "cd LessonTree_API\LessonTree.Api && echo Building API... && dotnet build && if %ERRORLEVEL% equ 0 (echo Starting API server... && dotnet run) else (echo API build failed! && pause)"

:: Wait a moment for API to start
timeout /t 5 /nobreak > nul

echo Starting Angular frontend...
echo.

:: Navigate to frontend and start
cd LessonTree_UI

:: Check if node_modules exist
if not exist node_modules (
    echo Installing npm dependencies...
    npm install
    if %ERRORLEVEL% neq 0 (
        echo ERROR: npm install failed!
        pause
        exit /b 1
    )
)

echo Building and starting Angular development server...
echo This will open your browser automatically when ready.
echo.

:: Start Angular dev server
ng serve --open

echo.
echo Both services have been started!
echo - API: http://localhost:5046 (check the API window)
echo - Frontend: http://localhost:4200
echo.
echo Close this window or press Ctrl+C to stop the frontend.
echo Close the API window separately to stop the backend.
pause