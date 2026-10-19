# Montar Times — spec do projeto (frontend + backend)

Data: 2026-10-19 · Status: rascunho para aprovação

Convenção: o que o organizador disse está escrito como regra. O que é decisão minha está marcado como **[decisão minha]** e pode ser trocado.

## 1. Intenção

O organizador de um grupo de vôlei amador hoje sorteia os times na mão, manda o resultado no WhatsApp e vai atualizando a lista de jogadores conforme o pessoal paga. A aplicação substitui isso: o organizador cadastra a data do jogo, confirma quem pagou, sorteia times equilibrados e o grupo consulta tudo por um link fixo, sem login.

Sucesso significa que, no dia do jogo, o organizador monta os times em poucos cliques e cada pessoa abre o mesmo link e vê em que time está, sem precisar de mensagem avulsa.

## 2. Objetivos

- O organizador (único administrador) entra com uma senha só dele e gerencia jogadores, pagamentos, data do jogo e sorteio.
- Um link fixo e público mostra o jogo atual para qualquer pessoa, só para leitura.
- Cada jogo tem uma data. Só quem está com pagamento confirmado entra no sorteio.
- Ao fim do dia da data do jogo, a aplicação finaliza o jogo sozinha: grava o sorteio no histórico e zera pagamentos e times.
- O sorteio é configurável: número de times (2 a 8), jogadores por time (1 a 12), reservas, travar jogador em um time, ajuste arrastando e botão "Copiar escalação" para WhatsApp. Tudo isso já existe no protótipo `Montar Times v3.dc.html` do projeto Claude Design.
- Custo de hospedagem zero.

## 3. Fora do escopo (por enquanto)

- Regras "manter juntos" e "separar" entre jogadores.
- Tela de histórico. O histórico só é gravado no backend, apenas como registro.
- Login ou conta para Membros.
- Vários grupos ou vários administradores.
- Membros marcando que pagaram. Isso fica só com o administrador.

## 4. O que seria uma falha mesmo "funcionando"

- O Membro conseguir ver as notas dos jogadores quando o administrador as escondeu, por exemplo olhando a resposta da API.
- Alguém sem a senha conseguir alterar qualquer dado.
- O jogo não finalizar, ou finalizar duas vezes e duplicar o histórico.
- Pagar custo de hospedagem sem o organizador ter decidido.

## 5. Quem usa

**Administrador.** Uma pessoa, uma senha. Faz tudo.

**Membro.** Sem login. Abre o link fixo e vê: a data do jogo, a lista de jogadores com o status de pagamento **[decisão minha: o Membro vê quem já pagou]**, e, depois do sorteio, os times e as reservas. As estrelas só aparecem se o administrador ativar essa opção, que vale para o link inteiro **[decisão minha]**. Se não houver jogo cadastrado, mostra "Nenhum jogo marcado" **[decisão minha]**.

## 6. Modelo de dados

- **Jogador:** id, nome, nota (1 a 5, passo 0,5), arquivado (sim/não). Existe para sempre e é reaproveitado entre jogos. Remover um jogador apenas o arquiva, para o histórico manter o nome **[decisão minha]**.
- **Jogo:** id, data, estado (ativo ou finalizado), configuração do sorteio (número de times, jogadores por time), times, reservas, travas. Só existe um jogo ativo por vez **[decisão minha]**.
- **Pagamento:** (jogo, jogador) está pago ou não. Um jogador novo cadastrado com o jogo aberto começa como não pago **[decisão minha]**.
- **Configuração geral:** mostrar estrelas ao Membro (sim/não).
- **Histórico:** para cada jogo finalizado, uma cópia congelada com data, nomes, notas, quem pagou, times, reservas e configuração do sorteio, mais o momento da finalização. Não depende dos jogadores continuarem existindo.

## 7. Comportamentos

**Criar jogo.** O administrador informa a data. Se já houver um jogo ativo, só pode criar outro depois que ele finalizar ou for excluído **[decisão minha]**. Data no passado é recusada.

**Confirmar pagamento.** Só o administrador marca e desmarca. Desmarcar quem já está num time o tira do sorteio ao sortear de novo.

**Sorteio.** Usa apenas jogadores com pagamento confirmado. Quem passar das vagas (times × jogadores por time) vira reserva, com prioridade para quem ficou de fora no sorteio anterior. Jogadores travados ficam no time escolhido. Com times de tamanhos diferentes, o equilíbrio compara a média por jogador, não a soma. O algoritmo continua rodando no navegador do administrador, como no protótipo, e o servidor só valida e guarda o resultado **[decisão minha]**. O servidor recusa times com jogadores inexistentes, sem pagamento confirmado ou repetidos.

**Finalização automática.** O jogo termina às 00:00 do dia seguinte à data cadastrada, no horário de Brasília (America/Sao_Paulo). Não há tarefa agendada: na primeira requisição (de qualquer pessoa) depois desse momento, a API finaliza o jogo **[decisão minha]**. Finalizar é uma única transação: grava a cópia no histórico, marca o jogo como finalizado e zera pagamentos e times. Precisa ser seguro se duas requisições chegarem juntas, de forma que o histórico nunca seja duplicado. Depois disso o link mostra "Nenhum jogo marcado" até o administrador cadastrar a próxima data.

**Histórico.** Só gravado. Sem tela e sem endpoint público. O administrador pode ler por um endpoint protegido que fica pronto para uma tela futura **[decisão minha]**.

## 8. Segurança

- Uma senha de administrador, guardada como segredo de ambiente na hospedagem (nunca no código).
- `POST /api/admin/login` confere a senha e devolve um cookie `HttpOnly`, `Secure`, `SameSite=Strict`, assinado, com validade de 30 dias **[decisão minha]**. Tentativas de login são limitadas (por exemplo 5 erradas em 15 minutos) **[decisão minha]**.
- Toda rota de escrita e todas as rotas `/api/admin/*` exigem o cookie.
- A rota pública nunca devolve as notas quando a opção está desligada. Essa decisão é feita no servidor, não escondendo no navegador.
- O link do Membro é público e fixo, sem senha. Esse risco foi aceito pelo organizador.

## 9. Tecnologia

Escolhida por custo zero e simplicidade. Tudo isso é **[decisão minha]**:

- **Frontend:** React com Vite, partindo do protótipo do Claude Design, mantendo a aparência (tema claro, dourado nas estrelas).
- **Hospedagem, API e banco:** Cloudflare Pages para o frontend, funções do Cloudflare para a API e Cloudflare D1 (SQLite) para o banco, tudo no plano gratuito. Sem pausa por inatividade.
- **Atualização da tela do Membro:** a página consulta a API a cada 30 segundos e quando volta ao primeiro plano **[decisão minha]**.

## 10. API (esboço)

Pública (leitura):
- `GET /api/game` → data, jogadores (nome, pago; nota só se permitido), times, reservas. Finaliza o jogo vencido antes de responder.

Administrador (cookie obrigatório):
- `POST /api/admin/login`, `POST /api/admin/logout`
- `GET/POST/PATCH/DELETE /api/admin/players`
- `POST/PATCH/DELETE /api/admin/game` (data) e `PUT /api/admin/game/paid` (marcar pagamento)
- `PUT /api/admin/game/draw` (grava times, reservas, travas e configuração)
- `PATCH /api/admin/settings` (mostrar estrelas ao Membro)
- `GET /api/admin/history`

## 11. Telas

- **Membro:** uma única página com a data, a lista de jogadores e os times (reaproveita a visão de Membro do protótipo).
- **Administrador:** tela de login e, depois, a visão do protótipo v3 (jogadores, sorteio, reservas, travas, copiar escalação), com a adição de: campo para a data do jogo, marcação de pagamento em cada jogador e a opção "Membro vê as estrelas".

## 12. Deixado para quem for construir

- Estrutura de pastas, nomes das tabelas e dos campos, formato exato das respostas.
- Como medir o horário de Brasília com segurança no código.
- Estilo dos estados de erro e de carregamento.
- Testes: o algoritmo de sorteio, a finalização do jogo (incluindo duas requisições juntas) e a regra de esconder as notas merecem teste automático.

## 13. Perguntas em aberto

Nenhuma que bloqueie o planejamento. Pontos que o organizador pode querer trocar: o Membro ver quem pagou, e o jogo só poder ser criado depois que o anterior finalizar.
