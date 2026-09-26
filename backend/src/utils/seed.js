import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { User } from '../models/User.js';
import { Warehouse } from '../models/Warehouse.js';
import { Product } from '../models/Product.js';
import { Inventory } from '../models/Inventory.js';
import { StockLedger } from '../models/StockLedger.js';
import { Operation } from '../models/Operation.js';

dotenv.config();

const seedDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/stocksense');
    console.log('🌱 Connected to MongoDB for seeding...');

    // Clear existing data
    await Promise.all([
      User.deleteMany({}),
      Warehouse.deleteMany({}),
      Product.deleteMany({}),
      Inventory.deleteMany({}),
      StockLedger.deleteMany({}),
      Operation.deleteMany({}),
    ]);
    console.log('🧹 Cleared existing database collections.');

    // 1. Create Users
    const adminUser = await User.create({
      name: 'Vidya Reddy',
      email: 'admin@stocksense.com',
      password: 'Password123!',
      role: 'admin',
    });

    const operatorUser = await User.create({
      name: 'Alex Warehouse Lead',
      email: 'operator@stocksense.com',
      password: 'Password123!',
      role: 'operator',
    });

    console.log('👤 Created demo users:');
    console.log('   Admin: admin@stocksense.com / Password123!');
    console.log('   Operator: operator@stocksense.com / Password123!');

    // 2. Create Warehouses
    const whMain = await Warehouse.create({
      name: 'Main Central Warehouse',
      code: 'WH-MAIN',
      type: 'internal',
      address: '742 Evergreen Terrace, Sector 4',
      zones: [
        { name: 'Zone A - Heavy Storage', code: 'ZN-A' },
        { name: 'Zone B - Electronics Rack', code: 'ZN-B' },
      ],
    });

    const whProd = await Warehouse.create({
      name: 'Production & Assembly Floor',
      code: 'WH-PROD',
      type: 'production',
      address: 'Building 3, Manufacturing Unit',
      zones: [{ name: 'Assembly Bay 1', code: 'BAY-1' }],
    });

    const whNorth = await Warehouse.create({
      name: 'North Logistics Hub',
      code: 'WH-NORTH',
      type: 'internal',
      address: '100 North Beltway, Distribution Wing',
      zones: [{ name: 'Dock 4 Storage', code: 'DK-4' }],
    });

    console.log('🏢 Created 3 Warehouses: WH-MAIN, WH-PROD, WH-NORTH');

    // 3. Create Products
    const productsData = [
      {
        name: 'Industrial Steel Rods 2m',
        sku: 'RAW-STL-001',
        category: 'Raw Materials',
        unitOfMeasure: 'units',
        reorderThreshold: 30,
        costPrice: 45.0,
        sellingPrice: 75.0,
        description: 'High-tensile carbon steel rods for construction & tooling',
      },
      {
        name: 'Ergonomic Mesh Chair Pro',
        sku: 'FUR-CHR-101',
        category: 'Furniture',
        unitOfMeasure: 'units',
        reorderThreshold: 15,
        costPrice: 120.0,
        sellingPrice: 249.99,
        description: 'Lumbar support breathable swivel office chair',
      },
      {
        name: 'Dual Monitor Aluminum Arm',
        sku: 'OFF-MON-202',
        category: 'Accessories',
        unitOfMeasure: 'units',
        reorderThreshold: 20,
        costPrice: 35.0,
        sellingPrice: 89.99,
        description: 'Desk mount dual arm gas spring display holder',
      },
      {
        name: 'Lithium Iron Battery 48V',
        sku: 'ELC-BAT-303',
        category: 'Electronics',
        unitOfMeasure: 'units',
        reorderThreshold: 10,
        costPrice: 310.0,
        sellingPrice: 550.0,
        description: 'Rechargeable LiFePO4 battery pack for power backup',
      },
      {
        name: 'Pure Copper Wire Spool 100m',
        sku: 'RAW-CPR-004',
        category: 'Raw Materials',
        unitOfMeasure: 'meters',
        reorderThreshold: 100,
        costPrice: 65.0,
        sellingPrice: 110.0,
        description: 'High conductivity copper cabling for electrical projects',
      },
      {
        name: 'Mechanical Tactile Keyboard',
        sku: 'ELC-KBD-505',
        category: 'Electronics',
        unitOfMeasure: 'units',
        reorderThreshold: 25,
        costPrice: 42.0,
        sellingPrice: 95.0,
        description: 'Backlit mechanical keyboard with hot-swappable switches',
      },
      {
        name: 'Heavy-Duty Corrugated Boxes (Pack of 50)',
        sku: 'PKG-BOX-606',
        category: 'Packaging',
        unitOfMeasure: 'packs',
        reorderThreshold: 20,
        costPrice: 15.0,
        sellingPrice: 32.0,
        description: 'Double-walled shipping cartons - Low Stock Demo',
      },
      {
        name: 'Direct Thermal Shipping Labels (Roll 500)',
        sku: 'SUP-LBL-707',
        category: 'Supplies',
        unitOfMeasure: 'rolls',
        reorderThreshold: 15,
        costPrice: 6.5,
        sellingPrice: 14.99,
        description: 'High-adhesion barcode labels - Out of Stock Demo',
      },
    ];

    const products = await Product.create(productsData);
    console.log(`📦 Created ${products.length} Products`);

    // 4. Initial Inventory & Ledger
    // Steel Rods in WH-MAIN: 120, WH-PROD: 40
    // Chairs in WH-MAIN: 25
    // Monitor Arm in WH-MAIN: 45
    // Battery in WH-MAIN: 18, WH-NORTH: 6
    // Copper Wire in WH-MAIN: 250
    // Keyboards in WH-MAIN: 50
    // Corrugated Boxes in WH-MAIN: 8 (Low stock trigger! Threshold is 20)
    // Thermal Labels: 0 (Out of stock trigger!)

    const inventoryRecords = [
      { product: products[0]._id, warehouse: whMain._id, qty: 120 },
      { product: products[0]._id, warehouse: whProd._id, qty: 40 },
      { product: products[1]._id, warehouse: whMain._id, qty: 25 },
      { product: products[2]._id, warehouse: whMain._id, qty: 45 },
      { product: products[3]._id, warehouse: whMain._id, qty: 18 },
      { product: products[3]._id, warehouse: whNorth._id, qty: 6 },
      { product: products[4]._id, warehouse: whMain._id, qty: 250 },
      { product: products[5]._id, warehouse: whMain._id, qty: 50 },
      { product: products[6]._id, warehouse: whMain._id, qty: 8 }, // Low stock!
      { product: products[7]._id, warehouse: whMain._id, qty: 0 }, // Out of stock!
    ];

    for (const inv of inventoryRecords) {
      await Inventory.create({
        product: inv.product,
        warehouse: inv.warehouse,
        quantityOnHand: inv.qty,
      });

      if (inv.qty > 0) {
        const prod = products.find((p) => p._id.toString() === inv.product.toString());
        await StockLedger.create({
          referenceNumber: `INIT-${prod.sku}`,
          operationType: 'receipt',
          product: prod._id,
          productSku: prod.sku,
          productName: prod.name,
          toWarehouse: inv.warehouse,
          quantityChange: inv.qty,
          unitOfMeasure: prod.unitOfMeasure,
          balanceAfter: inv.qty,
          notes: 'Initial stock intake',
          performedBy: adminUser._id,
        });
      }
    }
    console.log('📊 Stock levels & initial ledger entries seeded');

    // 5. Seed Operations (Receipts, Deliveries, Transfers, Adjustments)
    // 5a. Pending Receipt (Ready to Validate)
    await Operation.create({
      referenceNumber: 'REC-2026-0001',
      type: 'receipt',
      status: 'Ready',
      partnerName: 'Apex Steel & Industrial Supplies',
      destinationWarehouse: whMain._id,
      items: [
        {
          product: products[0]._id,
          productName: products[0].name,
          productSku: products[0].sku,
          unitOfMeasure: products[0].unitOfMeasure,
          demandedQuantity: 50,
          doneQuantity: 0,
        },
      ],
      notes: 'Scheduled container shipment arrival',
      scheduledDate: new Date(),
      createdBy: adminUser._id,
    });

    // 5b. Pending Delivery Order (Waiting / Ready to Pick & Pack)
    await Operation.create({
      referenceNumber: 'DEL-2026-0001',
      type: 'delivery',
      status: 'Ready',
      partnerName: 'Nexus Tech Enterprises',
      sourceWarehouse: whMain._id,
      items: [
        {
          product: products[1]._id,
          productName: products[1].name,
          productSku: products[1].sku,
          unitOfMeasure: products[1].unitOfMeasure,
          demandedQuantity: 10,
          doneQuantity: 0,
        },
        {
          product: products[2]._id,
          productName: products[2].name,
          productSku: products[2].sku,
          unitOfMeasure: products[2].unitOfMeasure,
          demandedQuantity: 5,
          doneQuantity: 0,
        },
      ],
      notes: 'Customer order SO-9842 - standard road freight',
      scheduledDate: new Date(),
      createdBy: adminUser._id,
    });

    // 5c. Scheduled Internal Transfer
    await Operation.create({
      referenceNumber: 'TRF-2026-0001',
      type: 'transfer',
      status: 'Waiting',
      sourceWarehouse: whMain._id,
      destinationWarehouse: whProd._id,
      items: [
        {
          product: products[4]._id,
          productName: products[4].name,
          productSku: products[4].sku,
          unitOfMeasure: products[4].unitOfMeasure,
          demandedQuantity: 50,
          doneQuantity: 0,
        },
      ],
      notes: 'Transfer raw copper spools to manufacturing line',
      scheduledDate: new Date(Date.now() + 24 * 60 * 60 * 1000),
      createdBy: adminUser._id,
    });

    // 5d. Draft Stock Adjustment
    await Operation.create({
      referenceNumber: 'ADJ-2026-0001',
      type: 'adjustment',
      status: 'Draft',
      sourceWarehouse: whMain._id,
      items: [
        {
          product: products[6]._id,
          productName: products[6].name,
          productSku: products[6].sku,
          unitOfMeasure: products[6].unitOfMeasure,
          systemCount: 8,
          physicalCount: 12,
          difference: 4,
          demandedQuantity: 12,
        },
      ],
      notes: 'Quarterly shelf audit recount',
      scheduledDate: new Date(),
      createdBy: adminUser._id,
    });

    console.log('✅ Created sample Operations (Receipt, Delivery, Transfer, Adjustment)');
    console.log('🎉 Database seeding completed successfully!\n');

    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err);
    process.exit(1);
  }
};

seedDatabase();
