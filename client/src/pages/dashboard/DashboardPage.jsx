import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Repeat,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Download,
  Calendar,
  RefreshCw,
  FileSpreadsheet,
  CheckCircle2,
  PieChart as PieIcon,
  BarChart2,
  Layers,
  CreditCard,
  Building2,
  Activity,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  getOverview,
  getRevenueAnalytics,
  getSubscriptionAnalytics,
  getCustomerAnalytics,
  downloadReport,
} from '../../api/analytics.js';
import { useToast } from '../../context/ToastContext.jsx';
import Loader from '../../components/Loader.jsx';
import Badge from '../../components/Badge.jsx';
import Table, { TableRow, TableCell } from '../../components/Table.jsx';
import Button from '../../components/Button.jsx';

const CHART_COLORS = ['#4f46e5', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function DashboardPage() {
  const { success, error: toastError } = useToast();

  // Active Tab
  const [activeTab, setActiveTab] = useState('overview');

  // Filter State
  const [period, setPeriod] = useState('30d');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Data States
  const [loading, setLoading] = useState(true);
  const [exportingReport, setExportingReport] = useState(null);
  const [overviewData, setOverviewData] = useState(null);
  const [revenueData, setRevenueData] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [customerData, setCustomerData] = useState(null);

  // Fetch all analytics data based on active period
  const fetchAllData = useCallback(async () => {
    setLoading(true);
    try {
      const query = { period };
      if (period === 'custom') {
        if (customStart) query.startDate = customStart;
        if (customEnd) query.endDate = customEnd;
      }

      const [overview, revenue, subscriptions, customers] = await Promise.all([
        getOverview(query),
        getRevenueAnalytics(query),
        getSubscriptionAnalytics(query),
        getCustomerAnalytics(query),
      ]);

      setOverviewData(overview);
      setRevenueData(revenue);
      setSubscriptionData(subscriptions);
      setCustomerData(customers);
    } catch (err) {
      console.error('Failed to load analytics:', err);
      toastError(err.response?.data?.error?.message || 'Failed to load analytics data.');
    } finally {
      setLoading(false);
    }
  }, [period, customStart, customEnd, toastError]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Handle report CSV export
  const handleExport = async (reportType) => {
    setExportingReport(reportType);
    try {
      const query = { period };
      if (period === 'custom') {
        if (customStart) query.startDate = customStart;
        if (customEnd) query.endDate = customEnd;
      }
      await downloadReport(reportType, query);
      success(`${reportType.charAt(0).toUpperCase() + reportType.slice(1)} Report downloaded successfully!`);
    } catch (err) {
      console.error('Failed to export report:', err);
      toastError('Failed to download report. Please try again.');
    } finally {
      setExportingReport(null);
    }
  };

  const metrics = overviewData?.metrics || {};

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header & Filters Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-indigo-600" />
            Executive Reports & Analytics
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Real-time subscription revenue performance, churn intelligence, and customer growth.
          </p>
        </div>

        {/* Date Filter Pills */}
        <div className="flex flex-wrap items-center gap-2">
          {[
            { label: 'Today', value: 'today' },
            { label: '7 Days', value: '7d' },
            { label: '30 Days', value: '30d' },
            { label: 'This Month', value: 'this_month' },
            { label: 'Last Month', value: 'last_month' },
            { label: 'This Year', value: 'this_year' },
            { label: 'Custom', value: 'custom' },
          ].map((item) => (
            <button
              key={item.value}
              onClick={() => setPeriod(item.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                period === item.value
                  ? 'bg-indigo-600 text-white shadow-sm font-semibold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {item.label}
            </button>
          ))}

          <button
            onClick={fetchAllData}
            title="Refresh Data"
            className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 transition-colors ml-1"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Custom Date Pickers */}
      {period === 'custom' && (
        <div className="bg-indigo-50/70 border border-indigo-100 p-4 rounded-xl flex flex-wrap items-center gap-4 text-sm text-indigo-950">
          <span className="font-semibold flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-indigo-600" /> Date Range:
          </span>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600">Start:</label>
            <input
              type="date"
              value={customStart}
              onChange={(e) => setCustomStart(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-md border border-slate-300 bg-white"
            />
          </div>
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-600">End:</label>
            <input
              type="date"
              value={customEnd}
              onChange={(e) => setCustomEnd(e.target.value)}
              className="px-2.5 py-1 text-xs rounded-md border border-slate-300 bg-white"
            />
          </div>
          <Button size="sm" onClick={fetchAllData}>
            Apply Range
          </Button>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-medium">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'revenue', label: 'Revenue Analytics' },
          { id: 'subscriptions', label: 'Subscription Analytics' },
          { id: 'customers', label: 'Customer Analytics' },
          { id: 'reports', label: 'Downloadable Reports' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`pb-3 font-semibold transition-all relative ${
              activeTab === tab.id
                ? 'text-indigo-600 border-b-2 border-indigo-600'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Loading Overlay */}
      {loading && !overviewData && (
        <div className="py-20 flex justify-center">
          <Loader text="Compiling financial & subscription analytics..." />
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 1: OVERVIEW */}
      {/* ===================================================================== */}
      {activeTab === 'overview' && overviewData && (
        <div className="space-y-6">
          {/* Key KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Revenue */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Revenue (Period)
                </span>
                <span className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                  <DollarSign className="w-5 h-5" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-900">
                  ${Number(metrics.periodRevenue || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs">
                  {metrics.revenueGrowth >= 0 ? (
                    <span className="text-emerald-600 font-semibold flex items-center">
                      <TrendingUp className="w-3.5 h-3.5 mr-0.5" /> +{metrics.revenueGrowth}%
                    </span>
                  ) : (
                    <span className="text-rose-600 font-semibold flex items-center">
                      <TrendingDown className="w-3.5 h-3.5 mr-0.5" /> {metrics.revenueGrowth}%
                    </span>
                  )}
                  <span className="text-slate-400">vs previous period</span>
                </div>
              </div>
            </div>

            {/* MRR */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Monthly Recurring (MRR)
                </span>
                <span className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
                  <Repeat className="w-5 h-5" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-900">
                  ${Number(metrics.mrr || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  ARR: <span className="font-semibold text-slate-700">${Number(metrics.arr || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
              </div>
            </div>

            {/* Active Subscriptions */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Active Subscriptions
                </span>
                <span className="p-2 rounded-lg bg-blue-50 text-blue-600">
                  <Layers className="w-5 h-5" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-900">
                  {metrics.activeSubscriptions || 0}
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-slate-500">
                  <span className="text-emerald-600 font-semibold">+{metrics.subscriptionGrowth}%</span> new additions
                </div>
              </div>
            </div>

            {/* Total Customers */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex justify-between items-start">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Total Customers
                </span>
                <span className="p-2 rounded-lg bg-purple-50 text-purple-600">
                  <Users className="w-5 h-5" />
                </span>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-bold text-slate-900">
                  {metrics.totalCustomers || 0}
                </div>
                <div className="text-xs text-slate-500 mt-2">
                  <span className="text-emerald-600 font-semibold">+{metrics.newCustomers || 0}</span> new in this period
                </div>
              </div>
            </div>
          </div>

          {/* Secondary Metric Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Churn Rate */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-lg bg-amber-50 text-amber-600">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">Churn Rate</div>
                <div className="text-lg font-bold text-slate-800">{metrics.churnRate || 0}%</div>
              </div>
            </div>

            {/* Overdue Invoices Alert */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-lg bg-rose-50 text-rose-600">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">Overdue Invoices</div>
                <div className="text-lg font-bold text-rose-600">
                  ${Number(metrics.overdueInvoices?.amount || 0).toLocaleString()}
                  <span className="text-xs font-normal text-slate-400 ml-1.5">
                    ({metrics.overdueInvoices?.count || 0} open)
                  </span>
                </div>
              </div>
            </div>

            {/* Pending Payments */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
              <div className="p-3 rounded-lg bg-sky-50 text-sky-600">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-medium text-slate-500">Pending Billing</div>
                <div className="text-lg font-bold text-slate-800">
                  ${Number(metrics.pendingPayments?.amount || 0).toLocaleString()}
                  <span className="text-xs font-normal text-slate-400 ml-1.5">
                    ({metrics.pendingPayments?.count || 0} drafts)
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Charts Row 1: Revenue Trend & Plan Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Trend Area Chart */}
            <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Revenue Trajectory</h2>
                  <p className="text-xs text-slate-500">Daily incoming payments collected across all accounts</p>
                </div>
                <Badge variant="success">Live Database Data</Badge>
              </div>
              <div className="h-72">
                {revenueData?.revenueTrend && revenueData.revenueTrend.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueData.revenueTrend}>
                      <defs>
                        <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                      <Tooltip
                        formatter={(val) => [`$${Number(val).toFixed(2)}`, 'Revenue']}
                        labelFormatter={(lbl) => `Date: ${lbl}`}
                        contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      />
                      <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2.5} fillOpacity={1} fill="url(#revenueGrad)" />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    No payment records found within this timeframe.
                  </div>
                )}
              </div>
            </div>

            {/* Revenue by Subscription Plan */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
              <h2 className="text-base font-bold text-slate-900 mb-1">Plan Revenue Share</h2>
              <p className="text-xs text-slate-500 mb-4">Revenue composition by recurring billing plan</p>
              <div className="h-64 flex-1">
                {revenueData?.revenueByPlan && revenueData.revenueByPlan.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revenueData.revenueByPlan}
                        dataKey="revenue"
                        nameKey="planName"
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={80}
                        paddingAngle={4}
                      >
                        {revenueData.revenueByPlan.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => `$${Number(v).toFixed(2)}`} />
                      <Legend verticalAlign="bottom" height={36} wrapperStyle={{ fontSize: '11px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    No plan subscriptions recorded.
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Row 2: Top Customers Leaderboard & Subscription Statuses */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Customers Leaderboard */}
            <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">Top Customers by Revenue</h2>
                  <p className="text-xs text-slate-500">Highest lifetime spending subscriber accounts</p>
                </div>
                <Link to="/customers" className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center">
                  View all customers <ArrowUpRight className="w-3.5 h-3.5 ml-0.5" />
                </Link>
              </div>

              {customerData?.topCustomers && customerData.topCustomers.length > 0 ? (
                <Table
                  headers={[
                    { label: 'Customer', key: 'name' },
                    { label: 'Company', key: 'company' },
                    { label: 'Active Subs', key: 'activeSubs', align: 'center' },
                    { label: 'Total Paid', key: 'totalRevenue', align: 'right' },
                  ]}
                >
                  {customerData.topCustomers.slice(0, 5).map((cust, i) => (
                    <TableRow key={cust.id}>
                      <TableCell>
                        <div className="font-semibold text-slate-900">{cust.name}</div>
                        <div className="text-xs text-slate-400">{cust.email}</div>
                      </TableCell>
                      <TableCell>{cust.company || 'Individual'}</TableCell>
                      <TableCell align="center">
                        <Badge status="active">{cust.activeSubscriptionsCount}</Badge>
                      </TableCell>
                      <TableCell align="right" className="font-bold text-emerald-600">
                        ${cust.totalRevenue.toFixed(2)}
                      </TableCell>
                    </TableRow>
                  ))}
                </Table>
              ) : (
                <div className="py-8 text-center text-slate-400 text-sm">No customer records available.</div>
              )}
            </div>

            {/* Subscription Status Breakdown */}
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 mb-1">Subscription Health</h2>
              <p className="text-xs text-slate-500 mb-4">Current distribution across state machine</p>
              <div className="space-y-3">
                {[
                  { label: 'Active', count: subscriptionData?.statusBreakdown?.active || 0, color: 'bg-emerald-500', badge: 'active' },
                  { label: 'Quotation', count: subscriptionData?.statusBreakdown?.quotation || 0, color: 'bg-blue-500', badge: 'quotation' },
                  { label: 'Confirmed', count: subscriptionData?.statusBreakdown?.confirmed || 0, color: 'bg-amber-500', badge: 'confirmed' },
                  { label: 'Closed / Churned', count: subscriptionData?.statusBreakdown?.closed || 0, color: 'bg-rose-500', badge: 'closed' },
                  { label: 'Draft', count: subscriptionData?.statusBreakdown?.draft || 0, color: 'bg-slate-400', badge: 'draft' },
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${item.color}`} />
                      <span className="text-xs font-medium text-slate-700">{item.label}</span>
                    </div>
                    <Badge status={item.badge}>{item.count}</Badge>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 2: REVENUE ANALYTICS */}
      {/* ===================================================================== */}
      {activeTab === 'revenue' && revenueData && (
        <div className="space-y-6">
          {/* Revenue Breakdown Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 uppercase">Paid Invoices</div>
              <div className="text-2xl font-bold text-emerald-600 mt-2">
                ${revenueData.invoiceStatusSummary?.paid?.amount?.toFixed(2) || '0.00'}
              </div>
              <div className="text-xs text-slate-400 mt-1">{revenueData.invoiceStatusSummary?.paid?.count || 0} successfully collected</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 uppercase">Pending Invoices</div>
              <div className="text-2xl font-bold text-amber-600 mt-2">
                ${revenueData.invoiceStatusSummary?.pending?.amount?.toFixed(2) || '0.00'}
              </div>
              <div className="text-xs text-slate-400 mt-1">{revenueData.invoiceStatusSummary?.pending?.count || 0} awaiting confirmation</div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <div className="text-xs font-semibold text-slate-500 uppercase">Overdue Collections</div>
              <div className="text-2xl font-bold text-rose-600 mt-2">
                ${revenueData.invoiceStatusSummary?.overdue?.amount?.toFixed(2) || '0.00'}
              </div>
              <div className="text-xs text-slate-400 mt-1">{revenueData.invoiceStatusSummary?.overdue?.count || 0} past due date</div>
            </div>
          </div>

          {/* Month-over-Month Revenue Growth History Chart */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-1">6-Month Historical Revenue & MoM Growth</h2>
            <p className="text-xs text-slate-500 mb-4">Monthly collection trend with month-over-month growth rate</p>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueData.monthlyRevenueHistory}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="month" stroke="#94a3b8" fontSize={11} tickLine={false} />
                  <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} tickFormatter={(v) => `$${v}`} />
                  <Tooltip
                    formatter={(val) => [`$${Number(val).toFixed(2)}`, 'Revenue']}
                    labelFormatter={(lbl) => `Month: ${lbl}`}
                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                  />
                  <Bar dataKey="revenue" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Revenue by Payment Method */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-1">Payment Method Distribution</h2>
            <p className="text-xs text-slate-500 mb-4">Breakdown of transaction amounts by gateway and method</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {revenueData.revenueByPaymentMethod?.map((m) => (
                <div key={m.method} className="p-4 rounded-lg border border-slate-200 bg-slate-50">
                  <div className="flex items-center justify-between text-xs text-slate-500 font-semibold mb-1">
                    <span>{m.method.replace(/_/g, ' ')}</span>
                    <Badge variant="default">{m.percentage}%</Badge>
                  </div>
                  <div className="text-lg font-bold text-slate-900">${m.total.toFixed(2)}</div>
                  <div className="text-xs text-slate-400 mt-1">{m.count} transactions processed</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 3: SUBSCRIPTION ANALYTICS */}
      {/* ===================================================================== */}
      {activeTab === 'subscriptions' && subscriptionData && (
        <div className="space-y-6">
          {/* Plan Popularity Table */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-1">Subscription Plan Performance</h2>
            <p className="text-xs text-slate-500 mb-4">Subscriber adoption, active commitments, and recurring MRR value</p>
            <Table
              headers={[
                { label: 'Plan Name', key: 'name' },
                { label: 'Billing Period', key: 'period' },
                { label: 'Base Price', key: 'price', align: 'right' },
                { label: 'Total Subscribers', key: 'total', align: 'center' },
                { label: 'Active Subscribers', key: 'active', align: 'center' },
                { label: 'Recurring Value', key: 'value', align: 'right' },
              ]}
            >
              {subscriptionData.planPopularity?.map((plan) => (
                <TableRow key={plan.planId}>
                  <TableCell className="font-semibold text-slate-900">{plan.name}</TableCell>
                  <TableCell>
                    <Badge variant="default">{plan.billingPeriod}</Badge>
                  </TableCell>
                  <TableCell align="right">${plan.price.toFixed(2)}</TableCell>
                  <TableCell align="center">{plan.totalSubscribers}</TableCell>
                  <TableCell align="center">
                    <Badge status="active">{plan.activeSubscribers}</Badge>
                  </TableCell>
                  <TableCell align="right" className="font-bold text-emerald-600">
                    ${plan.recurringValue.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </Table>
          </div>

          {/* New Subscriptions vs Cancellations Timeline */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 mb-1">New Subscriptions Acquisition</h2>
              <p className="text-xs text-slate-500 mb-4">New subscriptions generated over the period</p>
              <div className="h-64">
                {subscriptionData.newSubscriptionsTimeline?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subscriptionData.newSubscriptionsTimeline}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      />
                      <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="New Subscriptions" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    No new subscriptions created in this period.
                  </div>
                )}
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
              <h2 className="text-base font-bold text-slate-900 mb-1">Cancellations & Churn Trends</h2>
              <p className="text-xs text-slate-500 mb-4">Closed and terminated subscriptions from status audit logs</p>
              <div className="h-64">
                {subscriptionData.cancellationsTimeline?.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={subscriptionData.cancellationsTimeline}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} />
                      <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', color: '#fff', fontSize: '12px' }}
                      />
                      <Bar dataKey="count" fill="#ef4444" radius={[4, 4, 0, 0]} name="Cancelled" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                    No cancellations recorded in this period.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 4: CUSTOMER ANALYTICS */}
      {/* ===================================================================== */}
      {activeTab === 'customers' && customerData && (
        <div className="space-y-6">
          {/* Customer Segmentation Grid */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-1">Customer Revenue Segmentation</h2>
            <p className="text-xs text-slate-500 mb-4">Distribution by account tier and lifetime contract spending</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(customerData.segmentation || {}).map(([key, seg]) => (
                <div key={key} className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{seg.label}</div>
                  <div className="text-2xl font-bold text-slate-900 mt-2">{seg.count} <span className="text-xs font-normal text-slate-400">clients</span></div>
                  <div className="text-xs font-semibold text-emerald-600 mt-1">${(seg.revenue || 0).toFixed(2)} generated</div>
                </div>
              ))}
            </div>
          </div>

          {/* Subscription Distribution */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h2 className="text-base font-bold text-slate-900 mb-1">Customer Subscriptions Distribution</h2>
            <p className="text-xs text-slate-500 mb-4">Number of active subscription packages held per account</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-center">
                <div className="text-xs text-slate-500 font-medium">0 Subscriptions</div>
                <div className="text-xl font-bold text-slate-700 mt-1">{customerData.subscriptionDistribution?.zero || 0}</div>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-center">
                <div className="text-xs text-slate-500 font-medium">1 Subscription</div>
                <div className="text-xl font-bold text-indigo-600 mt-1">{customerData.subscriptionDistribution?.one || 0}</div>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-center">
                <div className="text-xs text-slate-500 font-medium">2 - 3 Subscriptions</div>
                <div className="text-xl font-bold text-blue-600 mt-1">{customerData.subscriptionDistribution?.twoToThree || 0}</div>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-200 text-center">
                <div className="text-xs text-slate-500 font-medium">4+ Subscriptions</div>
                <div className="text-xl font-bold text-purple-600 mt-1">{customerData.subscriptionDistribution?.fourPlus || 0}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* TAB 5: DOWNLOADABLE REPORTS */}
      {/* ===================================================================== */}
      {activeTab === 'reports' && (
        <div className="space-y-6">
          <div className="bg-indigo-50 border border-indigo-200 p-5 rounded-xl text-indigo-900">
            <div className="flex items-center gap-2 font-bold text-base">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
              Downloadable Business Intelligence & Audit Reports
            </div>
            <p className="text-xs text-indigo-700 mt-1">
              Export comprehensive CSV audit trails filtered by the selected date range ({period.toUpperCase()}).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              {
                id: 'revenue',
                title: 'Revenue Report',
                desc: 'Detailed chronological ledger of incoming payments, payment methods, transaction references, and linked subscriber plans.',
                icon: DollarSign,
                color: 'text-emerald-600 bg-emerald-50',
              },
              {
                id: 'subscriptions',
                title: 'Subscription Report',
                desc: 'Full directory of subscriptions, statuses, renewal dates, payment terms, and calculated recurring amounts.',
                icon: Layers,
                color: 'text-indigo-600 bg-indigo-50',
              },
              {
                id: 'customers',
                title: 'Customer Report',
                desc: 'Customer accounts overview with contact data, active contracts, total lifetime spending, and creation dates.',
                icon: Users,
                color: 'text-blue-600 bg-blue-50',
              },
              {
                id: 'payments',
                title: 'Payment Report',
                desc: 'Complete payment gateway audit log containing transaction IDs, methods, linked invoices, and processing notes.',
                icon: CreditCard,
                color: 'text-purple-600 bg-purple-50',
              },
              {
                id: 'invoices',
                title: 'Invoice Report',
                desc: 'Billing ledger with period start/end dates, tax calculations, discounts applied, and overdue status flags.',
                icon: FileSpreadsheet,
                color: 'text-amber-600 bg-amber-50',
              },
            ].map((report) => {
              const Icon = report.icon;
              const isExporting = exportingReport === report.id;

              return (
                <div key={report.id} className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className={`p-2.5 rounded-lg ${report.color}`}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <Badge variant="default">CSV Format</Badge>
                    </div>
                    <h3 className="font-bold text-slate-900 text-base">{report.title}</h3>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">{report.desc}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs text-slate-400">Filter: {period}</span>
                    <Button
                      size="sm"
                      onClick={() => handleExport(report.id)}
                      disabled={isExporting}
                      className="flex items-center gap-1.5"
                    >
                      {isExporting ? (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                          <span>Generating...</span>
                        </>
                      ) : (
                        <>
                          <Download className="w-3.5 h-3.5" />
                          <span>Download CSV</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
