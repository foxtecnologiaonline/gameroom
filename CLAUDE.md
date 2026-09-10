# Projeto: Gameroom — Marketplace Multi-Vendedor

Marketplace de jogos, contas, ativos digitais, colecionáveis, skins e
ferramentas, com múltiplos sellers.

Stack fixa: NestJS + PostgreSQL + Redis/BullMQ + Meilisearch + Next.js +
Pagar.me (split via `recipient_id`) + Melhor Envio (frete).

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
2. `identity` — registro/login/JWT + RBAC (`buyer`, `seller`, `admin`).
3. `seller` — onboarding + aprovação por admin.
4. `catalog` — produto + oferta + categoria.
5. `inventory` — reserva/liberação de estoque atômica (lock otimista).
6. `cart` — carrinho persistido por buyer, multi-seller.
7. `checkout` — carrinho → `Order` + `SubOrder`s (sem cobrar ainda).
8. `payments` — Pagar.me, split por `SubOrder`, webhook idempotente.
9. `shipping` — cotação de frete por `SubOrder` + etiqueta pós-pagamento.
10. `orders` — status por `SubOrder` (pending → paid → shipped → delivered),
    evento por transição.
11. `reviews` — liberado só após `delivered`.
12. Storefront: home, busca, produto, carrinho, checkout.
13. Painel seller: cadastro de produto, listagem de pedidos.
14. Painel admin: aprovação de seller, moderação de catálogo.

Não introduzir módulos fora do MVP (chat, cupom, disputa, recomendação)
antes do item 14 do backlog estar em produção.

## Regras de engenharia não-negociáveis

- Todo endpoint que move dinheiro ou estoque é idempotente (chave de
  idempotência no header).
- Toda transição de status de `SubOrder`/`Payment` emite um evento de
  domínio — mesmo dentro do monolito.
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
npm run dev:api                # apps/api em http://localhost:3001/api
npm run dev:storefront          # apps/storefront em http://localhost:3000
```

`npm run lint` / `npm test` / `npm run build` na raiz rodam em todos os
workspaces (`--if-present`, usados pelo CI em `.github/workflows/ci.yml`).
