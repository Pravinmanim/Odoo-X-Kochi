import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../../database/prisma.js';
import { config } from '../../config/env.js';
import { ConflictError, UnauthorizedError } from '../../utils/errors.js';
import { sendPasswordResetEmail } from '../../utils/mailer.js';

const SALT_ROUNDS = 10;

/**
 * Hash raw token using SHA-256 for secure database storage
 */
function hashToken(rawToken) {
  return crypto.createHash('sha256').update(rawToken).digest('hex');
}

/**
 * Generates JWT access token
 */
function generateToken(user) {
  return jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    config.jwt.secret,
    { expiresIn: config.jwt.expiresIn }
  );
}

/**
 * Signup customer
 */
export async function signupCustomer(data) {
  const email = data.email.toLowerCase().trim();

  // Check unique email
  const existing = await prisma.user.findUnique({
    where: { email },
  });

  if (existing) {
    throw new ConflictError('An account with this email address already exists.');
  }

  const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

  // Create user with CUSTOMER role and linked Customer record in an atomic transaction
  const result = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email,
        password: hashedPassword,
        role: 'CUSTOMER',
        first_name: data.first_name,
        last_name: data.last_name,
      },
    });

    const customer = await tx.customer.create({
      data: {
        user_id: user.id,
        name: `${data.first_name} ${data.last_name}`.trim(),
        email: user.email,
        phone: data.phone || null,
        company: data.company || null,
      },
    });

    return { user, customer };
  });

  const token = generateToken(result.user);

  return {
    token,
    user: {
      id: result.user.id,
      email: result.user.email,
      role: result.user.role,
      first_name: result.user.first_name,
      last_name: result.user.last_name,
      customer_id: result.customer.id,
    },
  };
}

/**
 * User login with generic error message
 */
export async function loginUser({ email, password }) {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
    include: { customer: true },
  });

  // Generic message prevents email enumeration
  if (!user) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  const token = generateToken(user);

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      first_name: user.first_name,
      last_name: user.last_name,
      customer_id: user.customer?.id || null,
    },
  };
}

/**
 * Forgot password - single use token, 30m expiry, silent response
 */
export async function requestPasswordReset({ email }) {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizedEmail },
  });

  // Even if user doesn't exist, return success to prevent email discovery
  if (!user) {
    return {
      message: 'If an account matches that email, a password reset link has been dispatched.',
    };
  }

  // Generate cryptographically secure random token
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

  // Invalidate any existing unused reset tokens for this user
  await prisma.passwordResetToken.updateMany({
    where: { user_id: user.id, used: false },
    data: { used: true },
  });

  // Save hashed token
  await prisma.passwordResetToken.create({
    data: {
      user_id: user.id,
      token_hash: tokenHash,
      expires_at: expiresAt,
    },
  });

  const resetUrl = `${config.clientUrl}/reset-password?token=${rawToken}`;
  await sendPasswordResetEmail({ to: user.email, resetUrl });

  return {
    message: 'If an account matches that email, a password reset link has been dispatched.',
  };
}

/**
 * Reset password using token
 */
export async function resetPassword({ token, password }) {
  const tokenHash = hashToken(token);

  const resetRecord = await prisma.passwordResetToken.findUnique({
    where: { token_hash: tokenHash },
    include: { user: true },
  });

  if (!resetRecord || resetRecord.used || new Date() > resetRecord.expires_at) {
    throw new UnauthorizedError('The password reset token is invalid or has expired.');
  }

  const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

  // Update password and mark token as used
  await prisma.$transaction([
    prisma.user.update({
      where: { id: resetRecord.user_id },
      data: { password: hashedPassword },
    }),
    prisma.passwordResetToken.update({
      where: { id: resetRecord.id },
      data: { used: true },
    }),
  ]);

  return {
    message: 'Your password has been successfully reset. You may now log in.',
  };
}

/**
 * Get current authenticated user
 */
export async function getCurrentUser(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: { customer: true },
  });

  if (!user) {
    throw new UnauthorizedError('User not found.');
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    first_name: user.first_name,
    last_name: user.last_name,
    customer_id: user.customer?.id || null,
  };
}
