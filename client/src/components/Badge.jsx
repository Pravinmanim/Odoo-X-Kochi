import React from 'react';

/**
 * Standard Status Color Mappings:
 * Draft: Grey
 * Quotation: Blue
 * Confirmed: Amber
 * Active: Green
 * Closed: Red
 * Paid: Green
 * Overdue: Red
 */
const statusStyles = {
  // Required Status Mappings
  draft: 'bg-slate-100 text-slate-700 border-slate-300',
  quotation: 'bg-blue-50 text-blue-700 border-blue-200',
  confirmed: 'bg-amber-50 text-amber-700 border-amber-200',
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  closed: 'bg-rose-50 text-rose-700 border-rose-200',
  paid: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  overdue: 'bg-rose-50 text-rose-700 border-rose-200',

  // Role badges
  admin: 'bg-purple-50 text-purple-700 border-purple-200',
  staff: 'bg-sky-50 text-sky-700 border-sky-200',
  customer: 'bg-indigo-50 text-indigo-700 border-indigo-200',

  // Generic fallback
  default: 'bg-slate-100 text-slate-700 border-slate-200',
};

export function Badge({ children, status, variant, className = '' }) {
  const key = (status || variant || 'default').toString().toLowerCase();
  const style = statusStyles[key] || statusStyles.default;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${style} ${className}`}
    >
      {children || status}
    </span>
  );
}

export default Badge;

