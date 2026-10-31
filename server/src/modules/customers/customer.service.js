import prisma from '../../database/prisma.js';
import { parsePaginationParams, formatPaginatedResponse } from '../../utils/pagination.js';
import { NotFoundError, ConflictError } from '../../utils/errors.js';

export async function listCustomers(query = {}) {
  const { page, limit, skip, search, orderBy } = parsePaginationParams(query, { created_at: 'desc' });

  const where = {};
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { email: { contains: search, mode: 'insensitive' } },
      { company: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [total, customers] = await prisma.$transaction([
    prisma.customer.count({ where }),
    prisma.customer.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        _count: {
          select: {
            subscriptions: true,
            invoices: true,
          },
        },
      },
    }),
  ]);

  return formatPaginatedResponse({
    data: customers,
    total,
    page,
    limit,
  });
}

export async function getCustomerById(id) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      subscriptions: {
        orderBy: { created_at: 'desc' },
        include: {
          plan: true,
        },
      },
      _count: {
        select: {
          subscriptions: true,
          invoices: true,
        },
      },
    },
  });

  if (!customer) {
    throw new NotFoundError(`Customer with ID "${id}" was not found.`);
  }

  return customer;
}

export async function createCustomer(data) {
  const email = data.email.toLowerCase().trim();

  const customer = await prisma.customer.create({
    data: {
      ...data,
      email,
    },
  });

  return customer;
}

export async function updateCustomer(id, data) {
  await getCustomerById(id);

  const updateData = { ...data };
  if (updateData.email) {
    updateData.email = updateData.email.toLowerCase().trim();
  }

  const customer = await prisma.customer.update({
    where: { id },
    data: updateData,
  });

  return customer;
}
