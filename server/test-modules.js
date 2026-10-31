import app from './src/app.js';
import prisma from './src/database/prisma.js';
import {
  getEligibleDiscounts,
  calculateDiscountAmount,
  calculateTax,
  calculateInvoiceTotals,
  toDecimal,
} from './src/services/pricingRules.js';

let server;
const PORT = 5098;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

async function runTests() {
  console.log('======================================================================');
  console.log('🧪 RUNNING PLANS, TAXES, DISCOUNTS & PRICING RULES TEST SUITE');
  console.log('======================================================================\n');

  server = app.listen(PORT);
  let failed = 0;
  let passed = 0;

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
    // -------------------------------------------------------------
    // 1. AUTH SETUP FOR TESTS
    // -------------------------------------------------------------
    console.log('1. Setting up tokens (Admin, Staff, Customer)...');
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@brightloop.com', password: 'AdminPassword123!' }),
    });
    const { token: adminToken } = await adminLoginRes.json();

    const staffLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'staff@brightloop.com', password: 'StaffPassword123!' }),
    });
    const { token: staffToken } = await staffLoginRes.json();

    const custLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'customer@brightloop.com', password: 'CustomerPassword123!' }),
    });
    const { token: custToken } = await custLoginRes.json();

    assert(Boolean(adminToken && staffToken && custToken), 'Acquired JWT tokens for Admin, Staff, and Customer');

    // -------------------------------------------------------------
    // 2. PLANS MODULE TESTS
    // -------------------------------------------------------------
    console.log('\n2. Testing Plans Module (CRUD, Window, Validation, RBAC)...');

    // RBAC: Customer cannot list plans
    const custPlanList = await fetch(`${BASE_URL}/plans`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    assert(custPlanList.status === 403, 'Customer cannot access /plans (403)');

    // RBAC: Staff can view plans
    const staffPlanList = await fetch(`${BASE_URL}/plans`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(staffPlanList.status === 200, 'Staff can access GET /plans (200)');

    // RBAC: Staff cannot create plans
    const staffCreatePlan = await fetch(`${BASE_URL}/plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({ name: 'Staff Plan', billing_period: 'MONTHLY', price: 10 }),
    });
    assert(staffCreatePlan.status === 403, 'Staff cannot create plans (403)');

    // Validation: Negative price rejected
    const negPricePlan = await fetch(`${BASE_URL}/plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'Neg Plan', billing_period: 'MONTHLY', price: -5 }),
    });
    assert(negPricePlan.status === 422, 'Rejects plan with negative price (422)');

    // Validation: Invalid date window (available_to before available_from)
    const invalidWindowPlan = await fetch(`${BASE_URL}/plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Invalid Window Plan',
        billing_period: 'MONTHLY',
        price: 29.99,
        available_from: '2026-12-01T00:00:00Z',
        available_to: '2026-11-01T00:00:00Z',
      }),
    });
    assert(invalidWindowPlan.status === 422, 'Rejects plan where available_to < available_from (422)');

    // Create valid active plan inside today's window
    const now = Date.now();
    const createPlanRes = await fetch(`${BASE_URL}/plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Pro Cloud Monthly',
        description: 'Standard recurring monthly plan',
        billing_period: 'MONTHLY',
        price: 49.0,
        min_quantity: 1,
        available_from: new Date(now - 86400000).toISOString(),
        available_to: new Date(now + 86400000 * 30).toISOString(),
        pausable: true,
        closable: true,
        renewable: true,
        is_active: true,
      }),
    });
    const createdPlan = await createPlanRes.json();
    assert(createPlanRes.status === 201 && createdPlan.data?.name === 'Pro Cloud Monthly', 'Admin creates plan (201)');
    const planId = createdPlan.data?.id;

    // Create an expired plan (past window)
    const createExpiredPlan = await fetch(`${BASE_URL}/plans`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        name: 'Old Legacy Plan',
        billing_period: 'YEARLY',
        price: 99.0,
        available_from: new Date(now - 86400000 * 60).toISOString(),
        available_to: new Date(now - 86400000 * 30).toISOString(),
        is_active: true,
      }),
    });
    const expiredPlan = await createExpiredPlan.json();
    const expiredPlanId = expiredPlan.data?.id;

    // Plan window test: GET /plans/available includes active window plan, excludes expired plan
    const availPlansRes = await fetch(`${BASE_URL}/plans/available`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const availPlans = await availPlansRes.json();
    assert(availPlansRes.status === 200, 'GET /plans/available returns 200');
    assert(
      availPlans.data?.some((p) => p.id === planId),
      'GET /plans/available includes active plan within current window'
    );
    assert(
      !availPlans.data?.some((p) => p.id === expiredPlanId),
      'GET /plans/available excludes plan outside current window'
    );

    // Toggle active status
    const togglePlanRes = await fetch(`${BASE_URL}/plans/${planId}/toggle`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const toggledPlan = await togglePlanRes.json();
    assert(togglePlanRes.status === 200 && toggledPlan.data?.is_active === false, 'Toggling plan sets is_active to false');

    // Update plan
    const updatePlanRes = await fetch(`${BASE_URL}/plans/${planId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ price: 59.0, is_active: true }),
    });
    const updatedPlan = await updatePlanRes.json();
    assert(updatePlanRes.status === 200 && updatedPlan.data?.price === 59, 'Admin updates plan price (200)');

    // Clean up expired plan
    const deleteExpPlan = await fetch(`${BASE_URL}/plans/${expiredPlanId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(deleteExpPlan.status === 200, 'Admin can delete plan (200)');

    // -------------------------------------------------------------
    // 3. TAXES MODULE TESTS
    // -------------------------------------------------------------
    console.log('\n3. Testing Taxes Module (CRUD, 0-100% Boundary, RBAC)...');

    // RBAC: Customer cannot access /taxes
    const custTaxList = await fetch(`${BASE_URL}/taxes`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    assert(custTaxList.status === 403, 'Customer cannot access /taxes (403)');

    // RBAC: Staff can view taxes
    const staffTaxList = await fetch(`${BASE_URL}/taxes`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(staffTaxList.status === 200, 'Staff can view /taxes (200)');

    // RBAC: Staff cannot create tax
    const staffCreateTax = await fetch(`${BASE_URL}/taxes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${staffToken}` },
      body: JSON.stringify({ name: 'Staff Tax', rate_percent: 5 }),
    });
    assert(staffCreateTax.status === 403, 'Staff cannot create taxes (403)');

    // Boundary: Negative rate rejected
    const negTaxRes = await fetch(`${BASE_URL}/taxes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'Negative Tax', rate_percent: -1 }),
    });
    assert(negTaxRes.status === 422, 'Rejects tax rate < 0% (422)');

    // Boundary: Over 100% rate rejected
    const overTaxRes = await fetch(`${BASE_URL}/taxes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'Over 100 Tax', rate_percent: 100.5 }),
    });
    assert(overTaxRes.status === 422, 'Rejects tax rate > 100% (422)');

    // Boundary: Exactly 0% accepted
    const zeroTaxRes = await fetch(`${BASE_URL}/taxes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'Zero Tax Export', rate_percent: 0 }),
    });
    assert(zeroTaxRes.status === 201, 'Accepts 0% tax rate boundary (201)');
    const zeroTax = await zeroTaxRes.json();

    // Boundary: Exactly 100% accepted
    const hundredTaxRes = await fetch(`${BASE_URL}/taxes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'Max 100 Tax', rate_percent: 100 }),
    });
    assert(hundredTaxRes.status === 201, 'Accepts 100% tax rate boundary (201)');
    const hundredTax = await hundredTaxRes.json();

    // Create standard 18% tax
    const standardTaxRes = await fetch(`${BASE_URL}/taxes`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ name: 'Standard GST', rate_percent: 18.0 }),
    });
    const standardTax = await standardTaxRes.json();
    assert(standardTaxRes.status === 201 && standardTax.data?.rate_percent === 18, 'Admin creates 18% GST (201)');
    const taxId = standardTax.data?.id;

    // Update tax
    const updateTaxRes = await fetch(`${BASE_URL}/taxes/${taxId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ rate_percent: 18.5 }),
    });
    const updatedTax = await updateTaxRes.json();
    assert(updateTaxRes.status === 200 && updatedTax.data?.rate_percent === 18.5, 'Admin updates tax rate to 18.5% (200)');

    // Clean up boundary test taxes
    await fetch(`${BASE_URL}/taxes/${zeroTax.data?.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${adminToken}` } });
    await fetch(`${BASE_URL}/taxes/${hundredTax.data?.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${adminToken}` } });

    // -------------------------------------------------------------
    // 4. DISCOUNTS MODULE TESTS
    // -------------------------------------------------------------
    console.log('\n4. Testing Discounts Module (Admin-Only, Fixed/Percent, Usage Limits, Expiry, Scope)...');

    // RBAC: Customer and Staff forbidden from discounts
    const custDiscount = await fetch(`${BASE_URL}/discounts`, {
      headers: { Authorization: `Bearer ${custToken}` },
    });
    assert(custDiscount.status === 403, 'Customer cannot access /discounts (403)');

    const staffDiscount = await fetch(`${BASE_URL}/discounts`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    assert(staffDiscount.status === 403, 'Staff cannot access /discounts (admin-only) (403)');

    // Validation: Percentage > 100 rejected
    const overPercent = await fetch(`${BASE_URL}/discounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ code: 'OVER100', type: 'PERCENTAGE', value: 120 }),
    });
    assert(overPercent.status === 422, 'Rejects percentage discount > 100% (422)');

    // Validation: End date < Start date rejected
    const badDateDisc = await fetch(`${BASE_URL}/discounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        code: 'BADDATE',
        type: 'PERCENTAGE',
        value: 10,
        start_date: '2026-10-15',
        end_date: '2026-10-10',
      }),
    });
    assert(badDateDisc.status === 422, 'Rejects discount where end_date < start_date (422)');

    // Create Percentage Discount with scope & min requirements
    const testCodePercent = `PERC_${Date.now()}`;
    const percDiscRes = await fetch(`${BASE_URL}/discounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        code: testCodePercent,
        type: 'PERCENTAGE',
        value: 15,
        min_purchase: 50,
        min_quantity: 2,
        scope: 'PRODUCT',
        usage_limit: 100,
        is_active: true,
      }),
    });
    const percDisc = await percDiscRes.json();
    assert(percDiscRes.status === 201 && percDisc.data?.value === 15, 'Admin creates 15% Product Discount (201)');

    // Create Fixed Discount
    const testCodeFixed = `FIXED_${Date.now()}`;
    const fixedDiscRes = await fetch(`${BASE_URL}/discounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        code: testCodeFixed,
        type: 'FIXED',
        value: 25.0,
        scope: 'SUBSCRIPTION',
        is_active: true,
      }),
    });
    const fixedDisc = await fixedDiscRes.json();
    assert(fixedDiscRes.status === 201 && fixedDisc.data?.value === 25, 'Admin creates $25 Fixed Discount (201)');

    // Duplicate code rejected (409)
    const dupDiscRes = await fetch(`${BASE_URL}/discounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({ code: testCodeFixed, type: 'FIXED', value: 10 }),
    });
    assert(dupDiscRes.status === 409, 'Duplicate discount code returns 409 Conflict');

    // Expiry check flag in formatDiscount
    const expiredCode = `EXPIRED_${Date.now()}`;
    const expDiscRes = await fetch(`${BASE_URL}/discounts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        code: expiredCode,
        type: 'FIXED',
        value: 10,
        expires_at: new Date(now - 86400000).toISOString(),
        is_active: true,
      }),
    });
    const expDisc = await expDiscRes.json();
    assert(expDisc.data?.is_expired === true, 'Discount past expires_at is flagged is_expired = true');

    // -------------------------------------------------------------
    // 5. PRICING RULES SERVICE UNIT TESTS
    // -------------------------------------------------------------
    console.log('\n5. Testing Pricing Rules Service (Discount-First, Precision, Tax Rounding, Totals)...');

    // Test: Eligible discounts filtering
    const eligibleList = getEligibleDiscounts(
      [
        { code: 'D1', is_active: false, value: 10, type: 'PERCENTAGE' }, // Inactive
        { code: 'D2', is_active: true, value: 10, type: 'PERCENTAGE', expires_at: new Date(now - 1000) }, // Expired
        { code: 'D3', is_active: true, value: 10, type: 'PERCENTAGE', max_redemptions: 5, redemptions_count: 5 }, // Limit reached
        { code: 'D4', is_active: true, value: 10, type: 'PERCENTAGE', min_purchase: 200 }, // Subtotal too low ($100 < $200)
        { code: 'D5', is_active: true, value: 10, type: 'PERCENTAGE', min_quantity: 3 }, // Quantity too low (2 < 3)
        { code: 'D6', is_active: true, value: 10, type: 'PERCENTAGE', scope: 'PRODUCT' }, // Product scope but no product IDs
        { code: 'D7', is_active: true, value: 20, type: 'PERCENTAGE', min_purchase: 50, scope: 'SUBSCRIPTION' }, // Valid!
      ],
      { subtotal: 100, quantity: 2, product_ids: [] }
    );
    assert(eligibleList.length === 1 && eligibleList[0].code === 'D7', 'Filters eligible discounts rejecting inactive, expired, limit-reached, min purchase, and scope');

    // Test: Percentage discount calculation
    const percCalc = calculateDiscountAmount({ type: 'PERCENTAGE', value: 15 }, 100);
    assert(percCalc.toString() === '15', '15% discount on $100 = $15.00');

    // Test: Fixed discount calculation
    const fixedCalc = calculateDiscountAmount({ type: 'FIXED', value: 25 }, 100);
    assert(fixedCalc.toString() === '25', '$25 fixed discount on $100 = $25.00');

    // Test: Discount capped at subtotal (cannot exceed subtotal)
    const capCalc = calculateDiscountAmount({ type: 'FIXED', value: 150 }, 100);
    assert(capCalc.toString() === '100', 'Discount capped at subtotal ($150 discount on $100 = $100.00)');

    // Test: Tax calculation with rounding (e.g. 18.5% on $85.33 = $15.78605 -> rounds to $15.79)
    const roundedTax = calculateTax('85.33', '18.5');
    assert(roundedTax.toString() === '15.79', 'Tax precision rounded correctly to 2 decimals (18.5% on $85.33 = $15.79)');

    // Test: Discount applied FIRST, then tax applied on discounted subtotal
    // Example: Subtotal = $200, Discount = 10% ($20) -> Discounted = $180 -> Tax = 10% on $180 = $18 -> Total = $198
    const invoiceTotals = calculateInvoiceTotals({
      lineItems: [
        { unit_price: '50.00', quantity: 2 }, // $100.00
        { unit_price: '25.00', quantity: 4 }, // $100.00
      ], // Subtotal = $200.00
      discount: { type: 'PERCENTAGE', value: 10 }, // 10% off -> $20.00 discount -> $180.00 base
      tax: { rate: 10.0 }, // 10% tax on $180.00 = $18.00
    });
    assert(invoiceTotals.subtotal === 200, 'Invoice subtotal is accurately $200.00');
    assert(invoiceTotals.discount_amount === 20, 'Discount applied first ($20.00)');
    assert(invoiceTotals.discounted_subtotal === 180, 'Discounted base is $180.00');
    assert(invoiceTotals.tax_amount === 18, 'Tax calculated on discounted base ($18.00, not $20.00)');
    assert(invoiceTotals.total_amount === 198, 'Final total is accurately $198.00');

    console.log('\n======================================================================');
    console.log(`📊 TEST SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('======================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Unexpected error in test runner:', err);
    process.exit(1);
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runTests();

