/**
 * QUICK REFERENCE: ROP & EOQ Implementation
 * =========================================
 * 
 * This file provides quick code examples for using the inventory calculations utility.
 */

import { 
  calculateInventoryMetrics, 
  calculateROP, 
  calculateEOQ,
  INVENTORY_CONFIG 
} from '../utils/inventoryCalculations';

// ============================================
// EXAMPLE 1: Basic ROP/EOQ Check in POS
// ============================================

/**
 * Check if a product needs restocking after a sale
 * @param {Object} productData - Product/variant data from Firestore
 * @param {number} variantIndex - Index of the variant to check
 * @returns {Object} Restocking metrics
 */
const checkProductRestocking = (productData, variantIndex) => {
  const variant = productData.variants?.[variantIndex];
  
  const metrics = calculateInventoryMetrics({
    currentQty: variant.quantity || 0,
    unitCost: variant.unitPrice || 0,
    leadTimeDays: productData.leadTime || 7,
    safetyStock: variant.safetyStock || 0,
    maximumStockLevel: variant.maximumStockLevel || 100,
    existingROP: variant.restockLevel, // Use pre-calculated if available
    existingEOQ: variant.eoq
  });
  
  console.log('📊 Inventory Status:', {
    product: productData.name,
    currentQty: metrics.currentQuantity,
    rop: metrics.restockLevel,
    needsRestock: metrics.needsRestock,
    priority: metrics.priority,
    suggestedOrder: metrics.suggestedOrderQuantity
  });
  
  return metrics;
};

// ============================================
// EXAMPLE 2: Manual ROP Calculation
// ============================================

/**
 * Calculate ROP manually for a new product
 */
const calculateProductROP = () => {
  const averageDailyDemand = 10; // units per day
  const leadTimeDays = 7; // 1 week delivery
  const safetyStock = 20; // buffer units
  
  const rop = calculateROP(averageDailyDemand, leadTimeDays, safetyStock);
  
  console.log(`Reorder Point: ${rop} units`);
  // Output: Reorder Point: 90 units
  
  return rop;
};

// ============================================
// EXAMPLE 3: Manual EOQ Calculation
// ============================================

/**
 * Calculate EOQ manually for a product
 */
const calculateProductEOQ = () => {
  const annualDemand = 3650; // 10 units/day × 365 days
  const orderingCost = 500; // ₱500 per order
  const unitCost = 100; // ₱100 per unit
  const holdingRate = 0.25; // 25% annual
  const annualHoldingCost = unitCost * holdingRate; // ₱25/unit/year
  
  const eoq = calculateEOQ(annualDemand, orderingCost, annualHoldingCost);
  
  console.log(`Economic Order Quantity: ${eoq} units`);
  // Output: Economic Order Quantity: 382 units
  
  return eoq;
};

// ============================================
// EXAMPLE 4: Complete Inventory Analysis
// ============================================

/**
 * Perform complete inventory analysis for a product
 */
const analyzeProductInventory = async (productId) => {
  // Fetch product from Firestore
  const productRef = doc(db, 'Products', productId);
  const productSnap = await getDoc(productRef);
  const productData = productSnap.data();
  
  // Get sales history (last 30 days)
  const salesHistory = await getSalesHistory(productId, 30);
  
  // Calculate comprehensive metrics
  const metrics = calculateInventoryMetrics({
    currentQty: productData.quantity,
    unitCost: productData.unitPrice,
    leadTimeDays: productData.leadTime || 7,
    safetyStock: productData.safetyStock || 0,
    maximumStockLevel: productData.maximumStockLevel || 100,
    salesHistory, // Include sales data for demand estimation
    orderingCost: INVENTORY_CONFIG.ORDERING_COST,
    holdingCostRate: INVENTORY_CONFIG.HOLDING_COST_RATE
  });
  
  // Display full analysis
  console.log('📈 Complete Inventory Analysis:', {
    product: productData.name,
    currentStock: metrics.currentQuantity,
    reorderPoint: metrics.restockLevel,
    economicOrderQty: metrics.eoq,
    suggestedOrder: metrics.suggestedOrderQuantity,
    priority: metrics.priority,
    status: metrics.statusMessage,
    demand: {
      daily: metrics.averageDailyDemand,
      annual: metrics.annualDemand,
      isEstimated: metrics.demandIsEstimated
    },
    costs: {
      unitCost: metrics.unitCost,
      dailyHolding: metrics.dailyHoldingCost,
      annualHolding: metrics.annualHoldingCost,
      ordering: metrics.orderingCost
    }
  });
  
  return metrics;
};

// ============================================
// EXAMPLE 5: Batch Process Multiple Products
// ============================================

/**
 * Check all products for restocking needs
 */
const checkAllProductsForRestocking = async () => {
  const productsRef = collection(db, 'Products');
  const snapshot = await getDocs(productsRef);
  
  const restockNeeded = [];
  
  for (const doc of snapshot.docs) {
    const product = doc.data();
    
    const metrics = calculateInventoryMetrics({
      currentQty: product.quantity,
      unitCost: product.unitPrice,
      leadTimeDays: product.leadTime || 7,
      safetyStock: product.safetyStock || 0,
      existingROP: product.restockLevel,
      existingEOQ: product.eoq
    });
    
    if (metrics.needsRestock) {
      restockNeeded.push({
        productId: doc.id,
        name: product.name,
        currentQty: metrics.currentQuantity,
        rop: metrics.restockLevel,
        suggestedOrder: metrics.suggestedOrderQuantity,
        priority: metrics.priority
      });
    }
  }
  
  // Sort by priority (critical first)
  const priorityOrder = { critical: 0, urgent: 1, high: 2, medium: 3, normal: 4 };
  restockNeeded.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  
  console.log(`🚨 ${restockNeeded.length} products need restocking:`, restockNeeded);
  
  return restockNeeded;
};

// ============================================
// EXAMPLE 6: Create Restock Request
// ============================================

/**
 * Generate a restocking request document
 */
const createRestockRequest = async (productData, metrics, currentUser) => {
  const requestId = `RSR-${Date.now()}`;
  
  const restockRequest = {
    requestId,
    productId: productData.id,
    productName: productData.name,
    
    // Stock levels
    currentQuantity: metrics.currentQuantity,
    restockLevel: metrics.restockLevel, // ROP
    eoq: metrics.eoq,
    suggestedOrderQuantity: metrics.suggestedOrderQuantity,
    
    // Priority
    priority: metrics.priority,
    statusMessage: metrics.statusMessage,
    
    // Demand metrics
    averageDailyDemand: metrics.averageDailyDemand,
    leadTimeDays: metrics.leadTimeDays,
    
    // Request metadata
    status: 'pending',
    createdBy: currentUser.uid,
    createdAt: serverTimestamp()
  };
  
  // Save to Firestore
  await addDoc(collection(db, 'RestockingRequests'), restockRequest);
  
  console.log(`✅ Restock request created: ${requestId}`);
  
  return restockRequest;
};

// ============================================
// EXAMPLE 7: Custom Holding Cost Configuration
// ============================================

/**
 * Calculate metrics with custom holding cost for specific categories
 */
const calculateWithCustomHoldingCost = (productData) => {
  // Category-specific holding cost rates
  const categoryRates = {
    'Cement': 0.20,
    'Paint': 0.30,
    'Electrical': 0.25,
    'default': 0.25
  };
  
  const holdingRate = categoryRates[productData.category] || categoryRates['default'];
  
  const metrics = calculateInventoryMetrics({
    currentQty: productData.quantity,
    unitCost: productData.unitPrice,
    leadTimeDays: productData.leadTime || 7,
    holdingCostRate: holdingRate, // Custom rate per category
    safetyStock: productData.safetyStock || 0
  });
  
  console.log(`Category: ${productData.category}, Holding Rate: ${holdingRate * 100}%`);
  
  return metrics;
};

// ============================================
// EXAMPLE 8: Integrate into POS Sale Flow
// ============================================

/**
 * Check and create restock request after POS sale
 */
const handlePostSaleRestocking = async (soldProduct, currentUser) => {
  // Fetch updated product data
  const productRef = doc(db, 'Products', soldProduct.productId);
  const productSnap = await getDoc(productRef);
  const productData = productSnap.data();
  
  // Calculate metrics
  const metrics = calculateInventoryMetrics({
    currentQty: productData.quantity,
    unitCost: productData.unitPrice,
    leadTimeDays: productData.leadTime || 7,
    safetyStock: productData.safetyStock || 0,
    existingROP: productData.restockLevel,
    existingEOQ: productData.eoq
  });
  
  // If restocking needed, create request
  if (metrics.needsRestock) {
    await createRestockRequest(productData, metrics, currentUser);
    
    // Send notification
    await sendRestockNotification(productData, metrics, currentUser);
    
    console.log(`🔔 Restock notification sent for ${productData.name}`);
  }
  
  return metrics;
};

// ============================================
// CONFIGURATION EXAMPLES
// ============================================

/**
 * Example: Update system configuration
 */
const updateInventoryConfig = () => {
  // To change holding cost method:
  // Edit: src/features/pos/utils/inventoryCalculations.js
  
  // Current defaults:
  console.log('Current Configuration:', {
    holdingCostMethod: INVENTORY_CONFIG.HOLDING_COST_METHOD,
    holdingCostRate: INVENTORY_CONFIG.HOLDING_COST_RATE,
    orderingCost: INVENTORY_CONFIG.ORDERING_COST,
    defaultDemand: INVENTORY_CONFIG.DEFAULT_DAILY_DEMAND,
    defaultLeadTime: INVENTORY_CONFIG.DEFAULT_LEAD_TIME,
    lowStockMultiplier: INVENTORY_CONFIG.LOW_STOCK_MULTIPLIER,
    minimumEOQ: INVENTORY_CONFIG.MINIMUM_EOQ
  });
  
  // To use category-specific rates, implement:
  // const holdingRate = getCategoryHoldingRate(product.category);
};

// ============================================
// DEBUGGING HELPERS
// ============================================

/**
 * Log detailed calculation breakdown for debugging
 */
const debugInventoryCalculation = (productData) => {
  const unitCost = productData.unitPrice;
  const leadTimeDays = productData.leadTime || 7;
  const safetyStock = productData.safetyStock || 0;
  const currentQty = productData.quantity;
  
  // Manual calculations for comparison
  const avgDemand = 10; // default
  const manualROP = (avgDemand * leadTimeDays) + safetyStock;
  
  const annualDemand = avgDemand * 365;
  const orderingCost = INVENTORY_CONFIG.ORDERING_COST;
  const holdingRate = INVENTORY_CONFIG.HOLDING_COST_RATE;
  const annualHoldingCost = unitCost * holdingRate;
  const manualEOQ = Math.sqrt((2 * annualDemand * orderingCost) / annualHoldingCost);
  
  console.log('🔍 Debug Calculation Breakdown:');
  console.log('Inputs:', {
    currentQty,
    unitCost,
    leadTimeDays,
    safetyStock,
    avgDemand
  });
  console.log('Manual ROP:', manualROP);
  console.log('Manual EOQ:', Math.ceil(manualEOQ));
  
  // Now compare with utility function
  const metrics = calculateInventoryMetrics({
    currentQty,
    unitCost,
    leadTimeDays,
    safetyStock
  });
  
  console.log('Utility ROP:', metrics.restockLevel);
  console.log('Utility EOQ:', metrics.eoq);
  console.log('Match:', {
    ropMatch: Math.abs(manualROP - metrics.restockLevel) < 1,
    eoqMatch: Math.abs(Math.ceil(manualEOQ) - metrics.eoq) < 5
  });
  
  return metrics;
};

// ============================================
// EXPORT FOR USE IN OTHER FILES
// ============================================

export {
  checkProductRestocking,
  calculateProductROP,
  calculateProductEOQ,
  analyzeProductInventory,
  checkAllProductsForRestocking,
  createRestockRequest,
  calculateWithCustomHoldingCost,
  handlePostSaleRestocking,
  updateInventoryConfig,
  debugInventoryCalculation
};
