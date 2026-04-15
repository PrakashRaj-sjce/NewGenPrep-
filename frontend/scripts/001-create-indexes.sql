-- MongoDB Index Creation Script
-- Run this in MongoDB shell or via a migration tool

-- Note: These are MongoDB commands, not SQL
-- Execute in mongo shell with: mongo interview_bot < scripts/001-create-indexes.sql

-- Create indexes for users collection
db.users.createIndex({ "email": 1 }, { unique: true });
db.users.createIndex({ "role": 1 });

-- Create indexes for sessions collection  
db.sessions.createIndex({ "sessionId": 1 }, { unique: true });
db.sessions.createIndex({ "candidateId": 1 });
db.sessions.createIndex({ "status": 1 });
db.sessions.createIndex({ "createdAt": -1 });

-- Create indexes for questionSets collection
db.questionSets.createIndex({ "category": 1 });
db.questionSets.createIndex({ "uploadedBy": 1 });
db.questionSets.createIndex({ "isActive": 1 });

-- Compound indexes for common queries
db.sessions.createIndex({ "candidateId": 1, "status": 1 });
db.sessions.createIndex({ "status": 1, "createdAt": -1 });

print("Indexes created successfully!");
