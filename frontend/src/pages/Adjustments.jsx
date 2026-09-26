import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Navbar } from '../components/Navbar';
import { StatusBadge } from '../components/StatusBadge';
import { Modal } from '../components/Modal';
import { useNotification } from '../context/NotificationContext';
import {
  SlidersHorizontal,
  Plus,
  CheckCircle2,
  Building2,
  Package,
  Calculator,
  AlertCircle,
} from 'lucide-react';

export const Adjustments = () => {
  const [adjustments, setAdjustments] = useState([]);
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [warehouseId, setWarehouseId] = useState('');
  const [productId, setProductId] = useState('');
  const [systemQuantity, setSystemQuantity] = useState(0);
  const [physicalCount, setPhysicalCount] = useState(0);
  const [notes, setNotes] = useState('');

  const { addToast } = useNotification();

  const fetchAdjustments = async () => {
    setLoading(true);
    try {
      const [adjRes, prodRes, whRes] = await Promise.all([
        api.get('/operations', { params: { type: 'adjustment' } }),
        api.get('/products'),
        api.get('/warehouses'),
      ]);

      setAdjustments(adjRes.data.data || []);
      setProducts(prodRes.data.data || []);
      setWarehouses(whRes.data.data || []);

      if (whRes.data.data?.length > 0 && !warehouseId) {
        setWarehouseId(whRes.data.data[0]._id);
      }
      if (prodRes.data.data?.length > 0 && !productId) {
        setProductId(prodRes.data.data[0]._id);
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Could not load adjustments.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdjustments();
  }, []);

  // When warehouse or product changes in the modal, look up the current system stock
  useEffect(() => {
    if (!productId || !warehouseId || products.length === 0) return;
    const prod = products.find((p) => p._id === productId);
    if (!prod) return;

    const loc = prod.stockLocations?.find((l) => l.warehouseId === warehouseId);
    const count = loc ? loc.quantityOnHand : 0;
    setSystemQuantity(count);
    setPhysicalCount(count); // default physical count to current
  }, [productId, warehouseId, products]);

  const delta = Number(physicalCount) - Number(systemQuantity);

  const handleCreateAdjustment = async (e) => {
    e.preventDefault();
    if (!warehouseId || !productId) {
      addToast({
        type: 'warning',
        title: 'Missing Fields',
        message: 'Please select both a warehouse and product.',
      });
      return;
    }

    try {
      const res = await api.post('/operations', {
        type: 'adjustment',
        sourceWarehouse: warehouseId,
        notes: notes || 'Physical inventory cycle count',
        status: 'Draft',
        items: [
          {
            product: productId,
            demandedQuantity: Number(physicalCount),
            physicalCount: Number(physicalCount),
          },
        ],
      });

      // Automatically validate immediately
      const createdOp = res.data.data;
      await api.post(`/operations/${createdOp._id}/validate`);

      addToast({
        type: 'success',
        title: 'Adjustment Applied! ⚖️',
        message: `Inventory updated to ${physicalCount} units (Delta: ${delta > 0 ? '+' : ''}${delta}).`,
      });

      setIsModalOpen(false);
      setNotes('');
      fetchAdjustments();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Adjustment Failed',
        message: err.response?.data?.message || 'Error processing adjustment.',
      });
    }
  };

  const handleValidateQuick = async (id, refNum) => {
    try {
      await api.post(`/operations/${id}/validate`);
      addToast({
        type: 'success',
        title: 'Adjustment Reconciled',
        message: `${refNum}: Stock quantity adjusted in system.`,
      });
      fetchAdjustments();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Failed',
        message: err.response?.data?.message || 'Error validating adjustment.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        title="Stock Adjustments"
        subtitle="Fix Physical Mismatches, Damaged Goods, or Audited Quantities with Auto-Calculated Deltas"
      />

      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">
            Total adjustments recorded: <strong className="text-slate-800">{adjustments.length}</strong>
          </p>

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-amber-200 transition-colors"
          >
            <Plus className="w-4 h-4" /> New Stock Adjustment
          </button>
        </div>

        {/* Adjustments Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Reference #</th>
                  <th className="px-6 py-3">Location</th>
                  <th className="px-6 py-3">Product / SKU</th>
                  <th className="px-6 py-3">System Stock</th>
                  <th className="px-6 py-3">Physical Count</th>
                  <th className="px-6 py-3">Adjustment Delta</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {adjustments.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-6 py-12 text-center text-slate-400">
                      No stock adjustments recorded yet.
                    </td>
                  </tr>
                ) : (
                  adjustments.map((adj) => {
                    const item = adj.items?.[0] || {};
                    const diff = item.difference || 0;
                    const isDraft = adj.status === 'Draft';
                    const isDone = adj.status === 'Done';

                    return (
                      <tr key={adj._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-mono font-semibold text-amber-700 text-xs">
                          {adj.referenceNumber}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-700">
                          <span className="inline-flex items-center gap-1.5 font-medium">
                            <Building2 className="w-3.5 h-3.5 text-slate-400" />
                            {adj.sourceWarehouse?.name || 'Warehouse'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-900 text-xs">{item.productName}</p>
                          <span className="font-mono text-[11px] text-slate-400">{item.productSku}</span>
                        </td>
                        <td className="px-6 py-4 font-mono text-xs text-slate-600">
                          {item.systemCount} {item.unitOfMeasure}
                        </td>
                        <td className="px-6 py-4 font-mono font-bold text-xs text-slate-900">
                          {item.physicalCount} {item.unitOfMeasure}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold ${
                              diff > 0
                                ? 'bg-emerald-100 text-emerald-800'
                                : diff < 0
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {diff > 0 ? `+${diff}` : diff} {item.unitOfMeasure}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(adj.scheduledDate || adj.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={adj.status} />
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          {isDraft ? (
                            <button
                              onClick={() => handleValidateQuick(adj._id, adj.referenceNumber)}
                              className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Validate
                            </button>
                          ) : isDone ? (
                            <span className="text-xs text-emerald-600 font-semibold inline-flex items-center gap-1">
                              <CheckCircle2 className="w-4 h-4" /> Reconciled
                            </span>
                          ) : (
                            <span className="text-xs text-slate-400">{adj.status}</span>
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

      {/* Adjustment Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create Stock Adjustment / Recount"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreateAdjustment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Warehouse / Location *
            </label>
            <select
              value={warehouseId}
              onChange={(e) => setWarehouseId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
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
              Select Product *
            </label>
            <select
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
            >
              {products.map((p) => (
                <option key={p._id} value={p._id}>
                  [{p.sku}] {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Counts & Delta Calculator */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span>Recorded System Stock:</span>
              <strong className="font-mono text-sm text-slate-900">{systemQuantity} units</strong>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-800 uppercase tracking-wider mb-1">
                Actual Physical Counted Quantity *
              </label>
              <input
                type="number"
                min={0}
                required
                value={physicalCount}
                onChange={(e) => setPhysicalCount(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-base font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="pt-2 border-t border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Calculated Stock Delta:</span>
              <span
                className={`font-mono font-bold text-sm px-2.5 py-0.5 rounded-lg ${
                  delta > 0
                    ? 'bg-emerald-100 text-emerald-800'
                    : delta < 0
                    ? 'bg-rose-100 text-rose-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {delta > 0 ? `+${delta}` : delta} units ({delta > 0 ? 'Surplus' : delta < 0 ? 'Shortage / Damage' : 'No Change'})
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Reason / Audit Notes
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Broken items found during monthly cycle audit"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:bg-white"
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
              className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
            >
              Apply & Update Inventory Stock
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
