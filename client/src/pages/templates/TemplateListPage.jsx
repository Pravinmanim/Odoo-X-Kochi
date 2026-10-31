import React, { useState, useEffect, useCallback } from 'react';
import api, { getErrorMessage } from '../../api/client.js';
import { useToast } from '../../context/ToastContext.jsx';
import Table, { TableRow, TableCell } from '../../components/Table.jsx';
import Button from '../../components/Button.jsx';
import ConfirmDialog from '../../components/ConfirmDialog.jsx';
import Badge from '../../components/Badge.jsx';
import Pagination from '../../components/Pagination.jsx';
import Loader from '../../components/Loader.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { FileSpreadsheet, Clock, Layers, Trash2 } from 'lucide-react';

export default function TemplateListPage() {
  const [templates, setTemplates] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState({ isOpen: false, item: null, isDeleting: false });
  const { success, error: toastError } = useToast();

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

  const handleOpenDelete = (template) => {
    setDeleteConfirm({ isOpen: true, item: template, isDeleting: false });
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirm.item) return;
    setDeleteConfirm((prev) => ({ ...prev, isDeleting: true }));
    try {
      await api.delete(`/templates/${deleteConfirm.item.id}`);
      success(`Template "${deleteConfirm.item.name}" deleted successfully.`);
      setDeleteConfirm({ isOpen: false, item: null, isDeleting: false });
      fetchTemplates(pagination.page);
    } catch (err) {
      toastError(getErrorMessage(err));
      setDeleteConfirm((prev) => ({ ...prev, isDeleting: false }));
    }
  };

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
              { label: 'Actions', align: 'right' },
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

                  <TableCell align="right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleOpenDelete(tmpl)}
                      title="Delete Template"
                    >
                      <Trash2 className="w-4 h-4 text-slate-600 hover:text-rose-600" />
                    </Button>
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

      {/* Delete Template Confirm Dialog */}
      <ConfirmDialog
        isOpen={deleteConfirm.isOpen}
        title="Delete Quotation Template"
        message={`Are you sure you want to delete template "${deleteConfirm.item?.name}"?`}
        confirmLabel="Delete"
        isDestructive={true}
        isLoading={deleteConfirm.isDeleting}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm({ isOpen: false, item: null, isDeleting: false })}
      />
    </div>
  );
}
