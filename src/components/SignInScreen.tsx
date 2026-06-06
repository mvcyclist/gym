interface SignInScreenProps {
  onSignIn: () => Promise<void>
  error?: string | null
}

export function SignInScreen({ onSignIn, error }: SignInScreenProps) {
  return (
    <div className="mx-auto flex min-h-[70vh] w-full max-w-md flex-col items-center justify-center px-4 py-12">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-red-500">Workout Deck</p>
      <h1 className="mt-3 text-center text-3xl font-bold text-white">Sign in to sync workouts</h1>
      <p className="mt-3 text-center text-sm leading-relaxed text-zinc-400">
        Your workout history and calendar sync across devices. Sign in with Google to get started.
      </p>

      {error && (
        <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={() => void onSignIn()}
        className="mt-8 flex w-full items-center justify-center gap-3 rounded-xl bg-white px-5 py-3.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100"
      >
        <GoogleIcon />
        Continue with Google
      </button>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden>
      <path
        fill="#FFC107"
        d="M43.611 20.083H42V20H24v8h11.303C33.654 32.657 29.223 36 24 36c-5.522 0-10-4.478-10-10s4.478-10 10-10c2.837 0 5.36 1.18 7.188 3.07l5.657-5.657C33.64 10.053 29.082 8 24 8 12.955 8 4 16.955 4 28s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"
      />
      <path
        fill="#FF3D00"
        d="M6.306 14.691l6.571 4.819C14.655 16.108 18.961 13 24 13c2.837 0 5.36 1.18 7.188 3.07l5.657-5.657C33.64 10.053 29.082 8 24 8 12.955 8 4 16.955 4 28c0 3.998 1.524 7.64 4.009 10.386l6.297-4.695z"
      />
      <path
        fill="#4CAF50"
        d="M24 48c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 38.808 26.715 40 24 40c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 43.556 16.227 48 24 48z"
      />
      <path
        fill="#1976D2"
        d="M43.611 20.083H42V20H24v8h11.303c-1.009 2.785-3.043 5.06-5.697 6.52l6.19 5.238C42.022 35.026 44 31.806 44 28c0-2.748-.722-5.328-1.989-7.583z"
      />
    </svg>
  )
}
