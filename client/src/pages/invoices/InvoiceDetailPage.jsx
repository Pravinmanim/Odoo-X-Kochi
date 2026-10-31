import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { invoicesApi } from '../../api/invoices.js';
import { getErrorMessage } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import Table, { TableRow, TableCell } from '../../components/Table.jsx';
import Loader from '../../components/Loader.jsx';
import RecordPaymentModal from './RecordPaymentModal.jsx';
import {
  ArrowLeft,
  Download,
  Mail,
  CheckCircle,
  XCircle,
  CreditCard,
  Building,
  User,
  Calendar,
  Layers,
  ExternalLink,
  Clock,
  ShieldCheck,
} from 'lucide-react';

const STATUS_VARIANTS = {
  DRAFT: 'neutral',
  CONFIRMED: 'info',
  PAID: 'success',
  CANCELLED: 'danger',
};

export default function InvoiceDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  const { success, error: toastError } = useToast();

  const fetchInvoice = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await invoicesApi.get(id);
      setInvoice(res.data);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [id, toastError]);

  useEffect(() => {
    fetchInvoice();
  }, [fetchInvoice]);

  const handleConfirm = async () => {
    if (!window.confirm('Confirm this invoice? Once confirmed, it will be finalized and payments can be accepted.')) return;
    setIsProcessing(true);
    try {
      await invoicesApi.confirm(id);
      success('Invoice confirmed successfully!');
      fetchInvoice();
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCancel = async () => {
    if (!window.confirm('Are you sure you want to cancel this invoice? This action cannot be undone.')) return;
    setIsProcessing(true);
    try {
      await invoicesApi.cancel(id);
      success('Invoice cancelled.');
      fetchInvoice();
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendEmail = async () => {
    setIsProcessing(true);
    try {
      await invoicesApi.send(id);
      success(`Invoice emailed to ${invoice.customer?.email}`);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsProcessing(true);
    try {
      await invoicesApi.downloadPdf(id, invoice.number);
      success(`Downloaded ${invoice.number}.pdf`);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsProcessing(false);
    }
  };

  if (isLoading) {
    return <Loader text="Loading invoice details..." />;
  }

  if (!invoice) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-500 mb-4">Invoice not found.</p>
        <Button variant="secondary" onClick={() => navigate('/invoices')} icon={ArrowLeft}>
          Back to Invoices
        </Button>
      </div>
    );
  }

  const isDraft = invoice.status === 'DRAFT';
  const isConfirmed = invoice.status === 'CONFIRMED';
  const isPaid = invoice.status === 'PAID';
  const isCancelled = invoice.status === 'CANCELLED';
  const hasBalance = Number(invoice.amount_due) > 0;

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Top Navigation & Status Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/invoices')}
            className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
                {invoice.number}
              </h1>
              <Badge variant={STATUS_VARIANTS[invoice.status] || 'neutral'}>
                {invoice.status}
              </Badge>
              {invoice.is_overdue && (
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
                  OVERDUE
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Issued on {new Date(invoice.issue_date).toLocaleDateString()}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            icon={Download}
            onClick={handleDownloadPdf}
            disabled={isProcessing}
          >
            Download PDF
          </Button>

          {isDraft && (
            <>
              <Button
                variant="primary"
                size="sm"
                icon={CheckCircle}
                onClick={handleConfirm}
                disabled={isProcessing}
              >
                Confirm Invoice
              </Button>
              <Button
                variant="danger"
                size="sm"
                icon={XCircle}
                onClick={handleCancel}
                disabled={isProcessing}
              >
                Cancel
              </Button>
            </>
          )}

          {isConfirmed && (
            <>
              <Button
                variant="outline"
                size="sm"
                icon={Mail}
                onClick={handleSendEmail}
                disabled={isProcessing}
              >
                Email Customer
              </Button>

              {hasBalance && (
                <Button
                  variant="primary"
                  size="sm"
                  icon={CreditCard}
                  onClick={() => setIsPaymentModalOpen(true)}
                  disabled={isProcessing}
                >
                  Record Payment
                </Button>
              )}

              {invoice.payments?.length === 0 && (
                <Button
                  variant="danger"
                  size="sm"
                  icon={XCircle}
                  onClick={handleCancel}
                  disabled={isProcessing}
                >
                  Cancel
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Customer Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
            <User className="w-4 h-4 text-indigo-600" />
            <span>Customer Details</span>
          </div>
          <div className="text-sm space-y-1">
            <div className="font-semibold text-slate-900">{invoice.customer?.name}</div>
            <div className="text-slate-600 text-xs">{invoice.customer?.email}</div>
            {invoice.customer?.company_name && (
              <div className="text-slate-500 text-xs flex items-center gap-1 mt-1">
                <Building className="w-3 h-3" />
                {invoice.customer.company_name}
              </div>
            )}
            {invoice.customer?.phone && (
              <div className="text-slate-500 text-xs">{invoice.customer.phone}</div>
            )}
            {invoice.customer?.address && (
              <div className="text-slate-400 text-xs mt-1">{invoice.customer.address}</div>
            )}
          </div>
        </div>

        {/* Invoice Timeline */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
            <Calendar className="w-4 h-4 text-indigo-600" />
            <span>Billing Period & Dates</span>
          </div>
          <div className="space-y-1.5 text-xs text-slate-600">
            <div className="flex justify-between">
              <span className="text-slate-400">Period Start:</span>
              <span className="font-medium text-slate-800">
                {new Date(invoice.period_start).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Period End:</span>
              <span className="font-medium text-slate-800">
                {new Date(invoice.period_end).toLocaleDateString()}
              </span>
            </div>
            <div className="flex justify-between pt-1 border-t border-slate-100">
              <span className="text-slate-400">Due Date:</span>
              <span className={`font-semibold ${invoice.is_overdue ? 'text-rose-600' : 'text-slate-800'}`}>
                {new Date(invoice.due_date).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>

        {/* Subscription Link */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
            <Layers className="w-4 h-4 text-indigo-600" />
            <span>Associated Subscription</span>
          </div>
          {invoice.subscription ? (
            <div className="text-xs space-y-1.5">
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Subscription #:</span>
                <Link
                  to={`/subscriptions/${invoice.subscription.id}`}
                  className="font-mono font-bold text-indigo-600 hover:underline flex items-center gap-1"
                >
                  {invoice.subscription.number}
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="font-semibold text-slate-700">{invoice.subscription.status}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Plan:</span>
                <span className="font-medium text-slate-800">{invoice.subscription.plan?.name || 'Standard'}</span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400">No linked subscription</p>
          )}
        </div>
      </div>

      {/* Line Items Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 text-sm">Invoice Line Items</h2>
        </div>
        <Table
          headers={[
            { label: 'Item / Product' },
            { label: 'Quantity', align: 'center' },
            { label: 'Unit Price', align: 'right' },
            { label: 'Total', align: 'right' },
          ]}
        >
          {invoice.lines?.map((line) => (
            <TableRow key={line.id}>
              <TableCell>
                <div className="font-medium text-slate-900">
                  {line.product?.name || line.description || 'Service Line'}
                </div>
                {line.variant && (
                  <div className="text-xs text-slate-500">Variant: {line.variant.name}</div>
                )}
              </TableCell>
              <TableCell align="center">
                <span className="font-medium text-slate-700">{line.quantity}</span>
              </TableCell>
              <TableCell align="right">
                <span className="text-slate-700 font-mono">${Number(line.unit_price).toFixed(2)}</span>
              </TableCell>
              <TableCell align="right">
                <span className="font-semibold text-slate-900 font-mono">
                  ${Number(line.total_amount).toFixed(2)}
                </span>
              </TableCell>
            </TableRow>
          ))}
        </Table>

        {/* Financial Summary */}
        <div className="bg-slate-50 px-6 py-4 border-t border-slate-100 flex justify-end">
          <div className="w-full sm:w-72 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal:</span>
              <span className="font-mono font-medium">${Number(invoice.subtotal).toFixed(2)}</span>
            </div>

            {Number(invoice.discount_amount) > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Discount Applied:</span>
                <span className="font-mono font-medium">-${Number(invoice.discount_amount).toFixed(2)}</span>
              </div>
            )}

            {Number(invoice.tax_amount) > 0 && (
              <div className="flex justify-between text-slate-600">
                <span>Tax:</span>
                <span className="font-mono font-medium">+${Number(invoice.tax_amount).toFixed(2)}</span>
              </div>
            )}

            <div className="flex justify-between text-slate-900 font-bold text-sm pt-2 border-t border-slate-200">
              <span>Total Invoiced:</span>
              <span className="font-mono">${Number(invoice.total_amount).toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-emerald-700 pt-1">
              <span>Amount Paid:</span>
              <span className="font-mono font-semibold">${Number(invoice.amount_paid).toFixed(2)}</span>
            </div>

            <div className="flex justify-between text-slate-900 font-bold pt-1 border-t border-slate-200">
              <span className={invoice.is_overdue ? 'text-rose-600' : 'text-slate-900'}>
                Remaining Balance:
              </span>
              <span className={`font-mono text-sm ${hasBalance ? 'text-amber-700' : 'text-emerald-600'}`}>
                ${Number(invoice.amount_due).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Payments History Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h2 className="font-semibold text-slate-900 text-sm">Payments History</h2>
          {isConfirmed && hasBalance && (
            <Button
              variant="outline"
              size="sm"
              icon={CreditCard}
              onClick={() => setIsPaymentModalOpen(true)}
            >
              Record Payment
            </Button>
          )}
        </div>

        {invoice.payments?.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No payments recorded yet for this invoice.
          </div>
        ) : (
          <Table
            headers={[
              { label: 'Payment Date' },
              { label: 'Method' },
              { label: 'Reference' },
              { label: 'Recorded By' },
              { label: 'Amount', align: 'right' },
            ]}
          >
            {invoice.payments?.map((pmt) => (
              <TableRow key={pmt.id}>
                <TableCell>
                  <span className="text-xs text-slate-700">
                    {new Date(pmt.payment_date).toLocaleDateString()}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-100 text-slate-800">
                    {pmt.payment_method}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-slate-500 font-mono">
                    {pmt.transaction_reference || '—'}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-xs text-slate-500">
                    {pmt.recorded_by || 'System'}
                  </span>
                </TableCell>
                <TableCell align="right">
                  <span className="font-bold text-emerald-700 font-mono">
                    ${Number(pmt.amount).toFixed(2)}
                  </span>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        )}
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        invoice={invoice}
        onPaymentSuccess={fetchInvoice}
      />
    </div>
  );
}
