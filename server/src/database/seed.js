import bcrypt from 'bcryptjs';
import prisma from './prisma.js';

const SALT_ROUNDS = 10;

async function seed() {
  console.log('--- Starting Brightloop Database Seed ---');

  // 1. Clear existing seedable data safely
  await prisma.discountUsage.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoiceLine.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.subscriptionStatusLog.deleteMany();
  await prisma.subscriptionLine.deleteMany();
  await prisma.subscription.deleteMany();
  await prisma.templateLine.deleteMany();
  await prisma.quotationTemplate.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.plan.deleteMany();
  await prisma.tax.deleteMany();
  await prisma.discount.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  // 2. Seed Admin User
  const adminPassword = await bcrypt.hash('AdminPassword123!', SALT_ROUNDS);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@brightloop.com',
      password: adminPassword,
      role: 'ADMIN',
      first_name: 'System',
      last_name: 'Admin',
    },
  });
  console.log(`Created Admin: ${admin.email}`);

  // 3. Seed Staff User
  const staffPassword = await bcrypt.hash('StaffPassword123!', SALT_ROUNDS);
  const staff = await prisma.user.create({
    data: {
      email: 'staff@brightloop.com',
      password: staffPassword,
      role: 'STAFF',
      first_name: 'Operations',
      last_name: 'Staff',
    },
  });
  console.log(`Created Staff: ${staff.email}`);

  // 4. Seed Customer User + Customer Record
  const customerPassword = await bcrypt.hash('CustomerPassword123!', SALT_ROUNDS);
  const customerUser = await prisma.user.create({
    data: {
      email: 'customer@brightloop.com',
      password: customerPassword,
      role: 'CUSTOMER',
      first_name: 'Acme',
      last_name: 'Client',
    },
  });

  const customerRecord = await prisma.customer.create({
    data: {
      user_id: customerUser.id,
      name: 'Acme Corporation',
      email: customerUser.email,
      phone: '+1-555-0199',
      company: 'Acme Corp',
      address: '100 Innovation Way',
      city: 'San Francisco',
      country: 'USA',
    },
  });
  console.log(`Created Customer User: ${customerUser.email} (Customer ID: ${customerRecord.id})`);

  // 5. Seed Reference Products with Variants
  const product1 = await prisma.product.create({
    data: {
      name: 'Cloud Workspace Pro',
      description: 'Unified collaborative cloud suite for growing remote and hybrid teams.',
      sales_price: 49.00,
      is_active: true,
      variants: {
        create: [
          { attribute: 'Storage: 100GB', extra_price: 10.00 },
          { attribute: 'Storage: 500GB', extra_price: 35.00 },
          { attribute: 'Storage: 1TB', extra_price: 60.00 },
        ],
      },
    },
  });

  const product2 = await prisma.product.create({
    data: {
      name: 'Security Shield Enterprise',
      description: 'Comprehensive endpoint protection, real-time threat detection, and zero-trust tunneling.',
      sales_price: 199.00,
      is_active: true,
      variants: {
        create: [
          { attribute: 'Support: Standard SLA', extra_price: 0.00 },
          { attribute: 'Support: 24/7 Dedicated SLA', extra_price: 99.00 },
        ],
      },
    },
  });

  const product3 = await prisma.product.create({
    data: {
      name: 'Analytics & Reporting Add-on',
      description: 'Advanced business intelligence dashboards with automated export capabilities.',
      sales_price: 29.00,
      is_active: true,
    },
  });

  console.log(`Created Sample Products: ${product1.name}, ${product2.name}, ${product3.name}`);

  // 6. Seed Sample Plans
  const plan1 = await prisma.plan.create({
    data: {
      name: 'Standard Cloud Monthly',
      billing_period: 'MONTHLY',
      price: 29.00,
      description: 'Standard monthly recurring subscription plan with pause, renew, and close permissions.',
      is_active: true,
      min_quantity: 1,
      pausable: true,
      closable: true,
      renewable: true,
    },
  });

  const plan2 = await prisma.plan.create({
    data: {
      name: 'Enterprise Bulk Yearly',
      billing_period: 'YEARLY',
      price: 299.00,
      description: 'Annual enterprise commitment requiring minimum 5 licenses. Cannot be paused or closed early.',
      is_active: true,
      min_quantity: 5,
      pausable: false,
      closable: false,
      renewable: true,
    },
  });

  const plan3 = await prisma.plan.create({
    data: {
      name: 'Fixed Term Legacy Plan',
      billing_period: 'MONTHLY',
      price: 49.00,
      description: 'Non-renewable legacy plan with no pause/early-close permissions.',
      is_active: true,
      min_quantity: 1,
      pausable: false,
      closable: false,
      renewable: false,
    },
  });

  // 7. Seed Sample Quotation Template
  const template = await prisma.quotationTemplate.create({
    data: {
      name: 'Standard Startup Bundle',
      description: 'Pre-configured starter bundle containing Cloud Workspace and Security Shield',
      quotation_valid_days: 30,
      lines: {
        create: [
          {
            product_id: product1.id,
            quantity: 2,
            unit_price: 49.00,
          },
          {
            product_id: product2.id,
            quantity: 1,
            unit_price: 199.00,
          },
        ],
      },
    },
  });

  console.log(`Created Plans: ${plan1.name}, ${plan2.name}, ${plan3.name}`);
  console.log(`Created Quotation Template: ${template.name}`);

  // 8. Seed Additional Realistic Customers
  const customer2 = await prisma.customer.create({
    data: {
      name: 'Nexus Technologies Ltd',
      email: 'nexus@nexustech.io',
      phone: '+1-555-0245',
      company: 'Nexus Tech',
      address: '450 Silicon Blvd',
      city: 'Austin',
      country: 'USA',
      created_at: new Date(Date.now() - 95 * 24 * 60 * 60 * 1000),
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      name: 'Vertex Cloud Solutions',
      email: 'contact@vertexcloud.dev',
      phone: '+1-555-0378',
      company: 'Vertex Cloud',
      address: '77 Horizon Tower',
      city: 'Seattle',
      country: 'USA',
      created_at: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
    },
  });

  const customer4 = await prisma.customer.create({
    data: {
      name: 'Stellar Digital Agency',
      email: 'hello@stellarmedia.co',
      phone: '+1-555-0412',
      company: 'Stellar Agency',
      address: '12 Broadway',
      city: 'New York',
      country: 'USA',
      created_at: new Date(Date.now() - 130 * 24 * 60 * 60 * 1000),
    },
  });

  console.log(`Created additional customers: ${customer2.name}, ${customer3.name}, ${customer4.name}`);

  // 9. Seed Realistic Subscriptions with Statuses and Status Logs
  const sub1 = await prisma.subscription.create({
    data: {
      number: 'SUB-000001',
      customer_id: customerRecord.id,
      plan_id: plan1.id,
      status: 'ACTIVE',
      start_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      next_billing_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      expiry_date: new Date(Date.now() + 300 * 24 * 60 * 60 * 1000),
      payment_terms: 30,
      total_amount: 59.00,
      created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      lines: {
        create: [
          {
            product_id: product1.id,
            quantity: 1,
            unit_price: 59.00,
            subtotal: 59.00,
          },
        ],
      },
      status_logs: {
        create: [
          {
            from_status: 'DRAFT',
            to_status: 'QUOTATION',
            changed_by: admin.email,
            reason: 'Generated quotation',
            created_at: new Date(Date.now() - 61 * 24 * 60 * 60 * 1000),
          },
          {
            from_status: 'QUOTATION',
            to_status: 'CONFIRMED',
            changed_by: admin.email,
            reason: 'Customer agreed to proposal',
            created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          },
          {
            from_status: 'CONFIRMED',
            to_status: 'ACTIVE',
            changed_by: admin.email,
            reason: 'Initial billing processed and activated',
            created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    },
  });

  const sub2 = await prisma.subscription.create({
    data: {
      number: 'SUB-000002',
      customer_id: customer2.id,
      plan_id: plan2.id,
      status: 'ACTIVE',
      start_date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      next_billing_date: new Date(Date.now() + 275 * 24 * 60 * 60 * 1000),
      expiry_date: new Date(Date.now() + 275 * 24 * 60 * 60 * 1000),
      payment_terms: 30,
      total_amount: 1495.00,
      created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      lines: {
        create: [
          {
            product_id: product2.id,
            quantity: 5,
            unit_price: 299.00,
            subtotal: 1495.00,
          },
        ],
      },
      status_logs: {
        create: [
          {
            from_status: 'DRAFT',
            to_status: 'ACTIVE',
            changed_by: admin.email,
            reason: 'Enterprise contract signed',
            created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    },
  });

  const sub3 = await prisma.subscription.create({
    data: {
      number: 'SUB-000003',
      customer_id: customer3.id,
      plan_id: plan1.id,
      status: 'ACTIVE',
      start_date: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      next_billing_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      expiry_date: new Date(Date.now() + 330 * 24 * 60 * 60 * 1000),
      payment_terms: 30,
      total_amount: 248.00,
      created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      lines: {
        create: [
          {
            product_id: product1.id,
            quantity: 2,
            unit_price: 49.00,
            subtotal: 98.00,
          },
          {
            product_id: product3.id,
            quantity: 5,
            unit_price: 30.00,
            subtotal: 150.00,
          },
        ],
      },
      status_logs: {
        create: [
          {
            from_status: 'DRAFT',
            to_status: 'ACTIVE',
            changed_by: staff.email,
            reason: 'Activated monthly subscription',
            created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    },
  });

  const sub4 = await prisma.subscription.create({
    data: {
      number: 'SUB-000004',
      customer_id: customer4.id,
      plan_id: plan3.id,
      status: 'CLOSED',
      start_date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
      next_billing_date: null,
      expiry_date: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      payment_terms: 30,
      total_amount: 147.00,
      created_at: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000),
      lines: {
        create: [
          {
            product_id: product1.id,
            quantity: 3,
            unit_price: 49.00,
            subtotal: 147.00,
          },
        ],
      },
      status_logs: {
        create: [
          {
            from_status: 'ACTIVE',
            to_status: 'CLOSED',
            changed_by: admin.email,
            reason: 'Customer churned - completed fixed term',
            created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
          },
        ],
      },
    },
  });

  const sub5 = await prisma.subscription.create({
    data: {
      number: 'SUB-000005',
      customer_id: customerRecord.id,
      plan_id: plan1.id,
      status: 'QUOTATION',
      start_date: new Date(),
      expiry_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      payment_terms: 15,
      total_amount: 199.00,
      created_at: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
      lines: {
        create: [
          {
            product_id: product2.id,
            quantity: 1,
            unit_price: 199.00,
            subtotal: 199.00,
          },
        ],
      },
    },
  });

  console.log(`Created sample subscriptions: ${sub1.number}, ${sub2.number}, ${sub3.number}, ${sub4.number}, ${sub5.number}`);

  // 10. Seed Invoices & Payments for Realistic Metrics
  // Paid Invoice 1 (Acme, 60 days ago)
  const inv1 = await prisma.invoice.create({
    data: {
      number: 'INV-000001',
      subscription_id: sub1.id,
      customer_id: customerRecord.id,
      period_start: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      period_end: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      subtotal: 59.00,
      total_amount: 59.00,
      status: 'PAID',
      due_date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      payments: {
        create: [
          {
            amount: 59.00,
            payment_method: 'CARD',
            payment_date: new Date(Date.now() - 58 * 24 * 60 * 60 * 1000),
            transaction_ref: 'ch_stripe_001',
            notes: 'Automated recurring card charge',
          },
        ],
      },
    },
  });

  // Paid Invoice 2 (Acme, 30 days ago)
  const inv2 = await prisma.invoice.create({
    data: {
      number: 'INV-000002',
      subscription_id: sub1.id,
      customer_id: customerRecord.id,
      period_start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      period_end: new Date(),
      subtotal: 59.00,
      total_amount: 59.00,
      status: 'PAID',
      due_date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      payments: {
        create: [
          {
            amount: 59.00,
            payment_method: 'CARD',
            payment_date: new Date(Date.now() - 28 * 24 * 60 * 60 * 1000),
            transaction_ref: 'ch_stripe_002',
          },
        ],
      },
    },
  });

  // Paid Invoice 3 (Nexus, 90 days ago)
  const inv3 = await prisma.invoice.create({
    data: {
      number: 'INV-000003',
      subscription_id: sub2.id,
      customer_id: customer2.id,
      period_start: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      period_end: new Date(Date.now() + 275 * 24 * 60 * 60 * 1000),
      subtotal: 1495.00,
      total_amount: 1495.00,
      status: 'PAID',
      due_date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000),
      created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      payments: {
        create: [
          {
            amount: 1495.00,
            payment_method: 'BANK_TRANSFER',
            payment_date: new Date(Date.now() - 85 * 24 * 60 * 60 * 1000),
            transaction_ref: 'wire_nexus_001',
            notes: 'Annual corporate wire transfer',
          },
        ],
      },
    },
  });

  // Paid Invoice 4 (Vertex, 20 days ago)
  const inv4 = await prisma.invoice.create({
    data: {
      number: 'INV-000004',
      subscription_id: sub3.id,
      customer_id: customer3.id,
      period_start: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      period_end: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      subtotal: 248.00,
      total_amount: 248.00,
      status: 'PAID',
      due_date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      created_at: new Date(Date.now() - 35 * 24 * 60 * 60 * 1000),
      payments: {
        create: [
          {
            amount: 248.00,
            payment_method: 'CARD',
            payment_date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
            transaction_ref: 'cc_auth_9021',
          },
        ],
      },
    },
  });

  // Paid Invoice 5 (Vertex, recent payment 3 days ago)
  const inv5 = await prisma.invoice.create({
    data: {
      number: 'INV-000005',
      subscription_id: sub3.id,
      customer_id: customer3.id,
      period_start: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      period_end: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      subtotal: 248.00,
      total_amount: 248.00,
      status: 'PAID',
      due_date: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000),
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      payments: {
        create: [
          {
            amount: 248.00,
            payment_method: 'UPI',
            payment_date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            transaction_ref: 'pp_tx_8832',
          },
        ],
      },
    },
  });

  // Overdue Invoice (Acme, due 7 days ago)
  const inv6 = await prisma.invoice.create({
    data: {
      number: 'INV-000006',
      subscription_id: sub1.id,
      customer_id: customerRecord.id,
      period_start: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
      period_end: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
      subtotal: 120.00,
      total_amount: 120.00,
      status: 'CONFIRMED',
      due_date: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
    },
  });

  // Draft/Pending Invoice (Vertex, due in 20 days)
  const inv7 = await prisma.invoice.create({
    data: {
      number: 'INV-000007',
      subscription_id: sub3.id,
      customer_id: customer3.id,
      period_start: new Date(),
      period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      subtotal: 350.00,
      total_amount: 350.00,
      status: 'DRAFT',
      due_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000),
      created_at: new Date(),
    },
  });

  console.log(`Created sample invoices & payments (Paid, Overdue, Draft)`);
  console.log('--- Database Seed Completed Successfully ---');
}

seed()
  .catch((e) => {
    console.error('Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
