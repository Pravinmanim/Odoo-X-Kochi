import React, { useState, useEffect, useCallback } from 'react';
import api, { getErrorMessage } from '../../api/client.js';
import { downloadReport } from '../../api/analytics.js';
import { useToast } from '../../context/ToastContext.jsx';
import Table, { TableRow, TableCell } from '../../components/Table.jsx';
import Button from '../../components/Button.jsx';
import Badge from '../../components/Badge.jsx';
import Loader from '../../components/Loader.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import {
  FileSpreadsheet,
  Download,
  Calendar,
  DollarSign,
  Users,
  CreditCard,
  FileText,
  Layers,
  Filter,
  CheckCircle2,
  Clock,
  ArrowDownToLine,
  RefreshCw,
} from 'lucide-react';

const REPORT_DEFINITIONS = [
  {
    id: 'revenue',
    title: 'Revenue & Financial Statement',
    description: 'Detailed billing ledgers, gross totals, discounts given, and net revenue collected.',
    icon: DollarSign,
    color: 'emerald',
  },
  {
    id: 'subscriptions',
    title: 'Subscriptions Lifecycle Audit',
    description: 'Active subscriptions, renewal milestones, expiration timelines, and plan enrollments.',
    icon: Layers,
    color: 'indigo',
  },
  {
    id: 'invoices',
    title: 'Invoices & Aging Ledger',
    description: 'Comprehensive statement of issued invoices, derived overdue aging, and outstanding balances.',
    icon: FileText,
    color: 'blue',
  },
  {
    id: 'payments',
    title: 'Payment Settlements Ledger',
    description: 'Audit trail of captured payments, method distribution (Card, UPI, Bank), and transaction references.',
    icon: CreditCard,
    color: 'purple',
  },
  {
    id: 'customers',
    title: 'Customer Lifetime & Portfolio',
    description: 'Customer directory with subscription counts, lifetime invoiced totals, and contact details.',
    icon: Users,
    color: 'amber',
  },
];

const PERIOD_OPTIONS = [
  { value: '30d', label: 'Last 30 Days' },
  { value: '7d', label: 'Last 7 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_year', label: 'This Year' },
  { value: 'today', label: 'Today' },
  { value: 'custom', label: 'Custom Range...' },
];

export default function ReportsPage() {
  const [selectedReport, setSelectedReport] = useState('revenue');
  const [period, setPeriod] = useState('30d');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [previewData, setPreviewData] = useState([]);
  const [previewColumns, setPreviewColumns] = useState([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState(true);
  const [isExportingCsv, setIsExportingCsv] = useState(false);
  const [isExportingJson, setIsExportingJson] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const { success, error: toastError } = useToast();

  // Load preview data in JSON format
  const loadReportPreview = useCallback(async () => {
    setIsPreviewLoading(true);
    try {
      const params = {
        reportType: selectedReport,
        format: 'json',
        period,
        startDate: period === 'custom' ? startDate : undefined,
        endDate: period === 'custom' ? endDate : undefined,
      };

      const res = await api.get('/analytics/reports/export', { params });
      const rows = res.data?.data || [];
      setPreviewData(rows);

      if (rows.length > 0) {
        // Derive clean column headers
        const cols = Object.keys(rows[0]).slice(0, 7);
        setPreviewColumns(cols);
      } else {
        setPreviewColumns([]);
      }
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsPreviewLoading(false);
    }
  }, [selectedReport, period, startDate, endDate, toastError]);

  const [isPreviewLoading, setIsPreviewLoading] = useState(false);

  useEffect(() => {
    loadReportPreview();
  }, [loadReportPreview]);

  // Handle CSV Download
  const handleExportCsv = async () => {
    setIsExportingCsv(true);
    try {
      const params = {
        period,
        startDate: period === 'custom' ? startDate : undefined,
        endDate: period === 'custom' ? endDate : undefined,
      };
      await downloadReport(selectedReport, params);
      success(`${selectedReport.toUpperCase()} report exported as CSV!`);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsExportingCsv(false);
    }
  };

  // Handle JSON Download
  const handleExportJson = async () => {
    setIsExportingJson(true);
    try {
      const params = {
        reportType: selectedReport,
        format: 'json',
        period,
        startDate: period === 'custom' ? startDate : undefined,
        endDate: period === 'custom' ? endDate : undefined,
      };
      const res = await api.get('/analytics/reports/export', { params });
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(res.data, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `brightloop-${selectedReport}-report.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      success(`${selectedReport.toUpperCase()} report exported as JSON!`);
    } catch (err) {
      toastError(getErrorMessage(err));
    } finally {
      setIsExportingJson(false);
    }
  };

  // Filter preview rows by local search
  const filteredRows = previewData.filter((row) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    return Object.values(row).some((val) => String(val).toLowerCase().includes(term));
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Reporting & Export Center</h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate audit ledgers, reconcile incoming settlements, and export statements to CSV or JSON
          </p>
        </div>

        {/* Global Export Actions */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={handleExportJson}
            isLoading={isExportingJson}
            icon={ArrowDownToLine}
          >
            Export JSON
          </Button>

          <Button
            variant="primary"
            onClick={handleExportCsv}
            isLoading={isExportingCsv}
            icon={Download}
          >
            Download CSV Report
          </Button>
        </div>
      </div>

      {/* Report Types Card Carousel / Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {REPORT_DEFINITIONS.map((rep) => {
          const Icon = rep.icon;
          const isSelected = selectedReport === rep.id;

          return (
            <button
              key={rep.id}
              onClick={() => {
                setSelectedReport(rep.id);
                setSearchTerm('');
              }}
              className={`text-left p-4 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                isSelected
                  ? 'bg-white border-indigo-600 shadow-md ring-2 ring-indigo-600/10'
                  : 'bg-white/80 border-slate-200 hover:border-slate-300 hover:bg-white shadow-2xs'
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      isSelected
                        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                  )}
                </div>
                <h3 className="font-semibold text-xs text-slate-900 line-clamp-1">{rep.title}</h3>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {rep.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Filter and Date Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400" />
            <select
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
            >
              {PERIOD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {period === 'custom' && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
              />
              <span className="text-xs text-slate-400">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500 bg-white"
              />
            </div>
          )}

          <Button
            variant="secondary"
            size="sm"
            onClick={loadReportPreview}
            icon={RefreshCw}
            isLoading={isPreviewLoading}
          >
            Refresh Data
          </Button>
        </div>

        {/* Search within report preview */}
        <div className="w-full sm:w-64">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search in preview..."
            className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Interactive Report Preview Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-indigo-600" />
            <h2 className="font-semibold text-slate-900 text-sm">
              Live Preview: {REPORT_DEFINITIONS.find((r) => r.id === selectedReport)?.title}
            </h2>
          </div>
          <span className="text-xs text-slate-500 font-medium">
            {filteredRows.length} record(s) matching filter
          </span>
        </div>

        {isPreviewLoading ? (
          <div className="py-12">
            <Loader text="Generating report preview from database..." />
          </div>
        ) : filteredRows.length === 0 ? (
          <EmptyState
            title="No records found for this period"
            description="Try selecting a broader date range or clearing your filter to view historical records."
            icon={FileSpreadsheet}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table
              headers={previewColumns.map((col) => ({
                label: col.replace(/_/g, ' ').toUpperCase(),
              }))}
            >
              {filteredRows.slice(0, 50).map((row, idx) => (
                <TableRow key={idx}>
                  {previewColumns.map((col) => {
                    const val = row[col];
                    const isMoney =
                      col.includes('amount') ||
                      col.includes('price') ||
                      col.includes('total') ||
                      col.includes('revenue') ||
                      col.includes('subtotal') ||
                      col.includes('tax') ||
                      col.includes('discount');

                    return (
                      <TableCell key={col}>
                        {isMoney && typeof val === 'number' ? (
                          <span className="font-mono font-medium text-slate-900">
                            ${Number(val).toFixed(2)}
                          </span>
                        ) : typeof val === 'boolean' ? (
                          <Badge variant={val ? 'success' : 'neutral'}>
                            {val ? 'TRUE' : 'FALSE'}
                          </Badge>
                        ) : col.includes('status') ? (
                          <Badge variant="neutral">{String(val)}</Badge>
                        ) : (
                          <span className="text-xs text-slate-700 truncate max-w-xs block">
                            {val !== null && val !== undefined ? String(val) : '—'}
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </Table>
            {filteredRows.length > 50 && (
              <div className="p-3 bg-slate-50 border-t border-slate-100 text-center text-xs text-slate-500">
                Displaying first 50 rows in live preview. Click <strong>Download CSV Report</strong> above to get the complete dataset.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
