import React from 'react';
import { AlertTriangle, ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const LowStockBanner = ({ lowStockCount = 0, onDismiss }) => {
  const navigate = useNavigate();

  if (lowStockCount <= 0) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 text-white px-4 py-2.5 shadow-sm">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5 text-sm font-medium">
          <span className="flex h-2 w-2 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-white"></span>
          </span>
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>
            <strong>Inventory Attention Required:</strong> {lowStockCount} product
            {lowStockCount > 1 ? 's are' : ' is'} below minimum reordering thresholds or out of stock!
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/products?lowStockOnly=true')}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/20 hover:bg-white/30 rounded-lg text-xs font-semibold backdrop-blur-sm transition-colors"
          >
            Review Low Stock <ArrowRight className="w-3.5 h-3.5" />
          </button>
          {onDismiss && (
            <button
              onClick={onDismiss}
              className="p-1 hover:bg-white/20 rounded-lg text-white/80 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
