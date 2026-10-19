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
const GAME = (draw: DrawState | null): Game => ({ id: 'g', date: '2026-10-24', paid: PAID, draw })
const respond = (status: number, body?: unknown) =>
  ({ ok: status >= 200 && status < 300, status, json: async () => body }) as Response

/** Espiona drops que chegam acima do card: a linha deve parar a propagação. */
const parentDrop = vi.fn()

function setup(initial: Game, handler: (init: RequestInit) => Promise<Response> | Response) {
  const fetchMock = vi.fn(async (_p: string, init: RequestInit = {}) => handler(init))
  vi.stubGlobal('fetch', fetchMock)
  const onUnauthorized = vi.fn()
  parentDrop.mockClear()
  function Host() {
    const [game, setGame] = useState<Game>(initial)
    return (
      <div onDrop={parentDrop}>
        <DrawArea game={game} players={PLAYERS} onGameChange={(g) => g && setGame(g)} onUnauthorized={onUnauthorized} />
      </div>
    )
  }
  render(<Host />)
  return { fetchMock, onUnauthorized }
}
/** Servidor fake que aceita o que recebe. */
const echo = (init: RequestInit) => respond(200, GAME(JSON.parse(init.body as string)))

const sent = (f: ReturnType<typeof vi.fn>, i = 0) => JSON.parse((f.mock.calls[i][1] as RequestInit).body as string) as DrawState
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
  it('soltar em outro time faz um PUT e a tela mostra a RESPOSTA', async () => {
    const reply = DRAW({ teams: [['b'], ['c', 'a']], reserves: ['d', 'e'] })
    const { fetchMock } = setup(GAME(DRAW()), () => respond(200, GAME(reply)))
    const data = drag('Ana')
    expect(data.effectAllowed).toBe('move')
    expect(data.setData).toHaveBeenCalledWith('text/plain', 'a')
    fireEvent.drop(card('B'), { dataTransfer: data })
    await waitFor(() => expect(within(card('B')).getByText('Ana')).toBeTruthy())
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(path).toBe('/api/admin/game/draw')
    expect(init.method).toBe('PUT')
    expect(sent(fetchMock).teams).toEqual([['b'], ['c', 'a']])
  })

  it('soltar em time cheio: sem requisição e o motivo no alerta', () => {
    const { fetchMock } = setup(GAME(DRAW()), echo)
    const data = drag('Cris')
    fireEvent.drop(card('A'), { dataTransfer: data })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.getByRole('alert').textContent).toBe(
      'Time A está cheio (2 jogadores). Troque com alguém ou mova alguém para as reservas.',
    )
  })

  it('soltar no mesmo time não faz requisição', () => {
    const { fetchMock } = setup(GAME(DRAW()), echo)
    fireEvent.drop(card('A'), { dataTransfer: drag('Ana') })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('soltar sobre outro jogador troca os dois', async () => {
    const { fetchMock } = setup(GAME(DRAW()), echo)
    const data = drag('Ana')
    fireEvent.drop(row('Cris'), { dataTransfer: data })
    // a linha trata o drop e não deixa chegar ao card nem acima
    expect(parentDrop).not.toHaveBeenCalled()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(sent(fetchMock).teams).toEqual([['c', 'b'], ['a']])
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('soltar sobre um jogador troca mesmo com o time cheio e só dispara uma vez', async () => {
    const { fetchMock } = setup(GAME(DRAW({ teams: [['a', 'b'], ['c', 'd']], reserves: ['e'] })), echo)
    fireEvent.drop(row('Cris'), { dataTransfer: drag('Ana') })
    expect(parentDrop).not.toHaveBeenCalled()
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(sent(fetchMock).teams).toEqual([['c', 'b'], ['a', 'd']])
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('soltar nas reservas manda o jogador para lá', async () => {
    const { fetchMock } = setup(GAME(DRAW()), echo)
    fireEvent.drop(reserves(), { dataTransfer: drag('Bia') })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(sent(fetchMock)).toMatchObject({ teams: [['a'], ['c']], reserves: ['d', 'e', 'b'] })
  })

  it('arrastar uma reserva para um time', async () => {
    const { fetchMock } = setup(GAME(DRAW()), echo)
    const data = dt()
    fireEvent.dragStart(screen.getByText('Duda').closest('li') as HTMLElement, { dataTransfer: data })
    fireEvent.drop(card('B'), { dataTransfer: data })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(sent(fetchMock)).toMatchObject({ teams: [['a', 'b'], ['c', 'd']], reserves: ['e'] })
  })

  it('sem reservas, a barra aparece como alvo durante o arrasto', () => {
    setup(GAME(DRAW({ reserves: [] })), echo)
    expect(screen.queryByText('Solte aqui para mandar às reservas')).toBeNull()
    const data = drag('Ana')
    expect(screen.getByText('Solte aqui para mandar às reservas')).toBeTruthy()
    fireEvent.dragEnd(row('Ana'), { dataTransfer: data })
    expect(screen.queryByText('Solte aqui para mandar às reservas')).toBeNull()
  })

  it('destaca o time sob o arrasto e limpa ao terminar', () => {
    setup(GAME(DRAW()), echo)
    const data = drag('Ana')
    fireEvent.dragOver(card('B'), { dataTransfer: data })
    expect(card('B').style.boxShadow).toContain('var(--color-accent)')
    fireEvent.dragEnd(row('Ana'), { dataTransfer: data })
    expect(card('B').style.boxShadow).toBe('')
  })

  it('a trava acompanha o jogador e vai no corpo do PUT', async () => {
    const { fetchMock } = setup(GAME(DRAW({ locks: { a: 0 } })), echo)
    fireEvent.drop(card('B'), { dataTransfer: drag('Ana') })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(sent(fetchMock).locks).toEqual({ a: 1 })
  })

  it('mandar travado para as reservas remove a trava', async () => {
    const { fetchMock } = setup(GAME(DRAW({ locks: { a: 0 } })), echo)
    fireEvent.drop(reserves(), { dataTransfer: drag('Ana') })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(sent(fetchMock).locks).toEqual({})
  })

  it('durante o salvamento, outras edições são ignoradas', async () => {
    let release!: (r: Response) => void
    const { fetchMock } = setup(GAME(DRAW()), () => new Promise<Response>((r) => (release = r)))
    fireEvent.drop(card('B'), { dataTransfer: drag('Ana') })
    await waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeTruthy())
    fireEvent.drop(reserves(), { dataTransfer: drag('Bia') })
    fireEvent.click(screen.getByRole('button', { name: 'Travar Bia neste time' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'Mover Bia para' }), { target: { value: 'reserves' } })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(screen.getByRole('combobox', { name: 'Mover Bia para' }).getAttribute('aria-disabled')).toBe('true')
    expect(screen.getByRole('button', { name: 'Travar Bia neste time' }).getAttribute('aria-disabled')).toBe('true')
    release(respond(200, GAME(DRAW({ teams: [['b'], ['c', 'a']] }))))
    await waitFor(() => expect(document.querySelector('[aria-busy="true"]')).toBeNull())
  })
})

describe('erros', () => {
  it('400 mostra a mensagem do servidor e mantém o sorteio anterior', async () => {
    const { fetchMock } = setup(GAME(DRAW()), () => respond(400, { error: 'Sorteio inválido' }))
    fireEvent.drop(card('B'), { dataTransfer: drag('Ana') })
    await screen.findByRole('alert')
    expect(screen.getByRole('alert').textContent).toBe('Sorteio inválido')
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(within(card('A')).getByText('Ana')).toBeTruthy()
  })

  it('401 chama onUnauthorized', async () => {
    const { onUnauthorized } = setup(GAME(DRAW()), () => respond(401, {}))
    fireEvent.drop(card('B'), { dataTransfer: drag('Ana') })
    await waitFor(() => expect(onUnauthorized).toHaveBeenCalled())
  })
})

describe('cadeado', () => {
  it('travar envia locks com o índice do time e aria-pressed vira depois da resposta', async () => {
    const { fetchMock } = setup(GAME(DRAW()), echo)
    const btn = screen.getByRole('button', { name: 'Travar Cris neste time' })
    expect(btn.getAttribute('aria-pressed')).toBe('false')
    fireEvent.click(btn)
    const after = await screen.findByRole('button', { name: 'Destravar Cris' })
    expect(after.getAttribute('aria-pressed')).toBe('true')
    expect(sent(fetchMock).locks).toEqual({ c: 1 })
  })

  it('destravar remove a trava', async () => {
    const { fetchMock } = setup(GAME(DRAW({ locks: { a: 0 } })), echo)
    fireEvent.click(screen.getByRole('button', { name: 'Destravar Ana' }))
    await screen.findByRole('button', { name: 'Travar Ana neste time' })
    expect(sent(fetchMock).locks).toEqual({})
  })

  it('reservas não têm cadeado', () => {
    setup(GAME(DRAW()), echo)
    expect(screen.queryByRole('button', { name: /Travar Duda/ })).toBeNull()
  })
})

describe('Mover para (teclado e toque)', () => {
  it('escolher Time B envia o mesmo pedido que soltar', async () => {
    const { fetchMock } = setup(GAME(DRAW()), echo)
    fireEvent.change(screen.getByRole('combobox', { name: 'Mover Ana para' }), { target: { value: '1' } })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(sent(fetchMock).teams).toEqual([['b'], ['c', 'a']])
  })

  it('Reservas manda para as reservas; reserva pode ir para um time', async () => {
    const { fetchMock } = setup(GAME(DRAW()), echo)
    fireEvent.change(screen.getByRole('combobox', { name: 'Mover Duda para' }), { target: { value: '1' } })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(sent(fetchMock)).toMatchObject({ teams: [['a', 'b'], ['c', 'd']], reserves: ['e'] })
  })

  it('Reservas no select', async () => {
    const { fetchMock } = setup(GAME(DRAW()), echo)
    fireEvent.change(screen.getByRole('combobox', { name: 'Mover Ana para' }), { target: { value: 'reserves' } })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    expect(sent(fetchMock).reserves).toEqual(['d', 'e', 'a'])
  })

  it('times cheios (menos o próprio) ficam desabilitados com (cheio)', () => {
    setup(GAME(DRAW()), echo)
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
  it('só envia travas coerentes com os times (R18)', async () => {
    const draw = DRAW({ teams: [['a', 'b'], ['c', 'd']], reserves: ['e'], locks: { a: 0, b: 0, c: 0 } })
    const { fetchMock } = setup(GAME(draw), echo)
    fireEvent.click(screen.getByRole('button', { name: /Sortear de novo/ }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const body = sent(fetchMock)
    // c não coube no time A (cheio com a e b): sua trava não é enviada
    expect(body.locks).toEqual({ a: 0, b: 0 })
    expect(body.teams[0].sort()).toEqual(['a', 'b'])
  })
})

describe('Copiar escalação', () => {
  it('aparece com sorteio e não aparece sem ele', () => {
    setup(GAME(DRAW()), echo)
    expect(screen.getByRole('button', { name: 'Copiar escalação' })).toBeTruthy()
    cleanup()
    setup(GAME(null), echo)
    expect(screen.queryByRole('button', { name: 'Copiar escalação' })).toBeNull()
  })
})

describe('foco depois de salvar', () => {
  it('o select continua focado (já no novo time) e o botão de cadeado também', async () => {
    setup(GAME(DRAW()), echo)
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
    setup(GAME(DRAW()), echo)
    const sel = screen.getByRole('combobox', { name: 'Mover Duda para' })
    sel.focus()
    fireEvent.change(sel, { target: { value: '1' } })
    await waitFor(() => expect(within(card('B')).getByText('Duda')).toBeTruthy())
    expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Mover Duda para' }))
  })

  it('salvamento que falha deixa o foco onde estava', async () => {
    setup(GAME(DRAW()), () => respond(400, { error: 'ruim' }))
    const sel = screen.getByRole('combobox', { name: 'Mover Ana para' })
    sel.focus()
    fireEvent.change(sel, { target: { value: '1' } })
    await screen.findByRole('alert')
    expect(document.activeElement).toBe(screen.getByRole('combobox', { name: 'Mover Ana para' }))
  })
})

describe('ids que saíram do sorteio', () => {
  it('arrasta, o jogador sai do sorteio por fora e o drop não faz requisição nem quebra', () => {
    const fetchMock = vi.fn(async () => respond(200, {}))
    vi.stubGlobal('fetch', fetchMock)
    const withAna = GAME(DRAW())
    const withoutAna = GAME(DRAW({ teams: [['b'], ['c']] }))
    const view = render(<DrawArea game={withAna} players={PLAYERS} onGameChange={() => {}} onUnauthorized={() => {}} />)
    const data = drag('Ana')
    view.rerender(<DrawArea game={withoutAna} players={PLAYERS} onGameChange={() => {}} onUnauthorized={() => {}} />)
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
    setup(GAME(DRAW({ teams: [['x'], ['y']], reserves: ['z'] })), echo)
    expect(screen.queryByRole('button', { name: 'Copiar escalação' })).toBeNull()
  })
})
