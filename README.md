# Gameroom — Frontend

Frontend da plataforma de ativos digitais (Next.js 14, App Router, Tailwind).
Cobre loja pública, área do cliente e painel admin, consumindo a API REST via
`src/lib/api.ts`.

## Rodando localmente

```bash
cp .env.example .env.local   # ajuste NEXT_PUBLIC_API_URL para a API real
npm install
npm run dev
```

## Nota sobre o contrato da API

No momento em que este frontend foi implementado, o repositório não continha
nenhum código de backend (diretório `backend/` inexistente, repositório sem
histórico). Os endpoints e formatos de request/response foram inferidos a
partir da especificação funcional (rotas, campos e fluxos descritos na
especificação técnica), já que a tabela de mapeamento de endpoints não estava
disponível no documento de origem.

Todos os paths de endpoint estão centralizados em `src/lib/api.ts`
(`endpoints`), e os tipos correspondentes em `src/lib/types.ts` — ambos os
arquivos devem ser revisados e ajustados assim que o contrato real do backend
NestJS estiver disponível. Pontos que provavelmente precisarão de ajuste:

- `GET /vendas/:id` para consultar o status de uma venda em `/checkout/[vendaId]`.
- `POST /checkout/webhook/simular` como stub de simulação de pagamento em dev.
- Formato exato do payload de `POST /checkout`, `POST /produtos/:id/conteudos`
  (multipart) e das respostas de `GET /admin/estoque/:produto_id`.

## Estrutura

- `src/lib/api.ts` — cliente HTTP com injeção automática de token e parse de erros.
- `src/lib/auth-context.tsx` — `AuthProvider`/`useAuth`, JWT em `localStorage`.
- `src/components/guards/` — `RequireAuth`, `RequireAdmin`.
- `src/components/layouts/` — `ClienteLayout`, `AdminLayout`.
- `src/app/` — rotas da loja pública, área do cliente ((cliente)) e admin (admin).
