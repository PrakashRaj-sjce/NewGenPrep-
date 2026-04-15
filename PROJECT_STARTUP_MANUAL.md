# Project Startup Manual

> **AI Interview Bot** — Complete step-by-step guide for testers and developers.

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [What's Included](#2-whats-included)
3. [Prerequisites](#3-prerequisites)
4. [Option A: Docker Startup (Recommended)](#4-option-a-docker-startup-recommended)
5. [Option B: Manual Startup (Local Development)](#5-option-b-manual-startup-local-development)
6. [Chrome Extension Setup](#6-chrome-extension-setup)
7. [Environment Configuration](#7-environment-configuration)
8. [Verifying Everything Works](#8-verifying-everything-works)
9. [API Endpoints Reference](#9-api-endpoints-reference)
10. [Troubleshooting](#10-troubleshooting)
11. [Stopping the Application](#11-stopping-the-application)

---

## 1. Project Overview

An AI-powered interview platform with:
- **Candidates**: Take interviews with AI-generated questions, resume analysis, and real-time evaluation
- **HR Dashboard**: Manage candidates, analytics, question sets, rubrics, and scheduling
- **Proctoring**: Tab-switch detection, webcam/screen recording, violation alerts
- **Practice Mode**: Practice with mock questions and get AI feedback
- **Email Notifications**: Automated invitations & reminders

---

## 2. What's Included

```
interview-bot-final/
├── backend/                ← Python FastAPI API server
│   ├── interview_api.py    ← Main API (40+ endpoints)
│   ├── ai_engine.py        ← Azure OpenAI integration
│   ├── auth.py             ← JWT authentication
│   ├── notification_service.py ← Email (SMTP)
│   ├── scheduler_service.py    ← Background reminders
│   ├── question_helpers.py     ← Question generation logic
│   ├── report_engine.py        ← Interview reports
│   ├── Dockerfile          ← Backend container
│   └── .env.example        ← Config template
├── frontend/               ← Next.js React UI
│   ├── app/                ← Pages (login, signup, dashboard, reports)
│   ├── components/         ← 17 React components
│   ├── Dockerfile          ← Frontend container
│   └── nginx.conf          ← Nginx reverse proxy config
├── extension/              ← Chrome Extension (proctoring)
├── docker-compose.yml      ← One-command startup
├── _previous_versions/     ← Archived old code (ignore)
└── README.md               ← Quick reference
```

---

## 3. Prerequisites

### For Docker Startup (Option A)
| Software | Version | Download |
|----------|---------|----------|
| Docker Desktop | 4.0+ | https://www.docker.com/products/docker-desktop |
| Docker Compose | v2+ | Included with Docker Desktop |

### For Manual Startup (Option B)
| Software | Version | Download |
|----------|---------|----------|
| Python | 3.10+ | https://www.python.org/downloads/ |
| Node.js | 18+ | https://nodejs.org/ |
| npm | 9+ | Comes with Node.js |
| Git | 2.0+ | https://git-scm.com/ |

### Required Accounts (Both Options)
| Service | Purpose | Setup |
|---------|---------|-------|
| MongoDB Atlas | Database | https://www.mongodb.com/cloud/atlas (free tier available) |
| Azure OpenAI | AI Engine | https://portal.azure.com → Create OpenAI resource |

---

## 4. Option A: Docker Startup (Recommended)

> **Easiest method** — runs everything in containers with one command.

### Step 1: Configure Environment

```bash
# Copy the template
cp backend/.env.example backend/.env

# Edit with your credentials (use any text editor)
notepad backend/.env        # Windows
nano backend/.env            # Linux/Mac
```

**Required values to fill in `backend/.env`:**
```env
MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/...
JWT_SECRET=<generate-a-random-64-char-string>
AZURE_OPENAI_KEY=<your-azure-key>
AZURE_OPENAI_BASE=https://<your-resource>.openai.azure.com/
```

### Step 2: Build & Start

```bash
# From the project root directory:
docker-compose up --build
```

This will:
1. Build the backend image (Python FastAPI)
2. Build the frontend image (Next.js → Nginx)
3. Start backend on `http://localhost:8000`
4. Wait for backend health check to pass
5. Start frontend on `http://localhost:3000`

### Step 3: Verify

```bash
# In a new terminal:
curl http://localhost:8000/health
# Expected: {"status":"healthy","mongodb":"connected"}

# Open browser:
# Frontend: http://localhost:3000
# API Docs: http://localhost:8000/docs
```

### Running in Background

```bash
docker-compose up --build -d        # Start in background
docker-compose logs -f              # Follow all logs
docker-compose logs -f backend      # Follow backend only
docker-compose ps                   # Check status
```

---

## 5. Option B: Manual Startup (Local Development)

### Step 1: Backend Setup

```bash
cd backend

# Create virtual environment (first time only)
python -m venv venv

# Activate virtual environment
.\venv\Scripts\activate              # Windows (PowerShell)
source venv/bin/activate             # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials (see Section 7)

# Start the server
python -m uvicorn interview_api:app --host 0.0.0.0 --port 8000 --reload
```

**Or use the startup script:**
```bash
.\start_backend.bat                  # Windows (PowerShell)
./start_backend.sh                   # Linux/Mac
```

> **Backend runs on:** `http://localhost:8000`

### Step 2: Frontend Setup

Open a **new terminal**:

```bash
cd frontend

# Install dependencies (first time only)
npm install

# Start the development server
npm run dev
```

> **Frontend runs on:** `http://localhost:3000`

### Step 3: Verify Both Are Running

1. **Backend health:** Open `http://localhost:8000/health` in browser
   - ✅ Expected: `{"status":"healthy","mongodb":"connected"}`
2. **Frontend:** Open `http://localhost:3000` in browser
   - ✅ Expected: Login page loads
3. **API Docs:** Open `http://localhost:8000/docs`
   - ✅ Expected: Swagger UI with all endpoints

---

## 6. Chrome Extension Setup

> **Optional** — for proctoring features (tab-switch detection, recording).

1. Open Chrome → Navigate to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top-right)
3. Click **"Load unpacked"**
4. Select the `extension/` folder from this project
5. Note the **Extension ID** shown (e.g., `abcdefghij...`)
6. Add it to `backend/.env`:
   ```env
   EXTENSION_ID=<your-extension-id>
   ALLOWED_EXTENSION_ORIGIN=chrome-extension://<your-extension-id>
   ```
7. Restart the backend

---

## 7. Environment Configuration

All configuration is in `backend/.env`. Here's what each variable does:

### Required (Must Configure)

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/` |
| `JWT_SECRET` | Secret key for auth tokens | Any random 32+ character string |
| `AZURE_OPENAI_KEY` | Azure OpenAI API key | `2HGmQ6uw...` |
| `AZURE_OPENAI_BASE` | Azure OpenAI endpoint | `https://your-resource.openai.azure.com/` |

### Optional (Have Defaults)

| Variable | Default | Description |
|----------|---------|-------------|
| `AZURE_OPENAI_CHAT_DEPLOYMENT` | `o4-mini` | Azure deployment name |
| `AZURE_OPENAI_API_VERSION` | `2025-01-01-preview` | API version |
| `RECORDING_STORAGE_PROVIDER` | `local` | Recording storage: `local`, `azure`, `s3` |
| `MAX_CLARIFICATION_ATTEMPTS` | `2` | Max follow-up attempts |
| `FRONTEND_URL` | `http://localhost:3000` | Frontend URL for email links |

### Email Notifications (Optional)

| Variable | Description |
|----------|-------------|
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `587` |
| `SMTP_USER` | Your email address |
| `SMTP_PASSWORD` | Gmail App Password (not regular password) |

> **Note:** If SMTP is not configured, emails will be logged to console instead of sent.

---

## 8. Verifying Everything Works

### Quick Health Checks

| Check | URL | Expected |
|-------|-----|----------|
| Backend alive | `http://localhost:8000/` | `{"message":"API is running"}` |
| Backend health | `http://localhost:8000/health` | `{"status":"healthy","mongodb":"connected"}` |
| API docs | `http://localhost:8000/docs` | Swagger UI |
| Frontend | `http://localhost:3000` | Login page |

### Test Registration & Login

1. Go to `http://localhost:3000/signup`
2. Register a new account (email, password, name)
3. Login at `http://localhost:3000/login`
4. You should see the **Dashboard**

### Test Interview Flow

1. From the dashboard, start a new interview
2. Upload a resume (PDF)
3. Answer the AI-generated questions
4. Complete the interview and view the report

### Test HR Features

1. Register with role `hr`: POST to `/api/auth/register` with `"role": "hr"`
2. Access HR dashboard: candidates, analytics, question sets, scheduling

---

## 9. API Endpoints Reference

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register (email, password, name, role) |
| POST | `/api/auth/login` | Login → JWT token |
| GET | `/api/auth/me` | Get current user |

### Interview
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/interview/upload-resume` | Upload resume PDF |
| POST | `/api/interview/start` | Start new interview |
| POST | `/api/interview/respond` | Submit answer |
| GET | `/api/interview/report/{id}` | Get report |
| POST | `/api/transcribe` | Audio → text |

### HR (requires `role: hr`)
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hr/candidates` | All candidates |
| GET | `/api/hr/analytics` | Dashboard stats |
| GET/POST/PATCH/DELETE | `/api/hr/questions` | Question sets CRUD |
| GET/POST | `/api/hr/schedule` | Interview scheduling |
| GET/POST/DELETE | `/api/hr/rubrics` | Scoring rubrics |

### Practice
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/practice/generate` | Generate practice Qs |
| POST | `/api/practice/evaluate` | Evaluate answer |
| GET | `/api/practice/mock/presets` | Mock presets |

---

## 10. Troubleshooting

### Backend won't start

| Error | Solution |
|-------|----------|
| `ModuleNotFoundError` | Run `pip install -r requirements.txt` |
| `MongoDB connection failed` | Check `MONGODB_URI` in `.env`, verify network access |
| `JWT_SECRET not found` | Ensure `.env` file exists with `JWT_SECRET` set |
| Port 8000 in use | `netstat -ano \| findstr :8000` → kill the process |

### Frontend won't start

| Error | Solution |
|-------|----------|
| `npm ERR! code ERESOLVE` | Run `npm install --legacy-peer-deps` |
| `Module not found` | Delete `node_modules`, run `npm install` again |
| Port 3000 in use | `netstat -ano \| findstr :3000` → kill the process |

### Docker Issues

| Error | Solution |
|-------|----------|
| `docker-compose: command not found` | Install Docker Desktop |
| Build fails at npm install | Check `.dockerignore` doesn't exclude `package.json` |
| Backend unhealthy | Check `docker-compose logs backend` for errors |
| Frontend can't reach backend | Ensure backend container is healthy first |

### PowerShell Issues (Windows)

| Error | Solution |
|-------|----------|
| `&&` not recognized | Use `;` instead: `cd backend; .\start_backend.bat` |
| `.bat not recognized` | Use `.\start_backend.bat` (include `.\` prefix) |
| Execution policy error | Run: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` |

---

## 11. Stopping the Application

### Docker
```bash
docker-compose down                  # Stop all containers
docker-compose down -v               # Stop + remove volumes
docker system prune -f               # Clean up unused images
```

### Manual (Local)
```bash
# Press Ctrl+C in each terminal running backend/frontend
# Or find and kill processes:
netstat -ano | findstr :8000         # Find backend PID
taskkill /PID <pid> /F               # Kill it (Windows)
```
