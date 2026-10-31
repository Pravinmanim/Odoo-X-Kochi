import { Prisma } from '@prisma/client';
import prisma from '../../database/prisma.js';

/**
 * Resolves date filters into ISO Date objects and previous comparison period
 */
export function resolveDateFilter(period = '30d', customStart = null, customEnd = null) {
  const now = new Date();
  let start = new Date(now);
  let end = new Date(now);
  let prevStart = new Date(now);
  let prevEnd = new Date(now);

  switch (period) {
    case 'today': {
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      // Previous: yesterday
      prevStart.setDate(start.getDate() - 1);
      prevStart.setHours(0, 0, 0, 0);
      prevEnd.setDate(end.getDate() - 1);
      prevEnd.setHours(23, 59, 59, 999);
      break;
    }
    case '7d': {
      start.setDate(now.getDate() - 7);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      const diff = end.getTime() - start.getTime();
      prevEnd = new Date(start.getTime() - 1);
      prevStart = new Date(prevEnd.getTime() - diff);
      break;
    }
    case '30d': {
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      const diff = end.getTime() - start.getTime();
      prevEnd = new Date(start.getTime() - 1);
      prevStart = new Date(prevEnd.getTime() - diff);
      break;
    }
    case 'this_month': {
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    }
    case 'last_month': {
      start = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      prevStart = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
      break;
    }
    case 'this_year': {
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      prevStart = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
      prevEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      break;
    }
    case 'custom': {
      if (customStart) {
        start = new Date(customStart.includes('T') ? customStart : `${customStart}T00:00:00.000Z`);
      } else {
        start.setDate(now.getDate() - 30);
        start.setHours(0, 0, 0, 0);
      }
      if (customEnd) {
        end = new Date(customEnd.includes('T') ? customEnd : `${customEnd}T23:59:59.999Z`);
      } else {
        end.setHours(23, 59, 59, 999);
      }
      const diff = end.getTime() - start.getTime();
      prevEnd = new Date(start.getTime() - 1);
      prevStart = new Date(prevEnd.getTime() - diff);
      break;
    }
    default: {
      start.setDate(now.getDate() - 30);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      const diff = end.getTime() - start.getTime();
      prevEnd = new Date(start.getTime() - 1);
      prevStart = new Date(prevEnd.getTime() - diff);
    }
  }

  return { start, end, prevStart, prevEnd };
}

function calculateGrowth(current, previous) {
  const curr = Number(current) || 0;
  const prev = Number(previous) || 0;
  if (prev === 0) {
    return curr > 0 ? 100 : 0;
  }
  return Number((((curr - prev) / prev) * 100).toFixed(2));
}

function roundMoney(val) {
  return Number((Number(val) || 0).toFixed(2));
}

/**
 * 1. OVERVIEW METRICS (with separate revenue collected, total invoiced, outstanding, and derived overdue)
 */
export async function getOverviewMetrics(query = {}) {
  const { period = '30d', startDate, endDate, customer_id, plan_id, invoice_status } = query;
  const { start, end, prevStart, prevEnd } = resolveDateFilter(period, startDate, endDate);
  const now = new Date();

  // Scope filters
  const customerWhere = customer_id ? { id: customer_id } : {};
  const subscriptionWhere = {};
  if (customer_id) subscriptionWhere.customer_id = customer_id;
  if (plan_id) subscriptionWhere.plan_id = plan_id;

  // 1. Customer Counts
  const [totalCustomers, newCustomersInPeriod, newCustomersPrevPeriod] = await Promise.all([
    prisma.customer.count({ where: customerWhere }),
    prisma.customer.count({
      where: {
        ...customerWhere,
        created_at: { gte: start, lte: end },
      },
    }),
    prisma.customer.count({
      where: {
        ...customerWhere,
        created_at: { gte: prevStart, lte: prevEnd },
      },
    }),
  ]);

  // 2. Active Subscriptions
  const [activeSubscriptions, prevActiveSubscriptionsCount] = await Promise.all([
    prisma.subscription.count({
      where: { ...subscriptionWhere, status: 'ACTIVE' },
    }),
    prisma.subscription.count({
      where: {
        ...subscriptionWhere,
        status: 'ACTIVE',
        created_at: { lte: prevEnd },
      },
    }),
  ]);

  // 3. Revenue Collected (sum of actual payments)
  const paymentWhere = { payment_date: { gte: start, lte: end } };
  if (customer_id) paymentWhere.invoice = { customer_id };

  const prevPaymentWhere = { payment_date: { gte: prevStart, lte: prevEnd } };
  if (customer_id) prevPaymentWhere.invoice = { customer_id };

  const allTimePaymentWhere = customer_id ? { invoice: { customer_id } } : {};

  const [allTimePaymentAgg, periodPaymentAgg, prevPeriodPaymentAgg] = await Promise.all([
    prisma.payment.aggregate({
      where: allTimePaymentWhere,
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: paymentWhere,
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: prevPaymentWhere,
      _sum: { amount: true },
    }),
  ]);

  const allTimeRevenueCollected = roundMoney(allTimePaymentAgg._sum.amount);
  const periodRevenueCollected = roundMoney(periodPaymentAgg._sum.amount);
  const prevPeriodRevenue = roundMoney(prevPeriodPaymentAgg._sum.amount);
  const revenueGrowth = calculateGrowth(periodRevenueCollected, prevPeriodRevenue);

  // 4. Total Invoiced (non-cancelled invoices)
  const invoiceBaseWhere = {
    status: invoice_status || { not: 'CANCELLED' },
  };
  if (customer_id) invoiceBaseWhere.customer_id = customer_id;

  const totalInvoicedAgg = await prisma.invoice.aggregate({
    where: invoiceBaseWhere,
    _sum: { total_amount: true },
  });
  const totalInvoiced = roundMoney(totalInvoicedAgg._sum.total_amount);

  // Outstanding = total invoiced minus total payments collected
  const outstanding = Math.max(0, roundMoney(totalInvoiced - allTimeRevenueCollected));

  // 5. MRR & ARR calculation from all currently ACTIVE subscriptions
  const activeSubs = await prisma.subscription.findMany({
    where: { ...subscriptionWhere, status: 'ACTIVE' },
    include: { plan: true },
  });

  let calculatedMRR = 0;
  for (const sub of activeSubs) {
    const amount = Number(sub.total_amount) || 0;
    const periodType = sub.plan?.billing_period || 'MONTHLY';
    switch (periodType) {
      case 'DAILY':
        calculatedMRR += amount * 30;
        break;
      case 'WEEKLY':
        calculatedMRR += (amount * 52) / 12;
        break;
      case 'YEARLY':
        calculatedMRR += amount / 12;
        break;
      case 'MONTHLY':
      default:
        calculatedMRR += amount;
        break;
    }
  }
  const mrr = roundMoney(calculatedMRR);
  const arr = roundMoney(mrr * 12);

  // 6. Pending Payments (Invoices with DRAFT or CONFIRMED status)
  const pendingInvoicesAgg = await prisma.invoice.aggregate({
    where: {
      ...invoiceBaseWhere,
      status: { in: ['DRAFT', 'CONFIRMED'] },
    },
    _sum: { total_amount: true },
    _count: true,
  });
  const pendingPaymentsAmount = roundMoney(pendingInvoicesAgg._sum.total_amount);
  const pendingPaymentsCount = pendingInvoicesAgg._count || 0;

  // 7. Derived Overdue Invoices: due_date < now AND status NOT IN ('PAID', 'CANCELLED')
  const overdueInvoicesAgg = await prisma.invoice.aggregate({
    where: {
      ...invoiceBaseWhere,
      status: { notIn: ['PAID', 'CANCELLED'] },
      due_date: { lt: now },
    },
    _sum: { total_amount: true },
    _count: true,
  });
  const overdueInvoicesAmount = roundMoney(overdueInvoicesAgg._sum.total_amount);
  const overdueInvoicesCount = overdueInvoicesAgg._count || 0;

  // 8. Churn Rate Calculation from status logs
  const closedLogsCount = await prisma.subscriptionStatusLog.count({
    where: {
      to_status: 'CLOSED',
      created_at: { gte: start, lte: end },
    },
  });

  const totalBaseSubs = activeSubscriptions + closedLogsCount;
  const churnRate = totalBaseSubs > 0 ? Number(((closedLogsCount / totalBaseSubs) * 100).toFixed(2)) : 0;

  // 9. Subscription Growth
  const newSubsInPeriod = await prisma.subscription.count({
    where: { ...subscriptionWhere, created_at: { gte: start, lte: end } },
  });
  const newSubsPrevPeriod = await prisma.subscription.count({
    where: { ...subscriptionWhere, created_at: { gte: prevStart, lte: prevEnd } },
  });
  const subscriptionGrowth = calculateGrowth(newSubsInPeriod, newSubsPrevPeriod);
  const customerGrowth = calculateGrowth(newCustomersInPeriod, newCustomersPrevPeriod);

  return {
    period,
    dateRange: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    metrics: {
      totalCustomers,
      newCustomers: newCustomersInPeriod,
      customerGrowth,
      activeSubscriptions,
      subscriptionGrowth,
      revenue_collected: allTimeRevenueCollected,
      totalRevenue: allTimeRevenueCollected, // legacy key compatibility
      periodRevenue: periodRevenueCollected,
      revenueGrowth,
      total_invoiced: totalInvoiced,
      outstanding,
      mrr,
      arr,
      pendingPayments: {
        amount: pendingPaymentsAmount,
        count: pendingPaymentsCount,
      },
      overdueInvoices: {
        amount: overdueInvoicesAmount,
        count: overdueInvoicesCount,
      },
      churnRate,
    },
  };
}

/**
 * 2. REVENUE ANALYTICS
 */
export async function getRevenueAnalytics(query = {}) {
  const { period = '30d', startDate, endDate, customer_id } = query;
  const { start, end, prevStart, prevEnd } = resolveDateFilter(period, startDate, endDate);
  const now = new Date();

  const paymentWhere = {
    payment_date: { gte: start, lte: end },
  };
  if (customer_id) paymentWhere.invoice = { customer_id };

  const payments = await prisma.payment.findMany({
    where: paymentWhere,
    include: {
      invoice: {
        include: {
          subscription: {
            include: { plan: true },
          },
        },
      },
    },
    orderBy: { payment_date: 'asc' },
  });

  const prevPayments = await prisma.payment.findMany({
    where: {
      payment_date: { gte: prevStart, lte: prevEnd },
      ...(customer_id ? { invoice: { customer_id } } : {}),
    },
  });

  const currentRevenue = roundMoney(payments.reduce((acc, p) => acc + Number(p.amount), 0));
  const prevRevenue = roundMoney(prevPayments.reduce((acc, p) => acc + Number(p.amount), 0));
  const momGrowth = calculateGrowth(currentRevenue, prevRevenue);

  // A. Revenue Trend Timeline
  const timelineMap = new Map();
  for (const p of payments) {
    const key = new Date(p.payment_date).toISOString().split('T')[0];
    const existing = timelineMap.get(key) || { date: key, revenue: 0, count: 0 };
    existing.revenue = roundMoney(existing.revenue + Number(p.amount));
    existing.count += 1;
    timelineMap.set(key, existing);
  }
  const revenueTrend = Array.from(timelineMap.values()).sort((a, b) => a.date.localeCompare(b.date));

  // B. Revenue by Subscription Plan
  const planRevenueMap = new Map();
  for (const p of payments) {
    const planName = p.invoice?.subscription?.plan?.name || 'Standard Plan / Unassigned';
    const amount = Number(p.amount) || 0;
    const current = planRevenueMap.get(planName) || 0;
    planRevenueMap.set(planName, roundMoney(current + amount));
  }
  const revenueByPlan = Array.from(planRevenueMap.entries()).map(([planName, revenue]) => ({
    planName,
    revenue,
    percentage: currentRevenue > 0 ? Number(((revenue / currentRevenue) * 100).toFixed(1)) : 0,
  }));

  // C. Revenue by Payment Method (aligned with CARD, UPI, BANK_TRANSFER, CASH, CHEQUE)
  const methodMap = new Map();
  for (const p of payments) {
    const method = p.payment_method || 'CASH';
    const amount = Number(p.amount) || 0;
    const current = methodMap.get(method) || { method, count: 0, total: 0 };
    current.count += 1;
    current.total = roundMoney(current.total + amount);
    methodMap.set(method, current);
  }
  const revenueByPaymentMethod = Array.from(methodMap.values()).map((item) => ({
    ...item,
    percentage: currentRevenue > 0 ? Number(((item.total / currentRevenue) * 100).toFixed(1)) : 0,
  }));

  // D. Paid vs Pending vs Derived Overdue
  const invoiceWhere = {
    created_at: { gte: start, lte: end },
    ...(customer_id ? { customer_id } : {}),
  };

  const invoices = await prisma.invoice.findMany({
    where: invoiceWhere,
    select: {
      id: true,
      status: true,
      due_date: true,
      total_amount: true,
    },
  });

  const invoiceStatusSummary = {
    paid: { amount: 0, count: 0 },
    pending: { amount: 0, count: 0 },
    overdue: { amount: 0, count: 0 },
  };

  for (const inv of invoices) {
    const amt = Number(inv.total_amount) || 0;
    if (inv.status === 'PAID') {
      invoiceStatusSummary.paid.amount = roundMoney(invoiceStatusSummary.paid.amount + amt);
      invoiceStatusSummary.paid.count++;
    } else if (new Date(inv.due_date) < now && inv.status !== 'CANCELLED') {
      // Derived overdue
      invoiceStatusSummary.overdue.amount = roundMoney(invoiceStatusSummary.overdue.amount + amt);
      invoiceStatusSummary.overdue.count++;
    } else if (inv.status !== 'CANCELLED') {
      invoiceStatusSummary.pending.amount = roundMoney(invoiceStatusSummary.pending.amount + amt);
      invoiceStatusSummary.pending.count++;
    }
  }

  // E. 6-Month Monthly History
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const historicalPayments = await prisma.payment.findMany({
    where: { payment_date: { gte: sixMonthsAgo } },
    orderBy: { payment_date: 'asc' },
  });

  const monthlyMap = new Map();
  for (const p of historicalPayments) {
    const d = new Date(p.payment_date);
    const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const cur = monthlyMap.get(monthKey) || 0;
    monthlyMap.set(monthKey, roundMoney(cur + Number(p.amount)));
  }

  const monthlyRevenueHistory = [];
  let prevMonthRev = 0;
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const rev = monthlyMap.get(key) || 0;
    const growth = calculateGrowth(rev, prevMonthRev);
    monthlyRevenueHistory.push({
      month: key,
      revenue: rev,
      growth,
    });
    prevMonthRev = rev;
  }

  return {
    period,
    dateRange: { start: start.toISOString(), end: end.toISOString() },
    summary: {
      currentRevenue,
      prevRevenue,
      momGrowth,
    },
    revenueTrend,
    revenueByPlan,
    revenueByPaymentMethod,
    invoiceStatusSummary,
    monthlyRevenueHistory,
  };
}

/**
 * 3. SUBSCRIPTION ANALYTICS
 */
export async function getSubscriptionAnalytics(query = {}) {
  const { period = '30d', startDate, endDate, customer_id, plan_id } = query;
  const { start, end } = resolveDateFilter(period, startDate, endDate);
  const now = new Date();

  const subFilter = {};
  if (customer_id) subFilter.customer_id = customer_id;
  if (plan_id) subFilter.plan_id = plan_id;

  const subscriptionsByStatus = await prisma.subscription.groupBy({
    by: ['status'],
    where: subFilter,
    _count: true,
  });

  const statusCounts = {
    DRAFT: 0,
    QUOTATION: 0,
    CONFIRMED: 0,
    ACTIVE: 0,
    CLOSED: 0,
  };
  for (const s of subscriptionsByStatus) {
    statusCounts[s.status] = s._count || 0;
  }

  // Count expired subscriptions
  const expiredCount = await prisma.subscription.count({
    where: {
      ...subFilter,
      expiry_date: { lt: now },
      status: { not: 'CLOSED' },
    },
  });

  // Count past-due subscriptions (derived: due_date < now AND status NOT IN ('PAID', 'CANCELLED'))
  const pastDueSubs = await prisma.subscription.count({
    where: {
      ...subFilter,
      invoices: {
        some: {
          due_date: { lt: now },
          status: { notIn: ['PAID', 'CANCELLED'] },
        },
      },
    },
  });

  // New subscriptions timeline
  const subscriptions = await prisma.subscription.findMany({
    where: {
      ...subFilter,
      created_at: { gte: start, lte: end },
    },
    select: { id: true, created_at: true },
    orderBy: { created_at: 'asc' },
  });

  const newSubsTimelineMap = new Map();
  for (const sub of subscriptions) {
    const key = new Date(sub.created_at).toISOString().split('T')[0];
    newSubsTimelineMap.set(key, (newSubsTimelineMap.get(key) || 0) + 1);
  }
  const newSubscriptionsTimeline = Array.from(newSubsTimelineMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  // Cancellations timeline
  const cancellationLogs = await prisma.subscriptionStatusLog.findMany({
    where: {
      to_status: 'CLOSED',
      created_at: { gte: start, lte: end },
    },
    orderBy: { created_at: 'asc' },
  });

  const cancellationsTimelineMap = new Map();
  for (const log of cancellationLogs) {
    const key = new Date(log.created_at).toISOString().split('T')[0];
    cancellationsTimelineMap.set(key, (cancellationsTimelineMap.get(key) || 0) + 1);
  }
  const cancellationsTimeline = Array.from(cancellationsTimelineMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  // Plan popularity
  const plans = await prisma.plan.findMany({
    where: plan_id ? { id: plan_id } : {},
    include: {
      _count: {
        select: { subscriptions: true },
      },
      subscriptions: {
        select: { status: true, total_amount: true },
      },
    },
  });

  const planPopularity = plans.map((p) => {
    const totalSubs = p._count.subscriptions;
    const activeSubs = p.subscriptions.filter((s) => s.status === 'ACTIVE').length;
    const recurringValue = roundMoney(
      p.subscriptions
        .filter((s) => s.status === 'ACTIVE')
        .reduce((sum, s) => sum + Number(s.total_amount), 0)
    );
    return {
      planId: p.id,
      name: p.name,
      billingPeriod: p.billing_period,
      price: roundMoney(p.price),
      totalSubscribers: totalSubs,
      activeSubscribers: activeSubs,
      recurringValue,
    };
  });

  // Renewal trends
  const renewalLogs = await prisma.subscriptionStatusLog.findMany({
    where: {
      reason: { contains: 'Renew', mode: 'insensitive' },
      created_at: { gte: start, lte: end },
    },
    orderBy: { created_at: 'asc' },
  });

  const renewalTimelineMap = new Map();
  for (const log of renewalLogs) {
    const key = new Date(log.created_at).toISOString().split('T')[0];
    renewalTimelineMap.set(key, (renewalTimelineMap.get(key) || 0) + 1);
  }
  const renewalTrends = Array.from(renewalTimelineMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  const totalClosed = cancellationLogs.length;
  const activeCount = statusCounts.ACTIVE;
  const churnRate = activeCount + totalClosed > 0
    ? Number(((totalClosed / (activeCount + totalClosed)) * 100).toFixed(2))
    : 0;

  return {
    period,
    dateRange: { start: start.toISOString(), end: end.toISOString() },
    statusBreakdown: {
      active: statusCounts.ACTIVE,
      quotation: statusCounts.QUOTATION,
      confirmed: statusCounts.CONFIRMED,
      draft: statusCounts.DRAFT,
      closed: statusCounts.CLOSED,
      expired: expiredCount,
      pastDue: pastDueSubs,
    },
    churnRate,
    newSubscriptionsTimeline,
    cancellationsTimeline,
    planPopularity,
    renewalTrends,
  };
}

/**
 * 4. CUSTOMER ANALYTICS
 */
export async function getCustomerAnalytics(query = {}) {
  const { period = '30d', startDate, endDate, customer_id } = query;
  const { start, end } = resolveDateFilter(period, startDate, endDate);

  const customerWhere = customer_id ? { id: customer_id } : {};

  const [totalCustomers, newCustomersInPeriod] = await Promise.all([
    prisma.customer.count({ where: customerWhere }),
    prisma.customer.count({
      where: { ...customerWhere, created_at: { gte: start, lte: end } },
    }),
  ]);

  const customersInPeriod = await prisma.customer.findMany({
    where: { ...customerWhere, created_at: { gte: start, lte: end } },
    select: { id: true, created_at: true },
    orderBy: { created_at: 'asc' },
  });

  const growthTimelineMap = new Map();
  for (const c of customersInPeriod) {
    const key = new Date(c.created_at).toISOString().split('T')[0];
    growthTimelineMap.set(key, (growthTimelineMap.get(key) || 0) + 1);
  }
  const customerGrowthTimeline = Array.from(growthTimelineMap.entries()).map(([date, count]) => ({
    date,
    count,
  }));

  const allCustomers = await prisma.customer.findMany({
    where: customerWhere,
    include: {
      subscriptions: {
        select: { id: true, status: true },
      },
      invoices: {
        include: {
          payments: {
            select: { amount: true },
          },
        },
      },
    },
  });

  const customerStats = allCustomers.map((cust) => {
    let totalRevenue = 0;
    const invoicesCount = cust.invoices.length;
    for (const inv of cust.invoices) {
      for (const p of inv.payments) {
        totalRevenue += Number(p.amount) || 0;
      }
    }
    const activeSubscriptionsCount = cust.subscriptions.filter((s) => s.status === 'ACTIVE').length;
    const totalSubscriptionsCount = cust.subscriptions.length;

    return {
      id: cust.id,
      name: cust.name,
      company: cust.company || 'Individual',
      email: cust.email,
      totalRevenue: roundMoney(totalRevenue),
      activeSubscriptionsCount,
      totalSubscriptionsCount,
      invoicesCount,
      created_at: cust.created_at,
    };
  });

  const topCustomers = [...customerStats]
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10);

  const segmentation = {
    enterprise: { label: 'Enterprise ($1,000+)', count: 0, revenue: 0 },
    midMarket: { label: 'Mid-Market ($300 - $999)', count: 0, revenue: 0 },
    starter: { label: 'Starter ($1 - $299)', count: 0, revenue: 0 },
    prospect: { label: 'Prospect ($0)', count: 0, revenue: 0 },
  };

  for (const c of customerStats) {
    if (c.totalRevenue >= 1000) {
      segmentation.enterprise.count += 1;
      segmentation.enterprise.revenue = roundMoney(segmentation.enterprise.revenue + c.totalRevenue);
    } else if (c.totalRevenue >= 300) {
      segmentation.midMarket.count += 1;
      segmentation.midMarket.revenue = roundMoney(segmentation.midMarket.revenue + c.totalRevenue);
    } else if (c.totalRevenue > 0) {
      segmentation.starter.count += 1;
      segmentation.starter.revenue = roundMoney(segmentation.starter.revenue + c.totalRevenue);
    } else {
      segmentation.prospect.count += 1;
    }
  }

  const subscriptionDistribution = {
    zero: 0,
    one: 0,
    twoToThree: 0,
    fourPlus: 0,
  };

  for (const c of customerStats) {
    const count = c.totalSubscriptionsCount;
    if (count === 0) subscriptionDistribution.zero += 1;
    else if (count === 1) subscriptionDistribution.one += 1;
    else if (count <= 3) subscriptionDistribution.twoToThree += 1;
    else subscriptionDistribution.fourPlus += 1;
  }

  return {
    period,
    dateRange: { start: start.toISOString(), end: end.toISOString() },
    totalCustomers,
    newCustomersInPeriod,
    customerGrowthTimeline,
    segmentation,
    topCustomers,
    subscriptionDistribution,
  };
}
