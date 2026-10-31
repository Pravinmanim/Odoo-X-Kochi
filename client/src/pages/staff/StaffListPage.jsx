import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { staffApi } from '../../api/auth.js';
import { getErrorMessage } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import Table, { TableRow, TableCell } from '../../components/Table.jsx';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import Input from '../../components/Input.jsx';
import Modal from '../../components/Modal.jsx';
import Loader from '../../components/Loader.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import PasswordChecklist from '../../components/PasswordChecklist.jsx';
import { UserPlus, ShieldCheck } from 'lucide-react';

const createStaffSchema = z.object({
  first_name: z.string().min(1, 'First name is required').trim(),
  last_name: z.string().min(1, 'Last name is required').trim(),
  email: z.string().email('Please enter a valid email address').trim(),
  password: z
    .string()
    .min(9, 'Password must be more than 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Must contain at least one lowercase letter')
    .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
});

export function StaffListPage() {
  const [staffList, setStaffList] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const { success, error: toastError } = useToast();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(createStaffSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      password: '',
    },
  });

  const passwordValue = watch('password', '');

  const loadStaff = async () => {
    setIsLoading(true);
    try {
      const response = await staffApi.listStaff();
      setStaffList(response.data || []);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const handleOpenModal = () => {
    reset({
      first_name: '',
      last_name: '',
      email: '',
      password: '',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const onSubmit = async (data) => {
    setIsSubmitting(true);
    setFormError('');
    try {
      await staffApi.createStaff(data);
      success('Staff member created successfully!');
      setIsModalOpen(false);
      loadStaff();
    } catch (err) {
      const msg = getErrorMessage(err);
      setFormError(msg);
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Staff Members</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage operational team members who handle subscriptions and invoices
          </p>
        </div>
        <Button variant="primary" onClick={handleOpenModal} icon={UserPlus}>
          Add Staff Member
        </Button>
      </div>

      {/* Staff Table */}
      {isLoading ? (
        <Loader text="Loading staff directory..." />
      ) : staffList.length === 0 ? (
        <EmptyState
          title="No staff members registered"
          description="Create your first staff member to delegate subscription management operations."
          actionLabel="Add Staff Member"
          onAction={handleOpenModal}
          icon={ShieldCheck}
        />
      ) : (
        <Table headers={['Staff Name', 'Email', 'Role', 'Created At']}>
          {staffList.map((member) => (
            <TableRow key={member.id}>
              <TableCell className="font-semibold text-slate-900">
                {member.first_name} {member.last_name}
              </TableCell>
              <TableCell>{member.email}</TableCell>
              <TableCell>
                <Badge status={member.role} />
              </TableCell>
              <TableCell className="text-slate-500 text-xs">
                {new Date(member.created_at).toLocaleDateString()}
              </TableCell>
            </TableRow>
          ))}
        </Table>
      )}

      {/* Create Staff Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Staff Member"
        description="Provision a new staff account with operational privileges"
      >
        {formError && (
          <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
            {formError}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First Name"
              placeholder="John"
              error={errors.first_name?.message}
              required
              {...register('first_name')}
            />
            <Input
              label="Last Name"
              placeholder="Smith"
              error={errors.last_name?.message}
              required
              {...register('last_name')}
            />
          </div>

          <Input
            label="Staff Email"
            type="email"
            placeholder="john.smith@brightloop.com"
            error={errors.email?.message}
            required
            {...register('email')}
          />

          <div>
            <Input
              label="Temporary Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              required
              {...register('password')}
            />
            <PasswordChecklist password={passwordValue} />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={isSubmitting}>
              Create Staff Member
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

export default StaffListPage;

