import React, { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Package,
  ArrowDownToLine,
  ArrowUpFromLine,
  SlidersHorizontal,
  History,
  Building2,
  ChevronDown,
  Layers,
  User,
  LogOut,
  ShieldCheck,
  Zap,
  BarChart3,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export const Sidebar = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Keep operations open if current path is an operation
  const isOperationsActive = [
    '/operations/receipts',
    '/operations/deliveries',
    '/operations/transfers',
    '/operations/adjustments',
    '/operations/move-history',
  ].some((path) => location.pathname.startsWith(path));

  const [operationsOpen, setOperationsOpen] = useState(true);

  const navItemClass = ({ isActive }) =>
    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
      isActive
        ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-200'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
    }`;

  const subNavItemClass = ({ isActive }) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
      isActive
        ? 'bg-indigo-50 text-indigo-700 font-semibold'
        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
    }`;

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col h-screen shrink-0 sticky top-0 select-none">
      {/* Brand Header */}
      <div className="h-16 px-6 flex items-center gap-3 border-b border-slate-100">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-indigo-100">
          <Layers className="w-5 h-5" />
        </div>
        <div>
          <h1 className="font-bold text-slate-900 text-base leading-tight tracking-tight">
            StockSense
          </h1>
          <p className="text-[11px] text-slate-400 font-medium tracking-wide">
            ENTERPRISE ERP
          </p>
        </div>
      </div>

      {/* Main Navigation Links */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {/* Core Group */}
        <div>
          <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Main
          </p>
          <div className="space-y-1">
            <NavLink to="/dashboard" className={navItemClass}>
              <LayoutDashboard className="w-4 h-4" />
              <span>Dashboard</span>
            </NavLink>
            <NavLink to="/products" className={navItemClass}>
              <Package className="w-4 h-4" />
              <span>Products</span>
            </NavLink>
            <NavLink to="/reorder" className={navItemClass}>
              <Zap className="w-4 h-4 text-amber-500" />
              <div className="flex items-center justify-between flex-1">
                <span>Smart Reorder</span>
                <span className="text-[10px] bg-amber-100 text-amber-800 font-semibold px-1.5 py-0.5 rounded-full">AI</span>
              </div>
            </NavLink>
            <NavLink to="/reports" className={navItemClass}>
              <BarChart3 className="w-4 h-4 text-indigo-500" />
              <span>Reports & Analytics</span>
            </NavLink>
          </div>
        </div>

        {/* Operations Accordion */}
        <div>
          <button
            onClick={() => setOperationsOpen(!operationsOpen)}
            className="w-full flex items-center justify-between px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider hover:text-slate-600 transition-colors"
          >
            <span>Operations</span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${
                operationsOpen ? 'rotate-180' : ''
              }`}
            />
          </button>

          {operationsOpen && (
            <div className="mt-1 ml-2 pl-3 border-l-2 border-slate-100 space-y-1">
              <NavLink to="/operations/receipts" className={subNavItemClass}>
                <ArrowDownToLine className="w-3.5 h-3.5 text-emerald-600" />
                <span>Receipts (Incoming)</span>
              </NavLink>
              <NavLink to="/operations/deliveries" className={subNavItemClass}>
                <ArrowUpFromLine className="w-3.5 h-3.5 text-rose-500" />
                <span>Delivery Orders</span>
              </NavLink>
              <NavLink to="/operations/transfers" className={subNavItemClass}>
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                <span>Internal Transfers</span>
              </NavLink>
              <NavLink to="/operations/adjustments" className={subNavItemClass}>
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-500" />
                <span>Inventory Adjustment</span>
              </NavLink>
              <NavLink to="/operations/move-history" className={subNavItemClass}>
                <History className="w-3.5 h-3.5 text-indigo-500" />
                <span>Move History</span>
              </NavLink>
            </div>
          )}
        </div>

        {/* Settings Group */}
        <div>
          <p className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Settings
          </p>
          <div className="space-y-1">
            <NavLink to="/settings/warehouses" className={navItemClass}>
              <Building2 className="w-4 h-4" />
              <span>Warehouse Management</span>
            </NavLink>
          </div>
        </div>
      </div>

      {/* Profile & User Footer */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/50">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-xs">
          <button
            onClick={() => navigate('/profile')}
            className="flex items-center gap-3 text-left overflow-hidden group flex-1"
          >
            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-semibold flex items-center justify-center text-xs shrink-0 group-hover:ring-2 ring-indigo-300 transition-all">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-semibold text-slate-800 truncate group-hover:text-indigo-600 transition-colors">
                {user?.name || 'Administrator'}
              </p>
              <p className="text-[11px] text-slate-400 truncate flex items-center gap-1">
                <ShieldCheck className="w-3 h-3 text-emerald-500 shrink-0" />
                {user?.role || 'admin'}
              </p>
            </div>
          </button>

          <button
            onClick={logout}
            title="Log out"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-1"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};
