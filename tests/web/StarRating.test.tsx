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
