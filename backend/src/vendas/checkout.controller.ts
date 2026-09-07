import { Body, Controller, Get, Headers, Param, Post } from "@nestjs/common";
import { AuthService } from "../auth/auth.service";
import { CreateCheckoutDto, WebhookSimularDto } from "./dto";
import { VendasService } from "./vendas.service";

@Controller("checkout")
export class CheckoutController {
  constructor(private readonly vendasService: VendasService, private readonly authService: AuthService) {}

  @Post()
  async criar(@Body() dto: CreateCheckoutDto, @Headers("authorization") authHeader?: string) {
    const usuario = await this.authService.resolveUsuarioFromAuthHeader(authHeader);
    return this.vendasService.criarCheckout(dto.produtoId, dto.email, usuario);
  }

  @Post("webhook/simular")
  simular(@Body() dto: WebhookSimularDto) {
    return this.vendasService.simularWebhook(dto.vendaId, dto.status);
  }
}

@Controller("vendas")
export class VendasPublicasController {
  constructor(private readonly vendasService: VendasService) {}

  @Get(":vendaId")
  obter(@Param("vendaId") vendaId: string) {
    return this.vendasService.obterVenda(vendaId);
  }
}
