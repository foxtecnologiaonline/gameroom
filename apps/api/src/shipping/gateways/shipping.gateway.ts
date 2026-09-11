export interface ShippingOption {
  carrier: string;
  priceCents: number;
  etaDays: number;
}

export interface QuoteRequest {
  destinationZip: string;
  weightGrams: number;
}

export interface LabelRequest {
  destinationZip: string;
  weightGrams: number;
  carrier: string;
}

export interface LabelResult {
  trackingCode: string;
  etaDays: number;
}

export const SHIPPING_GATEWAY = 'SHIPPING_GATEWAY';

/**
 * Port for the shipping gateway (Melhor Envio). Note: neither offers
 * (weight/dimensions) nor buyers (delivery address) carry the data a real
 * quote needs yet — see pendência no CLAUDE.md. Until that's modeled,
 * callers pass destinationZip/weightGrams directly in the request.
 */
export interface ShippingGateway {
  quote(request: QuoteRequest): Promise<ShippingOption[]>;
  createLabel(request: LabelRequest): Promise<LabelResult>;
}
