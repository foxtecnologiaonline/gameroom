# Gameroom

Plataforma de venda de ativos digitais (chaves de jogo, gift cards, assinaturas)
com entrega automática após confirmação de pagamento. Loja pública, área do
cliente e painel admin em Next.js 14; API REST em NestJS.

## Estrutura

- `src/` — frontend (Next.js 14, App Router, Tailwind). Ver `README` original de
  contexto em `src/lib/api.ts` (endpoints centralizados) e `src/lib/types.ts`.
- `backend/` — API REST (NestJS). Autenticação, catálogo de produtos, checkout
  com alocação de estoque, devoluções e painel admin.

## Rodando localmente

Backend (porta 3001):

```bash
cd backend
cp .env.example .env
npm install
npm run build && npm run start   # ou `npm run dev` para hot-reload
```

Na primeira execução o backend cria `backend/data/db.json` com dados de
exemplo, incluindo dois usuários seed:

- **Admin**: `admin@gameroom.dev` / `admin123`
- **Cliente**: `cliente@gameroom.dev` / `cliente123`

Frontend (porta 3000):

```bash
cp .env.example .env.local   # NEXT_PUBLIC_API_URL=http://localhost:3001/api
npm install
npm run dev
```

## Sobre o backend (MVP)

Persistência em arquivo JSON local (`backend/data/db.json`), sem dependências
externas de banco de dados — suficiente para o MVP e fácil de trocar por
Postgres/Prisma depois, já que toda a lógica de negócio está isolada nos
services (`DbService` é o único ponto de acesso a dados).

Regras de negócio implementadas:

- **Estoque por unidade**: cada produto tem unidades de estoque individuais
  (chave/código). O checkout reserva uma unidade disponível; se não houver
  nenhuma, retorna `409`.
- **Reabastecimento automático**: ao confirmar uma venda, se o estoque
  disponível cair no limiar configurado (`limiarReabastecimento`), novas
  unidades são geradas automaticamente (`estoqueLotePadrao`) e registradas no
  histórico de reabastecimentos.
- **Checkout com ou sem login**: usuário autenticado usa o e-mail da conta;
  visitante informa e-mail no momento da compra.
- **Pagamento simulado**: `POST /checkout/webhook/simular` substitui o gateway
  real (Stripe/Mercado Pago/etc.) para o MVP — usado apenas pelo botão "Simular
  pagamento aprovado", visível somente em desenvolvimento.
- **Devolução com janela de aprovação automática**: solicitações dentro de 24h
  da compra são aprovadas e reembolsadas automaticamente; fora da janela, vão
  para a fila de revisão manual do admin.

## Próximos passos para produção

- Trocar a persistência em arquivo por um banco real (Postgres) antes de
  qualquer uso com tráfego real ou múltiplas instâncias.
- Integrar um gateway de pagamento de verdade no lugar do webhook de simulação.
- Adicionar testes automatizados (unitários e e2e) e CI.
- Mover a autorização de rotas para também cobrir SSR/middleware, não só guard
  client-side.
