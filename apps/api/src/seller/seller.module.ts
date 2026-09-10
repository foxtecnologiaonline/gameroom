import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { IdentityModule } from '../identity/identity.module';
import { SellerEntity } from './entities/seller.entity';
import { RECIPIENT_GATEWAY } from './gateways/recipient.gateway';
import { StubRecipientGateway } from './gateways/stub-recipient.gateway';
import { SellersController } from './sellers.controller';
import { SellersService } from './sellers.service';

@Module({
  imports: [TypeOrmModule.forFeature([SellerEntity]), IdentityModule],
  controllers: [SellersController],
  providers: [
    SellersService,
    { provide: RECIPIENT_GATEWAY, useClass: StubRecipientGateway },
  ],
  exports: [SellersService],
})
export class SellerModule {}
