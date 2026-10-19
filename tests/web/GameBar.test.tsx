// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { GameBar } from '../../src/web/components/GameBar'
import type { Game } from '../../src/shared/types'

afterEach(cleanup)

const G1: Game = { id: 'g1', date: '2026-10-24', paid: [], draw: null }

it('sincroniza o campo de data quando o jogo ativo muda', () => {
  const noop = () => {}
  const { rerender } = render(<GameBar game={G1} setGame={noop} onUnauthorized={noop} />)
  const input = () => screen.getByLabelText('Data do jogo') as HTMLInputElement
  expect(input().value).toBe('2026-10-24')
  rerender(<GameBar game={{ ...G1, id: 'g2', date: '2026-11-07' }} setGame={noop} onUnauthorized={noop} />)
  expect(input().value).toBe('2026-11-07')
  rerender(<GameBar game={null} setGame={noop} onUnauthorized={noop} />)
  expect(input().value).toBe('')
})
