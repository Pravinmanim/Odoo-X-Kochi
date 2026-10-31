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

/**
 * Calculates percentage growth safely
 */
function calculateGrowth(current, previous) {
  const curr = Number(current) || 0;
  const prev = Number(previous) || 0;
  if (prev === 0) {
    return curr > 0 ? 100 : 0;
  }
  return Number((((curr - prev) / prev) * 100).toFixed(2));
}

/**
 * Formats a decimal/number to 2 decimal places
 */
function roundMoney(val) {
  return Number((Number(val) || 0).toFixed(2));
}

/**
 * 1. OVERVIEW METRICS
 */
export async function getOverviewMetrics(query = {}) {
  const { period = '30d', startDate, endDate } = query;
  const { start, end, prevStart, prevEnd } = resolveDateFilter(period, startDate, endDate);

  // 1. Total Customers & New in Period
  const [totalCustomers, newCustomersInPeriod, newCustomersPrevPeriod] = await Promise.all([
    prisma.customer.count(),
    prisma.customer.count({
      where: { created_at: { gte: start, lte: end } },
    }),
    prisma.customer.count({
      where: { created_at: { gte: prevStart, lte: prevEnd } },
    }),
  ]);

  // 2. Subscriptions
  const [activeSubscriptions, prevActiveSubscriptionsCount] = await Promise.all([
    prisma.subscription.count({
      where: { status: 'ACTIVE' },
    }),
    prisma.subscription.count({
      where: {
        status: 'ACTIVE',
        created_at: { lte: prevEnd },
      },
    }),
  ]);

  // 3. Revenue from Payments
  const [allTimeRevenueAgg, periodRevenueAgg, prevPeriodRevenueAgg] = await Promise.all([
    prisma.payment.aggregate({
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { payment_date: { gte: start, lte: end } },
      _sum: { amount: true },
    }),
    prisma.payment.aggregate({
      where: { payment_date: { gte: prevStart, lte: prevEnd } },
      _sum: { amount: true },
    }),
  ]);

  const allTimeRevenue = roundMoney(allTimeRevenueAgg._sum.amount);
  const periodRevenue = roundMoney(periodRevenueAgg._sum.amount);
  const prevPeriodRevenue = roundMoney(prevPeriodRevenueAgg._sum.amount);
  const revenueGrowth = calculateGrowth(periodRevenue, prevPeriodRevenue);

  // 4. MRR & ARR calculation from all currently ACTIVE subscriptions
  const activeSubsWithPlans = await prisma.subscription.findMany({
    where: { status: 'ACTIVE' },
    include: { plan: true },
  });

  let calculatedMRR = 0;
  for (const sub of activeSubsWithPlans) {
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

  // 5. Pending Payments (Invoices with DRAFT status or unpaid)
  const pendingInvoicesAgg = await prisma.invoice.aggregate({
    where: { status: 'DRAFT' },
    _sum: { total_amount: true },
    _count: true,
  });
  const pendingPaymentsAmount = roundMoney(pendingInvoicesAgg._sum.total_amount);
  const pendingPaymentsCount = pendingInvoicesAgg._count || 0;

  // 6. Overdue Invoices
  const overdueInvoicesAgg = await prisma.invoice.aggregate({
    where: { status: 'OVERDUE' },
    _sum: { total_amount: true },
    _count: true,
  });
  const overdueInvoicesAmount = roundMoney(overdueInvoicesAgg._sum.total_amount);
  const overdueInvoicesCount = overdueInvoicesAgg._count || 0;

  // 7. Churn Rate Calculation
  // Subscriptions closed during the period from SubscriptionStatusLog or closed subscriptions
  const closedLogsCount = await prisma.subscriptionStatusLog.count({
    where: {
      to_status: 'CLOSED',
      created_at: { gte: start, lte: end },
    },
  });

  // Base subscriptions at risk: active subscriptions + closed subscriptions
  const totalBaseSubs = activeSubscriptions + closedLogsCount;
  const churnRate = totalBaseSubs > 0 ? Number(((closedLogsCount / totalBaseSubs) * 100).toFixed(2)) : 0;

  // 8. Subscription Growth Rate
  const newSubsInPeriod = await prisma.subscription.count({
    where: { created_at: { gte: start, lte: end } },
  });
  const newSubsPrevPeriod = await prisma.subscription.count({
    where: { created_at: { gte: prevStart, lte: prevEnd } },
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
      totalRevenue: allTimeRevenue,
      periodRevenue,
      revenueGrowth,
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
  const { period = '30d', startDate, endDate } = query;
  const { start, end, prevStart, prevEnd } = resolveDateFilter(period, startDate, endDate);

  // Fetch payments in range
  const payments = await prisma.payment.findMany({
    where: {
      payment_date: { gte: start, lte: end },
    },
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

  // Fetch previous period payments for MoM comparison
  const prevPayments = await prisma.payment.findMany({
    where: {
      payment_date: { gte: prevStart, lte: prevEnd },
    },
  });

  const currentRevenue = roundMoney(payments.reduce((acc, p) => acc + Number(p.amount), 0));
  const prevRevenue = roundMoney(prevPayments.reduce((acc, p) => acc + Number(p.amount), 0));
  const momGrowth = calculateGrowth(currentRevenue, prevRevenue);

  // A. Revenue Trend Timeline (Daily / Monthly)
  const timelineMap = new Map();
  for (const p of payments) {
    const d = new Date(p.payment_date);
    const key = d.toISOString().split('T')[0]; // YYYY-MM-DD
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

  // C. Revenue by Payment Method
  const methodMap = new Map();
  for (const p of payments) {
    const method = p.payment_method || 'OTHER';
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

  // D. Paid vs Pending vs Overdue Invoices
  const invoicesInRange = await prisma.invoice.groupBy({
    by: ['status'],
    where: {
      created_at: { gte: start, lte: end },
    },
    _sum: { total_amount: true },
    _count: true,
  });

  const invoiceStatusSummary = {
    paid: { amount: 0, count: 0 },
    pending: { amount: 0, count: 0 },
    overdue: { amount: 0, count: 0 },
  };

  for (const item of invoicesInRange) {
    const amt = roundMoney(item._sum.total_amount);
    const cnt = item._count || 0;
    if (item.status === 'PAID') {
      invoiceStatusSummary.paid = { amount: amt, count: cnt };
    } else if (item.status === 'DRAFT') {
      invoiceStatusSummary.pending = { amount: amt, count: cnt };
    } else if (item.status === 'OVERDUE') {
      invoiceStatusSummary.overdue = { amount: amt, count: cnt };
    }
  }

  // E. Month-over-Month Revenue Growth History (last 6 months)
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

  // Ensure all 6 consecutive months are present
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
  const { period = '30d', startDate, endDate } = query;
  const { start, end } = resolveDateFilter(period, startDate, endDate);

  const now = new Date();

  // A. Status Breakdown
  const subscriptionsByStatus = await prisma.subscription.groupBy({
    by: ['status'],
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

  // Count expired (ACTIVE or past expiry)
  const expiredCount = await prisma.subscription.count({
    where: {
      expiry_date: { lt: now },
      status: { not: 'CLOSED' },
    },
  });

  // Count past-due (subscriptions with OVERDUE invoices)
  const pastDueSubs = await prisma.subscription.count({
    where: {
      invoices: {
        some: { status: 'OVERDUE' },
      },
    },
  });

  // B. New Subscriptions over time (within period)
  const subscriptions = await prisma.subscription.findMany({
    where: { created_at: { gte: start, lte: end } },
    select: { id: true, created_at: true, status: true, total_amount: true },
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

  // C. Cancellations over time (from SubscriptionStatusLog)
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

  // D. Plan Popularity
  const plans = await prisma.plan.findMany({
    include: {
      _count: {
        select: {
          subscriptions: true,
        },
      },
      subscriptions: {
        select: {
          status: true,
          total_amount: true,
        },
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

  // E. Renewal Trends
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
  const { period = '30d', startDate, endDate } = query;
  const { start, end } = resolveDateFilter(period, startDate, endDate);

  const [totalCustomers, newCustomersInPeriod] = await Promise.all([
    prisma.customer.count(),
    prisma.customer.count({
      where: { created_at: { gte: start, lte: end } },
    }),
  ]);

  // A. Customer Growth Chart (Cumulative and daily in period)
  const customersInPeriod = await prisma.customer.findMany({
    where: { created_at: { gte: start, lte: end } },
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

  // B. Customer Lifetime Revenue and Top Customers
  const allCustomers = await prisma.customer.findMany({
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
    let invoicesCount = cust.invoices.length;
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

  // Top Customers by Revenue
  const topCustomers = [...customerStats]
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 10);

  // C. Customer Segmentation
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

  // D. Customer Subscription Distribution
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
