// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { Onboarding } from '../../src/web/components/Onboarding'

afterEach(cleanup)

const base = { marked: 2, total: 5, hasGame: true, busy: false }
const button = () => screen.getByRole('button', { name: 'Montar times' }) as HTMLButtonElement
const dot = (n: string) => screen.getByText(n)

describe('Onboarding', () => {
  it('mostra o título, o texto e os 3 passos do v4', () => {
    render(<Onboarding {...base} onOpen={() => {}} />)
    expect(screen.getByText('Monte os times em três passos')).toBeTruthy()
    expect(
      screen.getByText('As estrelas são distribuídas para os times ficarem o mais parelhos possível. Quem passar das vagas vira reserva.'),
    ).toBeTruthy()
    expect(screen.getByText('Convoque')).toBeTruthy()
    expect(screen.getByText('2 de 5 marcados na lista ao lado.')).toBeTruthy()
    expect(screen.getByText('Escolha o formato')).toBeTruthy()
    expect(screen.getByText('Quantos times e quantos jogadores por time.')).toBeTruthy()
    expect(screen.getByText('Sorteie')).toBeTruthy()
    expect(screen.getByText('Ajuste à mão arrastando e trave quem não pode mudar.')).toBeTruthy()
  })

  it('passo 1 concluído com 2 marcados (bolinha navy); com 1 não', () => {
    const { rerender } = render(<Onboarding {...base} onOpen={() => {}} />)
    expect(dot('1').className).toContain('bg-navy')
    expect(dot('2').className).toContain('bg-surface')
    rerender(<Onboarding {...base} marked={1} onOpen={() => {}} />)
    expect(dot('1').className).toContain('bg-surface')
    expect(dot('1').className).not.toContain('bg-navy')
  })

  it('botão habilitado com 2 marcados e jogo; clique abre o formato', () => {
    const onOpen = vi.fn()
    render(<Onboarding {...base} onOpen={onOpen} />)
    expect(button().disabled).toBe(false)
    fireEvent.click(button())
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('desabilitado com 1 marcado, sem jogo ou ocupado', () => {
    const { rerender } = render(<Onboarding {...base} marked={1} onOpen={() => {}} />)
    expect(button().disabled).toBe(true)
    rerender(<Onboarding {...base} hasGame={false} onOpen={() => {}} />)
    expect(button().disabled).toBe(true)
    rerender(<Onboarding {...base} busy onOpen={() => {}} />)
    expect(button().disabled).toBe(true)
  })

  it('sem jogo: dica acessível ligada ao botão; com jogo: sem dica', () => {
    const { rerender } = render(<Onboarding {...base} hasGame={false} onOpen={() => {}} />)
    const hint = screen.getByText('Cadastre a data do jogo primeiro')
    expect(button().getAttribute('aria-describedby')).toBe(hint.id)
    rerender(<Onboarding {...base} onOpen={() => {}} />)
    expect(screen.queryByText('Cadastre a data do jogo primeiro')).toBeNull()
    expect(button().getAttribute('aria-describedby')).toBeNull()
  })
})
