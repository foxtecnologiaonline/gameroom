# GameRoom — Plataforma de venda e gestão de ativos digitais

Sistema para vender, entregar e controlar estoque de ativos digitais
(licenças, chaves, downloads), com automação de ponta a ponta: venda →
entrega → estoque → devolução.

## Estrutura do repositório

- [`docs/especificacao-tecnica-v2.md`](docs/especificacao-tecnica-v2.md) —
  especificação técnica completa (modelo de dados, regras de negócio,
  endpoints, jobs assíncronos).
- [`backend/`](backend/README.md) — API NestJS + Prisma/PostgreSQL +
  Upstash QStash (fila via HTTP). Implementa as três fases da especificação: produtos/estoque/
  checkout/pagamento/emissão (Fase 1), devoluções/área do cliente/painel
  admin (Fase 2), antifraude/observabilidade/nota fiscal/testes de
  concorrência (Fase 3).
- [`frontend/`](frontend/README.md) — loja, área do cliente e painel admin em
  Next.js, consumindo a API do backend.
- [`docker-compose.yml`](DEPLOY.md) + `DEPLOY.md` — sobe a stack completa
  localmente/em homologação com Docker; documenta o que falta para produção.

## Setup rápido

Com Docker (recomendado para ver tudo funcionando rápido):

```bash
cp .env.example .env   # preencha os segredos indicados no arquivo
docker compose up --build
```

Sem Docker, ver as instruções de setup em `backend/README.md` e
`frontend/README.md` (cada um roda com `npm run dev`, requer Postgres local e
o `npx @upstash/qstash-cli dev` de pé para o backend).

## Decisões de design que valem a leitura antes de mexer no código

- **`tipo_estoque`**: produtos podem ser `serializado` (lote finito de
  chaves/licenças, com importação de código) ou `sob_demanda` (acesso
  ilimitado, sem pré-alocação de 300 unidades vazias).
- **Devolução aprovada bloqueia a unidade, não a devolve a `disponivel`**: o
  código já foi exposto por e-mail ao comprador, então não pode ser revendido
  com segurança.
- **Todo ponto de integração externa é uma interface plugável** (e-mail,
  estorno, nota fiscal, storage) com uma implementação de desenvolvimento que
  só loga — trocar pela integração real de produção é criar uma classe nova,
  sem tocar no resto do sistema.

Mais contexto e o raciocínio por trás de cada decisão estão nos commits do
histórico do backend e do frontend.
