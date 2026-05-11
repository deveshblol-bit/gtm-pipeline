// Shared types for research module

export interface ResearchResult {
  product_summary: string
  target_customer: string
  gtm_motion: string
  positioning: string
  gtm_signal: string
  red_flags: string | null
  email_angle: string
  confidence: 'high' | 'medium' | 'low'
}