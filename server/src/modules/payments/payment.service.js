import { Prisma } from '@prisma/client';
import prisma from '../../database/prisma.js';
import { parsePaginationParams, formatPaginatedResponse } from '../../utils/pagination.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../../utils/errors.js';

const Decimal = Prisma.Decimal;

/**
 * Record payment for an invoice with row locking and balance verification
 */
export async function recordPayment(invoiceId, paymentData, reqUser) {
  const paymentAmount = new Decimal(paymentData.amount);

  return await prisma.$transaction(async (tx) => {
    // 1. Acquire row lock on invoice
    const lockedRows = await tx.$queryRaw`
      SELECT id FROM invoices
      WHERE id = ${invoiceId}
      FOR UPDATE
    `;

    if (!lockedRows || lockedRows.length === 0) {
      throw new NotFoundError(`Invoice with ID '${invoiceId}' not found.`);
    }

    // 2. Fetch invoice with existing payments
    const invoice = await tx.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        payments: true,
        customer: true,
      },
    });

    if (!invoice) {
      throw new NotFoundError(`Invoice with ID '${invoiceId}' not found.`);
    }

    // 3. Validation: Only CONFIRMED invoices accept payments
    if (invoice.status === 'DRAFT') {
      throw new ValidationError('Invoice is in DRAFT status. Please confirm the invoice before recording payments.');
    }

    if (invoice.status === 'PAID') {
      throw new ValidationError('Invoice is already fully PAID.');
    }

    if (invoice.status === 'CANCELLED') {
      throw new ValidationError('Cannot record payments on a CANCELLED invoice.');
    }

    // 4. Calculate existing payments and outstanding balance
    const totalAmount = new Decimal(invoice.total_amount);
    const existingPaid = invoice.payments.reduce(
      (sum, p) => sum.plus(new Decimal(p.amount)),
      new Decimal(0)
    );
    const outstanding = Decimal.max(new Decimal(0), totalAmount.minus(existingPaid));

    // 5. Validation: Amount cannot exceed outstanding balance
    if (paymentAmount.greaterThan(outstanding)) {
      throw new ValidationError(
        `Payment amount ($${paymentAmount.toFixed(2)}) exceeds remaining outstanding balance of $${outstanding.toFixed(2)}.`
      );
    }

    // 6. Create payment record
    const paymentDate = paymentData.payment_date ? new Date(paymentData.payment_date) : new Date();
    const payment = await tx.payment.create({
      data: {
        invoice_id: invoice.id,
        amount: paymentAmount,
        payment_method: paymentData.payment_method,
        payment_date: paymentDate,
        transaction_ref: paymentData.transaction_ref || null,
        notes: paymentData.notes || null,
        recorded_by: reqUser?.email || 'admin',
      },
    });

    // 7. If fully settled, automatically update invoice status to PAID
    const newTotalPaid = existingPaid.plus(paymentAmount);
    let newStatus = invoice.status;
    if (newTotalPaid.greaterThanOrEqualTo(totalAmount)) {
      newStatus = 'PAID';
      await tx.invoice.update({
        where: { id: invoice.id },
        data: { status: 'PAID' },
      });
    }

    const remainingDue = Decimal.max(new Decimal(0), totalAmount.minus(newTotalPaid));

    return {
      payment: {
        ...payment,
        amount: Number(payment.amount),
      },
      invoice: {
        id: invoice.id,
        number: invoice.number,
        total_amount: Number(invoice.total_amount),
        amount_paid: Number(newTotalPaid.toFixed(2)),
        amount_due: Number(remainingDue.toFixed(2)),
        status: newStatus,
      },
    };
  });
}

/**
 * List payments with filters & pagination
 */
export async function listPayments(query = {}, reqUser) {
  const { page, limit, skip, orderBy } = parsePaginationParams(query, { payment_date: 'desc' });
  const { invoice_id, customer_id, payment_method, startDate, endDate } = query;

  const where = {};

  if (invoice_id) {
    where.invoice_id = invoice_id;
  }

  // Customer role isolation
  if (reqUser && reqUser.role === 'CUSTOMER') {
    if (!reqUser.customer_id) {
      throw new ForbiddenError('No customer account linked to your session.');
    }
    where.invoice = { customer_id: reqUser.customer_id };
  } else if (customer_id) {
    where.invoice = { customer_id };
  }

  if (payment_method) {
    where.payment_method = payment_method;
  }

  if (startDate || endDate) {
    where.payment_date = {};
    if (startDate) where.payment_date.gte = new Date(startDate);
    if (endDate) where.payment_date.lte = new Date(endDate);
  }

  const [total, rawPayments] = await prisma.$transaction([
    prisma.payment.count({ where }),
    prisma.payment.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        invoice: {
          select: {
            id: true,
            number: true,
            total_amount: true,
            status: true,
            customer: {
              select: { id: true, name: true, email: true, company: true },
            },
          },
        },
      },
    }),
  ]);

  const payments = rawPayments.map((p) => ({
    ...p,
    amount: Number(p.amount),
  }));

  return formatPaginatedResponse({
    data: payments,
    total,
    page,
    limit,
  });
}
