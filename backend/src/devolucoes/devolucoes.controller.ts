import { Body, Controller, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateDevolucaoDto } from "./dto";
import { DevolucoesService } from "./devolucoes.service";

@UseGuards(JwtAuthGuard)
@Controller("devolucoes")
export class DevolucoesController {
  constructor(private readonly devolucoesService: DevolucoesService) {}

  @Post()
  criar(@Body() dto: CreateDevolucaoDto, @Req() req: any) {
    return this.devolucoesService.criar(dto.vendaId, dto.motivo, req.user);
  }

  @Get(":id")
  detalhe(@Param("id") id: string, @Req() req: any) {
    return this.devolucoesService.obterDoUsuario(id, req.user);
  }
}
