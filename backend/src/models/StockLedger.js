import mongoose from 'mongoose';

const stockLedgerSchema = new mongoose.Schema(
  {
    referenceNumber: {
      type: String,
      required: true,
      index: true,
    },
    operationType: {
      type: String,
      enum: ['receipt', 'delivery', 'transfer', 'adjustment'],
      required: true,
      index: true,
    },
    operationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Operation',
      default: null,
    },
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true,
    },
    productSku: {
      type: String,
      required: true,
    },
    productName: {
      type: String,
      required: true,
    },
    fromWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null,
    },
    toWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null,
    },
    quantityChange: {
      type: Number,
      required: true,
    },
    unitOfMeasure: {
      type: String,
      default: 'units',
    },
    balanceAfter: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['Done', 'Draft', 'Canceled'],
      default: 'Done',
    },
    notes: {
      type: String,
      default: '',
    },
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

stockLedgerSchema.index({ createdAt: -1 });

export const StockLedger = mongoose.model('StockLedger', stockLedgerSchema);
