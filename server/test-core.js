import assert from 'assert';
import http from 'http';
import app from './src/app.js';
import prisma from './src/database/prisma.js';
import { runBillingEngine, advanceDateByPeriod, processSingleSubscriptionBilling } from './src/services/billingService.js';

let server;
let baseUrl;

function request(path, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(baseUrl + path);
    const reqOptions = {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(options.token ? { Authorization: `Bearer ${options.token}` } : {}),
        ...options.headers,
      },
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        let parsed = data;
        try {
          parsed = JSON.parse(data);
        } catch {
          // Keep raw string if non-JSON (e.g. PDF/CSV)
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsed,
          raw: data,
        });
      });
    });

    req.on('error', reject);
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    req.end();
  });
}

async function runCoreTests() {
  console.log('======================================================================');
  console.log('🧪 RUNNING CORE BILLING, INVOICES, PAYMENTS & PERF TEST SUITE');
  console.log('======================================================================');

  let passed = 0;
  let failed = 0;

  function test(name, fn) {
    return Promise.resolve()
      .then(fn)
      .then(() => {
        console.log(`  ✅ PASS: ${name}`);
        passed++;
      })
      .catch((err) => {
        console.error(`  ❌ FAIL: ${name}`);
        console.error(`     Error: ${err.message}`);
        failed++;
      });
  }

  // Start temporary server
  await new Promise((resolve) => {
    server = app.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://127.0.0.1:${port}/api/v1`;
      resolve();
    });
  });

  try {
    // 1. Authenticate tokens
    console.log('\n1. Authenticating Tokens (Admin & Customer)...');
    const adminLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@brightloop.com', password: 'AdminPassword123!' },
    });
    const adminToken = adminLogin.data.token;

    const customerLogin = await request('/auth/login', {
      method: 'POST',
      body: { email: 'customer@brightloop.com', password: 'CustomerPassword123!' },
    });
    const customerToken = customerLogin.data.token;
    const customer = await prisma.customer.findFirst({ where: { email: 'customer@brightloop.com' } });
    const customerId = customer?.id;

    // 2. Test Month-End Period Advancement Logic
    console.log('\n2. Testing Calendar Date Advancement Calculations...');
    await test('Month-end day capping: Jan 31 -> Feb 28 in non-leap year (2025)', () => {
      const jan31_2025 = new Date('2025-01-31T00:00:00Z');
      const nextMonth = advanceDateByPeriod(jan31_2025, 'MONTHLY');
      assert.strictEqual(nextMonth.getUTCMonth(), 1); // February
      assert.strictEqual(nextMonth.getUTCDate(), 28);
    });

    await test('Leap-year handling: Jan 31 -> Feb 29 in leap year (2024)', () => {
      const jan31_2024 = new Date('2024-01-31T00:00:00Z');
      const nextMonth = advanceDateByPeriod(jan31_2024, 'MONTHLY');
      assert.strictEqual(nextMonth.getUTCMonth(), 1); // February
      assert.strictEqual(nextMonth.getUTCDate(), 29);
    });

    await test('Month-end boundary: Mar 31 -> Apr 30 (30 days capping)', () => {
      const mar31 = new Date('2026-03-31T00:00:00Z');
      const nextMonth = advanceDateByPeriod(mar31, 'MONTHLY');
      assert.strictEqual(nextMonth.getUTCMonth(), 3); // April
      assert.strictEqual(nextMonth.getUTCDate(), 30);
    });

    await test('Weekly advancement: exactly 7 days', () => {
      const start = new Date('2026-05-01T00:00:00Z');
      const nextWeek = advanceDateByPeriod(start, 'WEEKLY');
      assert.strictEqual(nextWeek.getUTCDate(), 8);
    });

    await test('Yearly advancement: leap day Feb 29 -> Feb 28 in non-leap year', () => {
      const leapDay = new Date('2024-02-29T00:00:00Z');
      const nextYear = advanceDateByPeriod(leapDay, 'YEARLY');
      assert.strictEqual(nextYear.getUTCFullYear(), 2025);
      assert.strictEqual(nextYear.getUTCMonth(), 1);
      assert.strictEqual(nextYear.getUTCDate(), 28);
    });

    // 3. Billing Engine Idempotency & Concurrency Safety
    console.log('\n3. Testing Billing Engine Idempotency & Concurrency...');
    const plan = await prisma.plan.findFirst({ where: { is_active: true } });
    const product = await prisma.product.findFirst({ where: { is_active: true } });
    const pastDate = new Date(Date.now() - 5 * 86400000);

    const testSub = await prisma.subscription.create({
      data: {
        number: `SUB-TEST-IDEM-${Date.now()}`,
        customer_id: customerId,
        plan_id: plan.id,
        status: 'ACTIVE',
        start_date: pastDate,
        next_billing_date: pastDate,
        expiry_date: new Date(Date.now() + 180 * 86400000),
        payment_terms: 15,
        total_amount: 150.0,
        lines: {
          create: [
            {
              product_id: product.id,
              quantity: 1,
              unit_price: 150.0,
              subtotal: 150.0,
            },
          ],
        },
      },
    });

    await test('Billing engine single subscription billing creates invoice', async () => {
      const res = await processSingleSubscriptionBilling(testSub.id);
      assert.strictEqual(res.created, true, 'First billing must create an invoice');
      assert(res.invoiceId, 'Invoice ID returned');
    });

    await test('Billing engine second run on same period is skipped (Strict Idempotency)', async () => {
      // Intentionally keep next_billing_date at the same period to test idempotency
      await prisma.subscription.update({
        where: { id: testSub.id },
        data: { next_billing_date: pastDate },
      });
      const res = await processSingleSubscriptionBilling(testSub.id);
      assert.strictEqual(res.skipped, true, 'Second billing must skip due to unique constraint');
      assert.strictEqual(res.created, false);
    });

    await test('Concurrent billing runs: Promise.all creates zero duplicates', async () => {
      const subConcurrent = await prisma.subscription.create({
        data: {
          number: `SUB-CONCUR-${Date.now()}`,
          customer_id: customerId,
          plan_id: plan.id,
          status: 'ACTIVE',
          start_date: pastDate,
          next_billing_date: pastDate,
          expiry_date: new Date(Date.now() + 180 * 86400000),
          payment_terms: 15,
          total_amount: 100.0,
          lines: {
            create: [
              {
                product_id: product.id,
                quantity: 1,
                unit_price: 100.0,
                subtotal: 100.0,
              },
            ],
          },
        },
      });

      const [resA, resB] = await Promise.all([
        processSingleSubscriptionBilling(subConcurrent.id),
        processSingleSubscriptionBilling(subConcurrent.id),
      ]);

      const createdCount = (resA.created ? 1 : 0) + (resB.created ? 1 : 0);
      assert.strictEqual(createdCount, 1, 'Exactly one concurrent call must succeed, the other skipped');
    });

    // 4. Invoices & Payments Lifecycle
    console.log('\n4. Testing Invoices & Payments Full Lifecycle...');
    let testInvoice = await prisma.invoice.findFirst({
      where: { subscription_id: testSub.id },
      include: { lines: true, customer: true },
    });

    assert(testInvoice, 'Invoice exists for test subscription');
    const invoiceTotal = Number(testInvoice.total_amount);
    const halfPayment = Number((invoiceTotal / 2).toFixed(2));
    const remainingPayment = Number((invoiceTotal - halfPayment).toFixed(2));

    await test('Initial invoice status is DRAFT', () => {
      assert.strictEqual(testInvoice.status, 'DRAFT');
    });

    await test('Rejects payment on DRAFT invoice (must be CONFIRMED)', async () => {
      const res = await request(`/invoices/${testInvoice.id}/payments`, {
        method: 'POST',
        token: adminToken,
        body: { amount: halfPayment, payment_method: 'CARD' },
      });
      assert.strictEqual(res.status, 422);
    });

    await test('POST /invoices/:id/confirm transitions status from DRAFT to CONFIRMED', async () => {
      const res = await request(`/invoices/${testInvoice.id}/confirm`, {
        method: 'POST',
        token: adminToken,
      });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.status, 'CONFIRMED');
    });

    await test('GET /invoices/:id returns enriched amounts (amount_paid=0, amount_due=total)', async () => {
      const res = await request(`/invoices/${testInvoice.id}`, { token: adminToken });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(Number(res.data.data.amount_paid), 0);
      assert.strictEqual(Number(res.data.data.amount_due), invoiceTotal);
    });

    await test(`POST /invoices/:id/payments records partial payment ($${halfPayment})`, async () => {
      const res = await request(`/invoices/${testInvoice.id}/payments`, {
        method: 'POST',
        token: adminToken,
        body: {
          amount: halfPayment,
          payment_method: 'UPI',
          transaction_reference: 'UPI-REF-001',
        },
      });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(Number(res.data.data.payment.amount), halfPayment);
      assert.strictEqual(res.data.data.invoice.status, 'CONFIRMED');
    });

    await test('Enriched invoice reflects partial payment amounts', async () => {
      const res = await request(`/invoices/${testInvoice.id}`, { token: adminToken });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(Number(res.data.data.amount_paid), halfPayment);
      assert.strictEqual(Number(res.data.data.amount_due), remainingPayment);
    });

    await test('Rejects overpayment exceeding remaining balance', async () => {
      const res = await request(`/invoices/${testInvoice.id}/payments`, {
        method: 'POST',
        token: adminToken,
        body: {
          amount: remainingPayment + 50.0,
          payment_method: 'CARD',
        },
      });
      assert.strictEqual(res.status, 422, 'Must reject overpayment with 422');
    });

    await test(`Final payment ($${remainingPayment}) marks invoice status as PAID`, async () => {
      const res = await request(`/invoices/${testInvoice.id}/payments`, {
        method: 'POST',
        token: adminToken,
        body: {
          amount: remainingPayment,
          payment_method: 'CARD',
          transaction_reference: 'CARD-FINAL-99',
        },
      });
      assert.strictEqual(res.status, 201);
      assert.strictEqual(res.data.data.invoice.status, 'PAID');
    });

    await test('Rejects further payment on already settled PAID invoice', async () => {
      const res = await request(`/invoices/${testInvoice.id}/payments`, {
        method: 'POST',
        token: adminToken,
        body: {
          amount: 10.0,
          payment_method: 'CASH',
        },
      });
      assert(res.status === 400 || res.status === 422, 'Must reject payment on PAID invoice with 400/422');
    });

    await test('Cancelling an invoice that has payments recorded is rejected', async () => {
      const res = await request(`/invoices/${testInvoice.id}/cancel`, {
        method: 'POST',
        token: adminToken,
      });
      assert(res.status === 400 || res.status === 422, 'Must reject cancelling invoice with payments with 400/422');
    });

    // 5. Derived Overdue Logic
    console.log('\n5. Testing Dynamic Overdue Invoices Calculations...');
    await test('Invoice with past due_date and unpaid balance has is_overdue: true', async () => {
      const overdueInv = await prisma.invoice.create({
        data: {
          number: `INV-OVERDUE-TEST-${Date.now()}`,
          subscription_id: testSub.id,
          customer_id: customerId,
          period_start: new Date(Date.now() - 40 * 86400000),
          period_end: new Date(Date.now() - 10 * 86400000),
          due_date: new Date(Date.now() - 5 * 86400000),
          subtotal: 80.0,
          tax_amount: 0,
          discount_amount: 0,
          total_amount: 80.0,
          status: 'CONFIRMED',
        },
      });

      const res = await request(`/invoices/${overdueInv.id}`, { token: adminToken });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.is_overdue, true);
    });

    await test('Paid invoice with past due_date has is_overdue: false', async () => {
      const paidInv = await prisma.invoice.create({
        data: {
          number: `INV-PAID-TEST-${Date.now()}`,
          subscription_id: testSub.id,
          customer_id: customerId,
          period_start: new Date(Date.now() - 40 * 86400000),
          period_end: new Date(Date.now() - 10 * 86400000),
          due_date: new Date(Date.now() - 5 * 86400000),
          subtotal: 80.0,
          tax_amount: 0,
          discount_amount: 0,
          total_amount: 80.0,
          status: 'PAID',
        },
      });

      const res = await request(`/invoices/${paidInv.id}`, { token: adminToken });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.data.is_overdue, false);
    });

    // 6. Customer Portal Ownership Isolation
    console.log('\n6. Testing Customer Portal Data Isolation...');
    await test('Customer GET /me/invoices returns only their own invoices', async () => {
      const res = await request('/me/invoices', { token: customerToken });
      assert.strictEqual(res.status, 200);
      assert(Array.isArray(res.data.data));
      for (const inv of res.data.data) {
        assert.strictEqual(inv.customer_id, customerId, 'Every returned invoice must match logged-in customer');
      }
    });

    await test('Customer GET /invoices (staff endpoint) returns 403 Forbidden', async () => {
      const res = await request('/invoices', { token: customerToken });
      assert.strictEqual(res.status, 403);
    });

    // 7. PDF Generation Endpoint
    console.log('\n7. Testing PDF Generation Endpoint...');
    await test('GET /invoices/:id/pdf streams application/pdf buffer', async () => {
      const res = await request(`/invoices/${testInvoice.id}/pdf`, { token: adminToken });
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.headers['content-type'], 'application/pdf');
      assert(res.raw.startsWith('%PDF'), 'Output must be a valid PDF buffer');
    });

    // 8. Performance Benchmarking with 5,000 Subscriptions
    console.log('\n8. Performance Benchmarking (> 5,000 subscriptions in DB)...');
    const totalSubs = await prisma.subscription.count();
    const totalInvs = await prisma.invoice.count();
    console.log(`   Database dataset size: ${totalSubs} Subscriptions, ${totalInvs} Invoices.`);

    const benchmarks = [
      { name: 'GET /subscriptions (page 1, 10 items)', path: '/subscriptions?page=1&limit=10' },
      { name: 'GET /subscriptions (search filter)', path: '/subscriptions?search=Enterprise' },
      { name: 'GET /invoices (page 1, 10 items)', path: '/invoices?page=1&limit=10' },
      { name: 'GET /invoices?is_overdue=true (derived overdue filter)', path: '/invoices?is_overdue=true' },
      { name: 'GET /payments (page 1, 10 items)', path: '/payments?page=1&limit=10' },
      { name: 'GET /analytics/overview (complex SQL aggregates)', path: '/analytics/overview?period=30d' },
      { name: 'GET /analytics/revenue (trend & method distribution)', path: '/analytics/revenue?period=30d' },
    ];

    for (const bm of benchmarks) {
      await test(`${bm.name} responds in < 2,000ms`, async () => {
        const start = performance.now();
        const res = await request(bm.path, { token: adminToken });
        const duration = Math.round(performance.now() - start);
        assert.strictEqual(res.status, 200);
        assert(duration < 2000, `Duration ${duration}ms exceeds 2000ms limit`);
        console.log(`     ⏱️  Measured latency: ${duration}ms`);
      });
    }

  } finally {
    if (server) {
      await new Promise((resolve) => server.close(resolve));
    }
    await prisma.$disconnect();
  }

  console.log('\n======================================================================');
  console.log(`📊 CORE TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================================');

  if (failed > 0) process.exit(1);
}

runCoreTests().catch((err) => {
  console.error('Fatal test runner error:', err);
  process.exit(1);
});
