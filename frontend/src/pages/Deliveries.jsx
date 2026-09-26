import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Navbar } from '../components/Navbar';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { useNotification } from '../context/NotificationContext';
import {
  ArrowUpFromLine,
  Plus,
  Trash2,
  CheckCircle2,
  Building2,
  Users,
  PackageCheck,
  Box,
  Truck,
  AlertCircle,
} from 'lucide-react';

export const Deliveries = () => {
  const [deliveries, setDeliveries] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [sourceWarehouse, setSourceWarehouse] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { product: '', demandedQuantity: 5, unitOfMeasure: 'units' },
  ]);

  const { addToast } = useNotification();

  const fetchDeliveries = async () => {
    setLoading(true);
    try {
      const params = { type: 'delivery' };
      if (statusFilter !== 'All') params.status = statusFilter;

      const [delRes, prodRes, whRes] = await Promise.all([
        api.get('/operations', { params }),
        api.get('/products'),
        api.get('/warehouses'),
      ]);

      setDeliveries(delRes.data.data || []);
      setProducts(prodRes.data.data || []);
      setWarehouses(whRes.data.data || []);

      if (whRes.data.data?.length > 0 && !sourceWarehouse) {
        setSourceWarehouse(whRes.data.data[0]._id);
      }
      if (prodRes.data.data?.length > 0 && !items[0].product) {
        setItems([
          {
            product: prodRes.data.data[0]._id,
            demandedQuantity: 5,
            unitOfMeasure: prodRes.data.data[0].unitOfMeasure,
          },
        ]);
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Could not load delivery orders.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDeliveries();
  }, [statusFilter]);

  const handleAddItemRow = () => {
    const defaultProd = products[0] || {};
    setItems([
      ...items,
      {
        product: defaultProd._id || '',
        demandedQuantity: 2,
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

  const handleCreateDelivery = async (e) => {
    e.preventDefault();
    if (!sourceWarehouse) {
      addToast({
        type: 'warning',
        title: 'Missing Warehouse',
        message: 'Please select a source warehouse for picking.',
      });
      return;
    }

    try {
      await api.post('/operations', {
        type: 'delivery',
        partnerName: partnerName || 'General Customer',
        sourceWarehouse,
        notes,
        status: 'Waiting', // Workflow starts at Waiting (Ready for Pick items)
        items: items.map((it) => ({
          product: it.product,
          demandedQuantity: Number(it.demandedQuantity),
        })),
      });

      addToast({
        type: 'success',
        title: 'Delivery Order Created',
        message: 'Order created. Ready for Picking & Packing workflow.',
      });

      setIsModalOpen(false);
      setPartnerName('');
      setNotes('');
      fetchDeliveries();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Creation Failed',
        message: err.response?.data?.message || 'Error creating delivery order.',
      });
    }
  };

  // Workflow Action 1: Pick items (Waiting -> Draft/Picked)
  const handlePickItems = async (id, refNum) => {
    try {
      await api.patch(`/operations/${id}/status`, { status: 'Ready' });
      addToast({
        type: 'info',
        title: 'Items Picked',
        message: `${refNum}: Warehouse team picked items from shelves. Ready for Packing & Dispatch.`,
      });
      fetchDeliveries();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Action Failed',
        message: err.response?.data?.message || 'Could not update picking status.',
      });
    }
  };

  // Workflow Action 2: Validate & Dispatch (decreases stock & writes to ledger)
  const handleValidateDelivery = async (id, refNum) => {
    try {
      await api.post(`/operations/${id}/validate`);
      addToast({
        type: 'success',
        title: 'Order Dispatched & Validated! 🚚',
        message: `${refNum}: Stock automatically decreased in source warehouse and ledger updated!`,
      });
      fetchDeliveries();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Validation Failed',
        message: err.response?.data?.message || 'Insufficient stock or validation error.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        title="Delivery Orders (Outgoing)"
        subtitle="Pick Items → Pack Items → Validate & Automatically Decrease Inventory Stock"
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
              <option value="Waiting">Waiting (To Pick)</option>
              <option value="Ready">Ready (Picked, To Validate)</option>
              <option value="Done">Done (Dispatched & Stock Reduced)</option>
              <option value="Canceled">Canceled</option>
            </select>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-rose-200 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Delivery Order
          </button>
        </div>

        {/* Deliveries Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Reference #</th>
                  <th className="px-6 py-3">Customer / Partner</th>
                  <th className="px-6 py-3">Source Warehouse</th>
                  <th className="px-6 py-3">Products To Dispatch</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Workflow Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {deliveries.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      No delivery orders found.
                    </td>
                  </tr>
                ) : (
                  deliveries.map((del) => {
                    const isWaiting = del.status === 'Waiting';
                    const isReady = del.status === 'Ready';
                    const isDone = del.status === 'Done';

                    return (
                      <tr key={del._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-mono font-semibold text-rose-700 text-xs">
                          {del.referenceNumber}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900 text-xs">
                          {del.partnerName || 'Customer'}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-700">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {del.sourceWarehouse?.name || 'Main Warehouse'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600">
                          <div className="space-y-1">
                            {del.items?.map((it, idx) => (
                              <div key={idx} className="flex items-center gap-1.5">
                                <span className="font-bold text-rose-700">
                                  -{it.demandedQuantity} {it.unitOfMeasure}
                                </span>
                                <span>{it.productName}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(del.scheduledDate || del.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={del.status} />
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          {isWaiting && (
                            <button
                              onClick={() => handlePickItems(del._id, del.referenceNumber)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                            >
                              <PackageCheck className="w-3.5 h-3.5" /> 1. Pick Items
                            </button>
                          )}
                          {isReady && (
                            <button
                              onClick={() => handleValidateDelivery(del._id, del.referenceNumber)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-semibold shadow-xs shadow-rose-200 transition-colors"
                            >
                              <Truck className="w-3.5 h-3.5" /> 2. Validate & Ship (-Stock)
                            </button>
                          )}
                          {isDone && (
                            <span className="text-xs text-emerald-600 font-semibold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Stock Deducted & Shipped
                            </span>
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

      {/* Create Delivery Order Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Outgoing Delivery Order"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateDelivery} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Customer / Client Name *
              </label>
              <div className="relative">
                <Users className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  placeholder="e.g. Nexus Tech Corp"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Source Warehouse (Pick Location) *
              </label>
              <select
                value={sourceWarehouse}
                onChange={(e) => setSourceWarehouse(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
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
                Products to Dispatch *
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
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-rose-500"
                    >
                      {products.map((p) => (
                        <option key={p._id} value={p._id}>
                          [{p.sku}] {p.name} (Stock: {p.totalStock})
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
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-rose-500"
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
              Sales Order Ref / Shipping Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. SO-8419, Urgent courier delivery"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-rose-500 focus:bg-white"
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
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
            >
              Save Delivery Order
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
