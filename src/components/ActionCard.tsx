interface ActionCardProps {
  title: string
  description: string
  meta?: string
  onClick: () => void
}

export function ActionCard({ title, description, meta, onClick }: ActionCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex h-full flex-col rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 text-left transition hover:border-zinc-600 hover:bg-zinc-900"
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {meta && (
          <span className="rounded-full bg-zinc-800 px-3 py-1 text-xs font-semibold text-zinc-400">
            {meta}
          </span>
        )}
      </div>
      <p className="text-sm leading-relaxed text-zinc-400">{description}</p>
    </button>
  )
}
