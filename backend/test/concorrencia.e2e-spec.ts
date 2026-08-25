import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import * as crypto from 'crypto';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { PedidosService } from '../src/pedidos/pedidos.service';
import { EstoqueService } from '../src/estoque/estoque.service';

/**
 * Testes de concorrência/idempotência contra Postgres e Redis reais (não
 * mockados) — são exatamente os caminhos que o desenvolvimento manual desta
 * plataforma revelou como propensos a bugs sutis de modelagem/race condition
 * (ver commit da Fase 1: unique constraint que impedia reaproveitar unidade
 * devolvida). Cobre §9 da especificação técnica v2.
 */
describe('Concorrência e idempotência (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let pedidosService: PedidosService;
  let estoqueService: EstoqueService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleFixture.createNestApplication();
    await app.init();

    prisma = app.get(PrismaService);
    pedidosService = app.get(PedidosService);
    estoqueService = app.get(EstoqueService);
  });

  afterAll(async () => {
    await app.close();
  });

  async function criarProdutoSerializado(
    sufixo: string,
    quantidadeDisponivel: number,
    limiarReabastecimento = 2,
  ) {
    const estoqueLotePadrao = 5;
    const produto = await prisma.produto.create({
      data: {
        nome: `Produto Teste Concorrencia ${sufixo} ${Date.now()}`,
        preco: 10,
        tipoEstoque: 'serializado',
        estoqueLotePadrao,
        limiarReabastecimento,
        status: 'ativo',
      },
    });
    if (quantidadeDisponivel > 0) {
      await prisma.unidadeEstoque.createMany({
        data: Array.from({ length: quantidadeDisponivel }, () => ({
          produtoId: produto.id,
          status: 'disponivel' as const,
        })),
      });
    }
    return produto;
  }

  it('reserva concorrente nunca vende a mesma unidade duas vezes e respeita o limite de estoque', async () => {
    const QUANTIDADE_DISPONIVEL = 3;
    const TENTATIVAS = 10;
    const produto = await criarProdutoSerializado(
      'reserva',
      QUANTIDADE_DISPONIVEL,
    );

    const resultados = await Promise.allSettled(
      Array.from({ length: TENTATIVAS }, (_, i) =>
        pedidosService.criar({
          compradorEmail: `concorrencia-reserva-${i}@example.com`,
          itens: [{ produtoId: produto.id, quantidade: 1 }],
        }),
      ),
    );

    const sucessos = resultados.filter(
      (
        r,
      ): r is PromiseFulfilledResult<
        Awaited<ReturnType<typeof pedidosService.criar>>
      > => r.status === 'fulfilled',
    );
    const falhas = resultados.filter((r) => r.status === 'rejected');

    // Exatamente as unidades disponíveis devem ter sido vendidas — nem uma a mais.
    expect(sucessos).toHaveLength(QUANTIDADE_DISPONIVEL);
    expect(falhas).toHaveLength(TENTATIVAS - QUANTIDADE_DISPONIVEL);

    const unidadesReservadas = sucessos.map((r) => r.value.itens[0].unidadeId);
    // Nenhuma unidade pode ter sido entregue a dois pedidos diferentes.
    expect(new Set(unidadesReservadas).size).toBe(QUANTIDADE_DISPONIVEL);

    const contagemReservada = await prisma.unidadeEstoque.count({
      where: { produtoId: produto.id, status: 'reservado' },
    });
    expect(contagemReservada).toBe(QUANTIDADE_DISPONIVEL);
  });

  it('webhook de pagamento é idempotente sob entrega concorrente (retry do gateway)', async () => {
    const produto = await criarProdutoSerializado('idempotencia', 5);
    const pedido = await pedidosService.criar({
      compradorEmail: 'idempotencia@example.com',
      itens: [{ produtoId: produto.id, quantidade: 1 }],
    });

    const payload = {
      pedidoId: pedido.id,
      transacaoId: `txn-teste-${pedido.id}`,
      status: 'aprovado' as const,
    };
    const segredo = process.env.PAGAMENTO_WEBHOOK_SECRET!;
    const rawBody = Buffer.from(JSON.stringify(payload));
    const assinatura = crypto
      .createHmac('sha256', segredo)
      .update(rawBody)
      .digest('hex');

    const [respostaA, respostaB] = await Promise.all([
      request(app.getHttpServer())
        .post('/webhooks/pagamento')
        .set('x-webhook-signature', assinatura)
        .send(payload),
      request(app.getHttpServer())
        .post('/webhooks/pagamento')
        .set('x-webhook-signature', assinatura)
        .send(payload),
    ]);

    expect(respostaA.status).toBe(200);
    expect(respostaB.status).toBe(200);

    const pedidoFinal = await prisma.pedido.findUniqueOrThrow({
      where: { id: pedido.id },
    });
    expect(pedidoFinal.status).toBe('confirmado');
    expect(pedidoFinal.gatewayTransacaoId).toBe(payload.transacaoId);

    const unidadeId = pedido.itens[0].unidadeId!;
    const unidadeFinal = await prisma.unidadeEstoque.findUniqueOrThrow({
      where: { id: unidadeId },
    });
    // A unidade foi vendida exatamente uma vez, não "revendida" pela segunda entrega do webhook.
    expect(unidadeFinal.status).toBe('vendido');
  });

  it('reabastecimento concorrente (job periódico + gatilho de venda) não gera o lote em duplicidade', async () => {
    const LIMIAR = 3; // precisa ser < estoqueLotePadrao (5, fixado no helper) para respeitar a check constraint
    const produto = await criarProdutoSerializado('reabastecimento', 1, LIMIAR);

    await Promise.all(
      Array.from({ length: 8 }, () =>
        estoqueService.reabastecerSeNecessario(produto.id),
      ),
    );

    const totalLogs = await prisma.logReabastecimento.count({
      where: { produtoId: produto.id },
    });
    expect(totalLogs).toBe(1);

    const totalUnidades = await prisma.unidadeEstoque.count({
      where: { produtoId: produto.id },
    });
    expect(totalUnidades).toBe(1 + produto.estoqueLotePadrao);
  });

  it('cancelar um pedido libera a unidade e ela pode ser reaproveitada em uma venda futura', async () => {
    const produto = await criarProdutoSerializado('cancelamento', 1);

    const pedidoA = await pedidosService.criar({
      compradorEmail: 'cancelamento-a@example.com',
      itens: [{ produtoId: produto.id, quantidade: 1 }],
    });
    const unidadeId = pedidoA.itens[0].unidadeId!;

    await pedidosService.cancelar(pedidoA.id);

    // Regressão do bug encontrado na Fase 1: unidade_id não pode ter unique
    // constraint em itens_pedido, senão esta segunda venda falharia.
    const pedidoB = await pedidosService.criar({
      compradorEmail: 'cancelamento-b@example.com',
      itens: [{ produtoId: produto.id, quantidade: 1 }],
    });

    expect(pedidoB.itens[0].unidadeId).toBe(unidadeId);
  });
});
