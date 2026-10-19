// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { GameCard } from '../../src/web/components/GameCard'

beforeEach(() => vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-19T15:00:00Z') }))
afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

const game = (date: string) => ({ date, time: '19:00' })

it.each([
  ['2026-10-19', 'Hoje'],
  ['2026-10-20', 'Amanhã'],
  ['2026-10-24', 'Em 5 dias'],
])('chip de %s (%s) usa o estilo dourado', (date, text) => {
  render(<GameCard game={game(date)} />)
  const chip = screen.getByText(text)
  expect(chip.className).toContain('bg-gold-tint')
  expect(chip.className).toContain('text-gold-ink')
  expect(chip.className).not.toContain('text-neutral-400')
})

it('chip "Já aconteceu" usa o estilo neutro', () => {
  render(<GameCard game={game('2026-10-18')} />)
  const chip = screen.getByText('Já aconteceu')
  expect(chip.className).toContain('bg-bg')
  expect(chip.className).toContain('text-neutral-400')
  expect(chip.className).not.toContain('bg-gold-tint')
})

it('"às" fica em cinza e peso normal', () => {
  render(<GameCard game={game('2026-10-24')} />)
  const as = screen.getByText('às')
  expect(as.className).toContain('text-neutral-400')
  expect(as.className).toContain('font-normal')
})
