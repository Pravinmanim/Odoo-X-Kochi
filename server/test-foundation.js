import app from './src/app.js';
import prisma from './src/database/prisma.js';

let server;
const PORT = 5099;
const BASE_URL = `http://localhost:${PORT}/api/v1`;

async function runTests() {
  console.log('==================================================');
  console.log('🧪 RUNNING FOUNDATION VALIDATION TEST SUITE');
  console.log('==================================================\n');

  // Start temporary test server
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
    // 1. Health check
    console.log('1. Testing Server & Health Endpoint...');
    const healthRes = await fetch(`${BASE_URL}/health`);
    const healthJson = await healthRes.json();
    assert(healthRes.status === 200 && healthJson.status === 'ok', 'Health endpoint responds with 200 OK');

    // 2. Auth: Signup Password Rules & Customer Creation
    console.log('\n2. Testing Signup Validation & Password Requirements...');

    // Weak password: too short
    const shortPassRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test_weak@brightloop.com',
        password: 'Pass1!',
        first_name: 'Short',
        last_name: 'Pass',
      }),
    });
    const shortPassJson = await shortPassRes.json();
    assert(
      shortPassRes.status === 422 && shortPassJson.error?.fields?.password,
      'Rejects password with <= 8 characters (422)'
    );

    // Weak password: no special char
    const noSpecialRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'test_nospecial@brightloop.com',
        password: 'Password123',
        first_name: 'No',
        last_name: 'Special',
      }),
    });
    assert(noSpecialRes.status === 422, 'Rejects password with no special character (422)');

    // Valid Signup
    const uniqueEmail = `newcustomer_${Date.now()}@brightloop.com`;
    const signupRes = await fetch(`${BASE_URL}/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: uniqueEmail.toUpperCase(), // Test case insensitivity
        password: 'SecurePassword123!',
        first_name: 'Test',
        last_name: 'Customer',
        company: 'Automated Inc',
        phone: '9876543210',
      }),
    });
    const signupJson = await signupRes.json();
    assert(signupRes.status === 201, 'Valid signup succeeds with 201 Created');
    assert(signupJson.user?.role === 'CUSTOMER', 'New signup role is CUSTOMER');
    assert(signupJson.user?.customer_id !== null, 'Signup automatically links a Customer record');
    assert(signupJson.user?.email === uniqueEmail.toLowerCase(), 'Email stored strictly lowercase');

    // 3. Auth: Login & Generic Error Handling
    console.log('\n3. Testing Login & Token Verification...');

    // Wrong password (should give generic error)
    const wrongPassRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@brightloop.com',
        password: 'WrongPassword999!',
      }),
    });
    const wrongPassJson = await wrongPassRes.json();
    assert(wrongPassRes.status === 401, 'Invalid password returns 401');
    assert(wrongPassJson.error.message === 'Invalid email or password.', 'Generic error message prevents enumeration');

    // Admin Login
    const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@brightloop.com',
        password: 'AdminPassword123!',
      }),
    });
    const adminLoginJson = await adminLoginRes.json();
    const adminToken = adminLoginJson.token;
    assert(adminLoginRes.status === 200 && !!adminToken, 'Admin logs in and receives JWT');

    // Staff Login
    const staffLoginRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'staff@brightloop.com',
        password: 'StaffPassword123!',
      }),
    });
    const staffLoginJson = await staffLoginRes.json();
    const staffToken = staffLoginJson.token;
    assert(staffLoginRes.status === 200 && !!staffToken, 'Staff logs in and receives JWT');

    // Customer Token from earlier signup
    const customerToken = signupJson.token;

    // Verify /auth/me
    const meRes = await fetch(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const meJson = await meRes.json();
    assert(meRes.status === 200 && meJson.user.email === 'admin@brightloop.com', 'GET /auth/me returns authenticated user');

    // 4. RBAC: Staff cannot create staff members
    console.log('\n4. Testing RBAC Constraints (Staff cannot create staff)...');

    // Staff attempts to POST /staff
    const staffCreateStaffRes = await fetch(`${BASE_URL}/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        email: `unauthorized_staff_${Date.now()}@brightloop.com`,
        password: 'StaffPassword123!',
        first_name: 'Hacker',
        last_name: 'Attempt',
      }),
    });
    assert(staffCreateStaffRes.status === 403, 'Staff attempting to POST /staff is FORBIDDEN (403)');

    // Admin attempts to POST /staff
    const adminCreateStaffRes = await fetch(`${BASE_URL}/staff`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        email: `legit_staff_${Date.now()}@brightloop.com`,
        password: 'StaffPassword123!',
        first_name: 'Legit',
        last_name: 'Staff',
      }),
    });
    assert(adminCreateStaffRes.status === 201, 'Admin can successfully POST /staff (201)');

    // 5. Reference Module: Products Flow & Calculated Variant Pricing
    console.log('\n5. Testing Products Reference Module Flow...');

    // Customer cannot view products
    const customerProductsRes = await fetch(`${BASE_URL}/products`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    assert(customerProductsRes.status === 403, 'Customer cannot view /products (403)');

    // Staff can view products (read-only)
    const staffProductsRes = await fetch(`${BASE_URL}/products`, {
      headers: { Authorization: `Bearer ${staffToken}` },
    });
    const staffProductsJson = await staffProductsRes.json();
    assert(staffProductsRes.status === 200 && Array.isArray(staffProductsJson.data), 'Staff can view /products (200)');

    // Staff cannot create product
    const staffCreateProductRes = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${staffToken}`,
      },
      body: JSON.stringify({
        name: 'Unauthorized Product',
        sales_price: 10,
      }),
    });
    assert(staffCreateProductRes.status === 403, 'Staff cannot create products (403)');

    // Admin creates product with 2 variants
    const newProductRes = await fetch(`${BASE_URL}/products`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Enterprise Cloud VPN',
        description: 'Dedicated high-speed encrypted network gateway',
        sales_price: 100.0,
        is_active: true,
        variants: [
          { attribute: 'Bandwidth: 1Gbps', extra_price: 25.0 },
          { attribute: 'Bandwidth: 10Gbps', extra_price: 150.0 },
        ],
      }),
    });
    const newProductJson = await newProductRes.json();
    assert(newProductRes.status === 201, 'Admin creates product with variants (201)');

    // Verify calculated final variant prices on the backend
    const variant1 = newProductJson.data?.variants?.[0];
    const variant2 = newProductJson.data?.variants?.[1];
    assert(
      variant1 && variant1.final_price === 125.0,
      'Variant 1 final price = sales_price ($100) + extra_price ($25) = $125.00'
    );
    assert(
      variant2 && variant2.final_price === 250.0,
      'Variant 2 final price = sales_price ($100) + extra_price ($150) = $250.00'
    );

    // List with pagination and search
    const searchRes = await fetch(`${BASE_URL}/products?search=VPN`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const searchJson = await searchRes.json();
    assert(
      searchRes.status === 200 && searchJson.data.length >= 1 && searchJson.total >= 1,
      'Pagination and search filters return matching products'
    );

    // Admin updates product
    const createdId = newProductJson.data.id;
    const updateRes = await fetch(`${BASE_URL}/products/${createdId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Enterprise Cloud VPN Ultra',
        sales_price: 120.0,
      }),
    });
    const updateJson = await updateRes.json();
    assert(updateRes.status === 200, 'Admin can update product (200)');
    assert(
      updateJson.data.name === 'Enterprise Cloud VPN Ultra' &&
        updateJson.data.variants[0].final_price === 145.0,
      'Recalculates variant final price upon updating product base sales price ($120 + $25 = $145)'
    );

    // Admin deletes product
    const deleteRes = await fetch(`${BASE_URL}/products/${createdId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(deleteRes.status === 200, 'Admin can delete product (200)');

    console.log('\n==================================================');
    console.log(`📊 TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('==================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Test execution error:', err);
    process.exit(1);
  } finally {
    server.close();
    await prisma.$disconnect();
  }
}

runTests();

