import { Body, Controller, HttpCode, Post, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { EstoqueService } from '../../estoque/estoque.service';
import { QstashSignatureGuard } from '../qstash-signature.guard';
import {
  GerarEstoqueInicialJobDto,
  ReabastecerEstoqueJobDto,
} from '../dto/job-payloads.dto';

/** Corpo de cada handler é o mesmo do antigo EstoqueProcessor.process(). */
@Controller('jobs/estoque')
@UseGuards(QstashSignatureGuard)
export class EstoqueJobsController {
  constructor(
    private readonly estoqueService: EstoqueService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('gerar-estoque-inicial')
  @HttpCode(200)
  async gerarEstoqueInicial(
    @Body() dto: GerarEstoqueInicialJobDto,
  ): Promise<void> {
    await this.estoqueService.gerarLote(dto.produtoId, dto.quantidade);
  }

  @Post('reabastecer-estoque')
  @HttpCode(200)
  async reabastecerEstoque(
    @Body() dto: ReabastecerEstoqueJobDto,
  ): Promise<void> {
    await this.estoqueService.reabastecerSeNecessario(dto.produtoId);
  }

  /**
   * Varredura de segurança (item 3 das regras de negócio v2), chamada pela
   * QStash Schedule periódica em vez do antigo `estoque.scheduler.ts`.
   */
  @Post('verificar-reabastecimento')
  @HttpCode(200)
  async verificarReabastecimento(): Promise<void> {
    const produtos = await this.prisma.produto.findMany({
      where: { tipoEstoque: 'serializado', status: { not: 'inativo' } },
      select: { id: true },
    });
    for (const produto of produtos) {
      await this.estoqueService.reabastecerSeNecessario(produto.id);
    }
  }
}
