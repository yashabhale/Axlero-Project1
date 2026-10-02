import { describe, expect, it } from 'vitest';
import { buildOrderPayload, validateOrderForm } from './OrderEntry.jsx';

describe('OrderEntry contract and validation', () => {
  it('builds a valid BUY LIMIT payload using the backend contract', () => {
    const payload = buildOrderPayload({
      instrument: 'ACME',
      side: 'BUY',
      orderType: 'LIMIT',
      quantity: '250',
      limitPrice: '1234.50',
      timeInForce: 'GTC',
    });

    expect(payload).toMatchObject({
      schemaVersion: 1,
      type: 'NEW_ORDER',
      instrumentId: 'ACME',
      side: 'BUY',
      orderType: 'LIMIT',
      quantity: 250,
      limitPrice: 123450,
      timeInForce: 'GTC',
    });
    expect(payload.clientOrderId).toBeTruthy();
    expect(payload.clientTimestamp).toBeTruthy();
  });

  it('omits limitPrice for MARKET orders', () => {
    const payload = buildOrderPayload({
      instrument: 'ACME',
      side: 'SELL',
      orderType: 'MARKET',
      quantity: '100',
      limitPrice: '999',
      timeInForce: 'IOC',
    });

    expect(payload.orderType).toBe('MARKET');
    expect(payload.limitPrice).toBeUndefined();
    expect(payload.quantity).toBe(100);
  });

  it('rejects invalid quantity and price values', () => {
    expect(validateOrderForm({ quantity: '', limitPrice: '' }, 'BUY', 'LIMIT')).toMatchObject({
      valid: false,
      quantity: 'Quantity is required.',
      limitPrice: 'Limit price is required for LIMIT orders.',
    });

    expect(validateOrderForm({ quantity: '0', limitPrice: '100' }, 'SELL', 'LIMIT')).toMatchObject({
      valid: false,
      quantity: 'Quantity must be greater than 0.',
    });

    expect(validateOrderForm({ quantity: '10', limitPrice: '0.00' }, 'BUY', 'LIMIT')).toMatchObject({
      valid: false,
      limitPrice: 'Limit price must be greater than 0.',
    });

    expect(validateOrderForm({ quantity: '10', limitPrice: '25' }, 'BUY', 'MARKET')).toMatchObject({
      valid: true,
      limitPrice: '',
    });
  });
});
