import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { discountsApi } from '../../api/discounts.js';
import { getErrorMessage } from '../../api/client.js';
import Table, { TableRow, TableCell } from '../../components/Table.jsx';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import Input from '../../components/Input.jsx';
import Pagination from '../../components/Pagination.jsx';
import Loader from '../../components/Loader.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import DiscountModal from './DiscountModal.jsx';
import { Plus, Search, Edit2, Trash2, Percent, CheckCircle2, XCircle } from 'lucide-react';

export default function DiscountListPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const isAdmin = user?.role === 'ADMIN';

  const [discounts, setDiscounts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDiscount, setSelectedDiscount] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchDiscounts = useCallback(
    async (page = 1, searchQuery = search) => {
      setIsLoading(true);
      try {
        const response = await discountsApi.list({
          page,
          limit: 20,
          search: searchQuery,
          sort: 'created_at:desc',
        });
        setDiscounts(response.data || []);
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
    fetchDiscounts(1, search);
  }, [search, fetchDiscounts]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handleOpenCreate = () => {
    setSelectedDiscount(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (discount) => {
    setSelectedDiscount(discount);
    setIsModalOpen(true);
  };

  const handleSaveDiscount = async (data) => {
    setIsSaving(true);
    try {
      if (selectedDiscount) {
        await discountsApi.update(selectedDiscount.id, data);
        success(`Discount "${data.code}" updated successfully.`);
      } else {
        await discountsApi.create(data);
        success(`Discount "${data.code}" created successfully.`);
      }
      setIsModalOpen(false);
      fetchDiscounts(pagination.page);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleDiscount = async (discount) => {
    try {
      const res = await discountsApi.toggle(discount.id);
      success(res.message || 'Discount status updated');
      fetchDiscounts(pagination.page);
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  };

  const handleDeleteDiscount = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await discountsApi.delete(deleteTarget.id);
      success(`Discount "${deleteTarget.code}" deleted.`);
      setDeleteTarget(null);
      fetchDiscounts(pagination.page);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  const formatValidity = (start, end) => {
    if (!start && !end) return <span className="text-slate-400">Always Valid</span>;
    const startStr = start ? new Date(start).toLocaleDateString() : 'Start';
    const endStr = end ? new Date(end).toLocaleDateString() : 'No expiry';
    return `${startStr} → ${endStr}`;
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Discounts & Coupons</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage promotional discount codes (Percentage & Fixed), redemptions, and expiration policies.
          </p>
        </div>
        {isAdmin && (
          <Button variant="primary" onClick={handleOpenCreate} icon={Plus}>
            New Discount
          </Button>
        )}
      </div>

      {/* Controls & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full max-w-md flex gap-2">
          <Input
            placeholder="Search discounts by code..."
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
          <Loader text="Loading discounts..." />
        </div>
      ) : discounts.length === 0 ? (
        <EmptyState
          icon={Percent}
          title="No promotional discounts found"
          description={
            search
              ? `No discounts matched your search for "${search}".`
              : 'Create promotional discount codes for your customers.'
          }
          actionLabel={isAdmin ? 'Create Discount' : undefined}
          onAction={isAdmin ? handleOpenCreate : undefined}
        />
      ) : (
        <div className="space-y-4">
          <Table
            headers={[
              'Code',
              'Benefit',
              'Scope',
              'Redemptions (Used / Limit)',
              'Validity Window',
              'Status',
              isAdmin ? 'Actions' : '',
            ].filter(Boolean)}
          >
            {discounts.map((d) => (
              <TableRow key={d.id}>
                <TableCell>
                  <div className="flex items-center space-x-2">
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-xs">
                      {d.code}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="font-semibold text-slate-900">
                    {d.type === 'PERCENTAGE'
                      ? `${Number(d.value)}% OFF`
                      : `$${Number(d.value).toFixed(2)} OFF`}
                  </span>
                  {(d.min_purchase > 0 || d.min_quantity > 1) && (
                    <div className="text-[11px] text-slate-500">
                      {d.min_purchase > 0 && `Min: $${Number(d.min_purchase).toFixed(2)} `}
                      {d.min_quantity > 1 && `Min Qty: ${d.min_quantity}`}
                    </div>
                  )}
                </TableCell>
                <TableCell>
                  <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                    {d.scope === 'PRODUCT' ? 'Products' : 'Subscription'}
                  </span>
                </TableCell>
                <TableCell>
                  <div className="text-xs font-mono text-slate-700">
                    <span className="font-bold text-slate-900">{d.redemptions_count || 0}</span>
                    <span className="text-slate-400"> / </span>
                    <span>{d.max_redemptions ? d.max_redemptions : '∞'}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-xs text-slate-600 font-mono">
                    {formatValidity(d.start_date, d.expires_at || d.end_date)}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 items-start">
                    {d.is_expired ? (
                      <Badge status="closed">Expired</Badge>
                    ) : d.is_limit_reached ? (
                      <Badge status="closed">Limit Reached</Badge>
                    ) : d.is_active ? (
                      <Badge status="active">Active</Badge>
                    ) : (
                      <Badge status="draft">Inactive</Badge>
                    )}
                  </div>
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleDiscount(d)}
                        title={d.is_active ? 'Deactivate Discount' : 'Activate Discount'}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                      >
                        {d.is_active ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                      </button>
                      <button
                        onClick={() => handleOpenEdit(d)}
                        title="Edit Discount"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(d)}
                        title="Delete Discount"
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
            onPageChange={(p) => fetchDiscounts(p)}
          />
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <DiscountModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveDiscount}
          discount={selectedDiscount}
          isLoading={isSaving}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={Boolean(deleteTarget)}
          title="Delete Discount"
          message={`Are you sure you want to permanently delete discount "${deleteTarget.code}"? This action cannot be undone.`}
          confirmLabel="Delete Discount"
          variant="danger"
          isLoading={isDeleting}
          onConfirm={handleDeleteDiscount}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

