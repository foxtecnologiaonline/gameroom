import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService, TokensDto } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/roles.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('registrar')
  registrar(@Body() dto: RegisterDto): Promise<TokensDto> {
    return this.authService.registrarCliente(dto.nome, dto.email, dto.senha);
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() dto: LoginDto): Promise<TokensDto> {
    return this.authService.login(dto.email, dto.senha);
  }

  @Post('refresh')
  refresh(@Body('refreshToken') refreshToken: string): Promise<TokensDto> {
    return this.authService.renovar(refreshToken);
  }

  @Post('admins')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin')
  criarAdmin(@Body() dto: CreateAdminDto): Promise<TokensDto> {
    return this.authService.criarAdmin(dto.nome, dto.email, dto.senha);
  }
}
