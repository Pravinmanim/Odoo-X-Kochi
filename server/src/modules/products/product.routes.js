import { Router } from 'express';
import * as productController from './product.controller.js';
import { validate } from '../../middleware/validate.js';
import { authenticate, requireRole } from '../../middleware/auth.js';
import { createProductSchema, updateProductSchema } from './product.validator.js';

const router = Router();

// Staff and Admin can view products (Customer has no access)
router.get(
  '/',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  productController.listProducts
);

router.get(
  '/:id',
  authenticate,
  requireRole('ADMIN', 'STAFF'),
  productController.getProduct
);

// Only Admin can create, modify, or delete products
router.post(
  '/',
  authenticate,
  requireRole('ADMIN'),
  validate(createProductSchema),
  productController.createProduct
);

router.put(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  validate(updateProductSchema),
  productController.updateProduct
);

router.delete(
  '/:id',
  authenticate,
  requireRole('ADMIN'),
  productController.deleteProduct
);

export default router;

