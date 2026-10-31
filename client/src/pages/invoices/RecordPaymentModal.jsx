import React, { useState } from 'react';
import Modal from '../../components/Modal.jsx';
import Button from '../../components/Button.jsx';
import Input from '../../components/Input.jsx';
import Select from '../../components/Select.jsx';
import { paymentsApi } from '../../api/payments.js';
import { getErrorMessage } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { CreditCard, CheckCircle } from 'lucide-react';

const PAYMENT_METHODS = [
  { value: 'CARD', label: 'Credit / Debit Card' },
  { value: 'UPI', label: 'UPI' },
  { value: 'BANK_TRANSFER', label: 'Bank Wire / Transfer' },
  { value: 'CASH', label: 'Cash' },
  { value: 'CHEQUE', label: 'Cheque' },
];

export default function RecordPaymentModal({ isOpen, onClose, invoice, onPaymentSuccess }) {
  const amountDue = invoice ? Number(invoice.amount_due || 0) : 0;

  const [amount, setAmount] = useState(amountDue > 0 ? amountDue.toFixed(2) : '');
  const [method, setMethod] = useState('CARD');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [transactionRef, setTransactionRef] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { success, error: toastError } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setErrorMsg('Payment amount must be greater than $0.00');
      return;
    }

    if (parsedAmount > amountDue + 0.001) {
      setErrorMsg(`Payment amount cannot exceed remaining balance of $${amountDue.toFixed(2)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      await paymentsApi.record(invoice.id, {
        amount: parsedAmount,
        payment_method: method,
        payment_date: new Date(paymentDate).toISOString(),
        transaction_reference: transactionRef.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      success(`Payment of $${parsedAmount.toFixed(2)} recorded successfully!`);
      if (onPaymentSuccess) onPaymentSuccess();
      onClose();
    } catch (err) {
      const msg = getErrorMessage(err);
      setErrorMsg(msg);
      toastError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Record Payment for ${invoice?.number || 'Invoice'}`} size="md">
      <form onSubmit={handleSubmit} className="space-y-4 text-sm">
        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 flex justify-between items-center text-xs">
          <div>
            <span className="text-slate-500">Invoice Total:</span>{' '}
            <span className="font-semibold text-slate-800">${Number(invoice?.total_amount || 0).toFixed(2)}</span>
          </div>
          <div>
            <span className="text-slate-500">Remaining Balance:</span>{' '}
            <span className="font-bold text-amber-700">${amountDue.toFixed(2)}</span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
            {errorMsg}
          </div>
        )}

        <Input
          label="Payment Amount ($)"
          type="number"
          step="0.01"
          min="0.01"
          max={amountDue}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
        />

        <Select
          label="Payment Method"
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          options={PAYMENT_METHODS}
          required
        />

        <Input
          label="Payment Date"
          type="date"
          value={paymentDate}
          onChange={(e) => setPaymentDate(e.target.value)}
          required
        />

        <Input
          label="Transaction / Reference ID (Optional)"
          type="text"
          placeholder="e.g. TXN-984214, Cheque #00421"
          value={transactionRef}
          onChange={(e) => setTransactionRef(e.target.value)}
        />

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Notes (Optional)</label>
          <textarea
            rows="2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add internal payment memo..."
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
          <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            type="submit"
            isLoading={isSubmitting}
            icon={CreditCard}
          >
            Record Payment
          </Button>
        </div>
      </form>
    </Modal>
  );
}
