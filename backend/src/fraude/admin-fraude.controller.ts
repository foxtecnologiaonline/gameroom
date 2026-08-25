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
import { FraudeService } from './fraude.service';
import { DecisaoRetencaoDto } from './dto/decisao-retencao.dto';

@Controller('admin/fraude/retencoes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
export class AdminFraudeController {
  constructor(private readonly fraudeService: FraudeService) {}

  @Get()
  listar(@Query() query: PaginationQueryDto) {
    return this.fraudeService.listarPendentes(query);
  }

  @Post(':id/decisao')
  decidir(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: DecisaoRetencaoDto,
    @CurrentUser() admin: JwtPayload,
  ) {
    return this.fraudeService.decidir(id, admin.sub, dto.liberar);
  }
}
