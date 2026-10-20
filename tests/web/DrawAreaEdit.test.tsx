// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { DrawArea } from '../../src/web/components/DrawArea'
import type { DrawState, Game, Player } from '../../src/shared/types'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const P = (id: string, name: string, rating: number): Player => ({ id, name, rating, archived: false })
const PLAYERS = [P('a', 'Ana', 4), P('b', 'Bia', 3), P('c', 'Cris', 2), P('d', 'Duda', 5), P('e', 'Edu', 1)]
const PAID = ['a', 'b', 'c', 'd', 'e']
const DRAW = (over: Partial<DrawState> = {}): DrawState => ({
  teamCount: 2,
  teamSize: 2,
  teams: [['a', 'b'], ['c']],
  reserves: ['d', 'e'],
  locks: {},
  ...over,
})
const GAME = (draw: DrawState | null): Game => ({ id: 'g', date: '2026-10-24', time: '19:00', paid: PAID, draw })

/** Espiona drops que chegam acima do card: a linha deve parar a propagação. */
const parentDrop = vi.fn()

function setup(initial: Game, opts: { externalBusy?: boolean } = {}) {
  // Edições só mexem no rascunho local (onGameChange): nenhuma requisição sai daqui.
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  const onGameChange = vi.fn()
  parentDrop.mockClear()
  function Host() {
    const [game, setGame] = useState<Game>(initial)
    return (
      <div onDrop={parentDrop}>
        <DrawArea
          game={game}
          players={PLAYERS}
          externalBusy={opts.externalBusy}
          onGameChange={(g) => {
            onGameChange(g)
            setGame(g)
          }}
        />
      </div>
    )
  }
  render(<Host />)
  return { fetchMock, onGameChange }
}

const sent = (f: ReturnType<typeof vi.fn>) => (f.mock.calls.at(-1)![0] as Game).draw as DrawState
const row = (name: string) => screen.getByText(name).closest('li') as HTMLElement
const card = (letter: string) => screen.getByRole('heading', { name: `Time ${letter}` }).closest('section') as HTMLElement
const dt = () => ({ setData: vi.fn(), getData: vi.fn(), effectAllowed: '', dropEffect: '' })
const reserves = () => screen.getByRole('region', { name: 'Reservas' })

function drag(name: string) {
  const data = dt()
  fireEvent.dragStart(row(name), { dataTransfer: data })
  return data
}

describe('arrastar e soltar', () => {
  it('soltar em outro time atualiza só o rascunho e a tela mostra o novo time', async () => {
    const { fetchMock, onGameChange } = setup(GAME(DRAW()))
    const data = drag('Ana')
    expect(data.effectAllowed).toBe('move')
    expect(data.setData).toHaveBeenCalledWith('text/plain', 'a')
    fireEvent.drop(card('B'), { dataTransfer: data })
    await waitFor(() => expect(within(card('B')).getByText('Ana')).toBeTruthy())
    expect(onGameChange).toHaveBeenCalledTimes(1)
    expect(fetchMock).not.toHaveBeenCalled()
    expect(sent(onGameChange).teams).toEqual([['b'], ['c', 'a']])
  })

  it('soltar em time cheio: sem requisição e o motivo no alerta', () => {
    const { onGameChange } = setup(GAME(DRAW()))
    const data = drag('Cris')
    fireEvent.drop(card('A'), { dataTransfer: data })
    expect(onGameChange).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toBe(
      'Time A está cheio (2 jogadores). Troque com alguém ou mova alguém para as reservas.',
    )
  })

  it('soltar no mesmo time não faz requisição', () => {
    const { onGameChange } = setup(GAME(DRAW()))
    fireEvent.drop(card('A'), { dataTransfer: drag('Ana') })
    expect(onGameChange).not.toHaveBeenCalled()
  })

  it('soltar sobre outro jogador troca os dois', async () => {
    const { onGameChange } = setup(GAME(DRAW()))
    const data = drag('Ana')
    fireEvent.drop(row('Cris'), { dataTransfer: data })
    // a linha trata o drop e não deixa chegar ao card nem acima
    expect(parentDrop).not.toHaveBeenCalled()
    await waitFor(() => expect(onGameChange).toHaveBeenCalledTimes(1))
    expect(sent(onGameChange).teams).toEqual([['c', 'b'], ['a']])
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('soltar sobre um jogador troca mesmo com o time cheio e só dispara uma vez', async () => {
    const { onGameChange } = setup(GAME(DRAW({ teams: [['a', 'b'], ['c', 'd']], reserves: ['e'] })))
    fireEvent.drop(row('Cris'), { dataTransfer: drag('Ana') })
    expect(parentDrop).not.toHaveBeenCalled()
    await waitFor(() => expect(onGameChange).toHaveBeenCalledTimes(1))
    expect(sent(onGameChange).teams).toEqual([['c', 'b'], ['a', 'd']])
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('soltar nas reservas manda o jogador para lá', async () => {
    const { onGameChange } = setup(GAME(DRAW()))
    fireEvent.drop(reserves(), { dataTransfer: drag('Bia') })
    await waitFor(() => expect(onGameChange).toHaveBeenCalledTimes(1))
    expect(sent(onGameChange)).toMatchObject({ teams: [['a'], ['c']], reserves: ['d', 'e', 'b'] })
  })

  it('arrastar uma reserva para um time', async () => {
    const { onGameChange } = setup(GAME(DRAW()))
    const data = dt()
    fireEvent.dragStart(screen.getByText('Duda').closest('li') as HTMLElement, { dataTransfer: data })
    fireEvent.drop(card('B'), { dataTransfer: data })
    await waitFor(() => expect(onGameChange).toHaveBeenCalledTimes(1))
    expect(sent(onGameChange)).toMatchObject({ teams: [['a', 'b'], ['c', 'd']], reserves: ['e'] })
  })

  it('sem reservas, a barra aparece como alvo durante o arrasto', () => {
    setup(GAME(DRAW({ reserves: [] })))
    expect(screen.queryByText('Solte aqui para mandar às reservas')).toBeNull()
    const data = drag('Ana')
    expect(screen.getByText('Solte aqui para mandar às reservas')).toBeTruthy()
    fireEvent.dragEnd(row('Ana'), { dataTransfer: data })
    expect(screen.queryByText('Solte aqui para mandar às reservas')).toBeNull()
  })

  it('destaca o time sob o arrasto e limpa ao terminar', () => {
    setup(GAME(DRAW()))
    const data = drag('Ana')
    fireEvent.dragOver(card('B'), { dataTransfer: data })
    expect(card('B').style.boxShadow).toContain('var(--color-accent)')
    fireEvent.dragEnd(row('Ana'), { dataTransfer: data })
    expect(card('B').style.boxShadow).toBe('')
  })

  it('a trava acompanha o jogador', async () => {
    const { onGameChange } = setup(GAME(DRAW({ locks: { a: 0 } })))
    fireEvent.drop(card('B'), { dataTransfer: drag('Ana') })
    await waitFor(() => expect(onGameChange).toHaveBeenCalledTimes(1))
    expect(sent(onGameChange).locks).toEqual({ a: 1 })
  })

  it('mandar travado para as reservas remove a trava', async () => {
    const { onGameChange } = setup(GAME(DRAW({ locks: { a: 0 } })))
    fireEvent.drop(reserves(), { dataTransfer: drag('Ana') })
    await waitFor(() => expect(onGameChange).toHaveBeenCalledTimes(1))
    expect(sent(onGameChange).locks).toEqual({})
  })

  it('com o rascunho salvando (externalBusy), arrasto, cadeado e seletor são ignorados', () => {
    const { onGameChange } = setup(GAME(DRAW()), { externalBusy: true })
    fireEvent.drop(reserves(), { dataTransfer: drag('Bia') })
    fireEvent.click(screen.getByRole('button', { name: 'Travar Bia neste time' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Mover Bia para' }), { target: { value: 'reserves' } })
    expect(onGameChange).not.toHaveBeenCalled()
    expect(screen.getByRole('combobox', { name: 'Mover Bia para' }).getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByRole('button', { name: 'Travar Bia neste time' }).getAttribute('aria-disabled')).toBe('true')
  })
})

describe('cadeado', () => {
  it('travar guarda locks com o índice do time e aria-pressed vira em seguida', async () => {
    const { onGameChange } = setup(GAME(DRAW()))
    const btn = screen.getByRole('button', { name: 'Travar Cris neste time' })
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(btn)
    const after = await screen.findByRole('button', { name: 'Destravar Cris' })
    expect(after.getAttribute('aria-pressed')).toBe('true')
    expect(sent(onGameChange).locks).toEqual({ c: 1 })
  })

  it('destravar remove a trava', async () => {
    const { onGameChange } = setup(GAME(DRAW({ locks: { a: 0 } })))
    fireEvent.click(screen.getByRole('button', { name: 'Destravar Ana' }))
    await screen.findByRole('button', { name: 'Travar Ana neste time' })
    expect(sent(onGameChange).locks).toEqual({})
  })

  it('reservas não têm cadeado', () => {
    setup(GAME(DRAW()))
    expect(screen.queryByRole('button', { name: /Travar Duda/ })).toBeNull()
  })
})

describe('Mover para (teclado e toque)', () => {
  it('escolher Time B faz a mesma edição que soltar', async () => {
    const { onGameChange } = setup(GAME(DRAW()))
    fireEvent.change(screen.getByRole('combobox', { name: 'Mover Ana para' }), { target: { value: '1' } })
    await waitFor(() => expect(onGameChange).toHaveBeenCalledTimes(1))
    expect(sent(onGameChange).teams).toEqual([['b'], ['c', 'a']])
  })

  it('Reservas manda para as reservas; reserva pode ir para um time', async () => {
    const { onGameChange } = setup(GAME(DRAW()))
    fireEvent.change(screen.getByRole('combobox', { name: 'Mover Duda para' }), { target: { value: '1' } })
    await waitFor(() => expect(onGameChange).toHaveBeenCalledTimes(1))
    expect(sent(onGameChange)).toMatchObject({ teams: [['a', 'b'], ['c', 'd']], reserves: ['e'] })
  })

  it('Reservas no select', async () => {
    const { onGameChange } = setup(GAME(DRAW()))
    fireEvent.change(screen.getByRole('combobox', { name: 'Mover Ana para' }), { target: { value: 'reserves' } })
    await waitFor(() => expect(onGameChange).toHaveBeenCalledTimes(1))
    expect(sent(onGameChange).reserves).toEqual(['d', 'e', 'a'])
  })

  it('times cheios (menos o próprio) ficam desabilitados com (cheio)', () => {
    setup(GAME(DRAW()))
    const cris = screen.getByRole('combobox', { name: 'Mover Cris para' })
    const opts = within(cris).getAllByRole('option') as HTMLOptionElement[]
    expect(opts.map((o) => o.textContent)).toEqual(['Time A (cheio)', 'Time B', 'Reservas'])
    expect(opts[0].disabled).toBe(true)
    expect((cris as HTMLSelectElement).value).toBe('1')
    const ana = within(screen.getByRole('combobox', { name: 'Mover Ana para' })).getAllByRole('option') as HTMLOptionElement[]
    expect(ana[0].textContent).toBe('Time A')
    expect(ana[0].disabled).toBe(false)
  })
})

describe('Sortear de novo', () => {
  it('só guarda travas coerentes com os times (R18)', async () => {
    const draw = DRAW({ teams: [['a', 'b'], ['c', 'd']], reserves: ['e'], locks: { a: 0, b: 0, c: 0 } })
    const { onGameChange } = setup(GAME(draw))
    fireEvent.click(screen.getByRole('button', { name: /Sortear de novo/ }))
    await waitFor(() => expect(onGameChange).toHaveBeenCalledTimes(1))
    const body = sent(onGameChange)
    // c não coube no time A (cheio com a e b): sua trava não é guardada
    expect(body.locks).toEqual({ a: 0, b: 0 })
    expect(body.teams[0].sort()).toEqual(['a', 'b'])
  })
})

describe('Copiar escalação', () => {
  it('aparece com sorteio e não aparece sem ele', () => {
    setup(GAME(DRAW()))
    expect(screen.getByRole('button', { name: 'Copiar escalação' })).toBeTruthy()
    cleanup()
    setup(GAME(null))
    expect(screen.queryByRole('button', { name: 'Copiar escalação' })).toBeNull()
  })
})

describe('foco depois de editar', () => {
  it('o select continua focado (já no novo time) e o botão de cadeado também', async () => {
    setup(GAME(DRAW()))
    const sel = screen.getByRole('combobox', { name: 'Mover Ana para' })
    sel.focus()
    fireEvent.change(sel, { target: { value: '1' } })
    await waitFor(() => expect(within(card('B')).getByText('Ana')).toBeTruthy())
    const moved = screen.getByRole('combobox', { name: 'Mover Ana para' })
    expect(within(card('B')).getByRole('combobox', { name: 'Mover Ana para' })).toBe(moved)
    expect(document.activeElement).toBe(moved)

    const lock = screen.getByRole('button', { name: 'Travar Bia neste time' })
    lock.focus()
    fireEvent.click(lock)
    const after = await screen.findByRole('button', { name: 'Destravar Bia' })
    expect(document.activeElement).toBe(after)
  })

  it('reserva movida para um time mantém o foco no select', async () => {
    setup(GAME(DRAW()))
    const sel = screen.getByRole('combobox', { name: 'Mover Duda para' })
    sel.focus()
    fireEvent.change(sel, { target: { value: '1' } })
    await waitFor(() => expect(within(card('B')).getByText('Duda')).toBeTruthy())
    expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Mover Duda para' }))
  })
})

describe('ids que saíram do sorteio', () => {
  it('arrasta, o jogador sai do sorteio por fora e o drop não faz requisição nem quebra', () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    const withAna = GAME(DRAW())
    const withoutAna = GAME(DRAW({ teams: [['b'], ['c']] }))
    const view = render(<DrawArea game={withAna} players={PLAYERS} onGameChange={() => {}} />)
    const data = drag('Ana')
    view.rerender(<DrawArea game={withoutAna} players={PLAYERS} onGameChange={() => {}} />)
    expect(screen.queryByText('Ana')).toBeNull()
    fireEvent.drop(card('B'), { dataTransfer: { ...data, getData: () => 'a' } })
    fireEvent.drop(reserves(), { dataTransfer: { ...data, getData: () => 'a' } })
    fireEvent.drop(row('Cris'), { dataTransfer: { ...data, getData: () => 'a' } })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByText('Solte aqui para mandar às reservas')).toBeNull()
  })
})

describe('Copiar escalação sem ninguém colocado', () => {
  it('não aparece quando nenhum id do sorteio existe na lista de jogadores', () => {
    setup(GAME(DRAW({ teams: [['x'], ['y']], reserves: ['z'] })))
    expect(screen.queryByRole('button', { name: 'Copiar escalação' })).toBeNull()
  })
})
