import React from 'react';
import { Modal } from './Modal';
import { QrCode, Printer, Check, Copy } from 'lucide-react';
import { useNotification } from '../context/NotificationContext';

export const QrCodeModal = ({ isOpen, onClose, product }) => {
  const { addToast } = useNotification();

  if (!product) return null;

  const handleCopySku = () => {
    navigator.clipboard.writeText(product.sku);
    addToast({
      type: 'info',
      title: 'Copied',
      message: `SKU ${product.sku} copied to clipboard for scanner simulation.`,
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Product Barcode & QR Identifier"
      maxWidth="max-w-sm"
    >
      <div className="text-center space-y-4">
        {/* Printable Label Card */}
        <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">
            STOCKSENSE ASSET TAG
          </p>
          <h4 className="text-base font-bold text-slate-900 mb-3">{product.name}</h4>

          {/* SVG QR Code representation */}
          <div className="p-4 bg-white rounded-xl shadow-xs border border-slate-200">
            <svg
              className="w-36 h-36 mx-auto text-slate-900"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect width="5" height="5" x="3" y="3" rx="1" fill="currentColor" />
              <rect width="5" height="5" x="16" y="3" rx="1" fill="currentColor" />
              <rect width="5" height="5" x="3" y="16" rx="1" fill="currentColor" />
              <path d="M21 16h-3a2 2 0 0 0-2 2v3" />
              <path d="M21 21v.01" />
              <path d="M12 7v3a2 2 0 0 1-2 2H7" />
              <path d="M3 12h.01" />
              <path d="M12 3h.01" />
              <path d="M12 16v.01" />
              <path d="M16 12h1" />
              <path d="M21 12v.01" />
              <path d="M12 21v-1" />
            </svg>
          </div>

          <div className="mt-3 font-mono font-bold text-lg text-indigo-700 tracking-wider">
            {product.sku}
          </div>
          <p className="text-[11px] text-slate-400 mt-1">
            {product.category} • Reorder Threshold: {product.reorderThreshold} {product.unitOfMeasure}
          </p>
        </div>

        <div className="flex gap-2 justify-center">
          <button
            onClick={handleCopySku}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-colors"
          >
            <Copy className="w-3.5 h-3.5" /> Copy SKU Code
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5" /> Print Tag Label
          </button>
        </div>
      </div>
    </Modal>
  );
};
