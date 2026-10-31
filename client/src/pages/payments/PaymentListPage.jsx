import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { paymentsApi } from '../../api/payments.js';
import { getErrorMessage } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import Table, { TableRow, TableCell } from '../../components/Table.jsx';
import Pagination from '../../components/Pagination.jsx';
import Loader from '../../components/Loader.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import Button from '../../components/Button.jsx';
import { CreditCard, Search, ExternalLink } from 'lucide-react';

const METHOD_LABELS = {
  CARD: 'Card',
  UPI: 'UPI',
  BANK_TRANSFER: 'Bank Wire',
  CASH: 'Cash',
  CHEQUE: 'Cheque',
};

export default function PaymentListPage() {
  const [payments, setPayments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [methodFilter, setMethodFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  const { error: toastError } = useToast();

  const fetchPayments = useCallback(
    async (page = 1, searchQuery = search, method = methodFilter) => {
      setIsLoading(true);
      try {
        const response = await paymentsApi.list({
          page,
          limit: 20,
          search: searchQuery || undefined,
          payment_method: method || undefined,
        });
        setPayments(response.data || []);
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
    [search, methodFilter, toastError]
  );

  useEffect(() => {
    fetchPayments(1, search, methodFilter);
  }, [fetchPayments, search, methodFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearch(searchInput.trim());
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Payments</h1>
        <p className="text-sm text-slate-500 mt-1">
          Audit ledger of incoming subscription payments, transaction receipts, and payment methods
        </p>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search by customer, invoice # or transaction reference..."
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

        <div className="flex items-center gap-3">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
          >
            <option value="">All Payment Methods</option>
            <option value="CARD">Credit / Debit Card</option>
            <option value="UPI">UPI</option>
            <option value="BANK_TRANSFER">Bank Wire / Transfer</option>
            <option value="CASH">Cash</option>
            <option value="CHEQUE">Cheque</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {isLoading ? (
        <Loader text="Loading payment transactions..." />
      ) : payments.length === 0 ? (
        <EmptyState
          title="No payments recorded"
          description={
            search || methodFilter
              ? 'No payment transactions match your active search filters.'
              : 'No subscription payments have been recorded yet. Select an invoice to record incoming payments.'
          }
          icon={CreditCard}
        />
      ) : (
        <div className="space-y-4">
          <Table
            headers={[
              { label: 'Date' },
              { label: 'Invoice #' },
              { label: 'Customer' },
              { label: 'Method' },
              { label: 'Reference / Notes' },
              { label: 'Recorded By' },
              { label: 'Amount', align: 'right' },
            ]}
          >
            {payments.map((pmt) => (
              <TableRow key={pmt.id}>
                <TableCell>
                  <span className="text-xs text-slate-700">
                    {new Date(pmt.payment_date).toLocaleDateString()}
                  </span>
                </TableCell>

                <TableCell>
                  {pmt.invoice ? (
                    <Link
                      to={`/invoices/${pmt.invoice.id}`}
                      className="font-mono font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1 text-xs"
                    >
                      <span>{pmt.invoice.number}</span>
                      <ExternalLink className="w-3 h-3 text-slate-400" />
                    </Link>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
                  )}
                </TableCell>

                <TableCell>
                  <div className="text-xs font-medium text-slate-900">
                    {pmt.invoice?.customer?.name || 'Customer'}
                  </div>
                  <div className="text-[11px] text-slate-400">
                    {pmt.invoice?.customer?.email}
                  </div>
                </TableCell>

                <TableCell>
                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800">
                    {METHOD_LABELS[pmt.payment_method] || pmt.payment_method}
                  </span>
                </TableCell>

                <TableCell>
                  <div className="text-xs font-mono text-slate-600">
                    {pmt.transaction_reference || '—'}
                  </div>
                  {pmt.notes && <div className="text-[11px] text-slate-400 mt-0.5">{pmt.notes}</div>}
                </TableCell>

                <TableCell>
                  <span className="text-xs text-slate-500">
                    {pmt.recorded_by || 'System'}
                  </span>
                </TableCell>

                <TableCell align="right">
                  <span className="font-bold font-mono text-emerald-700">
                    ${Number(pmt.amount).toFixed(2)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </Table>

          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            pageSize={pagination.limit}
            onPageChange={(page) => fetchPayments(page, search, methodFilter)}
          />
        </div>
      )}
    </div>
  );
}
