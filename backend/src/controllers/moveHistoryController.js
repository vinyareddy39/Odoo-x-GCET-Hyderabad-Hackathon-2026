import { StockLedger } from '../models/StockLedger.js';

// @desc    Get chronological ledger of all stock movements
// @route   GET /api/move-history
export const getMoveHistory = async (req, res) => {
  try {
    const { operationType, warehouseId, productId, search, startDate, endDate } = req.query;

    let query = {};

    if (operationType && operationType !== 'All') {
      query.operationType = operationType;
    }

    if (productId && productId !== 'All') {
      query.product = productId;
    }

    if (warehouseId && warehouseId !== 'All') {
      query.$or = [{ fromWarehouse: warehouseId }, { toWarehouse: warehouseId }];
    }

    if (search) {
      query.$or = [
        { referenceNumber: { $regex: search, $options: 'i' } },
        { productSku: { $regex: search, $options: 'i' } },
        { productName: { $regex: search, $options: 'i' } },
        { notes: { $regex: search, $options: 'i' } },
      ];
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const moves = await StockLedger.find(query)
      .populate('fromWarehouse', 'name code')
      .populate('toWarehouse', 'name code')
      .populate('performedBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(200);

    res.json({
      success: true,
      count: moves.length,
      data: moves,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
