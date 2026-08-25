import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { PaginationQueryDto } from '../common/pagination/pagination.dto';
import { DevolucoesService } from './devolucoes.service';
import { DecisaoDevolucaoDto } from './dto/decisao-devolucao.dto';

@Controller('admin/devolucoes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminDevolucoesController {
  constructor(private readonly devolucoesService: DevolucoesService) {}

  @Get('revisao-manual')
  listarRevisaoManual(@Query() query: PaginationQueryDto) {
    return this.devolucoesService.listarRevisaoManual(query);
  }

  @Post(':id/decisao')
  decidir(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecisaoDevolucaoDto,
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.devolucoesService.decidirManualmente(
      id,
      admin.sub,
      dto.aprovar,
      dto.motivoRejeicao,
    );
  }
}
