import * as taxService from './tax.service.js';

export async function listTaxes(req, res, next) {
  try {
    const result = await taxService.listTaxes(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getTax(req, res, next) {
  try {
    const tax = await taxService.getTaxById(req.params.id);
    res.status(200).json({ data: tax });
  } catch (error) {
    next(error);
  }
}

export async function createTax(req, res, next) {
  try {
    const tax = await taxService.createTax(req.body);
    res.status(201).json({
      message: 'Tax created successfully',
      data: tax,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateTax(req, res, next) {
  try {
    const tax = await taxService.updateTax(req.params.id, req.body);
    res.status(200).json({
      message: 'Tax updated successfully',
      data: tax,
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleTax(req, res, next) {
  try {
    const tax = await taxService.toggleTaxStatus(req.params.id);
    res.status(200).json({
      message: `Tax ${tax.is_active ? 'activated' : 'deactivated'} successfully`,
      data: tax,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteTax(req, res, next) {
  try {
    const result = await taxService.deleteTax(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

