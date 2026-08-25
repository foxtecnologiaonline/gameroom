import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PaginationQueryDto } from '../common/pagination/pagination.dto';
import { AuditoriaService } from './auditoria.service';

@Controller('admin/auditoria')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AuditoriaController {
  constructor(private readonly auditoriaService: AuditoriaService) {}

  @Get()
  listar(@Query() query: PaginationQueryDto) {
    return this.auditoriaService.listar(query.pagina, query.tamanho);
  }
}
