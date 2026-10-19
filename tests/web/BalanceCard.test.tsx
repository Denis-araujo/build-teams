// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest'
import { cleanup, render, screen } from '@testing-library/react'
import { BalanceCard } from '../../src/web/components/BalanceCard'

afterEach(cleanup)

const R = new Map([['a', 4], ['b', 3.5], ['c', 2], ['d', 5]])

describe('BalanceCard', () => {
  it('tamanhos iguais: diferença das somas, tag e um segmento por time com letra e total', () => {
    render(<BalanceCard teams={[['a', 'c'], ['b', 'd']]} ratingById={R} />)
    expect(screen.getByText('Equilíbrio')).toBeTruthy()
    // totais 6 e 8,5 → diferença 2,5 → Desequilibrado (tol 0,5; 3·tol = 1,5)
    expect(screen.getByText('Diferença 2,5 ★')).toBeTruthy()
    expect(screen.getByText('Desequilibrado')).toBeTruthy()
    const bar = screen.getByTestId('balance-bar')
    expect(Array.from(bar.children).map((c) => c.textContent)).toEqual(['A6 ★', 'B8,5 ★'])
  })

  it('tamanhos diferentes: texto "na média por jogador" e peso pela média', () => {
    render(<BalanceCard teams={[['a', 'b', 'c'], ['d']]} ratingById={R} />)
    expect(screen.getByText('Diferença 1,8 ★ na média por jogador')).toBeTruthy()
    const [a, b] = Array.from(screen.getByTestId('balance-bar').children) as HTMLElement[]
    expect(a.style.flexGrow).toBe(String(9.5 / 3))
    expect(b.style.flexGrow).toBe('5')
  })

  it('tamanhos iguais: o peso do segmento é o total, com mínimo de 0,1', () => {
    render(<BalanceCard teams={[['a'], ['zzz']]} ratingById={R} />)
    const [a, b] = Array.from(screen.getByTestId('balance-bar').children) as HTMLElement[]
    expect(a.style.flexGrow).toBe('4')
    expect(a.style.flexShrink).toBe('1')
    expect(b.style.flexGrow).toBe('0.1')
  })

  it('cada segmento usa a cor do time', () => {
    render(<BalanceCard teams={[['a'], ['b']]} ratingById={R} />)
    const [a, b] = Array.from(screen.getByTestId('balance-bar').children) as HTMLElement[]
    expect(a.style.background).toBe('rgb(36, 54, 90)')
    expect(a.style.color).toBe('rgb(243, 245, 254)')
    expect(b.style.background).toBe('rgb(159, 178, 212)')
  })

  it('os 3 tons mudam o estilo da tag', () => {
    const { rerender } = render(<BalanceCard teams={[['a'], ['b']]} ratingById={R} />)
    // 4 vs 3,5 → 0,5 → Equilibrado (gold)
    expect(screen.getByText('Equilibrado').className).toContain('bg-gold-tint')
    rerender(<BalanceCard teams={[['b'], ['c']]} ratingById={R} />)
    // 1,5 → Quase parelho
    expect(screen.getByText('Quase parelho').className).toContain('bg-bg')
    rerender(<BalanceCard teams={[['d'], ['c', 'x']]} ratingById={R} />)
    // 5 vs 2 → Desequilibrado (navy)
    expect(screen.getByText('Desequilibrado').className).toContain('bg-navy')
  })
})
