import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { diskStorage } from "multer";
import { extname, join } from "path";
import { AuthService } from "../auth/auth.service";
import { AdminGuard } from "../auth/guards/admin.guard";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { CreateProdutoDto, UpdateProdutoDto } from "./dto";
import { ProdutosService } from "./produtos.service";

@Controller("produtos")
export class ProdutosController {
  constructor(private readonly produtosService: ProdutosService, private readonly authService: AuthService) {}

  @Get()
  async listar(@Query("admin") admin: string | undefined, @Headers("authorization") authHeader?: string) {
    if (admin === "true") {
      const usuario = await this.authService.resolveUsuarioFromAuthHeader(authHeader);
      if (!usuario) throw new UnauthorizedException("Autenticação necessária");
      if (usuario.tipo !== "admin") throw new ForbiddenException("Acesso restrito a administradores");
      return this.produtosService.listarTodos();
    }
    return this.produtosService.listarAtivos();
  }

  @Get(":id")
  async detalhe(@Param("id") id: string, @Headers("authorization") authHeader?: string) {
    const usuario = await this.authService.resolveUsuarioFromAuthHeader(authHeader);
    return this.produtosService.obterDetalhe(id, usuario?.tipo === "admin");
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  criar(@Body() dto: CreateProdutoDto) {
    return this.produtosService.criar(dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Patch(":id")
  atualizar(@Param("id") id: string, @Body() dto: UpdateProdutoDto) {
    return this.produtosService.atualizar(id, dto);
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(":id/conteudos")
  @UseInterceptors(
    FileInterceptor("arquivo", {
      storage: diskStorage({
        destination: join(__dirname, "..", "..", "uploads"),
        filename: (_req, file, cb) => cb(null, `${crypto.randomUUID()}${extname(file.originalname)}`),
      }),
      limits: { fileSize: 25 * 1024 * 1024 },
    })
  )
  adicionarConteudo(
    @Param("id") produtoId: string,
    @UploadedFile() arquivo: Express.Multer.File,
    @Body("tipo") tipo: string,
    @Body("titulo") titulo: string,
    @Body("ordem") ordem: string
  ) {
    const url = `/uploads/${arquivo.filename}`;
    return this.produtosService.adicionarConteudo(produtoId, tipo, titulo, Number(ordem) || 0, url);
  }
}
