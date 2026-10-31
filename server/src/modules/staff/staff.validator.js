import { z } from 'zod';
import { passwordSchema } from '../auth/auth.validator.js';

export const createStaffSchema = z.object({
  email: z
    .string()
    .email('Please provide a valid email address')
    .transform((val) => val.trim().toLowerCase()),
  password: passwordSchema,
  first_name: z.string().min(1, 'First name is required').trim(),
  last_name: z.string().min(1, 'Last name is required').trim(),
});

