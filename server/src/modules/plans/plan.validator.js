import { z } from 'zod';

const billingPeriodEnum = z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']);

const dateField = z
  .union([
    z.string().trim().min(1),
    z.date(),
  ])
  .optional()
  .nullable()
  .transform((val) => {
    if (!val) return null;
    const d = new Date(val);
    if (isNaN(d.getTime())) return null;
    return d;
  });

export const createPlanSchema = z
  .object({
    name: z.string().min(1, 'Plan name is required').trim(),
    description: z.string().optional().nullable(),
    price: z.coerce.number().min(0, 'Price cannot be negative'),
    billing_period: z
      .string()
      .transform((val) => val.toUpperCase())
      .pipe(billingPeriodEnum),
    min_quantity: z.coerce.number().int().min(1, 'Minimum quantity must be at least 1').default(1),
    available_from: dateField,
    available_to: dateField,
    auto_close: z.boolean().default(false),
    closable: z.boolean().default(true),
    pausable: z.boolean().default(true),
    renewable: z.boolean().default(true),
    is_active: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.available_from && data.available_to) {
        return data.available_to >= data.available_from;
      }
      return true;
    },
    {
      message: 'available_to date must be after or equal to available_from date',
      path: ['available_to'],
    }
  );

export const updatePlanSchema = z
  .object({
    name: z.string().min(1, 'Plan name is required').trim().optional(),
    description: z.string().optional().nullable(),
    price: z.coerce.number().min(0, 'Price cannot be negative').optional(),
    billing_period: z
      .string()
      .transform((val) => val.toUpperCase())
      .pipe(billingPeriodEnum)
      .optional(),
    min_quantity: z.coerce.number().int().min(1, 'Minimum quantity must be at least 1').optional(),
    available_from: dateField,
    available_to: dateField,
    auto_close: z.boolean().optional(),
    closable: z.boolean().optional(),
    pausable: z.boolean().optional(),
    renewable: z.boolean().optional(),
    is_active: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.available_from && data.available_to) {
        return data.available_to >= data.available_from;
      }
      return true;
    },
    {
      message: 'available_to date must be after or equal to available_from date',
      path: ['available_to'],
    }
  );
