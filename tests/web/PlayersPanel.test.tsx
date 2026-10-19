// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../../src/web/App'
import type { Game, Player } from '../../src/shared/types'

type Out = { status: number; body?: unknown }
type Routes = Record<string, ((init: RequestInit) => Out | Promise<Out>) | Out>

function respond(status: number, body?: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response
}

const ANA: Player = { id: 'p1', name: 'Ana', rating: 4, archived: false }
const BIA: Player = { id: 'p2', name: 'Bia', rating: 2.5, archived: false }
const GAME: Game = { id: 'g1', date: '2026-10-24', paid: [], draw: null }

function setup(routes: Routes) {
  const fetchMock = vi.fn(async (path: string, init: RequestInit = {}) => {
    const key = `${init.method ?? 'GET'} ${path}`
    const r = routes[key]
    if (!r) return respond(404, { error: `sem rota ${key}` })
    const out = await (typeof r === 'function' ? r(init) : r)
    return respond(out.status, out.body)
  })
  vi.stubGlobal('fetch', fetchMock)
  render(
    <MemoryRouter initialEntries={['/admin']}>
      <App />
    </MemoryRouter>,
  )
  return fetchMock
}

const authed = (over: Routes = {}): Routes => ({
  'GET /api/admin/me': { status: 200, body: { ok: true } },
  'GET /api/admin/game': { status: 200, body: GAME },
  'GET /api/admin/settings': { status: 200, body: { memberSeesStars: false } },
  'GET /api/admin/players': { status: 200, body: [ANA, BIA] },
  ...over,
})

const calls = (f: ReturnType<typeof vi.fn>, key: string) =>
  f.mock.calls.filter(([p, i]) => `${(i as RequestInit | undefined)?.method ?? 'GET'} ${p}` === key)
const body = (c: unknown[]) => (c[1] as RequestInit).body

const pagou = (name: string) => screen.findByLabelText(`Pagou: ${name}`) as Promise<HTMLInputElement>

beforeEach(() => {
  vi.stubGlobal('confirm', vi.fn(() => true))
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('adicionar', () => {
  it('botão desabilitado com nome em branco', async () => {
    setup(authed())
    await pagou('Ana')
    const btn = screen.getByRole('button', { name: 'Adicionar' }) as HTMLButtonElement
    expect(btn.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Nome do jogador'), { target: { value: '   ' } })
    expect(btn.disabled).toBe(true)
    fireEvent.change(screen.getByLabelText('Nome do jogador'), { target: { value: 'Cris' } })
    expect(btn.disabled).toBe(false)
  })

  it('POST com {name, rating} (padrão 3), acrescenta o jogador e limpa o formulário', async () => {
    const CRIS: Player = { id: 'p3', name: 'Cris', rating: 3, archived: false }
    const f = setup(authed({ 'POST /api/admin/players': { status: 201, body: CRIS } }))
    await pagou('Ana')
    const input = screen.getByLabelText('Nome do jogador') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Cris' } })
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }))
    expect(await pagou('Cris')).toBeTruthy()
    expect(JSON.parse(body(calls(f, 'POST /api/admin/players')[0]) as string)).toEqual({ name: 'Cris', rating: 3 })
    expect(input.value).toBe('')
  })

  it('usa a nota escolhida nas estrelas do formulário', async () => {
    const f = setup(authed({ 'POST /api/admin/players': { status: 201, body: { ...ANA, id: 'p9', name: 'Dani' } } }))
    await pagou('Ana')
    const form = screen.getByRole('form', { name: 'Novo jogador' })
    fireEvent.click(within(form).getByRole('button', { name: '4,5 estrelas' }))
    fireEvent.change(screen.getByLabelText('Nome do jogador'), { target: { value: 'Dani' } })
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }))
    await pagou('Dani')
    expect(JSON.parse(body(calls(f, 'POST /api/admin/players')[0]) as string)).toEqual({ name: 'Dani', rating: 4.5 })
  })

  it('erro 400 aparece com role=alert e mantém o nome digitado', async () => {
    setup(authed({ 'POST /api/admin/players': { status: 400, body: { error: 'Nome inválido' } } }))
    await pagou('Ana')
    const input = screen.getByLabelText('Nome do jogador') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'X' } })
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Nome inválido')
    expect(input.value).toBe('X')
  })
})

describe('lista', () => {
  it('clicar na nota do jogador faz PATCH {rating}', async () => {
    const f = setup(authed({ 'PATCH /api/admin/players/p1': { status: 200, body: { ...ANA, rating: 5 } } }))
    await pagou('Ana')
    const row = screen.getByTestId('player-p1')
    fireEvent.click(within(row).getByRole('button', { name: '5 estrelas' }))
    await waitFor(() => expect(within(row).getByRole('group', { name: '5 estrelas' })).toBeTruthy())
    expect(JSON.parse(body(calls(f, 'PATCH /api/admin/players/p1')[0]) as string)).toEqual({ rating: 5 })
  })

  it('renomear ao sair do campo faz PATCH {name}', async () => {
    const f = setup(authed({ 'PATCH /api/admin/players/p1': { status: 200, body: { ...ANA, name: 'Ana Maria' } } }))
    await pagou('Ana')
    const input = screen.getByLabelText('Nome de Ana') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Ana Maria' } })
    fireEvent.blur(input)
    expect(await pagou('Ana Maria')).toBeTruthy()
    expect(JSON.parse(body(calls(f, 'PATCH /api/admin/players/p1')[0]) as string)).toEqual({ name: 'Ana Maria' })
  })

  it('Enter também confirma o nome', async () => {
    const f = setup(authed({ 'PATCH /api/admin/players/p1': { status: 200, body: { ...ANA, name: 'Aninha' } } }))
    await pagou('Ana')
    const input = screen.getByLabelText('Nome de Ana')
    fireEvent.change(input, { target: { value: 'Aninha' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await pagou('Aninha')
    expect(calls(f, 'PATCH /api/admin/players/p1')).toHaveLength(1)
  })

  it('erro 400 ao renomear reverte o nome e mostra o erro', async () => {
    setup(authed({ 'PATCH /api/admin/players/p1': { status: 400, body: { error: 'Nome já existe' } } }))
    await pagou('Ana')
    const input = screen.getByLabelText('Nome de Ana') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Bia' } })
    fireEvent.blur(input)
    expect((await screen.findByRole('alert')).textContent).toBe('Nome já existe')
    expect(input.value).toBe('Ana')
  })

  it('remover pede confirmação e faz DELETE', async () => {
    const f = setup(authed({ 'DELETE /api/admin/players/p1': { status: 204 } }))
    await pagou('Ana')
    fireEvent.click(screen.getByRole('button', { name: 'Remover Ana' }))
    await waitFor(() => expect(screen.queryByLabelText('Pagou: Ana')).toBeNull())
    expect(calls(f, 'DELETE /api/admin/players/p1')).toHaveLength(1)
  })

  it('remover cancelado não chama DELETE', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false))
    const f = setup(authed())
    await pagou('Ana')
    fireEvent.click(screen.getByRole('button', { name: 'Remover Ana' }))
    expect(calls(f, 'DELETE /api/admin/players/p1')).toHaveLength(0)
    expect(screen.getByLabelText('Pagou: Ana')).toBeTruthy()
  })
})

describe('pagamentos', () => {
  it('mostra "0 de 2 pagaram" e atualiza pelo jogo RETORNADO', async () => {
    const f = setup(
      authed({
        // servidor devolve um estado diferente do que o clique sugere: vale o retornado
        'PUT /api/admin/game/paid': { status: 200, body: { ...GAME, paid: ['p1', 'p2'] } },
      }),
    )
    const box = await pagou('Ana')
    expect(screen.getByText('0 de 2 pagaram')).toBeTruthy()
    fireEvent.click(box)
    expect(await screen.findByText('2 de 2 pagaram')).toBeTruthy()
    expect(body(calls(f, 'PUT /api/admin/game/paid')[0])).toBe('{"playerId":"p1","paid":true}')
    expect((await pagou('Bia')).checked).toBe(true)
  })

  it('desmarcar envia paid:false', async () => {
    const f = setup(
      authed({
        'GET /api/admin/game': { status: 200, body: { ...GAME, paid: ['p1'] } },
        'PUT /api/admin/game/paid': { status: 200, body: GAME },
      }),
    )
    const box = await pagou('Ana')
    expect(box.checked).toBe(true)
    expect(screen.getByText('1 de 2 pagaram')).toBeTruthy()
    fireEvent.click(box)
    expect(await screen.findByText('0 de 2 pagaram')).toBeTruthy()
    expect(body(calls(f, 'PUT /api/admin/game/paid')[0])).toBe('{"playerId":"p1","paid":false}')
  })

  it('sem jogo ativo as caixas ficam desabilitadas, com explicação', async () => {
    setup(authed({ 'GET /api/admin/game': { status: 200, body: null } }))
    const box = await pagou('Ana')
    expect(box.disabled).toBe(true)
    expect(box.title).toBe('Cadastre a data do jogo primeiro')
    expect(screen.getByText('0 de 2 pagaram')).toBeTruthy()
  })

  it('dois cliques rápidos na mesma caixa não enviam requisições sobrepostas', async () => {
    let release: (o: Out) => void = () => {}
    const f = setup(
      authed({
        'PUT /api/admin/game/paid': () => new Promise<Out>((r) => (release = r)),
      }),
    )
    const box = await pagou('Ana')
    fireEvent.click(box)
    fireEvent.click(box)
    expect(box.disabled).toBe(true)
    expect(calls(f, 'PUT /api/admin/game/paid')).toHaveLength(1)
    release({ status: 200, body: { ...GAME, paid: ['p1'] } })
    await waitFor(() => expect(box.checked).toBe(true))
    expect(box.disabled).toBe(false)
  })

  it.each([404, 500])('falha %i mantém a caixa como estava e mostra alerta', async (status) => {
    setup(authed({ 'PUT /api/admin/game/paid': { status, body: { error: 'x' } } }))
    const box = await pagou('Ana')
    fireEvent.click(box)
    expect((await screen.findByRole('alert')).textContent).toMatch(/pagamento/i)
    expect(box.checked).toBe(false)
    expect(box.disabled).toBe(false)
    expect(screen.getByText('0 de 2 pagaram')).toBeTruthy()
  })
})

describe('sessão', () => {
  it('401 em uma chamada volta ao login', async () => {
    setup(authed({ 'PUT /api/admin/game/paid': { status: 401 } }))
    fireEvent.click(await pagou('Ana'))
    expect(await screen.findByLabelText('Senha')).toBeTruthy()
  })

  it('401 ao carregar jogadores volta ao login', async () => {
    setup(authed({ 'GET /api/admin/players': { status: 401 } }))
    expect(await screen.findByLabelText('Senha')).toBeTruthy()
  })
})
