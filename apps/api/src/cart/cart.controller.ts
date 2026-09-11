import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../identity/strategies/jwt.strategy';
import { CartItemEntity } from './entities/cart-item.entity';
import { AddCartItemDto } from './dto/add-cart-item.dto';
import { CartService, CartView } from './cart.service';

@Controller('cart')
@UseGuards(JwtAuthGuard)
export class CartController {
  constructor(private readonly cart: CartService) {}

  @Post('items')
  addItem(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: AddCartItemDto,
  ): Promise<CartItemEntity> {
    return this.cart.addItem(user.id, dto.offerId, dto.quantity);
  }

  @Get()
  getCart(@CurrentUser() user: AuthenticatedUser): Promise<CartView> {
    return this.cart.getCart(user.id);
  }

  @Delete('items/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeItem(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.cart.removeItem(user.id, id);
  }
}
