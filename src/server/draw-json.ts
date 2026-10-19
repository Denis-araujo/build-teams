import type { DrawState } from '../shared/types'

// Lê draw_json sem derrubar a API: JSON inválido ou fora do formato vira null.
export function safeParseDraw(json: string | null): DrawState | null {
  if (!json) return null
  try {
    const v = JSON.parse(json) as Partial<DrawState> | null
    if (
      v &&
      typeof v === 'object' &&
      Array.isArray(v.teams) &&
      Array.isArray(v.reserves) &&
      v.locks !== null &&
      typeof v.locks === 'object' &&
      !Array.isArray(v.locks)
    ) {
      return v as DrawState
    }
    console.error('draw_json com formato inválido')
    return null
  } catch (e) {
    console.error('draw_json corrompido', e)
    return null
  }
}
