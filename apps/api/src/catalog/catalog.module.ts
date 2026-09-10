import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SellerModule } from '../seller/seller.module';
import { CategoryEntity } from './entities/category.entity';
import { OfferEntity } from './entities/offer.entity';
import { ProductEntity } from './entities/product.entity';
import { OffersService } from './offers.service';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([CategoryEntity, ProductEntity, OfferEntity]),
    SellerModule,
  ],
  controllers: [ProductsController],
  providers: [ProductsService, OffersService],
})
export class CatalogModule {}
