# GameRoom — Verificação de estado e o que falta para o MVP

> Auditoria executada em 04/09/2026 sobre o repositório `foxtecnologiaonline/gameroom`
> (todas as branches), os projetos Vercel vinculados e a conta Supabase.
> Todas as afirmações de "compila / passa" abaixo foram verificadas rodando os
> comandos, não inferidas do código.

---

## 1. Sumário executivo

O GameRoom **está muito mais pronto do que parece à primeira vista** — e esse é
exatamente o problema. O backend NestJS implementa as três fases da
especificação técnica v2 (produtos, estoque serializado com concorrência,
checkout, webhook idempotente, emissão, devoluções com estorno, antifraude,
auditoria) e compila e passa nos testes. O frontend real, integrado a esse
backend, também compila.

Só que **nada disso está no ar**, e o motivo não é o código:

1. A branch em que esta sessão foi aberta (`claude/gameroom-mvp-verificacao-71ez7a`)
   é **órfã** — não tem ancestral comum com `main`. Ela carrega um *segundo*
   frontend, na raiz do repositório, escrito contra uma API inventada, porque
   quem o construiu não enxergou o backend que já existia (o próprio README
   dele diz isso).
2. Os dois projetos Vercel apontam para a **raiz** do repositório. Como no
   `main` o Next.js mora em `frontend/`, **todo deploy de `main` falha** com
   `Couldn't find any 'pages' or 'app' directory`. O único deploy que subiu foi
   o da branch órfã — ou seja, a vitrine que está publicada é a que **não** fala
   com o backend.

Em resumo: o produto está a **uma configuração de deploy e um gateway de
pagamento** de ser um MVP operável, não a meses de desenvolvimento.

---

## 2. Mapa real do repositório

| Branch | Conteúdo | Relação com `main` |
|---|---|---|
| `main` (`f5d25a5`) | Backend NestJS + frontend Next.js em `frontend/` + spec + docker-compose (163 arquivos) | tronco |
| `claude/mvp-checklist-tasks-xd7lt1` (`db15830`) | `main` + 5 commits: escopo do MVP ajustado, `DIRECT_URL` p/ Supabase, migração **BullMQ+Redis → Upstash QStash**, CORS configurável, `vercel.json` | **estado mais avançado** |
| `claude/gameroom-marketplace-scope-6ucu9o` | `main` + `docs/marketplace-roadmap.md` (diagnóstico do pivot marketplace, sem código) | +1 commit |
| `claude/digital-assets-platform-c9olg1` | ancestral de `main` | histórico |
| `claude/digital-assets-frontend-ieoyef` | frontend paralelo na raiz, contrato de API inventado | **órfã** |
| `claude/gameroom-mvp-verificacao-71ez7a` | idêntica à anterior (branch desta sessão) | **órfã** |

`git merge-base origin/main HEAD` → sem ancestral comum. As duas últimas
branches são um repositório paralelo dentro do mesmo repositório.

---

## 3. O que está pronto (verificado)

### Backend (`backend/`, branch `mvp-checklist`)

Comandos executados: `npm ci` ✅ · `prisma generate` ✅ · `nest build` ✅ ·
`jest` ✅ **12 testes / 3 suítes, todos passando**.

- **Modelo de dados completo** — schema Prisma com as 11 tabelas da §3 da spec
  (+ `RetencaoFraude`), 3 migrations versionadas.
- **Todos os endpoints da §6 da spec estão implementados**, mais os extras de
  antifraude e simulação de pagamento.
- **Concorrência tratada de verdade**: reserva com `SELECT … FOR UPDATE SKIP
  LOCKED`, reabastecimento sob `pg_advisory_xact_lock`, contagem de "pipeline"
  (`disponivel` + `aguardando_codigo`) para não gerar lotes duplicados.
- **Webhook de pagamento**: assinatura HMAC obrigatória + idempotência por
  `gateway_transacao_id` único; reentrega não gera segunda emissão.
- **Cifragem AES-256-GCM** do código de licença em repouso, com hash
  determinístico para deduplicar importação sem decifrar, e log de auditoria em
  toda leitura em claro.
- **Devoluções**: aprovação automática (prazo de 7 dias do CDC + ausência de
  registro em `acessos_conteudo`), fila de revisão manual como exceção, estorno
  disparado como job. Unidade aprovada vai para `bloqueado`, não volta a
  `disponivel` — decisão correta, o código já foi enviado por e-mail.
- **Antifraude**: retenção por velocity (5 pedidos/h) e por histórico de
  devoluções (2 em 30 dias), com fila de decisão do admin.
- **Fila 100% serverless**: jobs publicados como mensagens HTTP no Upstash
  QStash, com assinatura verificada no callback, retry 5× nos jobs críticos
  (emissão, estorno, nota fiscal) e 3× nos demais, e `failureCallback` para
  falha esgotada.
- **Observabilidade e hardening**: `x-request-id`, log estruturado por
  requisição, `helmet`, throttler global (60 req/min; 5/min no checkout,
  10/min no login), filtro global de exceções.

### Frontend real (`frontend/`, branch `mvp-checklist`)

`npm ci` ✅ · `next build` ✅ — **17 rotas**. Loja pública, checkout com
polling, área do cliente, e painel admin cobrindo produtos, estoque,
importação de códigos, pedidos, devoluções, **fraude**, reabastecimentos e
**auditoria**.

### Frontend órfão (raiz, branch atual)

`tsc --noEmit` ✅ · `next lint` ✅ (zero avisos) · `next build` ✅ — **21 rotas**.
Visualmente é o mais refinado dos dois (hero, skeletons, capa gerada por
gradiente + monograma, selos de confiança, `AuthShell`). **Mas o contrato de
API é fictício** — ver §5.

---

## 4. O que falta para o MVP

### 4.1 Bloqueadores (sem isso não há MVP)

| # | Bloqueio | Evidência |
|---|---|---|
| B1 | **Deploy quebrado por configuração**, não por código | Todos os deploys de `main` e `mvp-checklist` em `ERROR`: `Couldn't find any 'pages' or 'app' directory at /vercel/path0`. Os 2 projetos Vercel têm Root Directory na raiz; o Next mora em `frontend/` |
| B2 | **Frontend errado publicado** | Único deploy `READY`/`production` = `dpl_Ggq8…`, commit `e254f4e` da branch órfã. Ambos os projetos com `"live": false` |
| B3 | **Não existe gateway de pagamento** | `POST /pedidos` não devolve `checkoutUrl` — não há como o cliente pagar. O fluxo só fecha via `POST /webhooks/pagamento/simular/:pedidoId`, protegido por login de admin |
| B4 | **E-mail não é enviado de verdade** | `ConsoleEmailProvider` apenas loga. Como a entrega do MVP *é* o e-mail com usuário/senha, o produto não entrega nada |
| B5 | **Banco não provisionado** | Nenhum projeto Supabase do gameroom existe na conta (só `mycollect` e `ZapScript`) |
| B6 | **Titularidade de compra por e-mail não verificado** | `/minhas-compras`, `…/codigo` e a devolução autorizam pelo `email` do JWT; `POST /auth/registrar` aceita qualquer e-mail **sem verificação**. Cadastrar-se com o e-mail de um comprador dá acesso à licença dele |

### 4.2 Lacunas relevantes (não impedem abrir, mas cobram caro depois)

- **2FA de admin não existe.** O campo `totpSecretCifrado` está no schema, mas
  não há uma linha de código de TOTP — e a spec o exige (admin vê código em
  claro e dados financeiros).
- **Nada de LGPD.** Nenhum endpoint de exclusão/anonimização, previsto na §8.
- **Estorno e nota fiscal são providers de console** — aprovar uma devolução
  hoje não devolve dinheiro nenhum.
- **Sessão morre em 15 minutos.** O frontend guarda o `refreshToken` mas
  **nunca chama `/auth/refresh`**.
- **`GET /pedidos/:id` é público** e devolve `compradorEmail`.
- **CORS fica aberto** se `CORS_ORIGIN` não for definido.
- **Sem CI.** Não há `.github/workflows`. Nada impede um merge quebrado.
- **Cobertura de teste estreita.** Os 12 testes cobrem cifragem e assinaturas;
  não há teste de serviço para pedidos, estoque, devoluções ou fraude. As 2
  suítes e2e (health e concorrência) exigem Postgres e **não puderam ser
  executadas neste ambiente**. Zero teste no frontend.
- **A schedule de reabastecimento do QStash é provisionamento manual** — se
  esquecerem, o job de segurança a cada 5 min simplesmente não roda.
- **Risco não validado**: `rawBody: true` sob o proxy zero-config da Vercel. Se
  falhar, a verificação de assinatura do webhook e do QStash quebra em produção.
- **4 decisões de negócio em aberto** (§12 da spec): fornecedor dos códigos,
  regra exata de devolução, política de estorno e se a nota fiscal entra no MVP.

---

## 5. O frontend órfão não conversa com o backend

Se alguém tentar apontar o frontend da raiz para a API real, praticamente tudo
quebra:

| Frontend órfão espera | Backend real oferece |
|---|---|
| `POST /auth/register` | `POST /auth/registrar` |
| login → `{ access_token, usuario }` | login → `{ accessToken, refreshToken }` (sem `usuario`) |
| `POST /checkout` | `POST /pedidos` |
| `GET /vendas/:id` | `GET /pedidos/:id` |
| `GET /minhas-compras/:vendaId` | não existe |
| `POST /devolucoes` | `POST /itens-pedido/:itemPedidoId/devolucoes` |
| `GET /admin/vendas` | `GET /admin/pedidos` |
| `PATCH /admin/devolucoes/:id/aprovar\|rejeitar` | `POST /admin/devolucoes/:id/decisao` |
| `POST /checkout/webhook/simular` | `POST /webhooks/pagamento/simular/:pedidoId` |
| `GET /produtos?admin=true` | `GET /produtos/admin/todos` |
| modelo `Venda` (1 venda = 1 produto) | `Pedido` + `ItemPedido` (carrinho multi-item) |
| — | **não tem tela de importar códigos** → produto serializado nunca fica vendável |

O valor dessa branch é **o design**, não o código de integração.

---

## 6. Dez sugestões

1. **Eleger `claude/mvp-checklist-tasks-xd7lt1` como tronco** e mergear em
   `main` hoje. É o único estado que já está desenhado para a stack escolhida
   (Vercel + Supabase + QStash). Enquanto ele viver numa branch, todo trabalho
   novo nasce desalinhado.
2. **Aposentar o frontend da raiz como aplicação e tratá-lo como uma pasta de
   design.** Portar hero, skeletons, `ProductCover` e `AuthShell` para
   `frontend/`, e então apagar as duas branches órfãs, para que ninguém mais
   construa contra a API fictícia.
3. **Escolher o gateway de pagamento esta semana** — é o único bloqueio que
   separa o sistema de faturar. Para o Brasil, Mercado Pago (Pix + cartão, com
   webhook assinado e SDK de estorno) cobre checkout e reembolso com uma só
   integração.
4. **Decidir a titularidade da compra como questão de produto, não de código.**
   Ou o e-mail passa a ser verificado, ou o pedido passa a apontar para um
   `usuarioId`. Hoje o vínculo é um e-mail digitado, e isso vaza licença paga.
5. **Congelar o escopo do MVP no que já está construído.** A spec já marcou
   S3/biblioteca de conteúdo como v2.0 e o marketplace já tem roadmap próprio —
   manter os dois fora até a primeira venda real acontecer.
6. **Provisionar o Supabase antes de mexer na Vercel**, e alinhar a região: o
   `backend/vercel.json` já fixa `pdx1` supondo um Supabase em `us-west-2`. Se
   o projeto nascer em `sa-east-1` (São Paulo), essa escolha vira latência
   desnecessária em todo request.
7. **Colocar CI mínimo antes da próxima feature.** Quatro branches divergentes
   sem nenhum gate automatizado foi exatamente como um frontend inteiro nasceu
   contra uma API que não existe.
8. **Fazer um ensaio geral em sandbox antes de abrir**: cadastrar produto,
   importar códigos, comprar com Pix de teste, receber o e-mail, pedir
   devolução, conferir o estorno. É o teste que valida os pontos que hoje só
   logam no console.
9. **Renomear os projetos Vercel para `gameroom-web` e `gameroom-api`** e
   eliminar a ambiguidade do `gameroom-8152` (criado por engano, ambos
   apontando para o mesmo repositório na mesma raiz).
10. **Fechar as 4 decisões em aberto da §12 da spec** — origem dos códigos,
    regra de devolução, política de estorno e nota fiscal. Nenhuma é técnica, e
    todas travam a operação depois da primeira venda.

---

## 7. Dez soluções

Correções concretas, na ordem em que destravam o MVP.

### S1 — Corrigir o Root Directory na Vercel *(destrava B1 e B2)*

Causa raiz de 100% dos deploys em `ERROR`. Não exige mudar código:

- Projeto **web**: Settings → General → Root Directory = `frontend`
- Projeto **api**: Settings → General → Root Directory = `backend`

O `backend/package.json` já tem o script `vercel-build`
(`prisma generate && prisma migrate deploy && nest build`), então as migrations
rodam no build.

### S2 — Provisionar o banco e os segredos *(destrava B5)*

Criar o projeto Supabase e definir no projeto api: `DATABASE_URL` (pooler,
porta `6543`, com `?pgbouncer=true`), `DIRECT_URL` (direta, `5432`),
`JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CODIGO_ENCRYPTION_KEY`,
`PAGAMENTO_WEBHOOK_SECRET` (`openssl rand -base64 32` cada), `APP_BASE_URL`,
`CORS_ORIGIN` e as três chaves do QStash. Depois, criar a schedule
`*/5 * * * *` apontando para `/jobs/estoque/verificar-reabastecimento` e rodar
o seed do admin.

### S3 — Amarrar a compra ao usuário, não ao e-mail digitado *(fecha B6)*

Adicionar `Pedido.usuarioId` (opcional, para preservar o checkout como
visitante) e passar a autorizar por `usuarioId` quando ele existir, mantendo o
match por e-mail apenas para pedidos de visitante **já verificados**. Em
paralelo, exigir verificação de e-mail no registro (token de uso único com
validade curta). Enquanto a verificação não existir, a correção mínima é: ao
registrar com um e-mail que já tem pedidos, **não** conceder acesso a eles até
a confirmação.

### S4 — Integrar o gateway de pagamento *(fecha B3)*

Criar `PagamentoGateway` no mesmo padrão plugável dos outros providers, com
dois métodos: `criarCheckout(pedido)` → devolve `checkoutUrl` (que `POST
/pedidos` passa a retornar, e o `/checkout/[id]` do frontend passa a exibir) e
`verificarAssinatura(rawBody, headers)` substituindo o
`webhook-signature.util.ts` genérico pela verificação nativa do SDK.
Validar o `rawBody: true` sob a Vercel já no primeiro deploy — se falhar, o
plano B é o adapter `@codegenie/serverless-express`, como o `DEPLOY.md` prevê.

### S5 — Blindar o que é de desenvolvimento *(endurece B3)*

Colocar `POST /webhooks/pagamento/simular/:pedidoId` atrás de uma env
(`PAGAMENTO_SIMULACAO_HABILITADA`), desligada em produção — hoje basta
qualquer conta admin para confirmar um pedido sem pagamento. E restringir
`GET /pedidos/:id`: devolver só status e valor para quem não está autenticado,
sem `compradorEmail`.

### S6 — Implementar o `EmailProvider` real *(fecha B4)*

Uma classe nova em `backend/src/email/` (Resend ou SES) registrada no módulo,
no lugar do `ConsoleEmailProvider`. Sem tocar em mais nada — a interface já
existe. É o que transforma "pedido confirmado" em "produto entregue".

### S7 — Implementar o `RefundGateway` real

Mesmo padrão, em `backend/src/refund/`, usando a API de reembolso do gateway
escolhido em S4. Sem isso, uma devolução aprovada muda status no banco e não
devolve dinheiro — o pior tipo de bug, porque é silencioso e jurídico.

### S8 — Renovação de sessão no frontend

No `frontend/src/lib/api.ts`, interceptar `401`, chamar `POST /auth/refresh`
com o token já guardado, e refazer a requisição uma vez; se o refresh falhar,
aí sim deslogar. Hoje o token está salvo e nunca é usado, e o usuário cai fora
a cada 15 minutos.

### S9 — 2FA de admin e endpoint de LGPD

TOTP com `otplib`, gravando em `Usuario.totpSecretCifrado` (o campo já existe,
basta cifrar com o `EncryptionService` já pronto): enrollment na criação do
admin e verificação como segundo passo do login quando `tipo = 'admin'`. E um
`DELETE /usuarios/me` que anonimiza `nome`/`email` preservando o histórico
fiscal do pedido.

### S10 — CI e testes onde o dinheiro passa

Um workflow do GitHub Actions rodando `lint`, `build`, `jest` e — com Postgres
como service container — as duas suítes e2e que hoje nunca rodam, incluindo o
teste de concorrência. Somar testes de serviço para os quatro caminhos onde um
bug custa dinheiro: reserva sob concorrência, idempotência do webhook,
elegibilidade de devolução e retenção antifraude. Marcar o workflow como
required na `main`.

---

## 8. Caminho mais curto até o MVP no ar

**S1 → S2 → S6 → S4 → S3 → S5** coloca o sistema vendendo e entregando de
verdade. **S7 → S8 → S10 → S9** o torna sustentável. As sugestões 1, 2 e 10
deveriam acontecer em paralelo, porque são organizacionais e não competem por
tempo de desenvolvimento.
