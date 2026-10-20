// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
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

// Sortear e editar só mexem no rascunho local (onGameChange): nenhuma requisição sai daqui.
function setup(initial: Game | null, opts: { externalBusy?: boolean } = {}) {
  const fetchMock = vi.fn()
  vi.stubGlobal('fetch', fetchMock)
  const onGameChange = vi.fn()
  function Host() {
    const [game, setGame] = useState<Game | null>(initial)
    return (
      <DrawArea
        game={game}
        players={PLAYERS}
        externalBusy={opts.externalBusy}
        onGameChange={(g) => {
          onGameChange(g)
          setGame(g)
        }}
      />
    )
  }
  render(<Host />)
  return { fetchMock, onGameChange }
}

const lastDraw = (f: ReturnType<typeof vi.fn>) => (f.mock.calls.at(-1)![0] as Game).draw as DrawState
const open = () => fireEvent.click(screen.getByRole('button', { name: 'Montar times' }))

describe('copiar escalação', () => {
  it('o texto copiado traz a hora do jogo', async () => {
    const writeText = vi.fn(async () => {})
    const draw: DrawState = { teamCount: 2, teamSize: 2, teams: [['a', 'b'], ['c']], reserves: [], locks: {} }
    setup({ ...GAME(['a', 'b', 'c'], draw), time: '20:30' })
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    fireEvent.click(screen.getByRole('button', { name: 'Copiar escalação' }))
    await screen.findByRole('button', { name: 'Copiado ✓' })
    expect((writeText.mock.calls[0] as unknown[])[0]).toContain(' às 20:30')
  })
})

describe('estados iniciais', () => {
  it('sem sorteio: onboarding de três passos; cabeçalho só com o título (sem chip nem botões)', () => {
    setup(GAME(['a', 'b']))
    expect(screen.getByText('Monte os times em três passos')).toBeTruthy()
    expect(screen.queryByText('Nenhum time montado ainda')).toBeNull()
    expect(screen.getByText('2 de 6 marcados na lista ao lado.')).toBeTruthy()
    expect(screen.queryByText(/times ×/)).toBeNull()
    expect(screen.queryByRole('button', { name: /Sortear de novo/ })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Formato' })).toBeNull()
    expect(screen.queryByText('Equilíbrio')).toBeNull()
  })
  it('config padrão 2 × 6 no formato do modal, sem chip antes do sorteio', () => {
    setup(GAME(['a', 'b']))
    open()
    expect(screen.getByTestId('teams-value').textContent).toBe('2')
    expect(screen.getByTestId('size-value').textContent).toBe('6')
  })
  it('com sorteio: chip "2 times × 2", Formato e Sortear de novo no cabeçalho, sem Montar times', () => {
    const draw: DrawState = { teamCount: 2, teamSize: 2, teams: [['a', 'b'], ['c']], reserves: [], locks: {} }
    setup(GAME(['a', 'b', 'c'], draw))
    expect(screen.getByText('2 times × 2')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Formato' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Sortear de novo' })).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Montar times' })).toBeNull()
    expect(screen.queryByText('Monte os times em três passos')).toBeNull()
  })
  it('Formato abre o modal do formato', () => {
    const draw: DrawState = { teamCount: 2, teamSize: 2, teams: [['a', 'b'], ['c']], reserves: [], locks: {} }
    setup(GAME(['a', 'b', 'c'], draw))
    fireEvent.click(screen.getByRole('button', { name: 'Formato' }))
    expect(screen.getByTestId('teams-value').textContent).toBe('2')
    expect(screen.getByTestId('size-value').textContent).toBe('2')
  })
  it('sorteio com todas as listas vazias é estado vazio: onboarding, sem cards nem equilíbrio', () => {
    const draw: DrawState = { teamCount: 2, teamSize: 2, teams: [[], []], reserves: [], locks: {} }
    setup(GAME(['a', 'b'], draw))
    expect(screen.getByText('Monte os times em três passos')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Time A' })).toBeNull()
    expect(screen.queryByText('Equilíbrio')).toBeNull()
    expect(screen.queryByRole('button', { name: 'Formato' })).toBeNull()
  })
  it('sorteio só com ids desconhecidos também é estado vazio', () => {
    const draw: DrawState = { teamCount: 2, teamSize: 2, teams: [['zz'], []], reserves: [], locks: {} }
    setup(GAME(['a', 'b'], draw))
    expect(screen.getByText('Monte os times em três passos')).toBeTruthy()
    expect(screen.queryByRole('heading', { name: 'Time A' })).toBeNull()
  })
  it('onboarding: passo 1 concluído e botão habilitado com 2 marcados; desabilitado com 1', () => {
    setup(GAME(['a']))
    expect((screen.getByRole('button', { name: 'Montar times' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('1').className).not.toContain('bg-navy')
    cleanup()
    setup(GAME(['a', 'b']))
    expect((screen.getByRole('button', { name: 'Montar times' }) as HTMLButtonElement).disabled).toBe(false)
    expect(screen.getByText('1').className).toContain('bg-navy')
  })
  it('onboarding: o clique em Montar times abre o formato', () => {
    setup(GAME(['a', 'b']))
    open()
    expect(screen.getByTestId('teams-value')).toBeTruthy()
  })
  it('sem jogo: Montar times desabilitado com dica', () => {
    setup(null)
    expect((screen.getByRole('button', { name: 'Montar times' }) as HTMLButtonElement).disabled).toBe(true)
    expect(screen.getByText('Cadastre a data do jogo primeiro')).toBeTruthy()
    expect(screen.getByText('Monte os times em três passos')).toBeTruthy()
  })
})

describe('sortear', () => {
  it('sorteia só os pagos com a config do modal e mostra o resultado sem fazer requisição', () => {
    const { fetchMock, onGameChange } = setup(GAME(['a', 'b', 'd', 'e', 'f']))
    open()
    // 5 pagos; 2 times de 2
    for (let i = 0; i < 5; i++) fireEvent.click(screen.getByRole("button", { name: "Menos jogadores por time" }))
    fireEvent.click(screen.getByRole('button', { name: 'Mais jogadores por time' }))
    expect(screen.getByTestId('size-value').textContent).toBe('2')
    fireEvent.click(screen.getByRole('button', { name: 'Sortear' }))

    expect(fetchMock).not.toHaveBeenCalled()
    expect(onGameChange).toHaveBeenCalledTimes(1)
    const draw = lastDraw(onGameChange)
    expect(draw.teamCount).toBe(2)
    expect(draw.teamSize).toBe(2)
    expect([...draw.teams.flat(), ...draw.reserves].sort()).toEqual(['a', 'b', 'd', 'e', 'f'])
    expect(draw.teams.every((t) => t.length <= 2)).toBe(true)

    expect(screen.getByRole('heading', { name: 'Time A' })).toBeTruthy()
    expect(screen.getByText('Reservas · 1')).toBeTruthy()
    expect(screen.getByText('Equilíbrio')).toBeTruthy()
    expect(screen.getByText('2 times × 2')).toBeTruthy()
  })

  it('nomes duplicados aparecem separadamente', () => {
    setup(GAME(['a', 'f']))
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Sortear' }))
    expect(screen.getAllByText('Ana')).toHaveLength(2)
  })

  it('rodapé com as duas dicas e sem aviso quando ninguém ficou de fora', () => {
    const draw: DrawState = { teamCount: 2, teamSize: 1, teams: [['a'], ['b']], reserves: [], locks: {} }
    setup(GAME(['a', 'b'], draw))
    expect(screen.getByText('Arraste para trocar de time')).toBeTruthy()
    expect(screen.getByText('Cadeado mantém o jogador no time ao sortear de novo')).toBeTruthy()
    expect(screen.queryByText(/de fora/)).toBeNull()
  })

  it('aviso de jogador que ficou de fora depois do sorteio', () => {
    const draw: DrawState = { teamCount: 2, teamSize: 1, teams: [['a'], ['b']], reserves: [], locks: {} }
    setup(GAME(['a', 'b', 'c'], draw))
    expect(screen.getByText('1 jogador ficou de fora — sorteie de novo para incluir.')).toBeTruthy()
  })
  it('aviso no plural', () => {
    const draw: DrawState = { teamCount: 2, teamSize: 1, teams: [['a'], ['b']], reserves: [], locks: {} }
    setup(GAME(['a', 'b', 'c', 'd'], draw))
    expect(screen.getByText('2 jogadores ficaram de fora — sorteie de novo para incluir.')).toBeTruthy()
  })

  it('Sortear de novo mantém a config guardada e as travas só de pagos', () => {
    const draw: DrawState = { teamCount: 3, teamSize: 1, teams: [['a'], ['b'], ['c']], reserves: [], locks: { a: 0, e: 1, b: 2 } }
    const { fetchMock, onGameChange } = setup(GAME(['a', 'b', 'c'], draw))
    // e (travado) não pagou; b está na trava 2 → ok
    fireEvent.click(screen.getByRole('button', { name: 'Sortear de novo · 2 travados' }))
    expect(fetchMock).not.toHaveBeenCalled()
    const next = lastDraw(onGameChange)
    expect(next.teamCount).toBe(3)
    expect(next.teamSize).toBe(1)
    expect(next.locks).toEqual({ a: 0, b: 2 })
    expect(next.teams.flat().sort()).toEqual(['a', 'b', 'c'])
  })

  it('sem rodar nada no servidor, Sortear de novo várias vezes só edita o rascunho', () => {
    const draw: DrawState = { teamCount: 2, teamSize: 1, teams: [['a'], ['b']], reserves: [], locks: {} }
    const { fetchMock, onGameChange } = setup(GAME(['a', 'b'], draw))
    const btn = screen.getByRole('button', { name: 'Sortear de novo' })
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(onGameChange).toHaveBeenCalledTimes(2)
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('com o rascunho salvando (externalBusy), os botões ficam desabilitados', () => {
    const draw: DrawState = { teamCount: 2, teamSize: 1, teams: [['a'], ['b']], reserves: [], locks: {} }
    const { onGameChange } = setup(GAME(['a', 'b'], draw), { externalBusy: true })
    const btn = screen.getByRole('button', { name: 'Sortear de novo' }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    expect(btn.getAttribute('aria-busy')).toBe('true')
    expect((screen.getByRole('button', { name: 'Formato' }) as HTMLButtonElement).disabled).toBe(true)
    fireEvent.click(btn)
    expect(onGameChange).not.toHaveBeenCalled()
  })

  it('jogadores não pagos nunca entram, mesmo que existam na lista', () => {
    const { onGameChange } = setup(GAME(['a', 'b', 'ghost']))
    open()
    fireEvent.click(screen.getByRole('button', { name: 'Sortear' }))
    const draw = lastDraw(onGameChange)
    expect([...draw.teams.flat(), ...draw.reserves].sort()).toEqual(['a', 'b'])
  })
})
