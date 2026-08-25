# Frontend — Loja, área do cliente e painel admin

Next.js 16 (App Router) + TypeScript + Tailwind. Aplicação majoritariamente
client-rendered: fala com o backend NestJS (`../backend`) via REST, autentica
com JWT guardado no `localStorage`, sem camada de dados própria do Next
(sem Route Handlers/Server Actions) — a API já existe separadamente.

## Setup local

```bash
npm install
cp .env.local.example .env.local   # ajuste NEXT_PUBLIC_API_URL se o backend não estiver em localhost:3000
npm run dev                        # roda em localhost:3001 (o backend já usa a 3000)
```

Requer o backend rodando (ver `../backend/README.md`) com pelo menos o admin
inicial (`prisma db seed`).

## Estrutura

- `src/lib/api.ts` — cliente REST fino (fetch) usado por toda a app.
- `src/lib/auth.tsx` — `AuthProvider`/`useAuth`: login/registro/logout, token
  decodificado no cliente (`{sub, email, tipo}`) só para exibição/roteamento —
  a autorização de verdade é sempre feita pelo backend a cada chamada.
- `src/components/ProtectedRoute.tsx` — guarda de rota client-side (por
  `role`), usada tanto em `/minhas-compras` quanto em todo `/admin/*`
  (`src/app/admin/layout.tsx`).
- `src/components/ui.tsx` — primitivos de UI (Button, Card, Badge, Pagination,
  etc.) reaproveitados em todas as páginas.

## Páginas

**Loja pública**: `/` (catálogo), `/produtos/[id]`, `/checkout/[id]`,
`/pedidos/[id]` (status do pedido, com polling automático enquanto pendente).

**Cliente autenticado**: `/login`, `/registrar`, `/minhas-compras` (histórico,
download de conteúdo, visualização de código, solicitação de devolução).

**Admin** (`/admin/*`): dashboard, produtos (criar/ativar/importar códigos/
upload de conteúdo/estoque), pedidos (relatório + simulação de pagamento),
devoluções (fila de revisão manual), antifraude (retenções), reabastecimentos
e auditoria (logs).

## Sobre a "simulação de pagamento"

Não há gateway de pagamento real integrado neste ambiente. A página de
detalhe do pedido no admin (`/admin/pedidos/[id]`) tem botões para simular a
confirmação, que chamam `POST /webhooks/pagamento/simular/:pedidoId`
(admin-only) no backend — o mesmo caminho de código do webhook real é
exercitado (idempotência, disparo de emissão/nota fiscal/reabastecimento),
só a verificação de assinatura HMAC é substituída pela autenticação de admin.
Em produção, essa rota de simulação não deve existir/ser exposta sem essa
proteção.

## Correção de segurança feita ao construir esta parte

A página pública de produto (`GET /produtos/:id`) estava retornando URLs
assinadas do S3 para todo o conteúdo do produto, mesmo sem compra — qualquer
visitante do catálogo conseguiria baixar o material pago. Corrigido no
backend para essa rota nunca assinar URLs; o download real só é liberado
pela área do cliente autenticada, que também é o ponto que registra o
"uso" consultado pela regra de elegibilidade de devolução automática.

## Verificação

```bash
npx tsc --noEmit
npx eslint .
npm run build
```

O fluxo completo (cadastro, login admin/cliente, criação de produto,
importação de código, ativação, compra, simulação de pagamento, polling de
status, download de código, devolução automática vs. revisão manual) foi
validado ponta a ponta em navegador real (Playwright) durante o
desenvolvimento.
