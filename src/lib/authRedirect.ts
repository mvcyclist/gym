/** OAuth return URL — must be listed in Supabase Auth → Redirect URLs. */
export function getAuthRedirectUrl(): string {
  const override = import.meta.env.VITE_AUTH_REDIRECT_URL?.trim()
  if (override) return override

  // Use the exact origin + port the user has open (handles 5173 vs 5174, localhost vs 127.0.0.1).
  return `${window.location.origin}/`
}

export function getLocalOAuthSetupHint(): string | null {
  if (!import.meta.env.DEV) return null

  const redirect = getAuthRedirectUrl()
  const host = window.location.hostname
  const alt =
    host === 'localhost'
      ? redirect.replace('localhost', '127.0.0.1')
      : host === '127.0.0.1'
        ? redirect.replace('127.0.0.1', 'localhost')
        : null

  const urls = [redirect, alt].filter(Boolean).join(' and ')
  return `Dev sign-in returns to ${urls}. Add both to Supabase → Authentication → Redirect URLs (e.g. http://localhost:5173/**). If missing, Supabase sends you to gym.busydad.ai instead.`
}
