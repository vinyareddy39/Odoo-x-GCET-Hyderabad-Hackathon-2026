import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Modal } from './Modal';
import { TrendingDown, AlertOctagon, Building2, Package, Calendar } from 'lucide-react';

export const ShrinkageModal = ({ isOpen, onClose }) => {
  const [data, setData] = useState({
    totalShrinkageValue: 0,
    totalDamagedUnits: 0,
    incidentCount: 0,
    incidents: [],
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      api
        .get('/analytics/shrinkage')
        .then((res) => setData(res.data))
        .catch((err) => console.error('Error fetching shrinkage:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Financial Shrinkage & Damage Loss Report"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-rose-50/70 border border-rose-200 rounded-2xl">
            <div className="flex items-center gap-2 text-rose-700 text-xs font-bold uppercase tracking-wider mb-1">
              <TrendingDown className="w-4 h-4" /> Total Loss Value
            </div>
            <p className="text-2xl font-black text-rose-900">
              ₹{data.totalShrinkageValue.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </p>
            <span className="text-[11px] text-rose-700">Financial write-off</span>
          </div>

          <div className="p-4 bg-amber-50/70 border border-amber-200 rounded-2xl">
            <div className="flex items-center gap-2 text-amber-700 text-xs font-bold uppercase tracking-wider mb-1">
              <AlertOctagon className="w-4 h-4" /> Physical Units Lost
            </div>
            <p className="text-2xl font-black text-amber-900">
              {data.totalDamagedUnits.toLocaleString()} units
            </p>
            <span className="text-[11px] text-amber-700">Damaged, missing, expired</span>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl">
            <div className="flex items-center gap-2 text-slate-600 text-xs font-bold uppercase tracking-wider mb-1">
              <Building2 className="w-4 h-4" /> Audit Incidents
            </div>
            <p className="text-2xl font-black text-slate-800">
              {data.incidentCount} adjustments
            </p>
            <span className="text-[11px] text-slate-500">Logged in central ledger</span>
          </div>
        </div>

        {/* Audit Discrepancies Table */}
        <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
          <div className="max-h-72 overflow-y-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] font-semibold text-slate-500 uppercase sticky top-0">
                <tr>
                  <th className="px-4 py-2.5">Date</th>
                  <th className="px-4 py-2.5">Reference #</th>
                  <th className="px-4 py-2.5">Product</th>
                  <th className="px-4 py-2.5">Facility</th>
                  <th className="px-4 py-2.5 text-right">Units Lost</th>
                  <th className="px-4 py-2.5 text-right">Loss (₹)</th>
                  <th className="px-4 py-2.5">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      Loading shrinkage ledger...
                    </td>
                  </tr>
                ) : data.incidents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                      No shrinkage write-offs or damaged unit adjustments recorded yet! 🎉
                    </td>
                  </tr>
                ) : (
                  data.incidents.map((inc) => (
                    <tr key={inc._id} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                        {new Date(inc.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-2.5 font-mono font-semibold text-rose-600">
                        {inc.referenceNumber}
                      </td>
                      <td className="px-4 py-2.5">
                        <p className="font-semibold text-slate-900">{inc.productName}</p>
                        <span className="font-mono text-[10px] text-slate-400">{inc.productSku}</span>
                      </td>
                      <td className="px-4 py-2.5 text-slate-600">{inc.warehouseCode}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-rose-600 font-mono">
                        -{inc.unitsLost} {inc.unitOfMeasure}
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold text-slate-900 font-mono">
                        ₹{inc.totalLostCost.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-2.5 text-slate-500 truncate max-w-xs">{inc.notes || '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </Modal>
  );
};
