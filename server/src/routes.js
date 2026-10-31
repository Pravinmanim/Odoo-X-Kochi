import { Router } from 'express';

import authRoutes from './modules/auth/auth.routes.js';
import staffRoutes from './modules/staff/staff.routes.js';
import productRoutes from './modules/products/product.routes.js';

import planRoutes from './modules/plans/plan.routes.js';
import taxRoutes from './modules/taxes/tax.routes.js';
import discountRoutes from './modules/discounts/discount.routes.js';

import customerRoutes from './modules/customers/customer.routes.js';
import subscriptionRoutes from './modules/subscriptions/subscription.routes.js';
import analyticsRoutes from './modules/analytics/analytics.routes.js';

import * as analyticsController from './modules/analytics/analytics.controller.js';

import { requireRole, authenticate } from './middleware/auth.js';
import { getMySubscriptions } from './modules/subscriptions/subscription.controller.js';
import { runBillingEngine } from './services/billingService.js';

import prisma from './database/prisma.js';

const apiRouter = Router();

// Health check endpoint
apiRouter.get('/health', (req, res) => {
    res.status(200).json({
        status: 'ok',
        timestamp: new Date().toISOString()
    });
});

// Mounted modules
apiRouter.use('/auth', authRoutes);
apiRouter.use('/staff', staffRoutes);
apiRouter.use('/products', productRoutes);

apiRouter.use('/plans', planRoutes);
apiRouter.use('/taxes', taxRoutes);
apiRouter.use('/discounts', discountRoutes);

apiRouter.use('/customers', customerRoutes);
apiRouter.use('/subscriptions', subscriptionRoutes);
apiRouter.use('/analytics', analyticsRoutes);

// Direct shortcuts for reports
apiRouter.get(
    '/reports/export',
    authenticate,
    requireRole('ADMIN', 'STAFF'),
    analyticsController.exportReport
);

apiRouter.get(
    '/reports/:type',
    authenticate,
    requireRole('ADMIN', 'STAFF'),
    (req, res, next) => {
        req.query.reportType = req.params.type;
        analyticsController.exportReport(req, res, next);
    }
);

// Customer portal endpoint
apiRouter.get(
    '/me/subscriptions',
    authenticate,
    getMySubscriptions
);

// Manual billing run endpoint (Admin & Staff)
apiRouter.post(
    '/billing/run',
    authenticate,
    requireRole('ADMIN', 'STAFF'),
    async (req, res, next) => {
        try {
            const { batchSize, asOfDate } = req.body || {};
            const summary = await runBillingEngine({ batchSize, asOfDate });
            res.status(200).json({ success: true, data: summary });
        } catch (err) {
            next(err);
        }
    }
);

// Quotation templates listing endpoint
apiRouter.get('/templates', authenticate, async (req, res, next) => {
    try {
        const templates = await prisma.quotationTemplate.findMany({
            include: {
                lines: {
                    include: {
                        product: true,
                        variant: true,
                    },
                },
            },
            orderBy: {
                created_at: 'desc',
            },
        });

        res.status(200).json({
            data: templates
        });
    } catch (err) {
        next(err);
    }
});

export default apiRouter;
