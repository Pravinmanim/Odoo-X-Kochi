import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { subscriptionsApi } from '../../api/subscriptions.js';
import { getErrorMessage } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import Table, { TableRow, TableCell } from '../../components/Table.jsx';
import Badge from '../../components/Badge.jsx';
import Pagination from '../../components/Pagination.jsx';
import Loader from '../../components/Loader.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { CalendarCheck, ExternalLink, ShieldCheck } from 'lucide-react';

export function MySubscriptionsPage() {
  const [subscriptions, setSubscriptions] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const { error: toastError } = useToast();

  const loadMySubscriptions = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      try {
        const response = await subscriptionsApi.listMy({ page, limit: 20 });
        setSubscriptions(response.data || []);
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
    loadMySubscriptions(1);
  }, [loadMySubscriptions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">My Subscriptions</h1>
        <p className="text-sm text-slate-500 mt-1">
          Review your enrolled services, active billing plans, renewal milestones, and invoices (20 per page)
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
                  <div className="font-medium text-slate-900">{sub.plan?.name || 'Custom Plan'}</div>
                  <div className="text-xs text-slate-500 capitalize">
                    {sub.plan?.billing_period?.toLowerCase() || 'monthly'} billing
                  </div>
                </TableCell>

                {/* Status */}
                <TableCell>
                  <Badge status={sub.status} />
                </TableCell>

                {/* Total */}
                <TableCell align="right">
                  <span className="font-semibold text-slate-900 font-mono">
                    ${Number(sub.total_amount).toFixed(2)}
                  </span>
                </TableCell>

                {/* Dates */}
                <TableCell>
                  <span className="text-xs text-slate-700">
                    {sub.start_date ? new Date(sub.start_date).toLocaleDateString() : '—'}
                  </span>
                </TableCell>

                <TableCell>
                  <span className="text-xs text-slate-700">
                    {sub.next_billing_date ? new Date(sub.next_billing_date).toLocaleDateString() : '—'}
                  </span>
                </TableCell>

                <TableCell align="right">
                  <Link
                    to={`/subscriptions/${sub.id}`}
                    className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 hover:underline px-2.5 py-1 rounded bg-indigo-50 hover:bg-indigo-100 transition"
                  >
                    View
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </Table>

          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            pageSize={pagination.limit}
            onPageChange={(page) => loadMySubscriptions(page)}
          />
        </div>
      )}
    </div>
  );
}

export default MySubscriptionsPage;
