import React from 'react';
import { Bell, Search, Database, UserCheck, Shield } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

export const Navbar = ({ title, subtitle, lowStockCount = 0 }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-30">
      {/* Title & Breadcrumb */}
      <div>
        <h2 className="text-lg font-bold text-slate-900 leading-tight">{title}</h2>
        {subtitle && <p className="text-xs text-slate-500 font-normal">{subtitle}</p>}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-3">
        {/* System Online Badge */}
        <div className="hidden md:flex items-center gap-2 px-2.5 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium">
          <Database className="w-3.5 h-3.5 text-emerald-600" />
          <span>MongoDB Live</span>
        </div>

        {/* Low Stock Alert Bell */}
        {lowStockCount > 0 && (
          <button
            onClick={() => navigate('/products?lowStockOnly=true')}
            title={`${lowStockCount} items below threshold! Click to view.`}
            className="relative p-2 rounded-xl text-amber-600 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors"
          >
            <Bell className="w-4 h-4 animate-bounce" />
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white shadow-xs">
              {lowStockCount}
            </span>
          </button>
        )}

        {/* User Chip */}
        <div
          onClick={() => navigate('/profile')}
          className="flex items-center gap-2 pl-2 pr-3 py-1 rounded-full border border-slate-200 hover:border-slate-300 bg-slate-50 cursor-pointer transition-colors"
        >
          <div className="w-6 h-6 rounded-full bg-indigo-600 text-white text-xs font-semibold flex items-center justify-center">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <span className="text-xs font-medium text-slate-700 max-w-[120px] truncate">
            {user?.name || 'Admin'}
          </span>
        </div>
      </div>
    </header>
  );
};
