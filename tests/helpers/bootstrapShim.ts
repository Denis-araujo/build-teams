type Out = { status: number; body?: unknown }
type Routes = Record<string, ((init: RequestInit) => Out | Promise<Out>) | Out>

const run = async (r: Routes[string] | undefined, init: RequestInit): Promise<Out | undefined> =>
  r === undefined ? undefined : typeof r === 'function' ? r(init) : r

/** O painel carrega tudo em GET /api/admin/bootstrap; os testes ainda descrevem as três leituras separadas. */
export async function bootstrapFromLegacy(routes: Routes, init: RequestInit): Promise<Out> {
  const game = await run(routes['GET /api/admin/game'], init)
  const settings = await run(routes['GET /api/admin/settings'], init)
  const players = await run(routes['GET /api/admin/players'], init)
  const failed = [game, settings, players].find((o) => o && (o.status < 200 || o.status >= 300))
  if (failed) return failed
  return { status: 200, body: { game: game?.body ?? null, settings: settings?.body, players: players?.body ?? [] } }
}
