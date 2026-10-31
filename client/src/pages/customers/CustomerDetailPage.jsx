import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { customersApi } from '../../api/customers.js';
import { getErrorMessage } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import Table, { TableRow, TableCell } from '../../components/Table.jsx';
import Loader from '../../components/Loader.jsx';
import CustomerModal from './CustomerModal.jsx';
import {
  ArrowLeft,
  Building,
  Mail,
  Phone,
  MapPin,
  CalendarCheck,
  Edit2,
  Package,
} from 'lucide-react';

export function CustomerDetailPage() {
  const { id } = useParams();
  const [customer, setCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { success, error: toastError } = useToast();

  const loadCustomer = async () => {
    setIsLoading(true);
    try {
      const response = await customersApi.get(id);
      setCustomer(response.data);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadCustomer();
  }, [id]);

  const handleSaveCustomer = async (data) => {
    setIsSaving(true);
    try {
      await customersApi.update(id, data);
      success('Customer profile updated.');
      setIsEditModalOpen(false);
      loadCustomer();
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <Loader text="Loading customer profile..." />;
  }

  if (!customer) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Customer not found.</p>
        <Link to="/customers" className="text-indigo-600 text-sm font-semibold mt-2 inline-block">
          &larr; Back to Customers Directory
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Breadcrumb & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/customers"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">{customer.name}</h1>
              {customer.company && (
                <span className="text-xs px-2 py-0.5 bg-slate-100 text-slate-600 font-medium rounded-full border border-slate-200">
                  {customer.company}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {customer.id}</p>
          </div>
        </div>

        <Button
          variant="secondary"
          icon={Edit2}
          onClick={() => setIsEditModalOpen(true)}
        >
          Edit Profile
        </Button>
      </div>

      {/* Profile Overview Card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Mail className="w-4 h-4 text-indigo-600" />
            Contact Information
          </h3>
          <div className="text-sm space-y-1.5 text-slate-600">
            <p><span className="text-slate-400 text-xs">Email:</span> {customer.email}</p>
            <p><span className="text-slate-400 text-xs">Phone:</span> {customer.phone || 'Not provided'}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <MapPin className="w-4 h-4 text-indigo-600" />
            Billing Location
          </h3>
          <div className="text-sm space-y-1.5 text-slate-600">
            <p>{customer.address || 'No street address'}</p>
            <p>{customer.city ? `${customer.city}, ${customer.country || ''}` : 'Location unconfigured'}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <CalendarCheck className="w-4 h-4 text-indigo-600" />
            Activity Summary
          </h3>
          <div className="text-sm space-y-1.5 text-slate-600">
            <p><span className="text-slate-400 text-xs">Subscriptions:</span> {customer.subscriptions?.length || 0}</p>
            <p><span className="text-slate-400 text-xs">Customer Since:</span> {new Date(customer.created_at).toLocaleDateString()}</p>
          </div>
        </div>
      </div>

      {/* Subscriptions Section */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">Associated Subscriptions</h2>
          <Link to={`/subscriptions?customer_id=${customer.id}`}>
            <Button variant="ghost" size="sm">
              View All Subscriptions &rarr;
            </Button>
          </Link>
        </div>

        {!customer.subscriptions || customer.subscriptions.length === 0 ? (
          <div className="p-8 bg-white rounded-xl border border-dashed border-slate-300 text-center text-sm text-slate-500">
            No subscriptions linked to this customer yet.
          </div>
        ) : (
          <Table headers={['Subscription #', 'Plan', 'Status', 'Total Amount', 'Start Date', 'Actions']}>
            {customer.subscriptions.map((sub) => (
              <TableRow key={sub.id}>
                <TableCell className="font-mono font-semibold text-indigo-600">
                  <Link to={`/subscriptions/${sub.id}`} className="hover:underline">
                    {sub.number}
                  </Link>
                </TableCell>
                <TableCell className="font-medium text-slate-900">
                  {sub.plan?.name || 'Custom Plan'}
                </TableCell>
                <TableCell>
                  <Badge status={sub.status} />
                </TableCell>
                <TableCell className="font-semibold text-slate-900">
                  ${Number(sub.total_amount).toFixed(2)}
                </TableCell>
                <TableCell className="text-slate-500 text-xs">
                  {sub.start_date ? new Date(sub.start_date).toLocaleDateString() : 'Pending'}
                </TableCell>
                <TableCell align="right">
                  <Link to={`/subscriptions/${sub.id}`}>
                    <Button variant="secondary" size="sm">
                      Inspect
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        )}
      </div>

      {/* Edit Customer Modal */}
      {isEditModalOpen && (
        <CustomerModal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          onSave={handleSaveCustomer}
          customer={customer}
          isLoading={isSaving}
        />
      )}
    </div>
  );
}

export default CustomerDetailPage;
