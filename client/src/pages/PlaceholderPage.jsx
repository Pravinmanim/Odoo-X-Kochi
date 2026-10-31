import React from 'react';
import { Layers } from 'lucide-react';

export function PlaceholderPage({ title, description }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center p-8 bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="p-4 bg-indigo-50 text-indigo-600 rounded-2xl mb-4">
        <Layers className="w-10 h-10" />
      </div>
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <p className="text-slate-500 max-w-md mt-2 text-sm">
        {description ||
          'This module is slated for implementation by Developer 2 following the architecture patterns established in the Products reference module.'}
      </p>
      <div className="mt-6 px-4 py-2 bg-slate-50 text-slate-600 rounded-lg border border-slate-200 text-xs font-mono">
        Foundation Ready • Prisma Models Configured
      </div>
    </div>
  );
}

export default PlaceholderPage;

