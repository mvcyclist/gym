let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

interface ToneOptions {
  frequency: number
  gain: number
  duration: number
}

function playTone(muted: boolean, { frequency, gain, duration }: ToneOptions): void {
  if (muted) return

  const ctx = getAudioContext()
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(frequency, ctx.currentTime)

  gainNode.gain.setValueAtTime(0.0001, ctx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(gain, ctx.currentTime + 0.01)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration)

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + duration)
}

/** Default short beep (legacy). */
export function playBeep(muted: boolean): void {
  playTone(muted, { frequency: 880, gain: 0.25, duration: 0.35 })
}

/** Louder tick during the final 5 seconds of rest. */
export function playCountdownBeep(muted: boolean): void {
  playTone(muted, { frequency: 988, gain: 0.5, duration: 0.12 })
}

/** Rest timer finished. */
export function playCompletionBeep(muted: boolean): void {
  playTone(muted, { frequency: 523, gain: 0.45, duration: 0.45 })
}
