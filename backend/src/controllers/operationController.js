import { Operation } from '../models/Operation.js';
import { Inventory } from '../models/Inventory.js';
import { Product } from '../models/Product.js';
import { StockLedger } from '../models/StockLedger.js';
import { Warehouse } from '../models/Warehouse.js';

// Helper to generate reference numbers
const generateRefNumber = async (type) => {
  const prefixes = {
    receipt: 'REC',
    delivery: 'DEL',
    transfer: 'TRF',
    adjustment: 'ADJ',
  };
  const prefix = prefixes[type] || 'OP';
  const year = new Date().getFullYear();
  const count = await Operation.countDocuments({ type });
  const sequence = String(count + 1).padStart(4, '0');
  return `${prefix}-${year}-${sequence}`;
};

// @desc    Get all operations with filters
// @route   GET /api/operations
export const getOperations = async (req, res) => {
  try {
    const { type, status, warehouseId, search, category } = req.query;
    let query = {};

    if (type && type !== 'All') {
      query.type = type;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (warehouseId && warehouseId !== 'All') {
      query.$or = [{ sourceWarehouse: warehouseId }, { destinationWarehouse: warehouseId }];
    }

    if (search) {
      query.$or = [
        { referenceNumber: { $regex: search, $options: 'i' } },
        { partnerName: { $regex: search, $options: 'i' } },
        { 'items.productName': { $regex: search, $options: 'i' } },
        { 'items.productSku': { $regex: search, $options: 'i' } },
      ];
    }

    const operations = await Operation.find(query)
      .populate('sourceWarehouse', 'name code')
      .populate('destinationWarehouse', 'name code')
      .populate('createdBy', 'name email')
      .populate('validatedBy', 'name email')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: operations.length,
      data: operations,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single operation
// @route   GET /api/operations/:id
export const getOperationById = async (req, res) => {
  try {
    const operation = await Operation.findById(req.params.id)
      .populate('sourceWarehouse', 'name code address')
      .populate('destinationWarehouse', 'name code address')
      .populate('createdBy', 'name email')
      .populate('validatedBy', 'name email')
      .populate('items.product');

    if (!operation) {
      return res.status(404).json({ message: 'Operation document not found' });
    }

    res.json({ success: true, data: operation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create new operation (Receipt, Delivery, Transfer, Adjustment)
// @route   POST /api/operations
export const createOperation = async (req, res) => {
  try {
    const {
      type,
      partnerName,
      sourceWarehouse,
      destinationWarehouse,
      items,
      notes,
      scheduledDate,
      status,
    } = req.body;

    if (!type || !['receipt', 'delivery', 'transfer', 'adjustment'].includes(type)) {
      return res.status(400).json({ message: 'Valid operation type is required.' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'At least one product line item is required.' });
    }

    // Populate item details from Product
    const enrichedItems = [];
    for (const item of items) {
      const prod = await Product.findById(item.product);
      if (!prod) {
        return res.status(404).json({ message: `Product with ID ${item.product} not found.` });
      }

      let systemCount = 0;
      let diff = 0;

      // For adjustments, calculate system count and delta
      if (type === 'adjustment' && sourceWarehouse) {
        const inv = await Inventory.findOne({ product: prod._id, warehouse: sourceWarehouse });
        systemCount = inv ? inv.quantityOnHand : 0;
        const physCount = Number(item.physicalCount ?? item.demandedQuantity ?? 0);
        diff = physCount - systemCount;
      }

      enrichedItems.push({
        product: prod._id,
        productName: prod.name,
        productSku: prod.sku,
        unitOfMeasure: prod.unitOfMeasure,
        demandedQuantity: Number(item.demandedQuantity || item.physicalCount || 0),
        doneQuantity: Number(item.doneQuantity || 0),
        systemCount,
        physicalCount: Number(item.physicalCount ?? item.demandedQuantity ?? 0),
        difference: diff,
      });
    }

    const referenceNumber = await generateRefNumber(type);

    const operation = await Operation.create({
      referenceNumber,
      type,
      status: status || 'Draft',
      partnerName: partnerName || '',
      sourceWarehouse: sourceWarehouse || null,
      destinationWarehouse: destinationWarehouse || null,
      items: enrichedItems,
      notes: notes || '',
      scheduledDate: scheduledDate || new Date(),
      createdBy: req.user?._id || null,
    });

    const populated = await Operation.findById(operation._id)
      .populate('sourceWarehouse', 'name code')
      .populate('destinationWarehouse', 'name code');

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update operation status (e.g., Draft -> Waiting -> Ready)
// @route   PATCH /api/operations/:id/status
export const updateOperationStatus = async (req, res) => {
  try {
    const { status } = req.body;
    const operation = await Operation.findById(req.params.id);

    if (!operation) {
      return res.status(404).json({ message: 'Operation not found' });
    }

    if (operation.status === 'Done') {
      return res.status(400).json({ message: 'Cannot modify an already validated (Done) operation.' });
    }

    operation.status = status;
    await operation.save();

    res.json({ success: true, data: operation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Validate Operation (Atomic Stock Update & Ledger Recording)
// @route   POST /api/operations/:id/validate
export const validateOperation = async (req, res) => {
  try {
    const operation = await Operation.findById(req.params.id).populate('items.product');

    if (!operation) {
      return res.status(404).json({ message: 'Operation not found' });
    }

    if (operation.status === 'Done') {
      return res.status(400).json({ message: 'Operation has already been validated and processed.' });
    }

    if (operation.status === 'Canceled') {
      return res.status(400).json({ message: 'Cannot validate a canceled operation.' });
    }

    const { type, items, sourceWarehouse, destinationWarehouse } = operation;

    // 1. RECEIPT: Increase stock in destinationWarehouse
    if (type === 'receipt') {
      if (!destinationWarehouse) {
        return res.status(400).json({ message: 'Destination warehouse is required for validating Receipts.' });
      }

      for (const item of items) {
        const qty = item.demandedQuantity;
        let inv = await Inventory.findOne({
          product: item.product._id,
          warehouse: destinationWarehouse,
        });

        if (!inv) {
          inv = await Inventory.create({
            product: item.product._id,
            warehouse: destinationWarehouse,
            quantityOnHand: qty,
          });
        } else {
          inv.quantityOnHand += qty;
          await inv.save();
        }

        item.doneQuantity = qty;

        // Log movement to StockLedger
        await StockLedger.create({
          referenceNumber: operation.referenceNumber,
          operationType: 'receipt',
          operationId: operation._id,
          product: item.product._id,
          productSku: item.productSku || item.product.sku,
          productName: item.productName || item.product.name,
          toWarehouse: destinationWarehouse,
          quantityChange: qty,
          unitOfMeasure: item.unitOfMeasure,
          balanceAfter: inv.quantityOnHand,
          notes: `Receipt validated from supplier ${operation.partnerName || 'N/A'}`,
          performedBy: req.user?._id || null,
        });
      }
    }

    // 2. DELIVERY: Decrease stock from sourceWarehouse
    else if (type === 'delivery') {
      if (!sourceWarehouse) {
        return res.status(400).json({ message: 'Source warehouse is required for validating Delivery orders.' });
      }

      // Check stock availability first
      for (const item of items) {
        const inv = await Inventory.findOne({
          product: item.product._id,
          warehouse: sourceWarehouse,
        });
        const currentStock = inv ? inv.quantityOnHand : 0;
        if (currentStock < item.demandedQuantity) {
          return res.status(400).json({
            message: `Insufficient stock for "${item.productName || item.product.name}". Available: ${currentStock}, Required: ${item.demandedQuantity}`,
          });
        }
      }

      // Deduct stock and write to ledger
      for (const item of items) {
        const qty = item.demandedQuantity;
        const inv = await Inventory.findOne({
          product: item.product._id,
          warehouse: sourceWarehouse,
        });

        inv.quantityOnHand -= qty;
        await inv.save();

        item.doneQuantity = qty;

        await StockLedger.create({
          referenceNumber: operation.referenceNumber,
          operationType: 'delivery',
          operationId: operation._id,
          product: item.product._id,
          productSku: item.productSku || item.product.sku,
          productName: item.productName || item.product.name,
          fromWarehouse: sourceWarehouse,
          quantityChange: -qty,
          unitOfMeasure: item.unitOfMeasure,
          balanceAfter: inv.quantityOnHand,
          notes: `Delivery order shipped to ${operation.partnerName || 'Customer'}`,
          performedBy: req.user?._id || null,
        });
      }
    }

    // 3. INTERNAL TRANSFER: Move stock from source to destination
    else if (type === 'transfer') {
      if (!sourceWarehouse || !destinationWarehouse) {
        return res.status(400).json({
          message: 'Both source and destination warehouses are required for internal transfers.',
        });
      }

      if (sourceWarehouse.toString() === destinationWarehouse.toString()) {
        return res.status(400).json({
          message: 'Source and destination warehouses cannot be the same.',
        });
      }

      // Check source stock
      for (const item of items) {
        const sourceInv = await Inventory.findOne({
          product: item.product._id,
          warehouse: sourceWarehouse,
        });
        const currentStock = sourceInv ? sourceInv.quantityOnHand : 0;
        if (currentStock < item.demandedQuantity) {
          return res.status(400).json({
            message: `Insufficient stock in source location for "${item.productName || item.product.name}". Available: ${currentStock}, Required: ${item.demandedQuantity}`,
          });
        }
      }

      // Execute transfer
      for (const item of items) {
        const qty = item.demandedQuantity;

        // Decrease from source
        const sourceInv = await Inventory.findOne({
          product: item.product._id,
          warehouse: sourceWarehouse,
        });
        sourceInv.quantityOnHand -= qty;
        await sourceInv.save();

        // Increase in destination
        let destInv = await Inventory.findOne({
          product: item.product._id,
          warehouse: destinationWarehouse,
        });
        if (!destInv) {
          destInv = await Inventory.create({
            product: item.product._id,
            warehouse: destinationWarehouse,
            quantityOnHand: qty,
          });
        } else {
          destInv.quantityOnHand += qty;
          await destInv.save();
        }

        item.doneQuantity = qty;

        // Log transfer in central ledger
        await StockLedger.create({
          referenceNumber: operation.referenceNumber,
          operationType: 'transfer',
          operationId: operation._id,
          product: item.product._id,
          productSku: item.productSku || item.product.sku,
          productName: item.productName || item.product.name,
          fromWarehouse: sourceWarehouse,
          toWarehouse: destinationWarehouse,
          quantityChange: qty, // moved quantity
          unitOfMeasure: item.unitOfMeasure,
          balanceAfter: destInv.quantityOnHand,
          notes: 'Internal stock relocation',
          performedBy: req.user?._id || null,
        });
      }
    }

    // 4. STOCK ADJUSTMENT: Reconcile physical count vs system count
    else if (type === 'adjustment') {
      if (!sourceWarehouse) {
        return res.status(400).json({ message: 'Warehouse location is required for Stock Adjustment.' });
      }

      for (const item of items) {
        const physical = Number(item.physicalCount ?? item.demandedQuantity ?? 0);
        let inv = await Inventory.findOne({
          product: item.product._id,
          warehouse: sourceWarehouse,
        });

        const systemBefore = inv ? inv.quantityOnHand : 0;
        const delta = physical - systemBefore;

        if (!inv) {
          inv = await Inventory.create({
            product: item.product._id,
            warehouse: sourceWarehouse,
            quantityOnHand: physical,
          });
        } else {
          inv.quantityOnHand = physical;
          await inv.save();
        }

        item.systemCount = systemBefore;
        item.physicalCount = physical;
        item.difference = delta;
        item.doneQuantity = physical;

        // Log to StockLedger
        await StockLedger.create({
          referenceNumber: operation.referenceNumber,
          operationType: 'adjustment',
          operationId: operation._id,
          product: item.product._id,
          productSku: item.productSku || item.product.sku,
          productName: item.productName || item.product.name,
          fromWarehouse: delta < 0 ? sourceWarehouse : null,
          toWarehouse: delta > 0 ? sourceWarehouse : null,
          quantityChange: delta, // positive or negative adjustment delta
          unitOfMeasure: item.unitOfMeasure,
          balanceAfter: physical,
          notes: `Inventory adjustment. Counted: ${physical}, Previous: ${systemBefore} (Delta: ${delta > 0 ? '+' : ''}${delta})`,
          performedBy: req.user?._id || null,
        });
      }
    }

    operation.status = 'Done';
    operation.validatedAt = new Date();
    operation.validatedBy = req.user?._id || null;
    await operation.save();

    const result = await Operation.findById(operation._id)
      .populate('sourceWarehouse', 'name code')
      .populate('destinationWarehouse', 'name code')
      .populate('validatedBy', 'name');

    res.json({
      success: true,
      message: `${operation.type.toUpperCase()} validated successfully and stock updated.`,
      data: result,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel operation
// @route   POST /api/operations/:id/cancel
export const cancelOperation = async (req, res) => {
  try {
    const operation = await Operation.findById(req.params.id);
    if (!operation) {
      return res.status(404).json({ message: 'Operation not found' });
    }

    if (operation.status === 'Done') {
      return res.status(400).json({
        message: 'Cannot cancel an operation that has already been validated. Use Stock Adjustment instead.',
      });
    }

    operation.status = 'Canceled';
    await operation.save();

    res.json({ success: true, message: 'Operation canceled', data: operation });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
