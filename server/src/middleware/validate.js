import { ZodError } from 'zod';
import { ValidationError } from '../utils/errors.js';

/**
 * Higher-order middleware function to validate req.body, req.query, or req.params using a Zod schema.
 */
export function validate(schema, source = 'body') {
  return async (req, res, next) => {
    try {
      const dataToValidate = req[source];
      const parsed = await schema.parseAsync(dataToValidate);
      req[source] = parsed;
      return next();
    } catch (err) {
      if (err instanceof ZodError) {
        const fields = {};
        for (const issue of err.issues) {
          const path = issue.path.join('.') || 'root';
          fields[path] = issue.message;
        }
        return next(new ValidationError('Validation failed for the submitted data.', fields));
      }
      return next(err);
    }
  };
}

