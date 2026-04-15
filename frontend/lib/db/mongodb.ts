// MongoDB connection utility for the Interview Bot
import { MongoClient, type Db, ObjectId } from "mongodb"

const MONGODB_URI = process.env.MONGODB_URI || ""
const DB_NAME = "interview_bot"

let cachedClient: MongoClient | null = null
let cachedDb: Db | null = null

// Check if MongoDB is configured
export function isMongoConfigured(): boolean {
  return !!MONGODB_URI && MONGODB_URI.startsWith("mongodb")
}

// Connect to MongoDB
export async function connectToDatabase(): Promise<{ client: MongoClient; db: Db } | null> {
  if (!isMongoConfigured()) {
    console.log("[v0] MongoDB not configured, using demo mode")
    return null
  }

  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb }
  }

  try {
    const client = await MongoClient.connect(MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    })
    const db = client.db(DB_NAME)

    cachedClient = client
    cachedDb = db

    console.log("[v0] Connected to MongoDB:", DB_NAME)
    return { client, db }
  } catch (error) {
    console.error("[v0] MongoDB connection error:", error)
    return null
  }
}

// Collection types for type safety
export interface UserDocument {
  _id?: ObjectId
  email: string
  password: string // Hashed password
  name: string
  role: "candidate" | "hr"
  createdAt: Date
  updatedAt: Date
  profile?: {
    phone?: string
    resumeUrl?: string
    skills?: string[]
  }
  interviewStats?: {
    totalInterviews: number
    completedInterviews: number
    averageScore: number
    lastInterviewDate: Date | null
  }
}

export interface InterviewSessionDocument {
  _id?: ObjectId
  sessionId: string
  candidateId: ObjectId
  candidateName: string
  candidateEmail: string
  status: "pending" | "in-progress" | "completed"
  resumeText?: string
  resumeFileName?: string
  resumeAnalysis: {
    technicalSkills: Record<string, string[]>
    experienceLevel: string
    education: {
      mentions: string[]
      level: string
    }
    completenessScore: number
    projects: string[]
    softSkills: string[]
    certifications: string[]
  }
  questions: Array<{
    questionNumber: number
    questionText: string
    questionType: "resume" | "general" | "hr"
    stage: number
    source: "resume" | "skills" | "hr_uploaded" | "predefined"
    askedAt: Date
  }>
  responses: Array<{
    questionNumber: number
    originalResponse: string
    improvedResponse: string
    qualityScore: number
    detectedSkills: string[]
    confidenceLevel: string
    feedback: string
    respondedAt: Date
  }>
  state: {
    questionCount: number
    stage: number
    difficultyLevel: string
    engagementScore: number
    topicCoverage: Record<string, boolean>
    strengthScores: Record<string, number>
    lastResponseQuality: number
    candidateSaidTough: boolean
  }
  report?: {
    averageQualityScore: number
    coveragePercentage: number
    performanceRating: string
    ratingDescription: string
    strongestSkills: string[]
    weakestAreas: string[]
    recommendations: string[]
    questionBreakdown: {
      resumeQuestions: number
      generalQuestions: number
      hrQuestions: number
    }
    skillAnalysis: Record<string, number>
    generatedAt: Date
  }
  createdAt: Date
  updatedAt: Date
  completedAt?: Date
}

export interface QuestionSetDocument {
  _id?: ObjectId
  uploadedBy: ObjectId
  uploaderName: string
  category: "intro" | "technical" | "behavioral" | "hr" | "domain" | "resume"
  domain?: string // e.g., "devops", "frontend", "backend"
  questions: Array<{
    text: string
    difficulty: "beginner" | "intermediate" | "advanced"
    tags: string[]
    usageCount: number
  }>
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

export interface AnalyticsDocument {
  _id?: ObjectId
  date: Date
  totalInterviews: number
  completedInterviews: number
  averageScore: number
  skillMentions: Record<string, number>
  questionTypeBreakdown: Record<string, number>
}

// Get collections with type safety
export async function getCollections() {
  const connection = await connectToDatabase()

  if (!connection) {
    return null
  }

  const { db } = connection

  return {
    users: db.collection<UserDocument>("users"),
    sessions: db.collection<InterviewSessionDocument>("sessions"),
    questionSets: db.collection<QuestionSetDocument>("questionSets"),
    analytics: db.collection<AnalyticsDocument>("analytics"),
  }
}

// Helper to convert ObjectId to string
export function toObjectId(id: string): ObjectId {
  return new ObjectId(id)
}

// Create indexes for better query performance
export async function createIndexes() {
  const collections = await getCollections()

  if (!collections) {
    return
  }

  const { users, sessions, questionSets } = collections

  await users.createIndex({ email: 1 }, { unique: true })
  await sessions.createIndex({ sessionId: 1 }, { unique: true })
  await sessions.createIndex({ candidateId: 1 })
  await sessions.createIndex({ status: 1 })
  await sessions.createIndex({ createdAt: -1 })
  await questionSets.createIndex({ category: 1, isActive: 1 })

  console.log("[v0] MongoDB indexes created")
}

export { ObjectId }
