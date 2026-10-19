# Notas do Tailwind v4 (Task 1)

Arquivo: `src/web/styles.css` (importado depois de `theme.css` em `main.tsx`; `theme.css` sai na Task 8).

## Chaves do `@theme static` (nome -> valor)
- Cores base: `bg` #e4e7f5, `surface` #f3f5fe, `text` #292b31, `accent` #344b78, `navy` #24365a, `navy-ink` #f3f5fe, `navy-muted` #c7d4ea, `divider` #cfd3e5 (decisão do plano), `line` #b2b6ca, `ink-on-gold` #172339.
- Gold: `gold` oklch(0.80 0.15 82), `gold-ink` oklch(0.50 0.11 70), `gold-soft` oklch(0.86 0.11 85), `gold-shade` oklch(0.62 0.13 70 / 0.45), `gold-empty` oklch(0.90 0.02 85), `gold-tint` oklch(0.95 0.05 88).
- `neutral-100..900` (INVERTIDA): #292b31, #3f424d, #595d6c, #3f424d, #595d6c, #b2b6ca, #cfd3e5, #cfd3e5, #cfd3e5.
- `accent-100..900` e `accent-2-100..900` (INVERTIDAS): #172339, #24365a, #344b78, #4a6496, #7189b8, #9fb2d4, #c7d4ea, #e1e9f6, #f2f6fc.
- Raios: `sm` 4px, `md` 8px, `lg` 12px.
- Sombras: `sm` 0 0 0 1px #cfd3e5; `md` 0 0 0 1px #cfd3e5, 0 6px 18px rgba(41,43,49,.12); `lg` 0 0 0 1px #b2b6ca, 0 16px 40px rgba(41,43,49,.18); `drop` 0 0 0 2px var(--color-accent), 0 8px 24px rgba(36,54,90,.18); `drop-sm` 0 0 0 2px var(--color-accent).
- Fontes: `sans` e `heading` = Inter, system-ui...
- `--color-*`, `--radius-*` e `--shadow-*` padrão do Tailwind foram zerados (`initial`): `rounded-xl`, `bg-red-500`, etc. não existem mais.

## Variáveis cruas em `:root`
`--navy`, `--navy-ink`, `--navy-muted`, `--gold*` (6), `--font-body`, `--font-heading-weight`, `--space-1..8`. As demais (`--color-*`, `--shadow-*`, `--radius-*`, `--color-divider`) saem do `@theme static` (emitido sempre em `:root`).

## Classes de componente (`@layer components`)
`.btn`, `.btn-primary` (contornado), `.btn-secondary`, `.btn-ghost`, `.btn-icon`, `.btn-block`, `.input` (+ `textarea.input`), `.field > label`, `.tag`, `.tag-accent`, `.tag-neutral`, `.tag-outline`, `.hr`. Valores copiados literalmente de `nocturne-styles.css`.

## Base (`@layer base`)
box-sizing, `body` 15px/1.55/Inter, `h1..h6` (42/32/25/20/16/13px), `p`, `a` (#4a6496, hover #172339, como o `<style>` do v4), `img`, `:focus-visible`, `::selection`.

## Desvios e observações
- `--color-divider` = #cfd3e5 (plano), não o valor do DS (quase invisível no claro).
- `.tag-accent-2`, `.seg`, `.card`, `.dialog`, `.nav`, `.table`, `.radio` NÃO foram portados (o v4 não os usa e a tarefa não os listava); `.tag-accent`/`.tag-neutral` usam as escalas invertidas, então ficam claros com texto escuro.
- `--color-accent-2` (#a7a1db) e `--color-section*` não foram definidos (não usados).
- `a` usa as cores literais do `<style>` do v4 em vez de `var(--color-accent)` do DS.
- Convivência com `theme.css`: as regras dele são fora de camada e vencem as de `@layer components` com mesma especificidade (ex.: `.btn-primary` ainda sai preenchido nos componentes antigos até a Task 8). Utilitários e `:root` do `styles.css` (importado depois) prevalecem.
