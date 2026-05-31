/** Allows numeric weights or bodyweight shorthand (BW). */
export function sanitizeWeightInput(value: string): string {
  if (value === '') return ''

  const upper = value.toUpperCase()
  if (upper === 'B' || upper === 'BW') return upper

  if (/^\d*\.?\d*$/.test(value)) return value

  return value.slice(0, -1)
}
