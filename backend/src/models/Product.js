import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    sku: {
      type: String,
      required: [true, 'SKU / Code is required'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      default: 'General',
    },
    unitOfMeasure: {
      type: String,
      required: [true, 'Unit of Measure is required'],
      trim: true,
      default: 'units',
    },
    reorderThreshold: {
      type: Number,
      required: true,
      default: 10,
      min: [0, 'Reorder threshold cannot be negative'],
    },
    costPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    sellingPrice: {
      type: Number,
      default: 0,
      min: 0,
    },
    description: {
      type: String,
      default: '',
    },
    barcode: {
      type: String,
      default: '',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Virtual for fast text searching
productSchema.index({ name: 'text', sku: 'text', category: 'text' });

export const Product = mongoose.model('Product', productSchema);
