// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { StarRating } from '../../src/web/components/StarRating'

afterEach(cleanup)

it('somente leitura: sem botões e com aria-label', () => {
  render(<StarRating value={4.5} />)
  expect(screen.getByLabelText('4,5 estrelas')).toBeTruthy()
  expect(document.querySelectorAll('button')).toHaveLength(0)
})

it('com onChange: metade esquerda = n - 0,5 (mínimo 1), direita = n', () => {
  const onChange = vi.fn()
  render(<StarRating value={0} onChange={onChange} />)
  expect(document.querySelectorAll('button')).toHaveLength(10)
  const btns = document.querySelectorAll('button')
  fireEvent.click(btns[0]) // esquerda da 1ª
  fireEvent.click(btns[2]) // esquerda da 2ª
  fireEvent.click(btns[9]) // direita da 5ª
  expect(onChange.mock.calls.map((c) => c[0])).toEqual([1, 1.5, 5])
})

it('3ª estrela: metade esquerda = 2,5 e direita = 3, com aria-label por metade', () => {
  const onChange = vi.fn()
  render(<StarRating value={0} onChange={onChange} />)
  fireEvent.click(screen.getByRole('button', { name: '2,5 estrelas' }))
  fireEvent.click(screen.getByRole('button', { name: '3 estrelas' }))
  expect(onChange.mock.calls.map((c) => c[0])).toEqual([2.5, 3])
})

it('1ª estrela: metade esquerda nunca devolve menos que 1', () => {
  const onChange = vi.fn()
  render(<StarRating value={3} onChange={onChange} />)
  const first = document.querySelectorAll('button')[0]
  fireEvent.click(first)
  expect(onChange).toHaveBeenCalledWith(1)
})

it('botões de acerto têm estilo de foco visível', () => {
  render(<StarRating value={3} onChange={() => {}} />)
  const btn = document.querySelector('button') as HTMLElement
  expect(btn.className).toContain('star-hit')
})
