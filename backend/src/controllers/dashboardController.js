import { Product } from '../models/Product.js';
import { Inventory } from '../models/Inventory.js';
import { Operation } from '../models/Operation.js';
import { Warehouse } from '../models/Warehouse.js';

// @desc    Get aggregated KPIs and filtered operations
// @route   GET /api/dashboard
export const getDashboardData = async (req, res) => {
  try {
    const { docType, status, warehouseId, category, search } = req.query;

    // 1. KPI Aggregations
    // Total products count
    const totalProductsCount = await Product.countDocuments({ isActive: true });

    // Total quantity in stock across all warehouses
    const totalStockAgg = await Inventory.aggregate([
      { $group: { _id: null, totalQty: { $sum: '$quantityOnHand' } } },
    ]);
    const totalStockQuantity = totalStockAgg.length > 0 ? totalStockAgg[0].totalQty : 0;

    // Low stock count calculation
    const products = await Product.find({ isActive: true });
    const inventories = await Inventory.find();

    const stockMap = {};
    inventories.forEach((inv) => {
      const pid = inv.product.toString();
      stockMap[pid] = (stockMap[pid] || 0) + inv.quantityOnHand;
    });

    let lowStockCount = 0;
    let outOfStockCount = 0;
    products.forEach((p) => {
      const current = stockMap[p._id.toString()] || 0;
      if (current === 0) {
        outOfStockCount++;
        lowStockCount++;
      } else if (current <= p.reorderThreshold) {
        lowStockCount++;
      }
    });

    // Pending counts (Draft, Waiting, Ready)
    const pendingStatuses = ['Draft', 'Waiting', 'Ready'];

    const pendingReceiptsCount = await Operation.countDocuments({
      type: 'receipt',
      status: { $in: pendingStatuses },
    });

    const pendingDeliveriesCount = await Operation.countDocuments({
      type: 'delivery',
      status: { $in: pendingStatuses },
    });

    const internalTransfersScheduledCount = await Operation.countDocuments({
      type: 'transfer',
      status: { $in: pendingStatuses },
    });

    // 2. Filtered Operations / Documents for Dashboard View
    let opQuery = {};

    if (docType && docType !== 'All') {
      opQuery.type = docType;
    }

    if (status && status !== 'All') {
      opQuery.status = status;
    }

    if (warehouseId && warehouseId !== 'All') {
      opQuery.$or = [{ sourceWarehouse: warehouseId }, { destinationWarehouse: warehouseId }];
    }

    if (search) {
      opQuery.$or = [
        { referenceNumber: { $regex: search, $options: 'i' } },
        { partnerName: { $regex: search, $options: 'i' } },
        { 'items.productName': { $regex: search, $options: 'i' } },
      ];
    }

    const operations = await Operation.find(opQuery)
      .populate('sourceWarehouse', 'name code')
      .populate('destinationWarehouse', 'name code')
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    // Filter by product category if provided
    let filteredOperations = operations;
    if (category && category !== 'All') {
      // Find product IDs matching category
      const catProducts = await Product.find({ category }).select('_id');
      const catProductIds = new Set(catProducts.map((p) => p._id.toString()));

      filteredOperations = operations.filter((op) =>
        op.items.some((item) => catProductIds.has(item.product?.toString()))
      );
    }

    res.json({
      success: true,
      kpis: {
        totalProductsCount,
        totalStockQuantity,
        lowStockCount,
        outOfStockCount,
        pendingReceiptsCount,
        pendingDeliveriesCount,
        internalTransfersScheduledCount,
      },
      documents: filteredOperations,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
