import prisma from '../../database/prisma.js';
import { resolveDateFilter } from './analytics.service.js';

/**
 * Escapes values for safe CSV formatting
 */
function escapeCsv(value) {
  if (value === null || value === undefined) return '""';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return `"${str}"`;
}

/**
 * Converts array of row objects to CSV string
 */
function rowsToCsv(headers, rows) {
  const headerLine = headers.map((h) => escapeCsv(h.label)).join(',');
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCsv(row[h.key])).join(',')
  );
  return [headerLine, ...dataLines].join('\r\n');
}

/**
 * 1. Revenue Report (CSV)
 */
export async function generateRevenueReport(query = {}) {
  const { period = '30d', startDate, endDate } = query;
  const { start, end } = resolveDateFilter(period, startDate, endDate);

  const payments = await prisma.payment.findMany({
    where: {
      payment_date: { gte: start, lte: end },
    },
    include: {
      invoice: {
        include: {
          customer: true,
          subscription: {
            include: { plan: true },
          },
        },
      },
    },
    orderBy: { payment_date: 'desc' },
  });

  const headers = [
    { label: 'Payment ID', key: 'payment_id' },
    { label: 'Payment Date', key: 'payment_date' },
    { label: 'Invoice Number', key: 'invoice_number' },
    { label: 'Customer Name', key: 'customer_name' },
    { label: 'Customer Email', key: 'customer_email' },
    { label: 'Subscription Number', key: 'subscription_number' },
    { label: 'Plan Name', key: 'plan_name' },
    { label: 'Billing Period', key: 'billing_period' },
    { label: 'Payment Method', key: 'payment_method' },
    { label: 'Amount ($)', key: 'amount' },
    { label: 'Transaction Reference', key: 'transaction_ref' },
  ];

  const rows = payments.map((p) => ({
    payment_id: p.id,
    payment_date: p.payment_date ? p.payment_date.toISOString() : '',
    invoice_number: p.invoice?.number || 'N/A',
    customer_name: p.invoice?.customer?.name || 'N/A',
    customer_email: p.invoice?.customer?.email || 'N/A',
    subscription_number: p.invoice?.subscription?.number || 'N/A',
    plan_name: p.invoice?.subscription?.plan?.name || 'Standard',
    billing_period: p.invoice?.subscription?.plan?.billing_period || 'N/A',
    payment_method: p.payment_method,
    amount: Number(p.amount).toFixed(2),
    transaction_ref: p.transaction_ref || '',
  }));

  return {
    filename: `revenue-report-${period}-${new Date().toISOString().split('T')[0]}.csv`,
    csv: rowsToCsv(headers, rows),
    count: rows.length,
    rows,
  };
}

/**
 * 2. Subscription Report (CSV)
 */
export async function generateSubscriptionReport(query = {}) {
  const { period = '30d', startDate, endDate } = query;
  const { start, end } = resolveDateFilter(period, startDate, endDate);

  const subscriptions = await prisma.subscription.findMany({
    where: {
      created_at: { gte: start, lte: end },
    },
    include: {
      customer: true,
      plan: true,
      lines: {
        include: { product: true },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  const headers = [
    { label: 'Subscription Number', key: 'number' },
    { label: 'Customer Name', key: 'customer_name' },
    { label: 'Customer Email', key: 'customer_email' },
    { label: 'Company', key: 'company' },
    { label: 'Plan', key: 'plan_name' },
    { label: 'Billing Frequency', key: 'billing_period' },
    { label: 'Status', key: 'status' },
    { label: 'Start Date', key: 'start_date' },
    { label: 'Expiry Date', key: 'expiry_date' },
    { label: 'Next Billing Date', key: 'next_billing_date' },
    { label: 'Paused', key: 'is_paused' },
    { label: 'Total Recurring Amount ($)', key: 'total_amount' },
    { label: 'Lines Count', key: 'lines_count' },
    { label: 'Created At', key: 'created_at' },
  ];

  const rows = subscriptions.map((s) => ({
    number: s.number,
    customer_name: s.customer?.name || 'N/A',
    customer_email: s.customer?.email || 'N/A',
    company: s.customer?.company || '',
    plan_name: s.plan?.name || 'Unassigned',
    billing_period: s.plan?.billing_period || 'N/A',
    status: s.status,
    start_date: s.start_date ? s.start_date.toISOString().split('T')[0] : '',
    expiry_date: s.expiry_date ? s.expiry_date.toISOString().split('T')[0] : '',
    next_billing_date: s.next_billing_date ? s.next_billing_date.toISOString().split('T')[0] : '',
    is_paused: s.is_paused ? 'Yes' : 'No',
    total_amount: Number(s.total_amount).toFixed(2),
    lines_count: s.lines.length,
    created_at: s.created_at ? s.created_at.toISOString() : '',
  }));

  return {
    filename: `subscription-report-${period}-${new Date().toISOString().split('T')[0]}.csv`,
    csv: rowsToCsv(headers, rows),
    count: rows.length,
    rows,
  };
}

/**
 * 3. Customer Report (CSV)
 */
export async function generateCustomerReport(query = {}) {
  const { period = '30d', startDate, endDate } = query;
  const { start, end } = resolveDateFilter(period, startDate, endDate);

  const customers = await prisma.customer.findMany({
    where: {
      created_at: { gte: start, lte: end },
    },
    include: {
      subscriptions: true,
      invoices: {
        include: {
          payments: true,
        },
      },
    },
    orderBy: { created_at: 'desc' },
  });

  const headers = [
    { label: 'Customer ID', key: 'id' },
    { label: 'Name', key: 'name' },
    { label: 'Email', key: 'email' },
    { label: 'Company', key: 'company' },
    { label: 'Phone', key: 'phone' },
    { label: 'City', key: 'city' },
    { label: 'Country', key: 'country' },
    { label: 'Total Subscriptions', key: 'total_subscriptions' },
    { label: 'Active Subscriptions', key: 'active_subscriptions' },
    { label: 'Total Spent ($)', key: 'total_spent' },
    { label: 'Created At', key: 'created_at' },
  ];

  const rows = customers.map((c) => {
    let spent = 0;
    for (const inv of c.invoices) {
      for (const p of inv.payments) {
        spent += Number(p.amount) || 0;
      }
    }
    const activeSubs = c.subscriptions.filter((s) => s.status === 'ACTIVE').length;

    return {
      id: c.id,
      name: c.name,
      email: c.email,
      company: c.company || '',
      phone: c.phone || '',
      city: c.city || '',
      country: c.country || '',
      total_subscriptions: c.subscriptions.length,
      active_subscriptions: activeSubs,
      total_spent: spent.toFixed(2),
      created_at: c.created_at ? c.created_at.toISOString() : '',
    };
  });

  return {
    filename: `customer-report-${period}-${new Date().toISOString().split('T')[0]}.csv`,
    csv: rowsToCsv(headers, rows),
    count: rows.length,
    rows,
  };
}

/**
 * 4. Payment Report (CSV)
 */
export async function generatePaymentReport(query = {}) {
  const { period = '30d', startDate, endDate } = query;
  const { start, end } = resolveDateFilter(period, startDate, endDate);

  const payments = await prisma.payment.findMany({
    where: {
      payment_date: { gte: start, lte: end },
    },
    include: {
      invoice: {
        include: { customer: true },
      },
    },
    orderBy: { payment_date: 'desc' },
  });

  const headers = [
    { label: 'Payment ID', key: 'id' },
    { label: 'Invoice Number', key: 'invoice_number' },
    { label: 'Customer Name', key: 'customer_name' },
    { label: 'Customer Email', key: 'customer_email' },
    { label: 'Payment Date', key: 'payment_date' },
    { label: 'Payment Method', key: 'payment_method' },
    { label: 'Amount ($)', key: 'amount' },
    { label: 'Transaction Reference', key: 'transaction_ref' },
    { label: 'Notes', key: 'notes' },
  ];

  const rows = payments.map((p) => ({
    id: p.id,
    invoice_number: p.invoice?.number || 'N/A',
    customer_name: p.invoice?.customer?.name || 'N/A',
    customer_email: p.invoice?.customer?.email || 'N/A',
    payment_date: p.payment_date ? p.payment_date.toISOString() : '',
    payment_method: p.payment_method,
    amount: Number(p.amount).toFixed(2),
    transaction_ref: p.transaction_ref || '',
    notes: p.notes || '',
  }));

  return {
    filename: `payment-report-${period}-${new Date().toISOString().split('T')[0]}.csv`,
    csv: rowsToCsv(headers, rows),
    count: rows.length,
    rows,
  };
}

/**
 * 5. Invoice Report (CSV)
 */
export async function generateInvoiceReport(query = {}) {
  const { period = '30d', startDate, endDate } = query;
  const { start, end } = resolveDateFilter(period, startDate, endDate);

  const invoices = await prisma.invoice.findMany({
    where: {
      created_at: { gte: start, lte: end },
    },
    include: {
      customer: true,
      subscription: true,
    },
    orderBy: { created_at: 'desc' },
  });

  const headers = [
    { label: 'Invoice Number', key: 'number' },
    { label: 'Subscription Number', key: 'subscription_number' },
    { label: 'Customer Name', key: 'customer_name' },
    { label: 'Customer Email', key: 'customer_email' },
    { label: 'Period Start', key: 'period_start' },
    { label: 'Period End', key: 'period_end' },
    { label: 'Subtotal ($)', key: 'subtotal' },
    { label: 'Tax Amount ($)', key: 'tax_amount' },
    { label: 'Discount Amount ($)', key: 'discount_amount' },
    { label: 'Total Amount ($)', key: 'total_amount' },
    { label: 'Status', key: 'status' },
    { label: 'Due Date', key: 'due_date' },
    { label: 'Created At', key: 'created_at' },
  ];

  const rows = invoices.map((inv) => ({
    number: inv.number,
    subscription_number: inv.subscription?.number || 'N/A',
    customer_name: inv.customer?.name || 'N/A',
    customer_email: inv.customer?.email || 'N/A',
    period_start: inv.period_start ? inv.period_start.toISOString().split('T')[0] : '',
    period_end: inv.period_end ? inv.period_end.toISOString().split('T')[0] : '',
    subtotal: Number(inv.subtotal).toFixed(2),
    tax_amount: Number(inv.tax_amount).toFixed(2),
    discount_amount: Number(inv.discount_amount).toFixed(2),
    total_amount: Number(inv.total_amount).toFixed(2),
    status: inv.status,
    due_date: inv.due_date ? inv.due_date.toISOString().split('T')[0] : '',
    created_at: inv.created_at ? inv.created_at.toISOString() : '',
  }));

  return {
    filename: `invoice-report-${period}-${new Date().toISOString().split('T')[0]}.csv`,
    csv: rowsToCsv(headers, rows),
    count: rows.length,
    rows,
  };
}
