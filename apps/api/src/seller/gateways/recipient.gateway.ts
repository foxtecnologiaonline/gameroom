import { SellerEntity } from '../entities/seller.entity';

export interface RecipientRegistration {
  recipientId: string;
}

export const RECIPIENT_GATEWAY = 'RECIPIENT_GATEWAY';

/**
 * Port for registering an approved seller as a payout recipient on the
 * payment gateway (Pagar.me `recipient_id`, used later for split by the
 * payments module — backlog item 8).
 */
export interface RecipientGateway {
  createRecipient(seller: SellerEntity): Promise<RecipientRegistration>;
}
