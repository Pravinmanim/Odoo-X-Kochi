import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import * as paymentController from './payment.controller.js';

const router = Router();

// Staff & Admin payment listing
router.get('/', authenticate, requireRole('ADMIN', 'STAFF'), paymentController.listPayments);

// Direct record payment endpoint
router.post('/invoices/:id', authenticate, requireRole('ADMIN', 'STAFF'), paymentController.recordPayment);

export default router;
