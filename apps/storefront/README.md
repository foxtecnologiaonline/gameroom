# Gameroom — Storefront

Frontend do marketplace multi-vendedor (Next.js 14, App Router, Tailwind) —
ver `/CLAUDE.md` na raiz do repo para a arquitetura e o backlog completos.
Backlog itens 12 (home, busca, produto, carrinho, checkout) e 13 (painel
seller). Painel admin (item 14) ainda não existe.

## Rodando localmente

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:3001/api
npm install
npm run dev
```

Precisa da API rodando em paralelo (`npm run dev:api` na raiz) com
`CORS_ORIGIN` liberando `http://localhost:3000` — já é o padrão de
`apps/api/.env.example`.

## Contrato da API

Tipos (`src/lib/types.ts`) e paths (`src/lib/api.ts`, `endpoints`) batem
1:1 com as entidades e controllers reais de `apps/api/src/*` (não são mais
inferidos — o backend já existe e foi consultado diretamente). Qualquer
mudança de contrato no backend deve ser refletida nesses dois arquivos.

## Estrutura

- `src/lib/api.ts` — cliente HTTP (`fetch`) com injeção automática de
  `Authorization: Bearer`, suporte a `Idempotency-Key` (`checkout`,
  `payments/charge`) e parse de erro no formato `{statusCode, message}`
  do Nest.
- `src/lib/auth-context.tsx` — `AuthProvider`/`useAuth`: login/register
  contra `POST /auth/login|register` (retornam só `TokenPair`), depois
  busca o usuário via `GET /me`. Tokens em `localStorage`
  (`gr_access_token`/`gr_refresh_token`) — sem refresh automático ainda
  (token expira em 15 min, só volta a pedir login).
- `src/components/guards/RequireAuth.tsx` — redireciona para
  `/login?next=<path>` quando não autenticado.
- `src/app/page.tsx` — home com busca (`GET /products?query=`), debounce
  de 250ms.
- `src/app/produtos/[id]/page.tsx` — detalhe do produto
  (`GET /products/:id`), lista de ofertas por seller (nome resolvido via
  `GET /sellers/:id/public`), "adicionar ao carrinho"
  (`POST /cart/items`, exige login).
- `src/app/carrinho/page.tsx` — `GET /cart`, remover item
  (`DELETE /cart/items/:id`), "finalizar compra"
  (`POST /checkout` com `Idempotency-Key`) → redireciona para
  `/checkout/[orderId]`.
- `src/app/checkout/[orderId]/page.tsx` — `GET /orders/:id` (Order
  consolidado + N SubOrders), escolha de método
  (`credit_card`/`pix`) e `POST /payments/charge` (com
  `Idempotency-Key`). `credit_card` confirma na hora; `pix` fica
  `pending` até o webhook — nesse caso a página faz polling de
  `GET /orders/:id` a cada 4s e, só em `NODE_ENV=development`, mostra um
  botão que chama `POST /payments/webhook` diretamente (sem integração
  real do Pagar.me — ver pendência no `CLAUDE.md`).
- `src/app/login/`, `src/app/registro/` — formulários de auth
  (`react-hook-form` + `zod`, `src/lib/schemas.ts`).
- `src/lib/use-seller.ts` — hook `useSeller()`: resolve o cadastro de
  seller do usuário logado via `GET /sellers/me` (não é um guard
  binário de rota — `status` pode ser `pending`/`approved`/
  `rejected`/`suspended`, cada página do painel decide o que mostrar).
- `src/app/vendedor/page.tsx` — painel do seller (backlog item 13):
  sem cadastro → formulário de aplicação (`POST /sellers`); `pending` →
  "em análise"; `rejected`/`suspended` → mensagem (sem como reaplicar —
  ver pendência no `CLAUDE.md`); `approved` → links para as duas
  páginas abaixo.
- `src/app/vendedor/produtos/novo/page.tsx` — cadastro de produto +
  oferta num formulário só (`POST /products` depois
  `POST /products/:id/offers`, sequencial); categoria vem de
  `GET /categories` (novo, ver pendência). Bloqueado para quem não é
  seller aprovado.
- `src/app/vendedor/pedidos/page.tsx` — lista os `SubOrder`s do seller
  (`GET /sellers/:id/orders`); por linha, ação contextual ao status:
  `paid` → formulário inline de etiqueta (`POST /shipping/label`);
  `shipped` → botão "marcar como entregue"
  (`PATCH /suborders/:id/status`). Mesmo guard de aprovação da página
  de cadastro.

## Fora de escopo (ver pendências no `CLAUDE.md`)

Sem seletor de quantidade no carrinho (cada clique em "adicionar" soma
+1), sem lista "meus pedidos" para o buyer (não há endpoint
`GET /orders` paginado no backend), sem painel admin (item 14), sem
forma de um seller rejeitado/suspenso reaplicar.
