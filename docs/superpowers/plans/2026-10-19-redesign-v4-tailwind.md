# Redesign v4 + Tailwind Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o app idêntico ao design v4 do Claude Design, estilizado 100% com Tailwind v4, e implementar os comportamentos novos que o v4 exige (hora do jogo, marcar todos/limpar, nota 0,5, barra de equilíbrio, onboarding, Membro sem elenco).

**Architecture:** O app existente (React 18 + Vite + Hono/D1) mantém a lógica. O CSS puro (`src/web/theme.css` + estilos inline) é substituído por Tailwind v4 (`@tailwindcss/vite`, `@import "tailwindcss"`, `@theme` com os tokens do v4) em componentes React. Duas etapas: A restiliza sem mudar texto nem comportamento (os 335 testes seguem verdes sem edição); B muda texto e comportamento com testes novos. No fim, uma verificação visual compara o v4 e o app no navegador.

**Tech Stack:** React 18, TypeScript, Vite 8, Tailwind CSS v4 (`tailwindcss`, `@tailwindcss/vite`), Vitest + Testing Library; backend existente (Hono, Cloudflare D1).

**Spec:** `docs/superpowers/specs/2026-10-19-redesign-v4-tailwind-design.md`
**Fonte da verdade visual (valores literais, textos, estados, classes Tailwind sugeridas):** `docs/prototype/v4-design-brief.md`; protótipo: `docs/prototype/Montar Times v4.dc.html`; CSS do design system: `docs/prototype/nocturne-styles.css`; ilustração: `public/images/membro-elenco-vazio.webp`.

## Global Constraints

- Estilização só com Tailwind v4 (utilitários e `@theme`/`@layer` no CSS de entrada). Sem `style={{...}}` para aparência estática; estilos inline só onde o valor é dinâmico (cores por time, larguras de barra, `boxShadow` do destaque de arrastar, que um teste lê).
- Fiel ao brief: copiar os valores literais (px, cores, gaps, raios, sombras) do `v4-design-brief.md`; botão primário **contornado** (borda e texto `--color-accent`, fundo transparente, hover 12%), raios sm 4px / md 8px / lg 12px, `body` 15px com `line-height` 1.55, fonte Inter (400/500/600/700) pelo `<link>` do Google Fonts no `index.html`.
- Um só tema (claro). Sem tema escuro.
- Texto em português do Brasil; vocabulário "jogadores" onde o v4 diz "convocados"; a caixa continua significando pagamento confirmado; rótulos acessíveis com o nome do jogador ("Pagou: Ana", "Remover Ana", "Mover Ana para").
- Nenhum teste enfraquecido: um teste só muda quando o texto ou o comportamento pedido muda, e muda no mesmo commit.
- Manter: `<section>` + `h2` "Time A…" por time e "Reservas", `<li>` por jogador, `data-testid` existentes (`player-{id}`, `teams-value`, `size-value`, `modal-backdrop`), a classe `star-hit` e o `style.boxShadow` inline do destaque de soltar, `role="status"`/`role="alert"`, `aria-label` "{x} estrelas", foco visível (`focus-visible`), um só `h1` por tela.
- Hora do jogo: formato `HH:MM` (00:00 a 23:59), padrão `19:00`. Nota do jogador: de 0,5 a 5 em passos de 0,5. A regra "não cadastrar dia passado" e o fim do jogo no fim do dia (America/Sao_Paulo) não mudam.
- A resposta pública continua sem notas quando `member_sees_stars` é falso (a hora é pública, a nota não).
- Layouts corretos em 390px e 1440px de largura, margem lateral como no brief.
- Backend: só a API D1 (sem `RETURNING` com checagem de `changes`, sem `first(coluna)`); migração inicial editável (não há banco remoto); protocolo de `revision` de `games.ts` respeitado.

## Review Focus

1. Tailwind não gera as classes de utilitários montadas dinamicamente por string (`bg-${cor}`): o build de produção perderia estilos que o servidor de desenvolvimento mostra (Task 1, Task 5).
2. Hora `24:00`, `7:5`, vazio e fuso: rejeitadas pelo servidor com 400, e o formulário não deixa enviar (Task 9).
3. "Marcar todos" com jogadores arquivados, sem jogo ativo e em corrida com um sorteio salvo: nunca fica jogador sem pagamento num sorteio guardado (Task 10).
4. Nota 0,5: o sorteio, a barra de equilíbrio e o texto do WhatsApp lidam com `0,5` sem `NaN` nem "0" (Task 10, Task 12).
5. Estado "Membro sem elenco" e "sem jogo" não se confundem: nenhum dos dois mostra a ilustração fora do caso certo e a imagem tem `alt` correto (Task 13).

---

## Estrutura

```
index.html                       # link da fonte Inter
vite.config.ts                   # plugin do Tailwind
src/web/styles.css               # NOVO: @import "tailwindcss", @theme, @layer base/components (substitui theme.css)
src/web/theme.css                # REMOVIDO no fim da Etapa A
src/web/components/*.tsx, pages/*.tsx   # reescritos com classes Tailwind
src/web/lib/teamColors.ts        # NOVO: cores/letra por time
src/web/components/BalanceCard.tsx, Onboarding.tsx, GameCard.tsx, SiteHeader.tsx   # NOVOS
migrations/0001_init.sql, src/server/*, src/shared/*   # hora do jogo, nota 0,5, marcar todos
```

---

## Etapa A — restilização com Tailwind (sem mudar texto nem comportamento)

### Task 1: Tailwind, tokens e primitivos

**Files:**
- Modify: `package.json` (devDependencies `tailwindcss`, `@tailwindcss/vite`), `vite.config.ts`, `index.html`, `src/web/main.tsx`
- Create: `src/web/styles.css`
- Keep (por enquanto): `src/web/theme.css` (removido na Task 8)

**Interfaces:**
- Produces: tokens do v4 no `@theme` (brief seção 2.7: cores `neutral-*`/`accent-*` invertidas como no v4, `navy`, `navy-ink`, `navy-muted`, `gold*`, `surface`, `bg`, fontes, raios, sombras), base global (brief 2.3: `body` 15px/1.55, `*` box-sizing, `h1..h6`, `:focus-visible`), e componentes `@layer components`: `.btn`, `.btn-primary` (contornado), `.btn-secondary`, `.btn-ghost`, `.btn-icon`, `.input`, `.tag` (brief 2.4, valores de `nocturne-styles.css`). `styles.css` é importado depois de `theme.css` em `main.tsx` até a Task 8.

- [ ] **Step 1:** `npm i -D tailwindcss @tailwindcss/vite`; registrar `tailwindcss()` em `vite.config.ts` depois de `react()`.
- [ ] **Step 2:** Criar `src/web/styles.css` com `@import "tailwindcss";`, `@theme { ... }`, `@layer base { ... }` e `@layer components { ... }` seguindo o brief 2.1–2.7 e 2.4 (copiar valores literais). O `--color-divider` claro útil `#cfd3e5` (proposta do brief 5/6) **[decisão do plano]**.
- [ ] **Step 3:** Adicionar o `<link>` do Google Fonts (Inter 400;500;600;700, `display=swap`, com `preconnect`) ao `index.html`.
- [ ] **Step 4:** Rodar `npm test` e `npm run build`. Esperado: 335 testes passam; build gera CSS com utilitários (conferir que `dist/assets/*.css` contém `.btn` e `--color-accent`).
- [ ] **Step 5:** Commit: `feat: Tailwind v4, tokens e primitivos do v4`.

### Task 2: StarRating

**Files:**
- Modify: `src/web/components/StarRating.tsx`
- Test: `tests/web/StarRating.test.tsx` (não pode precisar de edição)

**Interfaces:**
- Consumes: tokens da Task 1.
- Produces: `StarRating(props: { value: number; onChange?: (v: number) => void; size?: number })` (assinatura inalterada), tamanhos 22/18/15 do v4 (brief 3.3/3.4), versão somente-leitura sem `drop-shadow`, classe `star-hit` mantida nos botões de área de clique, `:focus-visible` por utilitário (`focus-visible:outline-2 ...`).

- [ ] **Step 1:** Reescrever o markup com utilitários Tailwind, mantendo roles, `aria-label` ("{x} estrelas"), `star-hit` e a lógica atual (a nota mínima 0,5 vem na Task 10).
- [ ] **Step 2:** Rodar `tests/web/StarRating.test.tsx`, `npm test`, `npm run build`. Esperado: tudo verde, testes sem edição.
- [ ] **Step 3:** Commit: `feat: StarRating com Tailwind`.

### Task 3: Cabeçalho e molduras de página

**Files:**
- Create: `src/web/components/SiteHeader.tsx`
- Modify: `src/web/pages/AdminPage.tsx`, `src/web/pages/MemberPage.tsx`, `src/web/pages/LoginPage.tsx` (só a moldura), `src/web/App.tsx` se necessário
- Test: `tests/web/AdminPage.test.tsx`, `tests/web/MemberPage.test.tsx` (sem edição)

**Interfaces:**
- Produces: `SiteHeader(props: { roleLabel: string; subtitle?: string; onLogout?: () => void })` — brief 3.1: `<header>` sticky com blur, logo navy 36px, "Escalação" + subtítulo, rótulo do perfil ("Administrador" / "Membro" / "Acesso restrito") e botão "Sair" (só admin). O texto do subtítulo continua o de hoje nesta etapa (a data por extenso nova vem na Task 11). Fundo da página sólido `bg-bg` (sem gradiente radial), `<main>` com `max-w-[1440px] gap-[28px]` e o padding do brief 3.2.

- [ ] **Step 1:** Implementar `SiteHeader` e usá-lo nas três páginas no lugar do `Nav` antigo. Só um `h1` por tela: o título do header é `<span>`/`<p>` (brief risco 18).
- [ ] **Step 2:** Rodar `npm test` e `npm run build`. Esperado: verde sem editar testes.
- [ ] **Step 3:** Commit: `feat: cabeçalho e molduras de página do v4`.

### Task 4: Card "Elenco" do administrador

**Files:**
- Modify: `src/web/components/PlayersPanel.tsx`, `src/web/components/SettingsToggle.tsx`, `src/web/pages/AdminPage.tsx`
- Test: `tests/web/PlayersPanel.test.tsx`, `tests/web/AdminPage.test.tsx` (sem edição)

**Interfaces:**
- Produces: aside-card "Elenco" (brief 3.3): título e contador, bloco do formulário em `bg-bg` (campo, estrelas 22px, rótulo da nota, botão), dica de meia estrela, lista com hover, checkbox na cor navy, nota 26px, remover 26px; `SettingsToggle` renderizado como linha no rodapé do card (`border-t`, `px-[18px] py-3`, texto 13px, brief 5.2). Todos os `aria-label`, `data-testid` e textos de hoje ficam.

- [ ] **Step 1:** Reescrever os dois componentes com Tailwind conforme o brief 3.3 e 5.2, sem mudar texto, rótulos nem lógica; mover o `SettingsToggle` para dentro do card (via prop de composição, por exemplo `footer`).
- [ ] **Step 2:** Rodar os testes dos dois arquivos, `npm test`, `npm run build`. Esperado: verde sem edição.
- [ ] **Step 3:** Commit: `feat: card Elenco do administrador no v4`.

### Task 5: Coluna "Times" — cards, reservas, "Mandar no grupo"

**Files:**
- Create: `src/web/lib/teamColors.ts`
- Modify: `src/web/components/TeamCards.tsx`, `ReservesBar.tsx`, `CopyBar.tsx`, `DrawArea.tsx`
- Test: `tests/web/DrawArea.test.tsx`, `DrawAreaEdit.test.tsx`, `CopyBar.test.tsx` (sem edição); novo `tests/web/teamColors.test.ts`

**Interfaces:**
- Produces: `teamColor(index: number): string` (a paleta `TEAM_COLORS` de 8 cores do v4, ciclo `index % 8`, brief 3.4) e `teamLetter(index: number): string` ('A'…); `TeamCards` com faixa de 4px na cor do time, selo da letra, índice por jogador (1, 2, 3…), pílula de nota no lugar das 5 estrelas (admin; no Membro com estrelas visíveis mantém `aria-label="{x} estrelas"`), cadeado com fundo `gold-tint` quando travado, vazio tracejado "Arraste jogadores para cá"; `ReservesBar` em linha tracejada `rounded-lg` com chips em pílula ("★ nota" quando há estrelas) mantendo um `h2` "Reservas · N" e o estado `showEmpty`; `CopyBar` como card navy "Mandar no grupo" (botão dourado, checkbox `accent-color` dourado, textarea de fallback); `DrawArea` na ordem do brief 6 (cabeçalho com h1 "Times", chip de formato, botões, dicas). O destaque ao arrastar continua `style.boxShadow` inline com os valores do brief (`0 0 0 2px var(--color-accent), 0 8px 24px rgba(36,54,90,0.18)` nos times).

- [ ] **Step 1: Teste que falha** (`tests/web/teamColors.test.ts`): `teamColor(0) === teamColor(8)`, 8 cores distintas em `0..7`, `teamLetter(0) === 'A'`, `teamLetter(7) === 'H'`, valores exatos da paleta do brief.
- [ ] **Step 2:** Rodar `npx vitest run tests/web/teamColors.test.ts`. Esperado: FAIL.
- [ ] **Step 3:** Implementar `teamColors.ts`; classes de cor dinâmicas via `style={{ background: teamColor(i) }}` ou variável CSS (nunca `bg-${cor}`; Review Focus 1).
- [ ] **Step 4:** Reescrever os quatro componentes conforme o brief 3.4; manter estrutura (`section`, `li`, `h2`), `aria-*` e textos.
- [ ] **Step 5:** Rodar `npm test` e `npm run build`. Esperado: verde sem editar os testes existentes.
- [ ] **Step 6:** Commit: `feat: cards de time, reservas e Mandar no grupo no v4`.

### Task 6: Modal "Formato do jogo"

**Files:**
- Modify: `src/web/components/DrawModal.tsx`
- Test: `tests/web/DrawModal.test.tsx` (sem edição)

**Interfaces:**
- Produces: modal 440px `rounded-lg` (brief 3.6): presets em grade de 3 colunas com estado selecionado, steppers agrupados em bloco `bg-bg` com botões de 34px, barra de vagas navy + dourada com o resumo abaixo. Mesmas props, textos de hoje, `role="dialog"`, foco, Esc e `data-testid`.

- [ ] **Step 1:** Reescrever com Tailwind; o resumo continua o mesmo texto de hoje (o vocabulário muda na Task 14).
- [ ] **Step 2:** Rodar `npm test` e `npm run build`. Esperado: verde sem edição.
- [ ] **Step 3:** Commit: `feat: modal Formato do jogo no v4`.

### Task 7: Card do jogo, login e visão do Membro

**Files:**
- Create: `src/web/components/GameCard.tsx`
- Modify: `src/web/components/GameBar.tsx` (passa a delegar ao `GameCard` ou é substituído; manter o arquivo e os testes funcionando), `src/web/pages/LoginPage.tsx`, `src/web/pages/MemberPage.tsx`
- Test: `tests/web/GameBar.test.tsx`, `AdminPage.test.tsx`, `MemberPage.test.tsx` (sem edição)

**Interfaces:**
- Produces: `GameCard` com os quatro estados do brief 3.1d (visualização, confirmação de exclusão, edição, vazio) usando a data como hoje (sem hora ainda); a confirmação de exclusão em card com o texto "Pagamentos e sorteio serão perdidos." **[decisão da spec]** — se o teste atual depende de `window.confirm`, manter `window.confirm` nesta etapa e trocar pelo card na Task 9; `LoginPage` conforme brief 3.1b (textos de hoje); `MemberPage`: aside do Membro (brief 3.5) e cards de time somente-leitura com o mesmo visual da Task 5.

- [ ] **Step 1:** Implementar os três conforme o brief 3.1b, 3.1d, 3.4 e 3.5, preservando textos, rótulos e semântica atuais.
- [ ] **Step 2:** Rodar `npm test` e `npm run build`. Esperado: verde sem edição.
- [ ] **Step 3:** Commit: `feat: card do jogo, login e Membro no v4`.

### Task 8: Remover o CSS antigo

**Files:**
- Delete: `src/web/theme.css`
- Modify: `src/web/main.tsx`, qualquer componente que ainda use classe antiga

**Interfaces:**
- Consumes: Tasks 1–7.

- [ ] **Step 1:** `grep -rn "className=\"\(nav\|seg\|page\|admin-\|player-\|team-\|modal\|chip\|reserves\|empty\|icon-btn\|move-select\|copy-fallback\|plain-list\|field\|switch\)" src/web` — cada uso restante é migrado para utilitários; só ficam em `styles.css` as regras que Tailwind não cobre (por exemplo `.star-hit:focus-visible`), cada uma com um comentário dizendo por quê.
- [ ] **Step 2:** Apagar `theme.css`, tirar o import, rodar `npm test` e `npm run build`. Esperado: verde sem editar testes; o CSS gerado não contém classes órfãs do tema antigo.
- [ ] **Step 3:** Commit: `refactor: remove o CSS antigo (tudo em Tailwind)`.

---

## Etapa B — comportamento e texto novos (cada item com teste)

### Task 9: Hora do jogo — backend

**Files:**
- Modify: `migrations/0001_init.sql`, `src/shared/types.ts`, `src/shared/dates.ts`, `src/server/games.ts`, `src/server/publicGame.ts`, `src/server/finalize.ts`, `src/server/app.ts`, `src/shared/whatsapp.ts`
- Test: `tests/shared/dates.test.ts`, `tests/server/games.test.ts`, `publicGame.test.ts`, `finalize.test.ts`, `app.test.ts`, `tests/shared/whatsapp.test.ts`

**Interfaces:**
- Produces: `isValidGameTime(time: string): boolean` em `src/shared/dates.ts` (`/^([01]\d|2[0-3]):[0-5]\d$/`); coluna `games.game_time TEXT NOT NULL DEFAULT '19:00'`; `Game = { id; date; time: string; paid; draw }`; `PublicGame` ganha `time: string`; `createGame(db: D1Database, date: string, now: Date, time?: string): Promise<Game>`; `updateGameDate(db, date, now, time?)` (mantém o nome, atualiza a hora quando informada); rotas `POST /admin/game` e `PATCH /admin/game` com corpo `{ date: string; time?: string }`, hora inválida → 400 "Hora inválida"; snapshot do histórico guarda `time`; `buildWhatsAppText` aceita `time?: string` e escreve a linha do dia no formato exato do `buildText` do v4 (ler `docs/prototype/Montar Times v4.dc.html`).

- [ ] **Step 1: Testes que falham:** `isValidGameTime('19:00')`, `'00:00'`, `'23:59'` verdadeiros; `'24:00'`, `'7:5'`, `''`, `'19:60'`, `'19:00:00'` falsos. `createGame` sem hora devolve `time: '19:00'`; com `'20:30'` guarda; hora inválida → `ValidationError`. `updateGameDate` com hora atualiza só a hora; sem hora mantém. `getPublicGame` devolve `time`. Snapshot do histórico tem `time`. Rota: POST com `time: '25:00'` → 400; resposta inclui `time`. WhatsApp: com `time: '19:00'` a linha do dia termina em ` às 19:00` conforme o v4; sem `time` fica como hoje.
- [ ] **Step 2:** Rodar os arquivos de teste. Esperado: FAIL.
- [ ] **Step 3:** Implementar migração, tipos, validação, repositório, rotas, snapshot e texto do WhatsApp (guardas de corpo na rota: `time` string quando presente).
- [ ] **Step 4:** Rodar `npm test` e `npm run build`. Esperado: tudo verde (testes antigos continuam passando com o padrão `19:00`).
- [ ] **Step 5:** Commit: `feat: hora do jogo no backend`.

### Task 10: Nota 0,5 e "marcar todos / limpar" — backend

**Files:**
- Modify: `src/server/players.ts`, `src/server/games.ts`, `src/server/app.ts`
- Test: `tests/server/players.test.ts`, `games.test.ts`, `app.test.ts`

**Interfaces:**
- Produces: validação de nota de 0,5 a 5 em passos de 0,5 (`0.5` aceito; `0`, `0.25`, `5.5` rejeitados); `setAllPaid(db: D1Database, paid: boolean): Promise<Game>` em `games.ts`: `true` marca todos os jogadores não arquivados como pagos com um único `INSERT OR IGNORE INTO game_paid (game_id, player_id) SELECT ?, id FROM players WHERE archived = 0`; `false` apaga todos os pagamentos do jogo e zera o sorteio gravado (`teams` com `teamCount` listas vazias, `reserves: []`, `locks: {}`); ambos no protocolo de `revision` (duas fases como `setPaid`, até 3 tentativas, falha → `ValidationError` sem aplicar mudança pela metade); rota `PUT /admin/game/paid-all` com `{ paid: boolean }` → `Game`, 400 para corpo inválido, 404 sem jogo ativo, 401 sem sessão (entra na lista de rotas do teste de autenticação).

- [ ] **Step 1: Testes que falham:** nota `0.5` aceita em `createPlayer`/`updatePlayer`; `0` e `0.25` rejeitadas. `setAllPaid(true)` com 3 jogadores e 1 arquivado marca 3; é idempotente; `setAllPaid(false)` com um sorteio gravado deixa `paid: []` e o sorteio com listas vazias; competidor injetado entre leitura e escrita (como nos testes de `setPaid`): nunca resta jogador sem pagamento no sorteio guardado; sem jogo → `NotFoundError`; rota: 401 sem cookie, 400 com `{ paid: 'x' }`, 200 com `{ paid: true }`.
- [ ] **Step 2:** Rodar os arquivos. Esperado: FAIL.
- [ ] **Step 3:** Implementar seguindo o padrão de duas fases de `setPaid` (ler `src/server/games.ts`).
- [ ] **Step 4:** Rodar `npm test` e `npm run build`. Esperado: verde.
- [ ] **Step 5:** Commit: `feat: nota de 0,5 e marcar todos no backend`.

### Task 11: Hora do jogo, chip relativo e cabeçalho — frontend

**Files:**
- Modify: `src/web/api.ts`, `src/web/format.ts`, `src/web/components/GameCard.tsx`, `GameBar.tsx`, `SiteHeader` usos em `AdminPage.tsx`/`MemberPage.tsx`
- Test: `tests/web/api.test.ts`, `tests/web/GameBar.test.tsx`, `AdminPage.test.tsx`, `MemberPage.test.tsx`; novo `tests/web/format.test.ts`

**Interfaces:**
- Consumes: `Game.time`, `PublicGame.time` (Task 9).
- Produces: `api.createGame(date: string, time: string)` e `api.updateGameDate(date: string, time: string)`; `formatDayLabel(date: string, time?: string): string` → `"Sábado, 17 de outubro · 19:00"` (sem hora: `"Sábado, 17 de outubro"`); `relativeDay(date: string, now: Date): 'Hoje' | 'Amanhã' | 'Em N dias' | 'Já aconteceu'` (por `todayInBrasilia`; hoje com hora já passada continua "Hoje" — a hora é informativa **[decisão da spec]**); `GameCard` com campos Dia e Hora (`type="time"`, padrão `19:00`), "às HH:MM", chip relativo, subtítulo do cabeçalho com `formatDayLabel`/"Sem jogo marcado", e o texto de exclusão em card ("Pagamentos e sorteio serão perdidos."), substituindo `window.confirm` se ainda estiver.

- [ ] **Step 1: Testes que falham:** `formatDayLabel('2026-10-17', '19:00')` é `'Sábado, 17 de outubro · 19:00'`; `formatDayLabel('2026-12-31')` é `'Quinta-feira, 31 de dezembro'`; `relativeDay` com `now` 17/10 12:00 em Brasília: mesmo dia `Hoje`, dia seguinte `Amanhã`, +3 `Em 3 dias`, ontem `Já aconteceu`; `api.createGame` envia `{"date":"2026-10-24","time":"20:30"}`; a tela de edição envia hora e data no PATCH; o cabeçalho do administrador mostra o subtítulo com hora; o Membro mostra a hora do jogo.
- [ ] **Step 2:** Rodar os arquivos. Esperado: FAIL.
- [ ] **Step 3:** Implementar; atualizar os testes que dependem do texto antigo da data no mesmo commit.
- [ ] **Step 4:** Rodar `npm test` e `npm run build`. Esperado: verde.
- [ ] **Step 5:** Commit: `feat: hora do jogo na interface`.

### Task 12: Nota 0,5 e "Marcar todos / Limpar" — frontend

**Files:**
- Modify: `src/web/api.ts`, `src/web/components/StarRating.tsx`, `src/web/components/PlayersPanel.tsx`
- Test: `tests/web/StarRating.test.tsx`, `tests/web/PlayersPanel.test.tsx`, `tests/web/drawStats.test.ts`

**Interfaces:**
- Consumes: `PUT /admin/game/paid-all` (Task 10).
- Produces: `api.setAllPaid(paid: boolean): Promise<Game>`; `StarRating`: lado esquerdo da 1ª estrela dá `0.5` (hoje `Math.max(1, …)`); botões "Marcar todos" e "Limpar" sob o rótulo "Quem vai jogar" (brief 3.3), desabilitados sem jogo ativo, com `aria-busy` durante a chamada, erro em `role="alert"`; "Limpar" pede confirmação quando já existe sorteio ("O sorteio será apagado.") **[decisão do plano]**.

- [ ] **Step 1: Testes que falham:** clicar na metade esquerda da 1ª estrela chama `onChange(0.5)`; `fmt(0.5)` mostra `0,5`; "Marcar todos" faz `PUT /api/admin/game/paid-all` com `{"paid":true}` e o contador sobe a partir do Game devolvido; "Limpar" com sorteio pede confirmação e não envia se cancelada; ambos desabilitados sem jogo; 401 volta ao login; duplo clique não envia duas requisições; `drawStats`/médias com nota `0.5` não dão `NaN`.
- [ ] **Step 2:** Rodar os arquivos. Esperado: FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** Rodar `npm test` e `npm run build`. Esperado: verde.
- [ ] **Step 5:** Commit: `feat: nota de 0,5 e marcar todos na interface`.

### Task 13: Equilíbrio, onboarding e Membro sem elenco

**Files:**
- Create: `src/web/components/BalanceCard.tsx`, `src/web/components/Onboarding.tsx`
- Modify: `src/web/lib/drawStats.ts`, `src/web/components/DrawArea.tsx`, `src/web/pages/MemberPage.tsx`
- Test: `tests/web/drawStats.test.ts`, `tests/web/DrawArea.test.tsx`, `tests/web/MemberPage.test.tsx`

**Interfaces:**
- Produces: `balanceTag(...)` devolve `tone: 'good' | 'ok' | 'bad'` (Equilibrado / Quase parelho / Desequilibrado); `barShare(total: number, average: number, sizesEqual: boolean): number` = `Math.max(0.1, sizesEqual ? total : average)` (normalizado como no v4, brief 3.4); `BalanceCard(props: { teams: …; ratingById; teamCount })` só quando há times **e** estrelas visíveis; `Onboarding` "Monte os times em três passos" (brief 3.4: passo 1 concluído com ≥ 2 jogadores marcados; botão "Montar times" desabilitado sem jogo ou com menos de 2 jogadores); `hasTeams` exige ao menos 1 jogador alocado (sorteio vazio = estado vazio); `MemberPage` mostra a tela "sem elenco" (brief 3.1c) quando `players.length === 0` com `<img src="/images/membro-elenco-vazio.webp" alt="Ilustração de uma jogadora de vôlei triste ao lado de uma bola, com a quadra vazia" width="720" height="540">` na caixa `max-w-[360px] aspect-[4/3] rounded-[16px] object-cover`, e a página normal com o card "Nenhum jogo marcado" quando há elenco e não há jogo.

- [ ] **Step 1: Testes que falham:** tons nos limites exatos (tol, 3·tol); `barShare` com iguais/diferentes/zero; o `BalanceCard` aparece com times e estrelas e some sem estrelas e sem times; Onboarding: passo 1 marcado com 2 marcados, botão desabilitado com 1; sorteio com todas as listas vazias mostra o estado vazio; Membro sem elenco mostra a imagem com `alt` e nenhum card de jogo; Membro com elenco e sem jogo mostra "Nenhum jogo marcado" sem a imagem.
- [ ] **Step 2:** Rodar os arquivos. Esperado: FAIL.
- [ ] **Step 3:** Implementar conforme o brief 3.1c, 3.4.
- [ ] **Step 4:** Rodar `npm test` e `npm run build`. Esperado: verde.
- [ ] **Step 5:** Commit: `feat: equilibrio, onboarding e Membro sem elenco`.

### Task 14: Vocabulário "jogadores" e "fora" no Membro

**Files:**
- Modify: `src/web/components/PlayersPanel.tsx`, `DrawModal.tsx`, `DrawArea.tsx`, `pages/MemberPage.tsx`, `src/shared/whatsapp.ts` se citar "pagos"
- Test: `tests/web/PlayersPanel.test.tsx`, `DrawModal.test.tsx`, `DrawArea.test.tsx`, `AdminPage.test.tsx`, `MemberPage.test.tsx`, `CopyBar.test.tsx`

**Interfaces:**
- Produces: os textos do v4 com "jogadores" no lugar de "convocados" (brief seção 4): "N de M jogadores", "Quem vai jogar", resumos do modal ("{slots} vagas · todos os {n} jogadores jogam."), nota de fora; mantidos os rótulos de acessibilidade com "Pagou: {nome}". No Membro: quem não pagou aparece com opacidade 0,5 e o rótulo "fora" (11px); "Pago/Aguardando" some.

- [ ] **Step 1:** Atualizar os testes para os novos textos e escrever os que faltam ("fora" para quem não pagou, nenhum "Pago"/"Aguardando" no Membro).
- [ ] **Step 2:** Rodar. Esperado: FAIL nos textos novos.
- [ ] **Step 3:** Trocar os textos conforme o brief seção 4.
- [ ] **Step 4:** Rodar `npm test` e `npm run build`. Esperado: verde.
- [ ] **Step 5:** Commit: `feat: vocabulario jogadores e fora no Membro`.

---

## Verificação visual

### Task 15: Fidelidade visual v4 × app

**Files:**
- Modify: o que a comparação apontar (componentes, `styles.css`)
- Create: `docs/prototype/fidelidade.md` (registro das comparações e correções)

**Interfaces:**
- Consumes: tudo acima; o protótipo (`render_preview` do projeto Claude Design `abefde06-7208-4b47-b1ff-80e120fbb66a`, arquivo `Montar Times v4.dc.html`) e o app local (`npm run dev:pages`, `.dev.vars` de teste, dados de exemplo).

- [ ] **Step 1:** Subir o app com dados de exemplo (14 jogadores, jogo cadastrado, sorteio feito) e abrir o v4 no navegador nos mesmos estados: login, painel vazio (onboarding), painel com times, modal, cartão do jogo nos quatro estados, Membro com times, Membro sem elenco.
- [ ] **Step 2:** Capturar cada estado do v4 e do app em 1440px e em 390px de largura; comparar lado a lado e anotar cada diferença visível (medida, cor, fonte, espaçamento, ícone, texto) em `docs/prototype/fidelidade.md`.
- [ ] **Step 3:** Corrigir todas as diferenças e repetir as capturas até não restar nenhuma visível; rodar `npm test` e `npm run build`.
- [ ] **Step 4:** Commit: `fix: ajustes de fidelidade visual ao v4`.

---

## Autorrevisão

**Cobertura da spec:** objetivos (telas idênticas: Tasks 3–8 e 13; Tailwind: 1 e 8; comportamentos novos: 9–14; testes verdes: em todas; fonte Inter: 1); decisões do organizador (hora: 9 e 11; vocabulário: 14; marcar todos: 10 e 12; nota 0,5: 10 e 12); decisões minhas (botões contornados: 1; texto de exclusão: 11; posição do switch: 4; fonte: 1; regra de data: 9 e 11); backend da seção 5 (9 e 10); verificação visual (15).

**Consistência de tipos:** `Game.time`/`PublicGame.time` nascem na Task 9 e são usados em 11; `api.setAllPaid` e `PUT /admin/game/paid-all` casam entre 10 e 12; `teamColor`/`teamLetter` nascem na 5 e são usados em 13; `balanceTag` muda de tom na 13 e o teste de `drawStats` é atualizado ali.

**Proporção:** a Etapa A não tem testes novos por ser visual; a conferência dela é a Task 15, e cada tarefa visual cita o trecho do brief com os valores.
