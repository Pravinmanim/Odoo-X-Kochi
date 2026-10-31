import { z } from 'zod';

export const phoneSchema = z
  .string()
  .trim()
  .regex(/^\d{10}$/, 'Phone number must be exactly 10 digits')
  .optional()
  .nullable()
  .or(z.literal(''));

export const createCustomerSchema = z.object({
  name: z.string().min(1, 'Customer or company name is required').trim(),
  email: z
    .string()
    .email('Please enter a valid email address')
    .transform((val) => val.trim().toLowerCase()),
  phone: phoneSchema,
  company: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
});

export const updateCustomerSchema = z.object({
  name: z.string().min(1, 'Customer name is required').trim().optional(),
  email: z
    .string()
    .email('Please enter a valid email address')
    .transform((val) => val.trim().toLowerCase())
    .optional(),
  phone: phoneSchema,
  company: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
});
