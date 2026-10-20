// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { buildWhatsAppText } from '../../src/shared/whatsapp'
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
const WITH =
  '🏐 *Escalação · Vôlei*\nSábado, 24/10 · 3 jogadores\n\n*Time A*\n1. Ana ★4,5\n2. Bia ★3\n\n*Time B*\n1. Cris ★2\n\nReservas: Duda'
const WITHOUT = '🏐 *Escalação · Vôlei*\nSábado, 24/10 · 3 jogadores\n\n*Time A*\n1. Ana\n2. Bia\n\n*Time B*\n1. Cris\n\nReservas: Duda'

function mount(time?: string) {
  render(<CopyBar date="2026-10-24" time={time} teams={teams} reserves={reserves} />)
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

  it('com hora, a linha do dia traz " às 19:00"; sem hora, fica como antes', async () => {
    const writeText = vi.fn(async () => {})
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    mount('19:00')
    fireEvent.click(copyBtn())
    await screen.findByRole('button', { name: 'Copiado ✓' })
    const text = (writeText.mock.calls[0] as unknown[])[0] as string
    expect(text.split('\n')[1]).toBe('Sábado, 24/10 às 19:00 · 3 jogadores')
    cleanup()
    const again = vi.fn(async () => {})
    vi.stubGlobal('navigator', { clipboard: { writeText: again } })
    mount()
    fireEvent.click(copyBtn())
    await screen.findByRole('button', { name: 'Copiado ✓' })
    expect(again).toHaveBeenCalledWith(WITHOUT)
  })

  it('com estrelas inclui ★4,5', async () => {
    const writeText = vi.fn(async () => {})
    vi.stubGlobal('navigator', { clipboard: { writeText } })
    mount()
    fireEvent.click(screen.getByLabelText('Incluir estrelas'))
    fireEvent.click(copyBtn())
    await screen.findByRole('button', { name: 'Copiado ✓' })
    expect((writeText.mock.calls[0] as unknown[])[0]).toBe(WITH)
    expect(WITH).toBe(buildWhatsAppText({ date: '2026-10-24', teams, reserves, includeStars: true }))
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

  it('trocar os times atualiza o texto do fallback', async () => {
    vi.stubGlobal('navigator', {})
    const view = render(<CopyBar date="2026-10-24" teams={teams} reserves={reserves} />)
    fireEvent.click(copyBtn())
    expect((await findArea()).value).toBe(WITHOUT)
    view.rerender(<CopyBar date="2026-10-24" teams={[[teams[0][0]]]} reserves={[]} />)
    expect((await findArea()).value).toBe('🏐 *Escalação · Vôlei*\nSábado, 24/10 · 1 jogador\n\n*Time A*\n1. Ana')
  })

  it('focar a textarea seleciona tudo', async () => {
    vi.stubGlobal('navigator', {})
    mount()
    fireEvent.click(copyBtn())
    const ta = await findArea()
    fireEvent.focus(ta)
    expect(ta.selectionStart).toBe(0)
    expect(ta.selectionEnd).toBe(WITHOUT.length)
  })

  it('desmontar limpa o timer e ignora a promessa que resolve depois', async () => {
    vi.useFakeTimers()
    let resolve!: () => void
    vi.stubGlobal('navigator', { clipboard: { writeText: () => new Promise<void>((r) => (resolve = r)) } })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const view = render(<CopyBar date="2026-10-24" teams={teams} reserves={reserves} />)
    fireEvent.click(copyBtn())
    view.unmount()
    await act(async () => resolve())
    expect(vi.getTimerCount()).toBe(0)
    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })

  it('desmontar com Copiado ✓ visível não deixa timer', async () => {
    vi.useFakeTimers()
    vi.stubGlobal('navigator', { clipboard: { writeText: vi.fn(async () => {}) } })
    const view = render(<CopyBar date="2026-10-24" teams={teams} reserves={reserves} />)
    await act(async () => {
      fireEvent.click(copyBtn())
    })
    expect(vi.getTimerCount()).toBe(1)
    view.unmount()
    expect(vi.getTimerCount()).toBe(0)
  })
})
