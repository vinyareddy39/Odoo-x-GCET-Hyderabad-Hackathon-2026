import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api/client';
import { Navbar } from '../components/Navbar';
import { Modal } from '../components/Modal';
import { QrCodeModal } from '../components/QrCodeModal';
import { useNotification } from '../context/NotificationContext';
import {
  Package,
  Plus,
  Search,
  AlertTriangle,
  Building2,
  Edit2,
  Trash2,
  Boxes,
  Tag,
  Layers,
  CheckCircle2,
  XCircle,
  ExternalLink,
  QrCode,
} from 'lucide-react';

export const Products = () => {
  const [products, setProducts] = useState([]);
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams, setSearchParams] = useSearchParams();

  // Filters
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');
  const [warehouseId, setWarehouseId] = useState('All');
  const [lowStockOnly, setLowStockOnly] = useState(
    searchParams.get('lowStockOnly') === 'true'
  );

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [isQrOpen, setIsQrOpen] = useState(false);
  const [selectedQrProduct, setSelectedQrProduct] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    category: 'General',
    unitOfMeasure: 'units',
    reorderThreshold: 10,
    initialStock: 0,
    warehouseId: '',
    costPrice: 0,
    sellingPrice: 0,
    description: '',
  });

  const { addToast } = useNotification();

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (category !== 'All') params.category = category;
      if (warehouseId !== 'All') params.warehouseId = warehouseId;
      if (lowStockOnly) params.lowStockOnly = 'true';

      const [prodRes, whRes] = await Promise.all([
        api.get('/products', { params }),
        api.get('/warehouses'),
      ]);

      setProducts(prodRes.data.data || []);
      setWarehouses(whRes.data.data || []);
      if (!formData.warehouseId && whRes.data.data?.length > 0) {
        setFormData((prev) => ({ ...prev, warehouseId: whRes.data.data[0]._id }));
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Fetch Error',
        message: 'Could not load products.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [category, warehouseId, lowStockOnly]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      name: '',
      sku: '',
      category: 'General',
      unitOfMeasure: 'units',
      reorderThreshold: 10,
      initialStock: 0,
      warehouseId: warehouses[0]?._id || '',
      costPrice: 0,
      sellingPrice: 0,
      description: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (prod) => {
    setIsEditing(true);
    setEditingId(prod._id);
    setFormData({
      name: prod.name,
      sku: prod.sku,
      category: prod.category,
      unitOfMeasure: prod.unitOfMeasure,
      reorderThreshold: prod.reorderThreshold,
      initialStock: 0, // not editable on update
      warehouseId: '',
      costPrice: prod.costPrice || 0,
      sellingPrice: prod.sellingPrice || 0,
      description: prod.description || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmitProduct = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await api.put(`/products/${editingId}`, formData);
        addToast({
          type: 'success',
          title: 'Product Updated',
          message: `${formData.name} was successfully modified.`,
        });
      } else {
        await api.post('/products', formData);
        addToast({
          type: 'success',
          title: 'Product Created',
          message: `${formData.name} was created with SKU ${formData.sku}.`,
        });
      }
      setIsModalOpen(false);
      fetchProducts();
    } catch (err) {
      addToast({
        type: 'error',
        title: isEditing ? 'Update Failed' : 'Creation Failed',
        message: err.response?.data?.message || 'Error saving product.',
      });
    }
  };

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete product "${name}"?`)) return;
    try {
      await api.delete(`/products/${id}`);
      addToast({
        type: 'success',
        title: 'Product Removed',
        message: `Product ${name} deleted successfully.`,
      });
      fetchProducts();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.response?.data?.message || 'Could not delete product.',
      });
    }
  };

  const lowStockTotal = products.filter((p) => p.isLowStock).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        title="Products Catalog"
        subtitle="Manage SKUs, Unit of Measures, Warehouses & Reorder Rules"
        lowStockCount={lowStockTotal}
      />

      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-6">
        {/* Top Action Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by SKU code, product name, or category..."
              className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
            />
          </form>

          <div className="flex items-center gap-3">
            <button
              onClick={handleOpenCreateModal}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-indigo-200 transition-colors"
            >
              <Plus className="w-4 h-4" /> Add New Product
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <div>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500"
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

            <div>
              <select
                value={warehouseId}
                onChange={(e) => setWarehouseId(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="All">All Warehouses</option>
                {warehouses.map((wh) => (
                  <option key={wh._id} value={wh._id}>
                    {wh.code} - {wh.name}
                  </option>
                ))}
              </select>
            </div>

            <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl hover:bg-slate-100 transition-colors">
              <input
                type="checkbox"
                checked={lowStockOnly}
                onChange={(e) => {
                  setLowStockOnly(e.target.checked);
                  setSearchParams(e.target.checked ? { lowStockOnly: 'true' } : {});
                }}
                className="rounded text-indigo-600 focus:ring-indigo-500"
              />
              <span className="flex items-center gap-1.5 text-amber-700 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5" /> Low Stock / Out of Stock Only
              </span>
            </label>
          </div>

          <p className="text-xs text-slate-400">
            Showing <strong className="text-slate-700">{products.length}</strong> products
          </p>
        </div>

        {/* Products Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50/70 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3">Product / SKU</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Unit</th>
                  <th className="px-6 py-3">Total Stock</th>
                  <th className="px-6 py-3">Stock per Warehouse</th>
                  <th className="px-6 py-3">Reorder Alert Rule</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-400">
                      No products found matching your search.
                    </td>
                  </tr>
                ) : (
                  products.map((prod) => (
                    <tr key={prod._id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                            <Package className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="font-semibold text-slate-900 leading-tight">{prod.name}</p>
                            <span className="inline-block mt-0.5 font-mono text-[11px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 font-medium">
                              {prod.sku}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-600">
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 text-xs font-medium">
                          {prod.category}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs font-medium text-slate-600">
                        {prod.unitOfMeasure}
                      </td>

                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm">
                            {prod.totalStock} {prod.unitOfMeasure}
                          </span>
                          {prod.totalStock === 0 ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                              OUT OF STOCK
                            </span>
                          ) : prod.isLowStock ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> LOW STOCK
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              OK
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs">
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {prod.stockLocations && prod.stockLocations.length > 0 ? (
                            prod.stockLocations.map((loc, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-slate-200 rounded-md text-[11px] text-slate-700"
                              >
                                <Building2 className="w-3 h-3 text-slate-400" />
                                <strong>{loc.warehouseCode}:</strong> {loc.quantityOnHand}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-[11px]">No stock assigned</span>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-600">
                        <div className="flex items-center gap-1 text-[11px]">
                          <span>Alert at &le;</span>
                          <strong className="text-slate-900">{prod.reorderThreshold}</strong>
                          <span>{prod.unitOfMeasure}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => {
                              setSelectedQrProduct(prod);
                              setIsQrOpen(true);
                            }}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Print / View Barcode & QR Code Tag"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(prod)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            title="Edit Product"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(prod._id, prod.name)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Delete Product"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Edit Product' : 'Create New Product'}
      >
        <form onSubmit={handleSubmitProduct} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Product Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Industrial Steel Rods"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                SKU / Code (Unique) *
              </label>
              <input
                type="text"
                required
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value.toUpperCase() })}
                placeholder="e.g. RAW-STL-001"
                className="w-full px-3 py-2 font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Category *
              </label>
              <input
                type="text"
                required
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g. Raw Materials"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Unit of Measure (UOM) *
              </label>
              <select
                value={formData.unitOfMeasure}
                onChange={(e) => setFormData({ ...formData, unitOfMeasure: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              >
                <option value="units">units (Items / pcs)</option>
                <option value="kg">kg (Kilograms)</option>
                <option value="meters">meters (Length)</option>
                <option value="liters">liters (Volume)</option>
                <option value="packs">packs</option>
                <option value="rolls">rolls</option>
                <option value="boxes">boxes</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Reordering Rule (Min Threshold) *
              </label>
              <input
                type="number"
                required
                min={0}
                value={formData.reorderThreshold}
                onChange={(e) =>
                  setFormData({ ...formData, reorderThreshold: Number(e.target.value) })
                }
                placeholder="10"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Triggers low stock warnings when total quantity &le; this number.
              </p>
            </div>

            {!isEditing && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Initial Stock Quantity
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={0}
                    value={formData.initialStock}
                    onChange={(e) =>
                      setFormData({ ...formData, initialStock: Number(e.target.value) })
                    }
                    placeholder="0"
                    className="w-24 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  />
                  <select
                    value={formData.warehouseId}
                    onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
                  >
                    {warehouses.map((wh) => (
                      <option key={wh._id} value={wh._id}>
                        {wh.code} - {wh.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Cost Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                min={0}
                value={formData.costPrice}
                onChange={(e) => setFormData({ ...formData, costPrice: Number(e.target.value) })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Selling Price ($)
              </label>
              <input
                type="number"
                step="0.01"
                min={0}
                value={formData.sellingPrice}
                onChange={(e) =>
                  setFormData({ ...formData, sellingPrice: Number(e.target.value) })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Product notes, material specs, or rack location hints..."
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
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
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm transition-colors"
            >
              {isEditing ? 'Save Changes' : 'Create Product'}
            </button>
          </div>
        </form>
      </Modal>

      <QrCodeModal
        product={selectedQrProduct}
        isOpen={isQrOpen}
        onClose={() => setIsQrOpen(false)}
      />
    </div>
  );
};
