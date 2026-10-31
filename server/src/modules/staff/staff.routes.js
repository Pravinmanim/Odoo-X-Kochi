import { Router } from 'express';
import * as staffController from './staff.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { createStaffSchema } from './staff.validator.js';

const router = Router();

// Only ADMIN can create and view staff
router.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  validate(createStaffSchema),
  staffController.createStaff
);

router.get(
  '/',
  authenticate,
  requireRole('ADMIN'),
  staffController.getStaff
);

export default router;

