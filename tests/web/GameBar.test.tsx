// @vitest-environment jsdom
import { afterEach, expect, it } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { GameBar } from '../../src/web/components/GameBar'
import type { Game } from '../../src/shared/types'

afterEach(cleanup)

const G1: Game = { id: 'g1', date: '2026-10-24', time: '20:30', paid: [], draw: null }
const noop = () => {}

it('o formulário abre com o dia e a hora do jogo ativo e com o jogo novo depois que ele muda', () => {
  const { rerender } = render(<GameBar game={G1} setGame={noop} onUnauthorized={noop} />)
  const open = () => fireEvent.click(screen.getByRole('button', { name: 'Alterar' }))
  const day = () => screen.getByLabelText('Dia') as HTMLInputElement
  const hour = () => screen.getByLabelText('Hora') as HTMLInputElement
  open()
  expect(day().value).toBe('2026-10-24')
  expect(hour().value).toBe('20:30')
  fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  rerender(<GameBar game={{ ...G1, id: 'g2', date: '2026-11-07', time: '18:00' }} setGame={noop} onUnauthorized={noop} />)
  open()
  expect(day().value).toBe('2026-11-07')
  expect(hour().value).toBe('18:00')
})

it('sem jogo, "Marcar jogo" abre o formulário vazio com hora padrão 19:00', () => {
  render(<GameBar game={null} setGame={noop} onUnauthorized={noop} />)
  fireEvent.click(screen.getByRole('button', { name: 'Marcar jogo' }))
  expect((screen.getByLabelText('Dia') as HTMLInputElement).value).toBe('')
  expect((screen.getByLabelText('Hora') as HTMLInputElement).value).toBe('19:00')
})
