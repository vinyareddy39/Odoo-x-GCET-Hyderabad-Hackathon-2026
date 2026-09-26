import { Product } from '../models/Product.js';
import { Inventory } from '../models/Inventory.js';
import { Warehouse } from '../models/Warehouse.js';
import { StockLedger } from '../models/StockLedger.js';

// @desc    Get all products with aggregated & per-warehouse stock
// @route   GET /api/products
export const getProducts = async (req, res) => {
  try {
    const { search, category, lowStockOnly, warehouseId } = req.query;

    let filter = { isActive: true };

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { sku: { $regex: search, $options: 'i' } },
        { category: { $regex: search, $options: 'i' } },
      ];
    }

    if (category && category !== 'All') {
      filter.category = category;
    }

    const products = await Product.find(filter).sort({ name: 1 });

    // Fetch all inventory records
    const inventoryQuery = {};
    if (warehouseId && warehouseId !== 'All') {
      inventoryQuery.warehouse = warehouseId;
    }
    const inventories = await Inventory.find(inventoryQuery).populate('warehouse', 'name code');

    // Group inventory by product
    const inventoryMap = {};
    inventories.forEach((inv) => {
      const pId = inv.product.toString();
      if (!inventoryMap[pId]) {
        inventoryMap[pId] = [];
      }
      inventoryMap[pId].push({
        warehouseId: inv.warehouse?._id,
        warehouseName: inv.warehouse?.name || 'Unknown',
        warehouseCode: inv.warehouse?.code || 'N/A',
        quantityOnHand: inv.quantityOnHand,
        locationZone: inv.locationZone,
      });
    });

    let results = products.map((prod) => {
      const stockLocations = inventoryMap[prod._id.toString()] || [];
      const totalStock = stockLocations.reduce((sum, item) => sum + item.quantityOnHand, 0);
      const isLowStock = totalStock <= prod.reorderThreshold;

      return {
        ...prod.toObject(),
        totalStock,
        isLowStock,
        stockLocations,
      };
    });

    if (lowStockOnly === 'true') {
      results = results.filter((p) => p.isLowStock);
    }

    res.json({
      success: true,
      count: results.length,
      data: results,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get low stock products
// @route   GET /api/products/low-stock
export const getLowStockProducts = async (req, res) => {
  try {
    const products = await Product.find({ isActive: true });
    const inventories = await Inventory.find().populate('warehouse', 'name code');

    const inventoryMap = {};
    inventories.forEach((inv) => {
      const pId = inv.product.toString();
      inventoryMap[pId] = (inventoryMap[pId] || 0) + inv.quantityOnHand;
    });

    const lowStock = products
      .map((p) => {
        const total = inventoryMap[p._id.toString()] || 0;
        return {
          ...p.toObject(),
          totalStock: total,
          isLowStock: total <= p.reorderThreshold,
        };
      })
      .filter((p) => p.isLowStock);

    res.json({ success: true, count: lowStock.length, data: lowStock });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single product by ID
// @route   GET /api/products/:id
export const getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const inventories = await Inventory.find({ product: product._id }).populate('warehouse', 'name code address');
    const totalStock = inventories.reduce((sum, inv) => sum + inv.quantityOnHand, 0);

    res.json({
      success: true,
      data: {
        ...product.toObject(),
        totalStock,
        isLowStock: totalStock <= product.reorderThreshold,
        stockLocations: inventories,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create product
// @route   POST /api/products
export const createProduct = async (req, res) => {
  try {
    const {
      name,
      sku,
      category,
      unitOfMeasure,
      initialStock,
      warehouseId,
      reorderThreshold,
      costPrice,
      sellingPrice,
      description,
    } = req.body;

    const existingSku = await Product.findOne({ sku: sku.toUpperCase() });
    if (existingSku) {
      return res.status(400).json({ message: `A product with SKU "${sku}" already exists.` });
    }

    const product = await Product.create({
      name,
      sku: sku.toUpperCase(),
      category: category || 'General',
      unitOfMeasure: unitOfMeasure || 'units',
      reorderThreshold: Number(reorderThreshold) || 10,
      costPrice: Number(costPrice) || 0,
      sellingPrice: Number(sellingPrice) || 0,
      description: description || '',
    });

    const initStockNum = Number(initialStock) || 0;

    // If initial stock provided, assign to specified or default warehouse
    if (initStockNum > 0) {
      let targetWarehouse;
      if (warehouseId) {
        targetWarehouse = await Warehouse.findById(warehouseId);
      }
      if (!targetWarehouse) {
        targetWarehouse = await Warehouse.findOne({ isActive: true });
      }

      if (targetWarehouse) {
        await Inventory.create({
          product: product._id,
          warehouse: targetWarehouse._id,
          quantityOnHand: initStockNum,
        });

        // Record initial inventory in StockLedger
        await StockLedger.create({
          referenceNumber: `INIT-${product.sku}`,
          operationType: 'receipt',
          product: product._id,
          productSku: product.sku,
          productName: product.name,
          toWarehouse: targetWarehouse._id,
          quantityChange: initStockNum,
          unitOfMeasure: product.unitOfMeasure,
          balanceAfter: initStockNum,
          notes: 'Initial stock on product creation',
          performedBy: req.user?._id,
        });
      }
    }

    res.status(201).json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
export const updateProduct = async (req, res) => {
  try {
    if (req.body.sku) {
      req.body.sku = req.body.sku.toUpperCase();
      const existing = await Product.findOne({
        sku: req.body.sku,
        _id: { $ne: req.params.id },
      });
      if (existing) {
        return res.status(400).json({ message: `SKU "${req.body.sku}" is already in use by another product.` });
      }
    }

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({ success: true, data: product });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
export const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const totalStock = await Inventory.aggregate([
      { $match: { product: product._id } },
      { $group: { _id: null, total: { $sum: '$quantityOnHand' } } },
    ]);

    if (totalStock.length > 0 && totalStock[0].total > 0) {
      return res.status(400).json({
        message: `Cannot delete product with existing stock (${totalStock[0].total} units). Please perform a stock adjustment first.`,
      });
    }

    await Inventory.deleteMany({ product: product._id });
    await product.deleteOne();

    res.json({ success: true, message: 'Product removed successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
