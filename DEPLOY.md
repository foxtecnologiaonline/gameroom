# Deploy

Este documento cobre duas coisas separadas: **rodar tudo localmente/em
homologação com Docker Compose** (funciona hoje, sem nenhuma credencial de
terceiro) e **o que falta para um deploy de produção de verdade** (precisa de
credenciais e infraestrutura que este repositório não define, propositalmente
— cada time tem seu provedor preferido).

## 1. Rodando com Docker Compose

Sobe Postgres, Redis, backend (NestJS) e frontend (Next.js) com um único
comando — pensado para demonstrar/homologar a plataforma completa, não para
produção (ver seção 2 sobre o que muda para produção).

```bash
cp .env.example .env
# edite o .env: gere os segredos indicados (openssl rand -base64 32 para
# CODIGO_ENCRYPTION_KEY, e valores fortes para os *_SECRET)

docker compose up --build

# em outro terminal, após os containers subirem, crie o admin inicial:
docker compose exec backend sh -c 'ADMIN_SEED_EMAIL=admin@exemplo.com ADMIN_SEED_SENHA="senha-forte" npx prisma db seed'
```

- Backend: http://localhost:3000
- Frontend: http://localhost:3001
- Migrations do Prisma rodam automaticamente a cada boot do container do
  backend (`prisma migrate deploy`, idempotente).

### Limitações conhecidas deste modo

- **Upload de conteúdo (manuais/cartilhas/vídeos)** requer um bucket S3 real
  (`S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`) — sem isso, o
  endpoint de upload retorna erro. Pode apontar `S3_ENDPOINT` para um S3
  compatível local (ex.: MinIO) se quiser testar isso também sem AWS real.
  **Fora do escopo do MVP** (adiado para v2.0) — a entrega do MVP é só
  usuário/senha por comprador via e-mail, sem materiais de apoio anexados;
  ver `docs/especificacao-tecnica-v2.md`.
- **E-mail, estorno e nota fiscal** usam providers de console (só logam o que
  fariam) — ver seção 3.
- **Pagamento**: não há gateway real integrado. Use a simulação
  administrativa (`POST /webhooks/pagamento/simular/:pedidoId`, ou o botão
  correspondente em `/admin/pedidos/:id` no frontend) para exercitar o fluxo
  de confirmação sem um gateway de verdade.
- Se você rebuildar o frontend, lembre que `NEXT_PUBLIC_API_URL` é embutido
  no bundle do navegador **em build time** — mudar essa variável exige
  `docker compose build frontend` de novo, não só reiniciar o container.

## 2. Para um deploy de produção de verdade

Nada aqui é opcional — sem isso, o sistema roda com valores de
desenvolvimento inseguros ou simulados:

| Item | O que fazer |
|---|---|
| Banco de dados | Postgres gerenciado (RDS, Cloud SQL, Neon, etc.), não o container do compose |
| Redis | Redis gerenciado (ElastiCache, Upstash, etc.) |
| Segredos | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CODIGO_ENCRYPTION_KEY`, `PAGAMENTO_WEBHOOK_SECRET` gerados com `openssl rand -base64 32` e guardados num secrets manager — nunca commitados |
| Armazenamento de conteúdo | *(v2.0 — não bloqueia o deploy do MVP)* Bucket S3 real (ou compatível) com as credenciais em `S3_*` |
| Gateway de pagamento | Trocar a verificação genérica em `backend/src/pagamento/webhook-signature.util.ts` pela verificação nativa do SDK do gateway escolhido (Stripe/Mercado Pago/PagSeguro); **remover ou proteger adicionalmente** o endpoint de simulação (`POST /webhooks/pagamento/simular/:id`) — hoje ele só exige login de admin, o que é aceitável para homologação mas vale reavaliar em produção |
| E-mail | Implementar `EmailProvider` (`backend/src/email/`) para SES/Resend/SendGrid no lugar do `ConsoleEmailProvider` |
| Estorno | Implementar `RefundGateway` (`backend/src/refund/`) com a API de reembolso do gateway escolhido |
| Nota fiscal | Implementar `NotaFiscalProvider` (`backend/src/nota-fiscal/`) com um provedor real (ex.: NFE.io) |
| Frontend | Rebuildar a imagem com `NEXT_PUBLIC_API_URL` apontando para o domínio público real do backend; servir atrás de HTTPS |
| Backend | Servir atrás de HTTPS/reverse proxy; `CORS` hoje está aberto (`app.enableCors()` sem restrição) — restringir à origem real do frontend em produção |
| Observabilidade | O logging estruturado (`x-request-id` + log por requisição) já existe; plugar um coletor real (Datadog, CloudWatch, etc.) e alertas para os `Logger.error` de falha crítica (emissão/estorno/nota fiscal esgotando tentativas) |

Cada um desses pontos de integração já é uma interface plugável no código
(`*Provider`/`*Gateway`, injetadas via `@Inject`) — trocar a implementação de
desenvolvimento pela real é uma questão de criar uma nova classe e registrá-la
no módulo correspondente, sem tocar no resto do sistema.

## 3. Onde hospedar

Este repositório não está amarrado a nenhum provedor. Algumas combinações
comuns:

- **Simples**: backend + Postgres + Redis num provedor com deploy por Docker
  (Railway, Render, Fly.io); frontend na Vercel (Next.js nativo lá).
- **Containers próprios**: as imagens de `backend/Dockerfile` e
  `frontend/Dockerfile` já buildam standalone — sobem em qualquer orquestrador
  (ECS, Cloud Run, Kubernetes) sem alteração.
- **VPS único**: o `docker-compose.yml` da raiz roda como está atrás de um
  reverse proxy (Caddy/Nginx) para TLS — troque só os serviços gerenciados
  (banco, fila) se quiser mais resiliência que containers no mesmo host.
