/**
 * ============================================================================
 * STOCK MOVEMENT SERVICE
 * ============================================================================
 * 
 * Centralized service for managing stock movements in the inventory system.
 * This service provides standardized methods for:
 * - Recording inbound movements (receiving, returns, adjustments)
 * - Recording outbound movements (sales, releases, adjustments)
 * - Querying movement history with filters
 * - Generating movement reports
 * 
 * Collection: stock_movements
 * 
 * Standard Document Structure:
 * {
 *   // Movement Type & Classification
 *   movementType: 'IN' | 'OUT',
 *   reason: string,
 *   
 *   // Product Information
 *   productId: string,
 *   productName: string,
 *   variantId: string | null,
 *   variantName: string | null,
 *   category: string,
 *   
 *   // Quantity & Value
 *   quantity: number,
 *   previousQuantity: number | null,
 *   newQuantity: number | null,
 *   unitPrice: number,
 *   totalValue: number,
 *   
 *   // Location Information
 *   storageLocation: string | null,
 *   shelf: string | null,
 *   row: string | null,
 *   column: string | null,
 *   
 *   // Transaction References
 *   referenceType: string,
 *   referenceId: string,
 *   
 *   // User Information
 *   performedBy: string,
 *   performedByName: string,
 *   
 *   // Timestamps
 *   movementDate: Date,
 *   timestamp: Date,
 *   createdAt: Date,
 *   
 *   // Additional Context
 *   notes: string | null,
 *   status: string
 * }
 */

import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  Timestamp 
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import app from '../FirebaseConfig';

const db = getFirestore(app);
const STOCK_MOVEMENTS_COLLECTION = 'stock_movements';

// ============================================================================
// MOVEMENT TYPE CONSTANTS
// ============================================================================

export const MOVEMENT_TYPES = {
  IN: 'IN',
  OUT: 'OUT'
};

export const MOVEMENT_REASONS = {
  // Inbound Reasons
  SUPPLIER_DELIVERY: 'Supplier Delivery',
  PURCHASE_RETURN: 'Purchase Return',
  STOCK_ADJUSTMENT_IN: 'Stock Adjustment (In)',
  PRODUCTION_IN: 'Production (In)',
  TRANSFER_IN: 'Transfer (In)',
  
  // Outbound Reasons
  POS_SALE: 'POS Sale',
  STOCK_RELEASE: 'Stock Release',
  STOCK_ADJUSTMENT_OUT: 'Stock Adjustment (Out)',
  DAMAGE_WRITE_OFF: 'Damage/Write-off',
  TRANSFER_OUT: 'Transfer (Out)',
  SALES_RETURN: 'Sales Return'
};

export const REFERENCE_TYPES = {
  SALE: 'sale',
  RECEIVING_RECORD: 'receiving_record',
  STOCK_RELEASE: 'stock_release',
  ADJUSTMENT: 'adjustment',
  TRANSFER: 'transfer',
  PURCHASE_ORDER: 'purchase_order'
};

// ============================================================================
// CREATE MOVEMENT RECORDS
// ============================================================================

/**
 * Record an INBOUND stock movement
 * @param {Object} movementData - Movement data
 * @param {string} movementData.productId - Product ID
 * @param {string} movementData.productName - Product name
 * @param {string} movementData.variantId - Variant ID (optional)
 * @param {string} movementData.variantName - Variant name (optional)
 * @param {string} movementData.category - Product category
 * @param {number} movementData.quantity - Quantity received
 * @param {number} movementData.unitPrice - Unit price
 * @param {string} movementData.reason - Reason for movement
 * @param {string} movementData.referenceType - Reference type
 * @param {string} movementData.referenceId - Reference ID
 * @param {Object} movementData.performedBy - User who performed the action
 * @param {string} movementData.performedBy.uid - User ID
 * @param {string} movementData.performedBy.name - User name
 * @param {Object} movementData.location - Storage location (optional)
 * @param {Object} movementData.additionalData - Additional context (optional)
 * @returns {Promise<string>} Document ID of created movement
 */
export const recordInboundMovement = async (movementData) => {
  try {
    const {
      productId,
      productName,
      variantId = null,
      variantName = null,
      category = 'General',
      quantity,
      previousQuantity = null,
      newQuantity = null,
      unitPrice = 0,
      reason = MOVEMENT_REASONS.SUPPLIER_DELIVERY,
      referenceType,
      referenceId,
      performedBy,
      location = {},
      additionalData = {},
      movementDate = new Date(),
      notes = ''
    } = movementData;

    // Validation
    if (!productId || !productName) {
      throw new Error('Product ID and name are required');
    }
    if (!quantity || quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }
    if (!referenceType || !referenceId) {
      throw new Error('Reference type and ID are required');
    }
    if (!performedBy || !performedBy.uid || !performedBy.name) {
      throw new Error('User information is required (uid and name)');
    }

    const totalValue = quantity * unitPrice;

    const movementDoc = {
      // Movement Type & Classification
      movementType: MOVEMENT_TYPES.IN,
      reason,
      
      // Product Information
      productId,
      productName,
      variantId,
      variantName,
      category,
      
      // Quantity & Value
      quantity,
      previousQuantity,
      newQuantity,
      unitPrice,
      totalValue,
      
      // Location Information
      storageLocation: location.storageLocation || null,
      shelf: location.shelf || null,
      row: location.row || null,
      column: location.column || null,
      
      // Transaction References
      referenceType,
      referenceId,
      
      // User Information
      performedBy: performedBy.uid,
      performedByName: performedBy.name,
      
      // Timestamps
      movementDate: Timestamp.fromDate(movementDate),
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
      
      // Additional Context
      notes,
      status: 'completed',
      
      // Merge any additional data
      ...additionalData
    };

    const docRef = await addDoc(collection(db, STOCK_MOVEMENTS_COLLECTION), movementDoc);
    console.log(`✅ Inbound movement recorded: ${docRef.id}`);
    
    return docRef.id;
  } catch (error) {
    console.error('❌ Error recording inbound movement:', error);
    throw error;
  }
};

/**
 * Record an OUTBOUND stock movement
 * @param {Object} movementData - Movement data
 * @param {string} movementData.productId - Product ID
 * @param {string} movementData.productName - Product name
 * @param {string} movementData.variantId - Variant ID (optional)
 * @param {string} movementData.variantName - Variant name (optional)
 * @param {string} movementData.category - Product category
 * @param {number} movementData.quantity - Quantity sold/released
 * @param {number} movementData.previousQuantity - Previous stock quantity
 * @param {number} movementData.newQuantity - New stock quantity after deduction
 * @param {number} movementData.unitPrice - Unit price
 * @param {string} movementData.reason - Reason for movement
 * @param {string} movementData.referenceType - Reference type
 * @param {string} movementData.referenceId - Reference ID
 * @param {Object} movementData.performedBy - User who performed the action
 * @param {string} movementData.performedBy.uid - User ID
 * @param {string} movementData.performedBy.name - User name
 * @param {Object} movementData.location - Storage location (optional)
 * @param {Object} movementData.additionalData - Additional context (optional)
 * @returns {Promise<string>} Document ID of created movement
 */
export const recordOutboundMovement = async (movementData) => {
  try {
    const {
      productId,
      productName,
      variantId = null,
      variantName = null,
      category = 'General',
      quantity,
      previousQuantity = null,
      newQuantity = null,
      unitPrice = 0,
      reason = MOVEMENT_REASONS.POS_SALE,
      referenceType,
      referenceId,
      performedBy,
      location = {},
      additionalData = {},
      movementDate = new Date(),
      notes = ''
    } = movementData;

    // Validation
    if (!productId || !productName) {
      throw new Error('Product ID and name are required');
    }
    if (!quantity || quantity <= 0) {
      throw new Error('Quantity must be greater than 0');
    }
    if (!referenceType || !referenceId) {
      throw new Error('Reference type and ID are required');
    }
    if (!performedBy || !performedBy.uid || !performedBy.name) {
      throw new Error('User information is required (uid and name)');
    }

    const totalValue = quantity * unitPrice;

    const movementDoc = {
      // Movement Type & Classification
      movementType: MOVEMENT_TYPES.OUT,
      reason,
      
      // Product Information
      productId,
      productName,
      variantId,
      variantName,
      category,
      
      // Quantity & Value
      quantity,
      previousQuantity,
      newQuantity,
      unitPrice,
      totalValue,
      
      // Location Information
      storageLocation: location.storageLocation || null,
      shelf: location.shelf || null,
      row: location.row || null,
      column: location.column || null,
      
      // Transaction References
      referenceType,
      referenceId,
      
      // User Information
      performedBy: performedBy.uid,
      performedByName: performedBy.name,
      
      // Timestamps
      movementDate: Timestamp.fromDate(movementDate),
      timestamp: serverTimestamp(),
      createdAt: serverTimestamp(),
      
      // Additional Context
      notes,
      status: 'completed',
      
      // Merge any additional data
      ...additionalData
    };

    const docRef = await addDoc(collection(db, STOCK_MOVEMENTS_COLLECTION), movementDoc);
    console.log(`✅ Outbound movement recorded: ${docRef.id}`);
    
    return docRef.id;
  } catch (error) {
    console.error('❌ Error recording outbound movement:', error);
    throw error;
  }
};

/**
 * Record multiple stock movements in batch
 * @param {Array<Object>} movements - Array of movement data
 * @param {string} movementType - 'IN' or 'OUT'
 * @returns {Promise<Array<string>>} Array of created document IDs
 */
export const recordBatchMovements = async (movements, movementType) => {
  try {
    if (!movements || movements.length === 0) {
      return [];
    }

    const recordFunction = movementType === MOVEMENT_TYPES.IN 
      ? recordInboundMovement 
      : recordOutboundMovement;

    const promises = movements.map(movement => recordFunction(movement));
    const docIds = await Promise.all(promises);
    
    console.log(`✅ Recorded ${docIds.length} ${movementType} movements`);
    return docIds;
  } catch (error) {
    console.error(`❌ Error recording batch movements:`, error);
    throw error;
  }
};

// ============================================================================
// QUERY MOVEMENT RECORDS
// ============================================================================

/**
 * Get stock movements with filters
 * @param {Object} filters - Query filters
 * @param {string} filters.movementType - 'IN', 'OUT', or null for all
 * @param {string} filters.productId - Filter by product ID
 * @param {string} filters.variantId - Filter by variant ID
 * @param {Date} filters.startDate - Start date for date range
 * @param {Date} filters.endDate - End date for date range
 * @param {string} filters.referenceType - Filter by reference type
 * @param {string} filters.referenceId - Filter by reference ID
 * @param {number} filters.limit - Maximum number of results
 * @returns {Promise<Array>} Array of movement documents
 */
export const getStockMovements = async (filters = {}) => {
  try {
    const {
      movementType = null,
      productId = null,
      variantId = null,
      startDate = null,
      endDate = null,
      referenceType = null,
      referenceId = null,
      limitCount = null
    } = filters;

    let movementQuery = collection(db, STOCK_MOVEMENTS_COLLECTION);
    const queryConstraints = [];

    // Add filters
    if (movementType) {
      queryConstraints.push(where('movementType', '==', movementType));
    }
    if (productId) {
      queryConstraints.push(where('productId', '==', productId));
    }
    if (variantId) {
      queryConstraints.push(where('variantId', '==', variantId));
    }
    if (referenceType) {
      queryConstraints.push(where('referenceType', '==', referenceType));
    }
    if (referenceId) {
      queryConstraints.push(where('referenceId', '==', referenceId));
    }
    
    // Date range filter (using movementDate field)
    if (startDate) {
      queryConstraints.push(where('movementDate', '>=', Timestamp.fromDate(startDate)));
    }
    if (endDate) {
      queryConstraints.push(where('movementDate', '<=', Timestamp.fromDate(endDate)));
    }

    // Always order by date (required when using date range)
    queryConstraints.push(orderBy('movementDate', 'desc'));

    // Add limit if specified
    if (limitCount) {
      queryConstraints.push(limit(limitCount));
    }

    // Build and execute query
    movementQuery = query(movementQuery, ...queryConstraints);
    const snapshot = await getDocs(movementQuery);

    const movements = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      movementDate: doc.data().movementDate?.toDate ? doc.data().movementDate.toDate() : new Date(doc.data().movementDate),
      timestamp: doc.data().timestamp?.toDate ? doc.data().timestamp.toDate() : null,
      createdAt: doc.data().createdAt?.toDate ? doc.data().createdAt.toDate() : null
    }));

    console.log(`📊 Retrieved ${movements.length} stock movements`);
    return movements;
  } catch (error) {
    console.error('❌ Error querying stock movements:', error);
    throw error;
  }
};

/**
 * Get stock movements for a specific year and optional month
 * @param {number} year - Year to filter
 * @param {number} month - Month to filter (0-11), null for all months
 * @returns {Promise<Array>} Array of movement documents
 */
export const getMovementsByYearMonth = async (year, month = null) => {
  try {
    let startDate, endDate;

    if (month !== null) {
      // Specific month
      startDate = new Date(year, month, 1);
      endDate = new Date(year, month + 1, 0, 23, 59, 59);
    } else {
      // Entire year
      startDate = new Date(year, 0, 1);
      endDate = new Date(year, 11, 31, 23, 59, 59);
    }

    return await getStockMovements({ startDate, endDate });
  } catch (error) {
    console.error('❌ Error getting movements by year/month:', error);
    throw error;
  }
};

/**
 * Get stock movements for a specific product (all variants)
 * @param {string} productId - Product ID
 * @param {number} limitCount - Maximum results (optional)
 * @returns {Promise<Array>} Array of movement documents
 */
export const getMovementsByProduct = async (productId, limitCount = null) => {
  try {
    return await getStockMovements({ productId, limitCount });
  } catch (error) {
    console.error('❌ Error getting movements by product:', error);
    throw error;
  }
};

/**
 * Get stock movements for a specific variant
 * @param {string} variantId - Variant ID
 * @param {number} limitCount - Maximum results (optional)
 * @returns {Promise<Array>} Array of movement documents
 */
export const getMovementsByVariant = async (variantId, limitCount = null) => {
  try {
    return await getStockMovements({ variantId, limitCount });
  } catch (error) {
    console.error('❌ Error getting movements by variant:', error);
    throw error;
  }
};

/**
 * Get stock movements for a specific transaction
 * @param {string} referenceType - Reference type (e.g., 'sale', 'receiving_record')
 * @param {string} referenceId - Reference ID
 * @returns {Promise<Array>} Array of movement documents
 */
export const getMovementsByReference = async (referenceType, referenceId) => {
  try {
    return await getStockMovements({ referenceType, referenceId });
  } catch (error) {
    console.error('❌ Error getting movements by reference:', error);
    throw error;
  }
};

// ============================================================================
// ANALYTICS & REPORTING
// ============================================================================

/**
 * Get movement summary statistics
 * @param {Object} filters - Same filters as getStockMovements
 * @returns {Promise<Object>} Summary statistics
 */
export const getMovementSummary = async (filters = {}) => {
  try {
    const movements = await getStockMovements(filters);

    const summary = {
      totalMovements: movements.length,
      totalIn: 0,
      totalOut: 0,
      totalInValue: 0,
      totalOutValue: 0,
      netQuantity: 0,
      netValue: 0,
      inboundCount: 0,
      outboundCount: 0,
      averageInValue: 0,
      averageOutValue: 0
    };

    movements.forEach(movement => {
      if (movement.movementType === MOVEMENT_TYPES.IN) {
        summary.totalIn += movement.quantity;
        summary.totalInValue += movement.totalValue || 0;
        summary.inboundCount++;
      } else {
        summary.totalOut += movement.quantity;
        summary.totalOutValue += movement.totalValue || 0;
        summary.outboundCount++;
      }
    });

    summary.netQuantity = summary.totalIn - summary.totalOut;
    summary.netValue = summary.totalInValue - summary.totalOutValue;
    summary.averageInValue = summary.inboundCount > 0 ? summary.totalInValue / summary.inboundCount : 0;
    summary.averageOutValue = summary.outboundCount > 0 ? summary.totalOutValue / summary.outboundCount : 0;

    console.log('📊 Movement summary calculated:', summary);
    return summary;
  } catch (error) {
    console.error('❌ Error calculating movement summary:', error);
    throw error;
  }
};

/**
 * Get daily aggregated movement data for charts
 * @param {Object} filters - Same filters as getStockMovements
 * @returns {Promise<Array>} Array of daily aggregated data
 */
export const getDailyMovementData = async (filters = {}) => {
  try {
    const movements = await getStockMovements(filters);

    const dailyData = {};

    movements.forEach(movement => {
      const day = movement.movementDate.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });

      if (!dailyData[day]) {
        dailyData[day] = { 
          day, 
          date: movement.movementDate,
          in: 0, 
          out: 0,
          inValue: 0,
          outValue: 0
        };
      }

      if (movement.movementType === MOVEMENT_TYPES.IN) {
        dailyData[day].in += movement.quantity;
        dailyData[day].inValue += movement.totalValue || 0;
      } else {
        dailyData[day].out += movement.quantity;
        dailyData[day].outValue += movement.totalValue || 0;
      }
    });

    // Convert to array and sort by date
    const chartData = Object.values(dailyData).sort((a, b) => a.date - b.date);

    console.log('📊 Daily movement data generated:', chartData.length, 'days');
    return chartData;
  } catch (error) {
    console.error('❌ Error generating daily movement data:', error);
    throw error;
  }
};

/**
 * Get movement breakdown by reason
 * @param {Object} filters - Same filters as getStockMovements
 * @returns {Promise<Object>} Breakdown by reason
 */
export const getMovementsByReason = async (filters = {}) => {
  try {
    const movements = await getStockMovements(filters);

    const breakdown = {};

    movements.forEach(movement => {
      const reason = movement.reason || 'Unknown';
      
      if (!breakdown[reason]) {
        breakdown[reason] = {
          reason,
          count: 0,
          totalQuantity: 0,
          totalValue: 0,
          movementType: movement.movementType
        };
      }

      breakdown[reason].count++;
      breakdown[reason].totalQuantity += movement.quantity;
      breakdown[reason].totalValue += movement.totalValue || 0;
    });

    console.log('📊 Movement breakdown by reason:', Object.keys(breakdown).length, 'reasons');
    return Object.values(breakdown);
  } catch (error) {
    console.error('❌ Error getting movements by reason:', error);
    throw error;
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  // Create
  recordInboundMovement,
  recordOutboundMovement,
  recordBatchMovements,
  
  // Query
  getStockMovements,
  getMovementsByYearMonth,
  getMovementsByProduct,
  getMovementsByVariant,
  getMovementsByReference,
  
  // Analytics
  getMovementSummary,
  getDailyMovementData,
  getMovementsByReason,
  
  // Constants
  MOVEMENT_TYPES,
  MOVEMENT_REASONS,
  REFERENCE_TYPES
};
