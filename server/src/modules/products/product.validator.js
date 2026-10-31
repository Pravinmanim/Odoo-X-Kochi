import { z } from 'zod';

export const variantInputSchema = z.object({
  id: z.string().uuid().optional(),
  attribute: z.string().min(1, 'Attribute description is required').trim(),
  extra_price: z.coerce.number().min(0, 'Extra price cannot be negative').default(0),
});

export const createProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').trim(),
  description: z.string().optional().nullable(),
  sales_price: z.coerce.number().min(0, 'Sales price cannot be negative'),
  is_active: z.boolean().default(true),
  variants: z.array(variantInputSchema).optional().default([]),
});

export const updateProductSchema = z.object({
  name: z.string().min(1, 'Product name is required').trim().optional(),
  description: z.string().optional().nullable(),
  sales_price: z.coerce.number().min(0, 'Sales price cannot be negative').optional(),
  is_active: z.boolean().optional(),
  variants: z.array(variantInputSchema).optional(),
});

