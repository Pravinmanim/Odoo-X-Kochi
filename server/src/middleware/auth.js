import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import prisma from '../database/prisma.js';

/**
 * Verifies JWT token and attaches the authenticated user to req.user
 */
export async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('Authentication token missing or invalid format.');
    }

    const token = authHeader.split(' ')[1];
    let decoded;
    try {
      decoded = jwt.verify(token, config.jwt.secret);
    } catch (jwtErr) {
      if (jwtErr.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Token has expired. Please log in again.');
      }
      throw new UnauthorizedError('Invalid authentication token.');
    }

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      include: { customer: true },
    });

    if (!user) {
      throw new UnauthorizedError('User account not found or has been deactivated.');
    }

    // Attach user (with linked customer if present)
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
      customer_id: user.customer?.id || null,
    };

    return next();
  } catch (error) {
    return next(error);
  }
}

/**
 * Enforces role-based access control.
 * Example: requireRole('ADMIN') or requireRole('ADMIN', 'STAFF')
 */
export function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required.'));
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new ForbiddenError(
          `Access forbidden. Requires one of the following roles: ${allowedRoles.join(', ')}`
        )
      );
    }

    return next();
  };
}

/**
 * Helper to ensure a customer only accesses their own records.
 * Admin and Staff bypass the check.
 */
export function checkOwnership(resourceCustomerId, reqUser) {
  if (!reqUser) return false;
  if (reqUser.role === 'ADMIN' || reqUser.role === 'STAFF') {
    return true;
  }
  if (reqUser.role === 'CUSTOMER') {
    return reqUser.customer_id === resourceCustomerId;
  }
  return false;
}

