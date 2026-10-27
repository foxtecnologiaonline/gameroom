import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CurrentUser } from '../identity/decorators/current-user.decorator';
import { JwtAuthGuard } from '../identity/guards/jwt-auth.guard';
import { Role } from '../identity/role.enum';
import { AuthenticatedUser } from '../identity/strategies/jwt.strategy';
import { CreateOfferDto } from './dto/create-offer.dto';
import { CreateProductDto } from './dto/create-product.dto';
import { ModerateProductDto } from './dto/moderate-product.dto';
import { QueryProductsDto } from './dto/query-products.dto';
import { OfferEntity } from './entities/offer.entity';
import { ProductEntity } from './entities/product.entity';
import { OffersService } from './offers.service';
import { ProductsService, ProductWithOffers } from './products.service';

@Controller('products')
export class ProductsController {
  constructor(
    private readonly products: ProductsService,
    private readonly offers: OffersService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Seller)
  create(@Body() dto: CreateProductDto): Promise<ProductEntity> {
    return this.products.create(dto);
  }

  @Get()
  search(@Query() query: QueryProductsDto): Promise<ProductEntity[]> {
    return this.products.search(query.query);
  }

  /**
   * Must be registered before ':id' — otherwise Nest/Express would match
   * the literal "admin" against the ':id' wildcard first.
   */
  @Get('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  findAllForAdmin(): Promise<ProductEntity[]> {
    return this.products.findAllForAdmin();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Promise<ProductWithOffers> {
    return this.products.findByIdWithOffers(id);
  }

  @Patch(':id/moderation')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  moderate(
    @Param('id') id: string,
    @Body() dto: ModerateProductDto,
  ): Promise<ProductEntity> {
    return this.products.setSuspended(id, dto.suspended);
  }

  @Post(':id/offers')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Seller)
  createOffer(
    @Param('id') id: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() dto: CreateOfferDto,
  ): Promise<OfferEntity> {
    return this.offers.create(id, user.id, dto);
  }
}
