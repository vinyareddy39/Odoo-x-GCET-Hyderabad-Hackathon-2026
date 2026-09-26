import React from 'react';

export const KpiCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'default',
  onClick,
}) => {
  const variantStyles = {
    default: 'bg-white border-slate-200 text-slate-900',
    primary: 'bg-white border-indigo-200 text-indigo-950 ring-1 ring-indigo-50/50',
    danger: 'bg-rose-50/50 border-rose-200 text-rose-950 ring-1 ring-rose-100',
    warning: 'bg-amber-50/50 border-amber-200 text-amber-950 ring-1 ring-amber-100',
    success: 'bg-emerald-50/50 border-emerald-200 text-emerald-950 ring-1 ring-emerald-100',
  };

  const iconColors = {
    default: 'bg-slate-100 text-slate-700',
    primary: 'bg-indigo-100 text-indigo-600',
    danger: 'bg-rose-100 text-rose-600',
    warning: 'bg-amber-100 text-amber-600',
    success: 'bg-emerald-100 text-emerald-600',
  };

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden p-5 rounded-2xl border transition-all duration-200 hover:shadow-md ${
        onClick ? 'cursor-pointer hover:border-slate-300' : ''
      } ${variantStyles[variant] || variantStyles.default}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1">
            {title}
          </p>
          <div className="flex items-baseline gap-2">
            <h3 className="text-2xl font-bold tracking-tight text-slate-900">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </h3>
            {subtitle && (
              <span className="text-xs text-slate-500 font-normal">
                {subtitle}
              </span>
            )}
          </div>
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl ${iconColors[variant] || iconColors.default}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
    </div>
  );
};
