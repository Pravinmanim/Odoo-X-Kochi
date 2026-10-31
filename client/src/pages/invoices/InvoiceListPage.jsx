import React, { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { invoicesApi } from '../../api/invoices.js';
import { getErrorMessage } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import Table, { TableRow, TableCell } from '../../components/Table.jsx';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import Pagination from '../../components/Pagination.jsx';
import Loader from '../../components/Loader.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import RunBillingModal from './RunBillingModal.jsx';
import {
  FileText,
  Search,
  Download,
  ExternalLink,
  PlayCircle,
  AlertCircle,
  CheckCircle2,
  Clock,
  Ban,
  FileCheck,
} from 'lucide-react';

const STATUS_VARIANTS = {
  DRAFT: 'neutral',
  CONFIRMED: 'info',
  PAID: 'success',
  CANCELLED: 'danger',
};

export default function InvoiceListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const customerIdFilter = searchParams.get('customer_id') || '';

  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, totalPages: 1 });
  const [statusFilter, setStatusFilter] = useState('');
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isBillingModalOpen, setIsBillingModalOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState(null);

  const { success, error: toastError } = useToast();

  const fetchInvoices = useCallback(
    async (page = 1, searchQuery = search, status = statusFilter, overdue = onlyOverdue) => {
      setIsLoading(true);
      try {
        const response = await invoicesApi.list({
          page,
          limit: 10,
          search: searchQuery || undefined,
          status: status || undefined,
          is_overdue: overdue ? 'true' : undefined,
          customer_id: customerIdFilter || undefined,
        });
        setInvoices(response.data || []);
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
    [search, statusFilter, onlyOverdue, customerIdFilter, toastError]
  );

  useEffect(() => {
    fetchInvoices(1, search, statusFilter, onlyOverdue);
  }, [fetchInvoices, search, statusFilter, onlyOverdue]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  const handleDownloadPdf = async (e, invoice) => {
    e.stopPropagation();
    setDownloadingId(invoice.id);
    try {
      await invoicesApi.downloadPdf(invoice.id, invoice.number);
      success(`Downloaded ${invoice.number}.pdf`);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Invoices</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage recurring subscription billings, payment balances, and generated statements
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            icon={PlayCircle}
            onClick={() => setIsBillingModalOpen(true)}
          >
            Run Billing Engine
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by invoice #, customer name or email..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <Button type="submit" variant="secondary" size="sm">
            Search
          </Button>
          {search && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchInput('');
                setSearch('');
              }}
            >
              Clear
            </Button>
          )}
        </form>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">Draft</option>
            <option value="CONFIRMED">Confirmed</option>
            <option value="PAID">Paid</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <label className="flex items-center gap-2 cursor-pointer text-sm font-medium text-slate-700 select-none px-3 py-2 border border-slate-200 rounded-lg bg-slate-50 hover:bg-slate-100">
            <input
              type="checkbox"
              checked={onlyOverdue}
              onChange={(e) => setOnlyOverdue(e.target.checked)}
              className="w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300"
            />
            <span className="text-rose-700 font-semibold">Overdue Only</span>
          </label>
        </div>
      </div>

      {/* Invoices List */}
      {isLoading ? (
        <Loader text="Loading invoices..." />
      ) : invoices.length === 0 ? (
        <EmptyState
          title="No invoices found"
          description={
            search || statusFilter || onlyOverdue
              ? 'No invoices match your active filters. Try resetting the search or filter criteria.'
              : 'No billing invoices have been generated yet. Use the "Run Billing Engine" action to trigger recurring billing.'
          }
          icon={FileText}
        />
      ) : (
        <div className="space-y-4">
          <Table
            headers={[
              { label: 'Invoice #' },
              { label: 'Customer' },
              { label: 'Billing Period' },
              { label: 'Due Date' },
              { label: 'Status' },
              { label: 'Total', align: 'right' },
              { label: 'Due', align: 'right' },
              { label: 'Actions', align: 'right' },
            ]}
          >
            {invoices.map((inv) => (
              <TableRow key={inv.id}>
                {/* Number */}
                <TableCell>
                  <Link
                    to={`/invoices/${inv.id}`}
                    className="font-mono font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1.5"
                  >
                    <span>{inv.number}</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </Link>
                  {inv.subscription?.number && (
                    <div className="text-xs text-slate-400 font-mono mt-0.5">
                      Sub: {inv.subscription.number}
                    </div>
                  )}
                </TableCell>

                {/* Customer */}
                <TableCell>
                  <div className="font-medium text-slate-900">{inv.customer?.name}</div>
                  <div className="text-xs text-slate-500">{inv.customer?.email}</div>
                </TableCell>

                {/* Period */}
                <TableCell>
                  <div className="text-xs text-slate-700">
                    {new Date(inv.period_start).toLocaleDateString()} –{' '}
                    {new Date(inv.period_end).toLocaleDateString()}
                  </div>
                </TableCell>

                {/* Due Date */}
                <TableCell>
                  <span className={`text-xs ${inv.is_overdue ? 'font-bold text-rose-600' : 'text-slate-600'}`}>
                    {new Date(inv.due_date).toLocaleDateString()}
                  </span>
                </TableCell>

                {/* Status Badges */}
                <TableCell>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <Badge variant={STATUS_VARIANTS[inv.status] || 'neutral'}>
                      {inv.status}
                    </Badge>
                    {inv.is_overdue && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                        OVERDUE
                      </span>
                    )}
                  </div>
                </TableCell>

                {/* Total */}
                <TableCell align="right">
                  <span className="font-semibold text-slate-900">
                    ${Number(inv.total_amount).toFixed(2)}
                  </span>
                </TableCell>

                {/* Due */}
                <TableCell align="right">
                  <span className={`font-semibold ${Number(inv.amount_due) > 0 ? 'text-amber-700' : 'text-emerald-600'}`}>
                    ${Number(inv.amount_due).toFixed(2)}
                  </span>
                </TableCell>

                {/* Actions */}
                <TableCell align="right">
                  <div className="flex items-center justify-end gap-2">
                    <button
                      onClick={(e) => handleDownloadPdf(e, inv)}
                      disabled={downloadingId === inv.id}
                      title="Download PDF"
                      className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded transition-colors disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                    </button>
                    <Link
                      to={`/invoices/${inv.id}`}
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline px-2 py-1"
                    >
                      Details
                    </Link>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </Table>

          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            pageSize={pagination.limit}
            onPageChange={(page) => fetchInvoices(page, search, statusFilter, onlyOverdue)}
          />
        </div>
      )}

      {/* Manual Billing Trigger Modal */}
      <RunBillingModal
        isOpen={isBillingModalOpen}
        onClose={() => setIsBillingModalOpen(false)}
        onBillingComplete={() => fetchInvoices(1, search, statusFilter, onlyOverdue)}
      />
    </div>
  );
}
