# Backend — Plataforma de venda e gestão de ativos digitais

Implementação da **Fase 1** da especificação técnica v2 (ver
[`../docs/especificacao-tecnica-v2.md`](../docs/especificacao-tecnica-v2.md)):
setup do projeto, produtos, estoque (com importação/cifragem de código),
conteúdo, checkout com reserva concorrente, webhook de pagamento idempotente,
emissão/entrega automática e reabastecimento automático de estoque.

Devoluções, área do cliente e painel admin (Fase 2) ainda não foram implementados.

## Stack

NestJS + TypeScript, Prisma (PostgreSQL 15+), BullMQ + Redis, JWT (admin/cliente),
AES-256-GCM para cifrar códigos de licença em repouso.

## Setup local

```bash
npm install
cp .env.example .env   # ajuste DATABASE_URL, REDIS_HOST/PORT e os segredos

# gerar uma chave válida para CODIGO_ENCRYPTION_KEY (32 bytes em base64):
openssl rand -base64 32

npx prisma migrate deploy   # aplica as migrations
ADMIN_SEED_EMAIL=admin@exemplo.com ADMIN_SEED_SENHA="senha-forte" npx prisma db seed

npm run start:dev
```

Requer PostgreSQL e Redis rodando e acessíveis pelas variáveis de ambiente do `.env`.

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

## Testes

```bash
npm test        # unitários
```

Cobrem cifragem/decifragem de código e verificação de assinatura de webhook.
Testes de integração/concorrência (SKIP LOCKED sob disputa, idempotência de
webhook fim a fim) ainda não foram automatizados — foram validados
manualmente durante o desenvolvimento; ver §9 da especificação v2.
