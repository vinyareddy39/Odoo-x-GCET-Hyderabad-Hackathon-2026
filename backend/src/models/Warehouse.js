import mongoose from 'mongoose';

const warehouseSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Warehouse/Location name is required'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'Code is required (e.g., WH-MAIN)'],
      unique: true,
      uppercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['internal', 'production', 'transit', 'vendor', 'customer'],
      default: 'internal',
    },
    address: {
      type: String,
      default: 'Main Campus, Building A',
    },
    zones: [
      {
        name: String,
        code: String,
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

export const Warehouse = mongoose.model('Warehouse', warehouseSchema);
