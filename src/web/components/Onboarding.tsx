type Props = {
  /** Jogadores marcados (pagos) na lista. */
  marked: number
  /** Jogadores no elenco. */
  total: number
  hasGame: boolean
  busy: boolean
  onOpen(): void
}

const HINT_ID = 'onboarding-hint'

/** Estado vazio do administrador (brief 3.4): "Monte os times em três passos". */
export function Onboarding({ marked, total, hasGame, busy, onOpen }: Props) {
  const steps = [
    { n: '1', title: 'Convoque', body: `${marked} de ${total} marcados na lista ao lado.`, done: marked >= 2 },
    { n: '2', title: 'Escolha o formato', body: 'Quantos times e quantos jogadores por time.', done: false },
    { n: '3', title: 'Sorteie', body: 'Ajuste à mão arrastando e trave quem não pode mudar.', done: false },
  ]
  return (
    <div className="flex flex-col gap-5 rounded-lg bg-surface p-[28px] shadow-sm">
      <div className="flex max-w-[520px] flex-col gap-[6px]">
        <span className="text-xl font-medium tracking-[-0.01em]">Monte os times em três passos</span>
        <span className="text-sm text-neutral-400 text-pretty">
          As estrelas são distribuídas para os times ficarem o mais parelhos possível. Quem passar das vagas vira reserva.
        </span>
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
        {steps.map((s) => (
          <div key={s.n} className="flex flex-col gap-2 rounded-md bg-bg p-[14px]">
            <span
              className={`flex size-[26px] items-center justify-center rounded-full text-[13px] font-medium ${
                s.done ? 'bg-navy text-navy-ink' : 'bg-surface text-neutral-400'
              }`}
            >
              {s.n}
            </span>
            <span className="text-sm font-medium">{s.title}</span>
            <span className="text-[13px] text-neutral-400 text-pretty">{s.body}</span>
          </div>
        ))}
      </div>
      <div className="flex flex-col items-start gap-2">
        <button
          type="button"
          className="btn btn-primary gap-2 px-[18px] py-[10px]"
          disabled={!hasGame || busy || marked < 2}
          aria-busy={busy}
          aria-describedby={hasGame ? undefined : HINT_ID}
          onClick={onOpen}
        >
          Montar times
        </button>
        {!hasGame && (
          <span id={HINT_ID} className="text-xs text-neutral-500">
            Cadastre a data do jogo primeiro
          </span>
        )}
      </div>
    </div>
  )
}
