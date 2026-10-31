import app from './src/app.js';
import prisma from './src/database/prisma.js';

let server;
const PORT = 5098;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

async function runSubscriptionTests() {
  console.log('==================================================');
  console.log('🧪 RUNNING CUSTOMERS & SUBSCRIPTIONS TEST SUITE');
  console.log('==================================================\n');

  server = app.listen(PORT);
  let passed = 0;
  let failed = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // Logins
    const adminLogin = await (
      await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'admin@brightloop.com', password: 'AdminPassword123!' }),
      })
    ).json();
    const adminToken = adminLogin.token;

    const staffLogin = await (
      await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'staff@brightloop.com', password: 'StaffPassword123!' }),
      })
    ).json();
    const staffToken = staffLogin.token;

    const customerLogin = await (
      await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'customer@brightloop.com', password: 'CustomerPassword123!' }),
      })
    ).json();
    const customerToken = customerLogin.token;
    const customerId = customerLogin.user.customer_id;

    // Load sample products and plans
    const productsRes = await (
      await fetch(`${BASE_URL}/products`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    ).json();
    const testProduct = productsRes.data[0];
    const testVariant = testProduct.variants?.[0];

    const plansRes = await (
      await fetch(`${BASE_URL}/plans`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      })
    ).json();
    const standardPlan = plansRes.data.find((p) => p.name === 'Standard Cloud Monthly');
    const enterprisePlan = plansRes.data.find((p) => p.name === 'Enterprise Bulk Yearly');
    const fixedTermPlan = plansRes.data.find((p) => p.name === 'Fixed Term Legacy Plan');

    // 1. CUSTOMERS CRUD
    console.log('1. Testing Customers Endpoints (/api/v1/customers)...');

    // Create Customer
    const createCustRes = await fetch(`${BASE_URL}/customers`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        name: 'Globex Corporation',
        email: 'billing@globex.test',
        phone: '9876543210',
        company: 'Globex Corp',
        city: 'Metropolis',
        country: 'USA',
      }),
    });
    const createCustJson = await createCustRes.json();
    assert(createCustRes.status === 201, 'Staff can create new customer (201)');
    const globexId = createCustJson.data.id;

    // List Customers with Search & Pagination
    const listCustRes = await fetch(`${BASE_URL}/customers?search=Globex`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const listCustJson = await listCustRes.json();
    assert(
      listCustRes.status === 200 && listCustJson.data.length >= 1,
      'List customers with search filter returns created customer'
    );

    // Edit Customer
    const editCustRes = await fetch(`${BASE_URL}/customers/${globexId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        company: 'Globex Industries Inc',
      }),
    });
    const editCustJson = await editCustRes.json();
    assert(editCustRes.status === 200, 'Customer details updated successfully (200)');
    assert(editCustJson.data.company === 'Globex Industries Inc', 'Updated customer company name saved');

    // Customer Detail
    const detailCustRes = await fetch(`${BASE_URL}/customers/${globexId}`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(detailCustRes.status === 200, 'Staff can fetch customer detail (200)');

    // 2. SUBSCRIPTION CREATION & VALIDATION
    console.log('\n2. Testing Subscription Creation, Auto Numbering & Validations...');

    // A) Validation: Expiry date before or equal to start date
    const invalidDateRes = await fetch(`${BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        customer_id: globexId,
        plan_id: standardPlan.id,
        start_date: '2026-11-01',
        expiry_date: '2026-10-15', // Past start date
        lines: [{ product_id: testProduct.id, quantity: 1 }],
      }),
    });
    assert(invalidDateRes.status === 422, 'Rejects subscription with expiry_date before start_date (422)');

    // B) Validation: Quantity < plan.min_quantity (EnterpriseBulkYearly requires 5)
    const minQtyFailRes = await fetch(`${BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        customer_id: globexId,
        plan_id: enterprisePlan.id,
        start_date: '2026-11-01',
        lines: [{ product_id: testProduct.id, quantity: 2 }], // Only 2 < 5
      }),
    });
    assert(minQtyFailRes.status === 422, 'Rejects subscription when quantity < plan.min_quantity (422)');

    // C) Valid Creation + Server Unit Price Calculation + Auto Numbering (SUB-000001)
    const validSubRes = await fetch(`${BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        customer_id: customerId, // Acme Client
        plan_id: standardPlan.id,
        start_date: '2026-11-01',
        lines: [
          {
            product_id: testProduct.id,
            variant_id: testVariant ? testVariant.id : undefined,
            quantity: 2,
            // Notice: client tries to pass fake low price, which backend MUST ignore!
            unit_price: 1.0,
          },
        ],
      }),
    });
    const validSubJson = await validSubRes.json();
    assert(validSubRes.status === 201, 'Creates subscription successfully (201)');

    const sub1 = validSubJson.data;
    assert(sub1.number.startsWith('SUB-'), `Auto number generated in correct format: ${sub1.number}`);
    assert(sub1.status === 'DRAFT', 'Initial status is DRAFT');

    const expectedUnitPrice = Number(testProduct.sales_price) + (testVariant ? Number(testVariant.extra_price) : 0);
    const expectedSubtotal = expectedUnitPrice * 2;
    const resolvedLine = sub1.lines[0];

    assert(
      Number(resolvedLine.unit_price) === expectedUnitPrice,
      `Backend correctly resolves unit price (${Number(resolvedLine.unit_price)} === ${expectedUnitPrice}) ignoring client price`
    );
    assert(
      Number(sub1.total_amount) === expectedSubtotal,
      `Backend calculates total amount correctly ($${Number(sub1.total_amount)} == $${expectedSubtotal})`
    );

    // Sequence safety check: create 2nd subscription
    const sub2Res = await fetch(`${BASE_URL}/subscriptions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        customer_id: globexId,
        plan_id: standardPlan.id,
        start_date: '2026-11-01',
        lines: [{ product_id: testProduct.id, quantity: 1 }],
      }),
    });
    const sub2Json = await sub2Res.json();
    const num1 = parseInt(sub1.number.replace('SUB-', ''), 10);
    const num2 = parseInt(sub2Json.data.number.replace('SUB-', ''), 10);
    assert(num2 === num1 + 1, `Auto number is sequence safe: ${sub1.number} -> ${sub2Json.data.number}`);

    // 3. STATUS TRANSITIONS & AUDIT LOGGING
    console.log('\n3. Testing Status Machine & Transition Logs...');

    // A) Illegal Transition (DRAFT -> ACTIVE directly)
    const illegalTransitionRes = await fetch(`${BASE_URL}/subscriptions/${sub1.id}/activate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(illegalTransitionRes.status === 400, 'Rejects illegal transition DRAFT -> ACTIVE with 400 Bad Request');

    // B) DRAFT -> QUOTATION (/quote)
    const quoteRes = await fetch(`${BASE_URL}/subscriptions/${sub1.id}/quote`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({ reason: 'Client requested price quotation' }),
    });
    const quoteJson = await quoteRes.json();
    assert(quoteRes.status === 200, 'POST /quote succeeds (200)');
    assert(quoteJson.data.status === 'QUOTATION', 'Status transitioned to QUOTATION');
    assert(!!quoteJson.data.quotation_valid_until, 'Sets quotation_valid_until timestamp');

    // C) QUOTATION -> CONFIRMED (/confirm)
    const confirmRes = await fetch(`${BASE_URL}/subscriptions/${sub1.id}/confirm`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({ reason: 'Client approved proposal' }),
    });
    const confirmJson = await confirmRes.json();
    assert(confirmRes.status === 200, 'POST /confirm succeeds (200)');
    assert(confirmJson.data.status === 'CONFIRMED', 'Status transitioned to CONFIRMED');

    // D) CONFIRMED -> ACTIVE (/activate)
    const activateRes = await fetch(`${BASE_URL}/subscriptions/${sub1.id}/activate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({ reason: 'Initial payment received' }),
    });
    const activateJson = await activateRes.json();
    assert(activateRes.status === 200, 'POST /activate succeeds (200)');
    assert(activateJson.data.status === 'ACTIVE', 'Status transitioned to ACTIVE');
    assert(
      !!activateJson.data.next_billing_date,
      'On activate sets next_billing_date to start_date'
    );

    // E) History Log Verification
    const historyRes = await fetch(`${BASE_URL}/subscriptions/${sub1.id}/history`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const historyJson = await historyRes.json();
    assert(historyRes.status === 200, 'GET /subscriptions/:id/history succeeds (200)');
    assert(historyJson.data.length >= 4, 'Audit logs recorded for every status transition');
    assert(historyJson.data[0].changed_by === 'staff@brightloop.com', 'Audit log records user actor email');

    // 4. PLAN PERMISSION FLAGS (/pause, /resume, /renew, /close)
    console.log('\n4. Testing Plan Permission Action Flags...');

    // A) Standard plan allows pause & resume
    const pauseRes = await fetch(`${BASE_URL}/subscriptions/${sub1.id}/pause`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const pauseJson = await pauseRes.json();
    assert(pauseRes.status === 200 && pauseJson.data.is_paused === true, 'Pause succeeds when plan.pausable is true');

    const resumeRes = await fetch(`${BASE_URL}/subscriptions/${sub1.id}/resume`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const resumeJson = await resumeRes.json();
    assert(resumeRes.status === 200 && resumeJson.data.is_paused === false, 'Resume succeeds when plan.pausable is true');

    // B) Standard plan allows renew
    const oldExpiry = sub1.expiry_date;
    const renewRes = await fetch(`${BASE_URL}/subscriptions/${sub1.id}/renew`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const renewJson = await renewRes.json();
    assert(renewRes.status === 200, 'Renew succeeds when plan.renewable is true');
    assert(
      new Date(renewJson.data.expiry_date) > new Date(oldExpiry),
      'Renew extends subscription expiry date by one billing period'
    );

    // C) Test Non-Pausable / Non-Closable / Non-Renewable Plan Constraints
    // Create an active subscription with fixedTermPlan (pausable: false, closable: false, renewable: false)
    const strictSubCreate = await (
      await fetch(`${BASE_URL}/subscriptions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${adminToken}`,
        },
        body: JSON.stringify({
          customer_id: globexId,
          plan_id: fixedTermPlan.id,
          start_date: '2026-11-01',
          lines: [{ product_id: testProduct.id, quantity: 1 }],
        }),
      })
    ).json();
    const strictSubId = strictSubCreate.data.id;

    // Transition strict subscription to ACTIVE:
    await fetch(`${BASE_URL}/subscriptions/${strictSubId}/quote`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    await fetch(`${BASE_URL}/subscriptions/${strictSubId}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    await fetch(`${BASE_URL}/subscriptions/${strictSubId}/activate`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });

    // Test pause forbidden on strict plan
    const pauseStrictRes = await fetch(`${BASE_URL}/subscriptions/${strictSubId}/pause`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      pauseStrictRes.status === 403,
      'POST /pause returns 403 Forbidden when plan.pausable is false'
    );

    // Test early close forbidden on strict plan
    const closeStrictRes = await fetch(`${BASE_URL}/subscriptions/${strictSubId}/close`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      closeStrictRes.status === 403,
      'POST /close returns 403 Forbidden when plan.closable is false'
    );

    // Test renew forbidden on strict plan
    const renewStrictRes = await fetch(`${BASE_URL}/subscriptions/${strictSubId}/renew`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(
      renewStrictRes.status === 403,
      'POST /renew returns 403 Forbidden when plan.renewable is false'
    );

    // D) Standard subscription close
    const closeRes = await fetch(`${BASE_URL}/subscriptions/${sub1.id}/close`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const closeJson = await closeRes.json();
    assert(closeRes.status === 200 && closeJson.data.status === 'CLOSED', 'Close succeeds on closable plan');

    // 5. CUSTOMER PORTAL & OWNERSHIP CHECK (/me/subscriptions)
    console.log('\n5. Testing /me/subscriptions & Ownership Isolation...');

    const meSubRes = await fetch(`${BASE_URL}/me/subscriptions`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    const meSubJson = await meSubRes.json();
    assert(meSubRes.status === 200, 'GET /me/subscriptions returns 200 OK');
    assert(
      meSubJson.data.every((s) => s.customer_id === customerId),
      'Customer only receives subscriptions belonging to their linked customer record'
    );

    // Customer attempt to view globex subscription detail
    const customerViewOtherRes = await fetch(`${BASE_URL}/subscriptions/${sub2Json.data.id}`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(
      customerViewOtherRes.status === 403,
      'Customer viewing another customer subscription returns 403 Forbidden'
    );

    console.log('\n==================================================');
    console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================\n');

    if (failed > 0) process.exit(1);
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runSubscriptionTests();
