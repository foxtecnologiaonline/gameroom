# GameRoom → Marketplace: escopo atual vs. objetivo

> Notas de referência para quando o pivot de "loja própria" para "marketplace
> multi-vendedor" (modelo Mercado Livre) for priorizado. Nenhuma implementação
> foi iniciada — este documento só registra o diagnóstico e as opções de rota.

## Diagnóstico: o que existe hoje

O GameRoom, como construído (Fases 1–3 da especificação técnica), é uma
**loja própria (single-seller)**, não um marketplace. Não há em nenhum lugar
do código o conceito de vendedor/loja terceira (`grep` por
`vendedor|marketplace|seller` no repo inteiro: zero ocorrências).

Evidências:

- `Produto` (`backend/prisma/schema.prisma`) não tem dono — nenhum
  `vendedorId`. Todo produto pertence à plataforma.
- `Usuario.tipo` só admite `admin` ou `cliente` — não existe papel de
  vendedor/lojista.
- `Pedido`/`ItemPedido` não fazem split por vendedor — o pagamento é 100%
  para a plataforma, sem noção de comissão/repasse.
- O painel `/admin` (frontend) é o painel único da empresa (produtos,
  estoque, devoluções, fraude) — não um painel escopado por vendedor.
- A loja pública (`frontend/src/app/page.tsx`) lista produtos por categoria,
  mas não há vitrine de vendedor, rating de vendedor nem reputação — que é
  o centro da experiência tipo Mercado Livre.

## O que já é reaproveitável

- Padrão `Pedido` + `ItemPedido` (carrinho multi-item) — base correta para
  marketplace; só falta atribuir cada item a um vendedor.
- Estoque serializado/sob-demanda, antifraude, devoluções com estorno,
  emissão de nota fiscal, storage assinado para conteúdo — é lógica de
  e-commerce que continua válida por vendedor, não é específica de loja
  única.
- Auth JWT + roles + 2FA para admin — vira a base de auth para 3 papéis
  (admin da plataforma, vendedor, cliente).
- Integrações plugáveis (e-mail, storage, pagamento) — facilita adicionar
  split de pagamento sem reescrever o resto.

## Lacunas para virar marketplace (ordem de impacto)

1. **Entidade Vendedor/Loja** — cadastro, KYC básico, status de aprovação,
   vínculo com `Usuario`.
2. **`Produto.vendedorId`** — todo produto passa a pertencer a um vendedor;
   catálogo público passa a listar produtos de N vendedores.
3. **Split de pagamento/comissão** — hoje o dinheiro vai 100% para a
   plataforma; marketplace precisa de comissão da plataforma + repasse ao
   vendedor (gateway com split — ex. Mercado Pago Marketplace — ou ledger
   interno + payout manual/automático).
4. **Painel do vendedor** — versão restrita do `/admin` atual, escopada ao
   próprio vendedor (produtos, pedidos, devoluções, saldo a receber).
5. **Reputação/avaliação** — nota do vendedor e do produto.
6. **Moderação da plataforma** — admin aprova/suspende vendedores e
   produtos, resolve disputas comprador-vendedor.
7. **Devolução/antifraude por vendedor** — hoje é global; precisa saber "de
   qual vendedor" para decidir estorno e retenção.

## Opções de rota (a decidir quando for priorizado)

- **A. Modelo de dados primeiro**: entidade Vendedor, `TipoUsuario=vendedor`,
  `Produto.vendedorId`, migrations Prisma. Base sem a qual o resto não faz
  sentido.
- **B. Documento de arquitetura/roadmap detalhado**: uma spec nos moldes de
  `docs/especificacao-tecnica-v2.md`, cobrindo modelo de dados, split de
  pagamento, papéis e telas, para validação antes de codar.
- **C. Painel do vendedor (frontend)**: cadastro de loja, produtos, pedidos,
  assumindo que o modelo de dados evolui em paralelo.
- **D. Split de pagamento/comissão**: a parte mais delicada e mais difícil
  de mudar depois — como o dinheiro se divide entre plataforma e vendedor
  no checkout e nos estornos.

Recomendação: começar por **A** (modelo de dados), pois toda outra frente
(painel do vendedor, split de pagamento, moderação) depende de já existir
um dono (`vendedorId`) por produto e pedido.
