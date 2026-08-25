import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/pagination/pagination.dto';
import { EstoqueService } from './estoque.service';

@Controller('admin/reabastecimentos')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminReabastecimentosController {
  constructor(private readonly estoqueService: EstoqueService) {}

  @Get()
  listar(@Query() query: PaginationQueryDto) {
    return this.estoqueService.listarReabastecimentos(query);
  }
}
