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
`docker compose up -d` na raiz do monorepo.

## Scripts

- `npm run start:dev` — servidor com watch.
- `npm run lint` — ESLint.
- `npm test` — testes unitários (Jest).
- `npm run test:e2e` — testes end-to-end.

## Estrutura atual

- `src/health/` — health check (`GET /api/health`), usado por CI e Docker.
- `src/app.module.ts` — módulo raiz, agrega os módulos de cada bounded
  context conforme forem implementados (ver backlog no `CLAUDE.md`).
