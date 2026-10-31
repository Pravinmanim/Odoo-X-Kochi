import * as invoiceService from './invoice.service.js';
import { listInvoicesQuerySchema, invoiceIdParamSchema } from './invoice.validator.js';

export async function listInvoices(req, res, next) {
  try {
    const validatedQuery = listInvoicesQuerySchema.parse(req.query);
    const result = await invoiceService.listInvoices(validatedQuery, req.user);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function getInvoiceById(req, res, next) {
  try {
    const { id } = invoiceIdParamSchema.parse(req.params);
    const invoice = await invoiceService.getInvoiceById(id, req.user);
    res.status(200).json({ success: true, data: invoice });
  } catch (err) {
    next(err);
  }
}

export async function confirmInvoice(req, res, next) {
  try {
    const { id } = invoiceIdParamSchema.parse(req.params);
    const confirmed = await invoiceService.confirmInvoice(id, req.user);
    res.status(200).json({ success: true, data: confirmed });
  } catch (err) {
    next(err);
  }
}

export async function cancelInvoice(req, res, next) {
  try {
    const { id } = invoiceIdParamSchema.parse(req.params);
    const cancelled = await invoiceService.cancelInvoice(id, req.user);
    res.status(200).json({ success: true, data: cancelled });
  } catch (err) {
    next(err);
  }
}

export async function sendInvoice(req, res, next) {
  try {
    const { id } = invoiceIdParamSchema.parse(req.params);
    const result = await invoiceService.sendInvoice(id, req.user);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

export async function downloadInvoicePdf(req, res, next) {
  try {
    const { id } = invoiceIdParamSchema.parse(req.params);
    await invoiceService.streamInvoicePdf(id, req.user, res);
  } catch (err) {
    next(err);
  }
}

/**
 * Customer portal shortcut handler for GET /api/v1/me/invoices
 */
export async function getMyInvoices(req, res, next) {
  try {
    const validatedQuery = listInvoicesQuerySchema.parse(req.query);
    const result = await invoiceService.listInvoices(validatedQuery, req.user);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}
