import { Prisma } from '@prisma/client';

const Decimal = Prisma.Decimal;

/**
 * Converts any numeric, string or Decimal input into a Prisma.Decimal with standard 2 decimal places.
 */
export function toDecimal(val) {
  if (val === null || val === undefined) {
    return new Decimal(0);
  }
  if (Decimal.isDecimal(val)) {
    return val;
  }
  return new Decimal(val);
}

/**
 * Filters discounts that satisfy active status, validity window, usage limits,
 * minimum purchase amounts, minimum quantities, and scope.
 *
 * @param {Array} discounts - Array of discount records
 * @param {Object} context - { subtotal, quantity, date, product_ids }
 * @returns {Array} - Eligible discounts
 */
export function getEligibleDiscounts(discounts = [], context = {}) {
  const checkDate = context.date ? new Date(context.date) : new Date();
  const subtotal = toDecimal(context.subtotal ?? 0);
  const quantity = Number(context.quantity ?? 1);
  const productIds = Array.isArray(context.product_ids) ? context.product_ids : [];

  return discounts.filter((d) => {
    // 1. Must be active
    if (!d.is_active) return false;

    // 2. Start date window check
    if (d.start_date && new Date(d.start_date) > checkDate) {
      return false;
    }

    // 3. Expiration / End date check
    const expiry = d.expires_at || d.end_date;
    if (expiry && new Date(expiry) < checkDate) {
      return false;
    }

    // 4. Usage limit check
    const limit = d.max_redemptions !== undefined ? d.max_redemptions : d.usage_limit;
    const used = d.redemptions_count !== undefined ? d.redemptions_count : (d.used_count || 0);
    if (limit !== null && limit !== undefined && used >= limit) {
      return false;
    }

    // 5. Minimum purchase check
    if (d.min_purchase) {
      const minPurchase = toDecimal(d.min_purchase);
      if (subtotal.lessThan(minPurchase)) {
        return false;
      }
    }

    // 6. Minimum quantity check
    const minQty = d.min_quantity ?? 1;
    if (quantity < minQty) {
      return false;
    }

    // 7. Scope check
    const scope = (d.scope || 'SUBSCRIPTION').toUpperCase();
    if (scope === 'PRODUCT') {
      if (productIds.length === 0) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Calculates the discount amount in Decimal based on discount type (PERCENTAGE or FIXED).
 * Ensures discount amount never exceeds the subtotal.
 *
 * @param {Object} discount - Discount record
 * @param {Decimal|number|string} subtotal - Order/line subtotal
 * @returns {Decimal} - Discount amount
 */
export function calculateDiscountAmount(discount, subtotal) {
  const sub = toDecimal(subtotal);
  if (!discount || sub.lessThanOrEqualTo(0)) {
    return new Decimal(0);
  }

  const type = String(discount.type || '').toUpperCase();
  const value = toDecimal(discount.value || 0);

  let discountAmount = new Decimal(0);

  if (type === 'PERCENTAGE') {
    // subtotal * (rate / 100)
    const rateFraction = value.dividedBy(100);
    discountAmount = sub.times(rateFraction).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  } else if (type === 'FIXED') {
    discountAmount = value.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
  }

  // Discount cannot exceed subtotal
  return Decimal.min(discountAmount, sub);
}

/**
 * Calculates tax on a taxable amount using precision Decimal arithmetic.
 *
 * @param {Decimal|number|string} taxableAmount - Subtotal after discount
 * @param {Decimal|number|string} taxRate - Tax rate percentage (e.g. 18.00 for 18%)
 * @returns {Decimal} - Calculated tax amount
 */
export function calculateTax(taxableAmount, taxRate) {
  const base = toDecimal(taxableAmount);
  if (base.lessThanOrEqualTo(0) || !taxRate) {
    return new Decimal(0);
  }

  const rate = toDecimal(taxRate);
  const rateFraction = rate.dividedBy(100);

  return base.times(rateFraction).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
}

/**
 * Calculates final invoice totals adhering strictly to the financial workflow:
 * Subtotal -> Apply Eligible Discount FIRST -> Calculate Tax on Discounted Base -> Final Total
 *
 * NOTE: Does NOT increment discount redemptions_count (the billing transaction does that).
 *
 * @param {Object} params - { lineItems, discount, tax, planPrice }
 * @returns {Object} - Invoice calculation breakdown
 */
export function calculateInvoiceTotals({
  lineItems = [],
  discount = null,
  tax = null,
  planPrice = null,
} = {}) {
  // 1. Calculate base subtotal
  let subtotal = new Decimal(0);

  // Add plan recurring fee if provided
  if (planPrice !== null && planPrice !== undefined) {
    subtotal = subtotal.plus(toDecimal(planPrice));
  }

  // Add line items
  for (const item of lineItems) {
    const unitPrice = toDecimal(item.unit_price || item.price || 0);
    const qty = new Decimal(item.quantity || 1);
    const lineTotal = unitPrice.times(qty).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
    subtotal = subtotal.plus(lineTotal);
  }

  subtotal = subtotal.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  // 2. Apply discount FIRST
  const discountAmount = calculateDiscountAmount(discount, subtotal);
  const discountedSubtotal = Decimal.max(new Decimal(0), subtotal.minus(discountAmount)).toDecimalPlaces(
    2,
    Decimal.ROUND_HALF_UP
  );

  // 3. Calculate tax AFTER discount
  const taxRatePercent = tax ? toDecimal(tax.rate_percent !== undefined ? tax.rate_percent : (tax.rate || 0)) : new Decimal(0);
  const taxAmount = calculateTax(discountedSubtotal, taxRatePercent);

  // 4. Calculate final total
  const totalAmount = discountedSubtotal.plus(taxAmount).toDecimalPlaces(2, Decimal.ROUND_HALF_UP);

  return {
    subtotal: subtotal.toNumber(),
    discount_amount: discountAmount.toNumber(),
    discounted_subtotal: discountedSubtotal.toNumber(),
    tax_rate: taxRatePercent.toNumber(),
    tax_amount: taxAmount.toNumber(),
    total_amount: totalAmount.toNumber(),
    raw: {
      subtotal,
      discount_amount: discountAmount,
      discounted_subtotal: discountedSubtotal,
      tax_rate: taxRatePercent,
      tax_amount: taxAmount,
      total_amount: totalAmount,
    },
  };
}

