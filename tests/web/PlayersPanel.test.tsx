// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { bootstrapFromLegacy } from '../helpers/bootstrapShim'
import App from '../../src/web/App'
import type { Game, Player } from '../../src/shared/types'

type Out = { status: number; body?: unknown }
type Routes = Record<string, ((init: RequestInit) => Out | Promise<Out>) | Out>

function respond(status: number, body?: unknown) {
  return { ok: status >= 200 && status < 300, status, json: async () => body } as Response
}

const ANA: Player = { id: 'p1', name: 'Ana', rating: 4, archived: false }
const BIA: Player = { id: 'p2', name: 'Bia', rating: 2.5, archived: false }
const GAME: Game = { id: 'g1', date: '2026-10-24', time: '19:00', paid: [], draw: null }

function setup(routes: Routes) {
  const fetchMock = vi.fn(async (path: string, init: RequestInit = {}) => {
    const key = `${init.method ?? 'GET'} ${path}`
    if (key === 'GET /api/admin/bootstrap') {
      const out = await bootstrapFromLegacy(routes, init)
      return respond(out.status, out.body)
    }
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

// O número do contador vai em <strong> (markup do v4): casa pelo texto do span inteiro.
const counterEl = (text: string) => (_: string, el: Element | null) => el?.tagName === 'SPAN' && el.textContent === text
const counter = (text: string) => screen.getByText(counterEl(text))
const counterAsync = (text: string) => screen.findByText(counterEl(text))
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

  it('metade esquerda da 1ª estrela do jogador faz PATCH {rating: 0.5}', async () => {
    const f = setup(authed({ 'PATCH /api/admin/players/p1': { status: 200, body: { ...ANA, rating: 0.5 } } }))
    await pagou('Ana')
    const row = screen.getByTestId('player-p1')
    fireEvent.click(within(row).getByRole('button', { name: '0,5 estrelas' }))
    await waitFor(() => expect(within(row).getByRole('group', { name: '0,5 estrelas' })).toBeTruthy())
    expect(JSON.parse(body(calls(f, 'PATCH /api/admin/players/p1')[0]) as string)).toEqual({ rating: 0.5 })
  })

  it('dica do formulário segue o texto do v4', async () => {
    setup(authed())
    await pagou('Ana')
    expect(screen.getByText('Clique na metade esquerda de uma estrela para dar meia.')).toBeTruthy()
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
    expect((await screen.findByRole('alert')).textContent).toBe('Ana: Nome já existe')
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
  const anyPut = (f: ReturnType<typeof vi.fn>) =>
    f.mock.calls.filter(([, i]) => (i as RequestInit | undefined)?.method === 'PUT')

  it('marcar atualiza o contador na hora e não faz requisição', async () => {
    const f = setup(authed())
    const box = await pagou('Ana')
    expect(counter('0 de 2 jogadores')).toBeTruthy()
    fireEvent.click(box)
    expect(counter('1 de 2 jogadores')).toBeTruthy()
    expect((await pagou('Ana')).checked).toBe(true)
    fireEvent.click(await pagou('Bia'))
    expect(counter('2 de 2 jogadores')).toBeTruthy()
    expect(anyPut(f)).toHaveLength(0)
  })

  it('desmarcar atualiza o contador na hora e não faz requisição', async () => {
    const f = setup(authed({ 'GET /api/admin/game': { status: 200, body: { ...GAME, paid: ['p1'] } } }))
    const box = await pagou('Ana')
    expect(box.checked).toBe(true)
    expect(counter('1 de 2 jogadores')).toBeTruthy()
    fireEvent.click(box)
    expect(counter('0 de 2 jogadores')).toBeTruthy()
    expect(anyPut(f)).toHaveLength(0)
  })

  it('desmarcar quem está no sorteio tira a pessoa do time, só na tela', async () => {
    const draw = { teamCount: 2, teamSize: 1, teams: [['p1'], ['p2']], reserves: [], locks: { p1: 0 } }
    const f = setup(authed({ 'GET /api/admin/game': { status: 200, body: { ...GAME, paid: ['p1', 'p2'], draw } } }))
    fireEvent.click(await pagou('Ana'))
    expect(screen.queryByRole('button', { name: 'Travar Ana neste time' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Destravar Ana' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Travar Bia neste time' })).toBeTruthy()
    expect(anyPut(f)).toHaveLength(0)
  })

  it('sem jogo ativo as caixas ficam desabilitadas, com explicação', async () => {
    setup(authed({ 'GET /api/admin/game': { status: 200, body: null } }))
    const box = await pagou('Ana')
    expect(box.disabled).toBe(true)
    expect(box.title).toBe('Cadastre a data do jogo primeiro')
    expect(counter('0 de 2 jogadores')).toBeTruthy()
  })
})

describe('sessão', () => {
  it('401 ao carregar jogadores volta ao login', async () => {
    setup(authed({ 'GET /api/admin/players': { status: 401 } }))
    expect(await screen.findByLabelText('Senha')).toBeTruthy()
  })
})

function deferred() {
  let resolve: (o: Out) => void = () => {}
  const promise = new Promise<Out>((r) => (resolve = r))
  return { promise, resolve }
}

describe('PATCHes por jogador', () => {
  it('renomear + nota com a 1ª resposta atrasada: fila e merge só do campo alterado', async () => {
    const first = deferred()
    let n = 0
    const f = setup(
      authed({
        'PATCH /api/admin/players/p1': (init) => {
          n++
          if (n === 1) return first.promise
          // resposta "velha" quanto ao nome: não pode desfazer a renomeação
          expect(JSON.parse(init.body as string)).toEqual({ rating: 5 })
          return { status: 200, body: { ...ANA, name: 'Ana', rating: 5 } }
        },
      }),
    )
    await pagou('Ana')
    const input = screen.getByLabelText('Nome de Ana')
    fireEvent.change(input, { target: { value: 'Ana Maria' } })
    fireEvent.blur(input)
    const row = screen.getByTestId('player-p1')
    fireEvent.click(within(row).getByRole('button', { name: '5 estrelas' }))
    await waitFor(() => expect(calls(f, 'PATCH /api/admin/players/p1')).toHaveLength(1))
    first.resolve({ status: 200, body: { ...ANA, name: 'Ana Maria' } })
    await waitFor(() => expect(within(screen.getByTestId('player-p1')).getByRole('group', { name: '5 estrelas' })).toBeTruthy())
    expect((screen.getByLabelText('Nome de Ana Maria') as HTMLInputElement).value).toBe('Ana Maria')
    expect(calls(f, 'PATCH /api/admin/players/p1')).toHaveLength(2)
  })

  it('renomear que falha + nota que dá certo: reverte só o nome', async () => {
    const first = deferred()
    let n = 0
    setup(
      authed({
        'PATCH /api/admin/players/p1': () => {
          n++
          return n === 1 ? first.promise : { status: 200, body: { ...ANA, rating: 5 } }
        },
      }),
    )
    await pagou('Ana')
    const input = screen.getByLabelText('Nome de Ana') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'Bia' } })
    fireEvent.blur(input)
    fireEvent.click(within(screen.getByTestId('player-p1')).getByRole('button', { name: '5 estrelas' }))
    first.resolve({ status: 400, body: { error: 'Nome já existe' } })
    await waitFor(() => expect(within(screen.getByTestId('player-p1')).getByRole('group', { name: '5 estrelas' })).toBeTruthy())
    expect(input.value).toBe('Ana')
    expect(screen.getByRole('alert').textContent).toBe('Ana: Nome já existe')
  })

  it('PATCHes de jogadores diferentes não se bloqueiam', async () => {
    const slow = deferred()
    const f = setup(
      authed({
        'PATCH /api/admin/players/p1': () => slow.promise,
        'PATCH /api/admin/players/p2': { status: 200, body: { ...BIA, rating: 5 } },
      }),
    )
    await pagou('Ana')
    fireEvent.click(within(screen.getByTestId('player-p1')).getByRole('button', { name: '5 estrelas' }))
    fireEvent.click(within(screen.getByTestId('player-p2')).getByRole('button', { name: '5 estrelas' }))
    await waitFor(() => expect(within(screen.getByTestId('player-p2')).getByRole('group', { name: '5 estrelas' })).toBeTruthy())
    expect(calls(f, 'PATCH /api/admin/players/p1')).toHaveLength(1)
    slow.resolve({ status: 200, body: { ...ANA, rating: 5 } })
  })
})

describe('casos extras', () => {
  it('remover com clique duplo: uma confirmação e um DELETE', async () => {
    const d = deferred()
    const confirm = vi.fn(() => true)
    vi.stubGlobal('confirm', confirm)
    const f = setup(authed({ 'DELETE /api/admin/players/p1': () => d.promise }))
    await pagou('Ana')
    const btn = screen.getByRole('button', { name: 'Remover Ana' })
    fireEvent.click(btn)
    fireEvent.click(btn)
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(calls(f, 'DELETE /api/admin/players/p1')).toHaveLength(1)
    d.resolve({ status: 204 })
    await waitFor(() => expect(screen.queryByLabelText('Pagou: Ana')).toBeNull())
  })

  it('submeter o formulário (Enter) adiciona', async () => {
    const f = setup(authed({ 'POST /api/admin/players': { status: 201, body: { ...ANA, id: 'p5', name: 'Eva' } } }))
    await pagou('Ana')
    fireEvent.change(screen.getByLabelText('Nome do jogador'), { target: { value: 'Eva' } })
    fireEvent.submit(screen.getByRole('form', { name: 'Novo jogador' }))
    await pagou('Eva')
    expect(calls(f, 'POST /api/admin/players')).toHaveLength(1)
  })

  it('nome de 61 caracteres: mensagem 400 do servidor no alerta', async () => {
    setup(authed({ 'POST /api/admin/players': { status: 400, body: { error: 'Nome deve ter até 60 caracteres' } } }))
    await pagou('Ana')
    fireEvent.change(screen.getByLabelText('Nome do jogador'), { target: { value: 'x'.repeat(61) } })
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar' }))
    expect((await screen.findByRole('alert')).textContent).toBe('Nome deve ter até 60 caracteres')
  })

  it('nomes duplicados são permitidos, cada linha com sua caixa e estrelas', async () => {
    setup(authed({ 'GET /api/admin/players': { status: 200, body: [ANA, { ...BIA, name: 'Ana' }] } }))
    await pagou('Ana').catch(() => {})
    const boxes = await screen.findAllByLabelText('Pagou: Ana')
    expect(boxes).toHaveLength(2)
    expect(within(screen.getByTestId('player-p1')).getByRole('group', { name: '4 estrelas' })).toBeTruthy()
    expect(within(screen.getByTestId('player-p2')).getByRole('group', { name: '2,5 estrelas' })).toBeTruthy()
  })

  it('id arquivado restante em game.paid não infla o contador', async () => {
    setup(authed({ 'GET /api/admin/game': { status: 200, body: { ...GAME, paid: ['p1', 'arquivado'] } } }))
    await pagou('Ana')
    expect(counter('1 de 2 jogadores')).toBeTruthy()
  })

  it('erro de linha inclui o nome do jogador', async () => {
    setup(authed({ 'PATCH /api/admin/players/p2': { status: 500 } }))
    await pagou('Ana')
    fireEvent.click(within(screen.getByTestId('player-p2')).getByRole('button', { name: '5 estrelas' }))
    expect((await screen.findByRole('alert')).textContent).toMatch(/^Bia: /)
  })
})

describe('Marcar todos / Limpar', () => {
  const DRAW = { teamCount: 2, teamSize: 1, teams: [['p1'], ['p2']], reserves: [], locks: {} }
  const all = () => screen.getByRole('button', { name: 'Marcar todos' }) as HTMLButtonElement
  const none = () => screen.getByRole('button', { name: 'Limpar' }) as HTMLButtonElement
  const anyPut = (f: ReturnType<typeof vi.fn>) =>
    f.mock.calls.filter(([, i]) => (i as RequestInit | undefined)?.method === 'PUT')

  it('Marcar todos marca na tela, sem requisição', async () => {
    const f = setup(authed())
    await pagou('Ana')
    expect(screen.getByText('Quem vai jogar')).toBeTruthy()
    fireEvent.click(all())
    expect(counter('2 de 2 jogadores')).toBeTruthy()
    expect((await pagou('Bia')).checked).toBe(true)
    expect(anyPut(f)).toHaveLength(0)
  })

  it('Limpar sem sorteio desmarca todos na hora, sem confirmação e sem requisição', async () => {
    const f = setup(authed({ 'GET /api/admin/game': { status: 200, body: { ...GAME, paid: ['p1', 'p2'] } } }))
    await pagou('Ana')
    fireEvent.click(none())
    expect(counter('0 de 2 jogadores')).toBeTruthy()
    expect(screen.queryByText('O sorteio será apagado.')).toBeNull()
    expect(anyPut(f)).toHaveLength(0)
  })

  it('Limpar com sorteio pede confirmação e só limpa depois de confirmar', async () => {
    const f = setup(authed({ 'GET /api/admin/game': { status: 200, body: { ...GAME, paid: ['p1', 'p2'], draw: DRAW } } }))
    await pagou('Ana')
    fireEvent.click(none())
    expect(screen.getByText('O sorteio será apagado.')).toBeTruthy()
    expect(counter('2 de 2 jogadores')).toBeTruthy()
    const card = screen.getByRole('group', { name: 'Confirmar limpeza' })
    fireEvent.click(within(card).getByRole('button', { name: 'Limpar tudo' }))
    expect(counter('0 de 2 jogadores')).toBeTruthy()
    expect(screen.queryByText('O sorteio será apagado.')).toBeNull()
    expect(document.activeElement).toBe(all())
    expect(anyPut(f)).toHaveLength(0)
  })

  it('cancelar a confirmação não muda nada e devolve o foco ao Limpar', async () => {
    setup(authed({ 'GET /api/admin/game': { status: 200, body: { ...GAME, paid: ['p1'], draw: DRAW } } }))
    await pagou('Ana')
    const trigger = none()
    fireEvent.click(trigger)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByText('O sorteio será apagado.')).toBeNull()
    expect(counter('1 de 2 jogadores')).toBeTruthy()
    expect(document.activeElement).toBe(trigger)
  })

  it('Esc fecha a confirmação sem limpar e devolve o foco ao Limpar', async () => {
    setup(authed({ 'GET /api/admin/game': { status: 200, body: { ...GAME, paid: ['p1'], draw: DRAW } } }))
    await pagou('Ana')
    const trigger = none()
    fireEvent.click(trigger)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancelar' }))
    fireEvent.keyDown(screen.getByRole('button', { name: 'Cancelar' }), { key: 'Escape' })
    expect(screen.queryByText('O sorteio será apagado.')).toBeNull()
    expect(counter('1 de 2 jogadores')).toBeTruthy()
    expect(document.activeElement).toBe(trigger)
  })

  it('só reservas no sorteio também pede confirmação', async () => {
    setup(
      authed({ 'GET /api/admin/game': { status: 200, body: { ...GAME, draw: { ...DRAW, teams: [[], []], reserves: ['p1'] } } } }),
    )
    await pagou('Ana')
    fireEvent.click(none())
    expect(screen.getByText('O sorteio será apagado.')).toBeTruthy()
  })

  it('sorteio sem ninguém alocado não pede confirmação', async () => {
    const empty = { ...DRAW, teams: [[], []], reserves: [] }
    setup(authed({ 'GET /api/admin/game': { status: 200, body: { ...GAME, paid: ['p1'], draw: empty } } }))
    await pagou('Ana')
    fireEvent.click(none())
    expect(screen.queryByText('O sorteio será apagado.')).toBeNull()
    expect(counter('0 de 2 jogadores')).toBeTruthy()
  })

  it('sem jogo ativo os dois botões ficam desabilitados, com explicação', async () => {
    setup(authed({ 'GET /api/admin/game': { status: 200, body: null } }))
    await pagou('Ana')
    expect(all().disabled).toBe(true)
    expect(none().disabled).toBe(true)
    expect(all().title).toBe('Cadastre a data do jogo primeiro')
    expect(none().title).toBe('Cadastre a data do jogo primeiro')
  })
})
