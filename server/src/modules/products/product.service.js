import { Prisma } from '@prisma/client';
import prisma from '../../database/prisma.js';
import { parsePaginationParams, formatPaginatedResponse } from '../../utils/pagination.js';
import { NotFoundError, ConflictError } from '../../utils/errors.js';

/**
 * Attaches calculated final_price to each variant.
 * Final variant price = product sales price + variant extra price
 */
function enrichProductWithVariantPrices(product) {
  if (!product) return null;

  const basePrice = Number(product.sales_price);

  const enrichedVariants = (product.variants || []).map((v) => {
    const extraPrice = Number(v.extra_price || 0);
    const finalPrice = Number((basePrice + extraPrice).toFixed(2));
    return {
      ...v,
      extra_price: extraPrice,
      final_price: finalPrice,
    };
  });

  return {
    ...product,
    sales_price: basePrice,
    variants: enrichedVariants,
  };
}

/**
 * List products with pagination, search, filter and sort
 */
export async function listProducts(query = {}) {
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

  const [total, products] = await prisma.$transaction([
    prisma.product.count({ where }),
    prisma.product.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        variants: {
          orderBy: { created_at: 'asc' },
        },
      },
    }),
  ]);

  const data = products.map(enrichProductWithVariantPrices);

  return formatPaginatedResponse({
    data,
    total,
    page,
    limit,
  });
}

/**
 * Get product by ID
 */
export async function getProductById(id) {
  const product = await prisma.product.findUnique({
    where: { id },
    include: {
      variants: {
        orderBy: { created_at: 'asc' },
      },
    },
  });

  if (!product) {
    throw new NotFoundError(`Product with ID "${id}" was not found.`);
  }

  return enrichProductWithVariantPrices(product);
}

/**
 * Create a new product with optional variants
 */
export async function createProduct(data) {
  const { variants = [], sales_price, ...rest } = data;

  const created = await prisma.product.create({
    data: {
      ...rest,
      sales_price: new Prisma.Decimal(sales_price),
      variants: {
        create: variants.map((v) => ({
          attribute: v.attribute,
          extra_price: new Prisma.Decimal(v.extra_price || 0),
        })),
      },
    },
    include: {
      variants: {
        orderBy: { created_at: 'asc' },
      },
    },
  });

  return enrichProductWithVariantPrices(created);
}

/**
 * Update an existing product and its variants
 */
export async function updateProduct(id, data) {
  // Ensure product exists
  await getProductById(id);

  const { variants, sales_price, ...rest } = data;

  const updateData = { ...rest };
  if (sales_price !== undefined) {
    updateData.sales_price = new Prisma.Decimal(sales_price);
  }

  const updated = await prisma.$transaction(async (tx) => {
    // If variants array is explicitly provided, synchronize variants
    if (Array.isArray(variants)) {
      // Find current variants
      const currentVariants = await tx.productVariant.findMany({
        where: { product_id: id },
      });
      const currentIds = currentVariants.map((v) => v.id);
      const incomingIds = variants.filter((v) => v.id).map((v) => v.id);

      // Delete variants not in incoming list
      const toDelete = currentIds.filter((cid) => !incomingIds.includes(cid));
      if (toDelete.length > 0) {
        await tx.productVariant.deleteMany({
          where: { id: { in: toDelete } },
        });
      }

      // Upsert incoming variants
      for (const v of variants) {
        if (v.id && currentIds.includes(v.id)) {
          await tx.productVariant.update({
            where: { id: v.id },
            data: {
              attribute: v.attribute,
              extra_price: new Prisma.Decimal(v.extra_price || 0),
            },
          });
        } else {
          await tx.productVariant.create({
            data: {
              product_id: id,
              attribute: v.attribute,
              extra_price: new Prisma.Decimal(v.extra_price || 0),
            },
          });
        }
      }
    }

    return tx.product.update({
      where: { id },
      data: updateData,
      include: {
        variants: {
          orderBy: { created_at: 'asc' },
        },
      },
    });
  });

  return enrichProductWithVariantPrices(updated);
}

/**
 * Delete a product
 */
export async function deleteProduct(id) {
  await getProductById(id);

  // Check if product is in use by subscription lines, template lines, or invoice lines
  const [subCount, templateCount, invoiceCount] = await Promise.all([
    prisma.subscriptionLine.count({ where: { product_id: id } }),
    prisma.templateLine.count({ where: { product_id: id } }),
    prisma.invoiceLine.count({ where: { product_id: id } }),
  ]);

  if (subCount > 0 || templateCount > 0 || invoiceCount > 0) {
    throw new ConflictError(
      'Cannot delete product because it is referenced by existing subscriptions, templates, or invoices. Consider archiving it by setting is_active to false instead.'
    );
  }

  await prisma.product.delete({
    where: { id },
  });

  return { message: 'Product deleted successfully.' };
}

