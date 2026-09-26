import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Navbar } from '../components/Navbar';
import { useNotification } from '../context/NotificationContext';
import {
  History,
  Search,
  Filter,
  ArrowDownToLine,
  ArrowUpFromLine,
  Layers,
  SlidersHorizontal,
  Building2,
  Calendar,
  RefreshCw,
  FileSpreadsheet,
} from 'lucide-react';

export const MoveHistory = () => {
  const [moves, setMoves] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [operationType, setOperationType] = useState('All');
  const [warehouseId, setWarehouseId] = useState('All');
  const [search, setSearch] = useState('');

  const { addToast } = useNotification();

  const fetchMoves = async () => {
    setLoading(true);
    try {
      const params = {};
      if (operationType !== 'All') params.operationType = operationType;
      if (warehouseId !== 'All') params.warehouseId = warehouseId;
      if (search) params.search = search;

      const [movesRes, whRes, prodRes] = await Promise.all([
        api.get('/move-history', { params }),
        api.get('/warehouses'),
        api.get('/products'),
      ]);

      setMoves(movesRes.data.data || []);
      setWarehouses(whRes.data.data || []);
      setProducts(prodRes.data.data || []);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Could not fetch movement ledger.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMoves();
  }, [operationType, warehouseId]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchMoves();
  };

  const typeBadges = {
    receipt: {
      label: 'Receipt (+)',
      className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: ArrowDownToLine,
    },
    delivery: {
      label: 'Delivery (-)',
      className: 'bg-rose-50 text-rose-700 border-rose-200',
      icon: ArrowUpFromLine,
    },
    transfer: {
      label: 'Transfer',
      className: 'bg-blue-50 text-blue-700 border-blue-200',
      icon: Layers,
    },
    adjustment: {
      label: 'Adjustment',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
      icon: SlidersHorizontal,
    },
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        title="Stock Move History (Ledger)"
        subtitle="Chronological Central Audit Trail of All Physical Goods Movements"
      />

      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Filter bar */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <select
                value={operationType}
                onChange={(e) => setOperationType(e.target.value)}
                className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="All">All Movement Types</option>
                <option value="receipt">Receipts (Incoming)</option>
                <option value="delivery">Deliveries (Outgoing)</option>
                <option value="transfer">Internal Transfers</option>
                <option value="adjustment">Stock Adjustments</option>
              </select>
            </div>

            <div>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="px-3.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="All">All Locations</option>
                {warehouses.map((wh) => (
                  <option key={wh._id} value={wh._id}>
                    {wh.code} - {wh.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search reference, SKU, or notes..."
              className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </form>

          <button
            onClick={fetchMoves}
            className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Ledger Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Timestamp</th>
                  <th className="px-6 py-3">Reference #</th>
                  <th className="px-6 py-3">Movement Type</th>
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">From Location</th>
                  <th className="px-6 py-3">To Location</th>
                  <th className="px-6 py-3 text-right">Qty Change</th>
                  <th className="px-6 py-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {moves.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                      No stock movements recorded.
                    </td>
                  </tr>
                ) : (
                  moves.map((move) => {
                    const badge = typeBadges[move.operationType] || {
                      label: move.operationType,
                      className: 'bg-slate-100 text-slate-700',
                      icon: History,
                    };
                    const Icon = badge.icon;
                    const isPositive = move.quantityChange > 0;
                    const isNegative = move.quantityChange < 0;

                    return (
                      <tr key={move._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(move.createdAt).toLocaleString(undefined, {
                            dateStyle: 'short',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td className="px-6 py-4 font-mono font-semibold text-indigo-600 text-xs">
                          {move.referenceNumber}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${badge.className}`}
                          >
                            <Icon className="w-3 h-3" />
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <p className="font-semibold text-slate-900 text-xs leading-tight">
                            {move.productName}
                          </p>
                          <span className="font-mono text-[11px] text-slate-400">
                            {move.productSku}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600">
                          {move.fromWarehouse ? (
                            <span className="inline-flex items-center gap-1 font-medium">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              {move.fromWarehouse.code}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">External / Vendor</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600">
                          {move.toWarehouse ? (
                            <span className="inline-flex items-center gap-1 font-medium">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              {move.toWarehouse.code}
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Customer / Scrap</span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <span
                            className={`font-mono font-bold text-xs ${
                              isPositive
                                ? 'text-emerald-600'
                                : isNegative
                                ? 'text-rose-600'
                                : 'text-slate-600'
                            }`}
                          >
                            {isPositive ? `+${move.quantityChange}` : move.quantityChange}{' '}
                            {move.unitOfMeasure}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 max-w-xs truncate">
                          {move.notes || '-'}
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
    </div>
  );
};
