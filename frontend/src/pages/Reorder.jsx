import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Navbar } from '../components/Navbar';
import { useNotification } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';
import {
  Zap,
  Sliders,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Building2,
  Package,
  ArrowRight,
  Loader2,
  TrendingUp,
} from 'lucide-react';

export const Reorder = () => {
  const [multiplier, setMultiplier] = useState(1.0);
  const [leadTime, setLeadTime] = useState(7);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const { addToast } = useNotification();
  const navigate = useNavigate();

  const fetchPredictions = async () => {
    setLoading(true);
    try {
      const res = await api.get('/analytics/predictive-reorder', {
        params: { demandMultiplier: multiplier, leadTimeDays: leadTime },
      });
      setData(res.data.data || []);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Could not load predictive reorder points.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPredictions();
  }, [multiplier, leadTime]);

  const atRiskItems = data.filter((d) => d.needsReorder);
  const totalSuggestedCost = atRiskItems.reduce((sum, item) => sum + item.estimatedCost, 0);

  const handleGeneratePo = async () => {
    if (atRiskItems.length === 0) return;
    setGenerating(true);
    try {
      const payload = {
        supplierName: 'Apex Industrial ROP Replenishment',
        items: atRiskItems.map((item) => ({
          productId: item.productId,
          quantity: item.suggestedOrderQty,
        })),
      };

      const res = await api.post('/analytics/auto-generate-po', payload);
      addToast({
        type: 'success',
        title: 'Draft Purchase Order Created! 🚀',
        message: `${res.data.message} Ready for validation in Receipts.`,
      });
      navigate('/operations/receipts');
    } catch (err) {
      addToast({
        type: 'error',
        title: 'PO Generation Failed',
        message: err.response?.data?.message || 'Error creating auto PO.',
      });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        title="Smart Reorder Engine"
        subtitle="Dynamic ROP Burn-Rate Forecasting, Demand Spike Simulator & 1-Click PO Generation"
      />

      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Demand Surge Simulator Card */}
        <div className="bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white p-6 rounded-3xl shadow-xl shadow-indigo-950/20 space-y-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-white/10 border border-white/20 backdrop-blur-sm text-indigo-200 uppercase tracking-wider mb-2">
                <Zap className="w-3.5 h-3.5 text-amber-300" /> Predictive Stockout Defense
              </span>
              <h2 className="text-2xl font-black tracking-tight text-white">
                Live Demand-Spike Simulation
              </h2>
              <p className="text-xs text-indigo-200 mt-1 max-w-xl">
                Calculates daily burn rates from actual delivery history in the double-entry ledger. Drag the slider to simulate seasonal sales spikes and protect your warehouse against stockouts.
              </p>
            </div>

            <button
              onClick={handleGeneratePo}
              disabled={generating || atRiskItems.length === 0}
              className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center gap-2 whitespace-nowrap transition-all disabled:opacity-50"
            >
              {generating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Zap className="w-4 h-4" />
                  <span>1-Click Generate Draft PO ({atRiskItems.length} SKUs)</span>
                </>
              )}
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/10 items-center">
            {/* Slider */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-indigo-200">Baseline Demand (1.0x)</span>
                <span className="text-amber-300 font-mono text-sm">
                  {multiplier.toFixed(1)}x (+{((multiplier - 1) * 100).toFixed(0)}% Surge)
                </span>
                <span className="text-indigo-200">Peak Surge (3.0x)</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.1"
                value={multiplier}
                onChange={(e) => setMultiplier(parseFloat(e.target.value))}
                className="w-full h-2.5 bg-indigo-950 rounded-lg appearance-none cursor-pointer accent-amber-400"
              />
            </div>

            {/* Lead Time Dropdown */}
            <div className="flex items-center gap-3 md:justify-end">
              <label className="text-xs font-semibold text-indigo-200 whitespace-nowrap">
                Supplier Lead Time:
              </label>
              <select
                value={leadTime}
                onChange={(e) => setLeadTime(parseInt(e.target.value))}
                className="px-4 py-2 bg-indigo-950/80 border border-white/20 rounded-xl text-xs font-bold text-white focus:outline-none focus:ring-2 focus:ring-amber-400"
              >
                <option value={3}>3 Days (Air Express)</option>
                <option value={7}>7 Days (Standard Road)</option>
                <option value={14}>14 Days (Domestic Freight)</option>
                <option value={30}>30 Days (Import Container)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick KPI Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              SKUs at Risk of Stockout
            </span>
            <p className="text-2xl font-black text-rose-600 mt-1">{atRiskItems.length} Products</p>
            <span className="text-[11px] text-slate-400">Current stock &le; Dynamic ROP</span>
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Suggested Replenishment Units
            </span>
            <p className="text-2xl font-black text-slate-900 mt-1">
              {atRiskItems.reduce((sum, item) => sum + item.suggestedOrderQty, 0).toLocaleString()} units
            </p>
            <span className="text-[11px] text-slate-400">To maintain 30-day safety buffer</span>
          </div>

          <div className="p-5 bg-white border border-slate-200 rounded-2xl shadow-xs">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Estimated Order Value
            </span>
            <p className="text-2xl font-black text-indigo-700 mt-1">
              ₹{totalSuggestedCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
            <span className="text-[11px] text-slate-400">Cost-price estimate</span>
          </div>
        </div>

        {/* Forecast Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-indigo-600" />
              <span>Predictive Reorder Forecast Table</span>
            </h3>
            <span className="text-xs text-slate-400">
              Showing {data.length} total catalog products
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Product Name & SKU</th>
                  <th className="px-6 py-3">On Hand</th>
                  <th className="px-6 py-3">Daily Burn Rate</th>
                  <th className="px-6 py-3">Days Remaining</th>
                  <th className="px-6 py-3">Static Min</th>
                  <th className="px-6 py-3">Dynamic ROP</th>
                  <th className="px-6 py-3 text-right">Suggested Order</th>
                  <th className="px-6 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                      Recalculating predictive forecasts...
                    </td>
                  </tr>
                ) : (
                  data.map((item) => (
                    <tr key={item.productId} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-3.5">
                        <p className="font-semibold text-slate-900 text-xs">{item.name}</p>
                        <span className="font-mono text-[10px] text-slate-400">{item.sku}</span>
                      </td>
                      <td className="px-6 py-3.5 font-bold text-slate-900">
                        {item.currentStock} {item.unitOfMeasure}
                      </td>
                      <td className="px-6 py-3.5 text-slate-600 font-mono">
                        {item.dailyBurnRate}/day
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`font-bold ${
                            item.daysRemaining === 0
                              ? 'text-rose-600'
                              : item.daysRemaining <= 3
                              ? 'text-rose-600'
                              : item.daysRemaining <= 7
                              ? 'text-amber-600'
                              : 'text-slate-700'
                          }`}
                        >
                          {item.daysRemaining === 0 ? 'Out of Stock' : `${item.daysRemaining} days`}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-400 font-mono">
                        {item.staticThreshold}
                      </td>
                      <td className="px-6 py-3.5 text-indigo-700 font-mono font-bold">
                        {item.dynamicROP}
                      </td>
                      <td className="px-6 py-3.5 text-right font-bold font-mono">
                        {item.suggestedOrderQty > 0 ? (
                          <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            +{item.suggestedOrderQty} {item.unitOfMeasure}
                          </span>
                        ) : (
                          <span className="text-slate-400">0</span>
                        )}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            item.currentStock === 0
                              ? 'bg-rose-100 text-rose-800 border border-rose-200'
                              : item.needsReorder
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {item.urgency}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};
