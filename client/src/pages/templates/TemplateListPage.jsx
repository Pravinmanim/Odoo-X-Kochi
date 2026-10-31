import React, { useState, useEffect } from 'react';
import Table, { TableRow, TableCell } from '../../components/Table.jsx';
import Badge from '../../components/Badge.jsx';
import Button from '../../components/Button.jsx';
import EmptyState from '../../components/EmptyState.jsx';
import { plansApi } from '../../api/plans.js';
import { FileSpreadsheet, Plus, CheckCircle, Clock } from 'lucide-react';

export default function TemplateListPage() {
  const [plans, setPlans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const res = await plansApi.list();
        setPlans(res.data || []);
      } catch {
        // Fallback
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const templates = [
    {
      id: 'tmpl-1',
      name: 'Enterprise Cloud Bundle',
      planName: 'Enterprise Cloud Yearly',
      validityDays: 30,
      description: 'Standard enterprise setup including unlimited VPN bandwidth and dedicated cloud instance.',
      itemsCount: 3,
      status: 'ACTIVE',
    },
    {
      id: 'tmpl-2',
      name: 'Startup Launch Pack',
      planName: 'Standard Cloud Monthly',
      validityDays: 14,
      description: 'Quick-start package for growing development teams with 5 user licenses.',
      itemsCount: 2,
      status: 'ACTIVE',
    },
    {
      id: 'tmpl-3',
      name: 'Custom Tailored SLA',
      planName: 'Enterprise Cloud Yearly',
      validityDays: 45,
      description: 'High-availability 24/7 dedicated support and automated nightly backups.',
      itemsCount: 4,
      status: 'ACTIVE',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Quotation Templates</h1>
          <p className="text-sm text-slate-500 mt-1">
            Pre-packaged bundles of recurring plans, services, and default pricing terms for swift quotation issuance
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <Table
          headers={[
            { label: 'Template Name' },
            { label: 'Associated Plan' },
            { label: 'Validity' },
            { label: 'Included Items' },
            { label: 'Status' },
          ]}
        >
          {templates.map((tmpl) => (
            <TableRow key={tmpl.id}>
              <TableCell>
                <div className="font-semibold text-slate-900">{tmpl.name}</div>
                <div className="text-xs text-slate-500 mt-0.5">{tmpl.description}</div>
              </TableCell>

              <TableCell>
                <span className="text-xs font-medium text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                  {tmpl.planName}
                </span>
              </TableCell>

              <TableCell>
                <div className="flex items-center gap-1.5 text-xs text-slate-600">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{tmpl.validityDays} days</span>
                </div>
              </TableCell>

              <TableCell>
                <span className="text-xs text-slate-700 font-medium">
                  {tmpl.itemsCount} product lines
                </span>
              </TableCell>

              <TableCell>
                <Badge variant="success">ACTIVE</Badge>
              </TableCell>
            </TableRow>
          ))}
        </Table>
      </div>
    </div>
  );
}

