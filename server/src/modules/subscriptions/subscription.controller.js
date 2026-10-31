import * as subscriptionService from './subscription.service.js';
import { checkOwnership } from '../../middleware/auth.js';
import { ForbiddenError } from '../../utils/errors.js';

export async function listSubscriptions(req, res, next) {
  try {
    const result = await subscriptionService.listSubscriptions(req.query);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function getSubscription(req, res, next) {
  try {
    const subscription = await subscriptionService.getSubscriptionById(req.params.id);

    // Ownership check for CUSTOMER role
    if (!checkOwnership(subscription.customer_id, req.user)) {
      throw new ForbiddenError('You do not have permission to view this subscription.');
    }

    res.status(200).json({ data: subscription });
  } catch (error) {
    next(error);
  }
}

export async function getSubscriptionHistory(req, res, next) {
  try {
    const subscription = await subscriptionService.getSubscriptionById(req.params.id);

    // Ownership check for CUSTOMER role
    if (!checkOwnership(subscription.customer_id, req.user)) {
      throw new ForbiddenError('You do not have permission to view history for this subscription.');
    }

    const history = await subscriptionService.getSubscriptionHistory(req.params.id);
    res.status(200).json({ data: history });
  } catch (error) {
    next(error);
  }
}

export async function createSubscription(req, res, next) {
  try {
    const subscription = await subscriptionService.createSubscription(req.body, req.user);
    res.status(201).json({
      message: 'Subscription created successfully',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
}

export async function createFromTemplate(req, res, next) {
  try {
    const subscription = await subscriptionService.createSubscriptionFromTemplate(
      req.params.templateId,
      req.body,
      req.user
    );
    res.status(201).json({
      message: 'Subscription created from template successfully',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
}

export async function quote(req, res, next) {
  try {
    const subscription = await subscriptionService.quoteSubscription(
      req.params.id,
      req.user,
      req.body?.reason
    );
    res.status(200).json({
      message: 'Subscription moved to QUOTATION status',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
}

export async function confirm(req, res, next) {
  try {
    const subscription = await subscriptionService.confirmSubscription(
      req.params.id,
      req.user,
      req.body?.reason
    );
    res.status(200).json({
      message: 'Subscription confirmed successfully',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
}

export async function activate(req, res, next) {
  try {
    const subscription = await subscriptionService.activateSubscription(
      req.params.id,
      req.user,
      req.body?.reason
    );
    res.status(200).json({
      message: 'Subscription activated successfully',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
}

export async function close(req, res, next) {
  try {
    const subscription = await subscriptionService.closeSubscription(
      req.params.id,
      req.user,
      req.body?.reason
    );
    res.status(200).json({
      message: 'Subscription closed',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
}

export async function pause(req, res, next) {
  try {
    const subscription = await subscriptionService.pauseSubscription(
      req.params.id,
      req.user,
      req.body?.reason
    );
    res.status(200).json({
      message: 'Subscription paused',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
}

export async function resume(req, res, next) {
  try {
    const subscription = await subscriptionService.resumeSubscription(
      req.params.id,
      req.user,
      req.body?.reason
    );
    res.status(200).json({
      message: 'Subscription resumed',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
}

export async function renew(req, res, next) {
  try {
    const subscription = await subscriptionService.renewSubscription(
      req.params.id,
      req.user,
      req.body?.reason
    );
    res.status(200).json({
      message: 'Subscription renewed successfully',
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * Controller for GET /api/v1/me/subscriptions
 */
export async function getMySubscriptions(req, res, next) {
  try {
    if (!req.user.customer_id) {
      return res.status(200).json({
        data: [],
        page: 1,
        limit: 10,
        total: 0,
        totalPages: 0,
      });
    }

    const result = await subscriptionService.listCustomerSubscriptions(
      req.user.customer_id,
      req.query
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}
