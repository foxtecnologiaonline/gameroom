-- CreateEnum
CREATE TYPE "tipo_estoque" AS ENUM ('serializado', 'sob_demanda');

-- CreateEnum
CREATE TYPE "status_unidade" AS ENUM ('aguardando_codigo', 'disponivel', 'reservado', 'vendido', 'devolvido', 'bloqueado');

-- CreateEnum
CREATE TYPE "status_produto" AS ENUM ('rascunho', 'ativo', 'inativo');

-- CreateEnum
CREATE TYPE "status_pedido" AS ENUM ('pendente', 'confirmado', 'cancelado', 'estornado');

-- CreateEnum
CREATE TYPE "status_devolucao" AS ENUM ('pendente', 'aprovada_automatica', 'aprovada_manual', 'rejeitada');

-- CreateEnum
CREATE TYPE "tipo_conteudo" AS ENUM ('manual', 'cartilha', 'video');

-- CreateEnum
CREATE TYPE "motivo_reabastecimento" AS ENUM ('automatico_limiar', 'manual');

-- CreateEnum
CREATE TYPE "TipoUsuario" AS ENUM ('admin', 'cliente');

-- CreateTable
CREATE TABLE "produtos" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "preco" DECIMAL(10,2) NOT NULL,
    "categoria" TEXT,
    "status" "status_produto" NOT NULL DEFAULT 'rascunho',
    "tipo_estoque" "tipo_estoque" NOT NULL DEFAULT 'serializado',
    "estoque_lote_padrao" INTEGER NOT NULL DEFAULT 300,
    "limiar_reabastecimento" INTEGER NOT NULL DEFAULT 30,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "produtos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "unidades_estoque" (
    "id" UUID NOT NULL,
    "produto_id" UUID NOT NULL,
    "codigo_cifrado" BYTEA,
    "codigo_hash" TEXT,
    "status" "status_unidade" NOT NULL DEFAULT 'aguardando_codigo',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "unidades_estoque_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pedidos" (
    "id" UUID NOT NULL,
    "comprador_email" TEXT NOT NULL,
    "status" "status_pedido" NOT NULL DEFAULT 'pendente',
    "valor_total" DECIMAL(10,2) NOT NULL,
    "gateway_transacao_id" TEXT,
    "nota_fiscal_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "confirmado_em" TIMESTAMP(3),

    CONSTRAINT "pedidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "itens_pedido" (
    "id" UUID NOT NULL,
    "pedido_id" UUID NOT NULL,
    "produto_id" UUID NOT NULL,
    "unidade_id" UUID,
    "valor_unitario" DECIMAL(10,2) NOT NULL,
    "reservado_ate" TIMESTAMP(3),
    "codigo_sob_demanda_cifrado" BYTEA,
    "emitido_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "itens_pedido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "acessos_conteudo" (
    "id" UUID NOT NULL,
    "item_pedido_id" UUID NOT NULL,
    "tipo" TEXT NOT NULL,
    "ip" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "acessos_conteudo_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "devolucoes" (
    "id" UUID NOT NULL,
    "item_pedido_id" UUID NOT NULL,
    "motivo" TEXT,
    "status" "status_devolucao" NOT NULL DEFAULT 'pendente',
    "estorno_gateway_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processado_em" TIMESTAMP(3),

    CONSTRAINT "devolucoes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conteudos_produto" (
    "id" UUID NOT NULL,
    "produto_id" UUID NOT NULL,
    "tipo" "tipo_conteudo" NOT NULL,
    "titulo" TEXT NOT NULL,
    "url_arquivo" TEXT NOT NULL,
    "ordem" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "conteudos_produto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usuarios" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "tipo" "TipoUsuario" NOT NULL,
    "totp_secret_cifrado" BYTEA,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs_reabastecimento" (
    "id" UUID NOT NULL,
    "produto_id" UUID NOT NULL,
    "quantidade_gerada" INTEGER NOT NULL,
    "motivo" "motivo_reabastecimento" NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_reabastecimento_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "logs_auditoria" (
    "id" UUID NOT NULL,
    "usuario_id" UUID,
    "acao" TEXT NOT NULL,
    "entidade" TEXT NOT NULL,
    "entidade_id" UUID NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "logs_auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "unidades_estoque_codigo_hash_key" ON "unidades_estoque"("codigo_hash");

-- CreateIndex
CREATE INDEX "unidades_estoque_produto_id_status_idx" ON "unidades_estoque"("produto_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "pedidos_gateway_transacao_id_key" ON "pedidos"("gateway_transacao_id");

-- CreateIndex
CREATE UNIQUE INDEX "itens_pedido_unidade_id_key" ON "itens_pedido"("unidade_id");

-- CreateIndex
CREATE INDEX "itens_pedido_pedido_id_idx" ON "itens_pedido"("pedido_id");

-- CreateIndex
CREATE INDEX "acessos_conteudo_item_pedido_id_idx" ON "acessos_conteudo"("item_pedido_id");

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- AddForeignKey
ALTER TABLE "unidades_estoque" ADD CONSTRAINT "unidades_estoque_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_pedido" ADD CONSTRAINT "itens_pedido_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_pedido" ADD CONSTRAINT "itens_pedido_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "itens_pedido" ADD CONSTRAINT "itens_pedido_unidade_id_fkey" FOREIGN KEY ("unidade_id") REFERENCES "unidades_estoque"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "acessos_conteudo" ADD CONSTRAINT "acessos_conteudo_item_pedido_id_fkey" FOREIGN KEY ("item_pedido_id") REFERENCES "itens_pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "devolucoes" ADD CONSTRAINT "devolucoes_item_pedido_id_fkey" FOREIGN KEY ("item_pedido_id") REFERENCES "itens_pedido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conteudos_produto" ADD CONSTRAINT "conteudos_produto_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs_reabastecimento" ADD CONSTRAINT "logs_reabastecimento_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "logs_auditoria" ADD CONSTRAINT "logs_auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CheckConstraint (regras de negocio da especificacao v2, secao 3)
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_preco_positivo" CHECK ("preco" > 0);
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_lote_positivo" CHECK ("estoque_lote_padrao" > 0);
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_limiar_nao_negativo" CHECK ("limiar_reabastecimento" >= 0);
ALTER TABLE "produtos" ADD CONSTRAINT "produtos_limiar_menor_que_lote" CHECK ("limiar_reabastecimento" < "estoque_lote_padrao");
ALTER TABLE "pedidos" ADD CONSTRAINT "pedidos_valor_total_nao_negativo" CHECK ("valor_total" >= 0);
ALTER TABLE "itens_pedido" ADD CONSTRAINT "itens_pedido_valor_unitario_nao_negativo" CHECK ("valor_unitario" >= 0);
