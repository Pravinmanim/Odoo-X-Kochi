import React from 'react';
import { Loader2 } from 'lucide-react';

export function Loader({ size = 'md', text = 'Loading...' }) {
  const sizeMap = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center gap-3">
      <Loader2 className={`${sizeMap[size] || sizeMap.md} animate-spin text-indigo-600`} />
      {text && <p className="text-sm font-medium text-slate-500">{text}</p>}
    </div>
  );
}

export default Loader;

