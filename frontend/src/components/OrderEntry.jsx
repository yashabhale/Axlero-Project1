import { useState } from 'react';

const API_URL = import.meta.env.VITE_ORDERFLOW_API ?? 'http://localhost:8080';
const DEFAULT_TIME_IN_FORCE = 'GTC';

export function generateClientOrderId() {
  return `CLIENT-${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

export function validateOrderForm(values = {}, side = 'BUY', orderType = 'LIMIT') {
  const errors = {
    valid: true,
    quantity: '',
    limitPrice: '',
  };

  const normalizedSide = String(side || 'BUY').toUpperCase();
  const normalizedOrderType = String(orderType || 'LIMIT').toUpperCase();

  if (normalizedSide !== 'BUY' && normalizedSide !== 'SELL') {
    errors.valid = false;
    errors.quantity = 'Side must be BUY or SELL.';
  }

  if (normalizedOrderType !== 'LIMIT' && normalizedOrderType !== 'MARKET') {
    errors.valid = false;
    errors.limitPrice = 'Order type must be LIMIT or MARKET.';
  }

  const quantityValue = values.quantity ?? '';
  if (String(quantityValue).trim() === '') {
    errors.valid = false;
    errors.quantity = 'Quantity is required.';
  } else {
    const quantity = Number(quantityValue);
    if (!Number.isFinite(quantity)) {
      errors.valid = false;
      errors.quantity = 'Quantity must be numeric.';
    } else if (quantity <= 0) {
      errors.valid = false;
      errors.quantity = 'Quantity must be greater than 0.';
    }
  }

  if (normalizedOrderType === 'LIMIT') {
    const limitValue = values.limitPrice ?? '';
    if (String(limitValue).trim() === '') {
      errors.valid = false;
      errors.limitPrice = 'Limit price is required for LIMIT orders.';
    } else {
      const limitPrice = Number(limitValue);
      if (!Number.isFinite(limitPrice)) {
        errors.valid = false;
        errors.limitPrice = 'Limit price must be numeric.';
      } else if (limitPrice <= 0) {
        errors.valid = false;
        errors.limitPrice = 'Limit price must be greater than 0.';
      }
    }
  } else {
    errors.limitPrice = '';
  }

  return errors;
}

export function buildOrderPayload(form = {}) {
  const payload = {
    schemaVersion: 1,
    type: 'NEW_ORDER',
    clientOrderId: generateClientOrderId(),
    instrumentId: String(form.instrument || '').trim().toUpperCase(),
    side: String(form.side || 'BUY').toUpperCase(),
    orderType: String(form.orderType || 'LIMIT').toUpperCase(),
    quantity: Number(form.quantity),
    timeInForce: String(form.timeInForce || DEFAULT_TIME_IN_FORCE).toUpperCase(),
    clientTimestamp: new Date().toISOString(),
  };

  if (payload.orderType === 'LIMIT') {
    payload.limitPrice = Math.round(Number(form.limitPrice) * 100);
  }

  return payload;
}

function formatPrice(value) {
  if (value == null || !Number.isFinite(Number(value))) return '--';
  return (Number(value) / 100).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function OrderEntry({ instrument = 'ACME' }) {
  const [form, setForm] = useState({
    side: 'BUY',
    orderType: 'LIMIT',
    quantity: '',
    limitPrice: '',
  });
  const [errors, setErrors] = useState({ valid: true, quantity: '', limitPrice: '' });
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: 'idle', message: '' });

  const orderTypeLabel = form.orderType === 'LIMIT' ? 'Limit' : 'Market';

  function updateField(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'orderType' && value === 'MARKET') {
        next.limitPrice = '';
      }
      return next;
    });

    setErrors((current) => ({ ...current, [field]: '', valid: true }));
    if (feedback.type !== 'idle') {
      setFeedback({ type: 'idle', message: '' });
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const validation = validateOrderForm(form, form.side, form.orderType);
    setErrors(validation);

    if (!validation.valid) {
      setFeedback({ type: 'error', message: 'Please fix the highlighted order fields.' });
      return;
    }

    const payload = buildOrderPayload({
      instrument,
      side: form.side,
      orderType: form.orderType,
      quantity: form.quantity,
      limitPrice: form.limitPrice,
      timeInForce: DEFAULT_TIME_IN_FORCE,
    });

    setSubmitting(true);
    setFeedback({ type: 'idle', message: '' });

    try {
      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const responseBody = await response.text();
      let parsedBody = {};

      if (responseBody) {
        try {
          parsedBody = JSON.parse(responseBody);
        } catch {
          parsedBody = { message: responseBody };
        }
      }

      if (!response.ok) {
        throw new Error(parsedBody.error || parsedBody.reason || parsedBody.message || 'Order submission failed.');
      }

      const successMessage = payload.orderType === 'LIMIT'
        ? `${payload.side} ${payload.quantity} ${payload.instrumentId} @ ${formatPrice(payload.limitPrice)}`
        : `${payload.side} ${payload.quantity} ${payload.instrumentId} @ MARKET`;

      setFeedback({
        type: 'success',
        message: `Order accepted: ${successMessage}`,
      });
      setForm((current) => ({
        ...current,
        quantity: '',
        limitPrice: current.orderType === 'LIMIT' ? '' : current.limitPrice,
      }));
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Unable to submit the order. Please try again.',
      });
    } finally {
      setSubmitting(false);
    }
  }

  const isBuy = form.side === 'BUY';

  return (
    <section className="order-entry-panel" aria-label="Order entry form">
      <div className="panel-heading">
        <div>
          <p className="eyebrow">ORDER ENTRY</p>
          <h2>New order</h2>
        </div>
        <span className="instrument-badge">{instrument}</span>
      </div>

      <form className="order-entry-form" onSubmit={handleSubmit} noValidate aria-busy={submitting}>
        <div className="field-group">
          <label htmlFor="order-instrument">Instrument</label>
          <input id="order-instrument" type="text" value={instrument} readOnly aria-readonly="true" />
        </div>

        <div className="field-group">
          <span className="field-label">Side</span>
          <div className="toggle-group" role="group" aria-label="Order side">
            <button
              type="button"
              className={`toggle-button buy ${isBuy ? 'active' : ''}`}
              onClick={() => updateField('side', 'BUY')}
              aria-pressed={isBuy}
            >
              BUY
            </button>
            <button
              type="button"
              className={`toggle-button sell ${!isBuy ? 'active' : ''}`}
              onClick={() => updateField('side', 'SELL')}
              aria-pressed={!isBuy}
            >
              SELL
            </button>
          </div>
        </div>

        <div className="field-group">
          <span className="field-label">Order type</span>
          <div className="toggle-group" role="group" aria-label="Order type">
            <button
              type="button"
              className={`toggle-button ${form.orderType === 'LIMIT' ? 'active' : ''}`}
              onClick={() => updateField('orderType', 'LIMIT')}
              aria-pressed={form.orderType === 'LIMIT'}
            >
              LIMIT
            </button>
            <button
              type="button"
              className={`toggle-button ${form.orderType === 'MARKET' ? 'active' : ''}`}
              onClick={() => updateField('orderType', 'MARKET')}
              aria-pressed={form.orderType === 'MARKET'}
            >
              MARKET
            </button>
          </div>
        </div>

        <div className="field-group">
          <label htmlFor="order-quantity">Quantity</label>
          <input
            id="order-quantity"
            type="number"
            min="1"
            step="1"
            value={form.quantity}
            onChange={(event) => updateField('quantity', event.target.value)}
            placeholder="100"
            aria-invalid={Boolean(errors.quantity)}
          />
          {errors.quantity && <span className="field-error">{errors.quantity}</span>}
        </div>

        {form.orderType === 'LIMIT' && (
          <div className="field-group">
            <label htmlFor="order-limit-price">Limit price</label>
            <input
              id="order-limit-price"
              type="number"
              min="0.01"
              step="0.01"
              value={form.limitPrice}
              onChange={(event) => updateField('limitPrice', event.target.value)}
              placeholder="1234.50"
              aria-invalid={Boolean(errors.limitPrice)}
            />
            {errors.limitPrice && <span className="field-error">{errors.limitPrice}</span>}
          </div>
        )}

        <button className="order-submit-button" type="submit" disabled={submitting}>
          {submitting ? 'Submitting...' : `Submit ${isBuy ? 'BUY' : 'SELL'} ${orderTypeLabel} order`}
        </button>

        {feedback.message && (
          <div className={`order-feedback ${feedback.type}`} role="status" aria-live="polite">
            {feedback.message}
          </div>
        )}
      </form>
    </section>
  );
}

export default OrderEntry;
