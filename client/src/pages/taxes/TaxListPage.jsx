import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { taxesApi } from '../../api/taxes.js';
import { getErrorMessage } from '../../api/client.js';
import Table, { TableRow, TableCell } from '../../components/Table.jsx';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import Input from '../../components/Input.jsx';
import Pagination from '../../components/Pagination.jsx';
import Loader from '../../components/Loader.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import TaxModal from './TaxModal.jsx';
import { Plus, Search, Edit2, Trash2, Receipt, CheckCircle2, XCircle } from 'lucide-react';

export default function TaxListPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const isAdmin = user?.role === 'ADMIN';

  const [taxes, setTaxes] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTax, setSelectedTax] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchTaxes = useCallback(
    async (page = 1, searchQuery = search) => {
      setIsLoading(true);
      try {
        const response = await taxesApi.list({
          page,
          limit: 20,
          search: searchQuery,
          sort: 'created_at:desc',
        });
        setTaxes(response.data || []);
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
    fetchTaxes(1, search);
  }, [search, fetchTaxes]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handleOpenCreate = () => {
    setSelectedTax(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (tax) => {
    setSelectedTax(tax);
    setIsModalOpen(true);
  };

  const handleSaveTax = async (data) => {
    setIsSaving(true);
    try {
      if (selectedTax) {
        await taxesApi.update(selectedTax.id, data);
        success(`Tax "${data.name}" updated successfully.`);
      } else {
        await taxesApi.create(data);
        success(`Tax "${data.name}" created successfully.`);
      }
      setIsModalOpen(false);
      fetchTaxes(pagination.page);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleTax = async (tax) => {
    try {
      const res = await taxesApi.toggle(tax.id);
      success(res.message || 'Tax status updated');
      fetchTaxes(pagination.page);
    } catch (err) {
      toastError(getErrorMessage(err));
    }
  };

  const handleDeleteTax = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await taxesApi.delete(deleteTarget.id);
      success(`Tax "${deleteTarget.name}" deleted.`);
      setDeleteTarget(null);
      fetchTaxes(pagination.page);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tax Configuration</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage percentage tax rates applicable to subscription orders and invoices.
          </p>
        </div>
        {isAdmin && (
          <Button variant="primary" onClick={handleOpenCreate} icon={Plus}>
            New Tax
          </Button>
        )}
      </div>

      {/* Controls & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200">
        <form onSubmit={handleSearchSubmit} className="flex-1 w-full max-w-md flex gap-2">
          <Input
            placeholder="Search taxes by name..."
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
          <Loader text="Loading taxes..." />
        </div>
      ) : taxes.length === 0 ? (
        <EmptyState
          icon={Receipt}
          title="No tax rules configured"
          description={
            search
              ? `No taxes matched your search for "${search}".`
              : 'Add your first tax rate to apply taxes automatically to invoices.'
          }
          actionLabel={isAdmin ? 'Create Tax' : undefined}
          onAction={isAdmin ? handleOpenCreate : undefined}
        />
      ) : (
        <div className="space-y-4">
          <Table
            headers={[
              'Tax Name',
              'Rate (%)',
              'Created At',
              'Status',
              isAdmin ? 'Actions' : '',
            ].filter(Boolean)}
          >
            {taxes.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <div className="font-semibold text-slate-900">{t.name}</div>
                </TableCell>
                <TableCell>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                    {Number(t.rate_percent ?? t.rate).toFixed(2)}%
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-slate-500">
                    {new Date(t.created_at).toLocaleDateString()}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge status={t.is_active ? 'active' : 'closed'}>
                    {t.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
                {isAdmin && (
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleToggleTax(t)}
                        title={t.is_active ? 'Deactivate Tax' : 'Activate Tax'}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                      >
                        {t.is_active ? <XCircle size={16} /> : <CheckCircle2 size={16} />}
                      </button>
                      <button
                        onClick={() => handleOpenEdit(t)}
                        title="Edit Tax"
                        className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-100"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(t)}
                        title="Delete Tax"
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
            onPageChange={(p) => fetchTaxes(p)}
          />
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <TaxModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveTax}
          tax={selectedTax}
          isLoading={isSaving}
        />
      )}

      {/* Delete Confirmation */}
      {deleteTarget && (
        <ConfirmDialog
          isOpen={Boolean(deleteTarget)}
          title="Delete Tax Rule"
          message={`Are you sure you want to permanently delete tax rate "${deleteTarget.name}"? This action cannot be undone.`}
          confirmLabel="Delete Tax"
          variant="danger"
          isLoading={isDeleting}
          onConfirm={handleDeleteTax}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}

