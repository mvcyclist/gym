/** Dev-only account for reset / start-from-scratch tooling. */
export const DEV_ACCOUNT_EMAIL = 'busydad94070@gmail.com'

export function isDevAccount(email: string | undefined | null): boolean {
  return email?.toLowerCase() === DEV_ACCOUNT_EMAIL
}
