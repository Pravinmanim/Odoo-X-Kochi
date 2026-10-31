import * as planService from './plan.service.js';

export async function listPlans(req, res, next) {
  try {
    const result = await planService.listPlans(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getAvailablePlans(req, res, next) {
  try {
    const plans = await planService.getAvailablePlans();
    res.status(200).json({ data: plans });
  } catch (error) {
    next(error);
  }
}

export async function getPlan(req, res, next) {
  try {
    const plan = await planService.getPlanById(req.params.id);
    res.status(200).json({ data: plan });
  } catch (error) {
    next(error);
  }
}

export async function createPlan(req, res, next) {
  try {
    const plan = await planService.createPlan(req.body);
    res.status(201).json({
      message: 'Plan created successfully',
      data: plan,
    });
  } catch (error) {
    next(error);
  }
}

export async function updatePlan(req, res, next) {
  try {
    const plan = await planService.updatePlan(req.params.id, req.body);
    res.status(200).json({
      message: 'Plan updated successfully',
      data: plan,
    });
  } catch (error) {
    next(error);
  }
}

export async function togglePlan(req, res, next) {
  try {
    const plan = await planService.togglePlanStatus(req.params.id);
    res.status(200).json({
      message: `Plan ${plan.is_active ? 'activated' : 'deactivated'} successfully`,
      data: plan,
    });
  } catch (error) {
    next(error);
  }
}

export async function deletePlan(req, res, next) {
  try {
    const result = await planService.deletePlan(req.params.id);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

