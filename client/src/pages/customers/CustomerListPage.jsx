import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { customersApi } from '../../api/customers.js';
import { getErrorMessage } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import Table, { TableRow, TableCell } from '../../components/Table.jsx';
import Button from '../../components/Button.jsx';
import Pagination from '../../components/Pagination.jsx';
import Loader from '../../components/Loader.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import CustomerModal from './CustomerModal.jsx';
import { UserPlus, Search, Edit2, ExternalLink, Users, Building, Mail, Phone, Trash2 } from 'lucide-react';

export function CustomerListPage() {
  const [customers, setCustomers] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, item: null, isDeleting: false });

  const { success, error: toastError } = useToast();

  const fetchCustomers = useCallback(
    async (page = 1, searchQuery = search) => {
      setIsLoading(true);
      try {
        const response = await customersApi.list({
          page,
          limit: 20,
          search: searchQuery,
          sort: 'created_at:desc',
        });
        setCustomers(response.data || []);
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
    fetchCustomers(1, search);
  }, [search, fetchCustomers]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handleOpenCreate = () => {
    setSelectedCustomer(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (customer) => {
    setSelectedCustomer(customer);
    setIsModalOpen(true);
  };

  const handleSaveCustomer = async (data) => {
    setIsSaving(true);
    try {
      if (selectedCustomer) {
        await customersApi.update(selectedCustomer.id, data);
        success(`Customer "${data.name}" updated successfully.`);
      } else {
        await customersApi.create(data);
        success(`Customer "${data.name}" created successfully.`);
      }
      setIsModalOpen(false);
      fetchCustomers(pagination.page);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenDelete = (customer) => {
    setDeleteConfirm({ isOpen: true, item: customer, isDeleting: false });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.item) return;
    setDeleteConfirm((prev) => ({ ...prev, isDeleting: true }));
    try {
      await customersApi.delete(deleteConfirm.item.id);
      success(`Customer "${deleteConfirm.item.name}" deleted successfully.`);
      setDeleteConfirm({ isOpen: false, item: null, isDeleting: false });
      fetchCustomers(pagination.page);
    } catch (err) {
      toastError(getErrorMessage(err));
      setDeleteConfirm((prev) => ({ ...prev, isDeleting: false }));
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Customers</h1>
          <p className="text-sm text-slate-500 mt-1">
            Directory of account clients, subscribers, and CRM profiles
          </p>
        </div>

        <Button variant="primary" icon={UserPlus} onClick={handleOpenCreate}>
          Add Customer
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search by name, email, company..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </form>

        <div className="text-xs text-slate-500 font-medium">
          Total Customers: <span className="font-semibold text-slate-800">{pagination.total}</span>
        </div>
      </div>

      {/* Table Content */}
      {isLoading ? (
        <Loader text="Loading customer directory..." />
      ) : customers.length === 0 ? (
        <EmptyState
          title="No customers found"
          description={
            search
              ? `No customer matching "${search}".`
              : 'Add your first customer to begin drafting subscriptions and quotations.'
          }
          actionLabel="Add Customer"
          onAction={handleOpenCreate}
          icon={Users}
        />
      ) : (
        <div className="space-y-4">
          <Table
            headers={[
              { label: 'Customer Name' },
              { label: 'Company' },
              { label: 'Contact' },
              { label: 'Subscriptions', align: 'center' },
              { label: 'Actions', align: 'right' },
            ]}
          >
            {customers.map((cust) => (
              <TableRow key={cust.id}>
                {/* Name & ID */}
                <TableCell>
                  <Link
                    to={`/customers/${cust.id}`}
                    className="font-semibold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1.5"
                  >
                    <span>{cust.name}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                  <span className="text-xs text-slate-400 font-mono">
                    {cust.city ? `${cust.city}, ${cust.country || ''}` : 'No address specified'}
                  </span>
                </TableCell>

                {/* Company */}
                <TableCell>
                  {cust.company ? (
                    <div className="flex items-center gap-1.5 text-slate-800">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <span>{cust.company}</span>
                    </div>
                  ) : (
                    <span className="text-slate-400 text-xs italic">Individual</span>
                  )}
                </TableCell>

                {/* Contact Email & Phone */}
                <TableCell>
                  <div className="space-y-0.5 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-700">
                      <Mail className="w-3 h-3 text-slate-400" />
                      <span>{cust.email}</span>
                    </div>
                    {cust.phone && (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Phone className="w-3 h-3 text-slate-400" />
                        <span>{cust.phone}</span>
                      </div>
                    )}
                  </div>
                </TableCell>

                {/* Subscription count */}
                <TableCell align="center">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                    {cust._count?.subscriptions || 0}
                  </span>
                </TableCell>

                {/* Actions */}
                <TableCell align="right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenEdit(cust)}
                      title="Edit Customer"
                    >
                      <Edit2 className="w-4 h-4 text-slate-600 hover:text-indigo-600" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDelete(cust)}
                      title="Delete Customer"
                    >
                      <Trash2 className="w-4 h-4 text-slate-600 hover:text-rose-600" />
                    </Button>
                    <Link to={`/customers/${cust.id}`}>
                      <Button variant="secondary" size="sm">
                        View
                      </Button>
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </Table>

          {/* Pagination */}
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            total={pagination.total}
            limit={pagination.limit}
            onPageChange={(newPage) => fetchCustomers(newPage)}
          />
        </div>
      )}

      {/* Customer Form Modal */}
      {isModalOpen && (
        <CustomerModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveCustomer}
          customer={selectedCustomer}
          isLoading={isSaving}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Customer"
        message={`Are you sure you want to delete customer "${deleteConfirm.item?.name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        isDestructive={true}
        isLoading={deleteConfirm.isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, item: null, isDeleting: false })}
      />
    </div>
  );
}

export default CustomerListPage;
