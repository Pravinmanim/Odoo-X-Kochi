import { AppError } from '../utils/errors.js';
import { ZodError } from 'zod';

export function errorHandler(err, req, res, next) {
  // If headers already sent, delegate to standard Express error handler
  if (res.headersSent) {
    return next(err);
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    const fields = {};
    for (const issue of err.issues) {
      const path = issue.path.join('.');
      fields[path] = issue.message;
    }
    return res.status(422).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed for one or more fields.',
        fields,
      },
    });
  }

  // AppError instance (known operational error)
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        code: err.code,
        message: err.message,
        fields: err.fields || undefined,
      },
    });
  }

  // Prisma unique constraint violation (P2002)
  if (err.code === 'P2002') {
    const target = err.meta?.target ? err.meta.target.join(', ') : 'Field';
    return res.status(409).json({
      error: {
        code: 'CONFLICT',
        message: `${target} already exists.`,
        fields: err.meta?.target || undefined,
      },
    });
  }

  // Prisma record not found (P2025)
  if (err.code === 'P2025') {
    return res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: err.meta?.cause || 'Requested record was not found.',
      },
    });
  }

  // Handle SyntaxError (e.g. malformed JSON body)
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return res.status(400).json({
      error: {
        code: 'MALFORMED_JSON',
        message: 'Invalid JSON payload received.',
      },
    });
  }

  // Unhandled / Internal Server Error
  console.error('[Unhandled Server Error]:', err);
  const isDev = process.env.NODE_ENV === 'development';

  return res.status(500).json({
    error: {
      code: 'INTERNAL_SERVER_ERROR',
      message: isDev ? err.message : 'An unexpected internal error occurred.',
      fields: isDev ? { stack: err.stack } : undefined,
    },
  });
}

