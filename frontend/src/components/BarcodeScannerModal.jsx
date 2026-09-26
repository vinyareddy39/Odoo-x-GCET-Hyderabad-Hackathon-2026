import React, { useState } from 'react';
import api from '../api/client';
import { Modal } from './Modal';
import { ScanBarcode, Search, Building2, CheckCircle2, ArrowRight } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';
import { useNavigate } from 'react-router-dom';

export const BarcodeScannerModal = ({ isOpen, onClose }) => {
  const [scannedCode, setScannedCode] = useState('');
  const [productData, setProductData] = useState(null);
  const [loading, setLoading] = useState(false);

  const { addToast } = useNotification();
  const navigate = useNavigate();

  const handleScan = async (codeToQuery) => {
    const query = (codeToQuery || scannedCode).trim().toUpperCase();
    if (!query) return;

    setLoading(true);
    setProductData(null);
    try {
      const res = await api.get('/products', { params: { search: query } });
      const found = res.data.data?.find((p) => p.sku === query || p.sku.includes(query));

      if (found) {
        setProductData(found);
        addToast({
          type: 'success',
          title: 'Barcode Matched! 🏷️',
          message: `Scanned ${found.name} (${found.sku})`,
        });
      } else {
        addToast({
          type: 'warning',
          title: 'Not Found',
          message: `No product registered with code "${query}".`,
        });
      }
    } catch (err) {
      addToast({
        type: 'error',
        title: 'Scan Error',
        message: 'Could not lookup barcode.',
      });
    } finally {
      setLoading(false);
    }
  };

  const sampleSkus = ['RAW-STL-001', 'FUR-CHR-101', 'ELC-BAT-303', 'PKG-BOX-606'];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Barcode & Handheld Scanner Simulator"
      maxWidth="max-w-md"
    >
      <div className="space-y-4">
        {/* Visual Scanner Viewport */}
        <div className="relative bg-slate-950 rounded-2xl p-6 text-center border-2 border-slate-800 overflow-hidden">
          {/* Laser scanning line animation */}
          <div className="absolute inset-x-0 h-0.5 bg-rose-500 shadow-[0_0_12px_#f43f5e] animate-bounce" />

          <ScanBarcode className="w-16 h-16 mx-auto text-slate-500 opacity-40 mb-2" />
          <p className="text-xs text-slate-400 font-medium">
            Simulated Handheld Optical Scanner
          </p>
          <span className="text-[10px] text-emerald-400 uppercase tracking-widest font-mono">
            ● READY FOR INPUT
          </span>
        </div>

        {/* Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleScan();
          }}
          className="space-y-2"
        >
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider">
            Enter or Scan Barcode SKU:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              autoFocus
              value={scannedCode}
              onChange={(e) => setScannedCode(e.target.value.toUpperCase())}
              placeholder="e.g. RAW-STL-001"
              className="flex-1 px-3.5 py-2.5 font-mono uppercase bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 font-bold text-slate-900"
            />
            <button
              type="submit"
              disabled={loading || !scannedCode.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              Scan
            </button>
          </div>
        </form>

        {/* Quick Click-to-Scan Simulator Chips */}
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Click to Simulate Scan:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {sampleSkus.map((sku) => (
              <button
                key={sku}
                type="button"
                onClick={() => {
                  setScannedCode(sku);
                  handleScan(sku);
                }}
                className="px-2.5 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 border border-slate-200 rounded-lg text-xs font-mono font-medium transition-colors"
              >
                {sku}
              </button>
            ))}
          </div>
        </div>

        {/* Scanned Result Card */}
        {productData && (
          <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-3 animate-in fade-in">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-bold text-slate-900 text-sm">{productData.name}</h4>
                <span className="font-mono text-xs font-semibold text-indigo-700">
                  {productData.sku}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-emerald-600 text-white">
                {productData.totalStock} {productData.unitOfMeasure}
              </span>
            </div>

            <div className="space-y-1 text-xs">
              <p className="text-slate-500 font-semibold uppercase text-[10px]">Location Inventory:</p>
              {productData.stockLocations?.map((loc, idx) => (
                <div key={idx} className="flex justify-between text-slate-700">
                  <span>{loc.warehouseCode} ({loc.warehouseName}):</span>
                  <strong>{loc.quantityOnHand} units</strong>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-emerald-200 flex justify-end">
              <button
                onClick={() => {
                  onClose();
                  navigate('/operations/receipts');
                }}
                className="text-xs text-indigo-700 font-semibold hover:underline inline-flex items-center gap-1"
              >
                Receive Stock <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
