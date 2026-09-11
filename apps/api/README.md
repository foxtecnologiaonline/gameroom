# Gameroom — API

Backend do marketplace multi-vendedor (NestJS, Modular Monolith — ver `/CLAUDE.md`
na raiz do repo para a arquitetura e o backlog completos).

Cada bounded context vive em `src/<modulo>/` com seu próprio schema Postgres
(`<modulo>.*`). Módulos nunca importam repositório de outro módulo — a
comunicação entre eles é sempre via serviço exposto ou evento de domínio.

## Rodando localmente

```bash
cp .env.example .env
npm install
npm run start:dev
```

A API sobe em `http://localhost:3001/api` (prefixo global `api`), consistente
com `NEXT_PUBLIC_API_URL` usado pelo storefront.

Dependências de infraestrutura (Postgres, Redis) sobem via
`docker compose up -d` na raiz do monorepo. Depois de subir, rode as
migrations:

```bash
npm run migration:run --workspace apps/api
npm run seed:admin --workspace apps/api   # cria o admin de ADMIN_EMAIL/ADMIN_PASSWORD
```

## Stack

NestJS 11 + TypeORM (Postgres) + Passport/JWT. Cada módulo tem seu schema
Postgres próprio; as migrations vivem todas em
`src/database/migrations/`, com histórico único (`public.migrations`),
prefixadas pelo módulo que criam (ex.: `InitIdentity`).

## Scripts

- `npm run start:dev` — servidor com watch.
- `npm run lint` — ESLint.
- `npm test` — testes unitários (Jest).
- `npm run test:e2e` — testes end-to-end (precisa de Postgres real rodando).
- `npm run migration:generate -- src/database/migrations/NomeDaMigration` —
  gera uma migration a partir do diff das entidades TypeORM.
- `npm run migration:run` / `npm run migration:revert`.
- `npm run seed:admin` — cria (ou promove) o usuário `ADMIN_EMAIL`/`ADMIN_PASSWORD`
  do `.env` para a role `admin`. Idempotente.

## Estrutura atual

- `src/health/` — health check (`GET /api/health`), usado por CI e Docker.
- `src/database/` — `data-source.ts`/`data-source.options.ts` (usados tanto
  pela app quanto pelo CLI do TypeORM) e `migrations/`.
- `src/identity/` — módulo `identity` (backlog item 2): registro/login/JWT
  com refresh rotativo e RBAC (`buyer`/`seller`/`admin`).
  - `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/refresh`
  - `GET /api/me` (autenticado)
  - Access token: JWT curto (`JWT_ACCESS_EXPIRES_SECONDS`) com `sub`/`email`/`roles`.
  - Refresh token: JWT longo com `jti`, hash SHA-256 persistido em
    `identity.refresh_tokens`; cada uso rotaciona e revoga o token anterior
    (reuso de um token já rotacionado é rejeitado).
- `src/common/` — infraestrutura cross-module:
  - `decorators/roles.decorator.ts` + `guards/roles.guard.ts` — RBAC
    (`@Roles(...)`), usado por todos os módulos com rotas restritas.
  - `idempotency/` — `IdempotencyInterceptor` (`@UseInterceptors`), backed
    por `platform.idempotency_keys`. Exige o header `Idempotency-Key` e
    faz replay do resultado exato de uma chamada repetida em vez de
    reexecutar o handler. Obrigatório em qualquer endpoint que mova
    dinheiro ou estoque (regra do `CLAUDE.md`); usado por `inventory`,
    `checkout` e `POST /payments/charge`.
- `src/seller/` — módulo `seller` (backlog item 3): onboarding e aprovação.
  - `POST /api/sellers` (autenticado) — buyer aplica para virar seller,
    status inicial `pending`. Um único cadastro por usuário.
  - `GET /api/sellers/:id` — dono do cadastro ou admin.
  - `PATCH /api/sellers/:id/status` — só admin (`@Roles(Role.Admin)`).
    Ao aprovar: registra o seller no `RecipientGateway` (hoje um stub —
    ver pendência no `CLAUDE.md`) e promove o usuário para a role `seller`
    via `UsersService.addRole` do módulo `identity`.
- `src/catalog/` — módulo `catalog` (backlog item 4): produto, oferta e
  categoria.
  - `POST /api/products` — só role `seller` (`RolesGuard`).
  - `GET /api/products?query=` — busca por título (`ILIKE`, ver pendência
    do Meilisearch no `CLAUDE.md`).
  - `GET /api/products/:id` — produto + suas ofertas, ordenadas por preço.
  - `POST /api/products/:id/offers` — só seller aprovado
    (`SellersService.findApprovedByUserId`); recalcula o buybox winner
    (menor preço entre ofertas com estoque) a cada oferta criada.
  - Categorias são seed de dados na própria migration (`InitCatalog`), sem
    endpoint de CRUD — ver pendência no `CLAUDE.md`.
- `src/inventory/` — módulo `inventory` (backlog item 5): reserva/liberação
  de estoque atômica.
  - `POST /api/offers/:id/reserve` — decrementa o estoque da oferta
    (lock otimista + retry, ver `OffersService.reserveStock`) e cria uma
    `inventory.reservations` (`status: active`). `409` se não houver
    estoque suficiente ou em caso de alta concorrência persistente.
  - `POST /api/offers/:id/release` — devolve o estoque de uma reserva
    ativa; `409` se ela já tiver sido liberada.
  - `PATCH /api/offers/:id/stock` — define o estoque absoluto; só o seller
    dono da oferta ou um admin.
  - As três rotas exigem o header `Idempotency-Key`
    (`IdempotencyInterceptor`).
- `src/cart/` — módulo `cart` (backlog item 6): carrinho persistido por
  buyer, agregando ofertas de múltiplos sellers.
  - `POST /api/cart/items` — adiciona `{offerId, quantity}`; se a oferta já
    estiver no carrinho, soma a quantidade em vez de duplicar a linha.
    `404` se a oferta não existir.
  - `GET /api/cart` — carrinho do usuário autenticado (criado sob demanda
    na primeira leitura/escrita), cada item já enriquecido com a oferta
    atual (`item.offer`).
  - `DELETE /api/cart/items/:id` — só o dono do carrinho; `403` para quem
    tentar remover item de outro buyer, `404` para item inexistente.
  - **Não reserva estoque** — só valida que a oferta existe. A reserva de
    verdade acontece no `checkout` (item 7), via `inventory`.
- `src/orders/` — entidades e persistência do bounded context `orders`
  (schema `orders.*`: `orders`, `sub_orders`, `order_items`), criado
  porque `checkout` (item 7) precisa delas. **Parcial de propósito**:
  `OrdersService` tem `create()`, `findById()` e `updateSubOrderStatus()`
  (essa última é o único jeito de mudar o status de um `SubOrder` — sempre
  emite `SubOrderStatusChangedEvent`). Faltam os endpoints HTTP do item
  10: `GET /orders/:id`, `GET /sellers/:id/orders`,
  `PATCH /suborders/:id/status`.
- `src/checkout/` — módulo `checkout` (backlog item 7): carrinho →
  `Order` + N `SubOrder`.
  - `POST /api/checkout` (autenticado, exige `Idempotency-Key`):
    1. lê o carrinho do buyer; `409` se estiver vazio;
    2. reserva o estoque de cada item via `InventoryService.reserve`
       (lock otimista do item 5) — se uma reserva falhar no meio do
       caminho (estoque insuficiente, ou erro ao persistir o Order
       depois), libera (compensa) todas as reservas já feitas nesta
       chamada antes de propagar o erro; o carrinho permanece intacto
       para o buyer tentar de novo;
    3. agrupa os itens por `offer.sellerId` e cria 1 `Order` + N
       `SubOrder` (um por seller) + `OrderItem`s via `OrdersService.create`,
       numa transação;
    4. esvazia o carrinho (`CartService.clear`).
  - Ainda não cobra nada — o `Order` nasce com `status: 'pending'`; cobrar
    é `payments` (`POST /payments/charge`, abaixo).
- `src/payments/` — módulo `payments` (backlog item 8): cobrança e split.
  - `POST /api/payments/charge` (autenticado, exige `Idempotency-Key`) —
    body `{orderId, method}`. Valida que o order é do requester e está
    `pending`; rejeita uma segunda cobrança para o mesmo order (`409`).
    Monta o split por `SubOrder` (valor + `recipientId` do seller) e chama
    o `PaymentGateway` (hoje `StubPaymentGateway` — ver pendência no
    `CLAUDE.md`): `credit_card` resolve síncrono (`paid` na hora),
    `pix` fica `pending` até o webhook confirmar. Grava `Payment` +
    uma linha de `split_transactions` por seller (append-only — nunca
    `UPDATE`, regra do `CLAUDE.md`) e, se já `paid`, chama
    `OrdersService.updateSubOrderStatus` para cada `SubOrder`.
  - `POST /api/payments/webhook` — sem `JwtAuthGuard` (quem chama é o
    gateway, não um usuário logado) e sem `IdempotencyInterceptor` (o
    gateway não manda `Idempotency-Key`); idempotente por comparação:
    se o status recebido já é o atual do `Payment`, é um no-op. Uma
    mudança real de status grava uma nova leva de `split_transactions`
    (uma por seller, nunca sobrescrevendo a anterior) e completa os
    `SubOrder`s pendentes quando o status vira `paid`.
- `src/app.module.ts` — módulo raiz, agrega os módulos de cada bounded
  context conforme forem implementados (ver backlog no `CLAUDE.md`).
