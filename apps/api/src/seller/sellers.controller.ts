import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { Role } from '../identity/role.enum';
import { AuthenticatedUser } from '../identity/strategies/jwt.strategy';
import { CreateSellerDto } from './dto/create-seller.dto';
import { UpdateSellerStatusDto } from './dto/update-seller-status.dto';
import { SellerEntity } from './entities/seller.entity';
import { SellersService } from './sellers.service';

@Controller('sellers')
@UseGuards(JwtAuthGuard)
export class SellersController {
  constructor(private readonly sellers: SellersService) {}

  @Post()
  apply(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSellerDto,
  ): Promise<SellerEntity> {
    return this.sellers.apply(user.id, dto);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SellerEntity> {
    return this.sellers.findByIdForRequester(id, user);
  }

  @Patch(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.Admin)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateSellerStatusDto,
  ): Promise<SellerEntity> {
    return this.sellers.updateStatus(id, dto);
  }
}
