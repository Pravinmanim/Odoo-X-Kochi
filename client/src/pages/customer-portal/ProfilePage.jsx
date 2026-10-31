import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { customersApi } from '../../api/customers.js';
import { getErrorMessage } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import Button from '../../components/Button.jsx';
import Input from '../../components/Input.jsx';
import Loader from '../../components/Loader.jsx';
import { User, Building, Mail, Phone, MapPin, Save, ShieldCheck } from 'lucide-react';

export default function ProfilePage() {
  const { user } = useAuth();
  const [customer, setCustomer] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    address: '',
    city: '',
    country: '',
  });

  const { success, error: toastError } = useToast();

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      try {
        if (user?.customer?.id) {
          const res = await customersApi.get(user.customer.id);
          const c = res.data;
          setCustomer(c);
          setFormData({
            name: c.name || '',
            email: c.email || user.email || '',
            company: c.company || '',
            phone: c.phone || '',
            address: c.address || '',
            city: c.city || '',
            country: c.country || '',
          });
        }
      } catch (err) {
        toastError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, [user, toastError]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customer?.id) return;
    setIsSaving(true);
    try {
      await customersApi.update(customer.id, {
        name: formData.name,
        company: formData.company || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        country: formData.country || undefined,
      });
      success('Profile updated successfully!');
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return <Loader text="Loading your account profile..." />;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Account Profile</h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your contact credentials, organization info, and billing address
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* User Card */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <div className="w-16 h-16 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 font-bold text-xl mx-auto">
            {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="text-center">
            <h2 className="font-bold text-slate-900 text-base">
              {formData.name || `${user?.first_name || ''} ${user?.last_name || ''}`.trim() || 'Customer Account'}
            </h2>
            <p className="text-xs text-slate-500">{user?.email}</p>
            <div className="mt-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Customer</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 text-xs text-slate-500 space-y-2">
            <div className="flex justify-between">
              <span>Account Type:</span>
              <span className="font-semibold text-slate-700">Self-Service Portal</span>
            </div>
            <div className="flex justify-between">
              <span>Customer ID:</span>
              <span className="font-mono text-[11px] text-slate-600 truncate max-w-[140px]">
                {customer?.id || user?.customer?.id || '—'}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Edit Form */}
        <div className="md:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h3 className="font-semibold text-slate-800 text-sm border-b border-slate-100 pb-2">
              Billing & Organization Details
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name / Primary Contact"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />

              <Input
                label="Email Address"
                value={formData.email}
                disabled
                helperText="Email is bound to your login credentials"
              />

              <Input
                label="Company / Enterprise Name"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="e.g. Acme Corporation"
              />

              <Input
                label="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="+1-555-0199"
              />
            </div>

            <h3 className="font-semibold text-slate-800 text-sm border-b border-slate-100 pb-2 pt-2">
              Mailing Address
            </h3>

            <Input
              label="Street Address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="123 Innovation Drive, Suite 400"
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="City"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="San Francisco"
              />

              <Input
                label="Country"
                value={formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                placeholder="United States"
              />
            </div>

            <div className="pt-4 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                isLoading={isSaving}
                icon={Save}
              >
                Save Changes
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

