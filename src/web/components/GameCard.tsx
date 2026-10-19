import type { ReactNode, Ref } from 'react'
import { formatGameWeekday, gameDateParts, relativeDay } from '../format'
import { Icon } from './icons'

type Props = {
  /** Jogo ativo; null = estado vazio. */
  game: { date: string; time: string } | null
  /** Ações do administrador; o Membro não passa nada (cartão somente leitura). */
  actions?: { onEdit: () => void; onDelete: () => void }
  /** Substitui o corpo (confirmação de exclusão ou formulário de edição). */
  children?: ReactNode
  /** Raiz do cartão, usada pelo GameBar para devolver o foco. */
  rootRef?: Ref<HTMLElement>
}

const ROW = 'flex flex-wrap items-center justify-between gap-x-4 gap-y-3'

/** Cartão do jogo do v4 (brief 3.1d): visualização, vazio e, via children, confirmar/editar. */
export function GameCard({ game, actions, children, rootRef }: Props) {
  const rel = game ? relativeDay(game.date, new Date()) : null
  const parts = game ? gameDateParts(game.date) : null
  return (
    <section ref={rootRef} aria-label="Jogo" className="rounded-lg bg-surface px-[18px] py-4 shadow-sm">
      {children ??
        (game && parts && rel ? (
          <div className={ROW}>
            <div className="flex min-w-0 items-center gap-[14px]">
              <div
                aria-hidden="true"
                className="flex size-12 flex-none flex-col items-center justify-center rounded-md bg-navy leading-none text-navy-ink"
              >
                <span className="text-[10px] tracking-[0.08em] text-gold uppercase">{parts.month}</span>
                <span className="mt-[3px] text-[20px] font-medium tabular-nums">{parts.day}</span>
              </div>
              <div className="flex min-w-0 flex-col gap-[3px]">
                <div className="flex items-center gap-2">
                  <span className="text-[12px] tracking-[0.06em] text-neutral-500 uppercase">Próximo jogo</span>
                  <span
                    className={`rounded-full px-2 py-[2px] text-[11px] font-medium ${
                      rel === 'Já aconteceu'
                        ? 'bg-bg text-neutral-400'
                        : 'bg-gold-tint text-gold-ink shadow-[inset_0_0_0_1px_var(--gold-soft)]'
                    }`}
                  >
                    {rel}
                  </span>
                </div>
                <span className="text-[18px] font-medium tracking-[-0.01em]">
                  {formatGameWeekday(game.date)} <span className="font-normal text-neutral-400">às</span> {game.time}
                </span>
              </div>
            </div>
            {actions && (
              <div className="flex gap-[6px]">
                <button className="btn btn-ghost gap-[6px]" type="button" data-focus="edit" onClick={actions.onEdit}>
                  <Icon name="pencil" size={14} />
                  Alterar
                </button>
                <button className="btn btn-ghost gap-[6px]" type="button" data-focus="delete" onClick={actions.onDelete}>
                  <Icon name="trash" size={14} />
                  Excluir
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className={ROW}>
            <div className="flex items-center gap-[14px]">
              <div
                aria-hidden="true"
                className="flex size-12 flex-none items-center justify-center rounded-md border border-dashed border-neutral-700 text-neutral-500"
              >
                <Icon name="calendar" size={20} />
              </div>
              <div className="flex flex-col gap-[3px]">
                <span className="text-[15px] font-medium">Nenhum jogo marcado</span>
                <span className="text-[13px] text-neutral-400">
                  {actions
                    ? 'Defina o dia e a hora para avisar o grupo.'
                    : 'O organizador ainda não definiu o dia e a hora.'}
                </span>
              </div>
            </div>
            {actions && (
              <button className="btn btn-primary gap-[6px]" type="button" data-focus="mark" onClick={actions.onEdit}>
                <Icon name="plus" size={14} />
                Marcar jogo
              </button>
            )}
          </div>
        ))}
    </section>
  )
}
