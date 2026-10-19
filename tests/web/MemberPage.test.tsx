// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../../src/web/App'
import type { PublicGame } from '../../src/shared/types'

function respond(body: unknown, ok = true, status = 200) {
  return { ok, status, json: async () => body } as Response
}

function game(over: Partial<PublicGame> = {}): PublicGame {
  return {
    date: '2026-10-17',
    time: '19:00',
    showStars: false,
    players: [
      { id: 'p1', name: 'Rafael', paid: true },
      { id: 'p2', name: 'Bruno', paid: false },
    ],
    teams: [],
    reserves: [],
    ...over,
  }
}

function setup(body: unknown) {
  const fetchMock = vi.fn(async () => respond(body))
  vi.stubGlobal('fetch', fetchMock)
  render(
    <MemoryRouter initialEntries={['/']}>
      <App />
    </MemoryRouter>,
  )
  return fetchMock
}

const STARS = '[aria-label$="estrelas"], [aria-label$="estrela"]'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('MemberPage', () => {
  it('mostra "Nenhum jogo marcado" quando não há jogo', async () => {
    setup(null)
    expect(await screen.findByText('Nenhum jogo marcado')).toBeTruthy()
  })

  it('primeira busca falha: avisa que tenta de novo e não diz que não há jogo; o próximo poll recupera', async () => {
    vi.useFakeTimers()
    let n = 0
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => (n++ === 0 ? respond({ error: 'x' }, false, 500) : respond(game()))),
    )
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )
    await act(async () => {})
    expect(screen.getByRole('status').textContent).toBe('Não foi possível carregar a escalação. Tentando de novo…')
    expect(screen.queryByText('Nenhum jogo marcado')).toBeNull()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(30000)
    })
    expect(screen.getByText('Rafael')).toBeTruthy()
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('mostra a data e o elenco com o status de pagamento', async () => {
    setup(game())
    expect(await screen.findByText('Sábado, 17/10')).toBeTruthy()
    expect(screen.getByText('Os times ainda não foram sorteados')).toBeTruthy()
    expect(screen.getByText('Rafael')).toBeTruthy()
    expect(screen.getByText('Bruno')).toBeTruthy()
    expect(screen.getAllByText('Pago')).toHaveLength(1)
    expect(screen.getAllByText('Aguardando')).toHaveLength(1)
  })

  it('sem rating na resposta não há estrelas na tela', async () => {
    setup(game())
    await screen.findByText('Rafael')
    expect(document.querySelector(STARS)).toBeNull()
  })

  it('com rating mostra as estrelas', async () => {
    setup(
      game({
        showStars: true,
        players: [{ id: 'p1', name: 'Rafael', paid: true, rating: 4.5 }],
      }),
    )
    await screen.findByText('Rafael')
    expect(screen.getByLabelText('4,5 estrelas')).toBeTruthy()
  })

  it('depois do sorteio mostra times (por id) e reservas', async () => {
    setup(
      game({
        players: [
          { id: 'p1', name: 'Rafael', paid: true },
          { id: 'p2', name: 'Bruno', paid: true },
          { id: 'p3', name: 'Caio', paid: false },
        ],
        teams: [['p1'], ['p2']],
        reserves: ['p3'],
      }),
    )
    expect(await screen.findByRole('heading', { name: 'Time A' })).toBeTruthy()
    expect(screen.getByRole('heading', { name: 'Time B' })).toBeTruthy()
    expect(screen.getAllByText('1 jogador')).toHaveLength(2)
    expect(screen.getByRole('heading', { name: 'Reservas' })).toBeTruthy()
    const cardA = screen.getByRole('heading', { name: 'Time A' }).closest('section')!
    expect(cardA.textContent).toContain('Rafael')
    expect(cardA.textContent).not.toContain('p1')
    const reserves = screen.getByRole('heading', { name: 'Reservas' }).closest('section')!
    expect(reserves.textContent).toContain('Caio')
    expect(document.body.textContent).not.toMatch(/p[123]/)
    expect(screen.queryByText('Os times ainda não foram sorteados')).toBeNull()
  })

  it('nomes repetidos: cada card mostra as próprias estrelas', async () => {
    setup(
      game({
        showStars: true,
        players: [
          { id: 'p1', name: 'João', paid: true, rating: 2 },
          { id: 'p2', name: 'João', paid: true, rating: 4.5 },
        ],
        teams: [['p1'], ['p2']],
      }),
    )
    const a = (await screen.findByRole('heading', { name: 'Time A' })).closest('section')!
    const b = screen.getByRole('heading', { name: 'Time B' }).closest('section')!
    expect(a.querySelector('[aria-label="2 estrelas"]')).not.toBeNull()
    expect(a.querySelector('[aria-label="4,5 estrelas"]')).toBeNull()
    expect(b.querySelector('[aria-label="4,5 estrelas"]')).not.toBeNull()
  })

  it('id desconhecido num time não quebra a tela', async () => {
    setup(
      game({
        players: [{ id: 'p1', name: 'Rafael', paid: true }],
        teams: [['p1', 'zzz']],
        reserves: ['yyy'],
      }),
    )
    const card = (await screen.findByRole('heading', { name: 'Time A' })).closest('section')!
    expect(card.textContent).toContain('Rafael')
    expect(card.textContent).toContain('1 jogador')
    expect(document.body.textContent).not.toContain('zzz')
    expect(screen.queryByRole('heading', { name: 'Reservas' })).toBeNull()
  })

  it('o título da página é h1 e a data aparece como subtítulo', async () => {
    setup(game())
    expect((await screen.findByRole('heading', { level: 1 })).textContent).toBe('Escalação')
  })

  it('estrelas dentro dos cards quando há rating', async () => {
    setup(
      game({
        showStars: true,
        players: [{ id: 'p1', name: 'Rafael', paid: true, rating: 3.5 }],
        teams: [['p1']],
      }),
    )
    const card = (await screen.findByRole('heading', { name: 'Time A' })).closest('section')!
    expect(card.querySelector('[aria-label="3,5 estrelas"]')).not.toBeNull()
  })

  describe('atualização automática', () => {
    beforeEach(() => {
      vi.useFakeTimers()
    })

    it('busca de novo depois de 30 segundos', async () => {
      const fetchMock = setup(game())
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000)
      })
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('mantém os dados antigos quando a atualização falha', async () => {
      const fetchMock = setup(game())
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })
      expect(screen.getByText('Rafael')).toBeTruthy()
      fetchMock.mockImplementation(async () => respond({}, false, 500))
      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000)
      })
      expect(fetchMock).toHaveBeenCalledTimes(2)
      expect(screen.getByText('Rafael')).toBeTruthy()
    })

    it('resposta antiga não sobrescreve a mais nova', async () => {
      const resolvers: ((r: Response) => void)[] = []
      const fetchMock = vi.fn(() => new Promise<Response>((res) => resolvers.push(res)))
      vi.stubGlobal('fetch', fetchMock)
      render(
        <MemoryRouter initialEntries={['/']}>
          <App />
        </MemoryRouter>,
      )
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'))
      })
      expect(resolvers).toHaveLength(2)
      const newer = game({ players: [{ id: 'p9', name: 'Novo', paid: true }] })
      const older = game({ players: [{ id: 'p8', name: 'Antigo', paid: true }] })
      await act(async () => {
        resolvers[1](respond(newer))
        await vi.advanceTimersByTimeAsync(0)
      })
      await act(async () => {
        resolvers[0](respond(older))
        await vi.advanceTimersByTimeAsync(0)
      })
      expect(screen.getByText('Novo')).toBeTruthy()
      expect(screen.queryByText('Antigo')).toBeNull()
    })

    it('ao desmontar, não busca mais', async () => {
      const fetchMock = setup(game())
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })
      cleanup()
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'))
        await vi.advanceTimersByTimeAsync(90000)
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
    })

    it('busca de novo quando a aba volta a ficar visível', async () => {
      const fetchMock = setup(game())
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0)
      })
      expect(fetchMock).toHaveBeenCalledTimes(1)
      await act(async () => {
        document.dispatchEvent(new Event('visibilitychange'))
        await vi.advanceTimersByTimeAsync(0)
      })
      expect(fetchMock).toHaveBeenCalledTimes(2)
    })

    it('não busca no intervalo enquanto a aba está escondida', async () => {
      const state = vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
      try {
        const fetchMock = setup(game())
        await act(async () => {
          await vi.advanceTimersByTimeAsync(0)
        })
        expect(fetchMock).toHaveBeenCalledTimes(1)
        await act(async () => {
          await vi.advanceTimersByTimeAsync(90000)
        })
        expect(fetchMock).toHaveBeenCalledTimes(1)
        state.mockReturnValue('visible')
        await act(async () => {
          await vi.advanceTimersByTimeAsync(30000)
        })
        expect(fetchMock).toHaveBeenCalledTimes(2)
      } finally {
        state.mockRestore()
      }
    })
  })
})
