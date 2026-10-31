import { Router } from 'express';
import * as taxController from './tax.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { createTaxSchema, updateTaxSchema } from './tax.validator.js';

const router = Router();

// Staff and Admin can view taxes
router.get(
  '/',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  taxController.listTaxes
);

router.get(
  '/:id',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  taxController.getTax
);

// Admin-only mutation routes
router.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  validate(createTaxSchema),
  taxController.createTax
);

router.put(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  validate(updateTaxSchema),
  taxController.updateTax
);

router.patch(
  '/:id/toggle',
  authenticate,
  requireRole('ADMIN'),
  taxController.toggleTax
);

router.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  taxController.deleteTax
);

export default router;

