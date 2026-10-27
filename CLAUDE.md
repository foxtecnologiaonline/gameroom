# Projeto: Gameroom — Marketplace Multi-Vendedor

Marketplace de jogos, contas, ativos digitais, colecionáveis, skins e
ferramentas, com múltiplos sellers.

Stack fixa: NestJS 11 + TypeORM + PostgreSQL + Redis/BullMQ + Meilisearch +
Next.js + Pagar.me (split via `recipient_id`) + Melhor Envio (frete).
Auth: JWT (access curto + refresh rotativo, hash SHA-256 persistido) via
Passport, RBAC com `@Roles`/`RolesGuard` (`src/common/`).

Arquitetura: Modular Monolith, 1 schema Postgres por módulo
(`catalog.*`, `orders.*`, `payments.*`...), comunicação entre módulos
SEMPRE via interface de serviço + evento de domínio — nunca import direto
de repositório de outro módulo.

Regra de negócio central: **1 carrinho com itens de N sellers gera 1
`Order` + N `SubOrder` independentes** (pagamento via split, frete e
status de ciclo de vida próprios por `SubOrder`). O comprador vê o
`Order` consolidado; o seller vê só seu(s) `SubOrder`.

## Layout do monorepo

- `apps/api` — backend NestJS (Modular Monolith). Cada bounded context vive
  em `src/<modulo>/`.
- `apps/storefront` — frontend Next.js (App Router).
- `docker-compose.yml` — Postgres + Redis para desenvolvimento local.

## Bounded contexts do MVP (ordem fixa do backlog)

1. Monorepo + Docker Compose + CI — **feito**.
2. `identity` — registro/login/JWT + RBAC (`buyer`, `seller`, `admin`) — **feito**.
3. `seller` — onboarding + aprovação por admin — **feito**.
4. `catalog` — produto + oferta + categoria — **feito**.
5. `inventory` — reserva/liberação de estoque atômica (lock otimista) — **feito**.
6. `cart` — carrinho persistido por buyer, multi-seller — **feito**.
7. `checkout` — carrinho → `Order` + `SubOrder`s (sem cobrar ainda) — **feito**.
8. `payments` — Pagar.me, split por `SubOrder`, webhook idempotente — **feito**
   (com `StubPaymentGateway` — ver pendência abaixo).
9. `shipping` — cotação de frete por `SubOrder` + etiqueta pós-pagamento — **feito**
   (com `StubMelhorEnvioGateway` — ver pendência abaixo).
10. `orders` — status por `SubOrder` (pending → paid → shipped → delivered),
    evento por transição — **feito**: `GET /orders/:id`,
    `GET /sellers/:id/orders`, `PATCH /suborders/:id/status`.
11. `reviews` — liberado só após `delivered` — **feito**.
12. Storefront: home, busca, produto, carrinho, checkout — **feito**.
13. Painel seller: cadastro de produto, listagem de pedidos — **feito**.
14. Painel admin: aprovação de seller, moderação de catálogo.

Não introduzir módulos fora do MVP (chat, cupom, disputa, recomendação)
antes do item 14 do backlog estar em produção.

### Pendências conhecidas

- **Pagar.me real**: dois stubs ainda de pé, mesmo padrão em ambos —
  porta + provider trocável num arquivo só, sem mudar o resto do fluxo:
  - `StubRecipientGateway` (`src/seller/gateways/`) — usado na aprovação
    de seller, gera um `recipient_id` local em vez de chamar
    `POST /recipients`.
  - `StubPaymentGateway` (`src/payments/gateways/`) — usado em
    `POST /payments/charge`, simula `credit_card` como síncrono (`paid`
    na hora) e `pix` como assíncrono (`pending` até o webhook confirmar),
    mas não chama o Pagar.me de verdade nem valida cartão/QR code.
  Ambos ficam assim até haver credenciais reais para desenhar o payload
  exato (conta bancária, holder document, split_rules, tokenização de
  cartão) — sem isso, uma implementação "real" não seria testável nem
  confiável.
- **Assinatura do webhook**: `POST /payments/webhook` não verifica que a
  chamada realmente veio do Pagar.me (sem `JwtAuthGuard` de propósito — é
  um callback de sistema externo, não de um usuário logado — mas também
  sem checar HMAC/assinatura). Verificação de assinatura é parte da
  integração real do Pagar.me, junto com o resto da pendência acima.
- **Busca do catalog**: `GET /products?query=` hoje é `ILIKE` no Postgres
  (`ProductsService.search`), suficiente para o volume do MVP. Meilisearch
  (decisão fechada na seção 0 do escopo) entra quando ranking/facetas/
  tolerância a erro de digitação virarem necessidade real — troca isolada
  em `ProductsService`, sem mudar o contrato do endpoint.
- **Categorias**: não há endpoint de CRUD (a spec não lista um em `catalog`)
  — as 5 categorias do MVP são seed de dados na migration `InitCatalog`
  (`catalog.categories`). Um painel admin de moderação de catálogo (item
  14) é o gatilho natural para uma API de categorias, se precisar.
- **Expiração de reserva**: `inventory.reservations` não expira sozinha —
  só é liberada por uma chamada explícita a `POST /offers/:id/release`.
  `cart` (item 6) NÃO reserva estoque ao adicionar item (só valida que a
  oferta existe); a reserva de fato acontece no `checkout` (item 7), a
  cada item do carrinho, no momento do `POST /checkout`. Se um `Order`
  fica parado em `pending` (comprador nunca paga), a reserva de estoque
  correspondente fica presa até alguém chamar `/release` manualmente —
  falta um job (BullMQ) para auto-liberar reservas de orders abandonados;
  a tabela já tem os campos (`status`, `created_at`) para isso.
- **Falha parcial no checkout**: se uma reserva falhar no meio do
  `POST /checkout` (estoque insuficiente de um item, ou erro ao persistir
  o Order), o `CheckoutService` libera (compensa) todas as reservas já
  feitas naquela chamada antes de propagar o erro — testado em
  `checkout.service.spec.ts` e no e2e. Isso é orquestração em memória
  (não um saga/outbox), aceitável no MVP porque cada reserva já é atômica
  por si só; revisitar se o processo puder morrer no meio do laço.
- **Peso/endereço não modelados**: `catalog.offers` não tem peso/dimensões
  e não existe endereço de entrega persistido para `buyer` em lugar
  nenhum do sistema. Por isso `POST /shipping/quote` e
  `POST /shipping/label` recebem `destinationZip`/`weightGrams` como
  parâmetros da própria requisição, em vez de derivá-los de dado
  persistido — decisão deliberada para não fazer scope-creep em
  `catalog`/`identity` fora da ordem do backlog. Revisitar quando um
  desses módulos precisar desse dado por outro motivo.
- **Rastreio de frete parado em `label_created`**: `ShipmentStatus` tem
  `in_transit`/`delivered`, mas nada os atinge hoje — não existe
  webhook/callback de transportadora (o paralelo do que `payments` tem
  para o Pagar.me) para avançar esse status depois da etiqueta emitida.
  `POST /shipping/label` só cria a etiqueta e já move o `SubOrder` para
  `shipped` via `OrdersService.updateSubOrderStatus`; o rastreio real
  (`GET /shipping/:id/tracking`) fica preso em `label_created` até essa
  integração existir.
- **`PATCH /suborders/:id/status` cobre só a transição manual**:
  `pending→paid` (via `payments`) e `paid→shipped` (via `shipping`) já
  são automáticos, cada um chamando `OrdersService.updateSubOrderStatus`
  no fim do próprio fluxo. Na prática, o único passo que esse endpoint
  precisa cobrir hoje é `shipped→delivered` (marcação manual do seller,
  já que não existe confirmação de entrega por transportadora — mesma
  pendência do rastreio acima); ele também aceita `pending→paid` e
  `paid→shipped` avulsos por generalidade (útil para correção manual por
  um admin), sempre validando a sequência fixa do enum e nunca pulando
  ou retrocedendo um passo.
- **Review é por `SubOrder`, não por produto**: 1 avaliação por
  `SubOrder` entregue (rating 1-5 + comentário opcional), atribuída ao
  seller daquele `SubOrder` — não ao produto/oferta individual. Decisão
  deliberada para o MVP: um `SubOrder` pode ter N itens de N ofertas
  diferentes do mesmo seller, e review por item exigiria decidir qual
  oferta está sendo avaliada (não especificado). `GET /sellers/:id/reviews`
  é público (sem `JwtAuthGuard`) — vitrine da loja não exige login.
  Revisitar se o storefront (item 12) precisar de review por produto.
- **`GET /sellers/:id/public`**: endpoint novo, adicionado junto do item
  12 porque o storefront precisa mostrar o nome da loja em cada oferta
  de `GET /products/:id`, mas `GET /sellers/:id` é dono/admin-only. Fatia
  pública segura (`{id, storeName}`, sem `document`/`recipientId`), sem
  guard — obrigou mover `@UseGuards(JwtAuthGuard)` de `SellersController`
  do nível de classe para o nível de método (mesmo padrão já usado em
  `ReviewsController`/`ShippingController`, que também misturam rotas
  públicas e privadas no mesmo controller).
- **CORS**: `apps/api/src/main.ts` agora chama `app.enableCors({origin:
  process.env.CORS_ORIGIN ?? 'http://localhost:3000'})` — sem isso o
  storefront (porta 3000) não conseguia nem fazer `fetch` para a API
  (porta 3001) no browser. Single-origin fixo por env var é suficiente
  para o MVP (um único frontend); revisitar se surgir um segundo client
  (ex: painel admin em domínio separado).
- **Botão de simular webhook do Pix é dev-only no storefront**: como
  `pix` fica `pending` até `POST /payments/webhook` confirmar (sem
  integração real do Pagar.me — pendência já documentada acima), a
  página `/checkout/[orderId]` tem um botão "Simular confirmação"
  visível só com `NODE_ENV=development`, que chama o webhook direto
  (sem guard, mesmo contrato que o gateway real usaria). Não existe em
  produção; é a única forma de destravar um pagamento Pix em dev/demo
  sem uma integração real.
- **Carrinho sem seletor de quantidade**: `POST /cart/items` sempre
  manda `quantity: 1` a partir da página de produto — clicar de novo
  soma mais uma unidade (`CartService.addItem` já faz upsert por
  oferta). Ajustar quantidade direto no carrinho (input numérico) não
  foi implementado — escopo mínimo do item 12; revisitar se virar
  necessidade real de UX.
- **Sem lista "meus pedidos"**: o storefront não tem uma página que
  liste todos os pedidos do buyer porque não existe endpoint para isso
  no backend (`GET /orders/:id` é só por id — ver pendência do item
  10/orders). O buyer só revê um pedido específico pela URL
  `/checkout/[orderId]` logo após o checkout. Um `GET /orders` paginado
  por buyer é candidato natural para quando o painel do comprador virar
  necessidade real (não estava no escopo do item 12).
- **`GET /sellers/me` e `GET /categories`**: dois endpoints novos,
  adicionados junto do item 13. O painel seller precisava de duas coisas
  que não existiam: (a) o próprio frontend descobrir o `sellerId`/status
  do usuário logado sem conhecer o id de antemão (`GET /sellers/:id` só
  funciona se você já sabe o id) — `GET /sellers/me` resolve isso,
  `404` se o usuário nunca aplicou; precisou ser registrado antes de
  `GET /sellers/:id` no controller (senão `:id` capturaria o literal
  "me"). (b) `POST /products` exige `categoryId`, mas o id é um UUID
  gerado pela migration `InitCatalog`, não fixo — sem nenhum endpoint
  de listagem, o formulário de cadastro de produto não tinha como
  resolver um `categoryId` válido. `GET /categories` é público, lista
  as 5 categorias seed; ainda não há CRUD (mesma pendência de sempre,
  um painel admin de moderação é o gatilho natural).
- **Seller rejeitado/suspenso não consegue reaplicar**:
  `SellersService.apply()` bloqueia qualquer segunda aplicação
  (`409 Já existe um cadastro de seller para este usuário`) só checando
  se já existe um registro para aquele `userId` — não diferencia
  `pending`/`approved` de `rejected`/`suspended`. Gap pré-existente
  (de antes do item 13), só descoberto agora ao construir a tela de
  onboarding do painel seller: hoje o storefront mostra "Cadastro
  rejeitado"/"Conta suspensa" como estado permanente, sem como sair
  dele. Resolver exigiria decidir a regra de negócio (permitir
  reenvio? depois de quanto tempo? revisão manual?), fora do escopo
  mínimo do item 13 — documentado para quando virar necessidade real.

## Regras de engenharia não-negociáveis

- Todo endpoint que move dinheiro ou estoque é idempotente (chave de
  idempotência no header) — infra pronta em `src/common/idempotency/`
  (`IdempotencyInterceptor`, tabela `platform.idempotency_keys`), já usada
  pelo `inventory` e reutilizável por `checkout`/`payments`.
- Toda transição de status de `SubOrder`/`Payment` emite um evento de
  domínio — mesmo dentro do monolito. Implementado com `EventEmitter2`
  (`@nestjs/event-emitter@3.x` — a v12 é ESM-only e quebra o Jest/ts-jest
  deste projeto, por isso o pin): `SubOrderStatusChangedEvent`
  (`src/orders/events/`, emitido só por `OrdersService.updateSubOrderStatus`,
  nunca por um `.save()` direto em outro módulo) e
  `PaymentStatusChangedEvent` (`src/payments/events/`, emitido na criação
  do Payment e em toda mudança de status via webhook). Nenhum listener
  reage a eles ainda — não havia necessidade real até agora — mas o
  contrato existe e está testado (`orders.service.spec.ts`,
  `payments.service.spec.ts`).
- Nenhum módulo lê tabela de outro módulo diretamente; só via serviço
  exposto.
- Toda tabela financeira é append-only para auditoria (sem UPDATE
  destrutivo em `split_transactions`).
- LGPD: dado pessoal de `buyer`/`seller` isolado em schema próprio, nunca
  em log.
- Toda tarefa exige teste automatizado (caminho feliz + 1 erro) antes de
  ser considerada concluída.

## Como rodar localmente

```bash
docker compose up -d          # Postgres + Redis
npm install                   # instala os dois workspaces
npm run migration:run --workspace apps/api   # aplica as migrations
npm run dev:api                # apps/api em http://localhost:3001/api
npm run dev:storefront          # apps/storefront em http://localhost:3000
```

Para ter um usuário admin (necessário a partir do item 3, aprovação de
seller): defina `ADMIN_EMAIL`/`ADMIN_PASSWORD` no `.env` do `apps/api` e
rode `npm run seed:admin --workspace apps/api` (idempotente).

`npm run lint` / `npm test` / `npm run build` na raiz rodam em todos os
workspaces (`--if-present`, usados pelo CI em `.github/workflows/ci.yml`).
