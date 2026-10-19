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
const PLAYERS = [P('a', 'Ana', 4), P('b', 'Bia', 3), P('c', 'Cris', 2), P('d', 'Duda', 5), P('e', 'Edu', 1), P('f', 'Ana', 3)]
const GAME = (paid: string[], draw: DrawState | null = null): Game => ({ id: 'g', date: '2026-10-24', time: '19:00', paid, draw })

function respond(status: number, body?: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response
}

function setup(initial: Game | null, put: (init: RequestInit) => Promise<Response> | Response) {
  const fetchMock = vi.fn(async (_p: string, init: RequestInit = {}) => put(init))
  vi.stubGlobal('fetch', fetchMock)
  const onUnauthorized = vi.fn()
  const onGameChange = vi.fn()
  function Host() {
    const [game, setGame] = useState<Game | null>(initial)
    return (
      <DrawArea
        game={game}
        players={PLAYERS}
        onGameChange={(g) => {
          onGameChange(g)
          setGame(g)
        }}
        onUnauthorized={onUnauthorized}
      />
    )
  }
  render(<Host />)
  return { fetchMock, onUnauthorized, onGameChange }
}

const sent = (f: ReturnType<typeof vi.fn>, i = 0) => JSON.parse((f.mock.calls[i][1] as RequestInit).body as string) as DrawState
const open = () => fireEvent.click(screen.getByRole('button', { name: 'Montar times' }))

describe('estados iniciais', () => {
  it('sem sorteio: estado vazio, config padrão 2 times · 6 por time', () => {
    setup(GAME(['a', 'b']), () => respond(500))
    expect(screen.getByText('Nenhum time montado ainda')).toBeTruthy()
    expect(screen.getByText('2 times · 6 por time')).toBeTruthy()
    expect(screen.queryByRole('button', { name: /Sortear de novo/ })).toBeNull()
  })
  it('sem jogo: Montar times desabilitado com dica', () => {
    setup(null, () => respond(500))
    expect((screen.getByRole('button', { name: 'Montar times' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('Cadastre a data do jogo primeiro')).toBeTruthy()
  })
})

describe('sortear', () => {
  it('envia só pagos, usa a config do modal e renderiza a RESPOSTA do servidor', async () => {
    const reply: DrawState = { teamCount: 2, teamSize: 2, teams: [['d', 'e'], ['a', 'f']], reserves: ['b'], locks: {} }
    const { fetchMock, onGameChange } = setup(GAME(['a', 'b', 'd', 'e', 'f']), () => respond(200, GAME(['a', 'b', 'd', 'e', 'f'], reply)))
    open()
    // 5 pagos; 2 times de 2
    for (let i = 0; i < 5; i++) fireEvent.click(screen.getByRole("button", { name: "Menos jogadores por time" }))
    fireEvent.click(screen.getByRole('button', { name: 'Mais jogadores por time' }))
    expect(screen.getByTestId('size-value').textContent).toBe('2')
    fireEvent.click(screen.getByRole('button', { name: 'Sortear' }))
    await screen.findByRole('heading', { name: 'Time A' })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [path, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(path).toBe('/api/admin/game/draw')
    expect(init.method).toBe('PUT')
    const body = sent(fetchMock)
    expect(body.teamCount).toBe(2)
    expect(body.teamSize).toBe(2)
    const ids = [...body.teams.flat(), ...body.reserves].sort()
    expect(ids).toEqual(['a', 'b', 'd', 'e', 'f'])
    expect(body.teams.every((t) => t.length <= 2)).toBe(true)
    expect(onGameChange).toHaveBeenCalledWith(GAME(['a', 'b', 'd', 'e', 'f'], reply))

    // tela vem da RESPOSTA: Time A = Duda + Edu
    const teamA = screen.getByRole('heading', { name: 'Time A' }).closest('section') as HTMLElement
    expect(within(teamA).getAllByRole('listitem').map((li) => li.textContent)).toEqual([
      expect.stringContaining('Duda'),
      expect.stringContaining('Edu'),
    ])
    // totais, médias, nomes duplicados (Ana aparece no time B e Ana não está nas reservas)
    expect(within(teamA).getByText('6')).toBeTruthy()
    expect(within(teamA).getByText('média 3')).toBeTruthy()
    expect(within(teamA).getByText('2 jogadores')).toBeTruthy()
    expect(screen.getByText('Reservas · 1')).toBeTruthy()
    expect(screen.getByText('Bia')).toBeTruthy()
    // spread: 6 vs 7 → 1 ★ , Quase parelho
    expect(screen.getByText('Diferença entre o mais forte e o mais fraco: 1 ★')).toBeTruthy()
    expect(screen.getByText('Quase parelho')).toBeTruthy()
  })

  it('nomes duplicados aparecem separadamente', async () => {
    const reply: DrawState = { teamCount: 2, teamSize: 1, teams: [['a'], ['f']], reserves: [], locks: {} }
    setup(GAME(['a', 'f']), () => respond(200, GAME(['a', 'f'], reply)))
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Sortear' }))
    await screen.findByRole('heading', { name: 'Time B' })
    expect(screen.getAllByText('Ana')).toHaveLength(2)
  })

  it('médias quando os tamanhos diferem', async () => {
    const reply: DrawState = { teamCount: 2, teamSize: 3, teams: [['a', 'b', 'c'], ['d']], reserves: [], locks: {} }
    setup(GAME(['a', 'b', 'c', 'd']), () => respond(200, GAME(['a', 'b', 'c', 'd'], reply)))
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Sortear' }))
    await screen.findByRole('heading', { name: 'Time A' })
    expect(screen.getByText('Diferença entre o mais forte e o mais fraco: 2 ★ (média por jogador)')).toBeTruthy()
    expect(screen.getByText('Desequilibrado')).toBeTruthy()
  })

  it('aviso de quem pagou depois do sorteio', () => {
    const draw: DrawState = { teamCount: 2, teamSize: 1, teams: [['a'], ['b']], reserves: [], locks: {} }
    setup(GAME(['a', 'b', 'c'], draw), () => respond(500))
    expect(screen.getByText('1 pagou e ficou de fora — sorteie de novo para incluir.')).toBeTruthy()
  })
  it('aviso no plural', () => {
    const draw: DrawState = { teamCount: 2, teamSize: 1, teams: [['a'], ['b']], reserves: [], locks: {} }
    setup(GAME(['a', 'b', 'c', 'd'], draw), () => respond(500))
    expect(screen.getByText('2 pagaram e ficaram de fora — sorteie de novo para incluir.')).toBeTruthy()
  })

  it('Sortear de novo reenvia a config guardada, mantém travas só de pagos', async () => {
    const draw: DrawState = { teamCount: 3, teamSize: 1, teams: [['a'], ['b'], ['c']], reserves: [], locks: { a: 0, e: 1, b: 2 } }
    const { fetchMock } = setup(GAME(['a', 'b', 'c'], draw), () => respond(200, GAME(['a', 'b', 'c'], draw)))
    // e (travado) não pagou; b está na trava 2 → ok
    const btn = screen.getByRole('button', { name: 'Sortear de novo (2 travados)' })
    fireEvent.click(btn)
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1))
    const body = sent(fetchMock)
    expect(body.teamCount).toBe(3)
    expect(body.teamSize).toBe(1)
    expect(body.locks).toEqual({ a: 0, b: 2 })
    expect(body.teams.flat().sort()).toEqual(['a', 'b', 'c'])
  })

  it('400 mostra a mensagem e mantém os times anteriores', async () => {
    const draw: DrawState = { teamCount: 2, teamSize: 1, teams: [['a'], ['b']], reserves: [], locks: {} }
    setup(GAME(['a', 'b'], draw), () => respond(400, { error: 'Sorteio inválido.' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sortear de novo' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Sorteio inválido.')
    expect(screen.getByRole('heading', { name: 'Time A' })).toBeTruthy()
    expect(screen.getByText('Ana')).toBeTruthy()
  })

  it('401 chama onUnauthorized', async () => {
    const draw: DrawState = { teamCount: 2, teamSize: 1, teams: [['a'], ['b']], reserves: [], locks: {} }
    const { onUnauthorized } = setup(GAME(['a', 'b'], draw), () => respond(401, { error: 'x' }))
    fireEvent.click(screen.getByRole('button', { name: 'Sortear de novo' }))
    await waitFor(() => expect(onUnauthorized).toHaveBeenCalledTimes(1))
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('clique duplo não envia dois pedidos; botões ficam desabilitados com aria-busy', async () => {
    const draw: DrawState = { teamCount: 2, teamSize: 1, teams: [['a'], ['b']], reserves: [], locks: {} }
    let release!: (r: Response) => void
    const { fetchMock } = setup(GAME(['a', 'b'], draw), () => new Promise<Response>((res) => (release = res)))
    const btn = screen.getByRole('button', { name: 'Sortear de novo' }) as HTMLButtonElement
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    await waitFor(() => expect(btn.disabled).toBe(true))
    expect(btn.getAttribute('aria-busy')).toBe('true')
    expect((screen.getByRole('button', { name: 'Montar times' }) as HTMLButtonElement).disabled).toBe(true)
    release(respond(200, GAME(['a', 'b'], draw)))
    await waitFor(() => expect(btn.disabled).toBe(false))
  })

  it('jogadores não pagos nunca entram, mesmo que existam na lista', async () => {
    const reply: DrawState = { teamCount: 2, teamSize: 1, teams: [['a'], ['b']], reserves: [], locks: {} }
    const { fetchMock } = setup(GAME(['a', 'b', 'ghost']), () => respond(200, GAME(['a', 'b'], reply)))
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Sortear' }))
    await waitFor(() => expect(fetchMock).toHaveBeenCalled())
    const body = sent(fetchMock)
    expect([...body.teams.flat(), ...body.reserves].sort()).toEqual(['a', 'b'])
  })
})
