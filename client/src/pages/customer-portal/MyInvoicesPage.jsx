import React, { useState, useEffect, useCallback } from 'react';
import { invoicesApi } from '../../api/invoices.js';
import { getErrorMessage } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import Table, { TableRow, TableCell } from '../../components/Table.jsx';
import Badge from '../../components/Badge.jsx';
import Pagination from '../../components/Pagination.jsx';
import Loader from '../../components/Loader.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { FileText, Download } from 'lucide-react';

const STATUS_VARIANTS = {
  DRAFT: 'neutral',
  CONFIRMED: 'info',
  PAID: 'success',
  CANCELLED: 'danger',
};

export default function MyInvoicesPage() {
  const [invoices, setInvoices] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState(null);
  const { success, error: toastError } = useToast();

  const loadMyInvoices = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      try {
        const response = await invoicesApi.listMy({ page, limit: 20 });
        setInvoices(response.data || []);
        if (response.totalPages) {
          setPagination({
            page: response.page,
            limit: response.limit,
            total: response.total,
            totalPages: response.totalPages,
          });
        }
      } catch (err) {
        toastError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    },
    [toastError]
  );

  useEffect(() => {
    loadMyInvoices(1);
  }, [loadMyInvoices]);

  const handleDownloadPdf = async (invoice) => {
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Invoices</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review your invoice history, payment receipts, and download statement PDFs (20 per page)
        </p>
      </div>

      {isLoading ? (
        <Loader text="Loading your billing history..." />
      ) : invoices.length === 0 ? (
        <EmptyState
          title="No invoices found"
          description="You do not have any invoices issued on your account yet."
          icon={FileText}
        />
      ) : (
        <div className="space-y-4">
          <Table
            headers={[
              { label: 'Invoice #' },
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
                  <span className="font-mono font-bold text-slate-800">
                    {inv.number}
                  </span>
                  {inv.subscription?.number && (
                    <div className="text-[11px] text-slate-400 font-mono mt-0.5">
                      Sub: {inv.subscription.number}
                    </div>
                  )}
                </TableCell>

                {/* Period */}
                <TableCell>
                  <div className="text-xs text-slate-600">
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
                  <span className="font-semibold text-slate-900 font-mono">
                    ${Number(inv.total_amount).toFixed(2)}
                  </span>
                </TableCell>

                {/* Due */}
                <TableCell align="right">
                  <span className={`font-semibold font-mono ${Number(inv.amount_due) > 0 ? 'text-amber-700' : 'text-emerald-600'}`}>
                    ${Number(inv.amount_due).toFixed(2)}
                  </span>
                </TableCell>

                {/* Actions */}
                <TableCell align="right">
                  <button
                    onClick={() => handleDownloadPdf(inv)}
                    disabled={downloadingId === inv.id}
                    title="Download Statement PDF"
                    className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>PDF</span>
                  </button>
                </TableCell>
              </TableRow>
            ))}
          </Table>

          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            pageSize={pagination.limit}
            onPageChange={(page) => loadMyInvoices(page)}
          />
        </div>
      )}
    </div>
  );
}
