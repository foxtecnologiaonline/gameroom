import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../identity/strategies/jwt.strategy';
import { CreateLabelDto } from './dto/create-label.dto';
import { QuoteDto } from './dto/quote.dto';
import { ShipmentEntity } from './entities/shipment.entity';
import { ShippingOption } from './gateways/shipping.gateway';
import { ShippingService } from './shipping.service';

@Controller('shipping')
@UseGuards(JwtAuthGuard)
export class ShippingController {
  constructor(private readonly shipping: ShippingService) {}

  @Post('quote')
  quote(@Body() dto: QuoteDto): Promise<ShippingOption[]> {
    return this.shipping.quote(dto);
  }

  @Post('label')
  createLabel(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateLabelDto,
  ): Promise<ShipmentEntity> {
    return this.shipping.createLabel(user, dto);
  }

  @Get(':id/tracking')
  tracking(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<ShipmentEntity> {
    return this.shipping.getTracking(id, user);
  }
}
