import express from 'express';
import { Product } from '../models/Product.js';
import { Inventory } from '../models/Inventory.js';
import { StockLedger } from '../models/StockLedger.js';
import { Operation } from '../models/Operation.js';
import { Warehouse } from '../models/Warehouse.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

// @desc    Get predictive reorder analytics with burn rate and stockout forecasting
// @route   GET /api/analytics/predictive-reorder
router.get('/predictive-reorder', async (req, res) => {
  try {
    const demandMultiplier = parseFloat(req.query.demandMultiplier) || 1.0;
    const leadTimeDays = parseInt(req.query.leadTimeDays) || 7; // supplier lead time in days

    const products = await Product.find({ isActive: true });
    const inventories = await Inventory.find().populate('warehouse', 'name code');

    // Aggregate inventory by product
    const stockMap = {};
    inventories.forEach((inv) => {
      const pid = inv.product.toString();
      stockMap[pid] = (stockMap[pid] || 0) + inv.quantityOnHand;
    });

    // Calculate outbound consumption over the last 30 days from StockLedger
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const outboundMoves = await StockLedger.aggregate([
      {
        $match: {
          operationType: 'delivery',
          createdAt: { $gte: thirtyDaysAgo },
        },
      },
      {
        $group: {
          _id: '$product',
          totalOutbound: { $sum: { $abs: '$quantityChange' } },
        },
      },
    ]);

    const burnRateMap = {};
    outboundMoves.forEach((m) => {
      // average daily burn rate
      burnRateMap[m._id.toString()] = m.totalOutbound / 30;
    });

    const predictions = products.map((prod) => {
      const currentStock = stockMap[prod._id.toString()] || 0;
      // Default to minimum baseline burn rate if new item
      const baseDailyBurn = burnRateMap[prod._id.toString()] || (prod.reorderThreshold / 15);
      const adjustedDailyBurn = parseFloat((baseDailyBurn * demandMultiplier).toFixed(2));

      // Days of inventory remaining
      const daysRemaining = adjustedDailyBurn > 0 ? Math.floor(currentStock / adjustedDailyBurn) : 999;

      // Predictive Reorder Point (Lead Time Demand + Safety Stock)
      // Safety Stock is modeled as 3 days of buffer
      const safetyStock = Math.ceil(adjustedDailyBurn * 3);
      const leadTimeDemand = Math.ceil(adjustedDailyBurn * leadTimeDays);
      const dynamicROP = Math.max(prod.reorderThreshold, leadTimeDemand + safetyStock);

      const needsReorder = currentStock <= dynamicROP;

      // Recommended order quantity to reach optimal level (e.g. 30 days of supply)
      const targetStockLevel = Math.ceil(adjustedDailyBurn * 30);
      const suggestedOrderQty = needsReorder ? Math.max(0, targetStockLevel - currentStock) : 0;

      // Urgency level
      let urgency = 'Normal';
      if (currentStock === 0) urgency = 'Critical (Out of Stock)';
      else if (daysRemaining <= 3) urgency = 'Critical (≤ 3 Days)';
      else if (needsReorder) urgency = 'Warning (Reorder Soon)';

      return {
        productId: prod._id,
        name: prod.name,
        sku: prod.sku,
        category: prod.category,
        unitOfMeasure: prod.unitOfMeasure,
        costPrice: prod.costPrice || 0,
        currentStock,
        dailyBurnRate: adjustedDailyBurn,
        daysRemaining,
        staticThreshold: prod.reorderThreshold,
        dynamicROP,
        suggestedOrderQty,
        needsReorder,
        urgency,
        estimatedCost: suggestedOrderQty * (prod.costPrice || 0),
      };
    });

    // Sort by urgency: items needing reorder first, lowest days remaining first
    predictions.sort((a, b) => a.daysRemaining - b.daysRemaining);

    res.json({
      success: true,
      demandMultiplier,
      leadTimeDays,
      totalItemsAtRisk: predictions.filter((p) => p.needsReorder).length,
      data: predictions,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    1-Click Auto-Generate Draft Purchase Order (Receipt) from ROP Engine
// @route   POST /api/analytics/auto-generate-po
router.post('/auto-generate-po', async (req, res) => {
  try {
    const { items, supplierName, targetWarehouseId } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: 'No items selected for Purchase Order generation.' });
    }

    // Default to first active warehouse if not specified
    let targetWh = targetWarehouseId;
    if (!targetWh) {
      const wh = await Warehouse.findOne({ isActive: true });
      targetWh = wh?._id;
    }

    // Build enriched lines
    const lineItems = [];
    for (const it of items) {
      const prod = await Product.findById(it.productId);
      if (prod && it.quantity > 0) {
        lineItems.push({
          product: prod._id,
          productName: prod.name,
          productSku: prod.sku,
          unitOfMeasure: prod.unitOfMeasure,
          demandedQuantity: Number(it.quantity),
          doneQuantity: 0,
        });
      }
    }

    if (lineItems.length === 0) {
      return res.status(400).json({ message: 'Valid replenishment quantities greater than 0 are required.' });
    }

    const count = await Operation.countDocuments({ type: 'receipt' });
    const sequence = String(count + 1).padStart(4, '0');
    const referenceNumber = `REC-${new Date().getFullYear()}-${sequence}`;

    const receipt = await Operation.create({
      referenceNumber,
      type: 'receipt',
      status: 'Ready',
      partnerName: supplierName || 'Automated ROP Replenishment Supplier',
      destinationWarehouse: targetWh,
      items: lineItems,
      notes: `⚡ Auto-generated via Predictive ROP Engine on ${new Date().toLocaleDateString()}`,
      scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // ETA in 2 days
      createdBy: req.user?._id || null,
    });

    const populated = await Operation.findById(receipt._id).populate('destinationWarehouse', 'name code');

    res.status(201).json({
      success: true,
      message: `Purchase Order ${referenceNumber} generated with ${lineItems.length} replenishment item(s).`,
      data: populated,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Get Financial Shrinkage & Loss Report (in INR / Currency)
// @route   GET /api/analytics/shrinkage
router.get('/shrinkage', async (req, res) => {
  try {
    // Find all adjustment operations or ledger entries where quantityChange < 0
    const shrinkageLedgers = await StockLedger.find({
      operationType: 'adjustment',
      quantityChange: { $lt: 0 },
    })
      .populate('product', 'name sku category costPrice unitOfMeasure')
      .populate('fromWarehouse', 'name code')
      .sort({ createdAt: -1 });

    let totalShrinkageValue = 0;
    let totalDamagedUnits = 0;

    const breakdown = shrinkageLedgers.map((record) => {
      const unitsLost = Math.abs(record.quantityChange);
      const unitCost = record.product?.costPrice || 0;
      const totalLostCost = unitsLost * unitCost;

      totalDamagedUnits += unitsLost;
      totalShrinkageValue += totalLostCost;

      return {
        _id: record._id,
        referenceNumber: record.referenceNumber,
        productName: record.productName,
        productSku: record.productSku,
        category: record.product?.category || 'General',
        unitsLost,
        unitCost,
        totalLostCost,
        unitOfMeasure: record.unitOfMeasure,
        warehouse: record.fromWarehouse?.name || 'Warehouse',
        warehouseCode: record.fromWarehouse?.code || 'WH',
        notes: record.notes,
        date: record.createdAt,
      };
    });

    res.json({
      success: true,
      totalShrinkageValue: parseFloat(totalShrinkageValue.toFixed(2)),
      totalDamagedUnits,
      incidentCount: shrinkageLedgers.length,
      incidents: breakdown,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// @desc    Get comprehensive Reports & Analytics summary data
// @route   GET /api/analytics/reports/summary
router.get('/reports/summary', async (req, res) => {
  try {
    const products = await Product.find({ isActive: true });
    const inventories = await Inventory.find().populate('warehouse', 'name code');
    const warehouses = await Warehouse.find({ isActive: true });

    // 1. Inventory Value by Warehouse
    const warehouseValues = {};
    warehouses.forEach((w) => {
      warehouseValues[w._id.toString()] = {
        name: w.name,
        code: w.code,
        totalValue: 0,
        totalUnits: 0,
      };
    });

    let grandTotalValue = 0;
    let grandTotalUnits = 0;

    // 2. Inventory Value by Category
    const categoryValues = {};

    inventories.forEach((inv) => {
      const prod = products.find((p) => p._id.toString() === inv.product.toString());
      if (prod) {
        const itemVal = inv.quantityOnHand * (prod.costPrice || 0);
        grandTotalValue += itemVal;
        grandTotalUnits += inv.quantityOnHand;

        // Warehouse bucket
        const whId = inv.warehouse?._id?.toString() || inv.warehouse?.toString();
        if (warehouseValues[whId]) {
          warehouseValues[whId].totalValue += itemVal;
          warehouseValues[whId].totalUnits += inv.quantityOnHand;
        }

        // Category bucket
        const cat = prod.category || 'General';
        if (!categoryValues[cat]) {
          categoryValues[cat] = { category: cat, totalValue: 0, totalUnits: 0, skuCount: 0 };
        }
        categoryValues[cat].totalValue += itemVal;
        categoryValues[cat].totalUnits += inv.quantityOnHand;
      }
    });

    // Count SKUs per category
    products.forEach((p) => {
      const cat = p.category || 'General';
      if (categoryValues[cat]) categoryValues[cat].skuCount++;
    });

    // 3. Top-Moving Products (by outbound delivery volume)
    const topMoversAgg = await StockLedger.aggregate([
      { $match: { operationType: 'delivery' } },
      {
        $group: {
          _id: '$product',
          productName: { $first: '$productName' },
          productSku: { $first: '$productSku' },
          totalDispatched: { $sum: { $abs: '$quantityChange' } },
          dispatchCount: { $sum: 1 },
        },
      },
      { $sort: { totalDispatched: -1 } },
      { $limit: 5 },
    ]);

    // 4. Movement Breakdown by Type
    const movementCounts = await StockLedger.aggregate([
      {
        $group: {
          _id: '$operationType',
          count: { $sum: 1 },
          totalVolume: { $sum: { $abs: '$quantityChange' } },
        },
      },
    ]);

    const moveMap = { receipt: 0, delivery: 0, transfer: 0, adjustment: 0 };
    movementCounts.forEach((m) => {
      if (moveMap[m._id] !== undefined) moveMap[m._id] = m.count;
    });

    res.json({
      success: true,
      grandTotalValue: parseFloat(grandTotalValue.toFixed(2)),
      grandTotalUnits,
      warehouses: Object.values(warehouseValues),
      categories: Object.values(categoryValues),
      topMovers: topMoversAgg,
      movementBreakdown: moveMap,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
