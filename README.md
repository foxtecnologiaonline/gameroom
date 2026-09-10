# Gameroom

Marketplace multi-vendedor de jogos, contas, ativos digitais, colecionáveis,
skins e ferramentas. Ver [`CLAUDE.md`](./CLAUDE.md) para a arquitetura, o
modelo de dados e o backlog completos.

## Estrutura do monorepo

```
apps/
  api/          NestJS — backend (Modular Monolith, 1 schema por módulo)
  storefront/   Next.js — storefront
docker-compose.yml   Postgres + Redis para desenvolvimento local
```

Workspaces npm (`package.json` na raiz). Cada app tem seu próprio
`package.json`, mas dependências e lockfile são resolvidos em conjunto a
partir da raiz.

## Rodando localmente

```bash
docker compose up -d   # sobe Postgres (5432) e Redis (6379)
npm install             # instala os dois workspaces

npm run dev:api          # http://localhost:3001/api
npm run dev:storefront   # http://localhost:3000
```

Copie os respectivos `.env.example` (`apps/api/.env.example`,
`apps/storefront/.env.example`) para `.env` / `.env.local` antes de rodar.

## Scripts na raiz

- `npm run lint` — ESLint em todos os workspaces.
- `npm test` — testes (Jest no `api`, Vitest no `storefront`) em todos os
  workspaces.
- `npm run build` — build de produção dos dois apps.

O CI (`.github/workflows/ci.yml`) roda lint, typecheck, test e build para
`apps/storefront` e `apps/api` em cada push/PR.

## Nota sobre o contrato da API

O `apps/storefront` foi implementado numa sessão anterior a este backend,
antes da definição formal dos bounded contexts do `CLAUDE.md` (endpoints e
tipos foram inferidos a partir de uma especificação funcional mais antiga —
ver histórico em `apps/storefront/README.md`). À medida que os módulos do
backend forem implementados (itens 2–11 do backlog), o contrato real da API
deve ser revisado e alinhado com `apps/storefront/src/lib/api.ts` e
`src/lib/types.ts` — isso está previsto explicitamente nos itens 12–13 do
backlog (storefront e painéis seller/admin), não antes.
