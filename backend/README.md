# Backend — Plataforma de venda e gestão de ativos digitais

Implementação completa das **Fases 1, 2 e 3** da especificação técnica v2 (ver
[`../docs/especificacao-tecnica-v2.md`](../docs/especificacao-tecnica-v2.md)):

- **Fase 1**: setup do projeto, produtos, estoque (com importação/cifragem de
  código), conteúdo, checkout com reserva concorrente, webhook de pagamento
  idempotente, emissão/entrega automática e reabastecimento automático de estoque.
- **Fase 2**: devoluções com aprovação automática (prazo + verificação de uso)
  e estorno via job assíncrono, fila de revisão manual para os casos não
  elegíveis, área do cliente (histórico de compras, acesso a conteúdo/código
  com URLs assinadas) e relatórios do painel admin (vendas, reabastecimentos,
  auditoria).
- **Fase 3**: antifraude (rate limiting + fila de retenção de pedidos de
  risco), observabilidade (request id de correlação + log estruturado por
  requisição), integração de nota fiscal (ponto plugável) e testes
  automatizados de concorrência/idempotência contra Postgres real.

## Stack

NestJS + TypeScript, Prisma (PostgreSQL 15+), Upstash QStash (fila de jobs
assíncronos via HTTP — sem Redis/worker persistente, pensado para rodar em
serverless), JWT (admin/cliente), AES-256-GCM para cifrar códigos de licença
em repouso.

## Setup local

```bash
# fila de jobs (fica rodando; ver a saída para a porta e as chaves de dev)
npx @upstash/qstash-cli dev

npm install
cp .env.example .env   # ajuste DATABASE_URL, QSTASH_* (chaves de dev do
                        # comando acima) e os segredos

# gerar uma chave válida para CODIGO_ENCRYPTION_KEY (32 bytes em base64):
openssl rand -base64 32

npx prisma migrate deploy   # aplica as migrations
ADMIN_SEED_EMAIL=admin@exemplo.com ADMIN_SEED_SENHA="senha-forte" npx prisma db seed

npm run start:dev
```

Requer PostgreSQL rodando e o `qstash-cli dev` de pé, acessíveis pelas
variáveis de ambiente do `.env`.

## Por que existe um seed de admin

`POST /auth/admins` exige um admin já autenticado (ninguém pode se
autopromover a admin por um endpoint público). O seed (`prisma/seed.ts`) cria
o primeiro admin do sistema; a partir dele, novos admins são criados via API.

## Fluxo de exemplo (produto serializado)

```bash
TOKEN=$(curl -s -X POST localhost:3000/auth/login -H 'Content-Type: application/json' \
  -d '{"email":"admin@exemplo.com","senha":"senha-forte"}' | jq -r .accessToken)

# cria produto (dispara geração automática de 300 unidades "aguardando_codigo")
PRODUTO_ID=$(curl -s -X POST localhost:3000/produtos -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{"nome":"Chave Windows 11 Pro","preco":49.90}' | jq -r .id)

# importa códigos reais (de um fornecedor) — só então as unidades ficam "disponivel"
curl -X POST localhost:3000/admin/estoque/$PRODUTO_ID/importar-codigos \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"codigos":["XXXXX-XXXXX-XXXXX"]}'

# ativa o produto (exige ao menos 1 unidade "disponivel")
curl -X PATCH localhost:3000/produtos/$PRODUTO_ID -H "Authorization: Bearer $TOKEN" \
  -H 'Content-Type: application/json' -d '{"status":"ativo"}'

# checkout público (sem login) e confirmação via webhook do gateway
curl -X POST localhost:3000/pedidos -H 'Content-Type: application/json' \
  -d "{\"compradorEmail\":\"cliente@exemplo.com\",\"itens\":[{\"produtoId\":\"$PRODUTO_ID\",\"quantidade\":1}]}"
```

O webhook (`POST /webhooks/pagamento`) exige o header `x-webhook-signature`
com o HMAC-SHA256 do corpo bruto usando `PAGAMENTO_WEBHOOK_SECRET` — ver
`src/pagamento/webhook-signature.util.ts`. Em produção, trocar pela
verificação nativa do SDK do gateway escolhido (Stripe/Mercado Pago/PagSeguro).

## Devoluções (Fase 2)

- `POST /itens-pedido/:itemPedidoId/devolucoes` (cliente autenticado, dono do
  pedido): se dentro do prazo (7 dias corridos da confirmação) e sem nenhum
  acesso registrado a conteúdo/código, aprova automaticamente — bloqueia a
  unidade (o código já foi exposto por e-mail, não é revendido) e enfileira o
  estorno. Caso contrário, fica `pendente` para revisão manual.
- `GET /admin/devolucoes/revisao-manual` + `POST /admin/devolucoes/:id/decisao`
  (admin): decide os casos não elegíveis pela regra automática.
- O evento de "uso" que desqualifica a aprovação automática é registrado pela
  própria área do cliente ao baixar um conteúdo ou visualizar o código
  (`GET /minhas-compras/itens/:itemPedidoId/...`) — ver `AcessoConteudo`.

## Área do cliente e painel admin (Fase 2)

- `GET /minhas-compras`, `GET /minhas-compras/itens/:id/conteudos/:conteudoId`,
  `GET /minhas-compras/itens/:id/codigo` (cliente autenticado; cada leitura de
  código é registrada em `logs_auditoria`).
- `GET /admin/pedidos` (filtrável por `status`), `GET /admin/reabastecimentos`,
  `GET /admin/auditoria` (já existia desde a Fase 1).

## Antifraude e retenção de pedidos de risco (Fase 3)

- Rate limiting (`@nestjs/throttler`) global (60 req/min) e mais restritivo em
  rotas sensíveis: `/auth/login` (10/min), `/pedidos` (5/min), `/webhooks/pagamento` (120/min).
- Após a confirmação do pagamento, `FraudeService` avalia sinais simples e
  explicáveis (≥5 pedidos confirmados na última hora ou ≥2 devoluções
  aprovadas nos últimos 30 dias para o mesmo e-mail). Se houver risco, o
  pedido fica retido — emissão e nota fiscal ficam pendentes até decisão do
  admin.
- `GET /admin/fraude/retencoes` + `POST /admin/fraude/retencoes/:id/decisao`
  (`{"liberar": true|false}`): liberar dispara emissão/nota fiscal
  normalmente; bloquear cancela o pedido (`status: estornado`), bloqueia a(s)
  unidade(s) e solicita o estorno.

## Nota fiscal (Fase 3)

Ponto de integração plugável (`NotaFiscalProvider`, mesmo padrão do
`EmailProvider`/`RefundGateway`) — em produção, trocar pela integração real
(ex.: NFE.io). Emitida automaticamente pelo job `POST
/jobs/nota-fiscal/emitir-nota-fiscal` após a confirmação do pagamento (ou
após a liberação de um pedido retido por fraude); idempotente via
`pedidos.notaFiscalId`.

## Jobs assíncronos

Cada job antes consumido por um worker BullMQ agora é uma rota HTTP em
`backend/src/jobs/http/*.controller.ts`, protegida por
`QstashSignatureGuard` (só aceita chamadas assinadas pelo QStash). Quem
publica os jobs é `JobsPublisherService` (`backend/src/jobs/`), injetado
pelos serviços de domínio no lugar do antigo `@InjectQueue`. O job periódico
de reabastecimento (antes um scheduler BullMQ) é uma **QStash Schedule**
provisionada uma vez fora do código — ver `DEPLOY.md`.

## Observabilidade (Fase 3)

Todo request HTTP recebe/propaga um `x-request-id` (`RequestIdMiddleware`) e
gera uma linha de log estruturada com método, rota, status e duração
(`LoggingInterceptor`) — a correlação mínima para depurar o fluxo assíncrono
(controller → job enfileirado) em produção sem depender de um APM externo.
Falhas críticas (emissão ou estorno esgotando tentativas, reconciliação de
estoque) já usavam `Logger.error` desde as fases anteriores.

## Testes

```bash
npm test                                  # unitários
npx jest --config ./test/jest-e2e.json    # e2e + concorrência (requer Postgres real)
```

Os unitários cobrem cifragem/decifragem de código, verificação de assinatura
de webhook e a guarda de assinatura do QStash. Os testes e2e incluem uma
suíte dedicada de concorrência/idempotência (`test/concorrencia.e2e-spec.ts`)
que roda contra Postgres real (sem mocks) e cobre: reserva concorrente sob
disputa de estoque (SKIP LOCKED),
idempotência do webhook sob entrega concorrente, reabastecimento concorrente
sem duplicar o lote, e reaproveitamento de uma unidade cancelada em uma venda
futura. Essa última suíte já pegou dois bugs reais durante o desenvolvimento
(um de modelagem, um de lógica de reabastecimento) que só apareceram sob
concorrência de verdade — ver histórico de commits.
