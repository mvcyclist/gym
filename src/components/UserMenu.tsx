interface UserMenuProps {
  email?: string | null
  onSignOut: () => void
}

export function UserMenu({ email, onSignOut }: UserMenuProps) {
  if (!email) return null

  return (
    <div className="mx-auto flex w-full max-w-5xl items-center justify-end gap-3 px-4 pt-4 sm:px-6">
      <span className="truncate text-xs text-zinc-500">{email}</span>
      <button
        type="button"
        onClick={onSignOut}
        className="shrink-0 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900"
      >
        Sign out
      </button>
    </div>
  )
}
