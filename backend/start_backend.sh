#!/bin/bash
echo "============================================"
echo "  AI Interview Bot - Backend Server"
echo "============================================"
echo ""

# Navigate to script directory
cd "$(dirname "$0")"

# Check if venv exists
if [ ! -d "venv" ]; then
    echo "[!] Virtual environment not found. Creating one..."
    python3 -m venv venv
    if [ $? -ne 0 ]; then
        echo "[ERROR] Failed to create virtual environment."
        echo "Make sure Python 3.10+ is installed."
        exit 1
    fi
fi

# Activate virtual environment
echo "[*] Activating virtual environment..."
source venv/bin/activate

# Install/update dependencies
echo "[*] Installing dependencies..."
pip install -r requirements.txt --quiet

# Check .env file
if [ ! -f ".env" ]; then
    echo "[WARNING] .env file not found!"
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "[*] Created .env from .env.example - please edit with your credentials."
    fi
    echo "Copy .env.example to .env and fill in your credentials."
    exit 1
fi

echo ""
echo "[*] Starting backend server on http://localhost:8000 ..."
echo "[*] Press Ctrl+C to stop"
echo ""

python -m uvicorn interview_api:app --host 0.0.0.0 --port 8000 --reload
