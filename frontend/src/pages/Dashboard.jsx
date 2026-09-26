import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import { Navbar } from '../components/Navbar';
import { KpiCard } from '../components/KpiCard';
import { StatusBadge } from '../components/StatusBadge';
import { LowStockBanner } from '../components/LowStockBanner';
import { useNotification } from '../context/NotificationContext';
import {
  Boxes,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  Layers,
  Search,
  Filter,
  RefreshCw,
  Plus,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
} from 'lucide-react';

export const Dashboard = () => {
  const [data, setData] = useState({
    kpis: {
      totalProductsCount: 0,
      totalStockQuantity: 0,
      lowStockCount: 0,
      pendingReceiptsCount: 0,
      pendingDeliveriesCount: 0,
      internalTransfersScheduledCount: 0,
    },
    documents: [],
  });
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    docType: 'All',
    status: 'All',
    warehouseId: 'All',
    category: 'All',
    search: '',
  });

  const navigate = useNavigate();
  const { addToast } = useNotification();

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const params = {};
      if (filters.docType !== 'All') params.docType = filters.docType;
      if (filters.status !== 'All') params.status = filters.status;
      if (filters.warehouseId !== 'All') params.warehouseId = filters.warehouseId;
      if (filters.category !== 'All') params.category = filters.category;
      if (filters.search) params.search = filters.search;

      const [dashRes, whRes] = await Promise.all([
        api.get('/dashboard', { params }),
        api.get('/warehouses'),
      ]);

      setData(dashRes.data);
      setWarehouses(whRes.data.data || []);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Data Fetch Error',
        message: 'Could not load dashboard statistics.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [filters.docType, filters.status, filters.warehouseId, filters.category]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchDashboardData();
  };

  const handleValidateQuick = async (opId) => {
    try {
      await api.post(`/operations/${opId}/validate`);
      addToast({
        type: 'success',
        title: 'Operation Validated',
        message: 'Stock updated and ledger entry recorded.',
      });
      fetchDashboardData();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Validation Failed',
        message: err.response?.data?.message || 'Error validating operation.',
      });
    }
  };

  const docTypeLabels = {
    receipt: { label: 'Receipt (In)', color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
    delivery: { label: 'Delivery (Out)', color: 'text-rose-700 bg-rose-50 border-rose-200' },
    transfer: { label: 'Internal Transfer', color: 'text-blue-700 bg-blue-50 border-blue-200' },
    adjustment: { label: 'Stock Adjustment', color: 'text-amber-700 bg-amber-50 border-amber-200' },
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        title="Inventory Dashboard"
        subtitle="Live Operations, Stock Levels & Warehouse Activity"
        lowStockCount={data.kpis.lowStockCount}
      />

      <LowStockBanner lowStockCount={data.kpis.lowStockCount} />

      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-8">
        {/* KPI Cards Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <KpiCard
            title="Total Stock"
            value={data.kpis.totalStockQuantity}
            subtitle={`${data.kpis.totalProductsCount} SKUs`}
            icon={Boxes}
            variant="primary"
            onClick={() => navigate('/products')}
          />
          <KpiCard
            title="Low / Out of Stock"
            value={data.kpis.lowStockCount}
            subtitle="Needs Reordering"
            icon={AlertTriangle}
            variant={data.kpis.lowStockCount > 0 ? 'danger' : 'default'}
            onClick={() => navigate('/products?lowStockOnly=true')}
          />
          <KpiCard
            title="Pending Receipts"
            value={data.kpis.pendingReceiptsCount}
            subtitle="Incoming Stock"
            icon={ArrowDownToLine}
            variant="success"
            onClick={() => navigate('/operations/receipts')}
          />
          <KpiCard
            title="Pending Deliveries"
            value={data.kpis.pendingDeliveriesCount}
            subtitle="Outgoing Stock"
            icon={ArrowUpFromLine}
            variant="warning"
            onClick={() => navigate('/operations/deliveries')}
          />
          <KpiCard
            title="Internal Transfers"
            value={data.kpis.internalTransfersScheduledCount}
            subtitle="Scheduled Moves"
            icon={Layers}
            variant="default"
            onClick={() => navigate('/operations/transfers')}
          />
        </div>

        {/* Dynamic Filters Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 text-slate-800 font-semibold text-sm">
              <Filter className="w-4 h-4 text-indigo-600" />
              <span>Operations & Movement Filter</span>
            </div>

            {/* Search Input */}
            <form onSubmit={handleSearchSubmit} className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filters.search}
                onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                placeholder="Search ref #, partner, item..."
                className="w-full pl-9 pr-4 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </form>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-2 border-t border-slate-100">
            {/* Filter 1: Document Type */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Document Type
              </label>
              <select
                value={filters.docType}
                onChange={(e) => setFilters({ ...filters, docType: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="All">All Documents</option>
                <option value="receipt">Receipts (Incoming)</option>
                <option value="delivery">Delivery Orders (Outgoing)</option>
                <option value="transfer">Internal Transfers</option>
                <option value="adjustment">Stock Adjustments</option>
              </select>
            </div>

            {/* Filter 2: Status */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Status
              </label>
              <select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="All">All Statuses</option>
                <option value="Draft">Draft</option>
                <option value="Waiting">Waiting</option>
                <option value="Ready">Ready</option>
                <option value="Done">Done</option>
                <option value="Canceled">Canceled</option>
              </select>
            </div>

            {/* Filter 3: Warehouse / Location */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Warehouse / Location
              </label>
              <select
                value={filters.warehouseId}
                onChange={(e) => setFilters({ ...filters, warehouseId: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="All">All Warehouses</option>
                {warehouses.map((wh) => (
                  <option key={wh._id} value={wh._id}>
                    {wh.code} - {wh.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter 4: Product Category */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Product Category
              </label>
              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="All">All Categories</option>
                <option value="Raw Materials">Raw Materials</option>
                <option value="Furniture">Furniture</option>
                <option value="Electronics">Electronics</option>
                <option value="Accessories">Accessories</option>
                <option value="Packaging">Packaging</option>
                <option value="Supplies">Supplies</option>
              </select>
            </div>
          </div>
        </div>

        {/* Filtered Operations Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900">Recent Warehouse Documents</h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Showing {data.documents.length} matching operations
              </p>
            </div>

            <button
              onClick={fetchDashboardData}
              disabled={loading}
              className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-slate-50 rounded-xl transition-colors"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Reference #</th>
                  <th className="px-6 py-3">Type</th>
                  <th className="px-6 py-3">Partner / Location</th>
                  <th className="px-6 py-3">Items</th>
                  <th className="px-6 py-3">Date</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-normal">
                {data.documents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                      No documents match your current filter selection.
                    </td>
                  </tr>
                ) : (
                  data.documents.map((doc) => {
                    const typeConfig = docTypeLabels[doc.type] || {
                      label: doc.type,
                      color: 'text-slate-600 bg-slate-50 border-slate-200',
                    };
                    const isReadyToValidate = doc.status === 'Ready';

                    return (
                      <tr key={doc._id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="px-6 py-4 font-mono font-semibold text-indigo-600 text-xs">
                          {doc.referenceNumber}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`inline-flex px-2 py-0.5 rounded-md text-[11px] font-semibold border ${typeConfig.color}`}
                          >
                            {typeConfig.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-700">
                          {doc.type === 'receipt' && (
                            <div>
                              <p className="font-semibold text-slate-900">{doc.partnerName || 'Supplier'}</p>
                              <p className="text-[11px] text-slate-400">
                                To: {doc.destinationWarehouse?.name || 'Warehouse'}
                              </p>
                            </div>
                          )}
                          {doc.type === 'delivery' && (
                            <div>
                              <p className="font-semibold text-slate-900">{doc.partnerName || 'Customer'}</p>
                              <p className="text-[11px] text-slate-400">
                                From: {doc.sourceWarehouse?.name || 'Warehouse'}
                              </p>
                            </div>
                          )}
                          {doc.type === 'transfer' && (
                            <div className="flex items-center gap-1.5 text-[11px]">
                              <span className="font-medium text-slate-800">
                                {doc.sourceWarehouse?.code}
                              </span>
                              <ArrowRight className="w-3 h-3 text-slate-400" />
                              <span className="font-medium text-slate-800">
                                {doc.destinationWarehouse?.code}
                              </span>
                            </div>
                          )}
                          {doc.type === 'adjustment' && (
                            <div>
                              <p className="font-semibold text-slate-900">
                                {doc.sourceWarehouse?.name || 'Warehouse'}
                              </p>
                              <p className="text-[11px] text-slate-400">Physical Count Audit</p>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-600">
                          {doc.items?.map((it, idx) => (
                            <div key={idx} className="truncate max-w-[200px]">
                              {it.demandedQuantity || it.physicalCount} {it.unitOfMeasure} × {it.productName}
                            </div>
                          ))}
                        </td>
                        <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                          {new Date(doc.scheduledDate || doc.createdAt).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <StatusBadge status={doc.status} />
                        </td>
                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          {isReadyToValidate ? (
                            <button
                              onClick={() => handleValidateQuick(doc._id)}
                              className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" /> Validate
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                const targetPath =
                                  doc.type === 'receipt'
                                    ? '/operations/receipts'
                                    : doc.type === 'delivery'
                                    ? '/operations/deliveries'
                                    : doc.type === 'transfer'
                                    ? '/operations/transfers'
                                    : '/operations/adjustments';
                                navigate(targetPath);
                              }}
                              className="text-xs text-slate-500 hover:text-indigo-600 font-medium inline-flex items-center gap-1"
                            >
                              Details <ArrowRight className="w-3 h-3" />
                            </button>
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
    </div>
  );
};
