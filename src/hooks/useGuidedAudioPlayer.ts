import { useCallback, useEffect, useRef, useState } from 'react'
import { getChapterAtTime, getNextChapter } from '../utils/guidedRoutineChapters'
import type { GuidedAudioStatus, GuidedRoutine } from '../types/guidedRoutine'

interface UseGuidedAudioPlayerOptions {
  routine: GuidedRoutine
  /** Applied once when the audio element is created (resume). Not updated during playback. */
  resumePositionSeconds: number
  muted: boolean
  onPlaybackPositionChange?: (seconds: number) => void
  onComplete?: (durationSeconds: number) => void
}

interface UseGuidedAudioPlayerReturn {
  status: GuidedAudioStatus
  currentTime: number
  currentChapterTitle: string
  nextChapterTitle: string | null
  play: () => void
  pause: () => void
  restart: () => void
  seek: (seconds: number) => void
  error: string | null
}

function resolveAudioUrl(url: string): string {
  if (url.startsWith('http') || url.startsWith('blob:')) return url
  const base = import.meta.env.BASE_URL
  const path = url.startsWith('/') ? url.slice(1) : url
  return `${base}${path}`
}

export function useGuidedAudioPlayer({
  routine,
  resumePositionSeconds,
  muted,
  onPlaybackPositionChange,
  onComplete,
}: UseGuidedAudioPlayerOptions): UseGuidedAudioPlayerReturn {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const pendingPlayRef = useRef(false)
  const resumePositionRef = useRef(resumePositionSeconds)
  const [status, setStatus] = useState<GuidedAudioStatus>('idle')
  const [currentTime, setCurrentTime] = useState(resumePositionSeconds)
  const [error, setError] = useState<string | null>(null)
  const completedRef = useRef(false)
  const onCompleteRef = useRef(onComplete)
  const onPositionChangeRef = useRef(onPlaybackPositionChange)

  useEffect(() => {
    onCompleteRef.current = onComplete
  }, [onComplete])

  useEffect(() => {
    onPositionChangeRef.current = onPlaybackPositionChange
  }, [onPlaybackPositionChange])

  useEffect(() => {
    resumePositionRef.current = resumePositionSeconds
  }, [routine.audioUrl, resumePositionSeconds])

  const startPlayback = useCallback((audio: HTMLAudioElement) => {
    setError(null)
    completedRef.current = false
    void audio.play().then(() => {
      setStatus('playing')
    }).catch(() => {
      setError('Playback was blocked. Tap play again to start audio.')
      setStatus('idle')
    })
  }, [])

  useEffect(() => {
    const audio = new Audio(resolveAudioUrl(routine.audioUrl))
    audio.preload = 'auto'
    audioRef.current = audio

    const handleLoadedMetadata = () => {
      const resumeAt = resumePositionRef.current
      if (resumeAt > 0 && audio.currentTime < resumeAt) {
        audio.currentTime = resumeAt
      }
      setCurrentTime(audio.currentTime)

      if (pendingPlayRef.current) {
        pendingPlayRef.current = false
        startPlayback(audio)
      }
    }

    const handleTimeUpdate = () => {
      const time = audio.currentTime
      setCurrentTime(time)
      onPositionChangeRef.current?.(time)
    }

    const handleEnded = () => {
      if (completedRef.current) return
      completedRef.current = true
      setStatus('ended')
      const duration = Number.isFinite(audio.duration) ? audio.duration : routine.durationSeconds
      setCurrentTime(duration)
      onCompleteRef.current?.(duration)
    }

    const handleError = () => {
      setError(
        'Audio failed to load. Run `npm run audio:placeholders` to generate placeholder files.',
      )
      setStatus('idle')
      pendingPlayRef.current = false
    }

    audio.addEventListener('loadedmetadata', handleLoadedMetadata)
    audio.addEventListener('timeupdate', handleTimeUpdate)
    audio.addEventListener('ended', handleEnded)
    audio.addEventListener('error', handleError)

    const resumeAt = resumePositionRef.current
    if (resumeAt > 0) {
      audio.currentTime = resumeAt
      setCurrentTime(resumeAt)
    }

    return () => {
      pendingPlayRef.current = false
      audio.pause()
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata)
      audio.removeEventListener('timeupdate', handleTimeUpdate)
      audio.removeEventListener('ended', handleEnded)
      audio.removeEventListener('error', handleError)
      audioRef.current = null
    }
  }, [routine.audioUrl, routine.durationSeconds, startPlayback])

  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return
    audio.muted = muted
  }, [muted])

  const play = useCallback(() => {
    const audio = audioRef.current
    if (!audio) {
      pendingPlayRef.current = true
      return
    }

    if (audio.readyState >= HTMLMediaElement.HAVE_METADATA) {
      startPlayback(audio)
      return
    }

    pendingPlayRef.current = true
  }, [startPlayback])

  const pause = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    pendingPlayRef.current = false
    audio.pause()
    setStatus('paused')
    onPositionChangeRef.current?.(audio.currentTime)
  }, [])

  const restart = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return

    completedRef.current = false
    audio.currentTime = 0
    setCurrentTime(0)
    onPositionChangeRef.current?.(0)
    startPlayback(audio)
  }, [startPlayback])

  const seek = useCallback(
    (seconds: number) => {
      const audio = audioRef.current
      if (!audio) return

      const clamped = Math.max(0, Math.min(seconds, routine.durationSeconds))
      audio.currentTime = clamped
      setCurrentTime(clamped)
      onPositionChangeRef.current?.(clamped)
      if (status === 'ended') {
        completedRef.current = false
        setStatus(audio.paused ? 'paused' : 'playing')
      }
    },
    [routine.durationSeconds, status],
  )

  const currentChapter = getChapterAtTime(routine.chapters, currentTime)
  const nextChapter = getNextChapter(routine.chapters, currentTime)

  return {
    status,
    currentTime,
    currentChapterTitle: currentChapter?.title ?? routine.title,
    nextChapterTitle: nextChapter?.title ?? null,
    play,
    pause,
    restart,
    seek,
    error,
  }
}
