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
})

it('sem subtítulo não renderiza a linha; com onLogout o botão Sair chama o callback', () => {
  const onLogout = vi.fn()
  render(<SiteHeader roleLabel="Acesso restrito" onLogout={onLogout} />)
  expect(screen.getByText('Escalação').parentElement!.children).toHaveLength(1)
  fireEvent.click(screen.getByRole('button', { name: 'Sair' }))
  expect(onLogout).toHaveBeenCalledTimes(1)
})
