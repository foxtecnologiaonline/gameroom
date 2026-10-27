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
import { SellerPublicView, SellersService } from './sellers.service';

@Controller('sellers')
export class SellersController {
  constructor(private readonly sellers: SellersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  apply(
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateSellerDto,
  ): Promise<SellerEntity> {
    return this.sellers.apply(user.id, dto);
  }

  /**
   * Must be registered before ':id' — otherwise Nest/Express would match
   * the literal "me" against the ':id' wildcard first.
   */
  @Get('me')
  @UseGuards(JwtAuthGuard)
  findMine(@CurrentUser() user: AuthenticatedUser): Promise<SellerEntity> {
    return this.sellers.findMine(user.id);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
  ): Promise<SellerEntity> {
    return this.sellers.findByIdForRequester(id, user);
  }

  /** Public: storefront product pages show the store name per offer. */
  @Get(':id/public')
  findPublic(@Param('id') id: string): Promise<SellerPublicView> {
    return this.sellers.findPublicById(id);
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateSellerStatusDto,
  ): Promise<SellerEntity> {
    return this.sellers.updateStatus(id, dto);
  }
}
