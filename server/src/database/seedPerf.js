import crypto from 'crypto';
import prisma from './prisma.js';

async function seedPerf() {
  const startTime = Date.now();
  console.log('====================================================');
  console.log('⚡ STARTING HIGH-VOLUME PERFORMANCE SEED');
  console.log('Target: 2,000+ Customers, 5,000 Subscriptions, Invoices & Payments');
  console.log('====================================================');

  // 1. Fetch reference records
  let plans = await prisma.plan.findMany();
  let products = await prisma.product.findMany();
  let taxes = await prisma.tax.findMany();
  let discounts = await prisma.discount.findMany();

  if (plans.length === 0 || products.length === 0) {
    console.log('Reference catalog empty. Running standard seed first...');
    const { execSync } = await import('child_process');
    execSync('node src/database/seed.js', { stdio: 'inherit' });
    plans = await prisma.plan.findMany();
    products = await prisma.product.findMany();
    taxes = await prisma.tax.findMany();
    discounts = await prisma.discount.findMany();
  }

  const defaultTax = taxes[0] || null;
  const defaultDiscount = discounts[0] || null;

  // 2. Fetch or create Customers in bulk
  console.log('\n1. Creating 2,000 Customers...');
  const customerChunks = [];
  const CUSTOMER_COUNT = 2000;
  const customerIds = [];

  for (let i = 1; i <= CUSTOMER_COUNT; i++) {
    const id = crypto.randomUUID();
    customerIds.push(id);
    customerChunks.push({
      id,
      name: `Performance Enterprise ${i}`,
      email: `perf.client${i}@benchmark-corp.com`,
      company: `Benchmark Corp ${i}`,
      phone: `+1-555-${String(i).padStart(4, '0')}`,
      address: `${i} Benchmark Way, Silicon Valley, CA`,
    });
  }

  // Insert in chunks of 500
  for (let i = 0; i < customerChunks.length; i += 500) {
    await prisma.customer.createMany({
      data: customerChunks.slice(i, i + 500),
      skipDuplicates: true,
    });
  }
  console.log(`✅ Inserted ${CUSTOMER_COUNT} customers.`);

  // 3. Generate 5,000 Subscriptions
  console.log('\n2. Creating 5,000 Subscriptions with Lines...');
  const SUB_COUNT = 5000;
  const subscriptionRows = [];
  const subscriptionLineRows = [];
  const subscriptionIds = [];

  const statuses = ['ACTIVE', 'ACTIVE', 'ACTIVE', 'CONFIRMED', 'QUOTATION', 'DRAFT', 'CLOSED'];
  const now = new Date();

  // Find max existing number
  const lastSub = await prisma.subscription.findFirst({
    orderBy: { created_at: 'desc' },
    select: { number: true },
  });
  let nextSeq = 10000;
  if (lastSub?.number) {
    const parsed = parseInt(lastSub.number.replace('SUB-', ''), 10);
    if (!isNaN(parsed)) nextSeq = Math.max(nextSeq, parsed + 1);
  }

  for (let i = 0; i < SUB_COUNT; i++) {
    const subId = crypto.randomUUID();
    subscriptionIds.push(subId);

    const customerId = customerIds[i % customerIds.length];
    const plan = plans[i % plans.length];
    const status = statuses[i % statuses.length];
    const subNum = `SUB-${String(nextSeq + i).padStart(6, '0')}`;

    // Dates
    const startDate = new Date(now.getTime() - (i % 60) * 86400000);
    const nextBilling = new Date(now.getTime() + ((i % 30) - 5) * 86400000); // Some past due, some future
    const expiryDate = new Date(startDate.getTime() + 365 * 86400000);

    const product = products[i % products.length];
    const unitPrice = Number(product.sales_price);
    const qty = (i % 5) + 1;
    const totalAmount = unitPrice * qty;

    subscriptionRows.push({
      id: subId,
      number: subNum,
      customer_id: customerId,
      plan_id: plan.id,
      tax_id: defaultTax?.id || null,
      status,
      start_date: startDate,
      next_billing_date: nextBilling,
      expiry_date: expiryDate,
      payment_terms: 30,
      total_amount: totalAmount,
      is_paused: false,
    });

    subscriptionLineRows.push({
      id: crypto.randomUUID(),
      subscription_id: subId,
      product_id: product.id,
      quantity: qty,
      unit_price: unitPrice,
      subtotal: totalAmount,
    });
  }

  for (let i = 0; i < subscriptionRows.length; i += 1000) {
    await prisma.subscription.createMany({
      data: subscriptionRows.slice(i, i + 1000),
      skipDuplicates: true,
    });
    await prisma.subscriptionLine.createMany({
      data: subscriptionLineRows.slice(i, i + 1000),
      skipDuplicates: true,
    });
  }
  console.log(`✅ Inserted ${SUB_COUNT} subscriptions & subscription lines.`);

  // 4. Generate Invoices & Payments for a subset (e.g. 2,500 invoices)
  console.log('\n3. Creating 2,500 Invoices & Payments...');
  const INVOICE_COUNT = 2500;
  const invoiceRows = [];
  const invoiceLineRows = [];
  const paymentRows = [];

  const invoiceStatuses = ['CONFIRMED', 'PAID', 'PAID', 'DRAFT'];
  const paymentMethods = ['CARD', 'UPI', 'BANK_TRANSFER', 'CASH', 'CHEQUE'];

  for (let i = 0; i < INVOICE_COUNT; i++) {
    const invId = crypto.randomUUID();
    const sub = subscriptionRows[i];
    const invNum = `INV-PERF-${String(i + 1).padStart(6, '0')}`;
    const status = invoiceStatuses[i % invoiceStatuses.length];

    // Period
    const pStart = new Date(now.getTime() - (30 + (i % 60)) * 86400000);
    const pEnd = new Date(pStart.getTime() + 30 * 86400000);
    // Due date: some overdue (< now), some upcoming
    const isPastDue = i % 3 === 0;
    const dueDate = isPastDue
      ? new Date(now.getTime() - 10 * 86400000)
      : new Date(now.getTime() + 15 * 86400000);

    const subtotal = sub.total_amount;
    const taxAmt = defaultTax ? Number((subtotal * (Number(defaultTax.rate) / 100)).toFixed(2)) : 0;
    const totalAmount = Number((subtotal + taxAmt).toFixed(2));

    invoiceRows.push({
      id: invId,
      number: invNum,
      subscription_id: sub.id,
      customer_id: sub.customer_id,
      tax_id: defaultTax?.id || null,
      period_start: pStart,
      period_end: pEnd,
      subtotal,
      tax_amount: taxAmt,
      discount_amount: 0,
      total_amount: totalAmount,
      status,
      due_date: dueDate,
    });

    const product = products[i % products.length];
    invoiceLineRows.push({
      id: crypto.randomUUID(),
      invoice_id: invId,
      product_id: product.id,
      description: `Recurring billing for ${sub.number}`,
      quantity: 1,
      unit_price: subtotal,
      subtotal: subtotal,
    });

    // If status is PAID, record full payment; if CONFIRMED, maybe record partial
    if (status === 'PAID') {
      paymentRows.push({
        id: crypto.randomUUID(),
        invoice_id: invId,
        amount: totalAmount,
        payment_method: paymentMethods[i % paymentMethods.length],
        payment_date: new Date(dueDate.getTime() - 2 * 86400000),
        transaction_ref: `TXN-PERF-${i + 1}`,
        recorded_by: 'Performance Seeder',
      });
    } else if (status === 'CONFIRMED' && i % 2 === 0) {
      paymentRows.push({
        id: crypto.randomUUID(),
        invoice_id: invId,
        amount: Number((totalAmount * 0.5).toFixed(2)),
        payment_method: paymentMethods[i % paymentMethods.length],
        payment_date: new Date(),
        transaction_ref: `PARTIAL-PERF-${i + 1}`,
        recorded_by: 'Performance Seeder',
      });
    }
  }

  for (let i = 0; i < invoiceRows.length; i += 1000) {
    await prisma.invoice.createMany({
      data: invoiceRows.slice(i, i + 1000),
      skipDuplicates: true,
    });
    await prisma.invoiceLine.createMany({
      data: invoiceLineRows.slice(i, i + 1000),
      skipDuplicates: true,
    });
  }

  for (let i = 0; i < paymentRows.length; i += 1000) {
    await prisma.payment.createMany({
      data: paymentRows.slice(i, i + 1000),
      skipDuplicates: true,
    });
  }

  console.log(`✅ Inserted ${INVOICE_COUNT} invoices & ${paymentRows.length} payments.`);

  const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(2);
  console.log('\n====================================================');
  console.log(`🎉 HIGH-VOLUME PERFORMANCE SEED COMPLETE in ${elapsedSec}s`);
  console.log(`- Customers:     ${await prisma.customer.count()}`);
  console.log(`- Subscriptions: ${await prisma.subscription.count()}`);
  console.log(`- Invoices:      ${await prisma.invoice.count()}`);
  console.log(`- Payments:      ${await prisma.payment.count()}`);
  console.log('====================================================');
}

seedPerf()
  .catch((err) => {
    console.error('Performance Seed Failed:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
