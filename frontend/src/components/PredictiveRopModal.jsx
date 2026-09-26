import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Modal } from './Modal';
import { useNotification } from '../context/NotificationContext';
import {
  TrendingUp,
  Sliders,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Calendar,
  DollarSign,
  ArrowRight,
  Loader2,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PredictiveRopModal = ({ isOpen, onClose }) => {
  const [multiplier, setMultiplier] = useState(1.0);
  const [leadTime, setLeadTime] = useState(7);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
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
        title: 'ROP Engine Error',
        message: 'Could not calculate predictive reorder points.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchPredictions();
    }
  }, [isOpen, multiplier, leadTime]);

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
      onClose();
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Predictive Reorder Point (ROP) & Auto-PO Generator"
      maxWidth="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Subtitle */}
        <p className="text-xs text-slate-500">
          Combines real-time consumption velocity from the <code>StockLedger</code> with safety stock buffers and supplier lead times to predict upcoming stockouts before they happen.
        </p>

        {/* Interactive Demand Spike Simulator */}
        <div className="bg-indigo-50/60 border border-indigo-100 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-indigo-950 uppercase tracking-wider">
                Demand Spike Simulator
              </span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-xs">
              {multiplier.toFixed(1)}x Demand
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div>
              <div className="flex justify-between text-xs text-slate-600 mb-1">
                <span>Baseline (1.0x)</span>
                <span className="font-semibold text-indigo-700">Surge (+{(multiplier * 100 - 100).toFixed(0)}%)</span>
                <span>Peak (3.0x)</span>
              </div>
              <input
                type="range"
                min="1.0"
                max="3.0"
                step="0.1"
                value={multiplier}
                onChange={(e) => setMultiplier(parseFloat(e.target.value))}
                className="w-full accent-indigo-600 h-2 bg-indigo-200 rounded-lg cursor-pointer"
              />
            </div>

            <div className="flex items-center gap-3">
              <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
                Supplier Lead Time:
              </label>
              <select
                value={leadTime}
                onChange={(e) => setLeadTime(parseInt(e.target.value))}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium focus:ring-2 focus:ring-indigo-500"
              >
                <option value={3}>3 Days (Express Air)</option>
                <option value={7}>7 Days (Standard Road)</option>
                <option value={14}>14 Days (Domestic Freight)</option>
                <option value={30}>30 Days (Import Container)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Quick Stats Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="p-3 bg-white border border-slate-200 rounded-xl">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Items At Risk</span>
            <p className="text-xl font-bold text-rose-600 mt-0.5">{atRiskItems.length} SKUs</p>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-xl">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Suggested Units to Buy</span>
            <p className="text-xl font-bold text-slate-900 mt-0.5">
              {atRiskItems.reduce((sum, item) => sum + item.suggestedOrderQty, 0)} units
            </p>
          </div>
          <div className="p-3 bg-white border border-slate-200 rounded-xl">
            <span className="text-[11px] font-semibold text-slate-400 uppercase">Estimated Replenishment Cost</span>
            <p className="text-xl font-bold text-indigo-700 mt-0.5">
              ₹{totalSuggestedCost.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
            </p>
          </div>
        </div>

        {/* ROP Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase sticky top-0">
                <tr>
                  <th className="px-4 py-2.5">Product / SKU</th>
                  <th className="px-4 py-2.5">On Hand</th>
                  <th className="px-4 py-2.5">Burn Rate/Day</th>
                  <th className="px-4 py-2.5">Days Left</th>
                  <th className="px-4 py-2.5">Dynamic ROP</th>
                  <th className="px-4 py-2.5">Suggested Order</th>
                  <th className="px-4 py-2.5">Urgency</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Recalculating predictive curves...
                    </td>
                  </tr>
                ) : atRiskItems.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-emerald-600 font-semibold">
                      🎉 All items are adequately stocked! No replenishment needed at current demand multiplier.
                    </td>
                  </tr>
                ) : (
                  atRiskItems.map((item) => (
                    <tr key={item.productId} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-slate-900">{item.name}</p>
                        <span className="font-mono text-[10px] text-slate-400">{item.sku}</span>
                      </td>
                      <td className="px-4 py-2.5 font-bold text-slate-900">
                        {item.currentStock} {item.unitOfMeasure}
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 font-mono">
                        {item.dailyBurnRate}/day
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`font-bold ${
                            item.daysRemaining <= 3
                              ? 'text-rose-600'
                              : item.daysRemaining <= 7
                              ? 'text-amber-600'
                              : 'text-slate-700'
                          }`}
                        >
                          {item.daysRemaining === 0 ? 'Depleted' : `${item.daysRemaining} days`}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600 font-mono">
                        &le; {item.dynamicROP}
                      </td>
                      <td className="px-4 py-2.5 font-bold text-indigo-600 font-mono">
                        +{item.suggestedOrderQty} {item.unitOfMeasure}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            item.urgency.startsWith('Critical')
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
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

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            Close
          </button>

          <button
            type="button"
            disabled={generating || atRiskItems.length === 0}
            onClick={handleGeneratePo}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200 transition-all disabled:opacity-50"
          >
            {generating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-300" />
                <span>1-Click Generate Draft Receipt PO ({atRiskItems.length} SKUs)</span>
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
