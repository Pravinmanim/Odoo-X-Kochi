import { z } from 'zod';

export const listInvoicesQuerySchema = z.object({
  page: z.string().optional(),
  limit: z.string().optional(),
  search: z.string().optional(),
  status: z.enum(['DRAFT', 'CONFIRMED', 'PAID', 'CANCELLED']).optional(),
  customer_id: z.string().uuid().optional(),
  overdue: z.enum(['true', 'false']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
});

export const invoiceIdParamSchema = z.object({
  id: z.string().uuid(),
});
