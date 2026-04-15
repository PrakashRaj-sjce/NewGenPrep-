"""
NewGenPrep - Database Service
Handles MongoDB connection, session CRUD, index creation, and connection pooling.
Designed for 1000-3000+ concurrent users.
"""

import os
from datetime import datetime
from typing import Dict, Any, Optional
from motor.motor_asyncio import AsyncIOMotorClient

# Module-level globals
db_client: Optional[AsyncIOMotorClient] = None
db = None

# In-memory fallback stores (development only)
sessions: Dict[str, Dict[str, Any]] = {}
users: Dict[str, Dict[str, Any]] = {}
question_sets: Dict[str, Dict[str, Any]] = {}


async def connect_db():
    """Connect to MongoDB with production-grade pool settings for 3000+ users."""
    global db_client, db

    MONGODB_URI = os.getenv("MONGODB_URI", "")
    if not MONGODB_URI:
        print("WARNING: No MONGODB_URI set. Using in-memory storage.")
        return

    try:
        db_client = AsyncIOMotorClient(
            MONGODB_URI,
            maxPoolSize=200,          # Handle burst of 3000 concurrent users
            minPoolSize=10,           # Keep warm connections ready
            maxIdleTimeMS=30000,      # Close idle connections after 30s
            connectTimeoutMS=5000,    # Fail fast on connection issues
            serverSelectionTimeoutMS=5000,
            retryWrites=True,
            retryReads=True,
        )
        db = db_client.interview_bot
        # Force a connection test
        await db_client.admin.command("ping")
        print("Connected to MongoDB (poolSize=200, minPool=10)")
    except Exception as e:
        print(f"WARNING: MongoDB connection failed: {e}. Using in-memory storage.")
        db_client = None
        db = None


async def create_indexes():
    """Create indexes for all collections. Idempotent - safe to call every startup."""
    if db is None:
        return

    try:
        # users collection
        await db.users.create_index("email", unique=True)
        await db.users.create_index("id", unique=True)
        print("  Indexes: users (email, id)")

        # sessions collection
        await db.sessions.create_index("session_id", unique=True)
        await db.sessions.create_index("user_id")
        await db.sessions.create_index("status")
        await db.sessions.create_index("created_at")
        print("  Indexes: sessions (session_id, user_id, status, created_at)")

        # schedules collection
        await db.schedules.create_index("id", unique=True)
        await db.schedules.create_index("candidateEmail")
        await db.schedules.create_index("status")
        await db.schedules.create_index("date")
        print("  Indexes: schedules (id, candidateEmail, status, date)")

        # question_sets collection
        await db.question_sets.create_index("id", unique=True)
        await db.question_sets.create_index("isActive")
        await db.question_sets.create_index("category")
        print("  Indexes: question_sets (id, isActive, category)")

        # rubrics collection
        await db.rubrics.create_index("id", unique=True)
        print("  Indexes: rubrics (id)")

        # password_resets collection (TTL index auto-deletes expired docs)
        await db.password_resets.create_index("email")
        await db.password_resets.create_index(
            "expires_at", expireAfterSeconds=0
        )
        print("  Indexes: password_resets (email, expires_at TTL)")

        print("All database indexes created successfully")
    except Exception as e:
        print(f"WARNING: Index creation error (non-fatal): {e}")


async def close_db():
    """Close MongoDB connection gracefully."""
    global db_client
    if db_client:
        db_client.close()
        print("MongoDB connection closed")


def get_db():
    """Get the database instance."""
    return db


def normalize_session(session: Dict[str, Any]) -> Dict[str, Any]:
    """Ensure all required session fields exist with defaults."""
    session.setdefault("responses", [])
    session.setdefault("questions_asked", [])
    session.setdefault("conversation_history", [])
    session.setdefault("status", "in_progress")
    session.setdefault("total_questions", 15)
    session.setdefault("question_count", 0)
    session.setdefault("current_stage", 0)
    session.setdefault("retry_count", 0)
    session.setdefault("clarification_count", 0)
    session.setdefault("answers", [])
    return session


async def get_session(session_id: str) -> Optional[Dict[str, Any]]:
    """Fetch or create a session by ID."""
    if db is not None:
        session = await db.sessions.find_one({"session_id": session_id})
        if session is None:
            new_session = {
                "session_id": session_id,
                "status": "created",
                "created_at": datetime.utcnow(),
                "current_question": 0,
                "current_stage": 0,
                "question_count": 0,
                "answers": [],
                "responses": [],
                "questions_asked": [],
                "conversation_history": [],
                "total_questions": 15,
            }
            await db.sessions.insert_one(new_session)
            return new_session

        # Backfill missing fields for older session documents
        updated_fields: Dict[str, Any] = {}
        defaults = {
            "questions_asked": [],
            "conversation_history": [],
            "responses": [],
            "answers": [],
            "total_questions": 15,
            "question_count": 0,
            "current_stage": 0,
        }
        for field, default in defaults.items():
            if field not in session:
                session[field] = default
                updated_fields[field] = default

        if updated_fields:
            await db.sessions.update_one(
                {"session_id": session_id}, {"$set": updated_fields}
            )

        return normalize_session(session)

    # In-memory fallback
    session = sessions.get(session_id)
    if session is None:
        new_session = {
            "session_id": session_id,
            "status": "created",
            "created_at": datetime.utcnow(),
            "current_question": 0,
            "current_stage": 0,
            "question_count": 0,
            "answers": [],
            "responses": [],
            "questions_asked": [],
            "conversation_history": [],
            "total_questions": 15,
        }
        sessions[session_id] = new_session
        return new_session
    return normalize_session(session)


async def save_session(session_id: str, data: Dict[str, Any]):
    """Save or update a session."""
    if db is not None:
        await db.sessions.update_one(
            {"session_id": session_id}, {"$set": data}, upsert=True
        )
    else:
        sessions[session_id] = data
