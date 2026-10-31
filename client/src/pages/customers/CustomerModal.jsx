import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Modal from '../../components/Modal.jsx';
import Input from '../../components/Input.jsx';
import Button from '../../components/Button.jsx';

const customerFormSchema = z.object({
  name: z.string().min(1, 'Customer name is required').trim(),
  email: z.string().email('Valid email is required').trim(),
  phone: z
    .string()
    .trim()
    .regex(/^\d{10}$/, 'Phone number must be exactly 10 digits')
    .optional()
    .nullable()
    .or(z.literal('')),
  company: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
});

export function CustomerModal({ isOpen, onClose, onSave, customer = null, isLoading = false }) {
  const isEditing = !!customer;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(customerFormSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      company: '',
      address: '',
      city: '',
      country: '',
    },
  });

  useEffect(() => {
    if (customer) {
      reset({
        name: customer.name || '',
        email: customer.email || '',
        phone: customer.phone || '',
        company: customer.company || '',
        address: customer.address || '',
        city: customer.city || '',
        country: customer.country || '',
      });
    } else {
      reset({
        name: '',
        email: '',
        phone: '',
        company: '',
        address: '',
        city: '',
        country: '',
      });
    }
  }, [customer, reset, isOpen]);

  const onSubmit = (data) => {
    onSave(data);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={isEditing ? 'Edit Customer' : 'Add New Customer'}
      description="Enter contact details and business information"
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Full Name / Primary Contact"
          placeholder="e.g. Jane Doe"
          error={errors.name?.message}
          required
          {...register('name')}
        />

        <Input
          label="Email Address"
          type="email"
          placeholder="jane@company.com"
          error={errors.email?.message}
          required
          {...register('email')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="Company"
            placeholder="Acme Corp"
            error={errors.company?.message}
            {...register('company')}
          />
          <Input
            label="Phone"
            placeholder="10 digit number"
            inputMode="numeric"
            maxLength={10}
            error={errors.phone?.message}
            {...register('phone', {
              onChange: (e) => {
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
              },
            })}
          />
        </div>

        <Input
          label="Street Address"
          placeholder="123 Market St, Suite 400"
          error={errors.address?.message}
          {...register('address')}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Input
            label="City"
            placeholder="San Francisco"
            error={errors.city?.message}
            {...register('city')}
          />
          <Input
            label="Country"
            placeholder="United States"
            error={errors.country?.message}
            {...register('country')}
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
          <Button variant="secondary" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            {isEditing ? 'Save Changes' : 'Create Customer'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

export default CustomerModal;
