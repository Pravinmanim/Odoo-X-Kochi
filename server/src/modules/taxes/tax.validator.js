import { z } from 'zod';

export const createTaxSchema = z.object({
  name: z.string().min(1, 'Tax name is required').trim(),
  rate_percent: z
    .coerce
    .number()
    .min(0, 'Tax rate cannot be negative')
    .max(100, 'Tax rate cannot exceed 100%'),
  is_active: z.boolean().default(true),
});

export const updateTaxSchema = z.object({
  name: z.string().min(1, 'Tax name is required').trim().optional(),
  rate_percent: z
    .coerce
    .number()
    .min(0, 'Tax rate cannot be negative')
    .max(100, 'Tax rate cannot exceed 100%')
    .optional(),
  is_active: z.boolean().optional(),
});

