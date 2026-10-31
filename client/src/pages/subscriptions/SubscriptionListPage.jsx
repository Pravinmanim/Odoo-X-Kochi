import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { subscriptionsApi } from '../../api/subscriptions.js';
import { getErrorMessage } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import Table, { TableRow, TableCell } from '../../components/Table.jsx';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import Pagination from '../../components/Pagination.jsx';
import Loader from '../../components/Loader.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import CreateSubscriptionModal from './CreateSubscriptionModal.jsx';
import {
  CalendarCheck,
  Plus,
  Search,
  Filter,
  ExternalLink,
  PauseCircle,
  PlayCircle,
  RotateCw,
  XCircle,
} from 'lucide-react';

export function SubscriptionListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const customerIdFilter = searchParams.get('customer_id') || '';

  const [subscriptions, setSubscriptions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { success, error: toastError } = useToast();

  const fetchSubscriptions = useCallback(
    async (page = 1, searchQuery = search, status = statusFilter) => {
      setIsLoading(true);
      try {
        const response = await subscriptionsApi.list({
          page,
          limit: 20,
          search: searchQuery,
          status: status || undefined,
          customer_id: customerIdFilter || undefined,
          sort: 'created_at:desc',
        });
        setSubscriptions(response.data || []);
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
    [search, statusFilter, customerIdFilter, toastError]
  );

  useEffect(() => {
    fetchSubscriptions(1, search, statusFilter);
  }, [search, statusFilter, fetchSubscriptions]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput);
  };

  const handleStatusFilterChange = (newStatus) => {
    setStatusFilter(newStatus);
  };

  const handleCreateSubscription = async (formData) => {
    await subscriptionsApi.create(formData);
    success('Subscription created as Draft.');
    fetchSubscriptions(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Subscriptions</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage subscription lifecycles, quote generation, recurring terms, and renewals
          </p>
        </div>

        <Button
          variant="primary"
          icon={Plus}
          onClick={() => setIsCreateOpen(true)}
        >
          New Subscription
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        {/* Search */}
        <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-sm">
          <input
            type="text"
            placeholder="Search #, customer, or plan..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-colors"
          />
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
        </form>

        {/* Status Pill Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          {[
            { label: 'All', value: '' },
            { label: 'Draft', value: 'DRAFT' },
            { label: 'Quotation', value: 'QUOTATION' },
            { label: 'Confirmed', value: 'CONFIRMED' },
            { label: 'Active', value: 'ACTIVE' },
            { label: 'Closed', value: 'CLOSED' },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => handleStatusFilterChange(item.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                statusFilter === item.value
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Customer filter notice */}
      {customerIdFilter && (
        <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-lg text-xs text-indigo-800 flex items-center justify-between">
          <span>Filtering subscriptions for customer ID: <strong>{customerIdFilter}</strong></span>
          <button
            onClick={() => setSearchParams({})}
            className="text-xs font-semibold underline text-indigo-600 hover:text-indigo-800"
          >
            Clear Customer Filter
          </button>
        </div>
      )}

      {/* Subscriptions Table */}
      {isLoading ? (
        <Loader text="Loading subscriptions..." />
      ) : subscriptions.length === 0 ? (
        <EmptyState
          title="No subscriptions found"
          description={
            search || statusFilter
              ? 'No subscription matches the selected filters.'
              : 'Create your first recurring subscription to begin managing customer accounts.'
          }
          actionLabel="New Subscription"
          onAction={() => setIsCreateOpen(true)}
          icon={CalendarCheck}
        />
      ) : (
        <div className="space-y-4">
          <Table
            headers={[
              { label: 'Number' },
              { label: 'Customer' },
              { label: 'Plan' },
              { label: 'Status' },
              { label: 'Total Amount', align: 'right' },
              { label: 'Start Date' },
              { label: 'Next Billing' },
              { label: 'Actions', align: 'right' },
            ]}
          >
            {subscriptions.map((sub) => (
              <TableRow key={sub.id}>
                {/* Number */}
                <TableCell>
                  <Link
                    to={`/subscriptions/${sub.id}`}
                    className="font-mono font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1.5"
                  >
                    <span>{sub.number}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                  {sub.is_paused && (
                    <span className="inline-block mt-0.5 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                      PAUSED
                    </span>
                  )}
                </TableCell>

                {/* Customer */}
                <TableCell>
                  <div className="font-medium text-slate-900">{sub.customer?.name}</div>
                  <div className="text-xs text-slate-400 truncate">{sub.customer?.company || sub.customer?.email}</div>
                </TableCell>

                {/* Plan */}
                <TableCell>
                  <span className="font-medium text-slate-800">{sub.plan?.name || 'Custom Plan'}</span>
                  {sub.plan && (
                    <span className="block text-[11px] text-slate-400 font-mono">
                      {sub.plan.billing_period}
                    </span>
                  )}
                </TableCell>

                {/* Status Badge */}
                <TableCell>
                  <Badge status={sub.status} />
                </TableCell>

                {/* Total */}
                <TableCell align="right" className="font-semibold text-slate-900 font-mono">
                  ${Number(sub.total_amount).toFixed(2)}
                </TableCell>

                {/* Start Date */}
                <TableCell className="text-xs text-slate-500">
                  {sub.start_date ? new Date(sub.start_date).toLocaleDateString() : '—'}
                </TableCell>

                {/* Next Billing */}
                <TableCell className="text-xs text-slate-500">
                  {sub.next_billing_date ? new Date(sub.next_billing_date).toLocaleDateString() : '—'}
                </TableCell>

                {/* Action button */}
                <TableCell align="right">
                  <Link to={`/subscriptions/${sub.id}`}>
                    <Button variant="secondary" size="sm">
                      Manage &rarr;
                    </Button>
                  </Link>
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
            onPageChange={(newPage) => fetchSubscriptions(newPage)}
          />
        </div>
      )}

      {/* Create Modal */}
      {isCreateOpen && (
        <CreateSubscriptionModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          onCreated={handleCreateSubscription}
        />
      )}
    </div>
  );
}

export default SubscriptionListPage;
