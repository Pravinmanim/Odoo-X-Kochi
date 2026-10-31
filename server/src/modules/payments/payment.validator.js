import { z } from 'zod';

export const recordPaymentSchema = z.object({
  amount: z.number().positive('Payment amount must be greater than 0'),
  payment_method: z.enum(['CARD', 'UPI', 'BANK_TRANSFER', 'CASH', 'CHEQUE']),
  payment_date: z.string().optional(),
  transaction_ref: z.string().max(100).optional(),
  notes: z.string().max(500).optional(),
});

export const listPaymentsQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  invoice_id: z.string().uuid().optional(),
  customer_id: z.string().uuid().optional(),
  payment_method: z.enum(['CARD', 'UPI', 'BANK_TRANSFER', 'CASH', 'CHEQUE']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});
