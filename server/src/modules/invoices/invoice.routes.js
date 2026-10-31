import { Router } from 'express';
import { authenticate, requireRole } from '../../middleware/auth.js';
import * as invoiceController from './invoice.controller.js';
import { recordPayment } from '../payments/payment.controller.js';

const router = Router();

// Staff & Admin full invoice operations
router.get('/', authenticate, requireRole('ADMIN', 'STAFF'), invoiceController.listInvoices);
router.get('/:id', authenticate, requireRole('ADMIN', 'STAFF', 'CUSTOMER'), invoiceController.getInvoiceById);

router.post('/:id/confirm', authenticate, requireRole('ADMIN', 'STAFF'), invoiceController.confirmInvoice);
router.post('/:id/cancel', authenticate, requireRole('ADMIN', 'STAFF'), invoiceController.cancelInvoice);
router.post('/:id/send', authenticate, requireRole('ADMIN', 'STAFF'), invoiceController.sendInvoice);

// Payment recording on invoice: POST /api/v1/invoices/:id/payments
router.post('/:id/payments', authenticate, requireRole('ADMIN', 'STAFF'), recordPayment);

// PDF export accessible to Admin, Staff, and Customer (own invoice)
router.get('/:id/pdf', authenticate, requireRole('ADMIN', 'STAFF', 'CUSTOMER'), invoiceController.downloadInvoicePdf);

export default router;
