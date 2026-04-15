export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

// Types for API responses
export interface ResumeUploadResponse {
  session_id: string
  analysis: {
    technical_skills: Record<string, string[]>
    experience_level: string
    education: {
      mentions: string[]
      level: string
    }
    completeness_score: number
    projects: string[]
    soft_skills: string[]
    certifications: string[]
  }
}

export interface InterviewStartResponse {
  question: string
  question_number: number
  stage: number
  total_questions: number
  stage_info?: {
    current: string
    stages: Array<{ name: string; questions: string; description: string }>
  }
}

export interface InterviewRespondResponse {
  question: string
  question_number: number
  stage: number
  total_questions: number
  feedback?: string
  analysis?: {
    quality_score: number
    detected_skills: string[]
    confidence_level: string
  }
  is_complete?: boolean
  report?: {
    averageQualityScore: number
    coveragePercentage: number
    performanceRating: string
    strongestSkills: string[]
    recommendations: string[]
  }
  message?: string
}

export interface InterviewReport {
  interview_summary: {
    session_id: string
    candidate_name: string
    candidate_email: string
    total_questions: number
    total_responses: number
    average_quality_score: number
    coverage_percentage: number
    difficulty_level: string
    status: string
    started_at: string
    completed_at: string | null
    duration_minutes: number | null
  }
  skills_assessment: {
    detected_skills: Record<string, number>
    strongest_skills: string[]
    weakest_areas: string[]
    primary_technical_level: string
    strength_scores: Record<string, number>
  }
  recommendations: string[]
  performance_rating: {
    rating: string
    description: string
    score: number
  }
  question_breakdown: {
    resume_questions: number
    general_questions: number
    hr_questions: number
  }
  conversation_log: Array<{
    question: {
      number: number
      text: string
      type: string
      stage: number
      source: string
      asked_at: string
    }
    response: {
      text: string
      improved_text: string
      quality_score: number
      detected_skills: string[]
      confidence_level: string
      feedback: string
      responded_at: string
    } | null
  }>
  resume_analysis: {
    technical_skills: Record<string, string[]>
    experience_level: string
    education: { mentions: string[]; level: string }
    projects: string[]
    soft_skills: string[]
    certifications: string[]
    completeness_score: number
  }
}

export interface InterviewHistory {
  sessionId: string
  status: "pending" | "in-progress" | "completed"
  questionsAnswered: number
  totalQuestions: number
  averageScore: number | null
  performanceRating: string | null
  startedAt: string
  completedAt: string | null
  resumeFileName: string
  strongestSkills: string[]
}

export interface UserStats {
  totalInterviews: number
  completedInterviews: number
  inProgress: number
  averageScore: number
  topSkills: string[]
  skillsImproved: number
  recentScores: Array<{ date: string; score: number }>
  lastInterviewDate: string | null
}


export interface Schedule {
  id: string
  candidateName: string
  candidateEmail: string
  date: string
  time: string
  type: string
  duration: number
  status: string
  notes?: string
}

export interface Rubric {
  id: string
  name: string
  description: string
  competencies: Array<{ name: string; weight: number; description: string }>
  active: boolean
}

export interface Candidate {
  id: string
  name: string
  email: string
  status: string
  score: number | null
  date: string | null
  sessionId?: string
  totalInterviews: number
}

export interface AnalyticsData {
  overview: {
    totalCandidates: number
    totalInterviews: number
    inProgress: number
    completed: number
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
  performanceTrend: Array<{
    date: string
    interviews: number
    avgScore: number
  }>
}

export interface QuestionSet {
  id: string
  category: string
  domain?: string
  questionCount: number
  questions: Array<{ text: string; difficulty: string; tags: string[]; usageCount: number }>
  isActive: boolean
  uploadedBy: string
  createdAt: string
  updatedAt: string
}

// API helper class
class InterviewAPI {
  private baseUrl: string
  private authHeader(): Record<string, string> {
    if (typeof window === "undefined") return {}
    const token = localStorage.getItem("authToken")
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  constructor() {
    this.baseUrl = API_BASE_URL
  }

  // Auth: Register
  async register(data: { email: string; password: string; name: string; role: "candidate" | "hr" }) {
    const response = await fetch(`${this.baseUrl}/api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      const error = await response.json()
      // Support FastAPI 'detail' field or generic 'error' field
      throw new Error(error.detail || error.error || "Registration failed")
    }

    return response.json()
  }

  // Auth: Login
  async login(email: string, password: string) {
    const response = await fetch(`${this.baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      // Support FastAPI 'detail' field or generic 'error' field
      throw new Error(error.detail || error.error || "Login failed")
    }

    return response.json()
  }

  // Auth: Logout
  async logout() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("authToken")
    }
    await fetch(`${this.baseUrl}/api/auth/logout`, { method: "POST" })
  }

  // Auth: Get current user
  async getCurrentUser() {
    const response = await fetch(`${this.baseUrl}/api/auth/me`, {
      headers: { ...this.authHeader() },
    })

    if (response.status === 401 || response.status === 403) {
      throw new Error("Unauthorized")
    }

    if (!response.ok) {
      return null
    }

    return response.json()
  }

  // Upload resume and start session
  async uploadResume(file: File): Promise<ResumeUploadResponse> {
    const formData = new FormData()
    formData.append("resume", file)

    const response = await fetch(`${this.baseUrl}/api/interview/upload-resume`, {
      method: "POST",
      headers: { ...this.authHeader() },
      body: formData,
    })

    if (!response.ok) {
      throw new Error("Failed to upload resume")
    }

    return response.json()
  }

  // Start interview session
  async startInterview(sessionId: string): Promise<InterviewStartResponse> {
    const response = await fetch(`${this.baseUrl}/api/interview/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.authHeader() },
      body: JSON.stringify({ session_id: sessionId }),
    })

    if (!response.ok) {
      throw new Error("Failed to start interview")
    }

    return response.json()
  }

  // Send response and get next question
  async sendResponse(sessionId: string, userResponse: string): Promise<InterviewRespondResponse> {
    const response = await fetch(`${this.baseUrl}/api/interview/respond`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.authHeader() },
      body: JSON.stringify({
        session_id: sessionId,
        response: userResponse,
      }),
    })

    if (!response.ok) {
      throw new Error("Failed to send response")
    }

    return response.json()
  }

  // Get interview report
  async getReport(sessionId: string): Promise<InterviewReport> {
    const response = await fetch(`${this.baseUrl}/api/interview/report/${sessionId}`, {
      headers: { ...this.authHeader() },
    })

    if (!response.ok) {
      throw new Error("Failed to get report")
    }

    return response.json()
  }

  // Get interview history for current user
  async getInterviewHistory(): Promise<InterviewHistory[]> {
    const response = await fetch(`${this.baseUrl}/api/interview/history`, {
      headers: { ...this.authHeader() },
    })

    if (!response.ok) {
      return []
    }

    return response.json()
  }

  // Get user stats for dashboard
  async getUserStats(): Promise<UserStats> {
    const response = await fetch(`${this.baseUrl}/api/interview/stats`, {
      headers: { ...this.authHeader() },
    })

    if (!response.ok) {
      return {
        totalInterviews: 0,
        completedInterviews: 0,
        inProgress: 0,
        averageScore: 0,
        topSkills: [],
        skillsImproved: 0,
        recentScores: [],
        lastInterviewDate: null,
      }
    }

    return response.json()
  }

  // HR: Get all candidates
  async getCandidates(): Promise<Candidate[]> {
    const response = await fetch(`${this.baseUrl}/api/hr/candidates`, {
      headers: { ...this.authHeader() },
    })

    if (!response.ok) {
      return []
    }

    return response.json()
  }

  // HR: Get analytics
  async getAnalytics(): Promise<AnalyticsData> {
    const response = await fetch(`${this.baseUrl}/api/hr/analytics`, {
      headers: { ...this.authHeader() },
    })

    if (!response.ok) {
      return {
        overview: { totalCandidates: 0, totalInterviews: 0, inProgress: 0, completed: 0, averageScore: 0 },
        scoreDistribution: { excellent: 0, good: 0, average: 0, needsImprovement: 0 },
        skillAnalysis: [],
        performanceTrend: [],
      }
    }

    return response.json()
  }

  // HR: Get question sets
  async getQuestionSets(): Promise<QuestionSet[]> {
    const response = await fetch(`${this.baseUrl}/api/hr/questions`, {
      headers: { ...this.authHeader() },
    })

    if (!response.ok) {
      return []
    }

    return response.json()
  }

  // HR: Create question set
  async createQuestionSet(data: {
    category: string
    domain?: string
    questions: Array<{ text: string; difficulty: string; tags?: string[] }>
  }) {
    const response = await fetch(`${this.baseUrl}/api/hr/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.authHeader() },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error("Failed to create question set")
    }

    return response.json()
  }

  // HR: Delete question set
  async deleteQuestionSet(id: string) {
    const response = await fetch(`${this.baseUrl}/api/hr/questions?id=${id}`, {
      method: "DELETE",
      headers: { ...this.authHeader() },
    })

    if (!response.ok) {
      throw new Error("Failed to delete question set")
    }

    return response.json()
  }

  // HR: Update question set (Status or Content)
  async updateQuestionSet(id: string, updates: { isActive?: boolean; questions?: any[] }) {
    const response = await fetch(`${this.baseUrl}/api/hr/questions`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", ...this.authHeader() },
      body: JSON.stringify({ id, ...updates }),
    })

    if (!response.ok) {
      throw new Error("Failed to update question set")
    }

    return response.json()
  }

  // Legacy alias for compatibility, can be removed if all refactored
  async toggleQuestionSet(id: string, isActive: boolean) {
    return this.updateQuestionSet(id, { isActive })
  }

  // HR: Get Settings
  async getHRSettings() {
    const response = await fetch(`${this.baseUrl}/api/hr/settings`, {
      headers: { ...this.authHeader() },
    })
    if (!response.ok) return null
    return response.json()
  }

  // HR: Save Settings
  async saveHRSettings(settings: { max_questions: number; adaptive_difficulty: boolean; voice_input: boolean }) {
    const response = await fetch(`${this.baseUrl}/api/hr/settings`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.authHeader() },
      body: JSON.stringify(settings),
    })
    if (!response.ok) throw new Error("Failed to save settings")
    return response.json()
  }

  // Proctoring: Report Warning
  async reportWarning(sessionId: string, type: string, details?: string) {
    const response = await fetch(`${this.baseUrl}/api/interview/${sessionId}/warning`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.authHeader() },
      body: JSON.stringify({ type, details }),
    })
    return response.ok
  }

  // Speech-to-Text: Transcribe audio using Azure Whisper
  async transcribeAudio(audioBlob: Blob): Promise<{ success: boolean; transcription: string | null; source: string; error?: string }> {
    try {
      const formData = new FormData()
      formData.append("audio", audioBlob, "recording.webm")

      const response = await fetch(`${this.baseUrl}/api/transcribe`, {
        method: "POST",
        headers: { ...this.authHeader() },
        body: formData,
      })

      if (!response.ok) {
        return { success: false, transcription: null, source: "none", error: "Request failed" }
      }

      return response.json()
    } catch (error) {
      console.error("Transcription API error:", error)
      return { success: false, transcription: null, source: "none", error: String(error) }
    }
  }

  // HR: Get Schedules
  async getSchedules(): Promise<Schedule[]> {
    const response = await fetch(`${this.baseUrl}/api/hr/schedule`, {
      headers: { ...this.authHeader() },
    })
    if (!response.ok) return []
    return response.json()
  }

  // HR: Create Schedule
  async createSchedule(data: Omit<Schedule, "id" | "status">) {
    const response = await fetch(`${this.baseUrl}/api/hr/schedule`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.authHeader() },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error("Failed to create schedule")
    return response.json()
  }

  // Candidate: Get My Schedule
  async getMySchedule(): Promise<Schedule[]> {
    const response = await fetch(`${this.baseUrl}/api/candidate/schedule`, {
      headers: { ...this.authHeader() },
    })
    if (!response.ok) return []
    return response.json()
  }

  // HR: Update Schedule Status
  async updateScheduleStatus(id: string, status: string) {
    const response = await fetch(`${this.baseUrl}/api/hr/schedule/${id}/status?status=${status}`, {
      method: "POST",
      headers: { ...this.authHeader() },
    })
    return response.ok
  }

  // HR: Get Rubrics
  async getRubrics(): Promise<Rubric[]> {
    const response = await fetch(`${this.baseUrl}/api/hr/rubrics`, {
      headers: { ...this.authHeader() },
    })
    if (!response.ok) return []
    return response.json()
  }

  // HR: Create Rubric
  async createRubric(data: Omit<Rubric, "id">) {
    const response = await fetch(`${this.baseUrl}/api/hr/rubrics`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.authHeader() },
      body: JSON.stringify(data),
    })
    if (!response.ok) throw new Error("Failed to create rubric")
    return response.json()
  }

  // HR: Delete Rubric
  async deleteRubric(id: string) {
    const response = await fetch(`${this.baseUrl}/api/hr/rubrics/${id}`, {
      method: "DELETE",
      headers: { ...this.authHeader() },
    })
    return response.ok
  }

  // Interview: Terminate early
  async terminateInterview(sessionId: string, reason: string, violationCount?: number) {
    const response = await fetch(`${this.baseUrl}/api/interview/terminate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.authHeader() },
      body: JSON.stringify({ session_id: sessionId, reason, violation_count: violationCount }),
    })
    if (!response.ok) throw new Error("Failed to terminate interview")
    return response.json()
  }

  // Upload recording (webcam or screen)
  async uploadRecording(sessionId: string, recordingType: 'webcam' | 'screen', recordingBlob: Blob): Promise<{
    success: boolean
    storage_url?: string
    storage_provider?: string
    file_size_mb?: number
    error?: string
  }> {
    try {
      const formData = new FormData()
      const filename = `${recordingType}_recording.webm`
      formData.append('recording', recordingBlob, filename)

      const response = await fetch(
        `${this.baseUrl}/api/interview/upload-recording?session_id=${sessionId}&recording_type=${recordingType}`,
        {
          method: 'POST',
          headers: { ...this.authHeader() },
          body: formData,
        }
      )

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Upload failed' }))
        return { success: false, error: error.detail || 'Upload failed' }
      }

      const result = await response.json()
      return { success: true, ...result }
    } catch (error) {
      console.error('Recording upload error:', error)
      return { success: false, error: String(error) }
    }
  }

  // Get Calendar ICS file
  async getCalendar(sessionId: string) {
    const response = await fetch(`${this.baseUrl}/api/interview/${sessionId}/calendar`, {
      headers: { ...this.authHeader() },
    })

    if (!response.ok) {
      throw new Error("Failed to generate calendar file")
    }

    return response.blob()
  }

  // Practice Mode: Generate dynamic questions
  async generatePracticeQuestions(data: {
    category: string
    company?: string
    role?: string
    skills?: string[]
    count?: number
  }): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/api/practice/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.authHeader() },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      return []
    }

    const result = await response.json()
    return result.questions || []
  }

  // Practice Mode: Evaluate answer
  async evaluatePracticeAnswer(data: {
    question: string
    answer: string
    category: string
  }) {
    const response = await fetch(`${this.baseUrl}/api/practice/evaluate`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.authHeader() },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error("Evaluation failed")
    }

    return response.json()
  }

  // Mock Interview: Get available presets
  async getMockPresets(): Promise<Array<{
    role: string
    company: string
    difficulty: string
    question_count: number
  }>> {
    const response = await fetch(`${this.baseUrl}/api/practice/mock/presets`, {
      headers: { ...this.authHeader() },
    })

    if (!response.ok) {
      return []
    }

    const result = await response.json()
    return result.presets || []
  }

  // Mock Interview: Get questions for role & company
  async getMockQuestions(role: string, company: string): Promise<string[]> {
    const response = await fetch(`${this.baseUrl}/api/practice/mock/questions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...this.authHeader() },
      body: JSON.stringify({ role, company }),
    })

    if (!response.ok) {
      return []
    }

    const result = await response.json()
    return result.questions || []
  }

  // Round 2: Execute code in sandboxed environment
  async executeCode(language: string, code: string): Promise<{
    success: boolean
    output: string
    exit_code?: number
    stderr?: string
    error?: string
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/interview/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...this.authHeader() },
        body: JSON.stringify({ language, code }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({ detail: "Execution failed" }))
        return { success: false, output: "", error: err.detail || "Execution failed" }
      }

      return response.json()
    } catch (error) {
      return { success: false, output: "", error: String(error) }
    }
  }
}

export const api = new InterviewAPI()
