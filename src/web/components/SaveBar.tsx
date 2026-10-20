type Props = {
  saving: boolean
  error: string | null
  onSave(): void
  onDiscard(): void
}

/** Barra fixa: enquanto houver edições locais (confirmações e sorteio), nada foi ao servidor. */
export function SaveBar({ saving, error, onSave, onDiscard }: Props) {
  return (
    <div
      role="region"
      aria-label="Alterações não salvas"
      className="fixed inset-x-0 bottom-0 z-10 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 bg-surface px-[28px] py-3 shadow-[0_-4px_16px_rgba(36,54,90,0.12)]"
    >
      <div className="flex flex-col gap-[2px]">
        <span className="text-[14px] font-medium">Alterações não salvas</span>
        <span className="text-[12px] text-neutral-400">Os membros só veem o sorteio depois de salvar.</span>
      </div>
      {error && (
        <p className="m-0 rounded-sm bg-gold-tint px-3 py-2 text-[13px] text-gold-ink shadow-[inset_0_0_0_1px_var(--gold-soft)]" role="alert">
          {error}
        </p>
      )}
      <div className="flex gap-[6px]">
        <button type="button" className="btn btn-ghost" disabled={saving} onClick={onDiscard}>
          Descartar
        </button>
        <button type="button" className="btn btn-primary" disabled={saving} aria-busy={saving || undefined} onClick={onSave}>
          {saving ? 'Salvando…' : 'Salvar'}
        </button>
      </div>
    </div>
  )
}
