-- CreateEnum
CREATE TYPE "status_retencao_fraude" AS ENUM ('pendente', 'liberada', 'bloqueada');

-- CreateTable
CREATE TABLE "retencoes_fraude" (
    "id" UUID NOT NULL,
    "pedido_id" UUID NOT NULL,
    "motivo" TEXT NOT NULL,
    "status" "status_retencao_fraude" NOT NULL DEFAULT 'pendente',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "decidido_em" TIMESTAMP(3),

    CONSTRAINT "retencoes_fraude_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "retencoes_fraude" ADD CONSTRAINT "retencoes_fraude_pedido_id_fkey" FOREIGN KEY ("pedido_id") REFERENCES "pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
