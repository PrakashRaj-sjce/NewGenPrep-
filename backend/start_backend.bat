@echo off
echo ============================================
echo   AI Interview Bot - Backend Server
echo ============================================
echo.

REM Navigate to backend directory
cd /d "%~dp0"

REM Check if venv exists
if not exist "venv\Scripts\activate.bat" (
    echo [!] Virtual environment not found. Creating one...
    python -m venv venv
    if errorlevel 1 (
        echo [ERROR] Failed to create virtual environment.
        echo Make sure Python 3.10+ is installed and on PATH.
        pause
        exit /b 1
    )
)

REM Activate virtual environment
echo [*] Activating virtual environment...
call venv\Scripts\activate.bat

REM Install/update dependencies
echo [*] Installing dependencies...
pip install -r requirements.txt --quiet

REM Check .env file
if not exist ".env" (
    echo [WARNING] .env file not found!
    echo Copy .env.example to .env and fill in your credentials.
    if exist ".env.example" (
        copy .env.example .env
        echo [*] Created .env from .env.example - please edit with your credentials.
    )
    pause
    exit /b 1
)

echo.
echo [*] Starting backend server on http://localhost:8000 ...
echo [*] Press Ctrl+C to stop
echo.

python -m uvicorn interview_api:app --host 0.0.0.0 --port 8000 --reload

pause
