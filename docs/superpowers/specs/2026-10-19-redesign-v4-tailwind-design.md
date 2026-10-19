# Redesign v4 + Tailwind — spec

Data: 2026-10-19 · Status: rascunho para aprovação · Complementa `2026-10-19-montar-times-design.md` (o app já existe e passa em 335 testes).

Convenção: o que o organizador decidiu está escrito como regra. O que é decisão minha está marcado como **[decisão minha]** e pode ser trocado.

## 1. Intenção

O designer atualizou o protótipo para o **v4** (`docs/prototype/Montar Times v4.dc.html`, versão final de hoje). O organizador quer o app **extremamente fiel** a esse design e escrito com **Tailwind CSS** (hoje usa CSS puro em `src/web/theme.css` e estilos inline).

O brief de fidelidade, com todos os valores literais (tokens, medidas, textos, estados, tradução para classes Tailwind), está em `docs/prototype/v4-design-brief.md`. **Ele é a fonte da verdade visual**; esta spec só fixa decisões e escopo. O CSS do design system está em `docs/prototype/nocturne-styles.css` e a ilustração do estado vazio do Membro em `public/images/membro-elenco-vazio.webp` (720×540).

Sucesso: abrindo o v4 e o app lado a lado, nos mesmos tamanhos de tela (largura 1440 e 390), um designer não acha diferença de layout, cor, tipografia, espaçamento, ícones, textos ou estados.

## 2. Objetivos

- Todas as telas (login do administrador, painel do administrador, visão do Membro, estado vazio do Membro, modal) idênticas ao v4.
- Estilização 100% em Tailwind v4 (plugin `@tailwindcss/vite`, `@import "tailwindcss"`, `@theme` com os tokens do v4). Sem CSS de componente à mão, exceto o que Tailwind não cobre (por exemplo `:focus-visible` das estrelas).
- Os comportamentos novos que o v4 exige (seção 4) implementados no frontend **e** no backend.
- O app continua passando em todos os testes, atualizados quando o texto ou o comportamento mudar.
- Fonte Inter carregada como no design system.

## 3. Fora do escopo

- Tema escuro (o v4 só tem o claro).
- Tela de histórico.
- Qualquer mudança nas regras de negócio além das listadas na seção 4.
- Reproduzir andaimes da ferramenta de design (`image-slot`, `DCLogic`, `sc-if`, `sc-for`).

## 4. Decisões

Respostas do organizador:

1. **Horário do jogo: implementar.** O jogo passa a ter data + hora ("19:00"): migração, tipos, API, cabeçalho ("Sábado, 17 de outubro · 19:00"), card do jogo ("às 19:00", campo Hora ao editar) e texto do WhatsApp.
2. **Vocabulário: "jogadores".** Onde o v4 diz "convocados", o app diz "jogadores" ("N de M jogadores", "Quem vai jogar"). O significado não muda: a caixa continua sendo a confirmação de pagamento e só quem está marcado entra no sorteio. O rótulo acessível da caixa continua "Pagou: {nome}". No Membro, "Pago/Aguardando" vira "fora" (11px, como no v4) para quem não pagou **[decisão minha, conforme proposta 5.2 do brief]**.
3. **"Marcar todos" e "Limpar": incluir, como no v4.** Exige um endpoint novo (seção 5).
4. **Nota mínima de 0,5 estrela.** O servidor passa a aceitar de 0,5 a 5 em passos de 0,5; a primeira estrela dá meia nota.

Decisões minhas (o brief propõe, ninguém contradisse):

- **Botões como no design system:** o botão primário é **contornado** (borda e texto na cor de destaque, fundo transparente), o "ghost" é só texto, raios sm 4px / md 8px / lg 12px. O app hoje usa botões preenchidos e raios maiores, então isso muda a aparência de todos os botões.
- **Confirmação de exclusão do jogo** em card (como no v4), mas com o texto **verdadeiro** do app: "Pagamentos e sorteio serão perdidos." A frase do v4 ("Os times sorteados continuam salvos.") não é verdade aqui.
- **Onde ficam as coisas que o v4 não desenha:** "Membro vê as estrelas" como linha no rodapé do card "Elenco" do administrador; erros de API em alerta dourado (`gold-tint`), "Tentar de novo" como botão ghost; "Cadastre a data do jogo primeiro" como texto de apoio de 12px abaixo de "Montar times". Login: o v4 já o desenha. Cabeçalho no login: só "Escalação" e "Acesso restrito", sem a linha do jogo (o jogo é dado do administrador).
- **Acessibilidade mantida onde o v4 é genérico:** rótulos com o nome do jogador ("Pagou: Ana", "Remover Ana"), `aria-label` das estrelas, `role="status"` e `role="alert"`, foco visível (o v4 desliga o contorno do input da linha; o app mantém `focus-visible`), seletor "Mover para" e arrastar-e-soltar, só um `h1` por tela.
- **Fonte Inter** via `<link>` do Google Fonts no `index.html` (como o design system faz). Isso faz o navegador pedir a fonte a um servidor do Google.
- **Hora e "no passado":** a regra de criação continua olhando só a data (não se pode cadastrar um dia que já passou). O jogo continua terminando no fim do dia da data. A hora é informativa: aparece no cabeçalho, no card, no WhatsApp e no chip "Hoje / Amanhã / Em N dias / Já aconteceu".

## 5. Mudanças de backend

- **Hora:** coluna `game_time TEXT NOT NULL DEFAULT '19:00'` em `games`, formato `HH:MM` (00:00 a 23:59), validado. `Game` e `PublicGame` ganham `time`. `POST /admin/game` e `PATCH /admin/game` recebem `{ date, time }` (`time` opcional, padrão '19:00'). O snapshot do histórico guarda a hora. O texto do WhatsApp usa "às HH:MM". A migração inicial pode ser editada (nenhum banco remoto existe ainda).
- **Marcar todos / Limpar:** `PUT /admin/game/paid-all` com `{ paid: boolean }`. `true` marca todos os jogadores não arquivados como pagos; `false` desmarca todos e limpa times, reservas e travas do sorteio gravado. Atômico e dentro do protocolo de `revision` já existente; devolve o `Game`. Sem jogo ativo: 404.
- **Nota 0,5:** validação do servidor de 0,5 a 5 em passos de 0,5 (hoje 1 a 5). A coluna já é `REAL`.
- **Equilíbrio de 3 níveis e cores por time** são só frontend (funções puras).

## 6. Como será entregue

Duas etapas, nesta ordem, cada uma com testes verdes:

- **Etapa A: restilização com Tailwind, sem mudar texto nem comportamento.** Tokens, base, botões e campos, cabeçalho, layout, card "Elenco", cards de time, reservas, "Mandar no grupo", modal, login, card do jogo (visual), estado vazio. Os 335 testes passam sem edição (nenhum teste olha CSS; duas exceções documentadas no brief: a classe `star-hit` e o `boxShadow` inline do destaque ao arrastar).
- **Etapa B: comportamento e texto novos**, cada item com teste: hora do jogo (migração, API, UI), marcar todos/limpar, barra de equilíbrio e 3 tons, onboarding "Monte os times em três passos", estado "Membro sem elenco" com a ilustração, nota 0,5, vocabulário "jogadores", "fora" no Membro. Os testes que dependem de texto são atualizados na mesma passada.
- **Verificação visual de fidelidade, no fim:** renderizar o v4 e o app no navegador, nos mesmos estados e tamanhos (1440 e 390 de largura), comparar e corrigir as diferenças até não sobrar nenhuma visível.

## 7. Restrições

- Tailwind v4 com `@tailwindcss/vite`; sem biblioteca de componentes.
- Nenhum teste existente enfraquecido: se um teste muda, é porque o texto ou o comportamento pedido mudou.
- Os módulos puros (`src/shared`) continuam sem dependência de DOM.
- Custo zero de hospedagem, como antes. A fonte do Google é a única dependência externa nova no navegador.

## 8. Deixado para quem for construir

- Divisão em componentes e nomes das classes utilitárias; `@layer components` apenas onde repetir classes for pior.
- Como medir "idêntico" no navegador (capturas lado a lado), desde que cubra os estados do v4: login, painel vazio (onboarding), painel com times, modal, Membro com times, Membro sem elenco, e o cartão do jogo nos quatro estados.

## 9. Perguntas em aberto

Nenhuma que bloqueie. Pontos para o organizador conferir: botões contornados em vez de preenchidos, a frase de exclusão do jogo, a posição de "Membro vê as estrelas", e a fonte do Google.
