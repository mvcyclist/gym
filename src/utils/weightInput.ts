/** Allows non-negative numeric weights or bodyweight shorthand (BW). */
export function sanitizeWeightInput(value: string): string {
  if (value === '') return ''

  const upper = value.toUpperCase()
  if (upper === 'B' || upper === 'BW') return upper

  const withoutMinus = value.replace(/-/g, '')
  if (/^\d*\.?\d*$/.test(withoutMinus)) return withoutMinus

  return withoutMinus.slice(0, -1)
}

/** Non-negative whole-number reps only. */
export function sanitizeRepsInput(value: string): string {
  if (value === '') return ''
  return value.replace(/\D/g, '')
}
