import React, { useState, useEffect } from 'react';
import api from '../api/client';
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  SlidersHorizontal,
  CheckCircle2,
  PackageCheck,
  Building2,
  X,
  Loader2,
} from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export const WarehouseFloorMode = ({ isOpen, onClose }) => {
  const [pendingReceipts, setPendingReceipts] = useState([]);
  const [pendingDeliveries, setPendingDeliveries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('receipts'); // 'receipts' | 'deliveries'

  const { addToast } = useNotification();

  const fetchData = async () => {
    setLoading(true);
    try {
      const [recRes, delRes] = await Promise.all([
        api.get('/operations', { params: { type: 'receipt', status: 'Ready' } }),
        api.get('/operations', { params: { type: 'delivery', status: 'Ready' } }),
      ]);
      setPendingReceipts(recRes.data.data || []);
      setPendingDeliveries(delRes.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) fetchData();
  }, [isOpen]);

  const handleValidateReceipt = async (id, refNum) => {
    try {
      await api.post(`/operations/${id}/validate`);
      addToast({
        type: 'success',
        title: 'Floor Intake Confirmed! 📥',
        message: `${refNum} received and stocked onto shelves.`,
      });
      fetchData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to process intake.' });
    }
  };

  const handleValidateDelivery = async (id, refNum) => {
    try {
      await api.post(`/operations/${id}/validate`);
      addToast({
        type: 'success',
        title: 'Dispatch Confirmed! 🚚',
        message: `${refNum} loaded onto freight truck.`,
      });
      fetchData();
    } catch (err) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to process dispatch.' });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 text-white flex flex-col animate-in fade-in select-none">
      {/* High-Contrast Floor Header */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-lg shadow-md">
            W
          </div>
          <div>
            <h2 className="text-base font-black tracking-wider uppercase text-amber-400">
              Warehouse Floor Terminal
            </h2>
            <p className="text-xs text-slate-400 font-mono">TOUCH-OPTIMIZED OPERATOR INTERFACE</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5"
        >
          <X className="w-4 h-4" /> Exit Floor Mode
        </button>
      </div>

      {/* Big Action Selector Tabs */}
      <div className="grid grid-cols-2 p-4 gap-3 bg-slate-900 border-b border-slate-800">
        <button
          onClick={() => setActiveTab('receipts')}
          className={`py-4 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all ${
            activeTab === 'receipts'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40 ring-2 ring-emerald-400'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <ArrowDownToLine className="w-6 h-6" />
          <span>INBOUND INTAKE ({pendingReceipts.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('deliveries')}
          className={`py-4 px-6 rounded-2xl font-black text-sm flex items-center justify-center gap-3 transition-all ${
            activeTab === 'deliveries'
              ? 'bg-rose-600 text-white shadow-lg shadow-rose-900/40 ring-2 ring-rose-400'
              : 'bg-slate-800 text-slate-400 hover:text-white'
          }`}
        >
          <ArrowUpFromLine className="w-6 h-6" />
          <span>OUTBOUND PICK & PACK ({pendingDeliveries.length})</span>
        </button>
      </div>

      {/* Big Card Worklist */}
      <div className="flex-1 overflow-y-auto p-4 max-w-4xl w-full mx-auto space-y-4">
        {loading ? (
          <div className="flex items-center justify-center h-48 text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-amber-400" />
          </div>
        ) : activeTab === 'receipts' ? (
          pendingReceipts.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500 mb-2" />
              <p className="font-bold text-base text-slate-300">No pending dock arrivals</p>
              <p className="text-xs">All incoming shipments have been received and stocked.</p>
            </div>
          ) : (
            pendingReceipts.map((rec) => (
              <div
                key={rec._id}
                className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div>
                  <span className="font-mono text-xs font-bold text-emerald-400">
                    {rec.referenceNumber}
                  </span>
                  <h3 className="text-lg font-bold text-white mt-0.5">{rec.partnerName}</h3>
                  <p className="text-xs text-slate-400">
                    Destination: <strong className="text-slate-200">{rec.destinationWarehouse?.name}</strong>
                  </p>
                  <div className="mt-2 space-y-1">
                    {rec.items?.map((it, idx) => (
                      <span
                        key={idx}
                        className="inline-block bg-slate-900 text-slate-200 px-2.5 py-1 rounded-lg text-xs font-mono font-bold mr-2"
                      >
                        +{it.demandedQuantity} {it.unitOfMeasure} • {it.productName}
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => handleValidateReceipt(rec._id, rec.referenceNumber)}
                  className="w-full md:w-auto px-6 py-4 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black text-sm rounded-xl shadow-lg shadow-emerald-900/50 flex items-center justify-center gap-2 whitespace-nowrap transition-all"
                >
                  <CheckCircle2 className="w-5 h-5" /> CONFIRM INTAKE (+STOCK)
                </button>
              </div>
            ))
          )
        ) : pendingDeliveries.length === 0 ? (
          <div className="text-center py-16 text-slate-500">
            <CheckCircle2 className="w-12 h-12 mx-auto text-rose-500 mb-2" />
            <p className="font-bold text-base text-slate-300">No pending orders to dispatch</p>
            <p className="text-xs">All picked items have been shipped.</p>
          </div>
        ) : (
          pendingDeliveries.map((del) => (
            <div
              key={del._id}
              className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
            >
              <div>
                <span className="font-mono text-xs font-bold text-rose-400">
                  {del.referenceNumber}
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">{del.partnerName}</h3>
                <p className="text-xs text-slate-400">
                  Source: <strong className="text-slate-200">{del.sourceWarehouse?.name}</strong>
                </p>
                <div className="mt-2 space-y-1">
                  {del.items?.map((it, idx) => (
                    <span
                      key={idx}
                      className="inline-block bg-slate-900 text-slate-200 px-2.5 py-1 rounded-lg text-xs font-mono font-bold mr-2"
                    >
                      -{it.demandedQuantity} {it.unitOfMeasure} • {it.productName}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => handleValidateDelivery(del._id, del.referenceNumber)}
                className="w-full md:w-auto px-6 py-4 bg-rose-600 hover:bg-rose-500 active:scale-95 text-white font-black text-sm rounded-xl shadow-lg shadow-rose-900/50 flex items-center justify-center gap-2 whitespace-nowrap transition-all"
              >
                <PackageCheck className="w-5 h-5" /> CONFIRM DISPATCH (-STOCK)
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
