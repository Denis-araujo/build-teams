// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../../src/web/App'
import type { Game } from '../../src/shared/types'

type Handler = (init: RequestInit) => { status: number; body?: unknown }
type Routes = Record<string, Handler | { status: number; body?: unknown }>

function respond(status: number, body?: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response
}

const GAME: Game = { id: 'g1', date: '2026-10-24', paid: [], draw: null }

function setup(routes: Routes) {
  const fetchMock = vi.fn(async (path: string, init: RequestInit = {}) => {
    const key = `${init.method ?? 'GET'} ${path}`
    const r = routes[key]
    if (!r) return respond(404, { error: `sem rota ${key}` })
    const out = typeof r === 'function' ? r(init) : r
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
  'GET /api/admin/game': { status: 200, body: null },
  'GET /api/admin/settings': { status: 200, body: { memberSeesStars: false } },
  'GET /api/admin/players': { status: 200, body: [] },
  ...over,
})

const calls = (f: ReturnType<typeof vi.fn>, key: string) =>
  f.mock.calls.filter(([p, i]) => `${(i as RequestInit | undefined)?.method ?? 'GET'} ${p}` === key)

function dateInput() {
  return screen.getByLabelText('Data do jogo') as HTMLInputElement
}

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('login', () => {
  const loggedOut = (login: { status: number; body?: unknown }): Routes => ({
    'GET /api/admin/me': { status: 401 },
    'POST /api/admin/login': login,
  })

  async function submit(password = 'errada') {
    const input = (await screen.findByLabelText('Senha')) as HTMLInputElement
    expect(input.type).toBe('password')
    fireEvent.change(input, { target: { value: password } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    return input
  }

  it('sem sessão mostra o formulário de senha', async () => {
    setup({ 'GET /api/admin/me': { status: 401 } })
    expect(await screen.findByLabelText('Senha')).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Entrar' })).toBeTruthy()
  })

  it('senha errada mostra "Senha incorreta" e limpa o campo', async () => {
    setup(loggedOut({ status: 401, body: { error: 'Senha incorreta' } }))
    const input = await submit()
    expect((await screen.findByRole('alert')).textContent).toBe('Senha incorreta')
    expect(input.value).toBe('')
  })

  it('429 mostra a mensagem de excesso de tentativas', async () => {
    setup(loggedOut({ status: 429, body: { error: 'x' } }))
    await submit()
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Muitas tentativas. Tente de novo em alguns minutos.',
    )
  })

  it('503 mostra "Servidor sem senha configurada"', async () => {
    setup(loggedOut({ status: 503, body: { error: 'x' } }))
    await submit()
    expect((await screen.findByRole('alert')).textContent).toBe('Servidor sem senha configurada')
  })

  it('outro erro mostra mensagem genérica', async () => {
    setup(loggedOut({ status: 500 }))
    await submit()
    expect((await screen.findByRole('alert')).textContent).toBe('Não foi possível entrar. Tente de novo.')
  })

  it('login certo mostra o painel e carrega jogo e configurações', async () => {
    let logged = false
    const f = setup({
      'GET /api/admin/me': () => (logged ? { status: 200 } : { status: 401 }),
      'POST /api/admin/login': (init) => {
        expect(init.body).toBe('{"password":"certa"}')
        logged = true
        return { status: 200, body: { ok: true } }
      },
      'GET /api/admin/game': { status: 200, body: null },
      'GET /api/admin/settings': { status: 200, body: { memberSeesStars: false } },
      'GET /api/admin/players': { status: 200, body: [] },
    })
    await submit('certa')
    expect(await screen.findByText('Nenhum jogo marcado')).toBeTruthy()
    expect(screen.getByRole('region', { name: 'Jogadores e sorteio' })).toBeTruthy()
    expect(calls(f, 'GET /api/admin/game').length).toBeGreaterThan(0)
    expect(calls(f, 'GET /api/admin/settings').length).toBeGreaterThan(0)
  })
})

describe('GameBar', () => {
  it('cadastrar data faz POST e mostra a data', async () => {
    const f = setup(authed({ 'POST /api/admin/game': { status: 201, body: GAME } }))
    await screen.findByText('Nenhum jogo marcado')
    fireEvent.change(dateInput(), { target: { value: '2026-10-24' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar jogo' }))
    expect(await screen.findByText('Sábado, 24/10')).toBeTruthy()
    const [, init] = calls(f, 'POST /api/admin/game')[0]
    expect((init as RequestInit).body).toBe('{"date":"2026-10-24"}')
    expect(screen.getByRole('button', { name: 'Alterar data' })).toBeTruthy()
  })

  it('erro 400 do servidor aparece com role=alert', async () => {
    setup(authed({ 'POST /api/admin/game': { status: 400, body: { error: 'Já existe um jogo ativo' } } }))
    await screen.findByText('Nenhum jogo marcado')
    fireEvent.change(dateInput(), { target: { value: '2026-12-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cadastrar jogo' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Já existe um jogo ativo')
  })

  it('alterar data faz PATCH', async () => {
    const f = setup(
      authed({
        'GET /api/admin/game': { status: 200, body: GAME },
        'PATCH /api/admin/game': { status: 200, body: { ...GAME, date: '2026-10-31' } },
      }),
    )
    await screen.findByText('Sábado, 24/10')
    fireEvent.change(dateInput(), { target: { value: '2026-10-31' } })
    fireEvent.click(screen.getByRole('button', { name: 'Alterar data' }))
    expect(await screen.findByText('Sábado, 31/10')).toBeTruthy()
    expect((calls(f, 'PATCH /api/admin/game')[0][1] as RequestInit).body).toBe('{"date":"2026-10-31"}')
  })

  it('excluir pede confirmação e faz DELETE', async () => {
    vi.stubGlobal('confirm', vi.fn(() => true))
    const f = setup(
      authed({
        'GET /api/admin/game': { status: 200, body: GAME },
        'DELETE /api/admin/game': { status: 204 },
      }),
    )
    await screen.findByText('Sábado, 24/10')
    fireEvent.click(screen.getByRole('button', { name: 'Excluir jogo' }))
    expect(await screen.findByText('Nenhum jogo marcado')).toBeTruthy()
    expect(calls(f, 'DELETE /api/admin/game').length).toBe(1)
  })

  it('excluir cancelado não chama DELETE', async () => {
    vi.stubGlobal('confirm', vi.fn(() => false))
    const f = setup(authed({ 'GET /api/admin/game': { status: 200, body: GAME } }))
    await screen.findByText('Sábado, 24/10')
    fireEvent.click(screen.getByRole('button', { name: 'Excluir jogo' }))
    expect(calls(f, 'DELETE /api/admin/game').length).toBe(0)
    expect(screen.getByText('Sábado, 24/10')).toBeTruthy()
  })
})

describe('SettingsToggle', () => {
  it('alterna e faz PATCH com o novo valor', async () => {
    const f = setup(authed({ 'PATCH /api/admin/settings': { status: 200, body: { memberSeesStars: true } } }))
    const box = (await screen.findByLabelText('Membro vê as estrelas')) as HTMLInputElement
    await waitFor(() => expect(box.disabled).toBe(false))
    expect(box.checked).toBe(false)
    fireEvent.click(box)
    await waitFor(() => expect(box.checked).toBe(true))
    expect((calls(f, 'PATCH /api/admin/settings')[0][1] as RequestInit).body).toBe('{"memberSeesStars":true}')
  })

  it('reverte e mostra erro quando o PATCH falha', async () => {
    setup(authed({ 'PATCH /api/admin/settings': { status: 500, body: { error: 'Falhou' } } }))
    const box = (await screen.findByLabelText('Membro vê as estrelas')) as HTMLInputElement
    fireEvent.click(box)
    expect((await screen.findByRole('alert')).textContent).toMatch(/Não foi possível/)
    expect(box.checked).toBe(false)
  })
})

describe('sessão', () => {
  it('"Sair" chama logout e volta ao login', async () => {
    const f = setup(authed({ 'POST /api/admin/logout': { status: 200, body: { ok: true } } }))
    await screen.findByText('Nenhum jogo marcado')
    fireEvent.click(screen.getByRole('button', { name: 'Sair' }))
    expect(await screen.findByLabelText('Senha')).toBeTruthy()
    expect(calls(f, 'POST /api/admin/logout').length).toBe(1)
  })

  it('401 ao carregar o jogo volta ao login', async () => {
    setup(authed({ 'GET /api/admin/game': { status: 401 } }))
    expect(await screen.findByLabelText('Senha')).toBeTruthy()
  })
})
