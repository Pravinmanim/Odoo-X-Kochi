import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { plansApi } from '../../api/plans.js';
import { getErrorMessage } from '../../api/client.js';
import Table, { TableRow, TableCell } from '../../components/Table.jsx';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import Input from '../../components/Input.jsx';
import Pagination from '../../components/Pagination.jsx';
import Loader from '../../components/Loader.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import PlanModal from './PlanModal.jsx';
import { Plus, Search, Edit2, Trash2, Layers, CheckCircle2, XCircle } from 'lucide-react';

export default function PlanListPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const isAdmin = user?.role === 'ADMIN';

  const [plans, setPlans] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchPlans = useCallback(
    async (page = 1, searchQuery = search) => {
      setIsLoading(true);
      try {
        const response = await plansApi.list({
          page,
          limit: 20,
          search: searchQuery,
          sort: 'created_at:desc',
        });
        setPlans(response.data || []);
        setPagination({
          page: response.page,
          limit: response.limit,
          total: response.total,
          totalPages: response.totalPages,
        });
      } catch (err) {
        toastError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    [search, toastError]
  );

  useEffect(() => {
    fetchPlans(1, search);
  }, [search, fetchPlans]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handleOpenCreate = () => {
    setSelectedPlan(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan) => {
    setSelectedPlan(plan);
    setIsModalOpen(true);
  };

  const handleSavePlan = async (data) => {
    setIsSaving(true);
    try {
      if (selectedPlan) {
        await plansApi.update(selectedPlan.id, data);
        success(`Plan "${data.name}" updated successfully.`);
      } else {
        await plansApi.create(data);
        success(`Plan "${data.name}" created successfully.`);
      }
      setIsModalOpen(false);
      fetchPlans(pagination.page);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleTogglePlan = async (plan) => {
    try {
      const res = await plansApi.toggle(plan.id);
      success(res.message || 'Plan status toggled');
      fetchPlans(pagination.page);
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  };

  const handleDeletePlan = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await plansApi.delete(deleteTarget.id);
      success(`Plan "${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
      fetchPlans(pagination.page);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const formatWindow = (from, to) => {
    if (!from && !to) return <span className="text-slate-400">Always Available</span>;
    const fromStr = from ? new Date(from).toLocaleDateString() : 'Start';
    const toStr = to ? new Date(to).toLocaleDateString() : 'Open';
    return `${fromStr} → ${toStr}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Subscription Plans</h1>
          <p className="text-sm text-slate-500 mt-1">
            Configure recurring billing frequencies, availability windows, and policy options.
          </p>
        </div>
        {isAdmin && (
          <Button variant="primary" onClick={handleOpenCreate} icon={Plus}>
            New Plan
          </Button>
        )}
      </div>

      {/* Controls & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full max-w-md flex gap-2">
          <Input
            placeholder="Search plans by name or description..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="flex-1"
          />
          <Button variant="secondary" type="submit" icon={Search}>
            Search
          </Button>
        </form>
      </div>

      {/* Content */}
      {isLoading ? (
        <div className="py-16 flex items-center justify-center">
          <Loader text="Loading plans..." />
        </div>
      ) : plans.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No subscription plans found"
          description={
            search
              ? `No plans matched your search for "${search}".`
              : 'Get started by creating your first recurring billing plan.'
          }
          actionLabel={isAdmin ? 'Create Plan' : undefined}
          onAction={isAdmin ? handleOpenCreate : undefined}
        />
      ) : (
        <div className="space-y-4">
          <Table
            headers={[
              'Plan Name',
              'Billing Period',
              'Price',
              'Min Qty',
              'Availability Window',
              'Policies',
              'Status',
              isAdmin ? 'Actions' : '',
            ].filter(Boolean)}
          >
            {plans.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <div className="font-semibold text-slate-900">{p.name}</div>
                  {p.description && (
                    <div className="text-xs text-slate-500 truncate max-w-xs">{p.description}</div>
                  )}
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-50 text-blue-700">
                    {p.billing_period}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="font-bold text-slate-900">${Number(p.price).toFixed(2)}</span>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-slate-700">{p.min_quantity}</span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-slate-600 font-mono">
                    {formatWindow(p.available_from, p.available_to)}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1 text-[11px]">
                    {p.pausable && <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Pausable</span>}
                    {p.closable && <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Closable</span>}
                    {p.renewable && <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">Renewable</span>}
                    {p.auto_close && <span className="bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded">Auto-close</span>}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge status={p.is_active ? 'active' : 'closed'}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleTogglePlan(p)}
                        title={p.is_active ? 'Deactivate Plan' : 'Activate Plan'}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                      >
                        {p.is_active ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                      </button>
                      <button
                        onClick={() => handleOpenEdit(p)}
                        title="Edit Plan"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(p)}
                        title="Delete Plan"
                        className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-100"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </Table>

          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            pageSize={pagination.limit}
            onPageChange={(p) => fetchPlans(p)}
          />
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <PlanModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSavePlan}
          plan={selectedPlan}
          isLoading={isSaving}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={Boolean(deleteTarget)}
          title="Delete Subscription Plan"
          message={`Are you sure you want to permanently delete plan "${deleteTarget.name}"? This action cannot be undone.`}
          confirmLabel="Delete Plan"
          variant="danger"
          isLoading={isDeleting}
          onConfirm={handleDeletePlan}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

