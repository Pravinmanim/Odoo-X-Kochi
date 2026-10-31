import { Prisma } from '@prisma/client';
import prisma from '../database/prisma.js';
import { calculateInvoiceTotals, getEligibleDiscounts, toDecimal } from './pricingRules.js';

const Decimal = Prisma.Decimal;

/**
 * Month-end and leap-year safe period date calculation
 */
export function advanceDateByPeriod(baseDate, billingPeriod) {
  const d = new Date(baseDate);
  const origDay = d.getUTCDate();
  const origMonth = d.getUTCMonth();
  const origYear = d.getUTCFullYear();

  switch (billingPeriod) {
    case 'DAILY':
      d.setUTCDate(d.getUTCDate() + 1);
      return d;
    case 'WEEKLY':
      d.setUTCDate(d.getUTCDate() + 7);
      return d;
    case 'MONTHLY': {
      const targetMonth = origMonth + 1;
      const targetYear = origYear + Math.floor(targetMonth / 12);
      const normalizedMonth = targetMonth % 12;
      const daysInTargetMonth = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
      const newDay = Math.min(origDay, daysInTargetMonth);
      return new Date(
        Date.UTC(
          targetYear,
          normalizedMonth,
          newDay,
          d.getUTCHours(),
          d.getUTCMinutes(),
          d.getUTCSeconds(),
          d.getUTCMilliseconds()
        )
      );
    }
    case 'YEARLY': {
      const targetYear = origYear + 1;
      const daysInTargetMonth = new Date(Date.UTC(targetYear, origMonth + 1, 0)).getUTCDate();
      const newDay = Math.min(origDay, daysInTargetMonth);
      return new Date(
        Date.UTC(
          targetYear,
          origMonth,
          newDay,
          d.getUTCHours(),
          d.getUTCMinutes(),
          d.getUTCSeconds(),
          d.getUTCMilliseconds()
        )
      );
    }
    default:
      d.setUTCMonth(d.getUTCMonth() + 1);
      return d;
  }
}

/**
 * Generates unique sequence-safe invoice numbers: INV-000001
 */
export async function generateNextInvoiceNumber(tx) {
  const latest = await tx.invoice.findFirst({
    orderBy: { created_at: 'desc' },
    select: { number: true },
  });

  let nextNum = 1;
  if (latest?.number && latest.number.startsWith('INV-')) {
    const parsed = parseInt(latest.number.replace('INV-', ''), 10);
    if (!isNaN(parsed)) {
      nextNum = parsed + 1;
    }
  }

  // Format with 6 digits padding: INV-000001
  return `INV-${String(nextNum).padStart(6, '0')}`;
}

/**
 * Bills an individual subscription inside an isolated transaction with row lock
 */
export async function processSingleSubscriptionBilling(subId, asOfDate = new Date()) {
  return await prisma.$transaction(
    async (tx) => {
      // 1. Acquire row lock with FOR UPDATE SKIP LOCKED
      const lockedRows = await tx.$queryRaw`
        SELECT id FROM subscriptions
        WHERE id = ${subId}
          AND status = 'ACTIVE'
          AND is_paused = false
          AND next_billing_date <= ${asOfDate}
        FOR UPDATE SKIP LOCKED
      `;

      if (!lockedRows || lockedRows.length === 0) {
        return { skipped: true, reason: 'Already locked or not currently due for billing' };
      }

      // 2. Fetch full subscription details
      const sub = await tx.subscription.findUnique({
        where: { id: subId },
        include: {
          customer: true,
          plan: true,
          tax: true,
          lines: {
            include: {
              product: true,
              variant: true,
            },
          },
        },
      });

      if (!sub || sub.status !== 'ACTIVE' || sub.is_paused) {
        return { skipped: true, reason: 'Subscription is no longer active or is paused' };
      }

      const periodStart = new Date(sub.next_billing_date);
      const billingPeriod = sub.plan?.billing_period || 'MONTHLY';
      const periodEnd = advanceDateByPeriod(periodStart, billingPeriod);

      // 3. Prepare line items for invoice
      const lineItems = sub.lines.map((l) => ({
        product_id: l.product_id,
        variant_id: l.variant_id,
        description: l.variant
          ? `${l.product.name} (${l.variant.attribute})`
          : l.product.name,
        quantity: l.quantity,
        unit_price: toDecimal(l.unit_price),
      }));

      // 4. Retrieve candidate active discounts
      const rawDiscounts = await tx.discount.findMany({
        where: { is_active: true },
      });

      const totalQuantity = sub.lines.reduce((sum, l) => sum + l.quantity, 0);
      const rawSubtotal = sub.lines.reduce(
        (sum, l) => sum.plus(toDecimal(l.unit_price).times(l.quantity)),
        new Decimal(0)
      );

      const eligibleDiscounts = getEligibleDiscounts(rawDiscounts, {
        subtotal: rawSubtotal,
        quantity: totalQuantity,
        date: periodStart,
        product_ids: sub.lines.map((l) => l.product_id),
      });

      // Select most beneficial discount
      const chosenDiscount = eligibleDiscounts.length > 0 ? eligibleDiscounts[0] : null;

      // 5. Calculate totals via pricing rules engine (Discount first, Tax on discounted base)
      const totals = calculateInvoiceTotals({
        lineItems,
        discount: chosenDiscount,
        tax: sub.tax,
      });

      // 6. Generate invoice number and compute due date
      const invoiceNumber = await generateNextInvoiceNumber(tx);
      const issueDate = new Date();
      const paymentTermsDays = sub.payment_terms || 30;
      const dueDate = new Date(issueDate);
      dueDate.setDate(dueDate.getDate() + paymentTermsDays);

      // 7. Insert Invoice & Lines
      let invoice;
      try {
        invoice = await tx.invoice.create({
          data: {
            number: invoiceNumber,
            subscription_id: sub.id,
            customer_id: sub.customer_id,
            tax_id: sub.tax_id,
            period_start: periodStart,
            period_end: periodEnd,
            subtotal: totals.raw.subtotal,
            discount_amount: totals.raw.discount_amount,
            tax_amount: totals.raw.tax_amount,
            total_amount: totals.raw.total_amount,
            status: 'DRAFT',
            due_date: dueDate,
            created_at: issueDate,
            lines: {
              create: lineItems.map((li) => {
                const lineSubtotal = li.unit_price.times(li.quantity).toDecimalPlaces(2);
                return {
                  product_id: li.product_id,
                  variant_id: li.variant_id,
                  description: li.description,
                  quantity: li.quantity,
                  unit_price: li.unit_price,
                  subtotal: lineSubtotal,
                };
              }),
            },
          },
        });
      } catch (err) {
        if (err.code === 'P2002') {
          // Unique constraint violation on [subscription_id, period_start]
          return { skipped: true, reason: 'Invoice for this period already exists (idempotency check)' };
        }
        throw err;
      }

      // 8. If discount was applied, record usage and increment count in the same transaction
      if (chosenDiscount && totals.discount_amount > 0) {
        await tx.discountUsage.create({
          data: {
            discount_id: chosenDiscount.id,
            invoice_id: invoice.id,
            applied_amount: totals.raw.discount_amount,
          },
        });

        await tx.discount.update({
          where: { id: chosenDiscount.id },
          data: {
            redemptions_count: { increment: 1 },
          },
        });
      }

      // 9. Advance next_billing_date to periodEnd (Never skip missed periods)
      await tx.subscription.update({
        where: { id: sub.id },
        data: {
          next_billing_date: periodEnd,
        },
      });

      return {
        created: true,
        invoiceId: invoice.id,
        invoiceNumber: invoice.number,
        total: totals.total_amount,
      };
    },
    { timeout: 15000 }
  );
}

/**
 * Auto-closes subscriptions that have passed their expiry date when plan.auto_close is true
 */
export async function autoCloseExpiredSubscriptions() {
  const now = new Date();
  const eligible = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      expiry_date: { lte: now },
      plan: {
        auto_close: true,
      },
    },
    include: { plan: true },
  });

  const closed = [];
  for (const sub of eligible) {
    await prisma.$transaction(async (tx) => {
      await tx.subscription.update({
        where: { id: sub.id },
        data: { status: 'CLOSED' },
      });

      await tx.subscriptionStatusLog.create({
        data: {
          subscription_id: sub.id,
          from_status: 'ACTIVE',
          to_status: 'CLOSED',
          changed_by: 'system_auto_close',
          reason: 'Subscription auto-closed upon reaching plan expiry date',
        },
      });
    });
    closed.push(sub.id);
  }

  return closed;
}

/**
 * Primary batch billing runner (manual API trigger or automated cron)
 */
export async function runBillingEngine({ batchSize = 100, asOfDate = new Date() } = {}) {
  const targetDate = new Date(asOfDate);

  // 1. First run auto-close for expired subscriptions
  const autoClosedIds = await autoCloseExpiredSubscriptions();

  // 2. Query all active subscriptions due for billing
  const dueSubscriptions = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      is_paused: false,
      next_billing_date: { lte: targetDate },
    },
    select: { id: true, number: true },
    take: batchSize,
    orderBy: { next_billing_date: 'asc' },
  });

  const summary = {
    totalEligible: dueSubscriptions.length,
    created: 0,
    skipped: 0,
    failed: 0,
    invoices: [],
    autoClosedCount: autoClosedIds.length,
    errors: [],
  };

  // 3. Process each subscription in its own locked transaction
  for (const sub of dueSubscriptions) {
    try {
      const result = await processSingleSubscriptionBilling(sub.id, targetDate);
      if (result.created) {
        summary.created++;
        summary.invoices.push({
          subscriptionNumber: sub.number,
          invoiceNumber: result.invoiceNumber,
          total: result.total,
        });
      } else if (result.skipped) {
        summary.skipped++;
      }
    } catch (err) {
      summary.failed++;
      summary.errors.push({
        subscriptionId: sub.id,
        subscriptionNumber: sub.number,
        error: err.message,
      });
    }
  }

  return summary;
}
