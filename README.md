# AI Interview Bot

An AI-powered interview platform with automated resume analysis, adaptive questioning, proctoring, and HR management dashboards.

## 🏗️ Architecture

```
interview-bot-final/
├── backend/           # FastAPI Python backend (AI engine, auth, API)
├── frontend/          # Next.js React frontend (candidate & HR dashboards)
├── extension/         # Chrome extension for interview proctoring
├── _previous_versions/ # Archived older backend iterations
└── docs               # Project reports & migration guides
```

## ⚙️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | Python 3.10+, FastAPI, Uvicorn |
| **Frontend** | Next.js 14, React, TypeScript, Tailwind CSS |
| **Database** | MongoDB Atlas (Motor async driver) |
| **AI** | Azure OpenAI (GPT-4o-mini, Whisper STT) |
| **Auth** | JWT (python-jose), Argon2 password hashing |
| **Email** | SMTP (Gmail/SendGrid) |
| **Extension** | Chrome Manifest V3 |

## 🚀 Quick Start

### Option A: Docker (Recommended)

```bash
# 1. Configure environment
cp backend/.env.example backend/.env
# Edit backend/.env with your MongoDB URI, JWT secret, and Azure OpenAI credentials

# 2. Build and start everything
docker-compose up --build

# Backend: http://localhost:8000
# Frontend: http://localhost:3000
# API Docs: http://localhost:8000/docs
```

### Option B: Manual Setup

### Prerequisites
- Python 3.10+
- Node.js 18+ & npm
- MongoDB Atlas account (or local MongoDB)
- Azure OpenAI API key

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate (Windows)
.\venv\Scripts\activate
# Activate (Linux/Mac)
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your credentials

# Start server
python -m uvicorn interview_api:app --host 0.0.0.0 --port 8000 --reload
```

Or use the startup scripts:
- **Windows**: `.\start_backend.bat`
- **Linux/Mac**: `./start_backend.sh`

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Configure environment
cp .env.example .env
# Ensure NEXT_PUBLIC_API_URL=http://localhost:8000

# Start dev server
npm run dev
```

Frontend runs on `http://localhost:3000`

### 3. Chrome Extension (Optional)

1. Open `chrome://extensions/`
2. Enable "Developer mode"
3. Click "Load unpacked" → select the `extension/` folder
4. Copy the Extension ID into `backend/.env` as `EXTENSION_ID`

## 📡 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login & get JWT |
| GET | `/api/auth/me` | Get current user |
| POST | `/api/auth/logout` | Logout |

### Interview Flow
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/interview/upload-resume` | Upload & analyze resume |
| POST | `/api/interview/start` | Start interview session |
| POST | `/api/interview/respond` | Submit answer, get next question |
| GET | `/api/interview/report/{id}` | Get interview report |
| POST | `/api/transcribe` | Audio → text (Whisper) |
| GET | `/api/interview/history` | User's interview history |
| GET | `/api/interview/stats` | User statistics |

### HR Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/hr/candidates` | List all candidates |
| GET | `/api/hr/analytics` | Dashboard analytics |
| GET/POST | `/api/hr/questions` | Manage question sets |
| GET/POST | `/api/hr/schedule` | Manage interview schedules |
| GET/POST | `/api/hr/rubrics` | Manage scoring rubrics |
| GET/POST | `/api/hr/settings` | HR configuration |

### Practice Mode
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/practice/generate` | Generate practice questions |
| POST | `/api/practice/evaluate` | Evaluate practice answer |
| GET | `/api/practice/mock/presets` | Mock interview presets |

### Health
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Backend health check |

## 🧪 Testing

```bash
cd backend

# Test password hashing
python test_hashing.py

# Test rubric scoring (requires Azure OpenAI)
python test_rubric_scoring.py

# Test API routes (requires backend running)
python test_routes.py
```

## 📁 Backend Modules

| Module | Purpose |
|--------|---------|
| `interview_api.py` | Main FastAPI application with all routes |
| `ai_engine.py` | Azure OpenAI integration (questions, evaluation, Whisper) |
| `auth.py` | JWT token creation & verification |
| `report_engine.py` | Interview report generation |
| `notification_service.py` | Email notifications (SMTP) |
| `scheduler_service.py` | Background reminder scheduler |
| `question_helpers.py` | 5-5-5 question pattern logic |

## 🔐 Environment Variables

See `backend/.env.example` for all required configuration variables.

**Required:**
- `MONGODB_URI` — MongoDB connection string
- `JWT_SECRET` — Secret key for JWT signing
- `AZURE_OPENAI_KEY` — Azure OpenAI API key
- `AZURE_OPENAI_BASE` — Azure OpenAI endpoint URL

**Optional:**
- `SMTP_USER` / `SMTP_PASSWORD` — Email notifications
- `EXTENSION_ID` — Chrome extension CORS
- `RECORDING_STORAGE_PROVIDER` — Recording storage (local/azure/s3)

## 📄 License

Proprietary — Xcelisor Plugins
