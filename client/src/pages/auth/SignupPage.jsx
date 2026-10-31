import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { authApi } from '../../api/auth.js';
import { getErrorMessage } from '../../api/client.js';
import Input from '../../components/Input.jsx';
import Button from '../../components/Button.jsx';
import PasswordChecklist from '../../components/PasswordChecklist.jsx';
import { Sparkles } from 'lucide-react';

const clientSignupSchema = z.object({
  first_name: z.string().min(1, 'First name is required').trim(),
  last_name: z.string().min(1, 'Last name is required').trim(),
  email: z.string().email('Please enter a valid email address').trim(),
  password: z
    .string()
    .min(9, 'Password must be more than 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
  company: z.string().optional(),
  phone: z.string().optional(),
});

export function SignupPage() {
  const { login } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(clientSignupSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      company: '',
      phone: '',
    },
  });

  const passwordValue = watch('password', '');

  const onSubmit = async (data) => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const response = await authApi.signup(data);
      login(response);
      success('Account created successfully! Welcome to Brightloop.');
      navigate('/my-subscriptions');
    } catch (err) {
      const msg = getErrorMessage(err);
      setErrorMessage(msg);
      toastError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="flex justify-center">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30">
            <Sparkles className="w-7 h-7" />
          </div>
        </div>
        <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-slate-900">
          Create Customer Account
        </h2>
        <p className="mt-1 text-center text-sm text-slate-500">
          Sign up to manage your subscriptions and invoices
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200 sm:px-10">
          {errorMessage && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700 font-medium">
              {errorMessage}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="First Name"
                placeholder="Jane"
                error={errors.first_name?.message}
                required
                {...register('first_name')}
              />
              <Input
                label="Last Name"
                placeholder="Doe"
                error={errors.last_name?.message}
                required
                {...register('last_name')}
              />
            </div>

            <Input
              label="Email Address"
              type="email"
              placeholder="jane@example.com"
              error={errors.email?.message}
              required
              {...register('email')}
            />

            <div>
              <Input
                label="Password"
                type="password"
                placeholder="••••••••"
                error={errors.password?.message}
                required
                {...register('password')}
              />
              {/* Live Password Requirements Checklist */}
              <PasswordChecklist password={passwordValue} />
            </div>

            <Input
              label="Company (Optional)"
              placeholder="Acme Corp"
              error={errors.company?.message}
              {...register('company')}
            />

            <Input
              label="Phone Number (Optional)"
              placeholder="+1-555-0123"
              error={errors.phone?.message}
              {...register('phone')}
            />

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              Complete Registration
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            Already have an account?{' '}
            <Link
              to="/login"
              className="font-semibold text-indigo-600 hover:text-indigo-500"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SignupPage;

