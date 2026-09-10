import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { SellerEntity } from '../entities/seller.entity';
import { RecipientGateway, RecipientRegistration } from './recipient.gateway';

/**
 * Placeholder implementation. The real Pagar.me `POST /recipients` call
 * (bank account payload, holder document, etc.) needs credentials and a
 * payload contract that are only pinned down when the payments module
 * (backlog item 8) is built. Until then this keeps the seller-approval
 * flow working end-to-end behind the RecipientGateway port, so swapping
 * in the real adapter later is a one-file change.
 */
@Injectable()
export class StubRecipientGateway implements RecipientGateway {
  async createRecipient(seller: SellerEntity): Promise<RecipientRegistration> {
    return { recipientId: `stub_${seller.id}_${randomUUID()}` };
  }
}
