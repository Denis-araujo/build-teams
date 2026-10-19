// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import App from '../../src/web/App'
import type { Game } from '../../src/shared/types'

type Handler = (init: RequestInit) => { status: number; body?: unknown }
type Routes = Record<string, Handler | { status: number; body?: unknown }>

function respond(status: number, body?: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response
}

const GAME: Game = { id: 'g1', date: '2026-10-24', time: '19:00', paid: [], draw: null }

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

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
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

  it('a tela de login tem um único h1 "Administrador"', async () => {
    setup({ 'GET /api/admin/me': { status: 401 } })
    await screen.findByLabelText('Senha')
    const h1 = screen.getAllByRole('heading', { level: 1 })
    expect(h1.map((h) => h.textContent)).toEqual(['Administrador'])
  })

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

describe('estrutura', () => {
  it('logado, o único h1 é "Times" e "Jogadores" é h2', async () => {
    setup(authed())
    await screen.findByText('Nenhum jogo marcado')
    expect(screen.getAllByRole('heading', { level: 1 }).map((h) => h.textContent)).toEqual(['Times'])
    expect(screen.getByRole('heading', { level: 2, name: 'Jogadores' })).toBeTruthy()
  })
})

describe('GameBar', () => {
  // Congela só o Date (sem tocar nos timers): 19/10/2026 12:00 em Brasília.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'], now: new Date('2026-10-19T15:00:00Z') })
  })

  const dayInput = () => screen.getByLabelText('Dia') as HTMLInputElement
  const timeInput = () => screen.getByLabelText('Hora') as HTMLInputElement

  it('marcar jogo faz POST com data e hora e mostra o cartão', async () => {
    const f = setup(authed({ 'POST /api/admin/game': { status: 201, body: GAME } }))
    await screen.findByText('Nenhum jogo marcado')
    fireEvent.click(screen.getByRole('button', { name: 'Marcar jogo' }))
    expect(screen.getByText('Marcar jogo', { selector: 'span' })).toBeTruthy()
    expect(timeInput().value).toBe('19:00')
    expect(dayInput().min).toBe('2026-10-19')
    fireEvent.change(dayInput(), { target: { value: '2026-10-24' } })
    fireEvent.change(timeInput(), { target: { value: '20:30' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('Em 5 dias')).toBeTruthy()
    const [, init] = calls(f, 'POST /api/admin/game')[0]
    expect((init as RequestInit).body).toBe('{"date":"2026-10-24","time":"20:30"}')
    expect(screen.getByRole('button', { name: 'Alterar' })).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Excluir' })).toBeTruthy()
  })

  it('cartão mostra "Próximo jogo", dia, hora e o subtítulo do cabeçalho', async () => {
    setup(authed({ 'GET /api/admin/game': { status: 200, body: GAME } }))
    expect(await screen.findByText('Próximo jogo')).toBeTruthy()
    expect(screen.getAllByText('Sábado, 24 de outubro · 19:00').length).toBe(1)
    expect(screen.getByRole('region', { name: 'Jogo' }).textContent).toContain('Sábado, 24 de outubro às 19:00')
  })

  it('sem jogo o cabeçalho diz "Sem jogo marcado"', async () => {
    setup(authed())
    await screen.findByText('Nenhum jogo marcado')
    expect(screen.getByText('Sem jogo marcado')).toBeTruthy()
  })

  it('campos vazios mostram "Preencha o dia e a hora." sem chamar a API', async () => {
    const f = setup(authed())
    await screen.findByText('Nenhum jogo marcado')
    fireEvent.click(screen.getByRole('button', { name: 'Marcar jogo' }))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Preencha o dia e a hora.')
    expect(calls(f, 'POST /api/admin/game').length).toBe(0)
  })

  it('momento no passado (hoje, hora que já passou) é recusado no cliente', async () => {
    const f = setup(authed())
    await screen.findByText('Nenhum jogo marcado')
    fireEvent.click(screen.getByRole('button', { name: 'Marcar jogo' }))
    fireEvent.change(dayInput(), { target: { value: '2026-10-19' } })
    fireEvent.change(timeInput(), { target: { value: '08:00' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect((await screen.findByRole('alert')).textContent).toBe(
      'Escolha um dia e uma hora que ainda não passaram.',
    )
    expect(calls(f, 'POST /api/admin/game').length).toBe(0)
  })

  it('erro 400 do servidor aparece com role=alert', async () => {
    setup(authed({ 'POST /api/admin/game': { status: 400, body: { error: 'Já existe um jogo ativo' } } }))
    await screen.findByText('Nenhum jogo marcado')
    fireEvent.click(screen.getByRole('button', { name: 'Marcar jogo' }))
    fireEvent.change(dayInput(), { target: { value: '2026-12-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Já existe um jogo ativo')
  })

  it('alterar faz PATCH com data e hora', async () => {
    const f = setup(
      authed({
        'GET /api/admin/game': { status: 200, body: GAME },
        'PATCH /api/admin/game': { status: 200, body: { ...GAME, date: '2026-10-31', time: '08:05' } },
      }),
    )
    await screen.findByText('Próximo jogo')
    fireEvent.click(screen.getByRole('button', { name: 'Alterar' }))
    expect(screen.getByText('Alterar data do jogo')).toBeTruthy()
    expect(dayInput().value).toBe('2026-10-24')
    expect(timeInput().value).toBe('19:00')
    fireEvent.change(dayInput(), { target: { value: '2026-10-31' } })
    fireEvent.change(timeInput(), { target: { value: '08:05' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByText('Sábado, 31 de outubro · 08:05')).toBeTruthy()
    expect((calls(f, 'PATCH /api/admin/game')[0][1] as RequestInit).body).toBe(
      '{"date":"2026-10-31","time":"08:05"}',
    )
  })

  it('excluir mostra o cartão de confirmação e faz DELETE', async () => {
    const f = setup(
      authed({
        'GET /api/admin/game': { status: 200, body: GAME },
        'DELETE /api/admin/game': { status: 204 },
      }),
    )
    await screen.findByText('Próximo jogo')
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    expect(screen.getByText('Excluir o jogo de sábado, 24/10 às 19:00?')).toBeTruthy()
    expect(screen.getByText('Pagamentos e sorteio serão perdidos.')).toBeTruthy()
    expect(calls(f, 'DELETE /api/admin/game').length).toBe(0)
    fireEvent.click(screen.getByRole('button', { name: 'Excluir data' }))
    expect(await screen.findByText('Nenhum jogo marcado')).toBeTruthy()
    expect(calls(f, 'DELETE /api/admin/game').length).toBe(1)
  })

  it('cancelar a confirmação não chama DELETE', async () => {
    const f = setup(authed({ 'GET /api/admin/game': { status: 200, body: GAME } }))
    await screen.findByText('Próximo jogo')
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(calls(f, 'DELETE /api/admin/game').length).toBe(0)
    expect(screen.getByText('Próximo jogo')).toBeTruthy()
  })

  it('o campo Dia tem min = hoje em Brasília (não em UTC)', async () => {
    vi.setSystemTime(new Date('2026-10-19T02:00:00Z')) // ainda 18/10 em Brasília
    setup(authed())
    await screen.findByText('Nenhum jogo marcado')
    fireEvent.click(screen.getByRole('button', { name: 'Marcar jogo' }))
    expect(dayInput().min).toBe('2026-10-18')
  })

  it('Cancelar devolve o foco a "Alterar"; Esc também', async () => {
    setup(authed({ 'GET /api/admin/game': { status: 200, body: GAME } }))
    await screen.findByText('Próximo jogo')
    fireEvent.click(screen.getByRole('button', { name: 'Alterar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Alterar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Alterar' }))
    fireEvent.keyDown(dayInput(), { key: 'Escape' })
    expect(screen.queryByLabelText('Dia')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Alterar' }))
  })

  it('Cancelar e Esc na confirmação devolvem o foco a "Excluir"', async () => {
    setup(authed({ 'GET /api/admin/game': { status: 200, body: GAME } }))
    await screen.findByText('Próximo jogo')
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Excluir' }))
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    fireEvent.keyDown(screen.getByRole('button', { name: 'Cancelar' }), { key: 'Escape' })
    expect(screen.queryByText('Pagamentos e sorteio serão perdidos.')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Excluir' }))
  })

  it('depois de salvar o foco vai a "Alterar"; depois de excluir, a "Marcar jogo"', async () => {
    setup(
      authed({
        'GET /api/admin/game': { status: 200, body: GAME },
        'PATCH /api/admin/game': { status: 200, body: { ...GAME, date: '2026-10-31' } },
        'DELETE /api/admin/game': { status: 204 },
      }),
    )
    await screen.findByText('Próximo jogo')
    fireEvent.click(screen.getByRole('button', { name: 'Alterar' }))
    fireEvent.change(dayInput(), { target: { value: '2026-10-31' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    await screen.findByText('Sábado, 31 de outubro · 19:00')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Alterar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    fireEvent.click(screen.getByRole('button', { name: 'Excluir data' }))
    await screen.findByText('Nenhum jogo marcado')
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Marcar jogo' }))
  })

  it('401 ao salvar volta ao login', async () => {
    setup(authed({ 'POST /api/admin/game': { status: 401 } }))
    await screen.findByText('Nenhum jogo marcado')
    fireEvent.click(screen.getByRole('button', { name: 'Marcar jogo' }))
    fireEvent.change(dayInput(), { target: { value: '2026-12-01' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    expect(await screen.findByLabelText('Senha')).toBeTruthy()
  })

  it('401 ao excluir volta ao login', async () => {
    setup(authed({ 'GET /api/admin/game': { status: 200, body: GAME }, 'DELETE /api/admin/game': { status: 401 } }))
    await screen.findByText('Próximo jogo')
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    fireEvent.click(screen.getByRole('button', { name: 'Excluir data' }))
    expect(await screen.findByLabelText('Senha')).toBeTruthy()
  })

  it('erro do servidor ao excluir aparece dentro do cartão de confirmação', async () => {
    setup(
      authed({
        'GET /api/admin/game': { status: 200, body: GAME },
        'DELETE /api/admin/game': { status: 500, body: { error: 'Falhou ao excluir' } },
      }),
    )
    await screen.findByText('Próximo jogo')
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))
    fireEvent.click(screen.getByRole('button', { name: 'Excluir data' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Falhou ao excluir')
    expect(screen.getByText('Pagamentos e sorteio serão perdidos.')).toBeTruthy()
  })

  it('envio duplo enquanto salva faz uma única requisição', async () => {
    let resolve!: () => void
    const gate = new Promise<void>((r) => (resolve = r))
    const f = setup(authed())
    await screen.findByText('Nenhum jogo marcado')
    // substitui o POST por uma resposta que só sai quando liberada
    const original = f.getMockImplementation() as (path: string, init?: RequestInit) => Promise<Response>
    f.mockImplementation(async (path: string, init: RequestInit = {}) => {
      if (init.method === 'POST' && path === '/api/admin/game') {
        await gate
        return respond(201, GAME)
      }
      return original(path, init)
    })
    fireEvent.click(screen.getByRole('button', { name: 'Marcar jogo' }))
    fireEvent.change(dayInput(), { target: { value: '2026-10-24' } })
    const form = dayInput().closest('form')!
    fireEvent.submit(form)
    fireEvent.submit(form)
    resolve()
    await screen.findByText('Próximo jogo')
    expect(calls(f, 'POST /api/admin/game').length).toBe(1)
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
