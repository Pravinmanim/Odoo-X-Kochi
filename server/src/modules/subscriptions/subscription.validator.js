import { z } from 'zod';

export const subscriptionLineInputSchema = z.object({
  product_id: z.string().uuid('Valid product ID is required'),
  variant_id: z.string().uuid().optional().nullable(),
  quantity: z.coerce.number().int().min(1, 'Quantity must be at least 1').default(1),
});

export const createSubscriptionSchema = z.object({
  customer_id: z.string().uuid('Valid customer ID is required'),
  plan_id: z.string().uuid('Valid plan ID is required'),
  start_date: z.string().or(z.date()).transform((val) => new Date(val)),
  expiry_date: z.string().or(z.date()).optional().nullable().transform((val) => (val ? new Date(val) : null)),
  payment_terms: z.coerce.number().int().min(0, 'Payment terms cannot be negative').default(30),
  lines: z.array(subscriptionLineInputSchema).min(1, 'At least one subscription product line is required'),
});

export const updateSubscriptionSchema = z.object({
  plan_id: z.string().uuid().optional(),
  start_date: z.string().or(z.date()).optional().transform((val) => (val ? new Date(val) : undefined)),
  expiry_date: z.string().or(z.date()).optional().nullable().transform((val) => (val ? new Date(val) : null)),
  payment_terms: z.coerce.number().int().min(0).optional(),
  lines: z.array(subscriptionLineInputSchema).optional(),
});

export const transitionReasonSchema = z.object({
  reason: z.string().optional().default(''),
});
