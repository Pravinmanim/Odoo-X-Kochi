import { z } from 'zod';

const periodEnum = z.enum([
  'today',
  '7d',
  '30d',
  'this_month',
  'last_month',
  'this_year',
  'custom',
]);

const reportTypeEnum = z.enum([
  'revenue',
  'subscriptions',
  'customers',
  'payments',
  'invoices',
]);

export const analyticsQuerySchema = z.object({
  period: periodEnum.default('30d').optional(),
  startDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
  endDate: z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).optional(),
});

export const reportExportQuerySchema = analyticsQuerySchema.extend({
  reportType: reportTypeEnum,
  format: z.enum(['csv', 'json']).default('csv').optional(),
});
