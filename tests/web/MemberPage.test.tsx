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
    showStars: false,
    players: [
      { id: 'a', name: 'Rafael', paid: true },
      { id: 'b', name: 'Bruno', paid: false },
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
        players: [{ id: 'a', name: 'Rafael', paid: true, rating: 4.5 }],
      }),
    )
    await screen.findByText('Rafael')
    expect(screen.getByLabelText('4,5 estrelas')).toBeTruthy()
  })

  it('depois do sorteio mostra times e reservas', async () => {
    setup(
      game({
        players: [
          { id: 'a', name: 'Rafael', paid: true },
          { id: 'b', name: 'Bruno', paid: true },
          { id: 'c', name: 'Caio', paid: false },
        ],
        teams: [['Rafael'], ['Bruno']],
        reserves: ['Caio'],
      }),
    )
    expect(await screen.findByText('Time A')).toBeTruthy()
    expect(screen.getByText('Time B')).toBeTruthy()
    expect(screen.getAllByText('1 jogador')).toHaveLength(2)
    expect(screen.getByText('Reservas')).toBeTruthy()
    expect(screen.getAllByText('Rafael').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Caio').length).toBeGreaterThan(0)
    expect(screen.queryByText('Os times ainda não foram sorteados')).toBeNull()
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
  })
})
