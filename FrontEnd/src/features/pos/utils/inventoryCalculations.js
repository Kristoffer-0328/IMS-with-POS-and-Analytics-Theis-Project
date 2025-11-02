/**
 * Inventory Management Calculations Utility
 * 
 * This module provides reusable functions for inventory management calculations including:
 * - Reorder Point (ROP) calculation
 * - Economic Order Quantity (EOQ) calculation
 * - Stock threshold validation
 * - Restocking recommendations
 * 
 * @module inventoryCalculations
 */

/**
 * Default configuration for inventory calculations
 * These can be overridden by system settings or user preferences
 */
export const INVENTORY_CONFIG = {
  // Holding cost as percentage of unit cost per year (industry standard for retail/construction materials: 20-30%)
  HOLDING_COST_RATE: 0.25, // 25% annual holding cost
  
  // Default ordering cost per purchase order (administrative + logistics cost)
  ORDERING_COST: 500, // ₱500 per order (can be configured per supplier)
  
  // Default demand when no historical data is available
  DEFAULT_DAILY_DEMAND: 10,
  
  // Default lead time in days if supplier doesn't specify
  DEFAULT_LEAD_TIME: 7,
  
  // Safety factor multiplier for low stock warnings (1.5 = 150% of ROP)
  LOW_STOCK_MULTIPLIER: 1.5,
  
  // Minimum EOQ to avoid tiny orders
  MINIMUM_EOQ: 10,
  
  // Default maximum stock level if not specified
  DEFAULT_MAX_STOCK: 100,
  
  // Convert holding cost calculation method
  // Options: 'PERCENTAGE' (% of unit cost), 'DAILY_RATE' (fixed daily cost), 'TIME_BASED' (cost per holding period)
  HOLDING_COST_METHOD: 'PERCENTAGE'
};

/**
 * Calculate Holding Cost based on the selected method
 * 
 * @param {number} unitCost - Cost per unit of the product
 * @param {string} method - Calculation method ('PERCENTAGE', 'DAILY_RATE', 'TIME_BASED')
 * @param {number} holdingPeriodDays - Number of days the product has been in inventory
 * @param {number} customRate - Custom holding cost rate (optional)
 * @returns {number} Calculated holding cost per unit
 */
export const calculateHoldingCost = (
  unitCost, 
  method = INVENTORY_CONFIG.HOLDING_COST_METHOD, 
  holdingPeriodDays = 365,
  customRate = INVENTORY_CONFIG.HOLDING_COST_RATE
) => {
  switch (method) {
    case 'PERCENTAGE':
      // Annual holding cost = Unit Cost × Holding Rate
      // Daily holding cost = Annual / 365
      return (unitCost * customRate) / 365;
    
    case 'DAILY_RATE':
      // Fixed daily holding cost regardless of unit price
      return customRate;
    
    case 'TIME_BASED':
      // Holding cost inversely proportional to how long product exists
      // Newer products = higher holding cost (less historical data)
      const adjustedPeriod = Math.max(1, holdingPeriodDays);
      return unitCost / adjustedPeriod;
    
    default:
      return (unitCost * INVENTORY_CONFIG.HOLDING_COST_RATE) / 365;
  }
};

/**
 * Calculate Economic Order Quantity (EOQ)
 * 
 * Formula: EOQ = √((2 × D × S) / H)
 * Where:
 * - D = Annual demand (units per year)
 * - S = Ordering cost per order
 * - H = Annual holding cost per unit
 * 
 * @param {number} annualDemand - Expected annual demand in units
 * @param {number} orderingCost - Cost to place one order (administrative + logistics)
 * @param {number} annualHoldingCost - Cost to hold one unit for one year
 * @returns {number} Optimal order quantity (rounded up)
 */
export const calculateEOQ = (annualDemand, orderingCost, annualHoldingCost) => {
  if (!annualDemand || !orderingCost || !annualHoldingCost) {
    console.warn('Invalid EOQ parameters:', { annualDemand, orderingCost, annualHoldingCost });
    return INVENTORY_CONFIG.MINIMUM_EOQ;
  }
  
  const eoq = Math.sqrt((2 * annualDemand * orderingCost) / annualHoldingCost);
  return Math.max(Math.ceil(eoq), INVENTORY_CONFIG.MINIMUM_EOQ);
};

/**
 * Calculate Reorder Point (ROP)
 * 
 * Formula: ROP = (Average Daily Demand × Lead Time) + Safety Stock
 * 
 * @param {number} averageDailyDemand - Average units sold per day
 * @param {number} leadTimeDays - Supplier lead time in days
 * @param {number} safetyStock - Buffer stock to handle demand variability
 * @returns {number} Reorder point (rounded up)
 */
export const calculateROP = (averageDailyDemand, leadTimeDays, safetyStock = 0) => {
  const rop = (averageDailyDemand * leadTimeDays) + safetyStock;
  return Math.ceil(rop);
};

/**
 * Calculate Safety Stock using standard deviation method
 * 
 * Formula: Safety Stock = Z × σ × √L
 * Where:
 * - Z = Service level factor (e.g., 1.65 for 95% service level)
 * - σ = Standard deviation of demand
 * - L = Lead time in days
 * 
 * @param {number} demandStdDev - Standard deviation of daily demand
 * @param {number} leadTimeDays - Lead time in days
 * @param {number} serviceLevel - Desired service level (0.90, 0.95, 0.99)
 * @returns {number} Recommended safety stock quantity
 */
export const calculateSafetyStock = (demandStdDev, leadTimeDays, serviceLevel = 0.95) => {
  // Z-scores for common service levels
  const zScores = {
    0.90: 1.28,
    0.95: 1.65,
    0.99: 2.33
  };
  
  const z = zScores[serviceLevel] || 1.65; // Default to 95%
  const safetyStock = z * demandStdDev * Math.sqrt(leadTimeDays);
  
  return Math.ceil(safetyStock);
};

/**
 * Estimate daily demand from historical sales data
 * 
 * @param {Array} salesHistory - Array of sale quantities with timestamps
 * @param {number} periodDays - Number of days to analyze (default: 30)
 * @returns {Object} { averageDemand, standardDeviation, totalSales, salesDays }
 */
export const estimateDemand = (salesHistory = [], periodDays = 30) => {
  if (!salesHistory || salesHistory.length === 0) {
    return {
      averageDemand: INVENTORY_CONFIG.DEFAULT_DAILY_DEMAND,
      standardDeviation: INVENTORY_CONFIG.DEFAULT_DAILY_DEMAND * 0.3, // Assume 30% variation
      totalSales: 0,
      salesDays: 0,
      isEstimated: true
    };
  }
  
  // Filter sales within the period
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - periodDays);
  
  const recentSales = salesHistory.filter(sale => 
    new Date(sale.timestamp) >= cutoffDate
  );
  
  if (recentSales.length === 0) {
    return {
      averageDemand: INVENTORY_CONFIG.DEFAULT_DAILY_DEMAND,
      standardDeviation: INVENTORY_CONFIG.DEFAULT_DAILY_DEMAND * 0.3,
      totalSales: 0,
      salesDays: 0,
      isEstimated: true
    };
  }
  
  // Calculate average daily demand
  const totalSales = recentSales.reduce((sum, sale) => sum + sale.quantity, 0);
  const salesDays = Math.max(1, periodDays);
  const averageDemand = totalSales / salesDays;
  
  // Calculate standard deviation
  const dailySales = Array(periodDays).fill(0);
  recentSales.forEach(sale => {
    const dayIndex = Math.floor((new Date() - new Date(sale.timestamp)) / (1000 * 60 * 60 * 24));
    if (dayIndex >= 0 && dayIndex < periodDays) {
      dailySales[dayIndex] += sale.quantity;
    }
  });
  
  const mean = averageDemand;
  const variance = dailySales.reduce((sum, qty) => sum + Math.pow(qty - mean, 2), 0) / periodDays;
  const standardDeviation = Math.sqrt(variance);
  
  return {
    averageDemand: Math.max(1, averageDemand),
    standardDeviation,
    totalSales,
    salesDays,
    isEstimated: false
  };
};

/**
 * Comprehensive function to calculate inventory metrics for a product/variant
 * 
 * @param {Object} params - Calculation parameters
 * @param {number} params.currentQty - Current stock quantity
 * @param {number} params.unitCost - Cost per unit
 * @param {number} params.leadTimeDays - Supplier lead time in days
 * @param {number} params.safetyStock - Safety stock quantity (optional)
 * @param {number} params.maximumStockLevel - Maximum stock level (optional)
 * @param {Array} params.salesHistory - Historical sales data (optional)
 * @param {number} params.existingROP - Pre-calculated ROP if available (optional)
 * @param {number} params.existingEOQ - Pre-calculated EOQ if available (optional)
 * @param {number} params.orderingCost - Cost per order (optional)
 * @param {number} params.holdingCostRate - Custom holding cost rate (optional)
 * @param {number} params.holdingPeriodDays - Days product has been in inventory (optional)
 * @returns {Object} Complete inventory metrics
 */
export const calculateInventoryMetrics = ({
  currentQty,
  unitCost,
  leadTimeDays = INVENTORY_CONFIG.DEFAULT_LEAD_TIME,
  safetyStock = 0,
  maximumStockLevel = INVENTORY_CONFIG.DEFAULT_MAX_STOCK,
  salesHistory = [],
  existingROP = null,
  existingEOQ = null,
  orderingCost = INVENTORY_CONFIG.ORDERING_COST,
  holdingCostRate = INVENTORY_CONFIG.HOLDING_COST_RATE,
  holdingPeriodDays = null
}) => {
  // Estimate demand from sales history or use default
  const demandData = estimateDemand(salesHistory, 30);
  const averageDailyDemand = demandData.averageDemand;
  const annualDemand = averageDailyDemand * 365;
  
  // Calculate holding cost
  const periodDays = holdingPeriodDays || 365;
  const dailyHoldingCost = calculateHoldingCost(
    unitCost, 
    INVENTORY_CONFIG.HOLDING_COST_METHOD, 
    periodDays,
    holdingCostRate
  );
  const annualHoldingCost = dailyHoldingCost * 365;
  
  // Calculate or use existing ROP
  let rop;
  if (existingROP && existingROP > 0) {
    rop = existingROP;
  } else {
    rop = calculateROP(averageDailyDemand, leadTimeDays, safetyStock);
  }
  
  // Calculate or use existing EOQ
  let eoq;
  if (existingEOQ && existingEOQ > 0) {
    eoq = existingEOQ;
  } else {
    eoq = calculateEOQ(annualDemand, orderingCost, annualHoldingCost);
  }
  
  // Determine stock status
  const needsRestock = currentQty <= rop;
  const isLowStock = currentQty <= (rop * INVENTORY_CONFIG.LOW_STOCK_MULTIPLIER);
  const isOutOfStock = currentQty === 0;
  const isCritical = currentQty <= (rop * 0.5); // Below 50% of ROP
  
  // Calculate suggested order quantity
  let suggestedOrderQuantity = eoq;
  if (needsRestock) {
    // If restocking needed, ensure we order enough to reach target stock level
    const targetStockLevel = Math.min(maximumStockLevel, rop + eoq);
    const deficit = targetStockLevel - currentQty;
    suggestedOrderQuantity = Math.max(eoq, deficit);
  }
  
  // Determine priority level
  let priority = 'normal';
  if (isOutOfStock) {
    priority = 'critical';
  } else if (isCritical) {
    priority = 'urgent';
  } else if (needsRestock) {
    priority = 'high';
  } else if (isLowStock) {
    priority = 'medium';
  }
  
  return {
    // Stock status
    currentQuantity: currentQty,
    needsRestock,
    isLowStock,
    isOutOfStock,
    isCritical,
    priority,
    
    // Calculated metrics
    restockLevel: rop, // ROP
    eoq,
    maximumStockLevel,
    suggestedOrderQuantity,
    
    // Demand data
    averageDailyDemand,
    annualDemand,
    demandStandardDeviation: demandData.standardDeviation,
    demandIsEstimated: demandData.isEstimated,
    
    // Cost data
    unitCost,
    dailyHoldingCost,
    annualHoldingCost,
    orderingCost,
    holdingCostRate,
    
    // Other parameters
    leadTimeDays,
    safetyStock,
    
    // Status messages
    statusMessage: generateStatusMessage(currentQty, rop, isOutOfStock, isCritical, needsRestock, isLowStock),
    
    // Metadata
    calculatedAt: new Date().toISOString(),
    calculationMethod: INVENTORY_CONFIG.HOLDING_COST_METHOD
  };
};

/**
 * Generate a human-readable status message
 * 
 * @private
 * @param {number} currentQty - Current stock quantity
 * @param {number} rop - Reorder point
 * @param {boolean} isOutOfStock - Whether product is out of stock
 * @param {boolean} isCritical - Whether stock is critically low
 * @param {boolean} needsRestock - Whether restocking is needed
 * @param {boolean} isLowStock - Whether stock is low
 * @returns {string} Status message
 */
const generateStatusMessage = (currentQty, rop, isOutOfStock, isCritical, needsRestock, isLowStock) => {
  if (isOutOfStock) {
    return `⛔ OUT OF STOCK - Immediate restocking required!`;
  }
  if (isCritical) {
    return `🚨 CRITICAL - Only ${currentQty} units remaining (50% below reorder point of ${rop})`;
  }
  if (needsRestock) {
    return `⚠️ RESTOCK NEEDED - Current stock (${currentQty}) at or below reorder point (${rop})`;
  }
  if (isLowStock) {
    return `📊 LOW STOCK - Current stock (${currentQty}) approaching reorder point (${rop})`;
  }
  return `✅ STOCK OK - Current stock (${currentQty}) above reorder point (${rop})`;
};

/**
 * Batch calculate inventory metrics for multiple products
 * 
 * @param {Array} products - Array of product objects with inventory data
 * @returns {Array} Array of products with calculated inventory metrics
 */
export const batchCalculateInventoryMetrics = (products) => {
  return products.map(product => {
    try {
      const metrics = calculateInventoryMetrics({
        currentQty: product.quantity || 0,
        unitCost: product.unitPrice || product.supplierPrice || 0,
        leadTimeDays: product.leadTime || INVENTORY_CONFIG.DEFAULT_LEAD_TIME,
        safetyStock: product.safetyStock || 0,
        maximumStockLevel: product.maximumStockLevel || INVENTORY_CONFIG.DEFAULT_MAX_STOCK,
        salesHistory: product.salesHistory || [],
        existingROP: product.restockLevel || product.rop,
        existingEOQ: product.eoq
      });
      
      return {
        ...product,
        inventoryMetrics: metrics
      };
    } catch (error) {
      console.error(`Error calculating metrics for product ${product.id}:`, error);
      return product;
    }
  });
};

/**
 * Get products that need restocking, sorted by priority
 * 
 * @param {Array} products - Array of products with inventory metrics
 * @returns {Array} Filtered and sorted array of products needing restock
 */
export const getRestockingList = (products) => {
  const priorityOrder = { critical: 0, urgent: 1, high: 2, medium: 3, normal: 4 };
  
  return products
    .filter(product => product.inventoryMetrics?.needsRestock)
    .sort((a, b) => {
      const priorityA = priorityOrder[a.inventoryMetrics.priority] || 999;
      const priorityB = priorityOrder[b.inventoryMetrics.priority] || 999;
      return priorityA - priorityB;
    });
};

export default {
  INVENTORY_CONFIG,
  calculateHoldingCost,
  calculateEOQ,
  calculateROP,
  calculateSafetyStock,
  estimateDemand,
  calculateInventoryMetrics,
  batchCalculateInventoryMetrics,
  getRestockingList
};
