# Fidelidade visual: protótipo v4 × app

Comparação feita em 19/10/2026 (Task 15). O protótipo `Montar Times v4.dc.html` foi renderizado pela pré-visualização do Claude Design e o app rodou numa instância isolada (`wrangler pages dev`, banco local próprio). Os dois foram abertos num Chrome headless (perfil descartável, controlado por CDP), em 1440×900 e 390×844, com página inteira quando era mais alta. Os dados foram os mesmos dos dois lados: os 14 `DEFAULT_PLAYERS` do protótipo, jogo em sábado 24/10/2026 às 19:00, todos marcados e o sorteio 2×6 feito pelo modal do app. As mesmas equipes e reservas foram copiadas para o `localStorage` do protótipo. Do lado do protótipo, os jogadores foram postos em ordem alfabética para casar com o app.

Método: captura de tela de cada estado nos dois lados, olhadas lado a lado. Além disso, um script mediu no DOM todo texto visível (posição, tamanho, `font-size`, peso, `line-height`, cor, `letter-spacing`) e toda caixa com fundo, sombra ou borda (posição, tamanho, `padding`, raio, sombra, fundo, borda). Depois casou os dois lados por texto e listou cada diferença acima de 0,6px.

Artefatos de medição ignorados:
- O protótipo põe cada `{{ binding }}` num `<span>` inline, então a altura medida do texto dele é a da caixa inline (ex.: 15px contra 18,6px). As caixas de bloco que contêm esse texto têm a mesma posição e o mesmo tamanho.
- `rounded-full` do Tailwind (`calc(infinity * 1px)`) e `999px` dão o mesmo desenho.
- As sombras do Tailwind levam camadas transparentes extras (`ring`) antes da sombra real. A sombra visível é idêntica.

Rodada 1 = commit `fix: ajustes de fidelidade visual ao v4 (rodada 1)`. Depois dela não sobrou diferença visível que não esteja nas listas de "intencional" ou "OPEN" abaixo.

## Diferenças de base (afetavam vários estados)

| # | O quê | Protótipo | App (antes) | Correção | Rodada |
|---|---|---|---|---|---|
| B1 | Cartão do jogo fora das colunas | 1º filho da `<section>` "Times": x 456, 956×83,9 | acima de tudo, fora das colunas: x 28, 533×83,9; o aside começava em y 209 | `GameBar` passado como `gameCard` ao `DrawArea` e renderizado como primeiro filho da coluna | 1 |
| B2 | Largura das colunas do admin | aside 400px (`flex 1 1 320px; max 400`), coluna Times 956px | aside 374px, Times 682px (embrulho `<section>` com `flex-wrap gap-24` que não crescia) | o embrulho "Jogadores e sorteio" virou `display: contents` (`contents`): aside e coluna são filhos diretos do `<main>` (gap 28). O `aria-label` e o teste continuam | 1 |
| B3 | `line-height` de textos 12/14/16/20px | herdado do body: 1,55 (12px → 18,6; 14px → 21,7; 16px → 24,8; 20px → 31) | `text-xs/sm/base/xl` do Tailwind impõem 16/20/24/28px | 26 usos trocados por `text-[12px]`, `text-[14px]`, `text-[16px]`, `text-[20px]` | 1 |
| B4 | "Time A/B" e "Reservas · N" | `<span>`: lh 24,8 / 18,6, letter-spacing normal | `<h2>` com base do DS: lh 1,12, `-0.015em` (-0,24px) | `leading-[1.55] tracking-normal` nesses h2 (o h2 continua, pela acessibilidade) | 1 |
| B5 | Borda do campo "Nome do novo jogador" | `--color-divider` do DS sem override: `color-mix(#e9e9ed 16%, transparent)`, praticamente invisível | `#cfd3e5`, visível | `--color-divider` com o literal do DS | 1 |
| B6 | Grade de times vazia | sem sorteio, a grade vazia continua na coluna e soma um gap de 20px (no celular, o "Elenco" fica 20px mais abaixo) | não existia (aside 20px mais acima em 390px) | espaçador vazio `aria-hidden` no lugar da grade (admin e Membro) | 1 |

## (1) Login

| O quê | Protótipo | App | Correção / situação | Rodada |
|---|---|---|---|---|
| "Entrar" com senha vazia | desabilitado (opacidade 0,45) | habilitado | `disabled={submitting \|\| !password}` | 1 |
| Linha do jogo no cabeçalho | "Sem jogo marcado"; cabeçalho 73,4px | sem linha; cabeçalho 65px; card 10px mais acima | intencional (spec: o jogo é dado do admin) | — |
| "Demonstração: senha 1234" | presente (card 311,4px) | ausente (card 274,8px) | intencional (andaime do protótipo) | — |
| Card, título, campo, botão | 380px, p 28, gap 18, `shadow-md`, h1 24px | idem | sem diferença | — |

## (2) Admin sem jogo e sem jogadores

| O quê | Protótipo | App | Correção / situação | Rodada |
|---|---|---|---|---|
| Layout (B1, B2), lh (B3), borda (B5), gap (B6) | ver base | ver base | corrigido | 1 |
| "Marcar todos" / "Limpar" | habilitados | desabilitados (0,45) sem jogo | intencional (sem jogo não há pagamento) | — |
| "Cadastre a data do jogo primeiro" sob "Montar times" | ausente | 12px, +26,6px no card | intencional (spec) | — |
| Rodapé "Membro vê as estrelas" no Elenco | ausente | +45,1px no aside | intencional (spec) | — |

## (3) Admin com jogo e jogadores, sem sorteio

| O quê | Protótipo | App | Correção / situação | Rodada |
|---|---|---|---|---|
| Layout/lh/borda/gap (B1, B2, B3, B5, B6) | — | — | corrigido; depois, todas as caixas na mesma posição (±0,6px) em 1440 e 390 | 1 |
| Passos do onboarding | 3 colunas de 264px, passo 1 navy | idem | sem diferença | — |
| Altura total | 981 / 1987 | 1026 / 2032 | só o rodapé de 45px do Elenco (intencional) | — |

## (4) Admin com sorteio

| O quê | Protótipo | App | Correção / situação | Rodada |
|---|---|---|---|---|
| Grade de times | 3 colunas de 308px (coluna de 956px) | 2 colunas de 333px (coluna de 682px) | consequência de B2; corrigido | 1 |
| Linhas, índice, pílula, cadeado (lh) | 41px por linha; texto lh 21,7/18,6 | 41px; lh 20/16 | B3; corrigido | 1 |
| Cabeçalho do card (faixa 4px, selo 36px, total 22px, média 12px) | idem | idem | sem diferença depois de B4 | 1 |
| Seletor "Mover para" em cada linha e chip de reserva | ausente | 92×26px; as reservas ficam 64px de altura (58,1 no v4) e, em 390px, quebram em duas linhas | intencional (acessibilidade, spec) | — |
| "Mandar no grupo", dicas, Equilíbrio | idem | idem (+5,9px por causa das reservas) | sem diferença própria | — |

## (5) Modal "Formato do jogo"

| O quê | Protótipo | App | Correção / situação | Rodada |
|---|---|---|---|---|
| Diálogo (440px, p 24, presets, steppers, barra, ações) | — | — | sem diferença nas medidas, nem antes nem depois do sorteio | — |
| Subtítulo e resumo | "14 de 14 convocados", "… convocados ficam como reserva." | "jogadores" | intencional (vocabulário) | — |

## (6) Cartão do jogo nos 4 estados

| Estado | O quê | Protótipo | App | Correção / situação | Rodada |
|---|---|---|---|---|---|
| visualização | posição e largura | coluna Times | fora das colunas | B1 | 1 |
| visualização | chip "Em 5 dias", selo, data | idem | idem | sem diferença | — |
| edição | altura dos campos Dia/Hora | 37,7px | 36px (o preflight zera o padding interno do campo de data) | `[&::-webkit-datetime-edit-fields-wrapper]:py-px` | 1 |
| confirmação | segunda linha | "Os times sorteados continuam salvos." | "Pagamentos e sorteio serão perdidos." | intencional (spec) | — |
| vazio (com jogadores) | passo 1 / "Montar times" | passo 1 marcado, botão habilitado | passo 1 não marcado, botão desabilitado | intencional: sem jogo não há pagos | — |

## (7) Membro com times

| O quê | Protótipo | App | Correção / situação | Rodada |
|---|---|---|---|---|
| Total de estrelas e média nos cards | 22px gold-ink + "média X" 12px | ausentes | componente `TeamTotal` compartilhado, só com estrelas | 1 |
| Reservas com nota | "Bruno ★ 3" | "Bruno" | `★ {nota}` 12px gold-ink, só com estrelas | 1 |
| Nota de 26px no Elenco | presente | ausente | `w-[26px] text-[13px] font-medium text-gold-ink` | 1 |
| Ordem do Elenco | quem joga primeiro, depois por nota | alfabética | ordem do v4 (estável; sem estrelas: só quem joga primeiro) | 1 |
| Chip "2 times × 6" ao lado de "Times" | presente | ausente | **DECIDIDO** (Task 16): a API pública expõe `teamCount`/`teamSize` e o Membro mostra "N times × M" | 16 |
| Linha "fora" (jogador não pago) | 11px uppercase, linha com opacidade 0,5 | mesma posição; "fora" em neutral-400 (≈ 9,2:1) e fora da opacidade da linha | **DECIDIDO** (Task 16): contraste corrigido de propósito | 16 |
| **Sem estrelas**: aside "Elenco" | não aparece (`memberRoster` exige `showStars`); os times ocupam 1384px em 5 colunas de 264px | aparece (nomes + "fora"); times em 976px, 315px por card | **DECIDIDO** (Task 16): o "Elenco" continua visível, com as estrelas ocultas | 16 |
| Sem estrelas: ordem dentro dos times e das reservas | por nota | alfabética | intencional (o servidor ordena por nome para não vazar a força; está testado) | — |

## (8) Membro sem elenco (ilustração)

| O quê | Protótipo | App | Correção / situação | Rodada |
|---|---|---|---|---|
| Pílula "Próximo jogo: …" em 390px | quebra a data em 2 linhas (59,4px de altura, 350px de largura) | 1 linha (37,7px, 346,3px) | rótulo e data como dois itens flex, como no v4; teste ajustado para ler o texto do elemento | 1 |
| Ilustração, h1 26px, parágrafo | idem | idem | sem diferença | — |
| Sem jogo e sem elenco | ilustração sem a pílula | cartão "Nenhum jogo marcado" | intencional: sem jogo a API pública não devolve elenco | — |

## (9) Membro com elenco, sem sorteio

| O quê | Protótipo | App | Correção / situação | Rodada |
|---|---|---|---|---|
| Card "Os times ainda não foram sorteados" | 334×253,4 em 390px | idem | sem diferença | — |
| Elenco 20px mais acima em 390px | y 586,4 | y 566,4 | B6 | 1 |

## Cabeçalho e celular

- Altura medida do cabeçalho: **73,4px** nos dois lados, com a linha do jogo (14 + 14 + 43,4 da coluna de texto + 1 de borda). A nota "~66px" do brief não confere com a renderização, mas o app acompanha o protótipo, inclusive no `calc(100vh - 66px)` do login e do Membro sem elenco.
- 390px: nenhum estado tem rolagem horizontal (`scrollWidth` = 390 em todos). As quebras de linha do cabeçalho, do cartão do jogo, de "Times" e dos botões ficam iguais.

## Decididas pelo organizador (Task 16)

1. **Chip "N times × M" no Membro.** Decidido: a resposta pública passa a expor `teamCount` e `teamSize`, e o Membro mostra "N times × M" ao lado de "Times".
2. **Elenco do Membro com estrelas ocultas.** Decidido: o aside "Elenco" continua visível sem estrelas (mantém a lista de quem está "fora", decisão 2 da spec), diferente do v4.
3. **Contraste do "fora".** Decidido: o "fora" foi escurecido para neutral-400 (cerca de 9,2:1, antes 2,2:1) e deixou de receber a opacidade da linha. Diferença intencional em relação ao v4.

## O que o app faz diferente de propósito (decisões da spec)

- Botões contornados do DS (o primário não é preenchido), iguais ao v4.
- Vocabulário "jogadores" no lugar de "convocados" ("N de M jogadores", resumo do modal, dicas).
- Confirmação de exclusão: "Pagamentos e sorteio serão perdidos."
- Chip relativo ("Hoje / Amanhã / Em N dias / Já aconteceu") por dia de calendário, no horário de Brasília.
- Login sem a linha do jogo no cabeçalho e sem a nota de demonstração.
- Rótulos acessíveis com o nome ("Pagou: Ana", "Nome de Ana", "Remover Ana"), h2 nos cards de time, `role="img"` nas estrelas.
- Seletor "Mover para" sempre visível nas linhas dos times e nos chips de reserva.
- "Membro vê as estrelas" no rodapé do Elenco do admin (+45px).
- "Marcar todos" e "Limpar" desabilitados e "Cadastre a data do jogo primeiro" quando não há jogo.
- Sem estrelas, a API pública ordena times e reservas por nome.
