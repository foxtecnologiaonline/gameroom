import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SellerModule } from '../seller/seller.module';
import { CategoriesController } from './categories.controller';
import { CategoriesService } from './categories.service';
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
  controllers: [ProductsController, CategoriesController],
  providers: [ProductsService, OffersService, CategoriesService],
  exports: [OffersService],
})
export class CatalogModule {}
