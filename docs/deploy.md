# Publicação no Cloudflare

Guia para publicar o Montar Times no Cloudflare Pages (site + API) com banco D1. O plano gratuito é suficiente para este uso.

Pré-requisitos: Node instalado, dependências instaladas (`npm install`) e uma conta gratuita em <https://dash.cloudflare.com/sign-up>.

## Rodando localmente

Para testar tudo (site, API e banco) antes de publicar:

1. Copie `.dev.vars.example` para `.dev.vars` e preencha `ADMIN_PASSWORD` e `SESSION_SECRET` com valores de teste (o arquivo é ignorado pelo git).
2. `npm run db:migrate:local` cria o banco D1 local (em `.wrangler/state`) e aplica as migrations.
3. `npm run dev:pages` faz o build e sobe o site com a API em <http://localhost:8788>.

O `npm run dev` (Vite) continua existindo para mexer só no front; ele encaminha `/api` para a porta 8788, então deixe o `dev:pages` rodando junto.

## Publicação (rodada por você)

### 1. Login

```bash
npx wrangler login
```

Abre o navegador para autorizar o wrangler na sua conta.

### 2. Criar o banco D1

```bash
npx wrangler d1 create montar-times
```

O comando imprime um `database_id`. Copie-o para `wrangler.toml`, no lugar de `REPLACE_WITH_ID_FROM_wrangler_d1_create`.

### 3. Aplicar as migrations no banco remoto

```bash
npx wrangler d1 migrations apply montar-times --remote
```

### 4. Criar o projeto Pages

```bash
npx wrangler pages project create montar-times --production-branch main
```

### 5. Definir os segredos

```bash
npx wrangler pages secret put ADMIN_PASSWORD --project-name montar-times
npx wrangler pages secret put SESSION_SECRET --project-name montar-times
```

Cada comando pede o valor. Use uma senha de administrador forte e longa. Para o `SESSION_SECRET`, gere um valor aleatório com pelo menos 32 caracteres, por exemplo `openssl rand -hex 32`, e guarde-o em um gerenciador de senhas. Ele assina o cookie de sessão; quem o conhecer consegue forjar sessões de administrador.

### 6. Ligar o D1 ao projeto Pages

Como o `wrangler.toml` tem `pages_build_output_dir`, o wrangler o trata como configuração do projeto Pages e o bloco `[[d1_databases]]` (binding `DB`) é aplicado no deploy. Não é preciso configurar nada no painel; se o binding não aparecer, confira em Workers & Pages > montar-times > Settings > Bindings (ou Functions > D1 database bindings) e adicione `DB` apontando para o banco `montar-times`. Observação: com `wrangler.toml` presente, o painel passa a ser somente leitura para os bindings definidos no arquivo. Os segredos (passo 5) continuam sendo definidos por comando.

### 7. Build e deploy

```bash
npm run build
npx wrangler pages deploy dist --project-name montar-times
```

O comando imprime a URL (`https://montar-times.pages.dev` ou parecida). Como o ramo de produção é `main`, publique a partir do ramo `main` ou acrescente `--branch main` para que seja o deploy de produção.

## Verificação depois do deploy

Troque `<site>` pela URL publicada.

```bash
# 1. Sem jogo ativo, devolve null
curl -s https://<site>/api/game

# 2. Rota de administrador sem login devolve 401
curl -i -X POST -H 'Content-Type: application/json' -d '{"name":"x","rating":3}' https://<site>/api/admin/players

# 3. Login com senha errada devolve 401; com a certa, 200 e Set-Cookie com HttpOnly; Secure; SameSite=Strict
curl -i -X POST -H 'Content-Type: application/json' -d '{"password":"errada"}' https://<site>/api/admin/login
```

Depois, pelo navegador:

1. Abra `/admin` e entre com a senha.
2. Cadastre o jogo de hoje e três jogadores, marque os três como pagos e sorteie.
3. Abra `/` em uma aba anônima e confira os times.
4. Com a opção "Membro vê as estrelas" desligada, as notas não podem aparecer para o público:

```bash
curl -s https://<site>/api/game | grep -c rating   # deve imprimir 0
```

Com a opção ligada, o mesmo comando imprime 1 (há um jogo ativo).

Também vale conferir que 6 tentativas seguidas de senha errada fazem o login responder 429.

## Manutenção

- Trocar a senha de administrador: rode de novo `npx wrangler pages secret put ADMIN_PASSWORD --project-name montar-times` e faça um novo deploy (`npx wrangler pages deploy dist --project-name montar-times`) para o segredo valer. As sessões já abertas continuam válidas até expirarem (30 dias), a menos que você troque também o `SESSION_SECRET`, o que invalida todas as sessões.
- Novas migrations: `npx wrangler d1 migrations apply montar-times --remote`.
