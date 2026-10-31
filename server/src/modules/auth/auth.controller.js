import * as authService from './auth.service.js';

export async function signup(req, res, next) {
  try {
    const result = await authService.signupCustomer(req.body);
    res.status(201).json({
      message: 'Account created successfully',
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const result = await authService.loginUser(req.body);
    res.status(200).json({
      message: 'Logged in successfully',
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req, res, next) {
  try {
    const result = await authService.requestPasswordReset(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req, res, next) {
  try {
    const result = await authService.resetPassword(req.body);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function me(req, res, next) {
  try {
    const result = await authService.getCurrentUser(req.user.id);
    res.status(200).json({
      user: result,
    });
  } catch (error) {
    next(error);
  }
}

