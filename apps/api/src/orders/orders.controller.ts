import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { AuthenticatedUser } from '../identity/strategies/jwt.strategy';
import { UpdateSubOrderStatusDto } from './dto/update-sub-order-status.dto';
import { SubOrderEntity } from './entities/sub-order.entity';
import {
  OrdersService,
  OrderWithSubOrders,
  SubOrderWithItems,
} from './orders.service';

@Controller()
@UseGuards(JwtAuthGuard)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get('orders/:id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<OrderWithSubOrders> {
    return this.orders.findByIdForRequester(id, user);
  }

  @Get('sellers/:id/orders')
  findBySeller(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubOrderWithItems[]> {
    return this.orders.findSubOrdersForSeller(id, user);
  }

  @Patch('suborders/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateSubOrderStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SubOrderEntity> {
    return this.orders.transitionSubOrderStatus(id, dto.status, user);
  }
}
