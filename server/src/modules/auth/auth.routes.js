import { Router } from 'express';
import * as authController from './auth.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate } from '../../middleware/auth.js';
import { loginRateLimiter } from '../../middleware/rateLimiter.js';
import {
  signupSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './auth.validator.js';

const router = Router();

// Public routes
router.post('/signup', validate(signupSchema), authController.signup);
router.post('/login', loginRateLimiter, validate(loginSchema), authController.login);
router.post('/forgot', validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset', validate(resetPasswordSchema), authController.resetPassword);

// Protected routes
router.get('/me', authenticate, authController.me);

export default router;

