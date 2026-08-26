# Especificação técnica v2 — Plataforma de venda e gestão de ativos digitais

> Revisão da especificação original. Mantém a visão de produto e a stack sugerida,
> mas corrige lacunas de modelagem, concorrência, segurança e compliance que
> impediriam o sistema de rodar em produção com segurança e sem intervenção manual
> além do estritamente necessário.

## 0. Sumário das mudanças em relação à v1

| # | Problema na v1 | Correção na v2 |
|---|---|---|
| 1 | `vendas` liga 1 venda → 1 unidade → não suporta compra de múltiplas unidades/produtos no mesmo carrinho | Introduz `pedidos` + `itens_pedido` (padrão order/line-item) |
| 2 | Todo produto sempre ganha 300 unidades com `codigo` vazio, mesmo produtos de acesso ilimitado (e-book, curso) | Novo campo `tipo_estoque` (`serializado` vs `sob_demanda`) — só produtos com chave/licença finita pré-alocam unidades |
| 3 | Unidade nasce `disponivel` mesmo sem `codigo` preenchido → risco de vender "vazio" | Novo status `aguardando_codigo`; unidade só vira `disponivel` quando o código é importado/gerado |
| 4 | Sem verificação de assinatura de webhook de pagamento | Verificação obrigatória de assinatura (HMAC do gateway) antes de qualquer transição de estado |
| 5 | Sem proteção contra reentrega/duplo processamento de webhook | `gateway_transacao_id` único + idempotência por chave de evento |
| 6 | Reabastecimento disparado por venda **e** por job periódico pode gerar corrida (300 + 300 duplicado) | `pg_advisory_xact_lock(produto_id)` envolvendo checagem + inserção |
| 7 | `liberar-reserva-expirada` descrito como job de varredura por intervalo | BullMQ **delayed job** agendado no momento da reserva (sem polling, sem SQL de varredura) |
| 8 | Códigos de licença armazenados em texto puro | Cifragem em repouso (AES-256-GCM em nível de aplicação) + log de auditoria em toda leitura |
| 9 | Sem verificação real de "uso" na regra de devolução automática | Tabela `acessos_conteudo` registra 1ª ativação/download; regra de elegibilidade consulta essa tabela |
| 10 | Devolução aprovada não fala nada sobre o dinheiro do cliente | Fluxo de devolução dispara **estorno no gateway** como parte da automação, não só troca de status da unidade |
| 11 | Sem rate limit / antifraude no checkout | Rate limit por IP/e-mail + fila de revisão de fraude (mesma mecânica de "revisão manual" das devoluções) |
| 12 | Sem estratégia de migração de schema definida (NestJS não traz ORM) | Prisma como ORM + migrations; SQL cru só no caminho crítico de concorrência (`FOR UPDATE SKIP LOCKED`) |
| 13 | Sem observabilidade, testes ou nota fiscal mencionados | Seções dedicadas adicionadas (§9, §10) |

O restante do documento já incorpora essas correções — não é necessário aplicar o diff manualmente.

### Decisões de escopo do MVP (26/08/2026)

- **Biblioteca de conteúdo fica fora do MVP, entra na v2.0**: upload de manuais/cartilhas/vídeos (`conteudos_produto`), storage S3 e o bloco de "materiais de apoio" no e-mail de entrega não são necessários para o MVP. O schema e o módulo (`conteudo/`) continuam existindo no código, só não são pré-requisito de lançamento — nenhum produto do MVP precisa ter conteúdo vinculado.
- **Modelo de entrega do MVP = credencial única por comprador**: cada unidade vendida entrega um usuário e senha exclusivos daquele comprador (nunca reaproveitados), não uma "chave" genérica. Isso **não exige mudança de schema nem de código** — é o mesmo campo `codigo` de `unidades_estoque` já usado hoje, tratado como string opaca (cifrada, única, importada em lote). Convenção de formatação na importação: uma credencial por linha, no formato `usuario:senha`.

---

## 1. Visão geral (ajustada)

Sistema para vender, entregar e controlar estoque de ativos digitais (licenças, chaves, downloads).

Dois regimes de estoque, escolhidos por produto:

- **`serializado`**: o produto representa um lote finito de códigos/chaves (ex.: chaves de jogo compradas de um fornecedor). Continua valendo a regra de lote de 300 unidades rastreadas individualmente.
- **`sob_demanda`**: o produto tem acesso "ilimitado" (ex.: e-book, vídeo-aula, download genérico). Não há pré-alocação de 300 unidades vazias — o "recibo de compra" é gerado on-the-fly na confirmação do pagamento. Isso evita 300 linhas fantasmas por produto que nunca terão um código real.

Módulos: catálogo de produtos, estoque dinâmico por unidade, pedidos/checkout, emissão e entrega automática, devoluções (com estorno), biblioteca de conteúdo, antifraude, painel administrativo, área do cliente.

## 2. Stack tecnológica (decisões fechadas)

- **Backend**: Node.js + NestJS (TypeScript)
- **ORM/migrations**: Prisma (schema-first, migrations versionadas). Para o caminho de reserva de estoque (`SELECT ... FOR UPDATE SKIP LOCKED`) e para o lock de reabastecimento (`pg_advisory_xact_lock`), usar `prisma.$transaction` com `$queryRaw` — o Prisma Client não expressa `SKIP LOCKED` nativamente.
- **Banco de dados**: PostgreSQL 15+
- **Fila/jobs assíncronos**: BullMQ + Redis. Reservas expiram via **delayed job**, não via cron de varredura.
- **Storage de arquivos**: S3 (ou compatível) com URLs assinadas de curta duração (≤ 15 min) para conteúdo e para exibição pontual de código de licença. *(v2.0 — biblioteca de conteúdo não é pré-requisito do MVP, ver "Decisões de escopo do MVP" acima.)*
- **Cifragem de dados sensíveis**: `codigo` da unidade cifrado em repouso (AES-256-GCM), chave gerenciada via KMS/secrets manager, nunca no código-fonte.
- **Autenticação**: JWT de curta duração + refresh token; roles `admin`/`cliente` separadas; 2FA obrigatório para contas admin (elas enxergam código de licença em claro e dados financeiros).
- **Frontend admin + loja**: Next.js
- **Pagamento**: gateway com webhook assinado (Stripe, Mercado Pago ou PagSeguro) — verificação de assinatura é obrigatória, não opcional.
- **E-mail transacional**: SES, Resend ou SendGrid, com fila própria e retry/backoff.
- **Observabilidade**: logging estruturado (pino), tracing (OpenTelemetry), alertas (Sentry) — ver §9.
- **Nota fiscal**: ponto de integração reservado (ex.: NFE.io) — obrigatório para operação legal de venda no Brasil; fora do MVP, mas o modelo de dados já deixa `pedidos.nota_fiscal_id` como campo opcional para não exigir retrabalho depois.

## 3. Modelo de dados v2 (PostgreSQL)

```sql
CREATE TYPE tipo_estoque        AS ENUM ('serializado', 'sob_demanda');
CREATE TYPE status_unidade      AS ENUM ('aguardando_codigo', 'disponivel', 'reservado', 'vendido', 'devolvido', 'bloqueado');
CREATE TYPE status_produto      AS ENUM ('rascunho', 'ativo', 'inativo');
CREATE TYPE status_pedido       AS ENUM ('pendente', 'confirmado', 'cancelado', 'estornado');
CREATE TYPE status_devolucao    AS ENUM ('pendente', 'aprovada_automatica', 'aprovada_manual', 'rejeitada');
CREATE TYPE tipo_conteudo       AS ENUM ('manual', 'cartilha', 'video');
CREATE TYPE motivo_reabastecimento AS ENUM ('automatico_limiar', 'manual');

CREATE TABLE produtos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  descricao TEXT,
  preco NUMERIC(10,2) NOT NULL CHECK (preco > 0),
  categoria TEXT,
  status status_produto NOT NULL DEFAULT 'rascunho',
  tipo_estoque tipo_estoque NOT NULL DEFAULT 'serializado',
  estoque_lote_padrao INT NOT NULL DEFAULT 300 CHECK (estoque_lote_padrao > 0),
  limiar_reabastecimento INT NOT NULL DEFAULT 30 CHECK (limiar_reabastecimento >= 0),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT limiar_menor_que_lote CHECK (limiar_reabastecimento < estoque_lote_padrao)
);

-- só se aplica a produtos tipo_estoque = 'serializado'
CREATE TABLE unidades_estoque (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES produtos(id),
  codigo_cifrado BYTEA,                  -- NULL enquanto aguardando_codigo
  codigo_hash TEXT UNIQUE,               -- hash determinístico p/ checar duplicidade sem decifrar
  status status_unidade NOT NULL DEFAULT 'aguardando_codigo',
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  atualizado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_unidades_produto_status ON unidades_estoque (produto_id, status);

CREATE TABLE pedidos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  comprador_email TEXT NOT NULL,
  status status_pedido NOT NULL DEFAULT 'pendente',
  valor_total NUMERIC(10,2) NOT NULL CHECK (valor_total >= 0),
  gateway_transacao_id TEXT UNIQUE,       -- garante idempotência do webhook
  nota_fiscal_id TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmado_em TIMESTAMPTZ
);

CREATE TABLE itens_pedido (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id UUID NOT NULL REFERENCES pedidos(id),
  produto_id UUID NOT NULL REFERENCES produtos(id),
  unidade_id UUID REFERENCES unidades_estoque(id),   -- NULL até reserva (ou sempre NULL se sob_demanda)
  valor_unitario NUMERIC(10,2) NOT NULL CHECK (valor_unitario >= 0),
  reservado_ate TIMESTAMPTZ,              -- prazo da reserva; job delayed usa este valor
  codigo_sob_demanda_cifrado BYTEA,       -- usado quando produto.tipo_estoque = 'sob_demanda'
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_itens_pedido_pedido ON itens_pedido (pedido_id);

CREATE TABLE acessos_conteudo (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_pedido_id UUID NOT NULL REFERENCES itens_pedido(id),
  tipo TEXT NOT NULL,                     -- 'download' | 'ativacao' | 'visualizacao_codigo'
  ip TEXT,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE devolucoes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_pedido_id UUID NOT NULL REFERENCES itens_pedido(id),
  motivo TEXT,
  status status_devolucao NOT NULL DEFAULT 'pendente',
  estorno_gateway_id TEXT,                -- preenchido quando o reembolso é efetivado
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now(),
  processado_em TIMESTAMPTZ
);

CREATE TABLE conteudos_produto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES produtos(id),
  tipo tipo_conteudo NOT NULL,
  titulo TEXT NOT NULL,
  url_arquivo TEXT NOT NULL,
  ordem INT NOT NULL DEFAULT 0
);

CREATE TABLE usuarios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nome TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  senha_hash TEXT NOT NULL,
  tipo TEXT NOT NULL CHECK (tipo IN ('admin', 'cliente')),
  totp_secret_cifrado BYTEA,              -- 2FA, obrigatório para tipo = 'admin'
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE logs_reabastecimento (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  produto_id UUID NOT NULL REFERENCES produtos(id),
  quantidade_gerada INT NOT NULL,
  motivo motivo_reabastecimento NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE logs_auditoria (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  usuario_id UUID REFERENCES usuarios(id),
  acao TEXT NOT NULL,                     -- ex.: 'visualizou_codigo', 'aprovou_devolucao_manual'
  entidade TEXT NOT NULL,
  entidade_id UUID NOT NULL,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

Notas de design:

- `codigo_cifrado`/`codigo_hash` substituem o antigo `codigo TEXT UNIQUE` em texto puro. O hash (ex.: SHA-256 com pepper) permite checar duplicidade de importação sem decifrar; a decifragem só acontece no momento de emissão/exibição e gera linha em `logs_auditoria`.
- Toda leitura administrativa de um código em claro (`GET /admin/estoque/:id/codigo`, se existir) deve gravar `logs_auditoria`.
- `itens_pedido.unidade_id` fica nulo para produtos `sob_demanda` — o "comprovante" fica em `codigo_sob_demanda_cifrado` no próprio item, sem precisar de uma linha em `unidades_estoque`.

## 4. Regras de negócio e automação (v2)

1. **Criação de produto (`serializado`)**: transação única com `generate_series` cria `estoque_lote_padrao` unidades com status `aguardando_codigo` (não `disponivel`). O produto só pode mudar de `rascunho` para `ativo` quando houver pelo menos 1 unidade `disponivel` (ou seja, com código importado).
2. **Importação de códigos**: endpoint dedicado (`POST /admin/estoque/:produto_id/importar-codigos`, CSV ou API do fornecedor) cifra cada código, calcula `codigo_hash`, preenche uma unidade `aguardando_codigo` por vez e muda seu status para `disponivel`. Duplicidade (mesmo `codigo_hash`) é rejeitada automaticamente. Esta é a única etapa que costuma depender de uma fonte externa (fornecedor de chaves) — quando o fornecedor tem API, a importação também é automática via job.
3. **Reabastecimento automático**: acionado ao final de toda confirmação de pedido e também por job periódico de segurança (a cada poucos minutos). Ambos os gatilhos entram em `pg_advisory_xact_lock(hashtext(produto_id::text))` antes de contar unidades `disponivel` — evita gerar 2× 300 unidades por corrida entre os dois gatilhos. Gera novo lote como `aguardando_codigo` (segue a regra 2) e grava `logs_reabastecimento`. Produtos `sob_demanda` não passam por este fluxo.
4. **Reserva (checkout)**: dentro de transação, `SELECT id FROM unidades_estoque WHERE produto_id = $1 AND status = 'disponivel' LIMIT 1 FOR UPDATE SKIP LOCKED`; muda para `reservado`, grava `itens_pedido.reservado_ate = now() + intervalo` e agenda um **BullMQ delayed job** (`delay = intervalo`) que libera a unidade se o pedido não confirmar. Nada de cron varrendo a tabela inteira. Produtos `sob_demanda` não reservam unidade — o item de pedido fica `pendente` até a confirmação, sem lock de estoque.
5. **Confirmação via webhook**: (a) verifica assinatura HMAC do gateway — payload não assinado corretamente é descartado e logado; (b) usa `pedidos.gateway_transacao_id` como chave de idempotência (`ON CONFLICT DO NOTHING` / checagem prévia) para tolerar reentrega do webhook; (c) transação atômica: unidade(s) → `vendido`, pedido → `confirmado`; (d) dispara `emitir-e-entregar` por item.
6. **Emissão e entrega automática**: para `serializado`, usa o código já associado à unidade vendida; para `sob_demanda`, gera/obtém o código on-the-fly (chamada a serviço interno ou fornecedor) e grava em `codigo_sob_demanda_cifrado`. Monta e envia e-mail com produto + conteúdos vinculados; libera acesso na área do cliente. Job idempotente (checagem de "já emitido" antes de reenviar) e com fila de retry + alerta ao admin se falhar após N tentativas — pedido pago sem entrega é o pior estado possível do sistema e nunca deve falhar silenciosamente.
7. **Devolução com aprovação automática**: cliente solicita → sistema verifica automaticamente (a) prazo (padrão 7 dias corridos, alinhado ao direito de arrependimento do CDC) e (b) ausência de registro em `acessos_conteudo` para o item. Elegível → aprova automaticamente, unidade volta para `disponivel` (ou é bloqueada/descartada se já houve qualquer ativação irreversível), **dispara estorno no gateway de pagamento**, envia e-mail de confirmação. Não elegível pelas regras → **revisão manual** (única etapa não automatizada do fluxo).
8. **Antifraude (nova)**: rate limit por IP/e-mail em `/checkout`; pedidos com sinais de risco (ex.: mesmo e-mail com múltiplas devoluções, velocity alta) entram em fila de retenção antes da emissão — mesma mecânica de exceção que a revisão manual de devolução, não interrompe o restante do fluxo automatizado.

## 5. Fluxos principais (atualizado)

- **Cadastro de produto**: admin define `tipo_estoque`. Se `serializado`, sistema já cria o lote como `aguardando_codigo` e sinaliza pendência de importação de código antes de poder ativar o produto. Se `sob_demanda`, produto pode ser ativado imediatamente após cadastro dos conteúdos.
- **Venda**: cliente monta pedido com 1+ itens → reserva automática por item (quando aplicável) → pagamento confirmado via webhook assinado e idempotente → emissão e entrega automática por item → conteúdo de apoio liberado.
- **Reabastecimento**: disparado pelo fluxo de venda e por job de segurança, protegido por lock, sem tela manual — mas a "ativação" de unidades novas depende da importação de código (regra 2), que é automática quando o fornecedor tem API e manual apenas na integração inicial com um novo fornecedor.
- **Devolução**: solicitação do cliente → validação automática de prazo + uso → aprovação automática com estorno, ou fila de revisão manual (exceção).

## 6. Endpoints da API (REST, v2)

```
POST   /produtos                          -> cria produto (define tipo_estoque; dispara geração de estoque se serializado)
PATCH  /produtos/:id                      -> edita produto
GET    /produtos                          -> lista produtos ativos (paginado, filtrável por categoria)
GET    /produtos/:id                      -> detalhe + conteúdos vinculados
POST   /produtos/:id/conteudos            -> upload de manual/cartilha/vídeo
POST   /admin/estoque/:produto_id/importar-codigos   -> importa lote de códigos (CSV/API fornecedor)

POST   /pedidos                           -> cria pedido com 1+ itens, reserva unidades
POST   /webhooks/pagamento                -> callback do gateway (assinatura verificada, idempotente)
POST   /pedidos/:id/cancelar              -> cancela pedido pendente e libera reservas

GET    /minhas-compras                    -> área do cliente: itens comprados + conteúdo
POST   /itens-pedido/:id/devolucoes       -> solicita devolução
GET    /devolucoes/:id                    -> status da devolução

GET    /admin/estoque/:produto_id         -> visão da tabela dinâmica de unidades (paginada)
GET    /admin/pedidos                     -> relatório de vendas (paginado, filtrável)
GET    /admin/reabastecimentos            -> log de reabastecimentos automáticos
GET    /admin/devolucoes/revisao-manual   -> fila de revisão manual
POST   /admin/devolucoes/:id/decisao      -> decisão humana (aprovar/rejeitar) na exceção manual
GET    /admin/auditoria                   -> trilha de auditoria (leituras de código, decisões manuais)
GET    /healthz                           -> readiness/liveness
```

## 7. Jobs assíncronos (fila) — v2

- `gerar-estoque-inicial` (produto_id, quantidade) — só produtos `serializado`
- `reabastecer-estoque` (produto_id, quantidade) — protegido por advisory lock
- `liberar-reserva-expirada` (item_pedido_id) — **delayed job agendado no momento da reserva**, não cron de varredura
- `emitir-e-entregar` (item_pedido_id) — idempotente, com DLQ + alerta em falha persistente
- `processar-devolucao` (devolucao_id) — inclui chamada de estorno ao gateway
- `importar-codigos` (produto_id, lote) — quando fornecedor expõe API própria

Política padrão de todos os jobs: retry com backoff exponencial (ex.: 3 tentativas), dead-letter queue, e idempotência via chave de negócio (não apenas `job.id`) para tolerar reprocessamento.

## 8. Segurança e compliance (nova seção)

- **Webhooks**: verificação obrigatória de assinatura HMAC antes de processar qualquer evento do gateway.
- **Dados sensíveis**: código de licença cifrado em repouso; nunca logado em texto puro; toda decifragem gera `logs_auditoria`.
- **2FA obrigatório** para contas `admin`.
- **LGPD**: base legal e retenção definidas para `comprador_email` e dados de pedido; endpoint de exclusão/anonimização de dados do cliente mediante solicitação.
- **Antifraude**: rate limiting em `/pedidos` e `/webhooks/pagamento`; fila de retenção para pedidos de risco.
- **Nota fiscal**: ponto de integração reservado no modelo de dados (`pedidos.nota_fiscal_id`), mesmo que a emissão fique fora do MVP.

## 9. Observabilidade e testes (nova seção)

- Logging estruturado com correlação por `pedido_id`/`item_pedido_id` em toda a cadeia (checkout → webhook → emissão).
- Alertas obrigatórios: falha persistente em `emitir-e-entregar` (pedido pago sem entrega), falha em `reabastecer-estoque`, estoque `disponivel` chegando a zero mesmo após reabastecimento (sinal de que a importação de códigos não acompanhou a demanda).
- Testes de concorrência dedicados para o `SELECT ... FOR UPDATE SKIP LOCKED` (N clientes disputando a última unidade) e para o lock de reabastecimento.
- Teste de idempotência de webhook (mesmo evento entregue 2× não deve gerar 2 emissões).

## 10. Estrutura de pastas (NestJS, ajustada)

```
src/
  produtos/
  estoque/          (inclui importação/cifragem de código)
  pedidos/          (antigo "vendas", agora pedidos + itens_pedido)
  devolucoes/       (inclui integração de estorno)
  conteudo/
  pagamento/        (integração + webhook + verificação de assinatura)
  antifraude/
  jobs/             (processors do BullMQ)
  auth/             (JWT + 2FA)
  auditoria/
  common/           (guards, interceptors, utils, cifragem)
prisma/
  schema.prisma
  migrations/
```

## 11. Ordem de implementação (revisada)

**Fase 1 — MVP funcional (produtos `serializado`, fluxo síncrono):**
1. Setup do projeto (NestJS + Prisma + PostgreSQL + Redis + BullMQ) e migrations do schema §3
2. Módulo de produtos (CRUD) + geração automática de lote em `aguardando_codigo`
3. Módulo de estoque: importação de códigos (cifragem, hash, dedupe) + transições de status + lock de concorrência
4. ~~Módulo de conteúdo (upload e vínculo de manuais/cartilhas/vídeos)~~ — adiado para v2.0, não bloqueia o MVP
5. Módulo de pedidos/checkout (reserva via `FOR UPDATE SKIP LOCKED`) + delayed job de expiração de reserva
6. Webhook de pagamento (verificação de assinatura + idempotência) + confirmação atômica
7. Job de emissão e entrega automática (e-mail + liberação de acesso), idempotente com DLQ/alerta
8. Job de reabastecimento automático com advisory lock + log

**Fase 2 — Ciclo completo:**
9. Módulo de devoluções: regra automática (prazo + `acessos_conteudo`) + estorno no gateway + fila de revisão manual
10. Área do cliente (compras + acesso a conteúdo)
11. Painel admin (produtos, estoque, pedidos, reabastecimento, revisão manual, auditoria)

**Fase 3 — Diferenciação:**
12. Suporte a `tipo_estoque = sob_demanda` (produtos de acesso ilimitado sem pré-alocação de unidades)
13. Antifraude (rate limiting + fila de retenção de pedidos de risco)
14. Observabilidade (logging estruturado, alertas, tracing) e suíte de testes de concorrência/idempotência
15. Integração de nota fiscal

## 12. Decisões em aberto (precisam de confirmação do time de negócio)

- **Fornecedor de códigos**: os códigos de licença vêm de importação de um fornecedor externo, ou o próprio sistema deve gerar chaves válidas (ex.: chamando uma API de ativação)? Isso muda o job `importar-codigos` de "upload de CSV" para "chamada síncrona a terceiro".
- **Prazo e regra exata de elegibilidade de devolução automática** (7 dias é um ponto de partida baseado no CDC, mas a regra de "sem uso" pode precisar de nuances por tipo de produto).
- **Política de estorno**: reembolso integral sempre, ou desconto de taxa/parcial em algum cenário?
- **Nota fiscal**: obrigatória desde o MVP ou pode ficar na Fase 3?
