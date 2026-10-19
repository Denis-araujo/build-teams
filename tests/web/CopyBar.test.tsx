// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { CopyBar } from '../../src/web/components/CopyBar'
import type { Player } from '../../src/shared/types'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.unstubAllGlobals()
})

const P = (id: string, name: string, rating: number): Player => ({ id, name, rating, archived: false })
const teams = [[P('a', 'Ana', 4.5), P('b', 'Bia', 3)], [P('c', 'Cris', 2)]]
const reserves = [P('d', 'Duda', 5)]
const WITHOUT = '🏐 *Escalação · Vôlei*\nSábado, 24/10 · 3 jogadores\n\n*Time A*\n1. Ana\n2. Bia\n\n*Time B*\n1. Cris\n\nReservas: Duda'

function mount() {
  render(<CopyBar date="2026-10-24" teams={teams} reserves={reserves} />)
}
const findArea = () => waitFor(() => {
  const el = document.querySelector('textarea')
  if (!el) throw new Error('sem textarea')
  return el as HTMLTextAreaElement
})
const copyBtn = () => screen.getByRole('button', { name: /Copiar escalação|Copiado/ })

describe('CopyBar', () => {
  it('copia o texto sem estrelas por padrão', async () => {
    const writeText = vi.fn(async () => {})
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    mount()
    expect((screen.getByLabelText('Incluir estrelas') as HTMLInputElement).checked).toBe(false)
    fireEvent.click(copyBtn())
    await screen.findByRole('button', { name: 'Copiado ✓' })
    expect(writeText).toHaveBeenCalledWith(WITHOUT)
  })

  it('com estrelas inclui ★4,5', async () => {
    const writeText = vi.fn(async () => {})
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    mount()
    fireEvent.click(screen.getByLabelText('Incluir estrelas'))
    fireEvent.click(copyBtn())
    await screen.findByRole('button', { name: 'Copiado ✓' })
    expect((writeText.mock.calls[0] as unknown[])[0]).toContain('1. Ana ★4,5')
  })

  it('Copiado ✓ some depois de 2 s', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(async () => {}) } })
    mount()
    await act(async () => {
      fireEvent.click(copyBtn())
    })
    expect(screen.getByRole('button', { name: 'Copiado ✓' })).toBeTruthy()
    act(() => {
      vi.advanceTimersByTime(1999)
    })
    expect(screen.getByRole('button', { name: 'Copiado ✓' })).toBeTruthy()
    act(() => {
      vi.advanceTimersByTime(2)
    })
    expect(screen.getByRole('button', { name: 'Copiar escalação' })).toBeTruthy()
  })

  it('clipboard rejeitando mostra o texto numa textarea somente leitura', async () => {
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(async () => Promise.reject(new Error('no'))) } })
    mount()
    fireEvent.click(copyBtn())
    const ta = await findArea()
    expect(ta.tagName).toBe('TEXTAREA')
    expect(ta.readOnly).toBe(true)
    expect(ta.value).toBe(WITHOUT)
    expect(screen.getByText('Copie o texto acima manualmente')).toBeTruthy()
  })

  it('sem navigator.clipboard mostra a textarea', async () => {
    vi.stubGlobal('navigator', {})
    mount()
    fireEvent.click(copyBtn())
    const ta = await findArea()
    expect(ta.readOnly).toBe(true)
    expect(ta.value).toBe(WITHOUT)
  })
})
