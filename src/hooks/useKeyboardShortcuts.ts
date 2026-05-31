import { useEffect } from 'react'

interface KeyboardShortcutHandlers {
  onPrevious?: () => void
  onNext?: () => void
  onToggleTimer?: () => void
  onResetTimer?: () => void
  enabled?: boolean
}

export function useKeyboardShortcuts({
  onPrevious,
  onNext,
  onToggleTimer,
  onResetTimer,
  enabled = true,
}: KeyboardShortcutHandlers): void {
  useEffect(() => {
    if (!enabled) return

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isTyping =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable

      if (isTyping) return

      switch (event.key) {
        case 'ArrowLeft':
          event.preventDefault()
          onPrevious?.()
          break
        case 'ArrowRight':
          event.preventDefault()
          onNext?.()
          break
        case ' ':
          event.preventDefault()
          onToggleTimer?.()
          break
        case 'r':
        case 'R':
          event.preventDefault()
          onResetTimer?.()
          break
        default:
          break
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled, onNext, onPrevious, onResetTimer, onToggleTimer])
}
