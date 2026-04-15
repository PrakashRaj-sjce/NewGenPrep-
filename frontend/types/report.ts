// Interview Report type for report page
export interface InterviewReport {
  session_id: string
  interview_summary: {
    candidate_name?: string
    candidate_email?: string
    total_questions: number
    average_quality_score: number
    coverage_percentage: number
    difficulty_level: string
    duration_minutes?: number
  }
  performance_rating: string | { rating: string; description: string }
  question_breakdown?: {
    resume_questions: number
    general_questions: number
    hr_questions: number
  }
  skills_assessment: {
    detected_skills: Record<string, number>
    strongest_skills: string[]
    primary_technical_level: string
  }
  resume_analysis?: {
    projects?: string[]
    experience_level?: string
    completeness_score?: number
  }
  recommendations: string[]
  conversation_log?: Array<{
    question: {
      number: number
      text: string
      type: string
      source?: string
    }
    response?: {
      text: string
      quality_score: number
      feedback?: string
      detected_skills?: string[]
    }
  }>
}
