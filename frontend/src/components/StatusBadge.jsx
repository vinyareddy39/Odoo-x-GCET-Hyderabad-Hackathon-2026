import React from 'react';

const statusStyles = {
  Draft: 'bg-slate-100 text-slate-700 border-slate-200',
  Waiting: 'bg-amber-50 text-amber-700 border-amber-200',
  Ready: 'bg-blue-50 text-blue-700 border-blue-200',
  Done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  Canceled: 'bg-rose-50 text-rose-700 border-rose-200',
};

const dotColors = {
  Draft: 'bg-slate-400',
  Waiting: 'bg-amber-500 animate-pulse',
  Ready: 'bg-blue-500',
  Done: 'bg-emerald-500',
  Canceled: 'bg-rose-500',
};

export const StatusBadge = ({ status = 'Draft', size = 'sm' }) => {
  const normalized = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
  const currentStyle = statusStyles[normalized] || statusStyles.Draft;
  const dotColor = dotColors[normalized] || dotColors.Draft;

  const sizeClasses = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2.5 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ${currentStyle} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {normalized}
    </span>
  );
};
