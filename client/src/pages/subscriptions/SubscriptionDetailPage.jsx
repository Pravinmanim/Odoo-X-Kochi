import React, { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { subscriptionsApi } from '../../api/subscriptions.js';
import { getErrorMessage } from '../../api/client.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import Table, { TableRow, TableCell } from '../../components/Table.jsx';
import Loader from '../../components/Loader.jsx';
import {
  ArrowLeft,
  FileCheck2,
  CheckCircle,
  Play,
  Pause,
  RotateCw,
  XCircle,
  Calendar,
  User,
  Layers,
  History,
  AlertTriangle,
  Clock,
  ShieldAlert,
} from 'lucide-react';

export function SubscriptionDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [subscription, setSubscription] = useState(null);
  const [historyLogs, setHistoryLogs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  const isStaffOrAdmin = user?.role === 'ADMIN' || user?.role === 'STAFF';

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [subRes, historyRes] = await Promise.all([
        subscriptionsApi.get(id),
        subscriptionsApi.getHistory(id).catch(() => ({ data: [] })),
      ]);
      setSubscription(subRes.data);
      setHistoryLogs(historyRes.data || []);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  }, [id, toastError]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAction = async (actionFn, actionName) => {
    setActionLoading(true);
    try {
      await actionFn(id, `Action triggered from web console by ${user?.email}`);
      success(`Subscription ${actionName} successfully.`);
      await loadData();
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setActionLoading(false);
    }
  };

  if (isLoading) {
    return <Loader text="Loading subscription details..." />;
  }

  if (!subscription) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Subscription record not found.</p>
        <Link to="/subscriptions" className="text-indigo-600 text-sm font-semibold mt-2 inline-block">
          &larr; Back to Subscriptions List
        </Link>
      </div>
    );
  }

  // Stepper steps
  const steps = ['DRAFT', 'QUOTATION', 'CONFIRMED', 'ACTIVE', 'CLOSED'];
  const currentStepIdx = steps.indexOf(subscription.status);

  const plan = subscription.plan;
  const isPausable = plan?.pausable ?? true;
  const isClosable = plan?.closable ?? true;
  const isRenewable = plan?.renewable ?? true;

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={user?.role === 'CUSTOMER' ? '/my-subscriptions' : '/subscriptions'}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 font-mono">
                {subscription.number}
              </h1>
              <Badge status={subscription.status} />
              {subscription.is_paused && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                  PAUSED
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">ID: {subscription.id}</p>
          </div>
        </div>

        {/* Action Buttons (Staff & Admin Only) */}
        {isStaffOrAdmin && (
          <div className="flex flex-wrap items-center gap-2">
            {/* DRAFT -> QUOTATION */}
            {subscription.status === 'DRAFT' && (
              <Button
                variant="primary"
                icon={FileCheck2}
                isLoading={actionLoading}
                onClick={() => handleAction(subscriptionsApi.quote, 'quoted')}
              >
                Generate Quotation
              </Button>
            )}

            {/* QUOTATION -> CONFIRMED */}
            {subscription.status === 'QUOTATION' && (
              <Button
                variant="primary"
                icon={CheckCircle}
                isLoading={actionLoading}
                onClick={() => handleAction(subscriptionsApi.confirm, 'confirmed')}
              >
                Confirm Order
              </Button>
            )}

            {/* CONFIRMED -> ACTIVE */}
            {subscription.status === 'CONFIRMED' && (
              <Button
                variant="primary"
                icon={Play}
                isLoading={actionLoading}
                onClick={() => handleAction(subscriptionsApi.activate, 'activated')}
              >
                Activate Subscription
              </Button>
            )}

            {/* ACTIVE Actions: Pause / Resume */}
            {subscription.status === 'ACTIVE' && (
              <>
                {!subscription.is_paused ? (
                  <Button
                    variant="secondary"
                    icon={Pause}
                    disabled={!isPausable || actionLoading}
                    title={!isPausable ? 'Plan does not permit pausing' : ''}
                    onClick={() => handleAction(subscriptionsApi.pause, 'paused')}
                  >
                    Pause
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    icon={Play}
                    disabled={!isPausable || actionLoading}
                    onClick={() => handleAction(subscriptionsApi.resume, 'resumed')}
                  >
                    Resume
                  </Button>
                )}

                {/* Renew */}
                <Button
                  variant="secondary"
                  icon={RotateCw}
                  disabled={!isRenewable || actionLoading}
                  title={!isRenewable ? 'Plan does not permit renewal' : ''}
                  onClick={() => handleAction(subscriptionsApi.renew, 'renewed')}
                >
                  Renew Period
                </Button>

                {/* Early Close */}
                <Button
                  variant="danger"
                  icon={XCircle}
                  disabled={!isClosable || actionLoading}
                  title={!isClosable ? 'Plan does not permit early closure' : ''}
                  onClick={() => handleAction(subscriptionsApi.close, 'closed')}
                >
                  Close
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Plan Permission Notice if restricted */}
      {isStaffOrAdmin && subscription.status === 'ACTIVE' && (!isPausable || !isClosable || !isRenewable) && (
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Plan restrictions active: {[
              !isPausable && 'Pausing disabled',
              !isClosable && 'Early closure disabled',
              !isRenewable && 'Renewal disabled',
            ].filter(Boolean).join(' • ')}
          </span>
        </div>
      )}

      {/* Status Stepper */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
          Lifecycle Progression
        </h3>
        <div className="flex items-center justify-between relative">
          <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-slate-200 w-full z-0" />
          <div
            className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-indigo-600 transition-all duration-500 z-0"
            style={{
              width: `${(Math.max(0, currentStepIdx) / (steps.length - 1)) * 100}%`,
            }}
          />

          {steps.map((st, idx) => {
            const isCompleted = idx < currentStepIdx;
            const isCurrent = idx === currentStepIdx;

            return (
              <div key={st} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs transition-colors border-2 ${
                    isCurrent
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/30'
                      : isCompleted
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-600'
                      : 'bg-white text-slate-400 border-slate-300'
                  }`}
                >
                  {idx + 1}
                </div>
                <span
                  className={`text-xs mt-2 font-medium ${
                    isCurrent
                      ? 'text-indigo-600 font-bold'
                      : isCompleted
                      ? 'text-slate-900'
                      : 'text-slate-400'
                  }`}
                >
                  {st.charAt(0) + st.slice(1).toLowerCase()}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Overview Details Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Customer Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600" />
            Customer Details
          </h3>
          <div className="text-sm space-y-1 text-slate-700">
            <p className="font-semibold text-slate-900">{subscription.customer?.name}</p>
            <p className="text-xs text-slate-500">{subscription.customer?.company || 'Individual Client'}</p>
            <p className="text-xs text-slate-500">{subscription.customer?.email}</p>
            {subscription.customer?.phone && (
              <p className="text-xs text-slate-500">{subscription.customer.phone}</p>
            )}
          </div>
        </div>

        {/* Plan & Pricing Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            Billing Plan
          </h3>
          <div className="text-sm space-y-1 text-slate-700">
            <p className="font-semibold text-slate-900">{subscription.plan?.name || 'Custom Plan'}</p>
            <p className="text-xs text-slate-500">
              Billing Frequency: <span className="font-semibold">{subscription.plan?.billing_period}</span>
            </p>
            <p className="text-xs text-slate-500">
              Payment Terms: <span className="font-semibold">{subscription.payment_terms || 30} Days</span>
            </p>
            <p className="text-sm font-bold text-indigo-600 pt-1 font-mono">
              Total: ${Number(subscription.total_amount).toFixed(2)}
            </p>
          </div>
        </div>

        {/* Key Dates Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-indigo-600" />
            Schedule & Milestones
          </h3>
          <div className="text-xs space-y-1.5 text-slate-600">
            <p>
              <span className="text-slate-400">Start Date:</span>{' '}
              <strong className="text-slate-800">
                {subscription.start_date ? new Date(subscription.start_date).toLocaleDateString() : 'Pending'}
              </strong>
            </p>
            <p>
              <span className="text-slate-400">Expiry Date:</span>{' '}
              <strong className="text-slate-800">
                {subscription.expiry_date
                  ? new Date(subscription.expiry_date).toLocaleDateString()
                  : subscription.end_date
                  ? new Date(subscription.end_date).toLocaleDateString()
                  : 'Open-ended'}
              </strong>
            </p>
            <p>
              <span className="text-slate-400">Next Billing:</span>{' '}
              <strong className="text-slate-800">
                {subscription.next_billing_date
                  ? new Date(subscription.next_billing_date).toLocaleDateString()
                  : 'Pending Activation'}
              </strong>
            </p>
            {subscription.quotation_valid_until && (
              <p>
                <span className="text-slate-400">Quote Valid Until:</span>{' '}
                <strong className="text-blue-700">
                  {new Date(subscription.quotation_valid_until).toLocaleDateString()}
                </strong>
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Subscription Lines Table */}
      <div className="space-y-3">
        <h3 className="text-lg font-bold text-slate-900">Subscription Line Items</h3>
        <Table headers={['Product & Variant', 'Quantity', 'Unit Price', 'Line Subtotal']}>
          {subscription.lines?.map((line) => (
            <TableRow key={line.id}>
              <TableCell>
                <div className="font-semibold text-slate-900">{line.product?.name}</div>
                {line.variant && (
                  <span className="inline-block mt-0.5 text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    {line.variant.attribute} (+${Number(line.variant.extra_price).toFixed(2)})
                  </span>
                )}
              </TableCell>
              <TableCell className="font-medium text-slate-700">{line.quantity}</TableCell>
              <TableCell className="font-mono text-slate-700">
                ${Number(line.unit_price).toFixed(2)}
              </TableCell>
              <TableCell className="font-mono font-bold text-slate-900">
                ${Number(line.subtotal).toFixed(2)}
              </TableCell>
            </TableRow>
          ))}
        </Table>

        <div className="flex justify-end p-4 bg-white rounded-lg border border-slate-200">
          <div className="text-right">
            <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Subscription Amount</span>
            <div className="text-xl font-bold text-slate-900 font-mono">
              ${Number(subscription.total_amount).toFixed(2)}
            </div>
          </div>
        </div>
      </div>

      {/* History Timeline */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
          <History className="w-5 h-5 text-indigo-600" />
          Status Transition Audit Log
        </h3>

        {historyLogs.length === 0 ? (
          <p className="text-xs text-slate-400 italic">No historical log entries recorded.</p>
        ) : (
          <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {historyLogs.map((log) => (
              <div key={log.id} className="relative flex items-start gap-4">
                <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white" />
                <div className="flex-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200">
                        {log.from_status} &rarr; {log.to_status}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">{log.reason || 'Status updated'}</span>
                    </div>
                    <span className="text-[11px] text-slate-400">
                      {new Date(log.created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Actor: <span className="font-mono text-slate-600">{log.changed_by || 'System'}</span>
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SubscriptionDetailPage;
