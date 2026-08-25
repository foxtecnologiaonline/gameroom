import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AuditoriaService {
  constructor(private readonly prisma: PrismaService) {}

  async registrar(params: {
    usuarioId?: string;
    acao: string;
    entidade: string;
    entidadeId: string;
  }) {
    await this.prisma.logAuditoria.create({
      data: {
        usuarioId: params.usuarioId,
        acao: params.acao,
        entidade: params.entidade,
        entidadeId: params.entidadeId,
      },
    });
  }

  async listar(pagina: number, tamanho: number) {
    const [dados, total] = await Promise.all([
      this.prisma.logAuditoria.findMany({
        orderBy: { criadoEm: 'desc' },
        skip: (pagina - 1) * tamanho,
        take: tamanho,
        include: { usuario: { select: { id: true, nome: true, email: true } } },
      }),
      this.prisma.logAuditoria.count(),
    ]);
    return {
      dados,
      total,
      pagina,
      tamanho,
      totalPaginas: Math.max(1, Math.ceil(total / tamanho)),
    };
  }
}
