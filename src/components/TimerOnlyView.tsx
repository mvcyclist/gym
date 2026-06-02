interface TimerOnlyViewProps {
  onBack: () => void
}

export function TimerOnlyView({ onBack }: TimerOnlyViewProps) {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
      <button
        type="button"
        onClick={onBack}
        className="rounded-lg border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-300 transition hover:border-zinc-500 hover:bg-zinc-900"
      >
        Back to home
      </button>
      <p className="mt-6 text-center text-sm text-zinc-500">
        Use the timer above for rest between sets or mobility work.
      </p>
    </section>
  )
}
