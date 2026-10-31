import { Prisma } from '@prisma/client';
import prisma from '../../database/prisma.js';
import { parsePaginationParams, formatPaginatedResponse } from '../../utils/pagination.js';
import { AppError, NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors.js';

/**
 * Calculates next date based on billing period
 */
export function extendDateByPeriod(baseDate, billingPeriod) {
  const d = new Date(baseDate);
  switch (billingPeriod) {
    case 'DAILY':
      d.setDate(d.getDate() + 1);
      break;
    case 'WEEKLY':
      d.setDate(d.getDate() + 7);
      break;
    case 'YEARLY':
      d.setFullYear(d.getFullYear() + 1);
      break;
    case 'MONTHLY':
    default:
      d.setMonth(d.getMonth() + 1);
      break;
  }
  return d;
}

/**
 * Sequence-safe subscription number generation: SUB-000001
 */
async function generateNextSubscriptionNumber(tx) {
  const latest = await tx.subscription.findFirst({
    orderBy: { created_at: 'desc' },
    select: { number: true },
  });

  let nextNum = 1;
  if (latest?.number && latest.number.startsWith('SUB-')) {
    const parsed = parseInt(latest.number.replace('SUB-', ''), 10);
    if (!isNaN(parsed)) {
      nextNum = parsed + 1;
    }
  }

  return `SUB-${String(nextNum).padStart(6, '0')}`;
}

/**
 * Resolves verified server-side unit prices and subtotals for lines
 */
async function resolveSubscriptionLines(lines, tx) {
  const resolvedLines = [];
  let totalAmount = 0;

  for (const line of lines) {
    const product = await tx.product.findUnique({
      where: { id: line.product_id },
      include: { variants: true },
    });

    if (!product) {
      throw new NotFoundError(`Product with ID "${line.product_id}" was not found.`);
    }

    if (!product.is_active) {
      throw new ValidationError(`Product "${product.name}" is inactive.`);
    }

    let extraPrice = 0;
    if (line.variant_id) {
      const variant = product.variants.find((v) => v.id === line.variant_id);
      if (!variant) {
        throw new NotFoundError(
          `Variant "${line.variant_id}" does not belong to product "${product.name}".`
        );
      }
      extraPrice = Number(variant.extra_price);
    }

    const unitPrice = Number(product.sales_price) + extraPrice;
    const quantity = Math.max(1, parseInt(line.quantity, 10));
    const subtotal = Number((unitPrice * quantity).toFixed(2));
    totalAmount += subtotal;

    resolvedLines.push({
      product_id: product.id,
      variant_id: line.variant_id || null,
      quantity,
      unit_price: new Prisma.Decimal(unitPrice),
      subtotal: new Prisma.Decimal(subtotal),
    });
  }

  return { resolvedLines, totalAmount: new Prisma.Decimal(totalAmount.toFixed(2)) };
}

/**
 * Validates plan availability and minimum quantity
 */
function validatePlanRules(plan, startDate, lines) {
  if (!plan.is_active) {
    throw new ValidationError(`Plan "${plan.name}" is currently inactive.`);
  }

  const totalQuantity = lines.reduce((acc, l) => acc + Number(l.quantity), 0);
  if (totalQuantity < (plan.min_quantity || 1)) {
    throw new ValidationError(
      `Plan "${plan.name}" requires a minimum total quantity of ${plan.min_quantity}. Received: ${totalQuantity}.`
    );
  }

  const start = new Date(startDate);
  if (plan.available_from && start < new Date(plan.available_from)) {
    throw new ValidationError(
      `Subscription start date (${start.toISOString().split('T')[0]}) is before plan availability starts (${
        new Date(plan.available_from).toISOString().split('T')[0]
      }).`
    );
  }

  if (plan.available_to && start > new Date(plan.available_to)) {
    throw new ValidationError(
      `Subscription start date (${start.toISOString().split('T')[0]}) is after plan availability ended (${
        new Date(plan.available_to).toISOString().split('T')[0]
      }).`
    );
  }
}

/**
 * Create a new subscription in DRAFT status
 */
export async function createSubscription(data, user) {
  const { customer_id, plan_id, start_date, expiry_date, payment_terms = 30, lines } = data;

  const startDateObj = new Date(start_date);
  let expiryDateObj = expiry_date ? new Date(expiry_date) : null;

  return prisma.$transaction(async (tx) => {
    // 1. Verify customer
    const customer = await tx.customer.findUnique({
      where: { id: customer_id },
    });
    if (!customer) {
      throw new NotFoundError(`Customer with ID "${customer_id}" was not found.`);
    }

    // 2. Verify plan
    const plan = await tx.plan.findUnique({
      where: { id: plan_id },
    });
    if (!plan) {
      throw new NotFoundError(`Plan with ID "${plan_id}" was not found.`);
    }

    // Default expiry date if not provided
    if (!expiryDateObj) {
      expiryDateObj = extendDateByPeriod(startDateObj, plan.billing_period);
    }

    if (expiryDateObj <= startDateObj) {
      throw new ValidationError('Expiry date must be after the start date.');
    }

    // 3. Validate Plan Rules
    validatePlanRules(plan, startDateObj, lines);

    // 4. Resolve verified line prices
    const { resolvedLines, totalAmount } = await resolveSubscriptionLines(lines, tx);

    // 5. Sequence-safe auto number
    const number = await generateNextSubscriptionNumber(tx);

    // 6. Create Subscription
    const subscription = await tx.subscription.create({
      data: {
        number,
        customer_id,
        plan_id,
        status: 'DRAFT',
        start_date: startDateObj,
        expiry_date: expiryDateObj,
        end_date: expiryDateObj,
        payment_terms,
        total_amount: totalAmount,
        lines: {
          create: resolvedLines,
        },
      },
      include: {
        customer: true,
        plan: true,
        lines: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    // 7. Write initial status log
    await tx.subscriptionStatusLog.create({
      data: {
        subscription_id: subscription.id,
        from_status: 'DRAFT',
        to_status: 'DRAFT',
        changed_by: user?.email || 'SYSTEM',
        reason: 'Subscription created as DRAFT',
      },
    });

    return subscription;
  });
}

/**
 * Create subscription from Quotation Template
 */
export async function createSubscriptionFromTemplate(templateId, data, user) {
  const { customer_id, plan_id, start_date } = data;

  return prisma.$transaction(async (tx) => {
    const template = await tx.quotationTemplate.findUnique({
      where: { id: templateId },
      include: {
        lines: true,
      },
    });

    if (!template) {
      throw new NotFoundError(`Quotation Template "${templateId}" was not found.`);
    }

    if (!template.lines || template.lines.length === 0) {
      throw new ValidationError(`Quotation Template "${template.name}" has no product lines configured.`);
    }

    // Map template lines to subscription lines format
    const lines = template.lines.map((tl) => ({
      product_id: tl.product_id,
      variant_id: tl.variant_id,
      quantity: tl.quantity,
    }));

    const subscription = await createSubscription(
      {
        customer_id,
        plan_id,
        start_date,
        lines,
      },
      user
    );

    // If template has specific quotation valid days, set quotation_valid_until
    const validDays = template.quotation_valid_days || 30;
    const validUntil = new Date(Date.now() + validDays * 24 * 60 * 60 * 1000);

    const updated = await tx.subscription.update({
      where: { id: subscription.id },
      data: {
        quotation_valid_until: validUntil,
      },
      include: {
        customer: true,
        plan: true,
        lines: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    return updated;
  });
}

/**
 * List subscriptions with filters, search, and pagination
 */
export async function listSubscriptions(query = {}) {
  const { page, limit, skip, search, orderBy } = parsePaginationParams(query, { created_at: 'desc' });

  const where = {};

  if (query.status) {
    where.status = query.status.toUpperCase();
  }

  if (query.customer_id) {
    where.customer_id = query.customer_id;
  }

  if (search) {
    where.OR = [
      { number: { contains: search, mode: 'insensitive' } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
      { customer: { email: { contains: search, mode: 'insensitive' } } },
      { plan: { name: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [total, subscriptions] = await prisma.$transaction([
    prisma.subscription.count({ where }),
    prisma.subscription.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        customer: true,
        plan: true,
        lines: {
          include: {
            product: true,
            variant: true,
          },
        },
        _count: {
          select: {
            lines: true,
            invoices: true,
          },
        },
      },
    }),
  ]);

  return formatPaginatedResponse({
    data: subscriptions,
    total,
    page,
    limit,
  });
}

/**
 * List subscriptions owned by customer
 */
export async function listCustomerSubscriptions(customerId, query = {}) {
  return listSubscriptions({
    ...query,
    customer_id: customerId,
  });
}

/**
 * Get subscription by ID with full details
 */
export async function getSubscriptionById(id) {
  const subscription = await prisma.subscription.findUnique({
    where: { id },
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
      status_logs: {
        orderBy: { created_at: 'desc' },
      },
      invoices: {
        orderBy: { created_at: 'desc' },
      },
    },
  });

  if (!subscription) {
    throw new NotFoundError(`Subscription with ID "${id}" was not found.`);
  }

  return subscription;
}

/**
 * Get subscription transition history
 */
export async function getSubscriptionHistory(id) {
  await getSubscriptionById(id);

  return prisma.subscriptionStatusLog.findMany({
    where: { subscription_id: id },
    orderBy: { created_at: 'desc' },
  });
}

/**
 * Execute a status transition
 * Allowed: DRAFT -> QUOTATION -> CONFIRMED -> ACTIVE -> CLOSED
 */
async function transitionStatus(id, targetStatus, user, reason = '') {
  const subscription = await getSubscriptionById(id);
  const currentStatus = subscription.status;

  const validTransitions = {
    DRAFT: ['QUOTATION'],
    QUOTATION: ['CONFIRMED'],
    CONFIRMED: ['ACTIVE'],
    ACTIVE: ['CLOSED'],
    CLOSED: [],
  };

  const allowedNext = validTransitions[currentStatus] || [];
  if (!allowedNext.includes(targetStatus)) {
    throw new AppError(
      `Illegal status transition from "${currentStatus}" to "${targetStatus}". Allowed next state: ${
        allowedNext.join(', ') || 'None (terminal state)'
      }.`,
      400,
      'ILLEGAL_STATUS_TRANSITION'
    );
  }

  const updateData = { status: targetStatus };

  if (targetStatus === 'QUOTATION') {
    // Set quotation_valid_until default to 30 days if not set
    if (!subscription.quotation_valid_until) {
      updateData.quotation_valid_until = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  }

  if (targetStatus === 'ACTIVE') {
    // Set next_billing_date = start_date
    updateData.next_billing_date = subscription.start_date || new Date();
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.subscription.update({
      where: { id },
      data: updateData,
      include: {
        customer: true,
        plan: true,
        lines: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    await tx.subscriptionStatusLog.create({
      data: {
        subscription_id: id,
        from_status: currentStatus,
        to_status: targetStatus,
        changed_by: user?.email || 'USER',
        reason: reason || `Transitioned to ${targetStatus}`,
      },
    });

    return updated;
  });
}

// Action endpoints: /quote, /confirm, /activate, /close
export async function quoteSubscription(id, user, reason) {
  return transitionStatus(id, 'QUOTATION', user, reason || 'Quotation generated');
}

export async function confirmSubscription(id, user, reason) {
  return transitionStatus(id, 'CONFIRMED', user, reason || 'Order confirmed');
}

export async function activateSubscription(id, user, reason) {
  return transitionStatus(id, 'ACTIVE', user, reason || 'Subscription activated');
}

export async function closeSubscription(id, user, reason) {
  const subscription = await getSubscriptionById(id);

  // Early close permission check
  if (subscription.plan && subscription.plan.closable === false) {
    throw new ForbiddenError(
      `Plan "${subscription.plan.name}" does not permit early closure.`
    );
  }

  return transitionStatus(id, 'CLOSED', user, reason || 'Subscription closed');
}

/**
 * Plan-permission action: /pause
 */
export async function pauseSubscription(id, user, reason) {
  const subscription = await getSubscriptionById(id);

  if (subscription.status !== 'ACTIVE') {
    throw new AppError(
      `Only ACTIVE subscriptions can be paused. Current status: "${subscription.status}".`,
      400,
      'INVALID_STATE'
    );
  }

  if (subscription.is_paused) {
    throw new AppError('Subscription is already paused.', 400, 'ALREADY_PAUSED');
  }

  if (subscription.plan && subscription.plan.pausable === false) {
    throw new ForbiddenError(
      `Plan "${subscription.plan.name}" does not permit pausing.`
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.subscription.update({
      where: { id },
      data: { is_paused: true },
      include: { customer: true, plan: true },
    });

    await tx.subscriptionStatusLog.create({
      data: {
        subscription_id: id,
        from_status: subscription.status,
        to_status: subscription.status,
        changed_by: user?.email || 'USER',
        reason: reason || 'Subscription paused',
      },
    });

    return updated;
  });
}

/**
 * Plan-permission action: /resume
 */
export async function resumeSubscription(id, user, reason) {
  const subscription = await getSubscriptionById(id);

  if (subscription.status !== 'ACTIVE') {
    throw new AppError(
      `Only ACTIVE subscriptions can be resumed. Current status: "${subscription.status}".`,
      400,
      'INVALID_STATE'
    );
  }

  if (!subscription.is_paused) {
    throw new AppError('Subscription is not currently paused.', 400, 'NOT_PAUSED');
  }

  if (subscription.plan && subscription.plan.pausable === false) {
    throw new ForbiddenError(
      `Plan "${subscription.plan.name}" does not permit pausing/resuming.`
    );
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.subscription.update({
      where: { id },
      data: { is_paused: false },
      include: { customer: true, plan: true },
    });

    await tx.subscriptionStatusLog.create({
      data: {
        subscription_id: id,
        from_status: subscription.status,
        to_status: subscription.status,
        changed_by: user?.email || 'USER',
        reason: reason || 'Subscription resumed',
      },
    });

    return updated;
  });
}

/**
 * Plan-permission action: /renew
 */
export async function renewSubscription(id, user, reason) {
  const subscription = await getSubscriptionById(id);

  if (subscription.status !== 'ACTIVE') {
    throw new AppError(
      `Only ACTIVE subscriptions can be renewed. Current status: "${subscription.status}".`,
      400,
      'INVALID_STATE'
    );
  }

  if (!subscription.plan) {
    throw new ValidationError('Subscription has no plan assigned to calculate renewal period.');
  }

  if (subscription.plan.renewable === false) {
    throw new ForbiddenError(
      `Plan "${subscription.plan.name}" does not permit renewal.`
    );
  }

  const currentExpiry = subscription.expiry_date || subscription.end_date || new Date();
  const newExpiry = extendDateByPeriod(currentExpiry, subscription.plan.billing_period);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.subscription.update({
      where: { id },
      data: {
        expiry_date: newExpiry,
        end_date: newExpiry,
      },
      include: {
        customer: true,
        plan: true,
        lines: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
    });

    await tx.subscriptionStatusLog.create({
      data: {
        subscription_id: id,
        from_status: subscription.status,
        to_status: subscription.status,
        changed_by: user?.email || 'USER',
        reason: reason || `Subscription renewed until ${newExpiry.toISOString().split('T')[0]}`,
      },
    });

    return updated;
  });
}
