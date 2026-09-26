import mongoose from 'mongoose';

const lineItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  productName: String,
  productSku: String,
  unitOfMeasure: {
    type: String,
    default: 'units',
  },
  demandedQuantity: {
    type: Number,
    required: true,
    min: 0,
  },
  doneQuantity: {
    type: Number,
    default: 0,
    min: 0,
  },
  // Used specifically for Stock Adjustments
  systemCount: {
    type: Number,
    default: 0,
  },
  physicalCount: {
    type: Number,
    default: 0,
  },
  difference: {
    type: Number,
    default: 0,
  },
});

const operationSchema = new mongoose.Schema(
  {
    referenceNumber: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['receipt', 'delivery', 'transfer', 'adjustment'],
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['Draft', 'Waiting', 'Ready', 'Done', 'Canceled'],
      default: 'Draft',
      index: true,
    },
    // Partner (Supplier for Receipts, Customer for Deliveries)
    partnerName: {
      type: String,
      default: '',
    },
    sourceWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null,
    },
    destinationWarehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      default: null,
    },
    items: [lineItemSchema],
    notes: {
      type: String,
      default: '',
    },
    scheduledDate: {
      type: Date,
      default: Date.now,
    },
    validatedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    validatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  { timestamps: true }
);

operationSchema.index({ type: 1, status: 1, createdAt: -1 });

export const Operation = mongoose.model('Operation', operationSchema);
