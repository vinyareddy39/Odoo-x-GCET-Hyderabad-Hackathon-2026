import { Warehouse } from '../models/Warehouse.js';
import { Inventory } from '../models/Inventory.js';

// @desc    Get all warehouses
// @route   GET /api/warehouses
export const getWarehouses = async (req, res) => {
  try {
    const warehouses = await Warehouse.find().sort({ createdAt: -1 });
    res.json({ success: true, count: warehouses.length, data: warehouses });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new warehouse
// @route   POST /api/warehouses
export const createWarehouse = async (req, res) => {
  try {
    const { name, code, type, address, zones } = req.body;

    const existing = await Warehouse.findOne({ code: code.toUpperCase() });
    if (existing) {
      return res.status(400).json({ message: `Warehouse with code ${code} already exists.` });
    }

    const warehouse = await Warehouse.create({
      name,
      code: code.toUpperCase(),
      type: type || 'internal',
      address,
      zones: zones || [],
    });

    res.status(201).json({ success: true, data: warehouse });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update warehouse
// @route   PUT /api/warehouses/:id
export const updateWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }
    res.json({ success: true, data: warehouse });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete warehouse
// @route   DELETE /api/warehouses/:id
export const deleteWarehouse = async (req, res) => {
  try {
    const warehouse = await Warehouse.findById(req.params.id);
    if (!warehouse) {
      return res.status(404).json({ message: 'Warehouse not found' });
    }

    // Check if there is stock in this warehouse
    const hasStock = await Inventory.findOne({
      warehouse: warehouse._id,
      quantityOnHand: { $gt: 0 },
    });

    if (hasStock) {
      return res.status(400).json({
        message: 'Cannot delete warehouse with active inventory. Please transfer out all products first.',
      });
    }

    await warehouse.deleteOne();
    res.json({ success: true, message: 'Warehouse deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
