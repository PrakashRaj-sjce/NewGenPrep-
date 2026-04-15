// Interview History type for candidate dashboard
export interface InterviewHistory {
  sessionId: string
  status: "pending" | "in-progress" | "completed"
  resumeFileName?: string
  startedAt: string
  completedAt?: string | null
  questionsAnswered: number
  totalQuestions: number
  averageScore: number | null
  performanceRating?: string
  strongestSkills?: string[]
}

// User Stats type for candidate dashboard
export interface UserStats {
  completedInterviews: number
  averageScore: number
  skillsImproved: number
  topSkills: string[]
  recentScores: Array<{ date: string; score: number }>
}

// Candidate type for HR dashboard
export interface Candidate {
  id: string
  name: string
  email: string
  phone?: string
  professional_summary?: string
  status: string
  score: number | null
  date?: string | null
  sessionId?: string
  totalInterviews?: number
}

// Analytics Data type for HR dashboard
export interface AnalyticsData {
  overview: {
    totalCandidates: number
    completed: number
    inProgress: number
    averageScore: number
  }
  scoreDistribution: {
    excellent: number
    good: number
    average: number
    needsImprovement: number
  }
  skillAnalysis: Array<{
    skill: string
    mentions: number
    avgScore: number
  }>
}

// Question Set type for HR dashboard
export interface QuestionSet {
  id: string
  category: string
  domain?: string
  questionCount: number
  questions?: Array<{ text: string; difficulty: string; tags?: string[]; usageCount?: number }>
  isActive: boolean
  uploadedBy: string
  createdAt: string
  updatedAt: string
}
