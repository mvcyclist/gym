export type GuidedSegmentType = 'warmup' | 'core' | 'mobility'

export interface GuidedRoutineChapter {
  id: string
  title: string
  startSeconds: number
  endSeconds: number
  exerciseId?: string
}

export interface GuidedRoutine {
  id: string
  title: string
  description: string
  segmentType: GuidedSegmentType
  durationSeconds: number
  audioUrl: string
  transcript: string
  chapters: GuidedRoutineChapter[]
}

export type GuidedAudioStatus = 'idle' | 'playing' | 'paused' | 'ended'
