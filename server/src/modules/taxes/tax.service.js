import { Prisma } from '@prisma/client';
import prisma from '../../database/prisma.js';
import { parsePaginationParams, formatPaginatedResponse } from '../../utils/pagination.js';
import { NotFoundError, ConflictError } from '../../utils/errors.js';

function formatTax(tax) {
  if (!tax) return null;
  const rateNum = Number(tax.rate);
  return {
    ...tax,
    rate: rateNum,
    rate_percent: rateNum,
  };
}

/**
 * List taxes with pagination, search, and active status filter
 */
export async function listTaxes(query = {}) {
  const { page, limit, skip, search, orderBy } = parsePaginationParams(query, { created_at: 'desc' });

  const where = {};

  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  if (query.is_active !== undefined) {
    where.is_active = query.is_active === 'true' || query.is_active === true;
  }

  const [total, taxes] = await prisma.$transaction([
    prisma.tax.count({ where }),
    prisma.tax.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
  ]);

  return formatPaginatedResponse({
    data: taxes.map(formatTax),
    total,
    page,
    limit,
  });
}

/**
 * Get tax by ID
 */
export async function getTaxById(id) {
  const tax = await prisma.tax.findUnique({
    where: { id },
  });

  if (!tax) {
    throw new NotFoundError(`Tax with ID "${id}" was not found.`);
  }

  return formatTax(tax);
}

/**
 * Create a new tax rate
 */
export async function createTax(data) {
  const rateValue = data.rate_percent !== undefined ? data.rate_percent : data.rate;

  const created = await prisma.tax.create({
    data: {
      name: data.name,
      rate: new Prisma.Decimal(rateValue),
      is_active: data.is_active !== undefined ? data.is_active : true,
    },
  });

  return formatTax(created);
}

/**
 * Update an existing tax
 */
export async function updateTax(id, data) {
  await getTaxById(id);

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.rate_percent !== undefined || data.rate !== undefined) {
    const rateValue = data.rate_percent !== undefined ? data.rate_percent : data.rate;
    updateData.rate = new Prisma.Decimal(rateValue);
  }
  if (data.is_active !== undefined) updateData.is_active = data.is_active;

  const updated = await prisma.tax.update({
    where: { id },
    data: updateData,
  });

  return formatTax(updated);
}

/**
 * Toggle tax active status
 */
export async function toggleTaxStatus(id) {
  const tax = await getTaxById(id);

  const updated = await prisma.tax.update({
    where: { id },
    data: { is_active: !tax.is_active },
  });

  return formatTax(updated);
}

/**
 * Delete a tax rate (protected if linked to subscriptions or invoices)
 */
export async function deleteTax(id) {
  await getTaxById(id);

  const [subCount, invoiceCount] = await Promise.all([
    prisma.subscription.count({ where: { tax_id: id } }),
    prisma.invoice.count({ where: { tax_id: id } }),
  ]);

  if (subCount > 0 || invoiceCount > 0) {
    throw new ConflictError(
      'Cannot delete tax rule because it is referenced by existing subscriptions or invoices. Deactivate it instead.'
    );
  }

  await prisma.tax.delete({
    where: { id },
  });

  return { message: 'Tax deleted successfully.' };
}

