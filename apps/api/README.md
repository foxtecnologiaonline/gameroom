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
- `src/common/` — infraestrutura cross-module (`@Roles`/`RolesGuard`) usada
  pelos módulos que vierem a seguir para proteger rotas por role.
- `src/app.module.ts` — módulo raiz, agrega os módulos de cada bounded
  context conforme forem implementados (ver backlog no `CLAUDE.md`).
