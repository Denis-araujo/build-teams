// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { DrawModal } from '../../src/web/components/DrawModal'

afterEach(cleanup)

type Over = Partial<Parameters<typeof DrawModal>[0]>
function setup(over: Over = {}) {
  const onConfirm = vi.fn()
  const onClose = vi.fn()
  const utils = render(
    <DrawModal
      open
      paidCount={14}
      initial={{ teamCount: 2, teamSize: 6 }}
      lockedCount={0}
      hasTeams={false}
      onConfirm={onConfirm}
      onClose={onClose}
      {...over}
    />,
  )
  return { onConfirm, onClose, ...utils }
}
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }))
const confirmBtn = () => screen.getByRole('button', { name: /^Sortear/ }) as HTMLButtonElement

describe('estrutura', () => {
  it('não renderiza fechado', () => {
    setup({ open: false })
    expect(screen.queryByRole('dialog')).toBeNull()
  })
  it('dialog modal rotulado pelo título, com a contagem de pagos', () => {
    setup()
    const d = screen.getByRole('dialog', { name: 'Montar times' })
    expect(d.getAttribute('aria-modal')).toBe('true')
    expect(screen.getByText('14 pagaram')).toBeTruthy()
  })
})

describe('resumo', () => {
  it('14 pagos, 2x6', () => {
    setup()
    expect(screen.getByText('12 vagas · 2 convocados ficam como reserva.')).toBeTruthy()
  })
  it('singular', () => {
    setup({ paidCount: 13 })
    expect(screen.getByText('12 vagas · 1 convocado fica como reserva.')).toBeTruthy()
  })
  it('todos jogam', () => {
    setup({ paidCount: 12 })
    expect(screen.getByText('12 vagas · todos os 12 pagos jogam.')).toBeTruthy()
  })
  it('menos pagos que vagas', () => {
    setup({ paidCount: 10 })
    expect(screen.getByText('10 pagos para 12 vagas · alguns times ficam com menos jogadores.')).toBeTruthy()
  })
  it('menos pagos que times', () => {
    setup({ paidCount: 1 })
    expect(screen.getByText('Marque pelo menos 2 jogadores como pagos (um por time).')).toBeTruthy()
    expect(confirmBtn().disabled).toBe(true)
  })
  it('nota de travas só com sorteio existente', () => {
    setup({ hasTeams: true, lockedCount: 1 })
    expect(screen.getByText('12 vagas · 2 convocados ficam como reserva. 1 jogador travado será mantido.')).toBeTruthy()
    cleanup()
    setup({ hasTeams: true, lockedCount: 3 })
    expect(screen.getByText(/3 jogadores travados serão mantidos\.$/)).toBeTruthy()
    cleanup()
    setup({ hasTeams: false, lockedCount: 3 })
    expect(screen.queryByText(/travad/)).toBeNull()
  })
})

describe('controles', () => {
  it('atalho 3 times de 4 ajusta os dois valores', () => {
    setup()
    click('3 times de 4')
    expect(screen.getByText('12 vagas · 2 convocados ficam como reserva.')).toBeTruthy()
    expect(screen.getByTestId('teams-value').textContent).toBe('3')
    expect(screen.getByTestId('size-value').textContent).toBe('4')
  })
  it('− trava em 2 times e 1 jogador; + trava em 8 e 12', () => {
    setup({ initial: { teamCount: 2, teamSize: 1 }, paidCount: 20 })
    click('Menos times')
    click('Menos jogadores por time')
    expect(screen.getByTestId('teams-value').textContent).toBe('2')
    expect(screen.getByTestId('size-value').textContent).toBe('1')
    for (let i = 0; i < 10; i++) click('Mais times')
    for (let i = 0; i < 15; i++) click('Mais jogadores por time')
    expect(screen.getByTestId('teams-value').textContent).toBe('8')
    expect(screen.getByTestId('size-value').textContent).toBe('12')
  })
  it('confirmar chama onConfirm com os valores; rótulo muda com sorteio existente', () => {
    const { onConfirm } = setup()
    click('3 times de 4')
    click('Sortear')
    expect(onConfirm).toHaveBeenCalledWith({ teamCount: 3, teamSize: 4 })
    cleanup()
    setup({ hasTeams: true })
    expect(confirmBtn().textContent).toBe('Sortear de novo')
  })
  it('desabilitado não confirma', () => {
    const { onConfirm } = setup({ paidCount: 1 })
    fireEvent.click(confirmBtn())
    expect(onConfirm).not.toHaveBeenCalled()
  })
})

describe('fechar e foco', () => {
  it('Cancelar, fundo e Esc fecham; clique dentro não', () => {
    const { onClose } = setup()
    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()
    click('Cancelar')
    expect(onClose).toHaveBeenCalledTimes(1)
    fireEvent.click(screen.getByTestId('modal-backdrop'))
    expect(onClose).toHaveBeenCalledTimes(2)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(3)
  })
  it('remove o listener de Esc ao fechar', () => {
    const onClose = vi.fn()
    const props = { paidCount: 14, initial: { teamCount: 2, teamSize: 6 }, lockedCount: 0, hasTeams: false, onConfirm: vi.fn(), onClose }
    const { rerender } = render(<DrawModal open {...props} />)
    rerender(<DrawModal open={false} {...props} />)
    fireEvent.keyDown(document, { key: 'Escape' })
    expect(onClose).not.toHaveBeenCalled()
  })
  it('foco entra no dialog e volta ao abridor', () => {
    const props = { paidCount: 14, initial: { teamCount: 2, teamSize: 6 }, lockedCount: 0, hasTeams: false, onConfirm: vi.fn(), onClose: vi.fn() }
    const opener = document.createElement('button')
    document.body.appendChild(opener)
    opener.focus()
    const { rerender } = render(<DrawModal open {...props} />)
    expect(screen.getByRole('dialog').contains(document.activeElement)).toBe(true)
    rerender(<DrawModal open={false} {...props} />)
    expect(document.activeElement).toBe(opener)
    opener.remove()
  })
  it('Tab no último controle volta ao primeiro (e Shift+Tab ao contrário)', () => {
    setup()
    const d = screen.getByRole('dialog')
    const focusables = Array.from(d.querySelectorAll<HTMLElement>('button:not(:disabled)'))
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    last.focus()
    fireEvent.keyDown(last, { key: 'Tab' })
    expect(document.activeElement).toBe(first)
    first.focus()
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true })
    expect(document.activeElement).toBe(last)
  })
})
