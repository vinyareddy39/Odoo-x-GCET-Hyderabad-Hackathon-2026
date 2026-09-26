import React, { useState } from 'react';
import {
  Bell,
  Database,
  Zap,
  TrendingDown,
  ScanBarcode,
  Layers,
  Wrench,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { PredictiveRopModal } from './PredictiveRopModal';
import { ShrinkageModal } from './ShrinkageModal';
import { BarcodeScannerModal } from './BarcodeScannerModal';
import { WarehouseFloorMode } from './WarehouseFloorMode';

export const Navbar = ({ title, subtitle, lowStockCount = 0 }) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isRopOpen, setIsRopOpen] = useState(false);
  const [isShrinkageOpen, setIsShrinkageOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isFloorModeOpen, setIsFloorModeOpen] = useState(false);

  return (
    <>
      <header className="h-16 bg-white border-b border-slate-200 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-30">
        {/* Title & Breadcrumb */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 leading-tight">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 font-normal">{subtitle}</p>}
        </div>

        {/* Right Controls & Quick Innovation Actions */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* 1. Predictive ROP Engine Button */}
          <button
            onClick={() => setIsRopOpen(true)}
            title="Open Predictive Reorder Point (ROP) & Auto-PO Generator"
            className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-50 to-purple-50 hover:from-indigo-100 hover:to-purple-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold transition-all shadow-2xs"
          >
            <Zap className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600" />
            <span>Predictive ROP</span>
          </button>

          {/* 2. Shrinkage & Loss Report */}
          <button
            onClick={() => setIsShrinkageOpen(true)}
            title="View Financial Shrinkage & Damaged Stock Write-offs in ₹"
            className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all shadow-2xs"
          >
            <TrendingDown className="w-3.5 h-3.5 text-rose-600" />
            <span>Shrinkage (₹)</span>
          </button>

          {/* 3. Barcode Scanner Simulator */}
          <button
            onClick={() => setIsScannerOpen(true)}
            title="Scan Product Barcode / Optical SKU Lookup"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all shadow-2xs"
          >
            <ScanBarcode className="w-3.5 h-3.5 text-slate-600" />
            <span className="hidden sm:inline">Scanner</span>
          </button>

          {/* 4. Floor Operator View Toggle */}
          <button
            onClick={() => setIsFloorModeOpen(true)}
            title="Switch to High-Contrast Warehouse Floor Operator Terminal"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-xl text-xs transition-all shadow-xs"
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Floor Mode</span>
          </button>

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
            <span className="text-xs font-medium text-slate-700 max-w-[100px] truncate">
              {user?.name || 'Admin'}
            </span>
          </div>
        </div>
      </header>

      {/* Feature Modals */}
      <PredictiveRopModal isOpen={isRopOpen} onClose={() => setIsRopOpen(false)} />
      <ShrinkageModal isOpen={isShrinkageOpen} onClose={() => setIsShrinkageOpen(false)} />
      <BarcodeScannerModal isOpen={isScannerOpen} onClose={() => setIsScannerOpen(false)} />
      <WarehouseFloorMode isOpen={isFloorModeOpen} onClose={() => setIsFloorModeOpen(false)} />
    </>
  );
};
