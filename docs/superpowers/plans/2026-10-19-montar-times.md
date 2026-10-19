# Montar Times Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicação web em que o administrador (uma senha) cadastra a data do jogo, confirma pagamentos e sorteia times de vôlei, e o grupo consulta tudo por um link público fixo e somente leitura; o jogo finaliza sozinho ao fim do dia.

**Architecture:** Frontend React (Vite) servido pelo Cloudflare Pages. API em Hono rodando como Pages Function (`functions/api/[[path]].ts`) sobre Cloudflare D1 (SQLite). Regras de negócio em módulos puros e repositórios sobre a interface `D1Database`, testados em Vitest com um adaptador de D1 em memória (better-sqlite3). O algoritmo de sorteio é um módulo compartilhado (`src/shared`) que roda no navegador do administrador; o servidor valida e grava.

**Tech Stack:** TypeScript, React 18, Vite, react-router-dom, Hono, Cloudflare Pages + D1 + Wrangler, Vitest, @testing-library/react, better-sqlite3 (só em testes).

**Spec:** `docs/superpowers/specs/2026-10-19-montar-times-design.md`
**Protótipo visual de referência:** `docs/prototype/Montar Times v3.dc.html` (lógica do sorteio, textos em português, cadeado, reservas e cópia para WhatsApp saem dele).

## Global Constraints

- Idioma da interface: português do Brasil. Texto sem jogo ativo: `Nenhum jogo marcado`.
- Times: de 2 a 8 (nomes `Time A` a `Time H`). Jogadores por time: de 1 a 12.
- Nota do jogador: de 1 a 5, em passos de 0,5.
- Nome do jogador: 1 a 60 caracteres depois de aparado.
- Fuso do jogo: `America/Sao_Paulo`. O jogo termina às 00:00 do dia seguinte à data cadastrada.
- Só existe um jogo ativo por vez. Data no passado é recusada na criação.
- Sessão do administrador: cookie `HttpOnly`, `Secure`, `SameSite=Strict`, validade de 30 dias.
- Login: 5 tentativas erradas em 15 minutos por IP bloqueiam novas tentativas (HTTP 429).
- Senha e chave da sessão só em segredos de ambiente (`ADMIN_PASSWORD`, `SESSION_SECRET`), nunca no código.
- Tela do Membro consulta a API a cada 30 segundos e quando a aba volta ao primeiro plano.
- A rota pública nunca devolve notas nem totais de estrelas quando `member_sees_stars` é falso.
- O histórico é só gravado: nenhuma tela e nenhuma rota pública.
- Custo zero: somente planos gratuitos do Cloudflare.

## Review Focus

1. Jogo finalizado por duas requisições simultâneas → exatamente uma linha no histórico (Task 9).
2. Fronteira do dia: 23:59:59 em Brasília ainda é o dia do jogo, 00:00:00 já finaliza, mesmo com o relógio do servidor em UTC (Task 2 e 9).
3. Notas escondidas: nada na resposta pública (nem total por time) revela a nota quando a opção está desligada (Task 10).
4. Desmarcar o pagamento de quem já está num time ou nas reservas: sai do sorteio guardado na hora, e o servidor recusa um sorteio com jogador sem pagamento (Task 4 e 8).
5. Sessão adulterada ou vencida, e senha errada repetida: nenhuma escrita passa, e o sexto erro seguido dá 429 (Task 11 e 12).

---

## Estrutura de arquivos

```
package.json, tsconfig.json, vite.config.ts, vitest.config.ts, wrangler.toml
migrations/0001_init.sql
functions/api/[[path]].ts          # Pages Function: exporta o app Hono
src/shared/types.ts                # tipos usados por servidor e navegador
src/shared/dates.ts                # fuso e fim do dia
src/shared/draw.ts                 # algoritmo de sorteio (puro)
src/shared/drawValidation.ts       # valida o sorteio gravado
src/shared/whatsapp.ts             # texto "Copiar escalação"
src/server/app.ts                  # Hono: rotas e autenticação
src/server/auth.ts                 # senha, cookie assinado, limite de tentativas
src/server/players.ts              # jogadores
src/server/games.ts                # jogo, pagamentos, sorteio gravado
src/server/finalize.ts             # finalização automática e histórico
src/server/publicGame.ts           # visão pública
src/web/...                        # React (api, páginas, componentes)
tests/...                          # espelha src/
tests/helpers/testDb.ts            # D1 em memória
```

---

### Task 1: Esqueleto do projeto

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `vitest.config.ts`, `wrangler.toml`, `.gitignore`, `index.html`, `src/web/main.tsx`, `tests/smoke.test.ts`

**Interfaces:**
- Produces: scripts `npm run dev`, `npm run build`, `npm test` (Vitest, ambiente `node`; testes de componentes usam `// @vitest-environment jsdom`).

- [ ] **Step 1:** `git init` na pasta do projeto, criar projeto Vite React + TypeScript e instalar `hono react-router-dom` e, como dev, `vitest jsdom @testing-library/react @testing-library/user-event better-sqlite3 @types/better-sqlite3 @cloudflare/workers-types wrangler`.
- [ ] **Step 2:** Escrever `tests/smoke.test.ts` com `expect(1 + 1).toBe(2)`; configurar `vitest.config.ts` para `tests/**/*.test.ts(x)`.
- [ ] **Step 3:** Rodar `npm test` e `npm run build`. Esperado: 1 teste passa, build sem erro.
- [ ] **Step 4:** Commit: `chore: scaffold vite react + hono + vitest`.

---

### Task 2: Datas e fuso de Brasília

**Files:**
- Create: `src/shared/dates.ts`
- Test: `tests/shared/dates.test.ts`

**Interfaces:**
- Produces:
  - `todayInBrasilia(now: Date): string` → `'YYYY-MM-DD'` em `America/Sao_Paulo`.
  - `isGameExpired(gameDate: string, now: Date): boolean` → verdadeiro quando `todayInBrasilia(now) > gameDate`.
  - `isGameDateAllowed(gameDate: string, now: Date): boolean` → formato `YYYY-MM-DD` válido e `>= todayInBrasilia(now)`.

- [ ] **Step 1: Testes que falham** (`tests/shared/dates.test.ts`):
  - `todayInBrasilia(new Date('2026-10-20T02:59:59Z'))` é `'2026-10-19'`; com `'2026-10-20T03:00:00Z'` é `'2026-10-20'`.
  - `isGameExpired('2026-10-19', new Date('2026-10-20T02:59:59Z'))` é `false`; com `'2026-10-20T03:00:00Z'` é `true`.
  - `isGameDateAllowed('2026-10-19', <19/10 12:00 em Brasília>)` é `true`; `'2026-10-18'` é `false`; `'19/10/2026'` e `'2026-13-40'` são `false`.
- [ ] **Step 2:** Rodar `npx vitest run tests/shared/dates.test.ts`. Esperado: FAIL (módulo inexistente).
- [ ] **Step 3:** Implementar `src/shared/dates.ts` com `Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' })`; a validação de calendário usa `Date.UTC` e confere que o dia volta igual.
- [ ] **Step 4:** Rodar o arquivo de teste. Esperado: PASS.
- [ ] **Step 5:** Commit: `feat: datas em horário de Brasília`.

---

### Task 3: Algoritmo de sorteio

**Files:**
- Create: `src/shared/types.ts`, `src/shared/draw.ts`
- Test: `tests/shared/draw.test.ts`

**Interfaces:**
- Produces em `types.ts`:
  - `type Player = { id: string; name: string; rating: number; archived: boolean }`
  - `type DrawState = { teamCount: number; teamSize: number; teams: string[][]; reserves: string[]; locks: Record<string, number> }`
- Produces em `draw.ts`:
  - `type DrawInput = { players: { id: string; rating: number }[]; teamCount: number; teamSize: number; locks: Record<string, number>; previousReserves: string[]; mode?: 'equilibrado' | 'aleatório' }`
  - `drawTeams(input: DrawInput, rng?: () => number): { teams: string[][]; reserves: string[] }` (`rng` padrão `Math.random`; aceita um gerador determinístico para teste).

- [ ] **Step 1: Testes que falham** (`tests/shared/draw.test.ts`, com `rng` determinístico), um por comportamento:
  - `todos os jogadores aparecem exatamente uma vez entre times e reservas`.
  - `nenhum time passa de teamSize` e `reservas = jogadores − teamCount × teamSize` quando passa das vagas.
  - `quem ficou de fora antes tem prioridade para jogar`: com `previousReserves` contendo 2 ids e 2 vagas faltando, esses 2 ids ficam nos times.
  - `jogador travado fica no time escolhido` e `trava para time acima de teamCount é ignorada`.
  - `equilíbrio`: com ratings `[5,4.5,4,4,3.5,3.5,3,3,2.5,2,1.5,1]`, 2 times de 6, a diferença de soma entre os times é `<= 0.5`.
  - `tamanhos desiguais comparam média`: 7 jogadores, 2 times de 4, a diferença de média entre os times é `<= 1`.
  - `modo aleatório` não usa nota (mesmo resultado para duas listas com mesmos ids e notas diferentes e mesmo `rng`).
- [ ] **Step 2:** Rodar `npx vitest run tests/shared/draw.test.ts`. Esperado: FAIL.
- [ ] **Step 3:** Implementar `drawTeams` portando `balance()` do protótipo (`docs/prototype/Montar Times v3.dc.html`, método `balance`): jogadores travados primeiro, sobra vira reserva com prioridade para `previousReserves`, distribuição gulosa pelo time com menos jogadores e menor soma, depois trocas entre times (sem mexer nos travados) até a diferença de média parar de melhorar (máx. 60 iterações). Trocar `Math.random` por `rng`.
- [ ] **Step 4:** Rodar o arquivo de teste. Esperado: PASS.
- [ ] **Step 5:** Commit: `feat: algoritmo de sorteio compartilhado`.

---

### Task 4: Validação do sorteio gravado

**Files:**
- Create: `src/shared/drawValidation.ts`
- Test: `tests/shared/drawValidation.test.ts`

**Interfaces:**
- Consumes: `DrawState` (Task 3).
- Produces: `validateDrawState(state: DrawState, paidIds: ReadonlySet<string>): string | null` (mensagem em português do primeiro erro, ou `null`).

- [ ] **Step 1: Testes que falham**:
  - estado válido → `null`.
  - `teamCount` 1 ou 9 → erro; `teamSize` 0 ou 13 → erro.
  - `teams.length !== teamCount` → erro.
  - jogador sem pagamento confirmado (fora de `paidIds`) em time ou reserva → erro.
  - mesmo id em dois times, ou em time e reserva → erro.
  - time com mais de `teamSize` jogadores → erro.
  - `locks` apontando para índice `>= teamCount` → erro.
- [ ] **Step 2:** Rodar o arquivo de teste. Esperado: FAIL.
- [ ] **Step 3:** Implementar `validateDrawState` em `src/shared/drawValidation.ts`.
- [ ] **Step 4:** Rodar o arquivo de teste. Esperado: PASS.
- [ ] **Step 5:** Commit: `feat: validação do sorteio gravado`.

---

### Task 5: Texto para WhatsApp

**Files:**
- Create: `src/shared/whatsapp.ts`
- Test: `tests/shared/whatsapp.test.ts`

**Interfaces:**
- Produces: `buildWhatsAppText(input: { date: string; teams: { name: string; rating: number }[][]; reserves: { name: string; rating: number }[]; includeStars: boolean }): string` (`date` no formato `YYYY-MM-DD`; os nomes dos times são `Time A`, `Time B`… pela posição).

- [ ] **Step 1: Teste que falha**: com `date: '2026-10-17'`, 2 times de 2 jogadores e 1 reserva, sem estrelas, o resultado é exatamente:
  ```
  🏐 *Escalação · Vôlei*
  Sábado, 17/10 · 4 jogadores

  *Time A*
  1. Rafael
  2. Bruno

  *Time B*
  1. Thiago
  2. Lucas

  Reservas: Diego
  ```
  Outro teste: com `includeStars: true` cada linha termina em ` ★4,5` (vírgula decimal, sem zero à direita para inteiros: `★3`). Outro: sem reservas, a linha `Reservas:` não aparece.
- [ ] **Step 2:** Rodar o arquivo de teste. Esperado: FAIL.
- [ ] **Step 3:** Implementar `buildWhatsAppText` (dia da semana por `toLocaleDateString('pt-BR', { weekday: 'long', timeZone: 'UTC' })` sobre a data às 12:00 UTC, primeira letra maiúscula).
- [ ] **Step 4:** Rodar o arquivo de teste. Esperado: PASS.
- [ ] **Step 5:** Commit: `feat: texto de escalação para WhatsApp`.

---

### Task 6: Banco de dados e adaptador de teste

**Files:**
- Create: `migrations/0001_init.sql`, `tests/helpers/testDb.ts`
- Test: `tests/server/db.test.ts`

**Interfaces:**
- Produces:
  - Tabelas: `players(id, name, rating, archived, created_at)`, `games(id, date, state, team_count, team_size, draw_json, created_at)`, `game_paid(game_id, player_id)` com PK composta, `settings(key, value)`, `history(id, game_id UNIQUE, game_date, finished_at, snapshot_json)`, `login_attempts(ip, at)`.
  - Índice único parcial `one_active_game` em `games(state) WHERE state = 'active'`.
  - `createTestDb(): D1Database` (better-sqlite3 em memória, aplica `migrations/*.sql` em ordem; implementa `prepare().bind().first()/all()/run()` e `batch()` dentro de uma transação).

- [ ] **Step 1: Testes que falham** (`tests/server/db.test.ts`): inserir dois jogos com `state = 'active'` falha na segunda inserção; dois jogos `finished` são aceitos; `batch` com uma instrução inválida não aplica nenhuma das outras; segunda linha de `history` com o mesmo `game_id` é recusada.
- [ ] **Step 2:** Rodar o arquivo de teste. Esperado: FAIL.
- [ ] **Step 3:** Escrever a migração e o adaptador `createTestDb`.
- [ ] **Step 4:** Rodar o arquivo de teste. Esperado: PASS.
- [ ] **Step 5:** Commit: `feat: schema D1 e adaptador de teste`.

---

### Task 7: Jogadores

**Files:**
- Create: `src/server/players.ts`
- Test: `tests/server/players.test.ts`

**Interfaces:**
- Consumes: `createTestDb()` (Task 6), `Player` (Task 3).
- Produces:
  - `createPlayer(db: D1Database, input: { name: string; rating: number }): Promise<Player>` (erro `Error` com mensagem em português para nome vazio/maior que 60 ou nota fora de 1–5 em passos de 0,5).
  - `listPlayers(db: D1Database, opts?: { includeArchived?: boolean }): Promise<Player[]>` (ordem alfabética).
  - `updatePlayer(db: D1Database, id: string, patch: { name?: string; rating?: number }): Promise<Player>`.
  - `archivePlayer(db: D1Database, id: string): Promise<void>`.

- [ ] **Step 1: Testes que falham**: cria e lista; rejeita nota `0.7`, `0` e `5.5`; rejeita nome só com espaços e nome com 61 caracteres; aparar nome; `archivePlayer` tira da listagem padrão mas mantém com `includeArchived: true`.
- [ ] **Step 2:** Rodar o arquivo de teste. Esperado: FAIL.
- [ ] **Step 3:** Implementar `src/server/players.ts` (id com `crypto.randomUUID()`).
- [ ] **Step 4:** Rodar o arquivo de teste. Esperado: PASS.
- [ ] **Step 5:** Commit: `feat: cadastro de jogadores`.

---

### Task 8: Jogo, pagamentos e sorteio gravado

**Files:**
- Create: `src/server/games.ts`
- Test: `tests/server/games.test.ts`

**Interfaces:**
- Consumes: `createPlayer` (Task 7), `isGameDateAllowed` (Task 2), `validateDrawState` (Task 4), `DrawState` (Task 3).
- Produces:
  - `type Game = { id: string; date: string; paid: string[]; draw: DrawState | null }`
  - `getActiveGame(db: D1Database): Promise<Game | null>`
  - `createGame(db: D1Database, date: string, now: Date): Promise<Game>` (erro se a data não é permitida ou se já existe jogo ativo).
  - `updateGameDate(db: D1Database, date: string, now: Date): Promise<Game>`
  - `deleteActiveGame(db: D1Database): Promise<void>` (apaga também os pagamentos).
  - `setPaid(db: D1Database, playerId: string, paid: boolean): Promise<Game>` (ao desmarcar, remove o jogador de `teams`, `reserves` e `locks` do sorteio gravado, na mesma operação).
  - `saveDraw(db: D1Database, state: DrawState): Promise<Game>` (valida com `validateDrawState` usando os pagamentos do jogo; erro se não houver jogo ativo).
  - `getSetting(db: D1Database, key: 'member_sees_stars'): Promise<boolean>` e `setSetting(db: D1Database, key: 'member_sees_stars', value: boolean): Promise<void>` (padrão: `false`).

- [ ] **Step 1: Testes que falham**: criar jogo com data de ontem falha; criar um segundo jogo ativo falha; jogador novo começa como não pago; `setPaid` marca e desmarca; **desmarcar quem está num time o remove de `teams`, `reserves` e `locks`**; `saveDraw` com jogador sem pagamento falha e não altera o sorteio anterior; `saveDraw` válido é devolvido por `getActiveGame`; `deleteActiveGame` apaga pagamentos; `getSetting` devolve `false` por padrão.
- [ ] **Step 2:** Rodar o arquivo de teste. Esperado: FAIL.
- [ ] **Step 3:** Implementar `src/server/games.ts`; o sorteio fica em `games.draw_json` (com `team_count` e `team_size` também nas colunas).
- [ ] **Step 4:** Rodar o arquivo de teste. Esperado: PASS.
- [ ] **Step 5:** Commit: `feat: jogo, pagamentos e sorteio gravado`.

---

### Task 9: Finalização automática e histórico

**Files:**
- Create: `src/server/finalize.ts`
- Test: `tests/server/finalize.test.ts`

**Interfaces:**
- Consumes: `getActiveGame`, `setPaid`, `saveDraw` (Task 8), `isGameExpired` (Task 2).
- Produces: `finalizeIfExpired(db: D1Database, now: Date): Promise<boolean>` (verdadeiro se este chamado finalizou um jogo).
- Snapshot em `history.snapshot_json`: `{ date, finishedAt, config: { teamCount, teamSize }, players: { id, name, rating, paid }[], teams: string[][], reserves: string[] }`, com nomes e notas congelados.

- [ ] **Step 1: Testes que falham**:
  - sem jogo ativo → `false`; jogo de hoje às 23:59:59 de Brasília (`'2026-10-20T02:59:59Z'`) → `false`; às `'2026-10-20T03:00:00Z'` → `true`.
  - depois de finalizar: `getActiveGame` devolve `null`, os pagamentos do jogo sumiram, existe 1 linha em `history` com o sorteio (times e reservas) e os nomes dos jogadores.
  - jogador arquivado depois do jogo continua com o nome no snapshot gravado antes.
  - **`Promise.all([finalizeIfExpired(db, now), finalizeIfExpired(db, now)])` deixa exatamente 1 linha em `history`.**
  - jogo sem sorteio também finaliza e grava `teams: []`.
- [ ] **Step 2:** Rodar o arquivo de teste. Esperado: FAIL.
- [ ] **Step 3:** Implementar numa única `db.batch([...])`: `INSERT OR IGNORE INTO history` (a unicidade de `game_id` garante o único registro), `UPDATE games SET state='finished', draw_json=NULL WHERE id=? AND state='active'`, `DELETE FROM game_paid WHERE game_id=?`. O retorno é verdadeiro quando o `INSERT` gravou uma linha.
- [ ] **Step 4:** Rodar o arquivo de teste. Esperado: PASS.
- [ ] **Step 5:** Commit: `feat: finalização automática com histórico`.

---

### Task 10: Visão pública

**Files:**
- Create: `src/server/publicGame.ts`
- Test: `tests/server/publicGame.test.ts`
- Modify: `src/shared/types.ts` (adicionar `PublicGame`)

**Interfaces:**
- Consumes: `finalizeIfExpired` (Task 9), `getActiveGame`, `getSetting` (Task 8), `listPlayers` (Task 7).
- Produces:
  - `type PublicGame = { date: string; showStars: boolean; players: { id: string; name: string; paid: boolean; rating?: number }[]; teams: string[][]; reserves: string[] }` (`teams` e `reserves` são ids; o nome vem de `players`).
  - `getPublicGame(db: D1Database, now: Date): Promise<PublicGame | null>` (finaliza o jogo vencido antes; `null` quando não há jogo ativo).

- [ ] **Step 1: Testes que falham**:
  - sem jogo → `null`; jogo vencido → `null` e a finalização aconteceu.
  - com `member_sees_stars = false`, **`JSON.stringify(resultado)` não contém a palavra `rating`** e nenhuma nota dos jogadores cadastrados; com `true`, cada jogador traz `rating`.
  - jogadores arquivados não aparecem; `paid` reflete `game_paid`.
  - `teams` e `reserves` vêm do sorteio gravado.
- [ ] **Step 2:** Rodar o arquivo de teste. Esperado: FAIL.
- [ ] **Step 3:** Implementar `getPublicGame` montando o objeto sem a chave `rating` quando `showStars` é falso (nunca `undefined`, a chave nem existe).
- [ ] **Step 4:** Rodar o arquivo de teste. Esperado: PASS.
- [ ] **Step 5:** Commit: `feat: visão pública do jogo`.

---

### Task 11: Autenticação do administrador

**Files:**
- Create: `src/server/auth.ts`
- Test: `tests/server/auth.test.ts`

**Interfaces:**
- Produces:
  - `verifyPassword(input: string, expected: string): Promise<boolean>` (comparação em tempo constante, via HMAC dos dois lados).
  - `signSession(secret: string, now: Date): Promise<string>` e `verifySession(token: string, secret: string, now: Date): Promise<boolean>` (token `expiraEmMs.assinaturaHex`, validade de 30 dias).
  - `isLoginBlocked(db: D1Database, ip: string, now: Date): Promise<boolean>` (verdadeiro com 5 ou mais falhas nos últimos 15 minutos).
  - `recordFailedLogin(db: D1Database, ip: string, now: Date): Promise<void>`.
  - `sessionCookie(token: string): string` com `HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=2592000`.

- [ ] **Step 1: Testes que falham**: senha certa e errada; token válido passa; token com um caractere trocado falha; token com a assinatura de outro segredo falha; token com 30 dias e 1 segundo de idade falha; 4 falhas não bloqueiam, a 5ª bloqueia; falhas com mais de 15 minutos não contam; o bloqueio é por IP; `sessionCookie` contém os quatro atributos exigidos.
- [ ] **Step 2:** Rodar o arquivo de teste. Esperado: FAIL.
- [ ] **Step 3:** Implementar com Web Crypto (`crypto.subtle`, HMAC SHA-256), sem dependências.
- [ ] **Step 4:** Rodar o arquivo de teste. Esperado: PASS.
- [ ] **Step 5:** Commit: `feat: autenticação do administrador`.

---

### Task 12: API (Hono) e Pages Function

**Files:**
- Create: `src/server/app.ts`, `functions/api/[[path]].ts`
- Test: `tests/server/app.test.ts`

**Interfaces:**
- Consumes: todos os módulos de `src/server/*` e `drawValidation`.
- Produces: `createApp(): Hono<{ Bindings: { DB: D1Database; ADMIN_PASSWORD: string; SESSION_SECRET: string } }>`; teste via `app.request(path, init, env)`.
- Rotas (todas sob `/api`): `GET /game` (pública), `POST /admin/login`, `POST /admin/logout`, `GET|POST /admin/players`, `PATCH|DELETE /admin/players/:id`, `GET|POST|PATCH|DELETE /admin/game`, `PUT /admin/game/paid` (corpo `{ playerId, paid }`), `PUT /admin/game/draw` (corpo `DrawState`), `PATCH /admin/settings` (corpo `{ memberSeesStars }`), `GET /admin/history`, `GET /admin/me` (200 com sessão válida, 401 sem).
- Erros de validação: HTTP 400 com `{ error: string }`. Sem sessão: 401.

- [ ] **Step 1: Testes que falham**:
  - **para cada rota `/api/admin/*` exceto `login`, sem cookie → 401** (laço sobre a lista de rotas e métodos).
  - login correto → 200 com `Set-Cookie` contendo `HttpOnly`, `Secure`, `SameSite=Strict`; senha errada → 401; **após 5 erros seguidos o 6º, mesmo com a senha certa, → 429**.
  - cookie com assinatura adulterada → 401.
  - fluxo completo com cookie: criar jogador, criar jogo para hoje, marcar pago, `PUT draw`, `GET /api/game` (sem cookie) devolve os times.
  - `PUT /admin/game/draw` com jogador não pago → 400.
  - `GET /api/game` sem jogo → `200` com corpo `null`.
- [ ] **Step 2:** Rodar o arquivo de teste. Esperado: FAIL.
- [ ] **Step 3:** Implementar `createApp` (middleware de sessão para `/api/admin/*`, IP via `CF-Connecting-IP`, relógio `new Date()` injetável por `c.env` opcional só em testes não é necessário: usar `new Date()`). `functions/api/[[path]].ts` exporta `onRequest = handle(createApp())` de `hono/cloudflare-pages`.
- [ ] **Step 4:** Rodar `npx vitest run tests/server`. Esperado: tudo PASS.
- [ ] **Step 5:** Commit: `feat: API Hono com rotas públicas e de administrador`.

---

### Task 13: Base do frontend e tela do Membro

**Files:**
- Create: `src/web/api.ts`, `src/web/theme.css`, `src/web/App.tsx`, `src/web/pages/MemberPage.tsx`, `src/web/hooks/usePublicGame.ts`
- Modify: `src/web/main.tsx`, `index.html`
- Test: `tests/web/MemberPage.test.tsx`

**Interfaces:**
- Consumes: `PublicGame` (Task 10).
- Produces:
  - `api.getGame(): Promise<PublicGame | null>`; `api` completo (admin) cresce nas Tasks 14 a 16: `api.login(password)`, `api.me()`, `api.logout()`, `api.players.*`, `api.game.*`, `api.settings.*`.
  - `usePublicGame(intervalMs?: number): { game: PublicGame | null; loading: boolean; error: string | null }` (padrão 30000; recarrega em `visibilitychange`).
  - Rotas: `/` → `MemberPage`, `/admin` → Task 14.
  - `theme.css` com os tokens do tema claro e do dourado vindos do protótipo (bloco `LIGHT` do script) e a folha do design system (`_ds/nocturne-54162b6c-d9e4-4739-96f3-e62590623326/styles.css`, lida do projeto Claude Design `abefde06-7208-4b47-b1ff-80e120fbb66a` com `read_file`).

- [ ] **Step 1: Testes que falham** (`// @vitest-environment jsdom`, `fetch` simulado): `null` mostra `Nenhum jogo marcado`; mostra a data (`Sábado, 17/10`) e a lista de jogadores com quem pagou; sem `rating` na resposta não existe nenhuma estrela na tela; com `rating` aparecem as estrelas; depois do sorteio mostra os times `Time A`, `Time B` e as reservas; com fake timers, 30 segundos depois `fetch` é chamado de novo.
- [ ] **Step 2:** Rodar o arquivo de teste. Esperado: FAIL.
- [ ] **Step 3:** Implementar os arquivos listados, reaproveitando o visual da visão "Membro" do protótipo (cards de time, estrelas de ouro, lista do elenco).
- [ ] **Step 4:** Rodar o arquivo de teste. Esperado: PASS.
- [ ] **Step 5:** Commit: `feat: tela pública do Membro`.

---

### Task 14: Login e estrutura do administrador

**Files:**
- Create: `src/web/pages/LoginPage.tsx`, `src/web/pages/AdminPage.tsx`, `src/web/components/GameBar.tsx`, `src/web/components/SettingsToggle.tsx`
- Modify: `src/web/api.ts`, `src/web/App.tsx`
- Test: `tests/web/AdminPage.test.tsx`

**Interfaces:**
- Consumes: rotas `GET /admin/me`, `POST /admin/login`, `POST|PATCH|DELETE /admin/game`, `PATCH /admin/settings`.
- Produces: `GameBar` (mostra a data do jogo, formulário para cadastrar/alterar/excluir) e `SettingsToggle` (`Membro vê as estrelas`), dentro de `AdminPage`, que é a moldura onde as Tasks 15 e 16 encaixam painéis.

- [ ] **Step 1: Testes que falham**: sem sessão (`/admin/me` → 401) mostra o formulário de senha; senha errada mostra `Senha incorreta`; resposta 429 mostra `Muitas tentativas. Tente de novo em alguns minutos.`; login certo mostra o painel; cadastrar data chama `POST /api/admin/game` com `{ date }`; alternar `Membro vê as estrelas` chama `PATCH /api/admin/settings`.
- [ ] **Step 2:** Rodar o arquivo de teste. Esperado: FAIL.
- [ ] **Step 3:** Implementar as páginas e componentes.
- [ ] **Step 4:** Rodar o arquivo de teste. Esperado: PASS.
- [ ] **Step 5:** Commit: `feat: login e moldura do administrador`.

---

### Task 15: Painel de jogadores e pagamentos

**Files:**
- Create: `src/web/components/StarRating.tsx`, `src/web/components/PlayersPanel.tsx`
- Modify: `src/web/pages/AdminPage.tsx`
- Test: `tests/web/PlayersPanel.test.tsx`

**Interfaces:**
- Consumes: `api.players.*`, `api.game.setPaid(playerId, paid)`.
- Produces: `StarRating(props: { value: number; onChange?: (v: number) => void; size?: number })` (metade esquerda da estrela dá meia, como no protótipo; sem `onChange` é só leitura); `PlayersPanel` com adicionar (nome + estrelas), renomear, mudar nota, arquivar e a caixa `Pagou` por jogador (desabilitada sem jogo ativo).

- [ ] **Step 1: Testes que falham**: clicar na metade esquerda da 3ª estrela chama `onChange(2.5)`, na direita `3`; a primeira estrela nunca devolve menos que `1`; marcar `Pagou` chama `PUT /api/admin/game/paid` com `{ playerId, paid: true }`; sem jogo ativo a caixa `Pagou` fica desabilitada; contador `N de M pagaram`.
- [ ] **Step 2:** Rodar o arquivo de teste. Esperado: FAIL.
- [ ] **Step 3:** Implementar, portando o markup e os textos da coluna `Jogadores` do protótipo.
- [ ] **Step 4:** Rodar o arquivo de teste. Esperado: PASS.
- [ ] **Step 5:** Commit: `feat: painel de jogadores e pagamentos`.

---

### Task 16: Sorteio, times, reservas, cadeado e cópia

**Files:**
- Create: `src/web/components/DrawModal.tsx`, `src/web/components/TeamCards.tsx`, `src/web/components/ReservesBar.tsx`, `src/web/components/CopyBar.tsx`
- Modify: `src/web/pages/AdminPage.tsx`, `src/web/api.ts`
- Test: `tests/web/DrawModal.test.tsx`, `tests/web/TeamCards.test.tsx`

**Interfaces:**
- Consumes: `drawTeams` (Task 3), `buildWhatsAppText` (Task 5), `api.game.saveDraw(state: DrawState)`.
- Produces:
  - `DrawModal(props: { open: boolean; paidCount: number; initial: { teamCount: number; teamSize: number }; lockedCount: number; onConfirm: (cfg: { teamCount: number; teamSize: number }) => void; onClose: () => void })` com os atalhos `2 times de 6`, `2 times de 4`, `3 times de 4`, controles − / + (times 2–8, jogadores 1–12) e o resumo ao vivo do protótipo (`N vagas · M convocados ficam como reserva.`).
  - `TeamCards`: cards com arrastar para mover entre times e para as reservas, cadeado por jogador e totais/médias (só quando o administrador vê as estrelas, sempre verdadeiro no painel dele).
  - `ReservesBar`, `CopyBar` (botão `Copiar escalação`, opção `Incluir estrelas` desligada por padrão, texto numa caixa se a área de transferência falhar).
  - Toda mudança (sortear, arrastar, travar) chama `api.game.saveDraw` com o `DrawState` completo.

- [ ] **Step 1: Testes que falham**:
  - `DrawModal`: botão confirmar desabilitado quando `paidCount < teamCount`; resumo com 14 pagos, 2 times de 6 → `12 vagas · 2 convocados ficam como reserva.`; atalho `3 times de 4` ajusta os dois valores; `−` em 2 times continua em 2; `+` em 8 times continua em 8; confirmar chama `onConfirm({ teamCount, teamSize })`.
  - `TeamCards`: clicar no cadeado chama o callback com o novo `locks`; soltar um jogador travado em outro time move o cadeado junto; soltar na barra de reservas remove a trava.
  - `CopyBar`: com `navigator.clipboard.writeText` rejeitando, o texto aparece numa `textarea` somente leitura.
- [ ] **Step 2:** Rodar `npx vitest run tests/web/DrawModal.test.tsx tests/web/TeamCards.test.tsx`. Esperado: FAIL.
- [ ] **Step 3:** Implementar os componentes portando o comportamento do protótipo (modal fecha ao clicar fora e em `Cancelar`; também fecha com `Esc`, que o protótipo não tinha). Sorteio: só jogadores pagos, `previousReserves` vindo do sorteio gravado.
- [ ] **Step 4:** Rodar `npm test`. Esperado: tudo PASS.
- [ ] **Step 5:** Commit: `feat: sorteio, reservas, cadeado e cópia para WhatsApp`.

---

### Task 17: Publicação no Cloudflare

**Files:**
- Modify: `wrangler.toml`
- Create: `docs/deploy.md`

**Interfaces:**
- Consumes: todo o projeto.
- Produces: site publicado com D1 ligado ao binding `DB`, segredos `ADMIN_PASSWORD` e `SESSION_SECRET` definidos.

- [ ] **Step 1:** Criar o banco: `npx wrangler d1 create montar-times`; colocar o `database_id` e o binding `DB` em `wrangler.toml`; aplicar `npx wrangler d1 migrations apply montar-times --remote`.
- [ ] **Step 2:** Definir os segredos: `npx wrangler pages secret put ADMIN_PASSWORD` e `npx wrangler pages secret put SESSION_SECRET` (valor aleatório de pelo menos 32 caracteres).
- [ ] **Step 3:** `npm run build` e `npx wrangler pages deploy dist --project-name montar-times`.
- [ ] **Step 4: Roteiro de verificação** (registrar em `docs/deploy.md` e rodar): `curl -s https://<site>/api/game` devolve `null`; `curl -i -X POST https://<site>/api/admin/players` devolve 401; login pelo navegador em `/admin`; cadastrar jogo de hoje, marcar três jogadores como pagos, sortear, abrir `/` em outra aba anônima e conferir os times; com `Membro vê as estrelas` desligado, `curl -s https://<site>/api/game | grep -c rating` devolve `0`.
- [ ] **Step 5:** Commit: `docs: roteiro de publicação`.

---

## Autorrevisão

**Cobertura da spec:** objetivos e comportamentos cobertos (login: 11/12/14; data e jogo único: 8; pagamento só do administrador: 8/15; sorteio configurável, reservas, cadeado, arrastar, cópia: 3/16; finalização automática com histórico: 9; link público somente leitura: 10/13; opção de estrelas: 10/14; custo zero: 17). Fora de escopo respeitado (sem juntos/separados, sem tela de histórico, `GET /admin/history` só leitura protegida).

**Decisões que o plano fixa e a spec deixava abertas** (marcar na revisão): desmarcar pagamento remove o jogador do sorteio gravado na hora (Task 8); texto do WhatsApp usa a data do jogo, não a de hoje (Task 5); senha comparada por HMAC em tempo constante, em segredo de ambiente em texto simples (Task 11); `Esc` fecha o modal (Task 16, o protótipo não tinha).

**Consistência de tipos:** `DrawState` e `Player` nascem na Task 3 e são usados sem alteração nas Tasks 4, 8, 12, 16; `PublicGame` nasce na Task 10 e é consumido na 13; nomes de funções conferidos entre tarefas.
