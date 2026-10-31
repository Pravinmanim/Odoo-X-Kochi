import * as customerService from './customer.service.js';

export async function listCustomers(req, res, next) {
  try {
    const result = await customerService.listCustomers(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getCustomer(req, res, next) {
  try {
    const customer = await customerService.getCustomerById(req.params.id);
    res.status(200).json({ data: customer });
  } catch (error) {
    next(error);
  }
}

export async function createCustomer(req, res, next) {
  try {
    const customer = await customerService.createCustomer(req.body);
    res.status(201).json({
      message: 'Customer created successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateCustomer(req, res, next) {
  try {
    const customer = await customerService.updateCustomer(req.params.id, req.body);
    res.status(200).json({
      message: 'Customer updated successfully',
      data: customer,
    });
  } catch (error) {
    next(error);
  }
}
