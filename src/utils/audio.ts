let audioContext: AudioContext | null = null

function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new AudioContext()
  }
  return audioContext
}

export function playBeep(muted: boolean): void {
  if (muted) return

  const ctx = getAudioContext()
  const oscillator = ctx.createOscillator()
  const gainNode = ctx.createGain()

  oscillator.type = 'sine'
  oscillator.frequency.setValueAtTime(880, ctx.currentTime)

  gainNode.gain.setValueAtTime(0.0001, ctx.currentTime)
  gainNode.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + 0.01)
  gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.35)

  oscillator.connect(gainNode)
  gainNode.connect(ctx.destination)

  oscillator.start(ctx.currentTime)
  oscillator.stop(ctx.currentTime + 0.35)
}
