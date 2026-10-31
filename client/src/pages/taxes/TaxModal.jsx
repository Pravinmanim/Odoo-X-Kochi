import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '../../components/Modal.jsx';
import Button from '../../components/Button.jsx';
import Input from '../../components/Input.jsx';

const taxFormSchema = z.object({
  name: z.string().min(1, 'Tax name is required').trim(),
  rate_percent: z
    .coerce
    .number()
    .min(0, 'Tax rate cannot be negative')
    .max(100, 'Tax rate cannot exceed 100%'),
  is_active: z.boolean().default(true),
});

export default function TaxModal({ isOpen, onClose, onSave, tax = null, isLoading = false }) {
  const isEdit = Boolean(tax);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(taxFormSchema),
    defaultValues: {
      name: '',
      rate_percent: 0,
      is_active: true,
    },
  });

  useEffect(() => {
    if (tax) {
      reset({
        name: tax.name || '',
        rate_percent: tax.rate_percent ?? tax.rate ?? 0,
        is_active: tax.is_active ?? true,
      });
    } else {
      reset({
        name: '',
        rate_percent: 0,
        is_active: true,
      });
    }
  }, [tax, reset, isOpen]);

  const onSubmit = (values) => {
    onSave(values);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Edit Tax Rate' : 'Create Tax Rate'}
      size="md"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Tax Name"
          placeholder="e.g. Standard VAT (18%) or GST"
          error={errors.name?.message}
          required
          {...register('name')}
        />

        <Input
          label="Tax Percentage (%)"
          type="number"
          step="0.01"
          min="0"
          max="100"
          placeholder="e.g. 18.00"
          error={errors.rate_percent?.message}
          required
          {...register('rate_percent')}
        />

        <div className="flex items-center space-x-2 pt-2">
          <input
            id="tax-is-active"
            type="checkbox"
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            {...register('is_active')}
          />
          <label htmlFor="tax-is-active" className="text-sm font-medium text-slate-700 cursor-pointer">
            Active and selectable for billing invoices
          </label>
        </div>

        <div className="flex justify-end space-x-3 pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose} disabled={isLoading} type="button">
            Cancel
          </Button>
          <Button variant="primary" type="submit" loading={isLoading}>
            {isEdit ? 'Save Changes' : 'Create Tax'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

