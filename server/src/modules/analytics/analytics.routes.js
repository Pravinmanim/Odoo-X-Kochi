import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import * as analyticsController from './analytics.controller.js';

const router = Router();

// Enforce role-based access control: Only ADMIN and STAFF can access analytics and reports
router.use(authenticate, requireRole('ADMIN', 'STAFF'));

// Analytics Endpoints
router.get('/overview', analyticsController.getOverview);
router.get('/revenue', analyticsController.getRevenueAnalytics);
router.get('/subscriptions', analyticsController.getSubscriptionAnalytics);
router.get('/customers', analyticsController.getCustomerAnalytics);

// Report Exports
router.get('/reports/export', analyticsController.exportReport);

// Direct Report Shortcuts
router.get('/reports/revenue', (req, res, next) => {
  req.query.reportType = 'revenue';
  analyticsController.exportReport(req, res, next);
});

router.get('/reports/subscriptions', (req, res, next) => {
  req.query.reportType = 'subscriptions';
  analyticsController.exportReport(req, res, next);
});

router.get('/reports/customers', (req, res, next) => {
  req.query.reportType = 'customers';
  analyticsController.exportReport(req, res, next);
});

router.get('/reports/payments', (req, res, next) => {
  req.query.reportType = 'payments';
  analyticsController.exportReport(req, res, next);
});

router.get('/reports/invoices', (req, res, next) => {
  req.query.reportType = 'invoices';
  analyticsController.exportReport(req, res, next);
});

export default router;
