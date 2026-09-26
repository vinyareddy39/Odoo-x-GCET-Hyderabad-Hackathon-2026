import mongoose from 'mongoose';

const inventorySchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
    warehouse: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Warehouse',
      required: true,
    },
    quantityOnHand: {
      type: Number,
      required: true,
      default: 0,
    },
    reservedQuantity: {
      type: Number,
      default: 0,
    },
    locationZone: {
      type: String,
      default: 'Main Storage',
    },
  },
  { timestamps: true }
);

// Unique compound index to ensure one record per product per warehouse
inventorySchema.index({ product: 1, warehouse: 1 }, { unique: true });

export const Inventory = mongoose.model('Inventory', inventorySchema);
