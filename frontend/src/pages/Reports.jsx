import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Navbar } from '../components/Navbar';
import { useNotification } from '../context/NotificationContext';
import {
  BarChart3,
  Download,
  Building2,
  TrendingUp,
  Package,
  Layers,
  ArrowDownToLine,
  ArrowUpFromLine,
  FileSpreadsheet,
  Loader2,
} from 'lucide-react';

export const Reports = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useNotification();

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/reports/summary');
      setData(res.data);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Report Error',
        message: 'Could not load reports summary.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  // Export Movement Ledger CSV
  const handleExportMovementsCsv = async () => {
    try {
      const res = await api.get('/move-history');
      const moves = res.data.data || [];

      const headers = ['Timestamp', 'Reference Number', 'Type', 'SKU', 'Product', 'Quantity Change', 'Unit', 'Notes'];
      const rows = moves.map((m) => [
        `"${new Date(m.createdAt).toISOString()}"`,
        `"${m.referenceNumber}"`,
        `"${m.operationType}"`,
        `"${m.productSku}"`,
        `"${m.productName}"`,
        m.quantityChange,
        `"${m.unitOfMeasure}"`,
        `"${(m.notes || '').replace(/"/g, '""')}"`,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `StockSense_Movements_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addToast({
        type: 'success',
        title: 'CSV Export Complete',
        message: `Exported ${moves.length} ledger movements to CSV.`,
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Export Failed', message: 'Could not generate CSV.' });
    }
  };

  // Export Inventory Valuation CSV
  const handleExportValuationCsv = async () => {
    try {
      const res = await api.get('/products');
      const products = res.data.data || [];

      const headers = ['SKU', 'Name', 'Category', 'Unit', 'Total Stock', 'Cost Price (INR)', 'Total Valuation (INR)', 'Reorder Threshold'];
      const rows = products.map((p) => [
        `"${p.sku}"`,
        `"${p.name}"`,
        `"${p.category}"`,
        `"${p.unitOfMeasure}"`,
        p.totalStock,
        p.costPrice || 0,
        (p.totalStock * (p.costPrice || 0)).toFixed(2),
        p.reorderThreshold,
      ]);

      const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `StockSense_Valuation_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addToast({
        type: 'success',
        title: 'CSV Export Complete',
        message: `Exported inventory valuation breakdown to CSV.`,
      });
    } catch (err) {
      addToast({ type: 'error', title: 'Export Failed', message: 'Could not generate CSV.' });
    }
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        title="Reports & Analytics"
        subtitle="Inventory Valuation, Turnover Velocity, Warehouse Allocation & Data Exports"
      />

      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-8">
        {/* Top Valuation Summary & CSV Export Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex flex-wrap gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs min-w-[200px]">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Total Inventory Valuation
              </span>
              <p className="text-2xl font-black text-indigo-900 mt-0.5">
                ₹{data.grandTotalValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
              </p>
              <span className="text-xs text-slate-500 font-medium">Cost-based asset value</span>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs min-w-[200px]">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Total Units on Hand
              </span>
              <p className="text-2xl font-black text-slate-900 mt-0.5">
                {data.grandTotalUnits.toLocaleString()} units
              </p>
              <span className="text-xs text-slate-500 font-medium">Across all facilities</span>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleExportMovementsCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-indigo-600" />
              <span>Export Ledger CSV</span>
            </button>

            <button
              onClick={handleExportValuationCsv}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export Valuation CSV</span>
            </button>
          </div>
        </div>

        {/* Breakdown Grid: Warehouses & Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Warehouse Valuation Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Inventory Valuation by Warehouse</span>
              </h3>
            </div>

            <div className="space-y-4 pt-2">
              {data.warehouses.map((wh, idx) => {
                const pct = data.grandTotalValue > 0 ? (wh.totalValue / data.grandTotalValue) * 100 : 0;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-800">{wh.name} ({wh.code})</span>
                      <span className="text-slate-900 font-mono">
                        ₹{wh.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-indigo-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <p className="text-[11px] text-slate-400">{wh.totalUnits.toLocaleString()} units stored</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Category Allocation Breakdown */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-600" />
                <span>Inventory Valuation by Category</span>
              </h3>
            </div>

            <div className="space-y-4 pt-2">
              {data.categories.map((cat, idx) => {
                const pct = data.grandTotalValue > 0 ? (cat.totalValue / data.grandTotalValue) * 100 : 0;
                return (
                  <div key={idx} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-800">{cat.category} ({cat.skuCount} SKUs)</span>
                      <span className="text-slate-900 font-mono">
                        ₹{cat.totalValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-purple-600 h-2 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Top-Moving Products & Movement Velocity */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Top Moving Products Table */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-600" />
                <span>Top-Moving Products (Outbound Velocity)</span>
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase">
                  <tr>
                    <th className="px-6 py-3">Rank</th>
                    <th className="px-6 py-3">Product Name</th>
                    <th className="px-6 py-3">SKU</th>
                    <th className="px-6 py-3 text-right">Units Dispatched</th>
                    <th className="px-6 py-3 text-right">Fulfillment Orders</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {data.topMovers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                        No delivery movements recorded yet.
                      </td>
                    </tr>
                  ) : (
                    data.topMovers.map((m, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-6 py-3 font-bold text-slate-400">#{idx + 1}</td>
                        <td className="px-6 py-3 font-semibold text-slate-900">{m.productName}</td>
                        <td className="px-6 py-3 font-mono text-indigo-600">{m.productSku}</td>
                        <td className="px-6 py-3 text-right font-bold text-emerald-600 font-mono">
                          {m.totalDispatched} units
                        </td>
                        <td className="px-6 py-3 text-right text-slate-600 font-mono">
                          {m.dispatchCount} orders
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Movement Types Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Total Movement Events</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl">
                <div className="flex items-center gap-2">
                  <ArrowDownToLine className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-950">Receipts (In)</span>
                </div>
                <span className="font-mono font-bold text-emerald-900">{data.movementBreakdown.receipt || 0}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-rose-50/70 border border-rose-100 rounded-xl">
                <div className="flex items-center gap-2">
                  <ArrowUpFromLine className="w-4 h-4 text-rose-600" />
                  <span className="text-xs font-semibold text-rose-950">Deliveries (Out)</span>
                </div>
                <span className="font-mono font-bold text-rose-900">{data.movementBreakdown.delivery || 0}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-blue-50/70 border border-blue-100 rounded-xl">
                <div className="flex items-center gap-2">
                  <Layers className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-semibold text-blue-950">Internal Transfers</span>
                </div>
                <span className="font-mono font-bold text-blue-900">{data.movementBreakdown.transfer || 0}</span>
              </div>

              <div className="flex items-center justify-between p-3 bg-amber-50/70 border border-amber-100 rounded-xl">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-semibold text-amber-950">Stock Adjustments</span>
                </div>
                <span className="font-mono font-bold text-amber-900">{data.movementBreakdown.adjustment || 0}</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
