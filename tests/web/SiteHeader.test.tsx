// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { SiteHeader } from '../../src/web/components/SiteHeader'

afterEach(cleanup)

it('mostra o rótulo do papel e o subtítulo, sem botão Sair sem onLogout', () => {
  render(<SiteHeader roleLabel="Membro" subtitle="Sábado, 17 de outubro · 19:00" />)
  expect(screen.getByText('Membro')).toBeTruthy()
  expect(screen.getByText('Sábado, 17 de outubro · 19:00')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Sair' })).toBeNull()
  expect(screen.queryByRole('heading')).toBeNull()
  const order = (a: Node, b: Node) => a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING
  expect(order(screen.getByText('Escalação'), screen.getByText('Sábado, 17 de outubro · 19:00'))).toBeTruthy()
  expect(order(screen.getByText('Sábado, 17 de outubro · 19:00'), screen.getByText('Membro'))).toBeTruthy()
})

it('sem subtítulo só há título e rótulo; com onLogout o botão Sair chama o callback', () => {
  const onLogout = vi.fn()
  render(<SiteHeader roleLabel="Acesso restrito" onLogout={onLogout} />)
  expect(screen.getByText('Escalação')).toBeTruthy()
  expect(screen.getByText('Acesso restrito')).toBeTruthy()
  fireEvent.click(screen.getByRole('button', { name: 'Sair' }))
  expect(onLogout).toHaveBeenCalledTimes(1)
})
