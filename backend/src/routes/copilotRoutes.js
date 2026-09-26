import express from 'express';
import { Product } from '../models/Product.js';
import { Inventory } from '../models/Inventory.js';
import { Operation } from '../models/Operation.js';
import { StockLedger } from '../models/StockLedger.js';
import { Warehouse } from '../models/Warehouse.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();
router.use(protect);

// @desc    AI Inventory Copilot Engine answering natural language questions
// @route   POST /api/copilot/ask
router.post('/ask', async (req, res) => {
  try {
    const { question } = req.body;
    if (!question || !question.trim()) {
      return res.status(400).json({ message: 'Please provide a question.' });
    }

    const q = question.toLowerCase();

    // Fetch live system state
    const [products, inventories, warehouses, pendingOps, shrinkageMoves] = await Promise.all([
      Product.find({ isActive: true }),
      Inventory.find().populate('warehouse', 'name code'),
      Warehouse.find({ isActive: true }),
      Operation.find({ status: { $in: ['Draft', 'Waiting', 'Ready'] } }),
      StockLedger.find({ operationType: 'adjustment', quantityChange: { $lt: 0 } }).populate('product'),
    ]);

    const stockMap = {};
    inventories.forEach((inv) => {
      const pid = inv.product.toString();
      stockMap[pid] = (stockMap[pid] || 0) + inv.quantityOnHand;
    });

    let totalValuation = 0;
    const lowStockItems = [];
    const outOfStockItems = [];

    products.forEach((p) => {
      const current = stockMap[p._id.toString()] || 0;
      totalValuation += current * (p.costPrice || 0);

      if (current === 0) {
        outOfStockItems.push({ name: p.name, sku: p.sku, threshold: p.reorderThreshold });
      } else if (current <= p.reorderThreshold) {
        lowStockItems.push({ name: p.name, sku: p.sku, current, threshold: p.reorderThreshold });
      }
    });

    let totalShrinkageLoss = 0;
    shrinkageMoves.forEach((m) => {
      totalShrinkageLoss += Math.abs(m.quantityChange) * (m.product?.costPrice || 0);
    });

    // Intent routing & AI Response Generation
    let answer = '';
    let category = 'general';
    let suggestedActions = [];

    if (q.includes('reorder') || q.includes('buy') || q.includes('order') || q.includes('replenish')) {
      category = 'reorder';
      const itemsToOrder = [...outOfStockItems, ...lowStockItems];
      if (itemsToOrder.length === 0) {
        answer = `✅ **Great news!** All **${products.length} products** are comfortably above their minimum reorder thresholds. No emergency replenishment is required right now.`;
      } else {
        answer = `🚨 **Replenishment Recommendations:**\n\nThere are **${itemsToOrder.length} products** currently needing reorders:\n\n` +
          itemsToOrder.map((it) => `• **${it.name}** (\`${it.sku}\`): Current Stock: **${it.current || 0}**, Minimum Threshold: **${it.threshold}**`).join('\n') +
          `\n\n💡 **Action:** You can use our **Predictive ROP Engine** or click the button below to generate draft Purchase Orders automatically.`;
        suggestedActions = [
          { label: '⚡ Open 1-Click ROP Generator', action: 'open_rop' },
          { label: '📦 View Low Stock Products', action: 'view_low_stock' },
        ];
      }
    } else if (q.includes('low stock') || q.includes('out of stock') || q.includes('risk') || q.includes('depleted')) {
      category = 'stockout_risk';
      answer = `📊 **Stockout Risk Analysis:**\n\n` +
        `• **Out of Stock (${outOfStockItems.length} items):** ` +
        (outOfStockItems.length > 0 ? outOfStockItems.map((i) => `\`${i.sku}\` (${i.name})`).join(', ') : 'None! 🎉') + `\n` +
        `• **Low Stock Alert (${lowStockItems.length} items):** ` +
        (lowStockItems.length > 0 ? lowStockItems.map((i) => `\`${i.sku}\` (${i.current} remaining)`).join(', ') : 'All safe.') + `\n\n` +
        `Overall Stock Health: **${(((products.length - outOfStockItems.length - lowStockItems.length) / products.length) * 100).toFixed(0)}% optimal**.`;
      suggestedActions = [{ label: 'Filter Low Stock in Catalog', action: 'view_low_stock' }];
    } else if (q.includes('value') || q.includes('valuation') || q.includes('worth') || q.includes('cost') || q.includes('price')) {
      category = 'financial';
      answer = `💰 **Inventory Financial Valuation:**\n\n` +
        `• **Total Value on Hand:** **₹${totalValuation.toLocaleString('en-IN', { maximumFractionDigits: 2 })}**\n` +
        `• **Active Facilities:** ${warehouses.length} warehouses (${warehouses.map((w) => w.code).join(', ')})\n` +
        `• **Tracked SKUs:** ${products.length} distinct items\n` +
        `• **Cumulative Shrinkage Loss:** ₹${totalShrinkageLoss.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
      suggestedActions = [{ label: 'View Shrinkage Loss Report', action: 'open_shrinkage' }];
    } else if (q.includes('shrinkage') || q.includes('loss') || q.includes('damaged') || q.includes('discrepancy')) {
      category = 'shrinkage';
      answer = `📉 **Shrinkage & Damage Report:**\n\n` +
        `• Total Recorded Financial Loss: **₹${totalShrinkageLoss.toLocaleString('en-IN', { maximumFractionDigits: 2 })}**\n` +
        `• Recorded Discrepancy Incidents: **${shrinkageMoves.length} count reconciliation(s)**\n\n` +
        `Audit entries are maintained in the immutable central \`StockLedger\` with exact physical vs system delta calculations.`;
      suggestedActions = [{ label: 'View Stock Adjustments', action: 'view_adjustments' }];
    } else if (q.includes('warehouse') || q.includes('location') || q.includes('facility')) {
      category = 'warehouse';
      answer = `🏢 **Warehouse Facilities Overview:**\n\n` +
        warehouses.map((w) => `• **${w.name}** (\`${w.code}\`) — Type: *${w.type}*, Address: *${w.address}*`).join('\n') +
        `\n\nTotal internal facilities active: **${warehouses.length}**`;
      suggestedActions = [{ label: 'Manage Warehouses', action: 'view_warehouses' }];
    } else {
      // General overview summary
      category = 'summary';
      answer = `👋 **StockSense Executive Summary:**\n\n` +
        `• **Total SKUs:** ${products.length} items across ${warehouses.length} warehouses\n` +
        `• **Inventory Valuation:** ₹${totalValuation.toLocaleString('en-IN', { maximumFractionDigits: 2 })}\n` +
        `• **Items at Risk:** ${outOfStockItems.length + lowStockItems.length} product(s) needing reordering\n` +
        `• **Pending Operations:** ${pendingOps.length} documents awaiting warehouse execution\n` +
        `• **Shrinkage Recorded:** ₹${totalShrinkageLoss.toLocaleString('en-IN', { maximumFractionDigits: 2 })}\n\n` +
        `Ask me anything specific like *"What should I reorder this week?"* or *"Analyze shrinkage loss"*.`;
      suggestedActions = [
        { label: '⚡ Run Predictive Reorder', action: 'open_rop' },
        { label: '📊 View Dashboard KPIs', action: 'view_dashboard' },
      ];
    }

    res.json({
      success: true,
      question,
      answer,
      category,
      suggestedActions,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
