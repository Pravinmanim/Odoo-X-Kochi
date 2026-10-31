import 'dotenv/config';
import http from 'http';
import app from './src/app.js';

let server;
let baseUrl;

function startServer() {
  return new Promise((resolve) => {
    server = http.createServer(app);
    server.listen(0, () => {
      const port = server.address().port;
      baseUrl = `http://localhost:${port}/api/v1`;
      resolve();
    });
  });
}

function stopServer() {
  return new Promise((resolve) => {
    server.close(resolve);
  });
}

async function request(endpoint, options = {}) {
  const url = `${baseUrl}${endpoint}`;
  const headers = { ...options.headers };
  if (options.token) {
    headers['Authorization'] = `Bearer ${options.token}`;
  }
  if (options.body && typeof options.body === 'object' && !(options.body instanceof String)) {
    headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(options.body);
  }

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body: options.body,
  });

  const contentType = res.headers.get('content-type') || '';
  let data;
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  return {
    status: res.status,
    headers: res.headers,
    data,
  };
}

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

async function runAnalyticsTests() {
  console.log('==================================================');
  console.log('🧪 RUNNING REPORTS & ANALYTICS TEST SUITE');
  console.log('==================================================\n');

  await startServer();

  try {
    // 1. Authenticate users
    const adminRes = await request('/auth/login', {
      method: 'POST',
      body: { email: 'admin@brightloop.com', password: 'AdminPassword123!' },
    });
    const adminToken = adminRes.data?.token;

    const staffRes = await request('/auth/login', {
      method: 'POST',
      body: { email: 'staff@brightloop.com', password: 'StaffPassword123!' },
    });
    const staffToken = staffRes.data?.token;

    const customerRes = await request('/auth/login', {
      method: 'POST',
      body: { email: 'customer@brightloop.com', password: 'CustomerPassword123!' },
    });
    const customerToken = customerRes.data?.token;

    assert(adminToken, 'Admin logged in successfully');
    assert(staffToken, 'Staff logged in successfully');
    assert(customerToken, 'Customer logged in successfully');

    // 2. Test RBAC Security on Analytics Endpoints
    console.log('\n1. Testing RBAC Security...');
    const unauthRes = await request('/analytics/overview');
    assert(unauthRes.status === 401, 'Unauthenticated request returns 401 Unauthorized');

    const customerOverviewRes = await request('/analytics/overview', { token: customerToken });
    assert(customerOverviewRes.status === 403, 'Customer role accessing /analytics/overview returns 403 Forbidden');

    const customerReportRes = await request('/analytics/reports/export?reportType=revenue', { token: customerToken });
    assert(customerReportRes.status === 403, 'Customer role accessing /analytics/reports returns 403 Forbidden');

    const staffOverviewRes = await request('/analytics/overview', { token: staffToken });
    assert(staffOverviewRes.status === 200, 'Staff role can access /analytics/overview (200)');

    const adminOverviewRes = await request('/analytics/overview', { token: adminToken });
    assert(adminOverviewRes.status === 200, 'Admin role can access /analytics/overview (200)');

    // 3. Test Overview Metrics Data & Calculations
    console.log('\n2. Testing Overview Metrics...');
    const overview = adminOverviewRes.data.data;
    assert(overview.metrics.totalCustomers >= 4, `Total customers calculated from DB (Count: ${overview.metrics.totalCustomers})`);
    assert(overview.metrics.activeSubscriptions >= 3, `Active subscriptions count matches DB records (Count: ${overview.metrics.activeSubscriptions})`);
    assert(overview.metrics.totalRevenue > 0, `Total all-time revenue aggregated ($${overview.metrics.totalRevenue})`);
    assert(overview.metrics.mrr > 0, `Monthly Recurring Revenue (MRR) computed ($${overview.metrics.mrr})`);
    assert(overview.metrics.arr === Number((overview.metrics.mrr * 12).toFixed(2)), `ARR equals MRR * 12 ($${overview.metrics.arr})`);
    assert(overview.metrics.pendingPayments.amount > 0, `Pending payments tracked ($${overview.metrics.pendingPayments.amount})`);
    assert(overview.metrics.overdueInvoices.amount > 0, `Overdue invoices tracked ($${overview.metrics.overdueInvoices.amount})`);
    assert(typeof overview.metrics.churnRate === 'number', `Churn rate calculated as percentage (${overview.metrics.churnRate}%)`);

    // 4. Test Date Filtering on Overview
    console.log('\n3. Testing Overview Date Filtering...');
    const filters = ['today', '7d', '30d', 'this_month', 'last_month', 'this_year'];
    for (const period of filters) {
      const res = await request(`/analytics/overview?period=${period}`, { token: adminToken });
      assert(res.status === 200 && res.data.data.period === period, `Period filter '${period}' resolves properly`);
    }

    const customRes = await request('/analytics/overview?period=custom&startDate=2026-01-01&endDate=2026-12-31', { token: adminToken });
    assert(customRes.status === 200 && customRes.data.data.dateRange.start.startsWith('2026-01-01'), 'Custom date range filter executes properly');

    // 5. Test Revenue Analytics
    console.log('\n4. Testing Revenue Analytics...');
    const revRes = await request('/analytics/revenue?period=30d', { token: adminToken });
    assert(revRes.status === 200, 'GET /analytics/revenue succeeds (200)');
    const revData = revRes.data.data;
    assert(Array.isArray(revData.revenueTrend), 'Revenue trend timeline returned');
    assert(Array.isArray(revData.revenueByPlan), 'Revenue by subscription plan returned');
    assert(revData.revenueByPlan.length > 0, `Revenue by plan contains data (${revData.revenueByPlan.map(p => p.planName).join(', ')})`);
    assert(Array.isArray(revData.revenueByPaymentMethod), 'Revenue by payment method returned');
    assert(revData.revenueByPaymentMethod.some(m => m.method === 'CARD' || m.method === 'UPI' || m.method === 'BANK_TRANSFER' || m.method === 'CASH' || m.method === 'CHEQUE'), 'Payment methods accurately grouped');
    assert(revData.invoiceStatusSummary.paid.amount > 0, 'Paid invoices summary calculated');
    assert(revData.invoiceStatusSummary.overdue.amount > 0, 'Overdue invoices summary calculated');
    assert(Array.isArray(revData.monthlyRevenueHistory), '6-month MoM revenue history returned');

    // 6. Test Subscription Analytics
    console.log('\n5. Testing Subscription Analytics...');
    const subRes = await request('/analytics/subscriptions?period=30d', { token: adminToken });
    assert(subRes.status === 200, 'GET /analytics/subscriptions succeeds (200)');
    const subData = subRes.data.data;
    assert(subData.statusBreakdown.active >= 3, `Active subscription count in status breakdown (${subData.statusBreakdown.active})`);
    assert(typeof subData.statusBreakdown.expired === 'number', 'Expired subscriptions tracked');
    assert(typeof subData.statusBreakdown.pastDue === 'number', 'Past-due subscriptions tracked');
    assert(Array.isArray(subData.planPopularity), 'Plan popularity distribution returned');
    assert(subData.planPopularity.length >= 3, `Plans popularity includes all active plans (${subData.planPopularity.length} plans)`);
    assert(Array.isArray(subData.newSubscriptionsTimeline), 'New subscriptions timeline returned');
    assert(Array.isArray(subData.cancellationsTimeline), 'Cancellations timeline returned');

    // 7. Test Customer Analytics
    console.log('\n6. Testing Customer Analytics...');
    const custRes = await request('/analytics/customers?period=30d', { token: adminToken });
    assert(custRes.status === 200, 'GET /analytics/customers succeeds (200)');
    const custData = custRes.data.data;
    assert(custData.totalCustomers >= 4, `Customer count returned (${custData.totalCustomers})`);
    assert(custData.segmentation.enterprise.count > 0 || custData.segmentation.midMarket.count > 0, 'Customer segmentation categorizes by spend tiers');
    assert(Array.isArray(custData.topCustomers), 'Top customers list returned');
    assert(custData.topCustomers[0].totalRevenue >= custData.topCustomers[custData.topCustomers.length - 1].totalRevenue, 'Top customers correctly sorted descending by revenue');
    assert(typeof custData.subscriptionDistribution.one === 'number', 'Subscription distribution counts calculated');

    // 8. Test Reports & CSV Export
    console.log('\n7. Testing Reports & CSV Exports...');
    const reportTypes = ['revenue', 'subscriptions', 'customers', 'payments', 'invoices'];
    for (const type of reportTypes) {
      const csvRes = await request(`/analytics/reports/export?reportType=${type}&period=30d`, { token: adminToken });
      assert(csvRes.status === 200, `CSV export for '${type}' returns 200 OK`);
      assert(csvRes.headers.get('content-type').includes('text/csv'), `Content-Type is text/csv for '${type}'`);
      assert(typeof csvRes.data === 'string' && csvRes.data.length > 20, `CSV output contains valid data rows for '${type}'`);

      // Test JSON format export option
      const jsonRes = await request(`/analytics/reports/export?reportType=${type}&format=json`, { token: adminToken });
      assert(jsonRes.status === 200 && Array.isArray(jsonRes.data.rows), `JSON export format works for '${type}'`);
    }

    // Direct /reports shortcut
    const shortcutRes = await request('/reports/revenue?period=7d', { token: staffToken });
    assert(shortcutRes.status === 200 && shortcutRes.headers.get('content-type').includes('text/csv'), 'Shortcut GET /reports/revenue functions seamlessly');

    // Validation rejection on bad report type
    const invalidReportRes = await request('/analytics/reports/export?reportType=nonexistent', { token: adminToken });
    assert(invalidReportRes.status === 400 || invalidReportRes.status === 422, 'Rejects invalid report type with 400/422');

  } catch (err) {
    console.error('Test Suite Exception:', err);
    failed++;
  } finally {
    await stopServer();
    console.log('\n==================================================');
    console.log(`📊 ANALYTICS TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================');
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runAnalyticsTests();
