import React, { useState } from 'react';
import Modal from '../../components/Modal.jsx';
import Button from '../../components/Button.jsx';
import { invoicesApi } from '../../api/invoices.js';
import { getErrorMessage } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import { PlayCircle, CheckCircle, AlertTriangle, RefreshCw } from 'lucide-react';

export default function RunBillingModal({ isOpen, onClose, onBillingComplete }) {
  const [dryRun, setDryRun] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);
  const { success, error: toastError } = useToast();

  const handleRun = async () => {
    setIsRunning(true);
    setResult(null);
    try {
      const res = await invoicesApi.runBilling(dryRun);
      setResult(res.data);
      success(
        dryRun
          ? `Dry run complete: ${res.data.created} invoice(s) eligible.`
          : `Billing completed: ${res.data.created} invoice(s) generated!`
      );
      if (onBillingComplete) onBillingComplete();
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsRunning(false);
    }
  };

  const handleClose = () => {
    setResult(null);
    setDryRun(false);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Execute Recurring Billing Engine" size="md">
      <div className="space-y-4 text-sm">
        <p className="text-slate-600">
          The billing engine queries active subscriptions whose next billing date has arrived (or is past due),
          calculates applicable discounts and taxes, and generates idempotency-safe invoices.
        </p>

        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
              disabled={isRunning}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300"
            />
            <div>
              <span className="font-semibold text-slate-800">Dry Run (Preview Only)</span>
              <p className="text-xs text-slate-500">
                Check eligible subscriptions and preview invoice count without writing invoices or advancing billing dates.
              </p>
            </div>
          </label>
        </div>

        {result && (
          <div className="p-4 bg-indigo-50/60 rounded-lg border border-indigo-100 space-y-2">
            <div className="flex items-center gap-2 text-indigo-800 font-semibold">
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              <span>Billing Run Summary</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-slate-500">Total Eligible:</span>{' '}
                <span className="font-bold text-slate-800">{result.totalEligible}</span>
              </div>
              <div>
                <span className="text-slate-500">Invoices Created:</span>{' '}
                <span className="font-bold text-emerald-700">{result.created}</span>
              </div>
              <div>
                <span className="text-slate-500">Skipped (Idempotent):</span>{' '}
                <span className="font-bold text-amber-700">{result.skipped}</span>
              </div>
              <div>
                <span className="text-slate-500">Failed:</span>{' '}
                <span className="font-bold text-rose-700">{result.failed}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <Button variant="outline" onClick={handleClose} disabled={isRunning}>
            {result ? 'Done' : 'Cancel'}
          </Button>
          <Button
            variant="primary"
            onClick={handleRun}
            isLoading={isRunning}
            icon={isRunning ? RefreshCw : PlayCircle}
          >
            {dryRun ? 'Preview Billing' : 'Execute Billing Now'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
