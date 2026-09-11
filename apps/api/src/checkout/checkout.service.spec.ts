import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { CartService, CartView } from '../cart/cart.service';
import { InventoryService } from '../inventory/inventory.service';
import { ReservationStatus } from '../inventory/reservation-status.enum';
import { OrdersService } from '../orders/orders.service';
import { CheckoutService } from './checkout.service';

describe('CheckoutService', () => {
  let service: CheckoutService;
  let cart: jest.Mocked<Pick<CartService, 'getCart' | 'clear'>>;
  let inventory: jest.Mocked<Pick<InventoryService, 'reserve' | 'release'>>;
  let orders: jest.Mocked<Pick<OrdersService, 'create'>>;

  const cartItem = (
    offerId: string,
    sellerId: string,
    priceCents: number,
    quantity: number,
  ) => ({
    id: `item-${offerId}`,
    offerId,
    quantity,
    offer: { id: offerId, sellerId, priceCents },
  });

  beforeEach(async () => {
    cart = { getCart: jest.fn(), clear: jest.fn() };
    inventory = { reserve: jest.fn(), release: jest.fn() };
    orders = { create: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutService,
        { provide: CartService, useValue: cart },
        { provide: InventoryService, useValue: inventory },
        { provide: OrdersService, useValue: orders },
      ],
    }).compile();

    service = module.get(CheckoutService);
  });

  it('rejects checkout with an empty cart', async () => {
    cart.getCart.mockResolvedValue({ items: [] } as unknown as CartView);

    await expect(service.checkout('buyer-1')).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(inventory.reserve).not.toHaveBeenCalled();
    expect(orders.create).not.toHaveBeenCalled();
  });

  it('reserves every item, groups by seller, creates the order and clears the cart', async () => {
    cart.getCart.mockResolvedValue({
      items: [
        cartItem('offer-a', 'seller-1', 1000, 2),
        cartItem('offer-b', 'seller-2', 500, 1),
      ],
    } as unknown as CartView);
    inventory.reserve.mockImplementation(async (offerId) => ({
      id: `reservation-${offerId}`,
      offerId,
      quantity: 1,
      status: ReservationStatus.Active,
      createdAt: new Date(),
      releasedAt: null,
    }));
    const createdOrder = { id: 'order-1', subOrders: [] };
    orders.create.mockResolvedValue(createdOrder as any);

    const result = await service.checkout('buyer-1');

    expect(inventory.reserve).toHaveBeenCalledWith('offer-a', 2);
    expect(inventory.reserve).toHaveBeenCalledWith('offer-b', 1);
    expect(orders.create).toHaveBeenCalledWith('buyer-1', [
      {
        sellerId: 'seller-1',
        items: [{ offerId: 'offer-a', quantity: 2, unitPriceCents: 1000 }],
      },
      {
        sellerId: 'seller-2',
        items: [{ offerId: 'offer-b', quantity: 1, unitPriceCents: 500 }],
      },
    ]);
    expect(cart.clear).toHaveBeenCalledWith('buyer-1');
    expect(result).toBe(createdOrder);
  });

  it('releases only the reservations already made when a later reservation fails', async () => {
    cart.getCart.mockResolvedValue({
      items: [
        cartItem('offer-a', 'seller-1', 1000, 1),
        cartItem('offer-b', 'seller-2', 500, 1),
      ],
    } as unknown as CartView);
    inventory.reserve.mockImplementationOnce(async () => ({
      id: 'reservation-a',
      offerId: 'offer-a',
      quantity: 1,
      status: ReservationStatus.Active,
      createdAt: new Date(),
      releasedAt: null,
    }));
    inventory.reserve.mockImplementationOnce(async () => {
      throw new ConflictException('sem estoque');
    });

    await expect(service.checkout('buyer-1')).rejects.toBeInstanceOf(
      ConflictException,
    );

    expect(inventory.release).toHaveBeenCalledTimes(1);
    expect(inventory.release).toHaveBeenCalledWith('offer-a', 'reservation-a');
    expect(orders.create).not.toHaveBeenCalled();
    expect(cart.clear).not.toHaveBeenCalled();
  });

  it('releases every reservation when order creation fails after reserving everything', async () => {
    cart.getCart.mockResolvedValue({
      items: [
        cartItem('offer-a', 'seller-1', 1000, 1),
        cartItem('offer-b', 'seller-2', 500, 1),
      ],
    } as unknown as CartView);
    inventory.reserve.mockImplementation(async (offerId) => ({
      id: `reservation-${offerId}`,
      offerId,
      quantity: 1,
      status: ReservationStatus.Active,
      createdAt: new Date(),
      releasedAt: null,
    }));
    orders.create.mockRejectedValue(new Error('db exploded'));

    await expect(service.checkout('buyer-1')).rejects.toThrow('db exploded');

    expect(inventory.release).toHaveBeenCalledTimes(2);
    expect(inventory.release).toHaveBeenCalledWith(
      'offer-a',
      'reservation-offer-a',
    );
    expect(inventory.release).toHaveBeenCalledWith(
      'offer-b',
      'reservation-offer-b',
    );
    expect(cart.clear).not.toHaveBeenCalled();
  });
});
