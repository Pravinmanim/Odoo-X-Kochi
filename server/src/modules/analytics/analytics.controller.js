import { analyticsQuerySchema, reportExportQuerySchema } from './analytics.validator.js';
import * as analyticsService from './analytics.service.js';
import * as reportsService from './reports.service.js';
import { ValidationError } from '../../utils/errors.js';

export async function getOverview(req, res, next) {
  try {
    const validated = analyticsQuerySchema.parse(req.query);
    const data = await analyticsService.getOverviewMetrics(validated);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getRevenueAnalytics(req, res, next) {
  try {
    const validated = analyticsQuerySchema.parse(req.query);
    const data = await analyticsService.getRevenueAnalytics(validated);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getSubscriptionAnalytics(req, res, next) {
  try {
    const validated = analyticsQuerySchema.parse(req.query);
    const data = await analyticsService.getSubscriptionAnalytics(validated);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getCustomerAnalytics(req, res, next) {
  try {
    const validated = analyticsQuerySchema.parse(req.query);
    const data = await analyticsService.getCustomerAnalytics(validated);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

/**
 * Universal report export endpoint (CSV / JSON)
 */
export async function exportReport(req, res, next) {
  try {
    const { reportType, format = 'csv', period = '30d', startDate, endDate } = req.query;

    if (!reportType) {
      throw new ValidationError('Query parameter reportType is required (revenue, subscriptions, customers, payments, invoices)');
    }

    const query = { period, startDate, endDate };
    let reportResult;

    switch (reportType.toLowerCase()) {
      case 'revenue':
        reportResult = await reportsService.generateRevenueReport(query);
        break;
      case 'subscriptions':
      case 'subscription':
        reportResult = await reportsService.generateSubscriptionReport(query);
        break;
      case 'customers':
      case 'customer':
        reportResult = await reportsService.generateCustomerReport(query);
        break;
      case 'payments':
      case 'payment':
        reportResult = await reportsService.generatePaymentReport(query);
        break;
      case 'invoices':
      case 'invoice':
        reportResult = await reportsService.generateInvoiceReport(query);
        break;
      default:
        throw new ValidationError(`Unknown reportType '${reportType}'. Valid types: revenue, subscriptions, customers, payments, invoices.`);
    }

    if (format === 'json') {
      return res.status(200).json({
        success: true,
        reportType,
        count: reportResult.count,
        rows: reportResult.rows,
      });
    }

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${reportResult.filename}"`);
    return res.status(200).send(reportResult.csv);
  } catch (err) {
    next(err);
  }
}
