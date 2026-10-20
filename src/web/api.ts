import type { DrawState, Game, Player, PublicGame } from '../shared/types'

export type Settings = { memberSeesStars: boolean }

export class UnauthorizedError extends Error {
  constructor(message = 'Não autorizado') {
    super(message)
    this.name = 'UnauthorizedError'
  }
}

export class HttpError extends Error {
  status: number
  serverMessage?: string
  constructor(message: string, status: number, serverMessage?: string) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.serverMessage = serverMessage
  }
}

/** Pequeno helper compartilhado: JSON de entrada e saída, cookies na mesma origem. */
export async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers)
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  const res = await fetch(path, { ...init, headers, credentials: 'same-origin' })
  if (res.status === 401) throw new UnauthorizedError()
  if (!res.ok) {
    let serverMessage: string | undefined
    try {
      const body = (await res.json()) as { error?: unknown } | null
      if (body && typeof body.error === 'string') serverMessage = body.error
    } catch {
      // corpo ausente ou não-JSON
    }
    throw new HttpError(
      `Falha na requisição ${init.method ?? 'GET'} ${path} (${res.status})`,
      res.status,
      serverMessage,
    )
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  getGame: () => request<PublicGame | null>('/api/game'),

  login: (password: string) =>
    request<{ ok: true }>('/api/admin/login', { method: 'POST', body: JSON.stringify({ password }) }),
  logout: () => request<{ ok: true }>('/api/admin/logout', { method: 'POST' }),
  me: async (): Promise<boolean> => {
    try {
      await request<unknown>('/api/admin/me')
      return true
    } catch (e) {
      if (e instanceof UnauthorizedError) return false
      throw e
    }
  },
  getBootstrap: () =>
    request<{ game: Game | null; settings: Settings; players: Player[] }>('/api/admin/bootstrap'),
  createGame: (date: string, time: string) =>
    request<Game>('/api/admin/game', { method: 'POST', body: JSON.stringify({ date, time }) }),
  updateGameDate: (date: string, time: string) =>
    request<Game>('/api/admin/game', { method: 'PATCH', body: JSON.stringify({ date, time }) }),
  deleteGame: () => request<void>('/api/admin/game', { method: 'DELETE' }),
  getSettings: () => request<Settings>('/api/admin/settings'),
  setMemberSeesStars: (memberSeesStars: boolean) =>
    request<Settings>('/api/admin/settings', {
      method: 'PATCH',
      body: JSON.stringify({ memberSeesStars }),
    }),

  getPlayers: () => request<Player[]>('/api/admin/players'),
  createPlayer: (p: { name: string; rating: number }) =>
    request<Player>('/api/admin/players', { method: 'POST', body: JSON.stringify(p) }),
  updatePlayer: (id: string, patch: { name?: string; rating?: number }) =>
    request<Player>(`/api/admin/players/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    }),
  archivePlayer: (id: string) =>
    request<void>(`/api/admin/players/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  /** Salva de uma vez as confirmações e o sorteio editados na tela. */
  saveGameState: (paid: string[], draw: DrawState | null) =>
    request<Game>('/api/admin/game/state', { method: 'PUT', body: JSON.stringify({ paid, draw }) }),
}
