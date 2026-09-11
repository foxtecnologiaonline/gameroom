import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { IdempotencyInterceptor } from '../common/idempotency/idempotency.interceptor';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../identity/strategies/jwt.strategy';
import { ReleaseStockDto } from './dto/release-stock.dto';
import { ReserveStockDto } from './dto/reserve-stock.dto';
import { UpdateStockDto } from './dto/update-stock.dto';
import { InventoryService } from './inventory.service';

@Controller('offers')
@UseGuards(JwtAuthGuard)
export class InventoryController {
  constructor(private readonly inventory: InventoryService) {}

  @Post(':id/reserve')
  @UseInterceptors(IdempotencyInterceptor)
  reserve(@Param('id') id: string, @Body() dto: ReserveStockDto) {
    return this.inventory.reserve(id, dto.quantity);
  }

  @Post(':id/release')
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(IdempotencyInterceptor)
  release(@Param('id') id: string, @Body() dto: ReleaseStockDto) {
    return this.inventory.release(id, dto.reservationId);
  }

  @Patch(':id/stock')
  @UseInterceptors(IdempotencyInterceptor)
  updateStock(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: UpdateStockDto,
  ) {
    return this.inventory.updateStock(id, user, dto.stock);
  }
}
