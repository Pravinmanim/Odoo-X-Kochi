import { Prisma } from '@prisma/client';
import prisma from '../../database/prisma.js';
import { parsePaginationParams, formatPaginatedResponse } from '../../utils/pagination.js';
import { NotFoundError, ConflictError } from '../../utils/errors.js';

export function formatDiscount(discount) {
  if (!discount) return null;
  const isExpired = Boolean(discount.expires_at && new Date(discount.expires_at) < new Date());
  const isLimitReached = Boolean(
    discount.max_redemptions !== null &&
    discount.max_redemptions !== undefined &&
    discount.redemptions_count >= discount.max_redemptions
  );

  return {
    ...discount,
    value: Number(discount.value),
    min_purchase: Number(discount.min_purchase || 0),
    usage_limit: discount.max_redemptions,
    used_count: discount.redemptions_count,
    end_date: discount.expires_at,
    is_expired: isExpired,
    is_limit_reached: isLimitReached,
  };
}

/**
 * List discounts with pagination, search, and status filters
 */
export async function listDiscounts(query = {}) {
  const { page, limit, skip, search, orderBy } = parsePaginationParams(query, { created_at: 'desc' });

  const where = {};

  if (search) {
    where.code = { contains: search, mode: 'insensitive' };
  }

  if (query.is_active !== undefined) {
    where.is_active = query.is_active === 'true' || query.is_active === true;
  }

  if (query.type) {
    where.type = String(query.type).toUpperCase();
  }

  if (query.scope) {
    where.scope = String(query.scope).toUpperCase();
  }

  const [total, discounts] = await prisma.$transaction([
    prisma.discount.count({ where }),
    prisma.discount.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
  ]);

  return formatPaginatedResponse({
    data: discounts.map(formatDiscount),
    total,
    page,
    limit,
  });
}

/**
 * Get discount by ID
 */
export async function getDiscountById(id) {
  const discount = await prisma.discount.findUnique({
    where: { id },
  });

  if (!discount) {
    throw new NotFoundError(`Discount with ID "${id}" was not found.`);
  }

  return formatDiscount(discount);
}

/**
 * Get discount by Code
 */
export async function getDiscountByCode(code) {
  const normalized = String(code).trim().toUpperCase();
  const discount = await prisma.discount.findUnique({
    where: { code: normalized },
  });

  if (!discount) {
    throw new NotFoundError(`Discount with code "${normalized}" was not found.`);
  }

  return formatDiscount(discount);
}

/**
 * Create a new promotional discount
 */
export async function createDiscount(data) {
  const normalizedCode = String(data.code).trim().toUpperCase();

  const existing = await prisma.discount.findUnique({
    where: { code: normalizedCode },
  });

  if (existing) {
    throw new ConflictError(`Discount code "${normalizedCode}" already exists.`);
  }

  const expiresAt = data.expires_at || data.end_date || null;
  const maxRedemptions = data.max_redemptions !== undefined ? data.max_redemptions : data.usage_limit;

  const created = await prisma.discount.create({
    data: {
      code: normalizedCode,
      type: data.type,
      value: new Prisma.Decimal(data.value),
      min_purchase: new Prisma.Decimal(data.min_purchase || 0),
      min_quantity: data.min_quantity ?? 1,
      start_date: data.start_date || null,
      expires_at: expiresAt,
      max_redemptions: maxRedemptions !== undefined ? maxRedemptions : null,
      scope: (data.scope || 'SUBSCRIPTION').toUpperCase(),
      is_active: data.is_active !== undefined ? data.is_active : true,
    },
  });

  return formatDiscount(created);
}

/**
 * Update an existing discount
 */
export async function updateDiscount(id, data) {
  const existing = await getDiscountById(id);

  const updateData = {};

  if (data.code !== undefined) {
    const normalizedCode = String(data.code).trim().toUpperCase();
    if (normalizedCode !== existing.code) {
      const duplicate = await prisma.discount.findUnique({
        where: { code: normalizedCode },
      });
      if (duplicate) {
        throw new ConflictError(`Discount code "${normalizedCode}" already exists.`);
      }
      updateData.code = normalizedCode;
    }
  }

  if (data.type !== undefined) updateData.type = data.type;
  if (data.value !== undefined) updateData.value = new Prisma.Decimal(data.value);
  if (data.min_purchase !== undefined) updateData.min_purchase = new Prisma.Decimal(data.min_purchase);
  if (data.min_quantity !== undefined) updateData.min_quantity = data.min_quantity;
  if (data.start_date !== undefined) updateData.start_date = data.start_date;

  if (data.expires_at !== undefined || data.end_date !== undefined) {
    updateData.expires_at = data.expires_at || data.end_date || null;
  }

  if (data.max_redemptions !== undefined || data.usage_limit !== undefined) {
    updateData.max_redemptions = data.max_redemptions !== undefined ? data.max_redemptions : data.usage_limit;
  }

  if (data.scope !== undefined) updateData.scope = String(data.scope).toUpperCase();
  if (data.is_active !== undefined) updateData.is_active = data.is_active;

  const updated = await prisma.discount.update({
    where: { id },
    data: updateData,
  });

  return formatDiscount(updated);
}

/**
 * Toggle discount active status
 */
export async function toggleDiscountStatus(id) {
  const discount = await getDiscountById(id);

  const updated = await prisma.discount.update({
    where: { id },
    data: { is_active: !discount.is_active },
  });

  return formatDiscount(updated);
}

/**
 * Delete a discount (protected if already used in discount_usages)
 */
export async function deleteDiscount(id) {
  await getDiscountById(id);

  const usageCount = await prisma.discountUsage.count({
    where: { discount_id: id },
  });

  if (usageCount > 0) {
    throw new ConflictError(
      'Cannot delete discount because it has already been redeemed on invoices. Deactivate it instead.'
    );
  }

  await prisma.discount.delete({
    where: { id },
  });

  return { message: 'Discount deleted successfully.' };
}

