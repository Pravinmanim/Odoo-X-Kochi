import React from 'react';
import { Check, X } from 'lucide-react';

export function PasswordChecklist({ password = '' }) {
  const criteria = [
    {
      label: 'More than 8 characters (at least 9)',
      met: password.length > 8,
    },
    {
      label: 'At least one uppercase letter (A-Z)',
      met: /[A-Z]/.test(password),
    },
    {
      label: 'At least one lowercase letter (a-z)',
      met: /[a-z]/.test(password),
    },
    {
      label: 'At least one special character (!@#$%^&*)',
      met: /[^A-Za-z0-9]/.test(password),
    },
  ];

  return (
    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1.5 mt-1.5">
      <p className="font-semibold text-slate-700 mb-1">Password Requirements:</p>
      {criteria.map((item, idx) => (
        <div
          key={idx}
          className={`flex items-center gap-2 transition-colors ${
            item.met ? 'text-emerald-600 font-medium' : 'text-slate-500'
          }`}
        >
          {item.met ? (
            <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
          ) : (
            <X className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          )}
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

export default PasswordChecklist;

