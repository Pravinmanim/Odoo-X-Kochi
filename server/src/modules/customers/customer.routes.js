import { Router } from 'express';
import * as customerController from './customer.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { createCustomerSchema, updateCustomerSchema } from './customer.validator.js';

const router = Router();

// Admin and Staff can manage customers
router.get(
  '/',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  customerController.listCustomers
);

router.get(
  '/:id',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  customerController.getCustomer
);

router.post(
  '/',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  validate(createCustomerSchema),
  customerController.createCustomer
);

router.put(
  '/:id',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  validate(updateCustomerSchema),
  customerController.updateCustomer
);

router.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  customerController.deleteCustomer
);

export default router;
