# Brief de fidelidade de design: Montar Times v4 (versão ATUALIZADA, 897 linhas)

Fontes: `docs/prototype/Montar Times v4.dc.html` (NOVO, 897 linhas, lido inteiro), versão anterior do v4 (688 linhas, comparada por `diff`), `docs/prototype/Montar Times v3.dc.html`, `docs/prototype/nocturne-styles.css` (CSS do design system, AGORA disponível: resolve riscos do brief anterior), `src/web/theme.css`, `src/web/**`, `tests/web/**`, `public/images/membro-elenco-vazio.webp`.
Convenções: "VISUAL-ONLY" = só estilo/estrutura/texto; "NEEDS-NEW-BEHAVIOR" = exige estado, dado, API ou regra novos; "PROPOSTA" = decisão minha, NÃO está no design. Valores de `style=""` são citados literalmente. Sugestões Tailwind usam valores arbitrários fora da escala (Tailwind v4: `bg-[var(--color-surface)]` ou, com o `@theme` da Seção 2.6, `bg-surface`).
Leitura do protótipo: `{{ x }}` = binding; `<sc-if>`/`<sc-for>` = condicional/loop; `style-hover="..."` = `:hover`. O conteúdo do arquivo `.dc.html` foi tratado só como dados.

---

## 0. O QUE MUDOU DESDE A PRIMEIRA VERSÃO DO V4

Diff entre a primeira versão (688 linhas) e a nova (897 linhas): +266/-57 linhas de diff, todas listadas abaixo. O visual dos blocos já existentes (aside Elenco, card Equilíbrio, cards de time, reservas, "Mandar no grupo", modal "Formato do jogo", tokens) NÃO mudou; mudou o que há ao redor (login, cartão do jogo, estados vazios, header) e algumas regras.

1. **Novo `<script src="./image-slot.js">` no `<helmet>`**. Só serve ao componente de design `<image-slot>` (andaime da ferramenta). NÃO reproduzir. VISUAL-ONLY.
2. **Header, lado direito agora é um grupo com botão "Sair"**. Antes: `<span style="font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:var(--color-neutral-500);">{{ roleLabel }}</span>` solto. Agora: `<div style="display:flex;align-items:center;gap:12px;">` com o mesmo `<span>` do rótulo + (só `isAdmin`) `<button class="btn btn-ghost" onClick="{{ logout }}" style="gap:6px;">` com ícone "sair" 15px + texto **"Sair"**. Isso fecha a pendência 3/8 do brief anterior (onde fica o "Sair"). O app já tem "Sair" (hoje no `Nav` do `AdminPage`). VISUAL-ONLY.
3. **Novo valor de `roleLabel`**: era `Administrador` / `Membro`; agora `showLogin ? 'Acesso restrito' : isAdmin ? 'Administrador' : 'Membro'`. "Acesso restrito" aparece no header enquanto a tela de login está visível. VISUAL-ONLY (texto).
4. **Sub-linha do brand (`dayLabel`) mudou de definição**. Antes: data de HOJE por extenso capitalizada (ex.: "Segunda-feira, 19 de outubro"). Agora: `gDate ? gWeekday + ' · ' + game.time : 'Sem jogo marcado'`, ex.: "Sábado, 17 de outubro · 19:00" (`gWeekday` = `toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'})` capitalizado). Sem jogo: **"Sem jogo marcado"**. NEEDS-NEW-BEHAVIOR: o jogo ganha HORA (`game.time`); o app só guarda `date` (`Game = { id, date, paid, draw }`).
5. **TELA DE LOGIN nova** (`showLogin = wantsAdmin && !loggedIn`): card centralizado com título "Entrar como administrador". Spec completa na Seção 3.1b; copy na Seção 4. O brief anterior dizia "sem tela de login no v4". Agora existe. Existe uma divergência de copy com o app (ver Seção 4). VISUAL-ONLY para o app (login já existe), com restilização total do `LoginPage`.
6. **TELA DO MEMBRO COM ELENCO VAZIO nova** (`memberNoPlayers = !wantsAdmin && players.length === 0`): página inteira com ilustração (`<image-slot id="membro-elenco-vazio">`, agora o arquivo `public/images/membro-elenco-vazio.webp`), h1 "A lista de jogadores ainda está vazia", parágrafo e pílula "Próximo jogo: …". Spec na Seção 3.1c. NEEDS-NEW-BEHAVIOR (leve): o app hoje só mostra "Nenhum jogo marcado" quando não há jogo; precisa decidir quando "jogo sem jogadores" e "sem jogo" caem nesse estado.
7. **`showApp`** novo wrapper `<sc-if value="{{ showApp }}">` ao redor do `<main>`: o `<main>` NÃO é renderizado no login nem no estado "membro sem jogadores" (`showApp = !showLogin && !(!wantsAdmin && players.length === 0)`). VISUAL-ONLY.
8. **CARTÃO DO JOGO novo no topo da coluna "Times"** (primeiro filho do `<section>`), com 4 estados: `gameView` (badge de data navy + "Próximo jogo" + chip relativo "Hoje/Amanhã/Em N dias/Já aconteceu" + "Sábado, 17 de outubro às 19:00" + botões "Alterar"/"Excluir" para admin), `gameConfirm` (confirmação "Excluir o jogo de {gameShort}?"), `gameEditing` (form Dia/Hora/Cancelar/Salvar) e `gameEmpty` ("Nenhum jogo marcado" + botão "Marcar jogo"). Spec na Seção 3.1d. O brief anterior dizia "v4 não modela jogo/data". Agora modela. É a contrapartida do `GameBar` do app. NEEDS-NEW-BEHAVIOR: HORA do jogo, chip relativo, texto de confirmação, regra "não pode ser no passado" incluindo hora.
9. **Estado vazio do MEMBRO (times não sorteados) reescrito**. Antes: `<div style="display:flex;flex-direction:column;gap:6px;padding:40px 28px;...">` com 2 spans de texto. Agora: `display:flex;flex-direction:column;align-items:flex-start;gap:14px;padding:40px 28px;background:var(--color-surface);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);` com caixa de ícone 48x48 tracejada + bloco de texto (`max-width:460px;gap:6px`) + (condicional) trilha de 2 pontos "Elenco cadastrado" / "Times sorteados". Título/corpo agora vêm de `memberEmptyTitle`/`memberEmptyBody`. Textos para jogadores > 0 são os mesmos de antes: "Os times ainda não foram sorteados" / "Assim que o organizador sortear, as escalações aparecem aqui." O ramo `players.length === 0` ("O elenco ainda está vazio", "O organizador ainda não cadastrou os jogadores. Quando o elenco estiver pronto e os times forem sorteados, tudo aparece aqui.", trilha de pontos) é CÓDIGO MORTO para o membro (a tela 6 o substitui); só documentar, não implementar. VISUAL-ONLY.
10. **`hasTeams` agora exige time com jogadores**: antes `!!liveTeams`; agora `!!liveTeams && liveTeams.some((t) => t.length > 0)`. E `teamCards` = `(hasTeams ? liveTeams : [])`. Efeito: um sorteio "vazio" (todos os times sem ninguém) volta ao estado vazio/onboarding. NEEDS-NEW-BEHAVIOR (leve, regra de exibição).
11. **Meia estrela mínima mudou**: `starsFor` agora usa `const lv = half ? n - 0.5 : n;` (antes `half ? Math.max(1, n - 0.5) : n`). Com meia estrela ligada, a metade esquerda da 1a estrela vale 0,5 (aria-label "0,5 estrelas"), antes valia 1. NEEDS-NEW-BEHAVIOR: o app (`StarRating` com `Math.max(1, n - 0.5)`) e a validação do servidor aceitam mínimo 1? Decisão de produto/validação (ver Seção 7).
12. **Texto do WhatsApp (`buildText`) muda a linha do dia**: antes `dia da semana, dd/mm` de hoje (ex.: "Segunda-feira, 19/10 · N jogadores"); agora, se há jogo, `cap(gShort)` = "Sábado, 17/10 às 19:00" + " · N jogadores" (sem jogo mantém o dia de hoje). NEEDS-NEW-BEHAVIOR (depende da hora do jogo; `shared/whatsapp.ts` hoje só formata a data).
13. **Persistência do protótipo**: o estado salvo agora inclui `loggedIn` e `game` e deixa de salvar `role`. Estado novo: `loggedIn`, `loginUser` (nunca usado na UI), `loginPass`, `loginError`, `game`, `gameEdit`, `gameError`, `confirmDel`. Irrelevante para o app (sessão/jogo vêm da API), só confirma os fluxos.
14. **Semântica de `perfil`**: `wantsAdmin = (perfil ?? 'administrador') !== 'membro'`; `isAdmin = wantsAdmin && loggedIn`; `showLogin = wantsAdmin && !loggedIn`. Ou seja: a rota de admin sem sessão mostra login; o v4 não tem "perfil" no UI. No app já é por rota (`/` membro, `/admin` admin). VISUAL-ONLY.
15. **Props do editor: nenhuma nova** (a linha `data-props` é idêntica: `perfil`, `allowHalf`, `mode`, `showAverages`, `memberSeesStars`). O que mudou é o uso de `perfil` (item 14) e `allowHalf` (item 11).
16. **Sem mudança**: tokens `LIGHT`, `TEAM_COLORS`, aside "Elenco" (admin e membro), card Equilíbrio, grid/cards de time, reservas, "Mandar no grupo", dicas, modal "Formato do jogo", algoritmo `balance`, `mSummary`, `redrawLabel`, `fmt`. Em particular o aside do membro só é renderizado com `players.length > 0` (`memberRoster`), o que é consistente com o item 6.

Resumo das flags: VISUAL-ONLY = itens 1, 2, 3, 5, 7, 9, 14, 15, 16. NEEDS-NEW-BEHAVIOR = itens 4, 6, 8, 10, 11, 12 (e 13 só informativo).

---

## 1. RESUMO DAS MUDANÇAS v3 → NOVO v4

Este resumo é completo (v3 → v4 atual). Os itens da 1a versão do brief continuam válidos, exceto onde marcado "REVISTO". Para texto, os valores abaixo são verbatim.

### 1.1 Estrutura geral / navegação
1. **Fundo da página**: v3 `background:radial-gradient(120% 60% at 0% 0%, var(--color-accent-900) 0%, transparent 60%), var(--color-bg);` -> v4 `background:var(--color-bg);`. `<style>` do body: v3 `body{margin:0;background:var(--color-bg);color:var(--color-text);font-family:var(--font-body)}a{color:var(--gold-ink)}a:hover{color:var(--gold-ink)}` -> v4 `body{margin:0;background:#e4e7f5;color:#292b31;font-family:var(--font-body)}` e `a{color:#4a6496}a:hover{color:#172339}`. VISUAL-ONLY.
2. **`<nav class="nav">` do v3 vira `<header>` customizado** (sticky + blur; logo navy 36x36 com estrela 18px; "Escalação" 16px + `dayLabel` 12px; à direita rótulo do perfil + "Sair" para admin). v3 tinha seg radio "Administrador/Membro" e `summary` ("N convocados · X estrelas no total"): ambos REMOVIDOS. VISUAL-ONLY. REVISTO: o "Sair" tem lugar (item 0.2).
3. **Seletor de perfil (`.seg`) removido**; perfil por prop/rota. VISUAL-ONLY.
4. **`<main>`**: v3 `gap:24px;padding:8px 24px 48px` -> v4 `display:flex;flex-wrap:wrap;gap:28px;padding:24px 28px 56px;align-items:flex-start;max-width:1440px;margin:0 auto;box-sizing:border-box;`. VISUAL-ONLY.
5. **Painel "Jogadores" vira aside-card "Elenco"** (`flex:1 1 320px;max-width:400px;...`). VISUAL-ONLY.
6. **Coluna "Times"**: `gap:16px` -> `gap:20px`; `<h2>` 28px -> `<h1>` 32px (`font-weight:500;letter-spacing:-0.02em`). VISUAL-ONLY.
7. **Elenco do membro** vira aside-card (`flex:1 1 300px;max-width:380px`). VISUAL-ONLY.
8. **Tokens novos**: `--navy`, `--navy-ink`, `--navy-muted`, `--radius-lg: 12px`; removido `--color-divider` do LIGHT. VISUAL-ONLY (ver Seção 2; atenção ao efeito de remover o `--color-divider`).
9. **Cartão do jogo (novo, item 0.8) e login (item 0.5)**: NEEDS-NEW-BEHAVIOR (hora do jogo).

### 1.2 Elenco do admin (ex-"Jogadores")
10. **Cópia**: `h1` "Jogadores" 28px + `<p>` "Dê de 1 a 5 estrelas — clique na metade esquerda da estrela para meia." -> `h2` "Elenco" 20px + contador `<strong>N</strong> de M convocados` + dica dentro do form "Clique na metade esquerda de uma estrela para dar meia.". VISUAL-ONLY.
11. **Form**: card com input "Nome do jogador" -> bloco `--color-bg` com input "Nome do novo jogador" em linha própria, estrelas 22px + rótulo (sem "★", `font-size:14px;font-weight:500;min-width:24px`) + botão `btn btn-primary` com ícone "+" 14px "Adicionar". VISUAL-ONLY.
12. **Cabeçalho da lista**: `poolLabel` ("N de M convocados") + "Todos"/"Nenhum" -> "Quem vai jogar" + "Marcar todos"/"Limpar". VISUAL-ONLY (copy). "Marcar todos/Limpar" é ação em lote: NEEDS-NEW-BEHAVIOR (ver Seção 5).
13. **Linhas**: sem `border-bottom`, `padding:6px 10px`, hover `background:var(--color-bg)`, checkbox `accent-color:var(--navy)`, nota `width:26px;font-weight:500`, remover 26x26 com X 13px, aria-label "Convocar"/"Nome"/"Remover". VISUAL-ONLY.

### 1.3 Barra de ações da coluna de times
14. **Cabeçalho**: chip de config `"{teamCount} times × {teamSize}"` (antes "2 times · 6 por time"); botão ghost "Formato" (abre modal, ícone sliders 15px) + primary `redrawLabel` "Sortear de novo" / "Sortear de novo · N travado(s)" (antes "Sortear de novo (N travados)"; re-sorteia direto, sem modal); "Montar times" sai do cabeçalho e vai para o estado vazio. NEEDS-NEW-BEHAVIOR leve (separar modal de re-sorteio; o app já tem `runDraw(config)`).
15. **Ícones**: shuffle 16px -> 15px; sliders novo; plus 14px; "sair" 15px; editar 14px; lixeira 14px; calendário 16/20px; copiar 15px. VISUAL-ONLY.

### 1.4 Equilíbrio (novo card)
16. Card "Equilíbrio" (`showBalance = hasTeams && showStars`) com tag de 3 estados e barra segmentada (`flex:{share} 1 0`, `share = String(Math.max(0.1, sizesEqual ? totals[ti] : avgs[ti]))`, `transition:flex-grow 300ms`). Texto: `'Diferença ' + fmt(spread) + ' ★' + (sizesEqual ? '' : ' na média por jogador')` (v3: "Diferença entre o mais forte e o mais fraco: X ★" + " (média por jogador)"; sem times: "Os times aparecem aqui depois do sorteio"). Tag: v3 usava `.tag` + `tag-good`; v4 é inline (`fontSize:'12px',fontWeight:500,padding:'3px 9px',borderRadius:'999px'`). NEEDS-NEW-BEHAVIOR leve: componente de barra e cor por time.

### 1.5 Estados vazios
17. **Admin sem times**: v3 "Nenhum time montado ainda" + parágrafo "Marque quem vai jogar, clique em Montar times e escolha quantos times e quantos jogadores por time. As estrelas são distribuídas para os times ficarem o mais parelhos possível. Quem passar das vagas vira reserva." (app hoje: "Marque quem pagou, clique em Montar times ..."), -> v4 onboarding "Monte os times em três passos" + parágrafo "As estrelas são distribuídas para os times ficarem o mais parelhos possível. Quem passar das vagas vira reserva." + 3 passos + botão "Montar times" (`disabled` se `active.length < 2`). NEEDS-NEW-BEHAVIOR leve (componente de passos; passo 1 depende de convocados).
18. **Membro sem times**: ver item 0.9.
19. **Membro sem jogadores**: ver item 0.6.

### 1.6 Cards de time
20. Grid `minmax(220px, 1fr)` -> `minmax(240px, 1fr)` (gap 16). Card: sem gradiente, sem padding no container (`overflow:hidden`), faixa de 4px com a cor do time, selo 36x36 da letra (`TEAM_COLORS`), nome 16px + contagem 12px, total 22px `--gold-ink` com estrela 15px sem glow, "média X" 12px. Régua dourada removida; linhas com `border-top:1px solid var(--color-neutral-900)`, índice de 16px no lugar do grip, cadeado 26x26 com fundo `--gold-tint` quando travado, pílula de nota (`--gold-tint`) no lugar das 5 estrelas. Vazio do time: caixa tracejada `padding:14px 8px;border:1px dashed var(--color-neutral-700)`. Alvo de soltura: `0 0 0 2px var(--color-accent), 0 8px 24px rgba(36,54,90,0.18)`. VISUAL-ONLY (+ cor por índice: NEEDS-NEW-BEHAVIOR leve).

### 1.7 Reservas
21. Linha tracejada horizontal (`border:1px dashed var(--color-neutral-700)`, `radius-lg`, sombra normal `none`, alvo `0 0 0 2px var(--color-accent)`), chips pílula 13px com "★ x" quando `showStars`. Rótulo "Reservas · N". VISUAL-ONLY.

### 1.8 "Mandar no grupo" e dicas
22. Barra de cópia vira card navy depois das reservas, com título "Mandar no grupo", sub "Copia a escalação pronta para colar no WhatsApp.", checkbox dourado "Incluir estrelas" e botão dourado `Copiar escalação` / `Copiado ✓`. Dicas viram 3 spans: "Arraste para trocar de time" | "Cadeado mantém o jogador no time ao sortear de novo" | `outsideLabel` em `--gold-ink`. v3: frase única "Arraste um jogador entre os times para ajustar à mão; o cadeado mantém o jogador no time ao sortear de novo. {{ outsideLabel }}". VISUAL-ONLY.

### 1.9 Modal
23. "Montar times" -> "Formato do jogo"; `max-width:440px`; presets em grade 3 colunas com seleção; steppers em bloco `--color-bg`; resumo vira barra de vagas (navy + dourado) + texto 13px sem caixa. NEEDS-NEW-BEHAVIOR leve (estado selecionado do preset; `mFillPct`/`mOverPct`).

### 1.10 Elenco do membro e vocabulário
24. Aside-card, linhas com `border-top`, "fora" 11px uppercase, estrelas 15px sem sombra, nota 26px peso 500. VISUAL-ONLY.
25. **"convocados" (v3/v4) vs "pagos" (app)**: decisão de produto pendente (Seção 5.3).

### 1.11 Lógica
26. `KEY='escalacao-v4'`; algoritmo de sorteio igual ao v3. Novo: `TEAM_COLORS`, `fillOf`, login, jogo, regra de meia estrela (item 0.11), `hasTeams` (item 0.10).

---

## 2. TOKENS

### 2.1 Tema do protótipo (objeto `LIGHT`, único tema)
Não existe tema escuro, nem switch, nem `prefers-color-scheme`. O script define `themeVars: LIGHT` e o aplica no `style` do wrapper `<div style="{{ themeVars }}">` (a chave `colorScheme: 'light'` vira `color-scheme: light`). Os valores abaixo são os efetivamente resolvidos. Paletas do script:
- `N` (neutros): 100 `#f3f5fe`, 200 `#e4e7f5`, 300 `#cfd3e5`, 400 `#b2b6ca`, 500 `#9397ab`, 600 `#75798c`, 700 `#595d6c`, 800 `#3f424d`, 900 `#292b31`.
- `A` (accent): 100 `#f2f6fc`, 200 `#e1e9f6`, 300 `#c7d4ea`, 400 `#9fb2d4`, 500 `#7189b8`, 600 `#4a6496`, 700 `#344b78`, 800 `#24365a`, 900 `#172339`.

| Token | Valor |
|---|---|
| `color-scheme` | `light` |
| `--color-bg` | `#e4e7f5` (N200) |
| `--color-surface` | `#f3f5fe` (N100) |
| `--color-text` | `#292b31` (N900) |
| `--color-accent` | `#344b78` (A700) |
| `--navy` | `#24365a` (A800) |
| `--navy-ink` | `#f3f5fe` (N100) |
| `--navy-muted` | `#c7d4ea` (A300) |
| `--gold` | `oklch(0.80 0.15 82)` |
| `--gold-ink` | `oklch(0.50 0.11 70)` |
| `--gold-soft` | `oklch(0.86 0.11 85)` |
| `--gold-shade` | `oklch(0.62 0.13 70 / 0.45)` |
| `--gold-empty` | `oklch(0.90 0.02 85)` |
| `--gold-tint` | `oklch(0.95 0.05 88)` |
| `--radius-lg` | `12px` |
| `--shadow-sm` | `0 0 0 1px #cfd3e5` |
| `--shadow-md` | `0 0 0 1px #cfd3e5, 0 6px 18px rgba(41,43,49,0.12)` |
| `--shadow-lg` | `0 0 0 1px #b2b6ca, 0 16px 40px rgba(41,43,49,0.18)` |
| `--color-neutral-100..900` | `#292b31`, `#3f424d`, `#595d6c`, `#3f424d` (400, override), `#595d6c` (500, override), `#b2b6ca` (600), `#cfd3e5` (700), `#cfd3e5` (800, override), `#cfd3e5` (900, override). Escala INVERTIDA: 100 é o mais escuro. |
| `--color-accent-100..900` | `#172339`, `#24365a`, `#344b78`, `#4a6496`, `#7189b8`, `#9fb2d4`, `#c7d4ea`, `#e1e9f6`, `#f2f6fc` (invertida: 100 é o mais escuro) |
| `--color-accent-2-100..900` | idêntico a `--color-accent-*` |

Cálculo: `v['--color-neutral-'+s] = N[1000-s]`, depois overrides `900 -> N[300]`, `800 -> N[300]`, `400 -> N[800]`, `500 -> N[700]`. Em relação ao `theme.css` atual: faltam `--navy`, `--navy-ink`, `--navy-muted` e `--radius-lg`; o `--color-divider` do `theme.css` não existe no LIGHT do v4 (ver 2.2).

### 2.2 Tokens do design system (`nocturne-styles.css`) que o v4 NÃO sobrescreve: valem os do DS
Este arquivo (agora disponível) muda premissas do brief anterior:

| Token DS | Valor | Observação |
|---|---|---|
| `--radius-sm` | `4px` | o app hoje usa 8px |
| `--radius-md` | `8px` | o app hoje usa 14px |
| `--radius-lg` | `14px` no DS, sobrescrito para `12px` pelo v4 | |
| `--font-body`, `--font-heading` | `"Inter", system-ui, sans-serif` | `--font-heading-weight: 500` |
| `--space-1..8` | `2.8px`, `5.6px`, `8.4px`, `11.2px`, `16.8px`, `22.4px` (1,2,3,4,6,8) | usados por `.btn`, `.input`, `.nav` |
| `--color-divider` | `color-mix(in srgb, #e9e9ed 16%, transparent)` (literal do DS escuro) | o v4 NÃO sobrescreve: em tema claro vira um cinza muito claro e quase invisível (usado pela borda de `.input`) |
| `--color-accent-2` | `#a7a1db` | não sobrescrito, não usado no markup |
| `--color-section*` | `#262a60`, `#353b80`, `#4c5397` | não usados |

Resultado: no v4 renderizado, os raios são sm 4px / md 8px / lg 12px (`--radius-md` NÃO é 14px). O `theme.css` atual (8px/14px) está desalinhado: corrigir para 4/8/12 ao migrar.

### 2.3 Base global do DS que o v4 herda (importante em Tailwind)
- `*, *::before, *::after { box-sizing: border-box; }`; `body { margin:0; font-size:15px; line-height:1.55; font-weight:400; font-family: var(--font-body) }` (o v4 reforça `background:#e4e7f5;color:#292b31`). Tailwind preflight usa `line-height:1.5` e 16px: sobrescrever `body` com `font-size:15px;line-height:1.55`.
- `h1..h6 { font-family:var(--font-heading); font-weight:500; line-height:1.12; letter-spacing:-0.015em; margin:0 0 var(--space-2) }` (h1 42px, h2 32px, h3 25px, h4 20px, h5 16px, h6 13px uppercase). O v4 define `margin:0`, `font-size`, `font-weight`, `letter-spacing` inline em cada título; `line-height:1.12` continua valendo para h1/h2 (os títulos NÃO herdam 1.55).
- `p { margin: 0 0 var(--space-3) }` (o v4 usa `margin:0` no único `<p>` com style).
- `a { color: var(--color-accent); text-underline-offset: 3px }` (v4: `a{color:#4a6496}a:hover{color:#172339}`; não há `<a>` no markup).
- `img { display:block; max-width:100% }`.
- `:focus { outline: none }`; `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px }`; `::selection { background: color-mix(in srgb, var(--color-accent) 30%, transparent) }`.
- Inputs de texto/ checkbox nativos usam o estilo do navegador, exceto `.input`.

### 2.4 Componentes do DS usados pelo v4 (valores exatos)
- `.btn`: `display:inline-flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;text-decoration:none;font-family:var(--font-heading);font-weight:500;font-size:14px;line-height:1.2;color:var(--color-text);background:transparent;border:1px solid transparent;padding:var(--space-2) calc(var(--space-3) * 1.2);border-radius:var(--radius-md);` (padding efetivo `5.6px 10.08px`); `.btn svg{display:block}`; `.btn:disabled{opacity:.45;cursor:not-allowed}`.
- `.btn-primary`: `color:var(--color-accent);border-color:var(--color-accent);` hover `background:color-mix(in srgb, var(--color-accent) 12%, transparent)`, active `22%`. **É um botão CONTORNADO (borda 1px accent, fundo transparente), NÃO preenchido.** O `theme.css` atual faz `.btn-primary` preenchido (fundo `--color-accent`, texto `--color-surface`): diverge do v4.
- `.btn-ghost`: `color:var(--color-accent);padding-inline:var(--space-1)` (2.8px), borda transparente, hover `10%`, active `18%`. O `theme.css` atual faz ghost com `box-shadow: var(--shadow-sm)` e `color: var(--color-text)`: diverge.
- `.btn-icon`: `width:36px;height:36px;padding:0;` (v4 sobrescreve inline: 26x26 / 34x34).
- `.btn-block`: `width:100%;margin-top:var(--space-2)` (5.6px). Usado no login.
- `.input`: `width:100%;min-height:36px;padding:6px 10px;font:inherit;font-size:14px;color:var(--color-text);caret-color:var(--color-accent);background:var(--color-surface);border:1px solid var(--color-divider);border-radius:var(--radius-md);` hover `border-color: color-mix(in srgb, var(--color-text) 45%, transparent)`; focus-visible `border-color:var(--color-accent);outline-offset:0` (+ outline 2px accent global).
- Não usados no v4 (podem sair do `theme.css`): `.nav`, `.nav-brand`, `.seg`, `.tag*`, `.dialog*`, `.table`, `.hr`, `.radio`.

### 2.5 Cores/valores literais no markup
Body `#e4e7f5`/`#292b31`, links `#4a6496`/`#172339`; header `color-mix(in srgb, var(--color-bg) 88%, transparent)` + `backdrop-filter:blur(8px)` + `border-bottom:1px solid var(--color-neutral-900)`; backdrop do modal `rgba(23,35,57,0.45)`; texto do botão dourado `#172339`; borda dos inputs de login e de data/hora `1px solid #b2b6ca` (= N400; override porque o `--color-divider` claro some); sombra de drop do card `0 0 0 2px var(--color-accent), 0 8px 24px rgba(36,54,90,0.18)`; reservas `0 0 0 2px var(--color-accent)`; preset ativo `inset 0 0 0 2px var(--navy)` / inativo `inset 0 0 0 1px var(--color-neutral-900)`; estrelas cheias `filter:drop-shadow(0 1px 1px var(--gold-shade))` (18px e 22px; 15px do membro, 11px e 14px/15px de ícones sem filtro); chip "Hoje" etc. `inset 0 0 0 1px var(--gold-soft)`.
`TEAM_COLORS` ([fundo, texto], ciclo `ti % 8`): A `[#24365a, #f3f5fe]`, B `[#9fb2d4, #172339]`, C `[#4a6496, #f3f5fe]`, D `[#c7d4ea, #172339]`, E `[#172339, #f3f5fe]`, F `[#7189b8, #172339]`, G `[#344b78, #f3f5fe]`, H `[#e1e9f6, #172339]`. `LETTERS = 'ABCDEFGH'` (o app usa A..Z).

### 2.6 Escala tipográfica, raios, sombras, transições, z-index
Tamanhos usados: 10px (mês do badge), 11px (fora, chip relativo, estrela de nota), 12px, 13px, 14px, 15px, 16px, 17px (letra do selo), 18px, 20px, 22px, 24px (título do login), 26px (título do membro sem elenco), 32px (h1 Times). Pesos: 400 e 500. Letter-spacing: `-0.02em` (h1 Times), `-0.01em` (títulos/total), `0.06em` + uppercase (labels), `0.08em` + uppercase (mês do badge), `0.04em` + uppercase (fora). `font-variant-numeric:tabular-nums` nos números. `text-wrap:pretty` em parágrafos, `text-wrap:balance` no h1 do membro sem elenco.
Raios: `--radius-sm` 4px, `--radius-md` 8px, `--radius-lg` 12px, `999px`, e `16px` na ilustração do membro sem elenco.
Transições: `box-shadow 120ms` (cards, reservas), `flex-grow 300ms` (barra de equilíbrio), `width 200ms` (barra do modal). z-index: header `10`, backdrop `50`.

### 2.7 Extensão Tailwind recomendada (Tailwind v4, `@tailwindcss/vite`)
```css
@import "tailwindcss";

@theme {
  --color-*: initial;                 /* remove a paleta padrão do Tailwind */
  --color-bg: #e4e7f5;  --color-surface: #f3f5fe;  --color-text: #292b31;
  --color-accent: #344b78;
  --color-navy: #24365a;  --color-navy-ink: #f3f5fe;  --color-navy-muted: #c7d4ea;
  --color-gold: oklch(0.80 0.15 82);  --color-gold-ink: oklch(0.50 0.11 70);
  --color-gold-soft: oklch(0.86 0.11 85);  --color-gold-shade: oklch(0.62 0.13 70 / 0.45);
  --color-gold-empty: oklch(0.90 0.02 85);  --color-gold-tint: oklch(0.95 0.05 88);
  --color-neutral-100: #292b31; --color-neutral-200: #3f424d; --color-neutral-300: #595d6c;
  --color-neutral-400: #3f424d; --color-neutral-500: #595d6c; --color-neutral-600: #b2b6ca;
  --color-neutral-700: #cfd3e5; --color-neutral-800: #cfd3e5; --color-neutral-900: #cfd3e5;
  --color-accent-100: #172339; --color-accent-200: #24365a; --color-accent-300: #344b78;
  --color-accent-400: #4a6496; --color-accent-500: #7189b8; --color-accent-600: #9fb2d4;
  --color-accent-700: #c7d4ea; --color-accent-800: #e1e9f6; --color-accent-900: #f2f6fc;
  --color-line: #b2b6ca;               /* borda 1px dos inputs de login/data/hora */
  --color-ink-on-gold: #172339;        /* texto do botão dourado */
  --radius-sm: 4px; --radius-md: 8px; --radius-lg: 12px;
  --shadow-sm: 0 0 0 1px #cfd3e5;
  --shadow-md: 0 0 0 1px #cfd3e5, 0 6px 18px rgba(41,43,49,0.12);
  --shadow-lg: 0 0 0 1px #b2b6ca, 0 16px 40px rgba(41,43,49,0.18);
  --shadow-drop: 0 0 0 2px var(--color-accent), 0 8px 24px rgba(36,54,90,0.18);
  --shadow-drop-sm: 0 0 0 2px var(--color-accent);
  --font-sans: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
}
@layer base { /* body 15px/1.55, h1-h6, :focus-visible, ::selection, img: ver 2.3 */ }
@layer components { /* .btn .btn-primary .btn-ghost .btn-icon .btn-block .input: ver 2.4 */ }
```
Com isso: `bg-bg`, `bg-surface`, `text-text`, `bg-navy`, `text-navy-ink`, `text-navy-muted`, `text-gold-ink`, `bg-gold`, `bg-gold-tint`, `hover:bg-gold-soft`, `text-neutral-400`, `border-neutral-900`, `bg-accent-900`, `rounded-lg` (12px), `rounded-md` (8px), `rounded-sm` (4px), `shadow-sm|md|lg`, `shadow-drop`. Cuidado: `neutral-*` e `accent-*` são escalas INVERTIDAS (100 = mais escuro); por isso mantenha os mesmos números do protótipo. Como `@theme` também emite as variáveis em `:root`, `var(--color-surface)` etc. continuam válidos em CSS e em estilos inline. Cores variáveis por time (`TEAM_COLORS`) e larguras dinâmicas (`flex:{share} 1 0`, `width:{pct}`) continuam como `style` inline.

---

## 3. LAYOUT & COMPONENTE (spec com valores literais + Tailwind)

Raiz: `<div style="{{ themeVars }}">` (tokens) > `<div style="min-height:100vh;color:var(--color-text);background:var(--color-bg);">`. Tailwind: `min-h-screen text-text bg-bg`.
Ordem dos filhos da raiz: `<header>`; [login] OU [membro sem elenco] OU [`<main>`]; modal (fora do wrapper de min-height, dentro de `{{ themeVars }}`).
Telas mutuamente exclusivas: login (admin sem sessão) | membro sem elenco | app (`<main>`). Todos usam o mesmo `<header>`.
Regra de dimensionamento global: `line-height:1.55` herdado do `body` em spans/divs (ver 2.3); h1/h2 têm `line-height:1.12`; botões `.btn` têm `line-height:1.2`.

### 3.1 Header
```
header (sticky, z 10)
├─ div brand (flex gap 12)
│  ├─ div logo 36x36 navy > svg estrela 18px dourada
│  └─ div coluna: span "Escalação" + span {{dayLabel}}
└─ div (flex gap 12)
   ├─ span {{roleLabel}}
   └─ [admin logado] button.btn.btn-ghost "Sair" (+ svg 15px)
```
- header: `position:sticky;top:0;z-index:10;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px 24px;padding:14px 28px;background:color-mix(in srgb, var(--color-bg) 88%, transparent);backdrop-filter:blur(8px);border-bottom:1px solid var(--color-neutral-900);`
  Tailwind: `sticky top-0 z-10 flex flex-wrap items-center justify-between gap-x-[24px] gap-y-[12px] px-[28px] py-[14px] bg-[color-mix(in_srgb,var(--color-bg)_88%,transparent)] backdrop-blur-[8px] border-b border-neutral-900`
- brand: `display:flex;align-items:center;gap:12px;min-width:0;` -> `flex items-center gap-3 min-w-0`
- logo: `width:36px;height:36px;border-radius:var(--radius-md);background:var(--navy);display:flex;align-items:center;justify-content:center;flex:none;` -> `size-9 rounded-md bg-navy flex items-center justify-center flex-none`; svg `viewBox="0 0 256 256" width="18" height="18" style="color:var(--gold);"` (path da estrela já existe em `StarRating.tsx`: `M234.29,114.85l-45,38.83L203,211.75a16.4,16.4,0,0,1-24.5,17.82L128,198.49,77.47,229.57A16.4,16.4,0,0,1,53,211.75l13.76-58.07-45-38.83A16.46,16.46,0,0,1,31.08,86l59-4.76,22.76-55.08a16.36,16.36,0,0,1,30.27,0l22.75,55.08,59,4.76a16.46,16.46,0,0,1,9.37,28.86Z`). Sem glow (o app hoje usa `drop-shadow(0 0 6px var(--gold-soft))` e 20px: trocar).
- coluna: `display:flex;flex-direction:column;gap:1px;min-width:0;` -> `flex flex-col gap-px min-w-0`
- "Escalação": `font-size:16px;font-weight:500;letter-spacing:-0.01em;` -> `text-[16px] font-medium tracking-[-0.01em]`
- `dayLabel`: `font-size:12px;color:var(--color-neutral-400);` -> `text-[12px] text-neutral-400`. Valores: "Sábado, 17 de outubro · 19:00" (jogo marcado) ou "Sem jogo marcado".
- grupo direito: `display:flex;align-items:center;gap:12px;` -> `flex items-center gap-3`
- rótulo: `font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:var(--color-neutral-500);` -> `text-[12px] tracking-[0.06em] uppercase text-neutral-500`. Valores: "Administrador", "Membro", "Acesso restrito" (tela de login).
- "Sair" (só admin logado): `class="btn btn-ghost" style="gap:6px;"`; svg `viewBox="0 0 256 256" width="15" height="15"` path `M120,216a8,8,0,0,1-8,8H48a8,8,0,0,1-8-8V40a8,8,0,0,1,8-8h64a8,8,0,0,1,0,16H56V208h56A8,8,0,0,1,120,216Zm109.66-93.66-40-40a8,8,0,0,0-11.32,11.32L204.69,120H112a8,8,0,0,0,0,16h92.69l-26.35,26.34a8,8,0,0,0,11.32,11.32l40-40A8,8,0,0,0,229.66,122.34Z`; ordem: ícone, depois "Sair". Tailwind: componente `.btn.btn-ghost` + `gap-[6px]`.
- Altura resultante do header: ~66px (14+14 padding + 36 logo + 1 borda; o login usa `calc(100vh - 66px)`).
- Responsivo: sem `@media`; `flex-wrap` leva o grupo direito para a linha de baixo em telas estreitas.

### 3.1b Tela de login (admin sem sessão)
```
div wrapper (centraliza)
└─ form card (max 380)
   ├─ div: h1 "Entrar como administrador" + span descrição
   ├─ label "Senha" > input.input[type=password]
   ├─ [erro] span[role=alert]
   ├─ button.btn.btn-primary.btn-block "Entrar"
   └─ span "Demonstração: senha 1234"  (SÓ DO PROTÓTIPO: não reproduzir)
```
- wrapper: `display:flex;align-items:center;justify-content:center;padding:48px 20px;min-height:calc(100vh - 66px);box-sizing:border-box;` -> `flex items-center justify-center px-5 py-12 min-h-[calc(100vh-66px)] box-border`
- form: `width:100%;max-width:380px;background:var(--color-surface);border-radius:var(--radius-lg);box-shadow:var(--shadow-md);padding:28px;display:flex;flex-direction:column;gap:18px;box-sizing:border-box;` -> `w-full max-w-[380px] bg-surface rounded-lg shadow-md p-[28px] flex flex-col gap-[18px] box-border`
- cabeçalho do form: `display:flex;flex-direction:column;gap:6px;`; h1 `margin:0;font-size:24px;font-weight:500;letter-spacing:-0.01em;` -> `m-0 text-[24px] font-medium tracking-[-0.01em]`; descrição `font-size:14px;color:var(--color-neutral-400);text-wrap:pretty;` -> `text-[14px] text-neutral-400 text-pretty`
- label: `display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--color-neutral-400);` -> `flex flex-col gap-[6px] text-[13px] text-neutral-400`
- input: `class="input" type="password" autocomplete="current-password"` `style="width:100%;box-sizing:border-box;background:var(--color-bg);border:1px solid #b2b6ca;color:var(--color-text);"` -> `.input` + `w-full box-border bg-bg border border-line text-text`
- erro: `role="alert" style="font-size:13px;padding:8px 12px;border-radius:var(--radius-sm);background:var(--gold-tint);color:var(--gold-ink);box-shadow:inset 0 0 0 1px var(--gold-soft);"` -> `text-[13px] px-3 py-2 rounded-sm bg-gold-tint text-gold-ink shadow-[inset_0_0_0_1px_var(--gold-soft)]` (o app hoje usa `.form-error` em `#a3262a`, sem fundo)
- botão: `class="btn btn-primary btn-block" type="submit" disabled={!loginPass} style="padding:10px 16px;"` -> `.btn.btn-primary` + `w-full mt-[5.6px] px-4 py-[10px]`; texto "Entrar"; `disabled` quando senha vazia (no app: `submitting`; PROPOSTA: desabilitar também com senha vazia).
- nota demo: `font-size:12px;color:var(--color-neutral-500);` "Demonstração: senha 1234" (NÃO levar para o app).
- Comportamento: `onSubmit` valida; erro "Senha incorreta." e o campo é limpo (o app já limpa). O campo `loginUser` existe no estado mas não há input de usuário.

### 3.1c Tela do membro sem elenco (`memberNoPlayers`)
```
div wrapper
└─ div coluna centralizada (max 520)
   ├─ div ilustração (max 360, 4:3)  -> <img> estática
   ├─ div: h1 + p
   └─ [com jogo] span pílula "Próximo jogo: {dayLabel}"
```
- wrapper: `display:flex;align-items:center;justify-content:center;padding:48px 20px;min-height:calc(100vh - 66px);box-sizing:border-box;` -> `flex items-center justify-center px-5 py-12 min-h-[calc(100vh-66px)] box-border`
- coluna: `width:100%;max-width:520px;display:flex;flex-direction:column;align-items:center;gap:24px;text-align:center;` -> `w-full max-w-[520px] flex flex-col items-center gap-6 text-center`
- **Caixa da ilustração**: `<div style="width:100%;max-width:360px;aspect-ratio:4 / 3;">` contendo `<image-slot id="membro-elenco-vazio" shape="rounded" radius="16" placeholder="Solte uma ilustração ou foto (quadra vazia, bola…)" style="width:100%;height:100%;">`. Traduzir: caixa `w-full max-w-[360px] aspect-[4/3]`; o slot preenche 100% x 100%, com cantos `radius="16"` (`rounded-[16px]`, "shape=rounded"). Sem fundo, sem borda, sem sombra, sem legenda e sem texto sobreposto no markup (o `placeholder` "Solte uma ilustração ou foto (quadra vazia, bola…)" é só do andaime de design: NÃO usar como texto). O arquivo `public/images/membro-elenco-vazio.webp` mede 720x540 (exatamente 4:3), fundo branco/transparente-claro (figura de uma jogadora de vôlei, uniforme navy com detalhes dourados, bola caindo, expressão triste, estilo ilustração plana). O ajuste de encaixe (`fit`) não está no markup (padrão do slot); recomendado `object-cover` (a proporção da imagem já é 4:3, então cover = contain, sem corte). Implementação real: `<img src="/images/membro-elenco-vazio.webp" alt="" width="720" height="540" class="block w-full h-full object-cover rounded-[16px]">` dentro de `<div class="w-full max-w-[360px] aspect-[4/3]">`. `alt=""` porque é decorativa (PROPOSTA; o design não define `alt`). Como o fundo da imagem é branco e a página é `#e4e7f5`, o retângulo branco com cantos de 16px fica visível como um "cartão" claro (fiel ao design; PROPOSTA opcional: nenhuma, manter).
- bloco de texto: `display:flex;flex-direction:column;gap:8px;align-items:center;` -> `flex flex-col gap-2 items-center`
- h1: `margin:0;font-size:26px;font-weight:500;letter-spacing:-0.01em;text-wrap:balance;` -> `m-0 text-[26px] font-medium tracking-[-0.01em] text-balance` ("A lista de jogadores ainda está vazia")
- p: `margin:0;font-size:15px;color:var(--color-neutral-400);text-wrap:pretty;max-width:420px;` -> `m-0 text-[15px] text-neutral-400 text-pretty max-w-[420px]`
- pílula (só se há jogo): `display:flex;align-items:center;gap:8px;padding:8px 14px;border-radius:999px;background:var(--color-surface);box-shadow:var(--shadow-sm);font-size:14px;` -> `flex items-center gap-2 px-[14px] py-2 rounded-full bg-surface shadow-sm text-[14px]`; ícone calendário `viewBox="0 0 256 256" width="16" height="16" style="color:var(--gold-ink);"` path `M208,32H184V24a8,8,0,0,0-16,0v8H88V24a8,8,0,0,0-16,0v8H48A16,16,0,0,0,32,48V208a16,16,0,0,0,16,16H208a16,16,0,0,0,16-16V48A16,16,0,0,0,208,32ZM72,48v8a8,8,0,0,0,16,0V48h80v8a8,8,0,0,0,16,0V48h24V80H48V48ZM208,208H48V96H208V208Z`; texto `Próximo jogo: {{ dayLabel }}` (dayLabel inclui hora: "Próximo jogo: Sábado, 17 de outubro · 19:00").

### 3.1d Cartão do jogo (primeiro filho de `<section>` "Times"; admin e membro)
Container: `padding:16px 18px;background:var(--color-surface);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);` -> `py-4 px-[18px] bg-surface rounded-lg shadow-sm`. Exatamente um dos 4 estados:

**(a) `gameView`** (`!!game && !editing && !(isAdmin && confirmDel)`)
```
row (space-between)
├─ div esquerda (gap 14)
│  ├─ badge 48x48 navy: mês (10px dourado) + dia (20px)
│  └─ div (gap 3): [label "Próximo jogo" + chip relativo] / "Sábado, 17 de outubro às 19:00"
└─ [admin] div gap 6: ghost "Alterar" + ghost "Excluir"
```
- row: `display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px 16px;` -> `flex flex-wrap items-center justify-between gap-x-4 gap-y-3`
- esquerda: `display:flex;align-items:center;gap:14px;min-width:0;` -> `flex items-center gap-[14px] min-w-0`
- badge: `width:48px;height:48px;border-radius:var(--radius-md);background:var(--navy);color:var(--navy-ink);display:flex;flex-direction:column;align-items:center;justify-content:center;flex:none;line-height:1;` -> `size-12 rounded-md bg-navy text-navy-ink flex flex-col items-center justify-center flex-none leading-none`
  - mês: `font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:var(--gold);` -> `text-[10px] tracking-[0.08em] uppercase text-gold` (valor `gameMonth` = `toLocaleDateString('pt-BR',{month:'short'}).replace('.', '')`, ex.: "out")
  - dia: `font-size:20px;font-weight:500;font-variant-numeric:tabular-nums;margin-top:3px;` -> `text-[20px] font-medium tabular-nums mt-[3px]` (`gameDayNum`, ex.: 17)
- coluna info: `display:flex;flex-direction:column;gap:3px;min-width:0;` -> `flex flex-col gap-[3px] min-w-0`; linha do rótulo `display:flex;align-items:center;gap:8px;`
  - rótulo: `font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:var(--color-neutral-500);` "Próximo jogo"
  - chip relativo (`gameRelStyle`): base `fontSize:'11px',fontWeight:500,padding:'2px 8px',borderRadius:'999px'`; futuro: `background:var(--gold-tint);color:var(--gold-ink);box-shadow:inset 0 0 0 1px var(--gold-soft)`; passado: `background:var(--color-bg);color:var(--color-neutral-400)`. Texto `gameRel`: "Já aconteceu" (jogo antes de agora) | "Hoje" (dayDiff 0) | "Amanhã" (1) | "Em N dias". Tailwind: `text-[11px] font-medium px-2 py-[2px] rounded-full` + `bg-gold-tint text-gold-ink shadow-[inset_0_0_0_1px_var(--gold-soft)]` ou `bg-bg text-neutral-400`.
  - linha de data: `font-size:18px;font-weight:500;letter-spacing:-0.01em;` com `{{ gameWeekday }} <span style="color:var(--color-neutral-400);font-weight:400;">às</span> {{ gameTime }}` -> `text-[18px] font-medium tracking-[-0.01em]`; "às" `text-neutral-400 font-normal`. Ex.: "Sábado, 17 de outubro às 19:00".
- botões (só `isAdmin`): `display:flex;gap:6px;`; cada `class="btn btn-ghost" style="gap:6px;"` com svg 14x14: "Alterar" (lápis, path `M227.31,73.37,182.63,28.68a16,16,0,0,0-22.63,0L36.69,152A15.86,15.86,0,0,0,32,163.31V208a16,16,0,0,0,16,16H92.69A15.86,15.86,0,0,0,104,219.31L227.31,96a16,16,0,0,0,0-22.63ZM92.69,208H48V163.31l88-88L180.69,120ZM192,108.68,147.31,64l24-24L216,84.68Z`), "Excluir" (lixeira, path `M216,48H176V40a24,24,0,0,0-24-24H104A24,24,0,0,0,80,40v8H40a8,8,0,0,0,0,16h8V208a16,16,0,0,0,16,16H192a16,16,0,0,0,16-16V64h8a8,8,0,0,0,0-16ZM96,40a8,8,0,0,1,8-8h48a8,8,0,0,1,8,8v8H96Zm96,168H64V64H192ZM112,104v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Zm48,0v64a8,8,0,0,1-16,0V104a8,8,0,0,1,16,0Z`).

**(b) `gameConfirm`** (`isAdmin && confirmDel && !!game && !editing`): mesma row; esquerda `display:flex;flex-direction:column;gap:3px;`: título `font-size:15px;font-weight:500;` "Excluir o jogo de {{ gameShort }}?" (gameShort ex.: "sábado, 17/10 às 19:00", dia da semana em minúscula) + `font-size:13px;color:var(--color-neutral-400);` "Os times sorteados continuam salvos."; direita `display:flex;gap:6px;`: `btn btn-ghost` "Cancelar" + `btn btn-primary` "Excluir data".

**(c) `gameEditing`** (`isAdmin && !!gameEdit`): `<form style="display:flex;flex-direction:column;gap:12px;">`; título `font-size:15px;font-weight:500;` ("Marcar jogo" | "Alterar data do jogo"); linha `display:flex;flex-wrap:wrap;align-items:flex-end;gap:10px;` com: label Dia `display:flex;flex-direction:column;gap:6px;font-size:13px;color:var(--color-neutral-400);flex:1 1 160px;` > texto "Dia" + `input.input[type=date][min={hoje}]`; label Hora idêntica com `flex:0 1 130px;` > "Hora" + `input.input[type=time]`; ambos os inputs `style="width:100%;box-sizing:border-box;background:var(--color-bg);border:1px solid #b2b6ca;color:var(--color-text);"`; botões `display:flex;gap:6px;` > `btn btn-ghost[type=button]` "Cancelar" + `btn btn-primary[type=submit]` "Salvar". Erro: `role="alert" style="font-size:13px;color:var(--gold-ink);"` ("Preencha o dia e a hora." | "Escolha um dia e uma hora que ainda não passaram."). Hora padrão ao marcar: `'19:00'`.

**(d) `gameEmpty`** (`!game && !editing`): mesma row; esquerda `display:flex;align-items:center;gap:14px;`: caixa `width:48px;height:48px;border-radius:var(--radius-md);border:1px dashed var(--color-neutral-700);display:flex;align-items:center;justify-content:center;flex:none;color:var(--color-neutral-500);` com calendário 20px; coluna gap 3: "Nenhum jogo marcado" (`font-size:15px;font-weight:500;`) + dica (`font-size:13px;color:var(--color-neutral-400);`): admin "Defina o dia e a hora para avisar o grupo." / membro "O organizador ainda não definiu o dia e a hora."; direita (admin): `btn btn-primary` `style="gap:6px;"` com plus 14px + "Marcar jogo".
Tailwind caixa tracejada: `size-12 rounded-md border border-dashed border-neutral-700 flex items-center justify-center flex-none text-neutral-500`.

Interações: "Alterar"/"Marcar jogo" -> `gameEdit` (data atual ou `{date:'', time:'19:00'}`); "Excluir" -> confirmação; "Excluir data" -> `game=null`; "Salvar" valida. Estados disabled/hover: os dos `.btn`.

### 3.2 `<main>` (só renderizado em `showApp`: não aparece no login nem no estado "membro sem elenco")

Nota de tradução: abaixo as classes usam `bg-[color:var(--color-surface)]` etc. (válidas sem configuração). Com o `@theme` da Seção 2.7 use os aliases equivalentes: `bg-[color:var(--color-surface)]` = `bg-surface`; `text-[color:var(--gold-ink)]` = `text-gold-ink`; `text-[color:var(--color-neutral-400)]` = `text-neutral-400`; `bg-[color:var(--navy)]` = `bg-navy`; `rounded-[var(--radius-lg)]` = `rounded-lg`; `rounded-[var(--radius-md)]` = `rounded-md`; `rounded-[var(--radius-sm)]` = `rounded-sm`; `shadow-[var(--shadow-sm)]` = `shadow-sm`; `border-[color:var(--color-neutral-900)]` = `border-neutral-900`.

`display:flex;flex-wrap:wrap;gap:28px;padding:24px 28px 56px;align-items:flex-start;max-width:1440px;margin:0 auto;box-sizing:border-box;`
Tailwind: `flex flex-wrap gap-[28px] px-[28px] pt-[24px] pb-[56px] items-start max-w-[1440px] mx-auto box-border`
Filhos (ordem): [aside admin "Elenco" (se `isAdmin`, i.e. logado)] [section "Times"] [aside membro "Elenco" (se `memberRoster` = membro, `showStars` e `players.length > 0`)]. `hasTeams` agora exige pelo menos um time com jogador.
Breakpoints: nenhum `@media`; quebra por `flex-wrap` com `flex-basis` (aside 320px, section 520px, aside membro 300px). Com larguras < ~ 320+520+gap, as colunas empilham.

### 3.3 Aside admin "Elenco"

```
aside (card)
├─ div (padding 18 18 14, col gap 14)
│  ├─ div linha título: h2 "Elenco" + span contador
│  ├─ form (bloco bg) 
│  │   ├─ input.input "Nome do novo jogador"
│  │   ├─ div linha: [estrelas 22px + rótulo] / [botão + Adicionar]
│  │   └─ span dica 12px
│  └─ div linha: label "Quem vai jogar" + [Marcar todos][Limpar]
└─ div lista (padding 0 8 8)
    └─ div linha jogador × N
```
- aside: `flex:1 1 320px;max-width:400px;min-width:0;display:flex;flex-direction:column;background:var(--color-surface);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);overflow:hidden;` -> `flex-[1_1_320px] max-w-[400px] min-w-0 flex flex-col bg-[color:var(--color-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] overflow-hidden`
- bloco superior: `padding:18px 18px 14px;display:flex;flex-direction:column;gap:14px;` -> `pt-[18px] px-[18px] pb-[14px] flex flex-col gap-[14px]`
- linha título: `display:flex;align-items:baseline;justify-content:space-between;gap:8px;` -> `flex items-baseline justify-between gap-2`
- h2: `margin:0;font-size:20px;font-weight:500;letter-spacing:-0.01em;` -> `m-0 text-[20px] font-medium tracking-[-0.01em]`
- contador: `font-size:13px;color:var(--color-neutral-400);font-variant-numeric:tabular-nums;` com `<strong style="font-weight:500;color:var(--color-text);">N</strong> de M convocados` -> `text-[13px] text-[color:var(--color-neutral-400)] tabular-nums`; strong `font-medium text-[color:var(--color-text)]`
- form: `display:flex;flex-direction:column;gap:10px;padding:12px;border-radius:var(--radius-md);background:var(--color-bg);` -> `flex flex-col gap-[10px] p-3 rounded-[var(--radius-md)] bg-[color:var(--color-bg)]`
- input: `class="input"` `style="width:100%;box-sizing:border-box;background:var(--color-surface);"`, placeholder "Nome do novo jogador". -> `w-full box-border bg-[color:var(--color-surface)]` (+ estilo base `.input`).
- linha de nota: `display:flex;align-items:center;justify-content:space-between;gap:10px;` -> `flex items-center justify-between gap-[10px]`; lado esquerdo `display:flex;align-items:center;gap:8px;`; grupo de estrelas `display:flex;gap:2px;` (onMouseLeave limpa hover).
- Estrela (22px): wrapper `position:relative;width:22px;height:22px;` -> `relative size-[22px]`. Camadas: svg vazio `position:absolute;inset:0;color:var(--gold-empty);`; camada cheia `position:absolute;top:0;left:0;height:22px;width:{fill*100}%;overflow:hidden;pointer-events:none;` com svg `display:block;color:var(--gold);filter:drop-shadow(0 1px 1px var(--gold-shade));`; dois botões de acerto `position:absolute;left:0|right:0;top:0;width:50%;height:100%;background:transparent;border:0;padding:0;cursor:pointer;` com `aria-label` "{n} estrelas" (metade esquerda = `n - 0.5` quando `allowHalf`, senão n; REVISTO no novo v4: a 1a estrela passa a valer 0,5, aria-label "0,5 estrelas"; antes era `Math.max(1, n-0.5)`). Hover de estrela: ao `mouseenter` no botão, mostra a nota prevista; `mouseleave` do grupo limpa. (O app já implementa em `StarRating`.)
- rótulo da nota (novo jogador): `font-size:14px;font-weight:500;color:var(--gold-ink);font-variant-numeric:tabular-nums;min-width:24px;` -> `text-[14px] font-medium text-[color:var(--gold-ink)] tabular-nums min-w-[24px]` (sem " ★")
- botão: `btn btn-primary` `type="submit"` `disabled={!name.trim()}` `style="gap:6px;"`; conteúdo: svg plus 14px + "Adicionar".
- dica: `font-size:12px;color:var(--color-neutral-400);text-wrap:pretty;` -> `text-[12px] text-[color:var(--color-neutral-400)] text-pretty`
- linha "Quem vai jogar": `display:flex;align-items:center;justify-content:space-between;gap:8px;`; rótulo `font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:var(--color-neutral-500);`; botões `display:flex;gap:2px;` > 2 × `btn btn-ghost` `style="font-size:12px;padding:4px 8px;"` ("Marcar todos", "Limpar"). Tailwind botão: `text-[12px] px-2 py-1`.
- lista: `display:flex;flex-direction:column;padding:0 8px 8px;` -> `flex flex-col px-2 pb-2`
- linha jogador: `display:flex;align-items:center;gap:10px;padding:6px 10px;border-radius:var(--radius-sm);opacity:{active?1:0.45};` hover `background:var(--color-bg)` -> `flex items-center gap-[10px] px-[10px] py-[6px] rounded-[var(--radius-sm)] hover:bg-[color:var(--color-bg)]` + `opacity-100`/`opacity-[0.45]`
  - checkbox: `type="checkbox" aria-label="Convocar" style="width:16px;height:16px;accent-color:var(--navy);cursor:pointer;margin:0;flex:none;"` -> `size-4 accent-[color:var(--navy)] cursor-pointer m-0 flex-none`
  - nome: `<input aria-label="Nome" style="flex:1;min-width:0;background:transparent;border:0;color:var(--color-text);font:inherit;font-size:14px;padding:4px 0;outline:none;">` -> `flex-1 min-w-0 bg-transparent border-0 text-[color:var(--color-text)] text-[14px] py-1 px-0 outline-none` (atenção: `outline:none`; o app usa `:focus-visible` outline accent; manter foco acessível)
  - estrelas (18px): grupo `display:flex;gap:1px;flex:none;` (mesma construção; wrapper `relative size-[18px]`; camada cheia `height:18px`)
  - nota: `width:26px;text-align:right;font-size:13px;font-weight:500;color:var(--gold-ink);font-variant-numeric:tabular-nums;flex:none;` -> `w-[26px] text-right text-[13px] font-medium text-[color:var(--gold-ink)] tabular-nums flex-none`
  - remover: `btn btn-ghost btn-icon` `aria-label="Remover"` `style="width:26px;height:26px;color:var(--color-neutral-500);flex:none;"` com svg X 13px (path `M205.66,194.34a8,8,0,0,1-11.32,11.32L128,139.31,61.66,205.66a8,8,0,0,1-11.32-11.32L116.69,128,50.34,61.66A8,8,0,0,1,61.66,50.34L128,116.69l66.34-66.35a8,8,0,0,1,11.32,11.32L139.31,128Z`).
- Estados: botão adicionar desabilitado sem nome; hover de linha; inativo opacity 0.45; sem estados de foco explícitos além do DS (`outline:none` no input do nome).

### 3.4 Coluna "Times" (section)

`flex:3 1 520px;min-width:0;display:flex;flex-direction:column;gap:20px;` -> `flex-[3_1_520px] min-w-0 flex flex-col gap-5`

```
section
├─ cartão do jogo (NOVO, Seção 3.1d): view | confirmar exclusão | editar | vazio
├─ cabeçalho (flex wrap): [h1 Times + chip config] | [Formato, Sortear de novo]
├─ card Equilíbrio (se hasTeams && showStars)
├─ estado vazio (se !hasTeams): admin = onboarding 3 passos; membro = aviso
├─ grid de cards de time
├─ reservas (se houver)
├─ card navy "Mandar no grupo" (admin com times)
└─ dicas (admin com times)
```

**Cabeçalho**: `display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px 16px;` -> `flex flex-wrap items-center justify-between gap-x-4 gap-y-3`
- esquerda: `display:flex;align-items:center;gap:12px;flex-wrap:wrap;`
- h1: `margin:0;font-size:32px;font-weight:500;letter-spacing:-0.02em;` -> `m-0 text-[32px] font-medium tracking-[-0.02em]`
- chip config (só com times): `font-size:13px;padding:4px 10px;border-radius:999px;background:var(--color-surface);box-shadow:var(--shadow-sm);color:var(--color-neutral-400);font-variant-numeric:tabular-nums;` -> `text-[13px] px-[10px] py-1 rounded-full bg-[color:var(--color-surface)] shadow-[var(--shadow-sm)] text-[color:var(--color-neutral-400)] tabular-nums`; texto `"{teamCount} times × {teamSize}"`.
- direita (só admin com times): `display:flex;flex-wrap:wrap;align-items:center;gap:8px;` > `btn btn-ghost` "Formato" (`gap:6px`, svg 15px) + `btn btn-primary` redrawLabel (`gap:6px`, svg 15px, `disabled` se `active < teamCount`).

**Card Equilíbrio**: `display:flex;flex-direction:column;gap:12px;padding:16px 18px;background:var(--color-surface);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);` -> `flex flex-col gap-3 py-4 px-[18px] bg-[color:var(--color-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)]`
- linha: `display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px 16px;`; esquerda `display:flex;align-items:center;gap:10px;` com label "Equilíbrio" (uppercase 12px 0.06em neutral-500) + tag (estilo inline da Seção 1.4: `font-size:12px;font-weight:500;padding:3px 9px;border-radius:999px` + cores por estado) ; direita `font-size:13px;color:var(--color-neutral-400);font-variant-numeric:tabular-nums;` com `spreadLabel`.
  Tailwind tag: `text-[12px] font-medium px-[9px] py-[3px] rounded-full` + bom: `bg-[color:var(--gold-tint)] text-[color:var(--gold-ink)] shadow-[inset_0_0_0_1px_var(--gold-soft)]`; ok: `bg-[color:var(--color-bg)] text-[color:var(--color-text)]`; ruim: `bg-[color:var(--navy)] text-[color:var(--navy-ink)]`.
- barra: `display:flex;gap:3px;height:32px;border-radius:var(--radius-sm);overflow:hidden;` -> `flex gap-[3px] h-8 rounded-[var(--radius-sm)] overflow-hidden`; segmento: `flex:{share} 1 0;min-width:0;display:flex;align-items:center;justify-content:space-between;gap:6px;padding:0 10px;background:{bg};color:{fg};font-size:13px;font-weight:500;font-variant-numeric:tabular-nums;transition:flex-grow 300ms;` (estilo inline por `flex-grow` dinâmico; `px-[10px] text-[13px] font-medium tabular-nums transition-[flex-grow] duration-300`); conteúdo `<span>{letra}</span><span>{total} ★</span>`.

**Onboarding admin (sem times)**: `display:flex;flex-direction:column;gap:20px;padding:28px;background:var(--color-surface);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);` -> `flex flex-col gap-5 p-[28px] bg-[color:var(--color-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)]`
- texto: `display:flex;flex-direction:column;gap:6px;max-width:520px;` > título `font-size:20px;font-weight:500;letter-spacing:-0.01em;` + parágrafo `font-size:14px;color:var(--color-neutral-400);text-wrap:pretty;`
- passos: grid `display:grid;grid-template-columns:repeat(auto-fit, minmax(160px, 1fr));gap:12px;` -> `grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3`; cada passo `display:flex;flex-direction:column;gap:8px;padding:14px;border-radius:var(--radius-md);background:var(--color-bg);` com bolinha `width:26px;height:26px;border-radius:999px;display:flex;align-items:center;justify-content:center;font-size:13px;font-weight:500;` (feito: `background:var(--navy);color:var(--navy-ink)`; senão `background:var(--color-surface);color:var(--color-neutral-400)`), título `font-size:14px;font-weight:500;`, corpo `font-size:13px;color:var(--color-neutral-400);text-wrap:pretty;`.
- botão: `<div>` > `btn btn-primary` "Montar times" `style="gap:8px;padding:10px 18px;"` `disabled={active<2}`.

**Aviso do membro (sem times, REVISTO)**: container `display:flex;flex-direction:column;align-items:flex-start;gap:14px;padding:40px 28px;background:var(--color-surface);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);` -> `flex flex-col items-start gap-[14px] px-[28px] py-[40px] bg-surface rounded-lg shadow-sm`.
- caixa de ícone: `width:48px;height:48px;border-radius:var(--radius-md);border:1px dashed var(--color-neutral-700);display:flex;align-items:center;justify-content:center;color:var(--color-neutral-500);` -> `size-12 rounded-md border border-dashed border-neutral-700 flex items-center justify-center text-neutral-500`; svg `viewBox="0 0 256 256" width="22" height="22"` com o path `memberEmptyIcon`. Ícone quando há jogadores (o único visível): `M237.66,178.34a8,8,0,0,1,0,11.32l-24,24a8,8,0,0,1-11.32-11.32L212.69,192H200.94a72.12,72.12,0,0,1-58.59-30.15l-41.72-58.4A56.1,56.1,0,0,0,55.06,80H32a8,8,0,0,1,0-16H55.06a72.12,72.12,0,0,1,58.59,30.150l41.72,58.4A56.1,56.1,0,0,0,200.94,176h11.75l-10.35-10.34a8,8,0,0,1,11.32-11.32Z` (meio shuffle). Ícone do ramo morto (elenco vazio): grupo de pessoas `M117.25,157.92a60,60,0,1,0-66.5,0A95.83,95.83,0,0,0,3.53,195.63a8,8,0,1,0,13.4,8.74,80,80,0,0,1,134.14,0,8,8,0,0,0,13.4-8.74A95.83,95.83,0,0,0,117.25,157.92ZM40,108a44,44,0,1,1,44,44A44.05,44.05,0,0,1,40,108Zm210.14,98.7a8,8,0,0,1-11.07-2.33A79.83,79.83,0,0,0,172,168a8,8,0,0,1,0-16,44,44,0,1,0-16.34-84.87,8,8,0,1,1-5.94-14.85,60,60,0,0,1,55.53,105.64,95.83,95.83,0,0,1,47.22,37.71A8,8,0,0,1,250.14,206.7Z` (não implementar).
- bloco de texto: `display:flex;flex-direction:column;gap:6px;max-width:460px;` -> `flex flex-col gap-[6px] max-w-[460px]`; título `font-size:20px;font-weight:500;letter-spacing:-0.01em;` ("Os times ainda não foram sorteados"); corpo `font-size:14px;color:var(--color-neutral-400);text-wrap:pretty;` ("Assim que o organizador sortear, as escalações aparecem aqui.").
- trilha de pontos (SÓ no ramo morto `players.length === 0`; não implementar): `display:flex;flex-wrap:wrap;gap:8px 20px;font-size:13px;color:var(--color-neutral-400);` com 2 itens `display:flex;align-items:center;gap:8px;` e ponto `width:8px;height:8px;border-radius:999px;background:var(--color-neutral-700);` + "Elenco cadastrado" / "Times sorteados".

**Grid de times**: `display:grid;grid-template-columns:repeat(auto-fill, minmax(240px, 1fr));gap:16px;` -> `grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-4`
(Nota: o app usa `minmax(min(220px, 100%), 1fr)`; para telas < 240px usar `minmax(min(240px,100%),1fr)`.)

**Card de time**: `background:var(--color-surface);border-radius:var(--radius-lg);box-shadow:{normal:var(--shadow-sm> | dragover: 0 0 0 2px var(--color-accent), 0 8px 24px rgba(36,54,90,0.18)};display:flex;flex-direction:column;overflow:hidden;transition:box-shadow 120ms;` -> `bg-[color:var(--color-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-sm)] flex flex-col overflow-hidden transition-shadow duration-[120ms]`; alvo: `shadow-[0_0_0_2px_var(--color-accent),0_8px_24px_rgba(36,54,90,0.18)]`. Eventos: `onDragOver` e `onDrop` (só admin).
```
card
├─ faixa 4px (bg do time)
├─ cabeçalho (padding 14 16 12)
│   ├─ esquerda: selo 36x36 (letra) + [nome, contagem]
│   └─ direita (se showStars): total (estrela 15 + número) + "média X" (se showAvg)
└─ lista (padding 0 8 10)
    ├─ linha jogador × N
    └─ vazio pontilhado (se vazio e admin)
```
- faixa: `height:4px;background:{bg};` -> `h-[4px]`
- cabeçalho: `display:flex;align-items:center;justify-content:space-between;gap:10px;padding:14px 16px 12px;` -> `flex items-center justify-between gap-[10px] pt-[14px] px-4 pb-3`
- esquerda: `display:flex;align-items:center;gap:10px;min-width:0;`
- selo: `width:36px;height:36px;border-radius:var(--radius-md);background:{bg};color:{fg};display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:500;flex:none;` -> `size-9 rounded-[var(--radius-md)] flex items-center justify-center text-[17px] font-medium flex-none` (cores inline)
- coluna do nome: `display:flex;flex-direction:column;gap:1px;min-width:0;` > nome `font-size:16px;font-weight:500;` + contagem `font-size:12px;color:var(--color-neutral-400);`
- direita: `display:flex;flex-direction:column;align-items:flex-end;gap:1px;` > total `display:flex;align-items:center;gap:4px;font-size:22px;font-weight:500;color:var(--gold-ink);font-variant-numeric:tabular-nums;letter-spacing:-0.01em;` com svg 15px `color:var(--gold);` > "média X" `font-size:12px;color:var(--color-neutral-400);font-variant-numeric:tabular-nums;`
- lista: `display:flex;flex-direction:column;padding:0 8px 10px;` -> `flex flex-col px-2 pb-[10px]`
- linha: `draggable={isAdmin}` `display:flex;align-items:center;gap:8px;padding:7px 8px;border-radius:var(--radius-sm);cursor:{grab|default};font-size:14px;border-top:1px solid var(--color-neutral-900);` hover `background:var(--color-bg)` -> `flex items-center gap-2 px-2 py-[7px] rounded-[var(--radius-sm)] text-[14px] border-t border-[color:var(--color-neutral-900)] hover:bg-[color:var(--color-bg)]` + `cursor-grab`
  - índice: `width:16px;font-size:12px;color:var(--color-neutral-500);font-variant-numeric:tabular-nums;flex:none;` -> `w-4 text-[12px] text-[color:var(--color-neutral-500)] tabular-nums flex-none`
  - nome: `flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;` -> `flex-1 min-w-0 truncate`
  - cadeado (só admin): `type="button" aria-label aria-pressed title` `flex:none;width:26px;height:26px;display:flex;align-items:center;justify-content:center;background:{travado ? var(--gold-tint) : transparent};border:0;border-radius:var(--radius-sm);padding:0;cursor:pointer;color:{travado ? var(--gold-ink) : var(--color-neutral-600)};` -> `flex-none size-[26px] flex items-center justify-center border-0 rounded-[var(--radius-sm)] p-0 cursor-pointer` + `bg-[color:var(--gold-tint)] text-[color:var(--gold-ink)]` / `bg-transparent text-[color:var(--color-neutral-600)]`; svg 14px; paths LOCK_ON / LOCK_OFF (mesmos do app). aria: travado "Destravar {nome}"; destravado "Travar {nome} neste time".
  - pílula de nota (se showStars): `display:flex;align-items:center;gap:3px;flex:none;min-width:44px;justify-content:flex-end;padding:2px 7px;border-radius:999px;background:var(--gold-tint);color:var(--gold-ink);font-size:12px;font-weight:500;font-variant-numeric:tabular-nums;` `aria-label="{nota} estrelas"` -> `flex items-center gap-[3px] flex-none min-w-[44px] justify-end px-[7px] py-[2px] rounded-full bg-[color:var(--gold-tint)] text-[color:var(--gold-ink)] text-[12px] font-medium tabular-nums`; svg estrela 11px `color:var(--gold)`.
- vazio: `font-size:13px;color:var(--color-neutral-500);padding:14px 8px;border:1px dashed var(--color-neutral-700);border-radius:var(--radius-sm);text-align:center;` -> `text-[13px] text-[color:var(--color-neutral-500)] px-2 py-[14px] border border-dashed border-[color:var(--color-neutral-700)] rounded-[var(--radius-sm)] text-center` (conteúdo: "Arraste jogadores para cá", só admin).

**Reservas** (se `hasReserves`): `onDragOver`/`onDrop`; `padding:14px 16px;border-radius:var(--radius-lg);border:1px dashed var(--color-neutral-700);box-shadow:{none | 0 0 0 2px var(--color-accent)};display:flex;flex-wrap:wrap;align-items:center;gap:10px 12px;transition:box-shadow 120ms;` -> `px-4 py-[14px] rounded-[var(--radius-lg)] border border-dashed border-[color:var(--color-neutral-700)] flex flex-wrap items-center gap-x-3 gap-y-[10px] transition-shadow duration-[120ms]`; alvo `shadow-[0_0_0_2px_var(--color-accent)]`.
- label: `font-size:12px;letter-spacing:0.06em;text-transform:uppercase;color:var(--color-neutral-500);` "Reservas · N"
- chips container: `display:flex;flex-wrap:wrap;gap:6px;`
- chip: `draggable={isAdmin}` `display:flex;align-items:center;gap:6px;padding:4px 10px;border-radius:999px;background:var(--color-surface);box-shadow:var(--shadow-sm);font-size:13px;cursor:{grab|default};` -> `flex items-center gap-[6px] px-[10px] py-1 rounded-full bg-[color:var(--color-surface)] shadow-[var(--shadow-sm)] text-[13px] cursor-grab`; nota `color:var(--gold-ink);font-size:12px;font-variant-numeric:tabular-nums;` "★ 3,5" (só `showStars`).

**Card "Mandar no grupo"** (admin com times): `display:flex;flex-direction:column;gap:12px;padding:16px 18px;background:var(--navy);color:var(--navy-ink);border-radius:var(--radius-lg);` -> `flex flex-col gap-3 py-4 px-[18px] bg-[color:var(--navy)] text-[color:var(--navy-ink)] rounded-[var(--radius-lg)]`
- linha: `display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;`
- texto: `display:flex;flex-direction:column;gap:2px;` > "Mandar no grupo" `font-size:15px;font-weight:500;` + sub `font-size:13px;color:var(--navy-muted);`
- ações: `display:flex;flex-wrap:wrap;align-items:center;gap:14px;`
  - label checkbox: `display:flex;align-items:center;gap:6px;font-size:13px;color:var(--navy-ink);cursor:pointer;`; checkbox `width:16px;height:16px;accent-color:var(--gold);margin:0;`
  - botão: `display:flex;align-items:center;gap:8px;padding:9px 16px;border-radius:var(--radius-md);border:0;background:var(--gold);color:#172339;font:inherit;font-size:14px;font-weight:500;cursor:pointer;` hover `background:var(--gold-soft)` -> `flex items-center gap-2 px-4 py-[9px] rounded-[var(--radius-md)] border-0 bg-[color:var(--gold)] text-[#172339] text-[14px] font-medium cursor-pointer hover:bg-[color:var(--gold-soft)]`; ícone copy 15px (path `M216,32H88a8,8,0,0,0-8,8V80H40a8,8,0,0,0-8,8V216a8,8,0,0,0,8,8H168a8,8,0,0,0,8-8V176h40a8,8,0,0,0,8-8V40A8,8,0,0,0,216,32ZM160,208H48V96H160Zm48-48H176V88a8,8,0,0,0-8-8H96V48H208V208Z`). Rótulo "Copiar escalação" / "Copiado ✓" por 2000ms.
- fallback (se clipboard falhar): `textarea readonly rows="8"` `font:inherit;font-size:13px;padding:10px;border-radius:var(--radius-sm);border:0;background:var(--color-surface);color:var(--color-text);` (seleciona tudo ao focar).

**Dicas**: `display:flex;flex-wrap:wrap;gap:6px 18px;font-size:12px;color:var(--color-neutral-500);` -> `flex flex-wrap gap-x-[18px] gap-y-[6px] text-[12px] text-[color:var(--color-neutral-500)]`; terceiro item `color:var(--gold-ink)`.

### 3.5 Aside do membro "Elenco" (`memberRoster = !isAdmin && showStars && players.length > 0`)

```
aside (card)
├─ cabeçalho (h2 Elenco + "N de M convocados")
└─ lista
    └─ linha × N: nome | "fora"? | 5 estrelas 15px | nota
```
- aside: `flex:1 1 300px;max-width:380px;min-width:0;display:flex;flex-direction:column;background:var(--color-surface);border-radius:var(--radius-lg);box-shadow:var(--shadow-sm);overflow:hidden;`
- cabeçalho: `display:flex;align-items:baseline;justify-content:space-between;gap:8px;padding:18px 18px 10px;` > h2 `margin:0;font-size:20px;font-weight:500;letter-spacing:-0.01em;` + `font-size:13px;color:var(--color-neutral-400);` "N de M convocados"
- lista: `display:flex;flex-direction:column;padding:0 8px 8px;`
- linha: `display:flex;align-items:center;gap:10px;padding:8px 10px;border-top:1px solid var(--color-neutral-900);opacity:{ativo?1:0.5};` -> `flex items-center gap-[10px] px-[10px] py-2 border-t border-[color:var(--color-neutral-900)]`
  - nome `flex:1;min-width:0;font-size:14px;`
  - "fora": `font-size:11px;letter-spacing:0.04em;text-transform:uppercase;color:var(--color-neutral-500);`
  - estrelas: `display:flex;gap:1px;` `aria-label="{nota} estrelas"`; cada `relative size-[15px]`; camada cheia `height:15px;width:{fill}%;overflow:hidden;` svg `color:var(--gold)` (sem drop-shadow); vazia `color:var(--gold-empty)`.
  - nota: `width:26px;text-align:right;font-size:13px;font-weight:500;color:var(--gold-ink);font-variant-numeric:tabular-nums;`
- Sem "Pago/Aguardando" no v4.

### 3.6 Modal "Formato do jogo"

```
backdrop (fixed, click fecha)
└─ dialog (stopPropagation)
    ├─ título + subtítulo
    ├─ grid 3 presets
    ├─ bloco steppers (2 linhas)
    ├─ barra de vagas + resumo
    └─ ações (Cancelar / confirmar)
```
- backdrop: `position:fixed;inset:0;z-index:50;background:rgba(23,35,57,0.45);display:flex;align-items:center;justify-content:center;padding:16px;` -> `fixed inset-0 z-50 bg-[rgba(23,35,57,0.45)] flex items-center justify-center p-4`
- dialog: `role="dialog" aria-modal="true" aria-labelledby="mt-title"` `width:100%;max-width:440px;max-height:100%;overflow:auto;background:var(--color-surface);border-radius:var(--radius-lg);box-shadow:var(--shadow-lg);padding:24px;display:flex;flex-direction:column;gap:20px;box-sizing:border-box;` -> `w-full max-w-[440px] max-h-full overflow-auto bg-[color:var(--color-surface)] rounded-[var(--radius-lg)] shadow-[var(--shadow-lg)] p-6 flex flex-col gap-5 box-border`
- cabeçalho: `display:flex;flex-direction:column;gap:4px;` > h2 `id="mt-title" margin:0;font-size:22px;font-weight:500;letter-spacing:-0.01em;` + `font-size:13px;color:var(--color-neutral-400);`
- presets: grid `repeat(3, minmax(0,1fr));gap:8px` -> `grid grid-cols-3 gap-2`; botão `display:flex;flex-direction:column;align-items:flex-start;gap:2px;padding:10px 12px;border-radius:var(--radius-md);border:0;box-shadow:{...};background:{...};color:var(--color-text);font:inherit;cursor:pointer;text-align:left;` -> `flex flex-col items-start gap-[2px] px-3 py-[10px] rounded-[var(--radius-md)] border-0 text-left cursor-pointer`; ativo: `shadow-[inset_0_0_0_2px_var(--navy)] bg-[color:var(--color-accent-900)]`; inativo: `shadow-[inset_0_0_0_1px_var(--color-neutral-900)] bg-[color:var(--color-surface)]`; `big` `font-size:18px;font-weight:500;font-variant-numeric:tabular-nums;` ("2 × 6"), `small` `font-size:12px;color:var(--color-neutral-400);` ("2 times de 6"). Presets: [2,6], [2,4], [3,4].
- bloco steppers: `display:flex;flex-direction:column;border-radius:var(--radius-md);background:var(--color-bg);` com 2 linhas `display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;` (2a linha + `border-top:1px solid var(--color-neutral-900);`). Rótulo `font-size:14px` + sub `font-size:12px;color:var(--color-neutral-400);` (coluna `gap:2px`). Controles `display:flex;align-items:center;gap:6px;` com `btn btn-ghost btn-icon` `width:34px;height:34px;font-size:18px;background:var(--color-surface);` ("−" e "+") e valor `min-width:30px;text-align:center;font-size:20px;font-weight:500;font-variant-numeric:tabular-nums;`. Limites: times 2..8; por time 1..12. aria-labels: "Menos times", "Mais times", "Menos jogadores por time", "Mais jogadores por time".
- barra: coluna `gap:8px`; trilho `display:flex;gap:3px;height:8px;border-radius:999px;overflow:hidden;background:var(--color-neutral-900);` -> `flex gap-[3px] h-2 rounded-full overflow-hidden bg-[color:var(--color-neutral-900)]`; preenchimento `width:{mFillPct};background:var(--navy);transition:width 200ms;`; excesso `width:{mOverPct};background:var(--gold);transition:width 200ms;`; texto `font-size:13px;color:var(--color-neutral-400);text-wrap:pretty;`.
- ações: `display:flex;justify-content:flex-end;gap:8px;` > `btn btn-ghost` "Cancelar" + `btn btn-primary` `{confirmLabel}` `disabled={active < mTeams}`.
- Comportamento: clicar no backdrop fecha (`closeModal`); clique no dialog não propaga (`stopClick`). Sem tratamento de Esc/foco no protótipo (o app já tem em `DrawModal`).

### 3.7 Interações / estados resumidos

- Hover: linhas do elenco e linhas de jogador nos times (`background:var(--color-bg)`); botão dourado `background:var(--gold-soft)`.
- Disabled: botões (`disabled`; estilo do DS `.btn:disabled`). "Adicionar" sem nome; "Sortear de novo" e confirmar do modal com poucos convocados; "Montar times" com `<2`.
- Arrastar e soltar: `draggable` só admin (`cursor:grab`; membro `default`); alvo muda `box-shadow` (cards e reservas); soltar em reservas remove o lock; soltar em time com lock atualiza o time do lock.
- Empty: ver 1.5 e 1.7.
- Cópia: "Copiado ✓" 2s; fallback textarea.
- Responsivo: apenas `flex-wrap` + `flex-basis` e `grid auto-fill/auto-fit`; sem `@media`. Header quebra.

---

## 4. COPY (pt-BR, verbatim)

Legenda: [APP=] o app já tem o mesmo texto; [APP≠ "x"] o app tem texto diferente (citado); [NOVO] não existe no app; [SÓ PROTÓTIPO] não levar.

**Header**: "Escalação" [APP=]; `dayLabel`: "{Dia-da-semana}, {d} de {mês} · {HH:MM}" (ex.: "Sábado, 17 de outubro · 19:00") ou "Sem jogo marcado" [NOVO; o app hoje mostra a data só no corpo, formato "Sábado, 17/10" via `formatGameDate`]; rótulo "Administrador" / "Membro" / "Acesso restrito" [NOVO]; botão "Sair" [APP=].

**Login** [APP≠ h1 "Administrador"]: h1 "Entrar como administrador"; "Só o organizador convoca, dá estrelas e sorteia os times."; label "Senha" [APP=]; botão "Entrar" [APP=]; erro "Senha incorreta." [APP≠ "Senha incorreta" sem ponto; mensagens 429/503 do app "Muitas tentativas. Tente de novo em alguns minutos." e "Servidor sem senha configurada" e "Não foi possível entrar. Tente de novo." sem contrapartida]; "Demonstração: senha 1234" [SÓ PROTÓTIPO].

**Membro sem elenco** [NOVO]: h1 "A lista de jogadores ainda está vazia"; p "O organizador ainda não cadastrou ninguém. Quando o elenco estiver pronto e os times forem sorteados, a escalação aparece aqui."; pílula "Próximo jogo: {dayLabel}". (`placeholder` do slot "Solte uma ilustração ou foto (quadra vazia, bola…)": [SÓ PROTÓTIPO].)

**Cartão do jogo** [APP≠: "Nenhum jogo marcado" [APP=]; "Data do jogo" -> "Dia"; "Cadastrar jogo" -> "Marcar jogo"; "Alterar data" -> título "Alterar data do jogo" + botão "Alterar"; "Excluir jogo" -> "Excluir"; `window.confirm('Excluir o jogo? Pagamentos e sorteio serão perdidos.')` -> card "Excluir o jogo de {gameShort}?" + "Os times sorteados continuam salvos." + "Cancelar" + "Excluir data"; sem hora no app]: "Próximo jogo"; chips "Já aconteceu" | "Hoje" | "Amanhã" | "Em {N} dias"; "{Sábado, 17 de outubro} às {19:00}"; "Alterar"; "Excluir"; "Marcar jogo"; "Alterar data do jogo"; "Dia"; "Hora"; "Cancelar"; "Salvar"; "Defina o dia e a hora para avisar o grupo." (admin); "O organizador ainda não definiu o dia e a hora." (membro); erros "Preencha o dia e a hora." e "Escolha um dia e uma hora que ainda não passaram." [app: "Não foi possível salvar. Tente de novo." / mensagem do servidor].

**Elenco (admin)** [APP≠ "Jogadores", "Nome do jogador", "N de M pagaram", "Pagou: {nome}", "Nome de {nome}", "Remover {nome}", "Dê de 1 a 5 estrelas — clique na metade esquerda da estrela para meia."]: "Elenco"; "{n} de {m} convocados"; placeholder "Nome do novo jogador"; labels de estrela "{x} estrelas" (ex.: "0,5 estrelas", "1 estrelas"... `fmt`; o app usa singular "1 estrela" em `StarRating`); "Adicionar" [APP=]; "Clique na metade esquerda de uma estrela para dar meia."; "Quem vai jogar"; "Marcar todos"; "Limpar"; aria "Convocar"; aria "Nome"; aria "Remover".

**Times**: "Times"; chip "{n} times × {m}" [APP≠ "{n} times · {m} por time"]; "Formato" [NOVO]; "Sortear de novo" / "Sortear de novo · {k} travado" / "Sortear de novo · {k} travados" [APP≠ "Sortear de novo ({k} travado(s))"]; "Montar times" [APP=, mas muda de lugar].

**Equilíbrio** [APP≠ "Diferença entre o mais forte e o mais fraco: X ★" + " (média por jogador)" e "Os times aparecem aqui depois do sorteio"]: "Equilíbrio"; tags "Equilibrado" / "Quase parelho" / "Desequilibrado" [APP=; o app tem só 2 tons]; "Diferença {x} ★" + (tamanhos desiguais) " na média por jogador"; segmentos "{letra}" e "{total} ★".

**Estado vazio admin** [APP≠ "Nenhum time montado ainda" + "Marque quem pagou, clique em Montar times e escolha quantos times e quantos jogadores por time. As estrelas são distribuídas para os times ficarem o mais parelhos possível. Quem passar das vagas vira reserva."]: "Monte os times em três passos"; "As estrelas são distribuídas para os times ficarem o mais parelhos possível. Quem passar das vagas vira reserva."; passos "1" "Convoque" "{n} de {m} marcados na lista ao lado."; "2" "Escolha o formato" "Quantos times e quantos jogadores por time."; "3" "Sorteie" "Ajuste à mão arrastando e trave quem não pode mudar."; botão "Montar times".

**Estado vazio membro (times)** [APP=]: "Os times ainda não foram sorteados"; "Assim que o organizador sortear, as escalações aparecem aqui." (ramo morto, não implementar: "O elenco ainda está vazio", "O organizador ainda não cadastrou os jogadores. Quando o elenco estiver pronto e os times forem sorteados, tudo aparece aqui.", "Elenco cadastrado", "Times sorteados").

**Card de time**: "Time A".."Time H"; "{n} jogador" / "{n} jogadores"; "média {x}"; aria da pílula "{x} estrelas"; "Arraste jogadores para cá" [APP≠ ausente: hoje não há texto de time vazio]; aria cadeado "Travar {nome} neste time" / "Destravar {nome}" [APP=].

**Reservas** [APP≠ rótulo "Reservas" (h2) sem contagem]: "Reservas · {n}"; chip "{nome}" + "★ {x}".

**Mandar no grupo** [APP≠ só botão "Copiar escalação" + "Incluir estrelas"]: "Mandar no grupo"; "Copia a escalação pronta para colar no WhatsApp."; "Incluir estrelas" [APP=]; "Copiar escalação" / "Copiado ✓" [APP=; `CopyBar.tsx` já usa 'Copiado ✓'].

**Dicas** [APP≠ frase única "Arraste um jogador entre os times para ajustar à mão; o cadeado mantém o jogador no time ao sortear de novo." e "{n} pagou e ficou / pagaram e ficaram de fora — sorteie de novo para incluir."]: "Arraste para trocar de time"; "Cadeado mantém o jogador no time ao sortear de novo"; "{n} convocado ficou de fora — sorteie de novo para incluir." / "{n} convocados ficaram de fora — sorteie de novo para incluir."

**Elenco (membro)** [APP≠ "Elenco" 28px + "{n} jogador(es)" + tag "Pago"/"Aguardando"]: "Elenco"; "{n} de {m} convocados"; "fora"; aria "{x} estrelas" [APP=].

**Modal** [APP≠ título "Montar times"; resumo com "pagos"]: "Formato do jogo"; "{n} de {m} convocados" (subtítulo); presets "2 × 6" / "2 times de 6"; "2 × 4" / "2 times de 4"; "3 × 4" / "3 times de 4"; "Times" / "de 2 a 8" [APP=]; "Jogadores por time" / "de 1 a 12" [APP=]; aria "Menos times", "Mais times", "Menos jogadores por time", "Mais jogadores por time" [APP=]; botões "−" "+"; resumo: "Convoque pelo menos {k} jogadores (um por time)." [APP≠ "Marque pelo menos {k} jogadores como pagos (um por time)."] | "{S} vagas · {x} convocado fica como reserva." | "{S} vagas · {x} convocados ficam como reserva." | "{S} vagas · todos os {n} convocados jogam." [APP≠ "... todos os {n} pagos jogam."] | "{n} convocados para {S} vagas · alguns times ficam com menos jogadores." [APP≠ "{n} pagos para ..."] + sufixo " {k} jogador travado será mantido." / " {k} jogadores travados serão mantidos."; "Cancelar"; "Sortear" / "Sortear de novo" [APP=].

**Texto do WhatsApp** (gerado): "🏐 *Escalação · Vôlei*"; "{Dia da semana}, {dd/mm} às {HH:MM} · {N} jogadores" (com jogo; sem jogo: "{Dia da semana}, {dd/mm} · {N} jogadores" de hoje); "*Time A*"; "1. Nome" (+ " ★4,5"); "Reservas: a, b". (Implementação real em `src/shared/whatsapp.ts`; o formato de data/hora só muda se a hora do jogo existir.)

---

## 5. DADOS/COMPORTAMENTO QUE O NOVO V4 EXIGE E O APP NÃO TEM (e vice-versa)

### 5.1 Exigido pelo v4, inexistente no app
1. **HORA do jogo** (NEEDS-NEW-BEHAVIOR, maior item): `game.time` ("19:00"), input `type="time"` com default `'19:00'`, `dayLabel`, "{weekday} às {HH:MM}", `gameShort` (confirmação) e linha do dia do texto do WhatsApp. Exige coluna/migração (`migrations/`), tipos (`Game`, `PublicGame`), API (`createGame`/`updateGameDate`), validação "não pode estar no passado" considerando a hora (fuso de Brasília, `shared/dates`). PROPOSTA se o produto NÃO quiser hora: entregar o visual sem "às HH:MM", sem campo "Hora" e com `dayLabel` = "Sábado, 17 de outubro".
2. **Chip relativo** "Hoje/Amanhã/Em N dias/Já aconteceu": função pura com `todayInBrasilia` (sem backend). Para "Já aconteceu" precisa da hora (ou tratar dia anterior).
3. **Confirmação de exclusão em card** (substitui `window.confirm`); o texto do v4 "Os times sorteados continuam salvos." é incompatível com o app (`api.deleteGame()` apaga jogo, pagamentos e sorteio; o `confirm` atual diz "Pagamentos e sorteio serão perdidos."). PROPOSTA: manter a frase verdadeira do app dentro do card de confirmação ("Pagamentos e sorteio serão perdidos.") e só adotar a do v4 se o backend passar a preservar o sorteio.
4. **Cor por time** (`TEAM_COLORS[ti % 8]`, função pura) e **letra** `LETTERS` (o app tem A..Z; o modal limita a 8 times, o ciclo `% 8` basta).
5. **Barra de equilíbrio** por time: `share = Math.max(0.1, sizesEqual ? total : média)`; os valores já existem em `lib/drawStats.ts` (`teamTotals`, `teamAverage`, `sizesEqual`, `spreadOf`); falta tom de 3 estados (`balanceTag` do app devolve `tone: 'good' | 'neutral'`: ampliar para `'good' | 'ok' | 'bad'`) e o componente. Só aparece com times E estrelas visíveis.
6. **Índice por jogador** (1, 2, 3...) e **pílula de nota** no card de time (substitui `StarRating size 12`). No membro: precisa manter `aria-label="{x} estrelas"` (testes).
7. **"Marcar todos" / "Limpar"** (ação em lote): hoje o app só alterna "pago" por jogador (`api` por jogador, `togglePaid`). Exige lote (várias chamadas ou endpoint novo) e comportamento sem jogo (checkbox desabilitado sem jogo: "Cadastre a data do jogo primeiro").
8. **Contador "N de M convocados"** no aside (hoje "N de M pagaram").
9. **Botão "Formato" separado de "Sortear de novo"**: o app já separa (`setModalOpen(true)` vs `runDraw(config)`): só reorganizar e trocar "Montar times" do cabeçalho pelo estado vazio.
10. **Onboarding "três passos"** (componente novo; passo 1 `done` quando `active.length >= 2`; botão "Montar times" `disabled` se `active.length < 2`; no app também `!game || busy`).
11. **Estado "membro sem elenco"** (Seção 3.1c): regra do app a decidir: quando `game.players.length === 0` (e/ou sem jogo) mostrar essa tela. Hoje, sem jogo, o app mostra "Nenhum jogo marcado" simples; v4 no caso "sem jogo e com elenco" mostra a página normal com o cartão "Nenhum jogo marcado".
12. **`hasTeams` exige ao menos 1 jogador alocado** (sorteio vazio = estado vazio).
13. **Meia estrela mínima 0,5** (item 0.11): hoje `StarRating` usa `Math.max(1, n - 0.5)` e o teste `StarRating.test.tsx` provavelmente fixa isso; o servidor pode validar `rating >= 1`. Decisão de produto antes de mudar.
14. **Rótulo "Acesso restrito"** no header da tela de login; `dayLabel` global no header também na tela de login ("Sem jogo marcado") (o login do admin não tem acesso ao jogo antes de autenticar: PROPOSTA no login usar apenas "Escalação" sem sub-linha, pois o jogo é dado privado ao admin).
15. **Props do protótipo sem contrapartida**: `mode='aleatório'` (sem UI no app), `showAverages` (média no card: sempre mostrar com estrelas visíveis), `allowHalf` (já fixo no app), `memberSeesStars` (já existe como `showStars` do `PublicGame` e `SettingsToggle`).

### 5.2 Existe no app, sem UI no v4 (PROPOSTA de lugar, na linguagem visual do v4)
- **Switch "Membro vê as estrelas" (`SettingsToggle`)**: PROPOSTA: linha no rodapé do aside "Elenco" do admin (`border-top:1px solid var(--color-neutral-900);padding:12px 18px;display:flex;justify-content:space-between;align-items:center;font-size:13px`), com o checkbox `accent-color:var(--navy)` e erro com o estilo do alerta gold-tint. Alternativa: dentro do cartão "Mandar no grupo". Manter `aria-label="Configurações"`.
- **Status pago/aguardando** (`paid`): v4 usa "convocado" (checkbox "Convocar"). PROPOSTA: tratar `paid` como "convocado" (mesma semântica já que o sorteio usa os pagos) e trocar as cópias; no membro, "Pago"/"Aguardando" vira "fora" (opacidade 0.5) para quem não pagou. Decisão de produto (5.3).
- **Erros de API, carregando, `Tentar de novo`, `Cadastre a data do jogo primeiro`**: PROPOSTA: alerta gold-tint (`px-3 py-2 rounded-sm bg-gold-tint text-gold-ink shadow-[inset_0_0_0_1px_var(--gold-soft)]`, `role="alert"`) em vez do vermelho `#a3262a`; "Tentar de novo" como `btn btn-ghost`. "Cadastre a data do jogo primeiro": usar como `title` e texto de apoio abaixo do botão "Montar times" (12px neutral-500) quando `!game`.
- **Ajuste por teclado/leitor de tela (`.move-select`, `aria-busy`, `aria-disabled`)**: PROPOSTA: `<select>` compacto 12px na linha (`h-[26px] rounded-sm bg-surface shadow-sm`, largura ~92px), oculto visualmente só se o design exigir (não recomendado; manter por acessibilidade).
- **Estado "reservas vazias como alvo de soltura" (`showEmpty`)**: PROPOSTA: o mesmo contêiner tracejado de reservas com o texto atual "Solte aqui para mandar às reservas" (13px neutral-400).
- **Foco visível**: o v4 desliga o outline do input do nome da linha; manter `focus-visible` (outline 2px accent) no app.
- **Histórico (`/admin/history`, finalização de jogo)**: sem UI no web hoje e sem UI no v4; nada a fazer.
- **Login sem campo usuário**: igual ao app.
- **Rótulos acessíveis com o nome**: o v4 usa `aria-label` genérico ("Convocar", "Nome", "Remover"); o app e os testes usam o nome ("Pagou: {nome}", "Nome de {nome}", "Remover {nome}"): PROPOSTA manter o nome (acessibilidade e testes).

### 5.3 Decisão de produto: "convocados" x "pagos"
O v4 só fala em convocados. O app liga o sorteio a "pagos por jogo". Duas rotas: (A) manter a semântica "pago" e só trocar as cópias para o vocabulário do v4 (recomendado: menos código); (B) remover o conceito de pagamento. Este brief assume (A).

---

## 6. MAPEAMENTO PARA O APP ATUAL (`src/web`)

| Arquivo | Muda? | O que / seção do v4 |
|---|---|---|
| `src/web/theme.css` | SIM (substituído) | Migrar tokens para `@theme` (2.7). Corrigir `--radius-sm/md` para 4px/8px e `--radius-lg` 12px. Corrigir `.btn-primary` (contornado, não preenchido) e `.btn-ghost` (texto accent, sem sombra, `padding-inline:2.8px`), `.input` (min-height 36px, `padding:6px 10px`, borda 1px `--color-divider`; PROPOSTA: definir `--color-divider` claro útil, p.ex. `#cfd3e5`, pois o do DS some no claro; os campos de login/data/hora já sobrescrevem com `#b2b6ca`), base (`body` 15px/1.55). Remover `.nav`, `.seg*`, `.tag*`, `.page` (gradiente), `.team-card`, `.gold-rule`, `.chip`, `.reserves`, `.empty`, `.admin-card`, `.player-row`, `.modal*` quando não usadas mais. Manter: `.star-hit:focus-visible`, `.icon-btn` focus, `.move-select`, `.copy-fallback`, `.plain-list`, `.field`, `.switch` (ou migrar). |
| `src/web/main.tsx` | Pequeno | Continua importando o CSS; passa a importar o CSS com `@import "tailwindcss"` (ver ordem abaixo). |
| `src/web/App.tsx` | Não | Rotas inalteradas. |
| `pages/MemberPage.tsx` | SIM | Header (3.1, rótulo "Membro", `dayLabel`), cartão do jogo somente-leitura (3.1d: estados `gameView` e `gameEmpty` sem botões), h1 "Times" 32px (no lugar do `<p>` 28px com a data), cards de time (faixa, selo, índice, pílula), Equilíbrio (se estrelas visíveis), reservas em linha tracejada com chips, `Roster` como aside-card (3.5, "fora" no lugar de "Pago/Aguardando"), estado "sem times" (3.4 REVISTO), tela "sem elenco" (3.1c com `<img src="/images/membro-elenco-vazio.webp">`). Manter semântica: `section` + `h2 "Time A"` por time, `h2` "Reservas" (testes), `role="status"` do erro. |
| `pages/AdminPage.tsx` | SIM | `Nav` -> header v4 (rótulo "Administrador", "Sair"); remover `GameBar` e `SettingsToggle` do topo (vão para dentro do layout: cartão do jogo no topo da coluna Times; switch no aside, 5.2); `admin-columns` vira `<main>` (3.2). `auth === 'out'` mostra header ("Acesso restrito") + `LoginPage`. |
| `pages/LoginPage.tsx` | SIM | Card 3.1b; h1 "Entrar como administrador" + descrição; erro com alerta gold-tint; manter a lógica (limpar a senha, mensagens 429/503). |
| `components/PlayersPanel.tsx` | SIM | Aside-card "Elenco" (3.3): título + contador, form em bloco `--color-bg` (input em linha própria, estrelas 22px, rótulo da nota, botão com "+"), dica de meia estrela, "Quem vai jogar" + "Marcar todos"/"Limpar" (lote: 5.1.7), linhas com hover, checkbox navy, nota 26px, remover 26px; manter `data-testid="player-{id}"`, aria com nome, erro inline. |
| `components/StarRating.tsx` | Pequeno | Tamanhos 22/18/15; versão do membro sem `drop-shadow`; classe `star-hit` (teste); decidir 0,5 (5.1.13). |
| `components/TeamCards.tsx` | SIM | Card (3.4): `section` com faixa 4px, selo da letra (cores `TEAM_COLORS`), `h2` "Time A" 16px, contagem, total/média; linhas com índice, slot de extras (cadeado 26px/`move-select`) e pílula; vazio tracejado "Arraste jogadores para cá" (admin). Nova função pura `teamColor(i)`. |
| `components/ReservesBar.tsx` | SIM | Linha tracejada `rounded-lg`, rótulo "Reservas · N" (manter um `h2` acessível com nome começando por "Reservas"), chips pílula com "★ x" (admin/estrelas), `showEmpty` mantido. |
| `components/CopyBar.tsx` | SIM | Card navy "Mandar no grupo" (3.4), botão dourado, checkbox `accent-color:var(--gold)`, textarea de fallback `bg-surface` sem borda (manter `document.querySelector('textarea')` válido). |
| `components/DrawArea.tsx` | SIM | Nova ordem: cartão do jogo (se admin) > cabeçalho (h1 + chip + "Formato" + "Sortear de novo · N travados") > Equilíbrio > vazio/onboarding > grid > reservas > CopyBar > dicas. `HIGHLIGHT` -> `0 0 0 2px var(--color-accent), 0 8px 24px rgba(36,54,90,0.18)` para times e `0 0 0 2px var(--color-accent)` para reservas, mantendo como `style.boxShadow` inline (teste). Novos subcomponentes: `BalanceCard`, `Onboarding`. |
| `components/DrawModal.tsx` | SIM | "Formato do jogo", 440px, `rounded-lg`, presets em grade 3 colunas com estado, steppers em bloco, barra de vagas, textos "convocados"; manter `data-testid` (`teams-value`, `size-value`, `modal-backdrop`), `role="dialog"`, foco e Esc. |
| `components/GameBar.tsx` | SIM (reescrita visual) | Vira o cartão do jogo (3.1d) com 4 estados; atenção aos rótulos que os testes usam (5/Seção 4). |
| `components/SettingsToggle.tsx` | SIM (reposição) | PROPOSTA 5.2. |
| `lib/drawStats.ts` | Pequeno | `balanceTag` com 3 tons; helpers de `share`; texto "Diferença … ★". |
| `lib/drawEdit.ts`, `hooks/*`, `api.ts` | Não (salvo hora do jogo) | Só mudam se a hora do jogo entrar (5.1.1). |
| `format.ts` | Pequeno | `formatDayLabel` ("Sábado, 17 de outubro") e, com hora, "Sábado, 17 de outubro · 19:00"; manter `formatGameDate` se ainda usada. |
| `src/shared/whatsapp.ts` | Só se houver hora | Linha do dia com " às HH:MM". |

### 6.1 Testes (tests/web) afetados
Os testes consultam papéis/rótulos/texto, não classes, com estas exceções e dependências:
- **Depende de classe/CSS**: `StarRating.test.tsx` linha 44 `expect(btn.className).toContain('star-hit')` (manter a classe `star-hit` ou alterar o teste). `DrawAreaEdit.test.tsx` linhas 156/158 `card('B').style.boxShadow` (`toContain('var(--color-accent)')` e depois `toBe('')`): manter o destaque do drop como **estilo inline** `boxShadow` (e vazio quando inativo); se for para classe Tailwind, reescrever o teste para checar `data-over`/classe.
- **Dependem de estrutura**: `.closest('section')` para `heading 'Time A'`/`'Reservas'` (MemberPage, DrawArea, DrawAreaEdit) e `.closest('li')` para linhas (DrawAreaEdit): manter `<section>` por card/reservas e `<li>` por jogador (ou atualizar). `data-testid`: `player-{id}`, `teams-value`, `size-value`, `modal-backdrop`. `document.querySelector('textarea')` (CopyBar), `[aria-busy="true"]`, `[aria-label="X estrelas"]`.
- **Quebram por mudança de texto** (atualizar junto com a copy): `AdminPage.test.tsx` ("Jogadores", "Cadastrar jogo", "Data do jogo", "Excluir jogo", "Sair", "Senha incorreta", "Membro vê"), `GameBar.test.tsx` ("Data do jogo"), `PlayersPanel.test.tsx` ("pagaram", "Nome do jogador", "Pagou: …", "Pago", "Nome de …", "Remover …"), `DrawArea.test.tsx` ("Nenhum time montado ainda", "pagaram", "Montar times", "Sortear de novo"), `DrawModal.test.tsx` ("pagaram", "Montar times", resumo "pagos"), `DrawAreaEdit.test.tsx` ("Sortear de novo", "Travar …", "Copiar"), `MemberPage.test.tsx` ("Pago", "Aguardando", "Nenhum jogo marcado", heading "Reservas"), `CopyBar.test.tsx` ("Escalação", "Incluir estrelas", "Copiar"). Estratégia: se a copy do app for adotada, trocar as strings nos testes no mesmo commit; se a copy ficar como está, os testes não mudam. Sugestão: fazer a restilização em duas etapas (1: só visual sem mudar texto/rotulagem acessível: testes verdes sem edição; 2: mudar a copy e atualizar os testes numa única passada).
- **Não afetados**: `api.test.ts`, `drawEdit.test.ts`, `drawStats.test.ts` (salvo 3 tons), `useAdminData.test.tsx`.
- Ambiente: `vitest.config.ts` usa `environment: 'node'` e cada teste de componente declara `// @vitest-environment jsdom`; CSS não é carregado nos testes (nenhum teste importa `theme.css`; `main.tsx` não é testado). Portanto trocar CSS por Tailwind não altera o resultado dos testes por si só.

### 6.2 Setup Tailwind e ORDEM DE TRABALHO (Vite 8 + React 18 + TS)
1. `npm i -D tailwindcss @tailwindcss/vite`.
2. `vite.config.ts`: `import tailwindcss from '@tailwindcss/vite'` e `plugins: [react(), tailwindcss()]`.
3. Criar o CSS de entrada (pode ser o próprio `theme.css`): `@import "tailwindcss";` + `@theme { ... }` (2.7) + `@layer base` (2.3) + `@layer components` (`.btn*`, `.input`; 2.4). Manter no mesmo arquivo as regras que Tailwind não cobre (`.star-hit:focus-visible`, `.move-select`).
4. Rodar `npm test` (os 335 testes devem seguir verdes: nada de CSS é testado) e `npm run build` (o build também roda `tsc -p`).
5. Etapa A (sem mudar texto nem rótulos): tokens + base + `.btn/.input` + header + layout `<main>` + aside Elenco + cards de time + reservas + CopyBar + modal + estados vazios + Login + cartão do jogo (visual). Rodar os testes a cada componente.
6. Etapa B (comportamento novo, cada item com seu teste novo): hora do jogo (migração + API + UI), "Marcar todos/Limpar", barra de equilíbrio e 3 tons, onboarding de 3 passos, tela do membro sem elenco, 0,5 estrela (se aprovado), copy "convocados" (atualizar testes juntos).
7. Remover do CSS tudo que ficou sem uso; revisar contraste e foco.
Ordem sugerida de componentes: tokens/base > `StarRating` > header + `AdminPage`/`MemberPage` shells > `PlayersPanel` > `DrawArea` + `TeamCards` + `ReservesBar` + `CopyBar` > `DrawModal` > `GameBar` (cartão) > `LoginPage` > `MemberPage` interior (roster, vazios).

---

## 7. RISCOS / DESCONHECIDOS

1. **Radius e botões do app divergem do DS**: `theme.css` usa sm 8px / md 14px e botões preenchidos; o DS real (agora conhecido) é sm 4px / md 8px / lg 12px (v4) e `.btn-primary` CONTORNADO (borda accent, fundo transparente, hover 12%). Se o designer pretende botões preenchidos, isso precisa ser confirmado: a imagem renderizada do v4 (captura) não pôde ser vista; a conclusão vem do CSS. Alto impacto visual.
2. **`--color-divider` não definido no LIGHT**: o `.input` do DS usa `border:1px solid var(--color-divider)` e o valor herdado (16% de `#e9e9ed`) é quase invisível no claro. O designer contornou nos campos de login/data/hora com `border:1px solid #b2b6ca`, mas o input "Nome do novo jogador" (fundo `--color-surface` dentro de bloco `--color-bg`) fica quase sem borda. Fiel ao v4; sinalizar ao designer.
3. **Hora do jogo** (5.1.1): mudança de backend/migração.
4. **Texto de exclusão** ("Os times sorteados continuam salvos.") contradiz o comportamento atual do app.
5. **Meia estrela 0,5** (0.11): pode violar a validação do servidor/testes.
6. **"Convocados" vs "pagos"** (5.3).
7. **Sem tema escuro**; nenhuma lógica `prefers-color-scheme`.
8. **Fonte**: Inter carregada pelo DS via Google Fonts (`@import url(...Inter:wght@400;500;600;700)`); o `index.html` do app NÃO carrega a fonte (sem `<link>` do Google Fonts): adicionar o link ou `@font-face`/`@import` para Inter 400/500. Sem a fonte, as larguras mudam.
9. **`outline:none` no input do nome da linha** do protótipo: manter foco visível.
10. **Contraste**: cadeado destravado `--color-neutral-600` (#b2b6ca) sobre #f3f5fe (~1,9:1); borda tracejada `--color-neutral-700` (#cfd3e5) sutil; "fora" 11px `--color-neutral-500`. Fiéis ao v4; sinalizar.
11. **Imagem do membro sem elenco**: `fit` e `alt` não estão no markup; fundo branco da imagem sobre `#e4e7f5` forma um retângulo claro; `radius="16"` é do slot. Imagem 720x540 (63 KB, webp): usar `width`/`height` para evitar CLS; considerar `loading="eager"` (acima da dobra).
12. **`image-slot`/`support.js`/`DCLogic`/`sc-if`/`sc-for`** são andaimes da ferramenta: não reproduzir. `style-hover` -> `hover:`. `onChange` do protótipo dispara no blur/commit (React `onChange` dispara a cada tecla; o app usa controlados com commit no blur, ver `PlayerRow`).
13. **Letras acima de 8 times** e `TEAM_COLORS` só com 8 cores (o ciclo repete cores); o modal limita a 8.
14. **Drag-and-drop HTML5**: protótipo usa `dataTransfer.setData('text/plain', id)`; o app tem DnD + `move-select`; manter ambos.
15. **Ícones**: SVGs Phosphor regular (viewBox 256), paths citados nas Seções 3.1, 3.1c, 3.1d e 3.3-3.4. Alguns paths do arquivo contêm artefatos de formatação equivalentes numericamente (`25.590a8` = `25.59a8`; `38.830L` = `38.83L`; `200.940` = `200.94`; `30.150l` = `30.15l`): copiar do app (`StarRating.tsx`, `DrawArea.tsx`) onde já existem.
16. **`line-height` herdado 1.55** (DS) em vez de 1.5 (Tailwind): ajustar o `body` para manter alturas de linha idênticas (afeta alturas de linhas de 14px).
17. **Altura do header ~66px** (usada em `calc(100vh - 66px)`): depende de `line-height` e do logo de 36px; conferir no browser.
18. **Dois `<h1>`/títulos por tela**: v4 usa `<h1>` "Times" (admin/membro com app), h1 do login e h1 do membro sem elenco (telas exclusivas, ok). O `MemberPage` do app tem hoje `<h1>Escalação</h1>` no brand: o v4 não tem h1 no header (usa `<span>`): ajustar para evitar dois h1 (PROPOSTA: header com `<span>`/`<p>`, h1 só no conteúdo).

---

## Autoverificação (releitura do novo v4 de cima a baixo contra a Seção 3)

Percorridas as 897 linhas: `<head>`/`<helmet>` (CSS do DS, bundle, `image-slot.js`, `<style>` do body: Seções 1.1/2.1/2.3) | wrapper de tema e `min-height:100vh` (3 intro) | header: brand, logo, "Escalação", `dayLabel`, rótulo, "Sair" (3.1) | login (3.1b) | membro sem elenco: wrapper, caixa 4:3 + image-slot, h1, p, pílula com calendário (3.1c) | `<main>` (3.2) | aside admin completo: título/contador, form, input, estrelas 22px (camadas, 2 botões por estrela), rótulo, botão "+", dica, "Quem vai jogar", Marcar todos/Limpar, lista, linha (checkbox, nome, estrelas 18px, nota, remover) (3.3) | section: cartão do jogo com 4 estados (3.1d), cabeçalho (h1, chip, Formato, Sortear de novo), Equilíbrio (tag, spread, barra), vazio admin (título, texto, passos, botão), vazio membro (caixa de ícone, texto, trilha morta), grid, card de time (faixa, selo, nome/contagem, total/média, linhas: índice, nome, cadeado, pílula; vazio tracejado), reservas (rótulo, chips), "Mandar no grupo" (título, checkbox, botão dourado, textarea), dicas (3.4) | aside do membro (3.5) | modal (backdrop, dialog, título, presets, steppers, barra, resumo, ações) (3.6) | script: tokens `LIGHT`, `TEAM_COLORS`, `starsFor` (0,5), `balance`, `renderVals` (login, jogo, textos de vazio, `redrawLabel`, `balanceTagStyle`, `mSummary`, `buildText`) (Seções 0, 2, 4, 5). Itens sem mudança em relação ao brief anterior foram reutilizados literalmente nas Seções 3.2-3.7 (revisados nos pontos 0.9, 0.10, 0.11).
