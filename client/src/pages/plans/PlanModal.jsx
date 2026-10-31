import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '../../components/Modal.jsx';
import Button from '../../components/Button.jsx';
import Input from '../../components/Input.jsx';
import Select from '../../components/Select.jsx';

const planFormSchema = z
  .object({
    name: z.string().min(1, 'Plan name is required').trim(),
    billing_period: z.enum(['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY']),
    price: z.coerce.number().min(0, 'Price must be 0 or greater'),
    description: z.string().optional().nullable(),
    min_quantity: z.coerce.number().int().min(1, 'Minimum quantity must be at least 1').default(1),
    available_from: z.string().optional().nullable(),
    available_to: z.string().optional().nullable(),
    auto_close: z.boolean().default(false),
    closable: z.boolean().default(true),
    pausable: z.boolean().default(true),
    renewable: z.boolean().default(true),
    is_active: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.available_from && data.available_to) {
        return new Date(data.available_to) >= new Date(data.available_from);
      }
      return true;
    },
    {
      message: 'Available To must be on or after Available From',
      path: ['available_to'],
    }
  );

export default function PlanModal({ isOpen, onClose, onSave, plan = null, isLoading = false }) {
  const isEdit = Boolean(plan);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      name: '',
      billing_period: 'MONTHLY',
      price: 0,
      description: '',
      min_quantity: 1,
      available_from: '',
      available_to: '',
      auto_close: false,
      closable: true,
      pausable: true,
      renewable: true,
      is_active: true,
    },
  });

  useEffect(() => {
    if (plan) {
      reset({
        name: plan.name || '',
        billing_period: plan.billing_period || 'MONTHLY',
        price: plan.price ?? 0,
        description: plan.description || '',
        min_quantity: plan.min_quantity ?? 1,
        available_from: plan.available_from ? plan.available_from.slice(0, 10) : '',
        available_to: plan.available_to ? plan.available_to.slice(0, 10) : '',
        auto_close: Boolean(plan.auto_close),
        closable: plan.closable ?? true,
        pausable: plan.pausable ?? true,
        renewable: plan.renewable ?? true,
        is_active: plan.is_active ?? true,
      });
    } else {
      reset({
        name: '',
        billing_period: 'MONTHLY',
        price: 0,
        description: '',
        min_quantity: 1,
        available_from: '',
        available_to: '',
        auto_close: false,
        closable: true,
        pausable: true,
        renewable: true,
        is_active: true,
      });
    }
  }, [plan, reset, isOpen]);

  const onSubmit = (values) => {
    const payload = {
      ...values,
      available_from: values.available_from ? new Date(values.available_from).toISOString() : null,
      available_to: values.available_to ? new Date(values.available_to).toISOString() : null,
    };
    onSave(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Plan' : 'Create New Plan'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Plan Name"
            placeholder="e.g. Enterprise Monthly"
            error={errors.name?.message}
            required
            {...register('name')}
          />

          <Select
            label="Billing Period"
            error={errors.billing_period?.message}
            options={[
              { value: 'DAILY', label: 'Daily' },
              { value: 'WEEKLY', label: 'Weekly' },
              { value: 'MONTHLY', label: 'Monthly' },
              { value: 'YEARLY', label: 'Yearly' },
            ]}
            {...register('billing_period')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Price ($)"
            type="number"
            step="0.01"
            min="0"
            error={errors.price?.message}
            required
            {...register('price')}
          />

          <Input
            label="Minimum Quantity"
            type="number"
            min="1"
            error={errors.min_quantity?.message}
            required
            {...register('min_quantity')}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
          <textarea
            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-slate-900 bg-white"
            rows="2"
            placeholder="Plan details and features..."
            {...register('description')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Available From"
            type="date"
            error={errors.available_from?.message}
            {...register('available_from')}
          />

          <Input
            label="Available To"
            type="date"
            error={errors.available_to?.message}
            {...register('available_to')}
          />
        </div>

        <div className="border-t border-slate-200 pt-3">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2 block">
            Plan Policy Rules
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <label className="flex items-center space-x-2 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                {...register('pausable')}
              />
              <span>Pausable</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                {...register('closable')}
              />
              <span>Closable</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                {...register('renewable')}
              />
              <span>Renewable</span>
            </label>

            <label className="flex items-center space-x-2 cursor-pointer text-slate-700">
              <input
                type="checkbox"
                className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                {...register('auto_close')}
              />
              <span>Auto-close</span>
            </label>
          </div>
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <input
            id="plan-is-active"
            type="checkbox"
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            {...register('is_active')}
          />
          <label htmlFor="plan-is-active" className="text-sm font-medium text-slate-700 cursor-pointer">
            Active and visible in catalog
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose} disabled={isLoading} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={isLoading}>
            {isEdit ? 'Save Changes' : 'Create Plan'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

