import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '../../components/Modal.jsx';
import Button from '../../components/Button.jsx';
import Input from '../../components/Input.jsx';
import Select from '../../components/Select.jsx';

const discountFormSchema = z
  .object({
    code: z
      .string()
      .min(1, 'Discount code is required')
      .trim()
      .transform((val) => val.toUpperCase()),
    type: z.enum(['PERCENTAGE', 'FIXED']),
    value: z.coerce.number().min(0, 'Discount value cannot be negative'),
    min_purchase: z.coerce.number().min(0, 'Minimum purchase cannot be negative').default(0),
    min_quantity: z.coerce.number().int().min(1, 'Minimum quantity must be at least 1').default(1),
    scope: z.enum(['SUBSCRIPTION', 'PRODUCT']),
    start_date: z.string().optional().nullable(),
    end_date: z.string().optional().nullable(),
    usage_limit: z
      .union([z.string().length(0), z.coerce.number().int().min(1)])
      .optional()
      .nullable()
      .transform((val) => (val === '' || val === null || val === undefined ? null : Number(val))),
    is_active: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.type === 'PERCENTAGE' && data.value > 100) {
        return false;
      }
      return true;
    },
    {
      message: 'Percentage rate cannot exceed 100%',
      path: ['value'],
    }
  )
  .refine(
    (data) => {
      if (data.start_date && data.end_date) {
        return new Date(data.end_date) >= new Date(data.start_date);
      }
      return true;
    },
    {
      message: 'End date must be on or after start date',
      path: ['end_date'],
    }
  );

export default function DiscountModal({ isOpen, onClose, onSave, discount = null, isLoading = false }) {
  const isEdit = Boolean(discount);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(discountFormSchema),
    defaultValues: {
      code: '',
      type: 'PERCENTAGE',
      value: 10,
      min_purchase: 0,
      min_quantity: 1,
      scope: 'SUBSCRIPTION',
      start_date: '',
      end_date: '',
      usage_limit: '',
      is_active: true,
    },
  });

  const selectedType = watch('type');

  useEffect(() => {
    if (discount) {
      reset({
        code: discount.code || '',
        type: discount.type || 'PERCENTAGE',
        value: discount.value ?? 0,
        min_purchase: discount.min_purchase ?? 0,
        min_quantity: discount.min_quantity ?? 1,
        scope: discount.scope || 'SUBSCRIPTION',
        start_date: discount.start_date ? discount.start_date.slice(0, 10) : '',
        end_date: (discount.expires_at || discount.end_date) ? (discount.expires_at || discount.end_date).slice(0, 10) : '',
        usage_limit: discount.max_redemptions ?? discount.usage_limit ?? '',
        is_active: discount.is_active ?? true,
      });
    } else {
      reset({
        code: '',
        type: 'PERCENTAGE',
        value: 10,
        min_purchase: 0,
        min_quantity: 1,
        scope: 'SUBSCRIPTION',
        start_date: '',
        end_date: '',
        usage_limit: '',
        is_active: true,
      });
    }
  }, [discount, reset, isOpen]);

  const onSubmit = (values) => {
    const payload = {
      ...values,
      start_date: values.start_date ? new Date(values.start_date).toISOString() : null,
      end_date: values.end_date ? new Date(values.end_date).toISOString() : null,
      expires_at: values.end_date ? new Date(values.end_date).toISOString() : null,
      max_redemptions: values.usage_limit || null,
    };
    onSave(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Discount Code' : 'Create Discount Code'}
      size="lg"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Discount Code"
            placeholder="e.g. WELCOME20, BLACKFRIDAY"
            error={errors.code?.message}
            required
            className="uppercase font-mono"
            {...register('code')}
          />

          <Select
            label="Discount Type"
            error={errors.type?.message}
            options={[
              { value: 'PERCENTAGE', label: 'Percentage (%)' },
              { value: 'FIXED', label: 'Fixed Amount ($)' },
            ]}
            {...register('type')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label={selectedType === 'PERCENTAGE' ? 'Discount Value (%)' : 'Discount Value ($)'}
            type="number"
            step="0.01"
            min="0"
            max={selectedType === 'PERCENTAGE' ? '100' : undefined}
            placeholder={selectedType === 'PERCENTAGE' ? 'e.g. 15 for 15%' : 'e.g. 25.00 for $25'}
            error={errors.value?.message}
            required
            {...register('value')}
          />

          <Select
            label="Application Scope"
            error={errors.scope?.message}
            options={[
              { value: 'SUBSCRIPTION', label: 'Whole Subscription Order' },
              { value: 'PRODUCT', label: 'Specific Products Only' },
            ]}
            {...register('scope')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Min Purchase Amount ($)"
            type="number"
            step="0.01"
            min="0"
            placeholder="0 for no minimum"
            error={errors.min_purchase?.message}
            {...register('min_purchase')}
          />

          <Input
            label="Min Product Quantity"
            type="number"
            min="1"
            placeholder="1"
            error={errors.min_quantity?.message}
            {...register('min_quantity')}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Start Date"
            type="date"
            error={errors.start_date?.message}
            {...register('start_date')}
          />

          <Input
            label="End / Expiry Date"
            type="date"
            error={errors.end_date?.message}
            {...register('end_date')}
          />

          <Input
            label="Usage Limit (Max Uses)"
            type="number"
            min="1"
            placeholder="Unlimited if empty"
            error={errors.usage_limit?.message}
            {...register('usage_limit')}
          />
        </div>

        <div className="flex items-center space-x-2 pt-2">
          <input
            id="discount-is-active"
            type="checkbox"
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            {...register('is_active')}
          />
          <label htmlFor="discount-is-active" className="text-sm font-medium text-slate-700 cursor-pointer">
            Active and redeemable
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose} disabled={isLoading} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={isLoading}>
            {isEdit ? 'Save Changes' : 'Create Discount'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

