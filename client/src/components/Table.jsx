import React from 'react';

export function Table({ headers = [], children, className = '' }) {
  return (
    <div className={`overflow-x-auto rounded-lg border border-slate-200 shadow-sm bg-white ${className}`}>
      <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
        <thead className="bg-slate-50">
          <tr>
            {headers.map((header, idx) => (
              <th
                key={idx}
                scope="col"
                className={`px-4 py-3.5 text-xs font-semibold text-slate-600 uppercase tracking-wider ${
                  header.align === 'right' ? 'text-right' : header.align === 'center' ? 'text-center' : 'text-left'
                } ${header.className || ''}`}
              >
                {header.label || header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 bg-white">{children}</tbody>
      </table>
    </div>
  );
}

export function TableRow({ children, className = '', onClick }) {
  return (
    <tr
      onClick={onClick}
      className={`hover:bg-slate-50/80 transition-colors ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </tr>
  );
}

export function TableCell({ children, className = '', align = 'left' }) {
  const alignClass = align === 'right' ? 'text-right' : align === 'center' ? 'text-center' : 'text-left';
  return <td className={`px-4 py-3.5 whitespace-nowrap text-slate-700 ${alignClass} ${className}`}>{children}</td>;
}

export default Table;

