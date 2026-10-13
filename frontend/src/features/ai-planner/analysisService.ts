export type AnalysisProgress = { percent: number; message: string }

export type GeneratedTaskProposal = {
  sourceId: number
  title: string
  module: string
  startDate: string
  endDate: string
  priority: 'low' | 'medium' | 'high'
  estimateHours: number
  dependencySourceIds: number[]
}

export type GeneratedMilestoneProposal = { title: string; date: string }

export type DocumentPlanProposal = {
  requirements: string[]
  tasks: GeneratedTaskProposal[]
  milestones: GeneratedMilestoneProposal[]
  risks: string[]
  assumptions: string[]
}

export interface DocumentAnalysisService {
  analyze(file: File, onProgress: (progress: AnalysisProgress) => void): Promise<DocumentPlanProposal>
}

// There is no document-analysis endpoint or configured AI provider in the current project.
export const documentAnalysisService: DocumentAnalysisService | null = null
