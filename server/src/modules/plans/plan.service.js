import { Prisma } from '@prisma/client';
import prisma from '../../database/prisma.js';
import { parsePaginationParams, formatPaginatedResponse } from '../../utils/pagination.js';
import { NotFoundError, ConflictError } from '../../utils/errors.js';

function formatPlan(plan) {
  if (!plan) return null;
  return {
    ...plan,
    price: Number(plan.price),
  };
}

/**
 * List plans with pagination, search and filters
 */
export async function listPlans(query = {}) {
  const { page, limit, skip, search, orderBy } = parsePaginationParams(query, { created_at: 'desc' });

  const where = {};

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  if (query.is_active !== undefined) {
    where.is_active = query.is_active === 'true' || query.is_active === true;
  }

  if (query.billing_period) {
    where.billing_period = String(query.billing_period).toUpperCase();
  }

  const [total, plans] = await prisma.$transaction([
    prisma.plan.count({ where }),
    prisma.plan.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
  ]);

  return formatPaginatedResponse({
    data: plans.map(formatPlan),
    total,
    page,
    limit,
  });
}

/**
 * Get active plans available for subscription today (within date window)
 */
export async function getAvailablePlans() {
  const now = new Date();

  const plans = await prisma.plan.findMany({
    where: {
      is_active: true,
      AND: [
        {
          OR: [
            { available_from: null },
            { available_from: { lte: now } },
          ],
        },
        {
          OR: [
            { available_to: null },
            { available_to: { gte: now } },
          ],
        },
      ],
    },
    orderBy: { price: 'asc' },
  });

  return plans.map(formatPlan);
}

/**
 * Get plan by ID
 */
export async function getPlanById(id) {
  const plan = await prisma.plan.findUnique({
    where: { id },
  });

  if (!plan) {
    throw new NotFoundError(`Plan with ID "${id}" was not found.`);
  }

  return formatPlan(plan);
}

/**
 * Create a new plan
 */
export async function createPlan(data) {
  const { price, ...rest } = data;

  const created = await prisma.plan.create({
    data: {
      ...rest,
      price: new Prisma.Decimal(price),
    },
  });

  return formatPlan(created);
}

/**
 * Update an existing plan
 */
export async function updatePlan(id, data) {
  await getPlanById(id);

  const { price, ...rest } = data;
  const updateData = { ...rest };

  if (price !== undefined) {
    updateData.price = new Prisma.Decimal(price);
  }

  const updated = await prisma.plan.update({
    where: { id },
    data: updateData,
  });

  return formatPlan(updated);
}

/**
 * Toggle plan active status
 */
export async function togglePlanStatus(id) {
  const plan = await getPlanById(id);

  const updated = await prisma.plan.update({
    where: { id },
    data: { is_active: !plan.is_active },
  });

  return formatPlan(updated);
}

/**
 * Delete a plan (protected if referenced by active subscriptions)
 */
export async function deletePlan(id) {
  await getPlanById(id);

  const subCount = await prisma.subscription.count({
    where: { plan_id: id },
  });

  if (subCount > 0) {
    throw new ConflictError(
      'Cannot delete plan because it is currently linked to existing subscriptions. Please deactivate it instead.'
    );
  }

  await prisma.plan.delete({
    where: { id },
  });

  return { message: 'Plan deleted successfully.' };
}

