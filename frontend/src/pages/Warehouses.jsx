import React, { useState, useEffect } from 'react';
import api from '../api/client';
import { Navbar } from '../components/Navbar';
import { Modal } from '../components/Modal';
import { useNotification } from '../context/NotificationContext';
import {
  Building2,
  Plus,
  MapPin,
  Layers,
  Edit2,
  Trash2,
  Boxes,
  ShieldCheck,
} from 'lucide-react';

export const Warehouses = () => {
  const [warehouses, setWarehouses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    type: 'internal',
    address: '',
    zones: '',
  });

  const { addToast } = useNotification();

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const res = await api.get('/warehouses');
      setWarehouses(res.data.data || []);
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Error',
        message: 'Could not load warehouses.',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const handleOpenCreateModal = () => {
    setIsEditing(false);
    setEditingId(null);
    setFormData({
      name: '',
      code: '',
      type: 'internal',
      address: '',
      zones: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (wh) => {
    setIsEditing(true);
    setEditingId(wh._id);
    setFormData({
      name: wh.name,
      code: wh.code,
      type: wh.type,
      address: wh.address || '',
      zones: wh.zones?.map((z) => z.name).join(', ') || '',
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const zonesArray = formData.zones
        ? formData.zones
            .split(',')
            .map((z) => ({ name: z.trim(), code: z.trim().toUpperCase().slice(0, 5) }))
        : [];

      const payload = {
        name: formData.name,
        code: formData.code.toUpperCase(),
        type: formData.type,
        address: formData.address,
        zones: zonesArray,
      };

      if (isEditing) {
        await api.put(`/warehouses/${editingId}`, payload);
        addToast({
          type: 'success',
          title: 'Warehouse Updated',
          message: `Location ${formData.name} updated.`,
        });
      } else {
        await api.post('/warehouses', payload);
        addToast({
          type: 'success',
          title: 'Warehouse Created',
          message: `New warehouse location ${formData.name} added.`,
        });
      }
      setIsModalOpen(false);
      fetchWarehouses();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Save Failed',
        message: err.response?.data?.message || 'Error saving warehouse.',
      });
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Are you sure you want to delete warehouse "${name}"?`)) return;
    try {
      await api.delete(`/warehouses/${id}`);
      addToast({
        type: 'success',
        title: 'Warehouse Deleted',
        message: `Warehouse ${name} deleted successfully.`,
      });
      fetchWarehouses();
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.response?.data?.message || 'Cannot delete warehouse with active stock.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar
        title="Warehouse & Locations Management"
        subtitle="Configure Physical Storage Hubs, Production Bays & Internal Facilities"
      />

      <main className="flex-1 p-8 max-w-7xl w-full mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">
            Active facilities: <strong className="text-slate-800">{warehouses.length}</strong>
          </p>

          <button
            onClick={handleOpenCreateModal}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold shadow-sm shadow-indigo-200 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Warehouse
          </button>
        </div>

        {/* Warehouse Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {warehouses.map((wh) => (
            <div
              key={wh._id}
              className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base leading-tight">
                        {wh.name}
                      </h3>
                      <span className="font-mono text-xs font-semibold text-indigo-600">
                        {wh.code}
                      </span>
                    </div>
                  </div>

                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase bg-slate-100 text-slate-600 border border-slate-200">
                    {wh.type}
                  </span>
                </div>

                <div className="space-y-2 text-xs text-slate-600">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{wh.address || 'Standard Location'}</span>
                  </div>

                  {wh.zones && wh.zones.length > 0 && (
                    <div className="pt-2">
                      <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                        Storage Bays & Zones:
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {wh.zones.map((z, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-700"
                          >
                            {z.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 mt-6 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-emerald-600 font-semibold flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5" /> Operational
                </span>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(wh)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(wh._id, wh.name)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-slate-50 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Warehouse Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={isEditing ? 'Edit Warehouse' : 'Add New Warehouse'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Facility Name *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g. South Logistics Depot"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Code (Unique) *
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                placeholder="WH-SOUTH"
                className="w-full px-3 py-2 uppercase font-mono bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Facility Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
              >
                <option value="internal">Internal Warehouse</option>
                <option value="production">Production Floor</option>
                <option value="transit">Transit Hub</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Address / Location Details
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="e.g. 500 Industrial Parkway, Wing B"
              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
              Storage Zones / Racks (comma separated)
            </label>
            <input
              type="text"
              value={formData.zones}
              onChange={(e) => setFormData({ ...formData, zones: e.target.value })}
              placeholder="e.g. Zone A, Zone B, Cold Storage"
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
              Save Warehouse
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
