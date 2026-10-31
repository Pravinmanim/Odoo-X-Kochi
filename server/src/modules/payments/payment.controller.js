import * as paymentService from './payment.service.js';
import { recordPaymentSchema, listPaymentsQuerySchema } from './payment.validator.js';
import { invoiceIdParamSchema } from '../invoices/invoice.validator.js';

export async function recordPayment(req, res, next) {
  try {
    const { id: invoiceId } = invoiceIdParamSchema.parse(req.params);
    const validatedData = recordPaymentSchema.parse(req.body);
    const result = await paymentService.recordPayment(invoiceId, validatedData, req.user);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function listPayments(req, res, next) {
  try {
    const validatedQuery = listPaymentsQuerySchema.parse(req.query);
    const result = await paymentService.listPayments(validatedQuery, req.user);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
