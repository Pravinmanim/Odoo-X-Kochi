import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { authApi } from '../../api/auth.js';
import { getErrorMessage } from '../../api/client.js';
import Input from '../../components/Input.jsx';
import Button from '../../components/Button.jsx';
import { Sparkles, Shield, User, KeyRound } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export function LoginPage() {
  const { login } = useAuth();
  const { success, error: toastError } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [genericError, setGenericError] = useState('');

  const redirectUrl = searchParams.get('redirect') || '/';

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    setGenericError('');
    try {
      const response = await authApi.login(data);
      login(response);
      success(`Welcome back, ${response.user.first_name || response.user.email}!`);
      
      // Navigate based on role
      if (response.user.role === 'CUSTOMER') {
        navigate('/my-subscriptions');
      } else {
        navigate(redirectUrl === '/' ? '/products' : redirectUrl);
      }
    } catch (err) {
      const msg = getErrorMessage(err);
      setGenericError(msg);
      toastError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const fillDemoCredentials = (email, password) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', password, { shouldValidate: true });
    setGenericError('');
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
          Brightloop Subscriptions
        </h2>
        <p className="mt-1 text-center text-sm text-slate-500">
          Sign in to your account
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl shadow-slate-200/50 rounded-2xl border border-slate-200 sm:px-10">
          {genericError && (
            <div className="mb-5 p-3.5 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700 font-medium">
              {genericError}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <Input
              label="Email Address"
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              error={errors.email?.message}
              required
              {...register('email')}
            />

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-slate-700">
                  Password <span className="text-rose-500">*</span>
                </label>
                <Link
                  to="/forgot-password"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-500"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                className={`w-full px-3.5 py-2 text-sm bg-white border rounded-lg transition-colors placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 ${
                  errors.password ? 'border-rose-400 focus:ring-rose-500' : 'border-slate-300'
                }`}
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-rose-600 font-medium mt-1">
                  {errors.password.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              variant="primary"
              className="w-full mt-2"
              isLoading={isLoading}
            >
              Sign In
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-slate-600">
            Don't have an account?{' '}
            <Link
              to="/signup"
              className="font-semibold text-indigo-600 hover:text-indigo-500"
            >
              Sign up as a customer
            </Link>
          </div>

          {/* Quick Demo Credentials for Reviewers */}
          <div className="mt-8 pt-6 border-t border-slate-100">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2.5 text-center">
              Quick Demo Logins
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => fillDemoCredentials('admin@brightloop.com', 'AdminPassword123!')}
                className="px-2.5 py-1.5 text-xs font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition-colors flex items-center justify-center gap-1"
              >
                <Shield className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                Admin
              </button>
              <button
                type="button"
                onClick={() => fillDemoCredentials('staff@brightloop.com', 'StaffPassword123!')}
                className="px-2.5 py-1.5 text-xs font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition-colors flex items-center justify-center gap-1"
              >
                <KeyRound className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                Staff
              </button>
              <button
                type="button"
                onClick={() => fillDemoCredentials('customer@brightloop.com', 'CustomerPassword123!')}
                className="px-2.5 py-1.5 text-xs font-medium bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700 transition-colors flex items-center justify-center gap-1"
              >
                <User className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                Customer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;

