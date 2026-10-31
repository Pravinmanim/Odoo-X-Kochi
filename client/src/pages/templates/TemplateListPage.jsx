import React, { useState, useEffect, useCallback } from 'react';
import api, { getErrorMessage } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import Table, { TableRow, TableCell } from '../../components/Table.jsx';
import Badge from '../../components/Badge.jsx';
import Pagination from '../../components/Pagination.jsx';
import Loader from '../../components/Loader.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { FileSpreadsheet, Clock, Layers } from 'lucide-react';

export default function TemplateListPage() {
  const [templates, setTemplates] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const { error: toastError } = useToast();

  const fetchTemplates = useCallback(
    async (page = 1) => {
      setIsLoading(true);
      try {
        const res = await api.get('/templates', {
          params: { page, limit: 20 },
        });
        setTemplates(res.data?.data || []);
        if (res.data?.totalPages) {
          setPagination({
            page: res.data.page,
            limit: res.data.limit,
            total: res.data.total,
            totalPages: res.data.totalPages,
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
    fetchTemplates(1);
  }, [fetchTemplates]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quotation Templates</h1>
          <p className="text-sm text-slate-500 mt-1">
            Pre-packaged bundles of recurring services, line items, and default validity windows (20 per page)
          </p>
        </div>
      </div>

      {isLoading ? (
        <Loader text="Loading quotation templates..." />
      ) : templates.length === 0 ? (
        <EmptyState
          title="No quotation templates found"
          description="Create your first quotation template bundle to accelerate subscription drafting."
          icon={FileSpreadsheet}
        />
      ) : (
        <div className="space-y-4">
          <Table
            headers={[
              { label: 'Template Name' },
              { label: 'Description' },
              { label: 'Validity Window' },
              { label: 'Packaged Lines' },
              { label: 'Estimated Total', align: 'right' },
            ]}
          >
            {templates.map((tmpl) => {
              const linesCount = tmpl.lines?.length || 0;
              const estTotal =
                tmpl.lines?.reduce((sum, l) => sum + Number(l.unit_price) * (l.quantity || 1), 0) || 0;

              return (
                <TableRow key={tmpl.id}>
                  <TableCell>
                    <div className="font-semibold text-slate-900">{tmpl.name}</div>
                  </TableCell>

                  <TableCell>
                    <div className="text-xs text-slate-600 max-w-sm truncate">
                      {tmpl.description || 'Pre-configured architecture bundle'}
                    </div>
                  </TableCell>

                  <TableCell>
                    <div className="flex items-center gap-1.5 text-xs text-slate-600">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>{tmpl.quotation_valid_days || 30} days</span>
                    </div>
                  </TableCell>

                  <TableCell>
                    <span className="text-xs text-slate-700 font-medium">
                      {linesCount} product {linesCount === 1 ? 'item' : 'items'}
                    </span>
                  </TableCell>

                  <TableCell align="right">
                    <span className="font-mono font-semibold text-slate-900">
                      ${estTotal.toFixed(2)}
                    </span>
                  </TableCell>
                </TableRow>
              );
            })}
          </Table>

          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            pageSize={pagination.limit}
            onPageChange={(page) => fetchTemplates(page)}
          />
        </div>
      )}
    </div>
  );
}
