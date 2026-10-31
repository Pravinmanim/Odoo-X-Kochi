import { z } from 'zod';

const discountTypeEnum = z.enum(['PERCENTAGE', 'FIXED']);
const scopeEnum = z.enum(['PRODUCT', 'SUBSCRIPTION']);

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

export const createDiscountSchema = z
  .object({
    code: z
      .string()
      .min(1, 'Discount code is required')
      .trim()
      .transform((val) => val.toUpperCase()),
    type: z
      .string()
      .transform((val) => val.toUpperCase())
      .pipe(discountTypeEnum),
    value: z.coerce.number().min(0, 'Discount value cannot be negative'),
    min_purchase: z.coerce.number().min(0, 'Minimum purchase cannot be negative').optional().default(0),
    min_quantity: z.coerce.number().int().min(1, 'Minimum quantity must be at least 1').optional().default(1),
    start_date: dateField,
    expires_at: dateField,
    end_date: dateField,
    max_redemptions: z.coerce.number().int().min(1, 'Usage limit must be at least 1').optional().nullable(),
    usage_limit: z.coerce.number().int().min(1, 'Usage limit must be at least 1').optional().nullable(),
    scope: z
      .string()
      .transform((val) => val.toUpperCase())
      .pipe(scopeEnum)
      .default('SUBSCRIPTION'),
    is_active: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.type === 'PERCENTAGE' && data.value > 100) {
        return false;
      }
      return true;
    },
    {
      message: 'Percentage discount rate cannot exceed 100%',
      path: ['value'],
    }
  )
  .refine(
    (data) => {
      const end = data.expires_at || data.end_date;
      if (data.start_date && end) {
        return end >= data.start_date;
      }
      return true;
    },
    {
      message: 'End date must be on or after start date',
      path: ['end_date'],
    }
  );

export const updateDiscountSchema = z
  .object({
    code: z
      .string()
      .min(1, 'Discount code is required')
      .trim()
      .transform((val) => val.toUpperCase())
      .optional(),
    type: z
      .string()
      .transform((val) => val.toUpperCase())
      .pipe(discountTypeEnum)
      .optional(),
    value: z.coerce.number().min(0, 'Discount value cannot be negative').optional(),
    min_purchase: z.coerce.number().min(0, 'Minimum purchase cannot be negative').optional(),
    min_quantity: z.coerce.number().int().min(1, 'Minimum quantity must be at least 1').optional(),
    start_date: dateField,
    expires_at: dateField,
    end_date: dateField,
    max_redemptions: z.coerce.number().int().min(1, 'Usage limit must be at least 1').optional().nullable(),
    usage_limit: z.coerce.number().int().min(1, 'Usage limit must be at least 1').optional().nullable(),
    scope: z
      .string()
      .transform((val) => val.toUpperCase())
      .pipe(scopeEnum)
      .optional(),
    is_active: z.boolean().optional(),
  })
  .refine(
    (data) => {
      if (data.type === 'PERCENTAGE' && data.value !== undefined && data.value > 100) {
        return false;
      }
      return true;
    },
    {
      message: 'Percentage discount rate cannot exceed 100%',
      path: ['value'],
    }
  )
  .refine(
    (data) => {
      const end = data.expires_at || data.end_date;
      if (data.start_date && end) {
        return end >= data.start_date;
      }
      return true;
    },
    {
      message: 'End date must be on or after start date',
      path: ['end_date'],
    }
  );

