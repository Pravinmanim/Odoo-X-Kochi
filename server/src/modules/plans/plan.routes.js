import { Router } from 'express';
import * as planController from './plan.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { createPlanSchema, updatePlanSchema } from './plan.validator.js';

const router = Router();

// Staff and Admin can view available plans and plan listings
router.get(
  '/available',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  planController.getAvailablePlans
);

router.get(
  '/',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  planController.listPlans
);

router.get(
  '/:id',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  planController.getPlan
);

// Admin-only mutation routes
router.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  validate(createPlanSchema),
  planController.createPlan
);

router.put(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  validate(updatePlanSchema),
  planController.updatePlan
);

router.patch(
  '/:id/toggle',
  authenticate,
  requireRole('ADMIN'),
  planController.togglePlan
);

router.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  planController.deletePlan
);

export default router;

