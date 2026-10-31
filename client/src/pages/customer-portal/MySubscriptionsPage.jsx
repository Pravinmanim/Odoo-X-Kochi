import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { subscriptionsApi } from '../../api/subscriptions.js';
import { getErrorMessage } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import Table, { TableRow, TableCell } from '../../components/Table.jsx';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import Loader from '../../components/Loader.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { CalendarCheck, ExternalLink, ShieldCheck } from 'lucide-react';

export function MySubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const { error: toastError } = useToast();

  useEffect(() => {
    async function loadMySubscriptions() {
      setIsLoading(true);
      try {
        const response = await subscriptionsApi.listMy();
        setSubscriptions(response.data || []);
      } catch (err) {
        toastError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    }

    loadMySubscriptions();
  }, [toastError]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Subscriptions</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review your enrolled services, active billing plans, renewal milestones, and invoices
        </p>
      </div>

      {isLoading ? (
        <Loader text="Loading your subscriptions..." />
      ) : subscriptions.length === 0 ? (
        <EmptyState
          title="No active subscriptions found"
          description="You do not currently have any active recurring subscriptions. Contact your account manager or sales representative to activate a plan."
          icon={CalendarCheck}
        />
      ) : (
        <div className="space-y-4">
          <Table
            headers={[
              { label: 'Subscription #' },
              { label: 'Plan & Billing' },
              { label: 'Status' },
              { label: 'Recurring Total', align: 'right' },
              { label: 'Start Date' },
              { label: 'Next Renewal' },
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

                {/* Plan */}
                <TableCell>
                  <span className="font-semibold text-slate-900">{sub.plan?.name || 'Custom Plan'}</span>
                  {sub.plan && (
                    <span className="block text-xs text-slate-500 font-mono">
                      {sub.plan.billing_period}
                    </span>
                  )}
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge status={sub.status} />
                </TableCell>

                {/* Total */}
                <TableCell align="right" className="font-mono font-bold text-slate-900">
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

                {/* Action */}
                <TableCell align="right">
                  <Link to={`/subscriptions/${sub.id}`}>
                    <Button variant="secondary" size="sm">
                      View Details
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </Table>
        </div>
      )}
    </div>
  );
}

export default MySubscriptionsPage;
