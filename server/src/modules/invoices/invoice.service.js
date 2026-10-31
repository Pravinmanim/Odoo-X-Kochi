import PDFDocument from 'pdfkit';
import prisma from '../../database/prisma.js';
import { parsePaginationParams, formatPaginatedResponse } from '../../utils/pagination.js';
import { AppError, NotFoundError, ForbiddenError, ValidationError } from '../../utils/errors.js';
import { sendInvoiceEmail } from '../../utils/mailer.js';

/**
 * Calculates derived fields: amount_paid, amount_due, partially_paid, is_overdue
 */
export function enrichInvoice(invoice) {
  if (!invoice) return null;

  const total = Number(invoice.total_amount) || 0;
  const payments = invoice.payments || [];
  const amountPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const amountDue = Math.max(0, Number((total - amountPaid).toFixed(2)));
  const partiallyPaid = amountPaid > 0 && amountPaid < total;

  // Derived overdue: due_date < today AND status not PAID/CANCELLED
  const now = new Date();
  const isOverdue =
    new Date(invoice.due_date) < now &&
    invoice.status !== 'PAID' &&
    invoice.status !== 'CANCELLED';

  return {
    ...invoice,
    total_amount: Number(total.toFixed(2)),
    subtotal: Number(Number(invoice.subtotal).toFixed(2)),
    tax_amount: Number(Number(invoice.tax_amount).toFixed(2)),
    discount_amount: Number(Number(invoice.discount_amount).toFixed(2)),
    amount_paid: Number(amountPaid.toFixed(2)),
    amount_due: amountDue,
    partially_paid: partiallyPaid,
    is_overdue: isOverdue,
  };
}

/**
 * List invoices with filtering, pagination, and derived overdue
 */
export async function listInvoices(query = {}, reqUser) {
  const { page, limit, skip, search, orderBy } = parsePaginationParams(query, { created_at: 'desc' });
  const { status, customer_id, overdue, startDate, endDate } = query;

  const where = {};

  // Customer portal isolation
  if (reqUser && reqUser.role === 'CUSTOMER') {
    if (!reqUser.customer_id) {
      throw new ForbiddenError('No customer record linked to your user account.');
    }
    where.customer_id = reqUser.customer_id;
  } else if (customer_id) {
    where.customer_id = customer_id;
  }

  // Status filter
  if (status) {
    where.status = status;
  }

  // Date filters
  if (startDate || endDate) {
    where.created_at = {};
    if (startDate) where.created_at.gte = new Date(startDate);
    if (endDate) where.created_at.lte = new Date(endDate);
  }

  // Derived overdue filter: due_date < now AND status not PAID/CANCELLED
  if (overdue === 'true') {
    where.due_date = { lt: new Date() };
    where.status = { in: ['DRAFT', 'CONFIRMED'] };
  }

  // Search filter (number or customer name/email)
  if (search) {
    where.OR = [
      { number: { contains: search, mode: 'insensitive' } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
      { customer: { email: { contains: search, mode: 'insensitive' } } },
    ];
  }

  const [total, rawInvoices] = await prisma.$transaction([
    prisma.invoice.count({ where }),
    prisma.invoice.findMany({
      where,
      skip,
      take: limit,
      orderBy,
      include: {
        customer: true,
        subscription: {
          select: { id: true, number: true },
        },
        payments: {
          select: { id: true, amount: true, payment_method: true, payment_date: true },
        },
      },
    }),
  ]);

  const invoices = rawInvoices.map(enrichInvoice);

  return formatPaginatedResponse({
    data: invoices,
    total,
    page,
    limit,
  });
}

/**
 * Get detailed invoice by ID with line items, payments, and discounts
 */
export async function getInvoiceById(id, reqUser) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      subscription: {
        include: { plan: true },
      },
      tax: true,
      lines: {
        include: { product: true, variant: true },
      },
      payments: {
        orderBy: { payment_date: 'desc' },
      },
      discount_usages: {
        include: { discount: true },
      },
    },
  });

  if (!invoice) {
    throw new NotFoundError(`Invoice with ID '${id}' not found.`);
  }

  // Ownership check
  if (reqUser && reqUser.role === 'CUSTOMER' && invoice.customer_id !== reqUser.customer_id) {
    throw new ForbiddenError('You do not have permission to view this invoice.');
  }

  return enrichInvoice(invoice);
}

/**
 * Confirm invoice: DRAFT -> CONFIRMED
 */
export async function confirmInvoice(id, reqUser) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
  });

  if (!invoice) {
    throw new NotFoundError(`Invoice with ID '${id}' not found.`);
  }

  if (invoice.status !== 'DRAFT') {
    throw new ValidationError(`Only DRAFT invoices can be confirmed. Current status: ${invoice.status}`);
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: { status: 'CONFIRMED' },
    include: {
      customer: true,
      subscription: true,
      payments: true,
    },
  });

  return enrichInvoice(updated);
}

/**
 * Cancel invoice: Allowed from DRAFT or CONFIRMED, ONLY if no payments have been recorded
 */
export async function cancelInvoice(id, reqUser) {
  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { payments: true },
  });

  if (!invoice) {
    throw new NotFoundError(`Invoice with ID '${id}' not found.`);
  }

  if (invoice.status === 'PAID') {
    throw new ValidationError('Cannot cancel a PAID invoice.');
  }

  if (invoice.status === 'CANCELLED') {
    throw new ValidationError('Invoice is already CANCELLED.');
  }

  if (invoice.payments && invoice.payments.length > 0) {
    throw new ValidationError('Cannot cancel an invoice with existing recorded payments. Refund or delete payments first.');
  }

  const updated = await prisma.invoice.update({
    where: { id },
    data: { status: 'CANCELLED' },
    include: {
      customer: true,
      subscription: true,
      payments: true,
    },
  });

  return enrichInvoice(updated);
}

/**
 * Send invoice email via Nodemailer (Mailpit locally)
 */
export async function sendInvoice(id, reqUser) {
  const invoice = await getInvoiceById(id, reqUser);

  if (!invoice.customer?.email) {
    throw new ValidationError('Invoice customer has no registered email address.');
  }

  await sendInvoiceEmail({
    to: invoice.customer.email,
    invoiceNumber: invoice.number,
    customerName: invoice.customer.name,
    totalAmount: invoice.total_amount,
    dueDate: new Date(invoice.due_date).toISOString().split('T')[0],
    periodStart: new Date(invoice.period_start).toISOString().split('T')[0],
    periodEnd: new Date(invoice.period_end).toISOString().split('T')[0],
  });

  return {
    success: true,
    message: `Invoice email successfully dispatched to ${invoice.customer.email}`,
  };
}

/**
 * Stream professional PDF invoice using PDFKit
 */
export async function streamInvoicePdf(id, reqUser, res) {
  const invoice = await getInvoiceById(id, reqUser);

  const doc = new PDFDocument({ margin: 50, size: 'A4' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="Invoice-${invoice.number}.pdf"`);

  doc.pipe(res);

  // Header
  doc.fontSize(22).font('Helvetica-Bold').text('BRIGHTLOOP', 50, 50);
  doc.fontSize(10).font('Helvetica').text('Subscription Management System', 50, 75);
  doc.text('billing@brightloop.local | www.brightloop.com', 50, 90);

  // Invoice Title & Meta
  doc.fontSize(20).font('Helvetica-Bold').text('INVOICE', 400, 50, { align: 'right' });
  doc.fontSize(10).font('Helvetica').text(`Invoice #: ${invoice.number}`, 400, 75, { align: 'right' });
  doc.text(`Issue Date: ${new Date(invoice.created_at).toISOString().split('T')[0]}`, 400, 90, { align: 'right' });
  doc.text(`Due Date: ${new Date(invoice.due_date).toISOString().split('T')[0]}`, 400, 105, { align: 'right' });
  doc.text(`Status: ${invoice.status}`, 400, 120, { align: 'right' });

  doc.moveTo(50, 140).lineTo(550, 140).strokeColor('#cbd5e1').stroke();

  // Billed To & Subscription Info
  doc.fontSize(11).font('Helvetica-Bold').text('BILLED TO:', 50, 155);
  doc.fontSize(10).font('Helvetica').text(invoice.customer?.name || 'Customer', 50, 172);
  if (invoice.customer?.company) doc.text(invoice.customer.company, 50, 187);
  doc.text(invoice.customer?.email || '', 50, 202);

  doc.fontSize(11).font('Helvetica-Bold').text('SUBSCRIPTION DETAILS:', 320, 155);
  doc.fontSize(10).font('Helvetica').text(`Subscription #: ${invoice.subscription?.number || 'N/A'}`, 320, 172);
  doc.text(`Billing Plan: ${invoice.subscription?.plan?.name || 'Standard'}`, 320, 187);
  doc.text(
    `Period: ${new Date(invoice.period_start).toISOString().split('T')[0]} to ${new Date(invoice.period_end).toISOString().split('T')[0]}`,
    320,
    202
  );

  doc.moveTo(50, 225).lineTo(550, 225).strokeColor('#cbd5e1').stroke();

  // Table Headers
  const tableTop = 245;
  doc.fontSize(10).font('Helvetica-Bold');
  doc.text('Description', 50, tableTop);
  doc.text('Qty', 320, tableTop, { width: 40, align: 'center' });
  doc.text('Unit Price', 380, tableTop, { width: 70, align: 'right' });
  doc.text('Total', 470, tableTop, { width: 80, align: 'right' });

  doc.moveTo(50, tableTop + 15).lineTo(550, tableTop + 15).strokeColor('#94a3b8').stroke();

  // Table Rows
  let y = tableTop + 25;
  doc.font('Helvetica').fontSize(10);

  const lines = invoice.lines || [];
  for (const line of lines) {
    doc.text(line.description || 'Item', 50, y, { width: 250 });
    doc.text(String(line.quantity), 320, y, { width: 40, align: 'center' });
    doc.text(`$${Number(line.unit_price).toFixed(2)}`, 380, y, { width: 70, align: 'right' });
    doc.text(`$${Number(line.subtotal).toFixed(2)}`, 470, y, { width: 80, align: 'right' });
    y += 20;
  }

  doc.moveTo(50, y + 5).lineTo(550, y + 5).strokeColor('#e2e8f0').stroke();
  y += 15;

  // Summary Calculation
  doc.fontSize(10).font('Helvetica');
  doc.text('Subtotal:', 350, y, { width: 100, align: 'right' });
  doc.text(`$${invoice.subtotal.toFixed(2)}`, 470, y, { width: 80, align: 'right' });
  y += 16;

  if (invoice.discount_amount > 0) {
    doc.text('Discount:', 350, y, { width: 100, align: 'right' });
    doc.text(`-$${invoice.discount_amount.toFixed(2)}`, 470, y, { width: 80, align: 'right' });
    y += 16;
  }

  if (invoice.tax_amount > 0) {
    doc.text('Tax:', 350, y, { width: 100, align: 'right' });
    doc.text(`+$${invoice.tax_amount.toFixed(2)}`, 470, y, { width: 80, align: 'right' });
    y += 16;
  }

  doc.moveTo(350, y + 5).lineTo(550, y + 5).strokeColor('#cbd5e1').stroke();
  y += 12;

  doc.fontSize(12).font('Helvetica-Bold');
  doc.text('Total Amount:', 330, y, { width: 120, align: 'right' });
  doc.text(`$${invoice.total_amount.toFixed(2)}`, 470, y, { width: 80, align: 'right' });
  y += 20;

  doc.fontSize(10).font('Helvetica');
  doc.text('Amount Paid:', 350, y, { width: 100, align: 'right' });
  doc.text(`$${invoice.amount_paid.toFixed(2)}`, 470, y, { width: 80, align: 'right' });
  y += 16;

  doc.fontSize(11).font('Helvetica-Bold');
  doc.text('Balance Due:', 350, y, { width: 100, align: 'right' });
  doc.text(`$${invoice.amount_due.toFixed(2)}`, 470, y, { width: 80, align: 'right' });

  // Footer Note
  doc.fontSize(9).font('Helvetica-Oblique').fillColor('#64748b');
  doc.text('Thank you for choosing Brightloop. Automated invoices are subject to system terms and conditions.', 50, 750, {
    align: 'center',
    width: 500,
  });

  doc.end();
}
