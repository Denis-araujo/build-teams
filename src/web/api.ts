import type { PublicGame } from '../shared/types'

export class UnauthorizedError extends Error {
  constructor(message = 'Não autorizado') {
    super(message)
    this.name = 'UnauthorizedError'
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
    throw new Error(`Falha na requisição ${init.method ?? 'GET'} ${path} (${res.status})`)
  }
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

export const api = {
  getGame: () => request<PublicGame | null>('/api/game'),
}
