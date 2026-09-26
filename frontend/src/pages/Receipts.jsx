import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Navbar } from '../components/Navbar';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { useNotification } from '../context/NotificationContext';
import {
  ArrowDownToLine,
  Plus,
  Trash2,
  CheckCircle2,
  Calendar,
  Building2,
  Truck,
  Package,
  Layers,
  Search,
  Filter,
} from 'lucide-react';

export const Receipts = () => {
  const [receipts, setReceipts] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');

  // New Receipt Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [partnerName, setPartnerName] = useState('');
  const [destinationWarehouse, setDestinationWarehouse] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState([
    { product: '', demandedQuantity: 10, unitOfMeasure: 'units' },
  ]);

  const { addToast } = useNotification();

  const fetchReceipts = async () => {
    setLoading(true);
    try {
      const params = { type: 'receipt' };
      if (statusFilter !== 'All') params.status = statusFilter;
      if (search) params.search = search;

      const [recRes, prodRes, whRes] = await Promise.all([
        api.get('/operations', { params }),
        api.get('/products'),
        api.get('/warehouses'),
      ]);

      setReceipts(recRes.data.data || []);
      setProducts(prodRes.data.data || []);
      setWarehouses(whRes.data.data || []);

      if (whRes.data.data?.length > 0 && !destinationWarehouse) {
        setDestinationWarehouse(whRes.data.data[0]._id);
      }
      if (prodRes.data.data?.length > 0 && !items[0].product) {
        setItems([
          {
            product: prodRes.data.data[0]._id,
            demandedQuantity: 25,
            unitOfMeasure: prodRes.data.data[0].unitOfMeasure,
          },
        ]);
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Could not load receipts.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReceipts();
  }, [statusFilter]);

  const handleAddItemRow = () => {
    const defaultProd = products[0] || {};
    setItems([
      ...items,
      {
        product: defaultProd._id || '',
        demandedQuantity: 10,
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

  const handleCreateReceipt = async (e) => {
    e.preventDefault();
    if (!destinationWarehouse) {
      addToast({
        type: 'warning',
        title: 'Missing Warehouse',
        message: 'Please select a destination warehouse.',
      });
      return;
    }

    try {
      await api.post('/operations', {
        type: 'receipt',
        partnerName: partnerName || 'General Supplier',
        destinationWarehouse,
        notes,
        status: 'Ready', // Set to ready so user can validate
        items: items.map((it) => ({
          product: it.product,
          demandedQuantity: Number(it.demandedQuantity),
        })),
      });

      addToast({
        type: 'success',
        title: 'Receipt Created',
        message: 'Incoming receipt document ready for validation.',
      });

      setIsModalOpen(false);
      setPartnerName('');
      setNotes('');
      fetchReceipts();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Creation Failed',
        message: err.response?.data?.message || 'Error creating receipt.',
      });
    }
  };

  const handleValidateReceipt = async (id, refNum) => {
    try {
      await api.post(`/operations/${id}/validate`);
      addToast({
        type: 'success',
        title: 'Receipt Validated! 📦',
        message: `${refNum}: Stock automatically increased in database & movement logged!`,
      });
      fetchReceipts();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Validation Failed',
        message: err.response?.data?.message || 'Could not validate receipt.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        title="Incoming Receipts"
        subtitle="Receive Goods from Suppliers & Automatically Increase Inventory Stock"
      />

      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500 shadow-xs"
            >
              <option value="All">All Statuses</option>
              <option value="Ready">Ready to Validate</option>
              <option value="Done">Done (Validated)</option>
              <option value="Draft">Draft</option>
              <option value="Canceled">Canceled</option>
            </select>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-emerald-200 transition-colors"
          >
            <Plus className="w-4 h-4" /> Create New Receipt
          </button>
        </div>

        {/* Receipts List */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Reference #</th>
                  <th className="px-6 py-3">Supplier</th>
                  <th className="px-6 py-3">Destination Warehouse</th>
                  <th className="px-6 py-3">Products & Quantities</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receipts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      No incoming receipts found.
                    </td>
                  </tr>
                ) : (
                  receipts.map((rec) => {
                    const isReady = rec.status === 'Ready';
                    const isDone = rec.status === 'Done';

                    return (
                      <tr key={rec._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-mono font-semibold text-emerald-700 text-xs">
                          {rec.referenceNumber}
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-900 text-xs">
                          {rec.partnerName || 'Supplier'}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-700">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {rec.destinationWarehouse?.name || 'Main Warehouse'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600">
                          <div className="space-y-1">
                            {rec.items?.map((it, idx) => (
                              <div key={idx} className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-900">
                                  +{it.demandedQuantity} {it.unitOfMeasure}
                                </span>
                                <span>{it.productName}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(rec.scheduledDate || rec.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={rec.status} />
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          {isReady ? (
                            <button
                              onClick={() => handleValidateReceipt(rec._id, rec.referenceNumber)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold shadow-xs shadow-emerald-200 transition-colors"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Validate (Add Stock)
                            </button>
                          ) : isDone ? (
                            <span className="text-xs text-emerald-600 font-semibold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Stock Increased
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">{rec.status}</span>
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

      {/* Create Receipt Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Incoming Stock Receipt"
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleCreateReceipt} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Supplier / Vendor Name *
              </label>
              <div className="relative">
                <Truck className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={partnerName}
                  onChange={(e) => setPartnerName(e.target.value)}
                  placeholder="e.g. Apex Industrial Supplies"
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Destination Warehouse *
              </label>
              <select
                value={destinationWarehouse}
                onChange={(e) => setDestinationWarehouse(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
              >
                {warehouses.map((wh) => (
                  <option key={wh._id} value={wh._id}>
                    {wh.code} - {wh.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Product Items Table */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Products to Receive *
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
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500"
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
                      className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-900 focus:ring-2 focus:ring-emerald-500"
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
              Internal Notes / PO Reference
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. PO-7492, supplier invoice #5841"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
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
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
            >
              Save Receipt Document
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
