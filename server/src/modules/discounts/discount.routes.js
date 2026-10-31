import { Router } from 'express';
import * as discountController from './discount.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { createDiscountSchema, updateDiscountSchema } from './discount.validator.js';

const router = Router();

// Admin-only CRUD as per specification
router.get(
  '/',
  authenticate,
  requireRole('ADMIN'),
  discountController.listDiscounts
);

router.get(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  discountController.getDiscount
);

router.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  validate(createDiscountSchema),
  discountController.createDiscount
);

router.put(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  validate(updateDiscountSchema),
  discountController.updateDiscount
);

router.patch(
  '/:id/toggle',
  authenticate,
  requireRole('ADMIN'),
  discountController.toggleDiscount
);

router.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  discountController.deleteDiscount
);

export default router;

