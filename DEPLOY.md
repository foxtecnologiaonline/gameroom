# Deploy

Este documento cobre duas coisas separadas: **rodar tudo localmente/em
homologação com Docker Compose** (funciona hoje, sem nenhuma credencial de
terceiro) e **o que falta para um deploy de produção de verdade** (precisa de
credenciais e infraestrutura que este repositório não define, propositalmente
— cada time tem seu provedor preferido).

## 1. Rodando com Docker Compose

Sobe Postgres, backend (NestJS) e frontend (Next.js) com um único comando —
pensado para demonstrar/homologar a plataforma completa, não para produção
(ver seção 2 sobre o que muda para produção). A fila de jobs assíncronos é o
QStash (HTTP) — em produção é o serviço real da Upstash; localmente, roda um
servidor de desenvolvimento em outro processo (não é mais um serviço no
compose, porque baixa um binário próprio no primeiro uso):

```bash
# terminal 1 — servidor de dev do QStash (fica rodando; imprime as chaves de
# assinatura de dev e a porta ao iniciar — confirme a porta no output e
# ajuste QSTASH_URL no .env se vier diferente de 8080)
npx @upstash/qstash-cli dev

cp .env.example .env
# edite o .env: gere os segredos indicados (openssl rand -base64 32 para
# CODIGO_ENCRYPTION_KEY, valores fortes para os *_SECRET, e as chaves de dev
# que o qstash-cli dev imprimiu para QSTASH_TOKEN/QSTASH_CURRENT_SIGNING_KEY/
# QSTASH_NEXT_SIGNING_KEY)

# terminal 2
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
| Banco de dados | Postgres gerenciado (RDS, Cloud SQL, Neon, Supabase, etc.), não o container do compose. **Com Supabase**: use a *connection pooling string* (porta `6543`, com `?pgbouncer=true` no final) em `DATABASE_URL`, e a *direct connection* (porta `5432`) em `DIRECT_URL` — migrations não funcionam através do pooler transacional |
| Fila de jobs | Conta Upstash real (não o `qstash-cli dev`) — `QSTASH_TOKEN`/`QSTASH_CURRENT_SIGNING_KEY`/`QSTASH_NEXT_SIGNING_KEY` do console.upstash.com/qstash; `APP_BASE_URL` apontando para o domínio público do backend (não `localhost`) |
| Segredos | `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CODIGO_ENCRYPTION_KEY`, `PAGAMENTO_WEBHOOK_SECRET` gerados com `openssl rand -base64 32` e guardados num secrets manager — nunca commitados |
| Armazenamento de conteúdo | *(v2.0 — não bloqueia o deploy do MVP)* Bucket S3 real (ou compatível) com as credenciais em `S3_*` |
| Gateway de pagamento | Trocar a verificação genérica em `backend/src/pagamento/webhook-signature.util.ts` pela verificação nativa do SDK do gateway escolhido (Stripe/Mercado Pago/PagSeguro); **remover ou proteger adicionalmente** o endpoint de simulação (`POST /webhooks/pagamento/simular/:id`) — hoje ele só exige login de admin, o que é aceitável para homologação mas vale reavaliar em produção |
| E-mail | Implementar `EmailProvider` (`backend/src/email/`) para SES/Resend/SendGrid no lugar do `ConsoleEmailProvider` |
| Estorno | Implementar `RefundGateway` (`backend/src/refund/`) com a API de reembolso do gateway escolhido |
| Nota fiscal | Implementar `NotaFiscalProvider` (`backend/src/nota-fiscal/`) com um provedor real (ex.: NFE.io) |
| Frontend | Rebuildar a imagem com `NEXT_PUBLIC_API_URL` apontando para o domínio público real do backend; servir atrás de HTTPS |
| Backend | Servir atrás de HTTPS/reverse proxy; definir `CORS_ORIGIN` (domínio do frontend) — sem a variável, CORS fica aberto (aceitável em dev/homologação) |
| Observabilidade | O logging estruturado (`x-request-id` + log por requisição) já existe; plugar um coletor real (Datadog, CloudWatch, etc.) e alertas para os `Logger.error` de falha crítica (emissão/estorno/nota fiscal esgotando tentativas) |

Cada um desses pontos de integração já é uma interface plugável no código
(`*Provider`/`*Gateway`, injetadas via `@Inject`) — trocar a implementação de
desenvolvimento pela real é uma questão de criar uma nova classe e registrá-la
no módulo correspondente, sem tocar no resto do sistema.

## 3. Onde hospedar

Este repositório não está amarrado a nenhum provedor. Algumas combinações
comuns:

- **Simples**: backend + Postgres num provedor com deploy por Docker
  (Railway, Render, Fly.io); frontend na Vercel (Next.js nativo lá). Nesse
  caminho o `Dockerfile` do backend continua valendo como está (o `CMD`
  roda migrations no boot do container).
- **Containers próprios**: as imagens de `backend/Dockerfile` e
  `frontend/Dockerfile` já buildam standalone — sobem em qualquer orquestrador
  (ECS, Cloud Run, Kubernetes) sem alteração.
- **VPS único**: o `docker-compose.yml` da raiz roda como está atrás de um
  reverse proxy (Caddy/Nginx) para TLS — troque só os serviços gerenciados
  (banco, fila) se quiser mais resiliência que containers no mesmo host.

### Stack escolhida para o MVP: 100% Vercel (frontend + backend) + Supabase (banco) + QStash (fila)

A Vercel é serverless (sem processo persistente), então a fila de jobs não
pode mais ser BullMQ+Redis (que dependia de um worker sempre de pé). O
backend foi migrado para publicar cada job assíncrono (emissão, expiração de
reserva, reabastecimento, devolução, nota fiscal) como uma mensagem HTTP no
**Upstash QStash**, que chama de volta uma rota do próprio backend quando o
job deve rodar — sem Redis, sem worker persistente. Ver
`docs/especificacao-tecnica-v2.md` § "Decisões de escopo do MVP" e o código
em `backend/src/jobs/` para o desenho completo.

A Vercel tem suporte nativo a NestJS (detecta `src/main.ts` e roda a app
como está, sem precisar de um adapter serverless manual) — por isso backend
e frontend são **dois projetos Vercel separados** apontando para o mesmo
repositório, cada um com seu próprio Root Directory.

**Passo a passo:**
1. **Upstash**: crie uma conta (gratuita) em upstash.com (ou pelo próprio
   Vercel Marketplace/Integrations — o painel da Vercel oferece Upstash como
   integração de um clique, o que já injeta as env vars no projeto). Crie
   uma fila QStash e copie `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY` e
   `QSTASH_NEXT_SIGNING_KEY` do console (console.upstash.com/qstash).
2. **Projeto Vercel do backend**: New Project → importe este repositório →
   **Root Directory = `backend`**. Defina as env vars (Project Settings →
   Environment Variables):
   - `DATABASE_URL` — connection pooling string do Supabase (porta `6543`,
     com `?pgbouncer=true` no final)
   - `DIRECT_URL` — direct connection do Supabase (porta `5432`)
   - `QSTASH_TOKEN`, `QSTASH_CURRENT_SIGNING_KEY`, `QSTASH_NEXT_SIGNING_KEY`
     — do passo 1 (deixe `QSTASH_URL` vazio — só é usado em dev local)
   - `APP_BASE_URL` — a URL pública deste mesmo projeto backend na Vercel
     (ex.: `https://gameroom-backend.vercel.app`) — precisa ser preenchida
     **depois do primeiro deploy**, quando o domínio existir, e então
     redeployada
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CODIGO_ENCRYPTION_KEY`,
     `PAGAMENTO_WEBHOOK_SECRET` — gerados com `openssl rand -base64 32`
   - `RESERVA_EXPIRACAO_MINUTOS=15`
   - `CORS_ORIGIN` — a URL do projeto frontend (passo 4) — pode deixar vazio
     no primeiro deploy (CORS aberto) e preencher depois, já que a URL do
     frontend só existe depois que os dois projetos estiverem no ar
   - `package.json` já tem o script `vercel-build` (`prisma generate &&
     prisma migrate deploy && nest build`) — a Vercel usa esse script
     automaticamente no lugar de `build`, então as migrations rodam durante
     o build, não a cada requisição
   - `backend/vercel.json` já define região `pdx1` (Portland/Oregon — a mais
     próxima do Supabase, que está em `aws-0-us-west-2`) e `maxDuration: 60`
     nas functions; ajuste a região se o projeto Supabase estiver em outra —
     **não verificado ao vivo nesta sessão** (sem acesso de rede pra testar
     contra a Vercel de verdade), conferir no primeiro deploy
3. **QStash Schedule** (substitui o antigo scheduler de 5 min do BullMQ):
   depois do primeiro deploy do backend, crie uma schedule apontando para
   `https://<seu-backend>.vercel.app/jobs/estoque/verificar-reabastecimento`
   com cron `*/5 * * * *` — pelo console da Upstash ou via
   `client.schedules.create(...)` do SDK (não é criado automaticamente pelo
   código; é um recurso provisionado uma vez, fora do deploy).
4. **Projeto Vercel do frontend** (já existe): aponte `NEXT_PUBLIC_API_URL`
   para a URL do projeto backend do passo 2 e faça redeploy — essa variável
   é embutida no bundle em build time.
5. **No backend**, depois que a URL do frontend for definitiva, defina
   `CORS_ORIGIN` com essa URL e redeploy — ver linha "Backend" na tabela
   acima.
6. Crie o admin inicial rodando `ADMIN_SEED_EMAIL=... ADMIN_SEED_SENHA=...
   npx prisma db seed` a partir de uma máquina com a `DATABASE_URL` de
   produção configurada (a Vercel não expõe shell interativo no projeto).

**Risco a validar cedo, antes de confiar 100% neste caminho**: o backend usa
`rawBody: true` (para verificar assinatura do webhook de pagamento e do
QStash) — isso precisa ser confirmado funcionando sob o proxy zero-config da
Vercel assim que o primeiro deploy subir. Se não funcionar, a alternativa é
reescrever `backend/src/main.ts` com um adapter serverless manual
(`@codegenie/serverless-express`) que dá controle direto sobre a captura do
raw body.
