// Database schemas and validation for MongoDB collections
import { z } from "zod"

// User schema for registration/login
export const UserSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  name: z.string().min(2, "Name must be at least 2 characters"),
  role: z.enum(["candidate", "hr"]),
})

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
})

// Resume analysis schema
export const ResumeAnalysisSchema = z.object({
  technicalSkills: z.record(z.array(z.string())),
  experienceLevel: z.enum(["junior", "mid-level", "senior"]),
  education: z.object({
    mentions: z.array(z.string()),
    level: z.enum(["undergraduate", "graduate"]),
  }),
  completenessScore: z.number().min(0).max(100),
  projects: z.array(z.string()).optional(),
})

// Interview response schema
export const InterviewResponseSchema = z.object({
  sessionId: z.string(),
  response: z.string().min(1, "Response cannot be empty"),
})

// Question set upload schema (for HR)
export const QuestionSetSchema = z.object({
  category: z.enum(["intro", "technical", "behavioral", "hr", "domain"]),
  domain: z.string().optional(),
  questions: z.array(
    z.object({
      text: z.string().min(10, "Question must be at least 10 characters"),
      difficulty: z.enum(["beginner", "intermediate", "advanced"]),
      tags: z.array(z.string()).optional(),
    }),
  ),
})

// Type exports
export type UserInput = z.infer<typeof UserSchema>
export type LoginInput = z.infer<typeof LoginSchema>
export type ResumeAnalysis = z.infer<typeof ResumeAnalysisSchema>
export type InterviewResponse = z.infer<typeof InterviewResponseSchema>
export type QuestionSetInput = z.infer<typeof QuestionSetSchema>
