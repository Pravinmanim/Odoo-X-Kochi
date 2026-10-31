import * as discountService from './discount.service.js';

export async function listDiscounts(req, res, next) {
  try {
    const result = await discountService.listDiscounts(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getDiscount(req, res, next) {
  try {
    const discount = await discountService.getDiscountById(req.params.id);
    res.status(200).json({ data: discount });
  } catch (error) {
    next(error);
  }
}

export async function createDiscount(req, res, next) {
  try {
    const discount = await discountService.createDiscount(req.body);
    res.status(201).json({
      message: 'Discount created successfully',
      data: discount,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateDiscount(req, res, next) {
  try {
    const discount = await discountService.updateDiscount(req.params.id, req.body);
    res.status(200).json({
      message: 'Discount updated successfully',
      data: discount,
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleDiscount(req, res, next) {
  try {
    const discount = await discountService.toggleDiscountStatus(req.params.id);
    res.status(200).json({
      message: `Discount ${discount.is_active ? 'activated' : 'deactivated'} successfully`,
      data: discount,
    });
  } catch (error) {
    next(error);
  }
}

export async function deleteDiscount(req, res, next) {
  try {
    const result = await discountService.deleteDiscount(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

