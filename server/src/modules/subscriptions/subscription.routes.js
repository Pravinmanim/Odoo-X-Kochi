import { Router } from 'express';
import * as subscriptionController from './subscription.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import {
  createSubscriptionSchema,
  transitionReasonSchema,
} from './subscription.validator.js';

const router = Router();

// Staff & Admin: List all subscriptions with filters
router.get(
  '/',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  subscriptionController.listSubscriptions
);

// Detail & History (Customer can view own, Admin & Staff can view any)
router.get('/:id', authenticate, subscriptionController.getSubscription);
router.get('/:id/history', authenticate, subscriptionController.getSubscriptionHistory);

// Create subscription
router.post(
  '/',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  validate(createSubscriptionSchema),
  subscriptionController.createSubscription
);

// Create from template
router.post(
  '/from-template/:templateId',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  subscriptionController.createFromTemplate
);

// Lifecycle Action Endpoints
router.post(
  '/:id/quote',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  validate(transitionReasonSchema),
  subscriptionController.quote
);

router.post(
  '/:id/confirm',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  validate(transitionReasonSchema),
  subscriptionController.confirm
);

router.post(
  '/:id/activate',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  validate(transitionReasonSchema),
  subscriptionController.activate
);

router.post(
  '/:id/close',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  validate(transitionReasonSchema),
  subscriptionController.close
);

// Plan Permission Actions
router.post(
  '/:id/pause',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  validate(transitionReasonSchema),
  subscriptionController.pause
);

router.post(
  '/:id/resume',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  validate(transitionReasonSchema),
  subscriptionController.resume
);

router.post(
  '/:id/renew',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  validate(transitionReasonSchema),
  subscriptionController.renew
);

export default router;
