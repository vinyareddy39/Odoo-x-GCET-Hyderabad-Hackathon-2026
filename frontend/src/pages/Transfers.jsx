import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Navbar } from '../components/Navbar';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { useNotification } from '../context/NotificationContext';
import {
  Layers,
  Plus,
  Trash2,
  CheckCircle2,
  Building2,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

export const Transfers = () => {
  const [transfers, setTransfers] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [sourceWarehouse, setSourceWarehouse] = useState('');
  const [destinationWarehouse, setDestinationWarehouse] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { product: '', demandedQuantity: 10, unitOfMeasure: 'units' },
  ]);

  const { addToast } = useNotification();

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const params = { type: 'transfer' };
      if (statusFilter !== 'All') params.status = statusFilter;

      const [trfRes, prodRes, whRes] = await Promise.all([
        api.get('/operations', { params }),
        api.get('/products'),
        api.get('/warehouses'),
      ]);

      setTransfers(trfRes.data.data || []);
      setProducts(prodRes.data.data || []);
      setWarehouses(whRes.data.data || []);

      if (whRes.data.data?.length > 1 && !sourceWarehouse) {
        setSourceWarehouse(whRes.data.data[0]._id);
        setDestinationWarehouse(whRes.data.data[1]._id);
      }
      if (prodRes.data.data?.length > 0 && !items[0].product) {
        setItems([
          {
            product: prodRes.data.data[0]._id,
            demandedQuantity: 15,
            unitOfMeasure: prodRes.data.data[0].unitOfMeasure,
          },
        ]);
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Could not load internal transfers.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransfers();
  }, [statusFilter]);

  const handleAddItemRow = () => {
    const defaultProd = products[0] || {};
    setItems([
      ...items,
      {
        product: defaultProd._id || '',
        demandedQuantity: 5,
        unitOfMeasure: defaultProd.unitOfMeasure || 'units',
      },
    ]);
  };

  const handleRemoveItemRow = (index) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index, field, value) => {
    const updated = [...items];
    updated[index][field] = value;
    if (field === 'product') {
      const selected = products.find((p) => p._id === value);
      if (selected) {
        updated[index].unitOfMeasure = selected.unitOfMeasure;
      }
    }
    setItems(updated);
  };

  const handleCreateTransfer = async (e) => {
    e.preventDefault();
    if (!sourceWarehouse || !destinationWarehouse) {
      addToast({
        type: 'warning',
        title: 'Warehouses Required',
        message: 'Please choose both source and destination locations.',
      });
      return;
    }

    if (sourceWarehouse === destinationWarehouse) {
      addToast({
        type: 'warning',
        title: 'Invalid Selection',
        message: 'Source and destination warehouses must be different.',
      });
      return;
    }

    try {
      await api.post('/operations', {
        type: 'transfer',
        sourceWarehouse,
        destinationWarehouse,
        notes,
        status: 'Ready',
        items: items.map((it) => ({
          product: it.product,
          demandedQuantity: Number(it.demandedQuantity),
        })),
      });

      addToast({
        type: 'success',
        title: 'Transfer Scheduled',
        message: 'Internal transfer order created and ready to validate.',
      });

      setIsModalOpen(false);
      setNotes('');
      fetchTransfers();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Creation Failed',
        message: err.response?.data?.message || 'Error creating transfer.',
      });
    }
  };

  const handleValidateTransfer = async (id, refNum) => {
    try {
      await api.post(`/operations/${id}/validate`);
      addToast({
        type: 'success',
        title: 'Transfer Complete! 🔄',
        message: `${refNum}: Stock moved between locations without changing total company inventory.`,
      });
      fetchTransfers();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Validation Failed',
        message: err.response?.data?.message || 'Insufficient stock or error executing transfer.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        title="Internal Transfers"
        subtitle="Relocate Stock Between Warehouses & Locations with Balanced Central Ledger"
      />

      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 shadow-xs"
            >
              <option value="All">All Statuses</option>
              <option value="Ready">Ready to Transfer</option>
              <option value="Done">Done (Transferred)</option>
              <option value="Waiting">Waiting</option>
              <option value="Canceled">Canceled</option>
            </select>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-blue-200 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Internal Transfer
          </button>
        </div>

        {/* Transfers Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Reference #</th>
                  <th className="px-6 py-3">Transfer Route</th>
                  <th className="px-6 py-3">Items To Move</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transfers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                      No internal transfers found.
                    </td>
                  </tr>
                ) : (
                  transfers.map((trf) => {
                    const isReady = trf.status === 'Ready' || trf.status === 'Waiting';
                    const isDone = trf.status === 'Done';

                    return (
                      <tr key={trf._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-mono font-semibold text-blue-700 text-xs">
                          {trf.referenceNumber}
                        </td>
                        <td className="px-6 py-4 text-xs">
                          <div className="flex items-center gap-2 font-medium">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                              {trf.sourceWarehouse?.code || 'Source'}
                            </span>
                            <ArrowRight className="w-3.5 h-3.5 text-blue-500" />
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                              {trf.destinationWarehouse?.code || 'Destination'}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {trf.sourceWarehouse?.name} &rarr; {trf.destinationWarehouse?.name}
                          </p>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600">
                          <div className="space-y-1">
                            {trf.items?.map((it, idx) => (
                              <div key={idx} className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900">
                                  {it.demandedQuantity} {it.unitOfMeasure}
                                </span>
                                <span>{it.productName}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(trf.scheduledDate || trf.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={trf.status} />
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          {isReady ? (
                            <button
                              onClick={() => handleValidateTransfer(trf._id, trf.referenceNumber)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-xs shadow-blue-200 transition-colors"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Validate Transfer
                            </button>
                          ) : isDone ? (
                            <span className="text-xs text-emerald-600 font-semibold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Relocated
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">{trf.status}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Create Transfer Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Internal Stock Transfer"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateTransfer} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Source Warehouse (From) *
              </label>
              <select
                value={sourceWarehouse}
                onChange={(e) => setSourceWarehouse(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                {warehouses.map((wh) => (
                  <option key={wh._id} value={wh._id}>
                    {wh.code} - {wh.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Destination Warehouse (To) *
              </label>
              <select
                value={destinationWarehouse}
                onChange={(e) => setDestinationWarehouse(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
              >
                {warehouses.map((wh) => (
                  <option key={wh._id} value={wh._id}>
                    {wh.code} - {wh.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Line items */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Products to Move *
              </label>
              <button
                type="button"
                onClick={handleAddItemRow}
                className="text-xs text-indigo-600 font-semibold hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Another Item
              </button>
            </div>

            <div className="space-y-2">
              {items.map((row, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                  <div className="flex-1">
                    <select
                      value={row.product}
                      onChange={(e) => handleItemChange(idx, 'product', e.target.value)}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-blue-500"
                    >
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>
                          [{p.sku}] {p.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-28 flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      required
                      value={row.demandedQuantity}
                      onChange={(e) => handleItemChange(idx, 'demandedQuantity', e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-xs text-slate-500 whitespace-nowrap">{row.unitOfMeasure}</span>
                  </div>

                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveItemRow(idx)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Transfer Purpose / Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Move materials to manufacturing line bay"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-semibold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
            >
              Schedule Transfer
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
