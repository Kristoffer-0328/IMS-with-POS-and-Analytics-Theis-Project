/**
 * Sales History Service
 * 
 * This service provides functions to:
 * 1. Backfill sales history from posTransactions for existing products
 * 2. Query sales data for ROP calculations
 * 3. Maintain sales history data integrity
 */

import { 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  doc,
  updateDoc,
  runTransaction,
  serverTimestamp 
} from 'firebase/firestore';
import { getFirestore } from 'firebase/firestore';
import { app } from '../../../FirebaseConfig';

const db = getFirestore(app);

/**
 * Get sales history for a specific product/variant from posTransactions
 * 
 * @param {string} productId - Product ID
 * @param {string} size - Variant size (optional)
 * @param {string} unit - Variant unit (optional)
 * @param {number} periodDays - Number of days to look back (default: 90)
 * @returns {Array} Array of sales records with quantity and timestamp
 */
export const getProductSalesHistory = async (productId, size = null, unit = null, periodDays = 90) => {
  try {
    const salesHistory = [];
    
    // Calculate cutoff date
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - periodDays);
    
    // Query posTransactions collection
    const transactionsRef = collection(db, 'posTransactions');
    const q = query(
      transactionsRef,
      where('createdAt', '>=', cutoffDate),
      orderBy('createdAt', 'desc')
    );
    
    const snapshot = await getDocs(q);
    
    console.log(`📊 Found ${snapshot.docs.length} transactions in last ${periodDays} days`);
    
    // Process each transaction
    snapshot.forEach(doc => {
      const transaction = doc.data();
      const items = transaction.items || [];
      
      // Find matching product in transaction items
      items.forEach(item => {
        const matchesProduct = item.productId === productId;
        const matchesVariant = !size || (item.size === size && item.unit === unit);
        
        if (matchesProduct && matchesVariant) {
          salesHistory.push({
            quantity: item.quantity || 0,
            timestamp: transaction.createdAt?.toDate?.()?.toISOString() || 
                      transaction.saleDate || 
                      new Date().toISOString(),
            saleId: doc.id,
            performedBy: transaction.createdBy || 'unknown'
          });
        }
      });
    });
    
    console.log(`✅ Found ${salesHistory.length} sales records for product ${productId}`);
    
    return salesHistory;
  } catch (error) {
    console.error('Error fetching product sales history:', error);
    return [];
  }
};

/**
 * Backfill sales history for a single product document from posTransactions
 * 
 * @param {Object} productRef - Firestore document reference
 * @param {Object} productData - Product data
 * @param {number} variantIndex - Variant index (-1 for non-variant products)
 * @param {number} periodDays - Days to look back (default: 90)
 * @returns {Object} Updated sales history
 */
export const backfillProductSalesHistory = async (productRef, productData, variantIndex = -1, periodDays = 90) => {
  try {
    let productId, size, unit;
    
    if (variantIndex >= 0 && productData.variants?.[variantIndex]) {
      // Variant product
      const variant = productData.variants[variantIndex];
      productId = productData.id || productData.productId;
      size = variant.size;
      unit = variant.unit;
    } else {
      // Non-variant product
      productId = productData.id || productData.productId;
      size = productData.size;
      unit = productData.unit;
    }
    
    // Get sales history from posTransactions
    const salesHistory = await getProductSalesHistory(productId, size, unit, periodDays);
    
    if (salesHistory.length === 0) {
      console.log(`ℹ️ No sales history found for ${productData.name}`);
      return null;
    }
    
    // Update the product document
    if (variantIndex >= 0) {
      // Update variant
      const variants = [...(productData.variants || [])];
      variants[variantIndex] = {
        ...variants[variantIndex],
        salesHistory,
        salesHistoryUpdatedAt: serverTimestamp()
      };
      
      await updateDoc(productRef, {
        variants,
        lastUpdated: serverTimestamp()
      });
    } else {
      // Update product directly
      await updateDoc(productRef, {
        salesHistory,
        salesHistoryUpdatedAt: serverTimestamp(),
        lastUpdated: serverTimestamp()
      });
    }
    
    console.log(`✅ Backfilled ${salesHistory.length} sales records for ${productData.name}`);
    
    return salesHistory;
  } catch (error) {
    console.error('Error backfilling sales history:', error);
    throw error;
  }
};

/**
 * Backfill sales history for all products in the system
 * This is a one-time migration function
 * 
 * @param {Function} progressCallback - Callback function to report progress
 * @returns {Object} Summary of backfill operation
 */
export const backfillAllProductsSalesHistory = async (progressCallback = null) => {
  try {
    console.log('🔄 Starting sales history backfill for all products...');
    
    let totalProducts = 0;
    let updatedProducts = 0;
    let errors = 0;
    
    // Get all storage units
    const productsRef = collection(db, 'Products');
    const storageUnitsSnapshot = await getDocs(productsRef);
    
    for (const storageUnitDoc of storageUnitsSnapshot.docs) {
      const unitId = storageUnitDoc.id;
      
      // Skip non-storage unit documents
      if (!unitId.startsWith('Unit ')) continue;
      
      console.log(`📦 Processing ${unitId}...`);
      
      // Get products in this unit
      const unitProductsRef = collection(db, 'Products', unitId, 'products');
      const productsSnapshot = await getDocs(unitProductsRef);
      
      for (const productDoc of productsSnapshot.docs) {
        const productData = productDoc.data();
        totalProducts++;
        
        try {
          // Check if product has variants
          if (productData.variants && Array.isArray(productData.variants)) {
            // Process each variant
            for (let i = 0; i < productData.variants.length; i++) {
              const variant = productData.variants[i];
              
              // Skip if variant already has recent sales history
              if (variant.salesHistory && variant.salesHistory.length > 0) {
                continue;
              }
              
              await backfillProductSalesHistory(productDoc.ref, productData, i, 90);
              updatedProducts++;
              
              if (progressCallback) {
                progressCallback({
                  total: totalProducts,
                  updated: updatedProducts,
                  current: `${productData.name} - ${variant.size} ${variant.unit}`
                });
              }
            }
          } else {
            // Non-variant product
            // Skip if already has recent sales history
            if (productData.salesHistory && productData.salesHistory.length > 0) {
              continue;
            }
            
            await backfillProductSalesHistory(productDoc.ref, productData, -1, 90);
            updatedProducts++;
            
            if (progressCallback) {
              progressCallback({
                total: totalProducts,
                updated: updatedProducts,
                current: productData.name
              });
            }
          }
        } catch (error) {
          console.error(`Error processing ${productData.name}:`, error);
          errors++;
        }
      }
    }
    
    const summary = {
      totalProducts,
      updatedProducts,
      errors,
      success: errors === 0
    };
    
    console.log('✅ Sales history backfill completed:', summary);
    
    return summary;
  } catch (error) {
    console.error('Error in backfill operation:', error);
    throw error;
  }
};

/**
 * Calculate average daily demand from sales history
 * This is a helper function that can be used independently
 * 
 * @param {Array} salesHistory - Array of sales records
 * @param {number} periodDays - Number of days to analyze (default: 30)
 * @returns {Object} Demand statistics
 */
export const calculateDemandFromHistory = (salesHistory = [], periodDays = 30) => {
  if (!salesHistory || salesHistory.length === 0) {
    return {
      averageDailyDemand: 0,
      totalSales: 0,
      salesDays: 0,
      dataPoints: 0
    };
  }
  
  // Filter to specified period
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - periodDays);
  
  const recentSales = salesHistory.filter(sale => 
    new Date(sale.timestamp) >= cutoffDate
  );
  
  const totalSales = recentSales.reduce((sum, sale) => sum + (sale.quantity || 0), 0);
  const averageDailyDemand = totalSales / periodDays;
  
  return {
    averageDailyDemand: Math.max(0, averageDailyDemand),
    totalSales,
    salesDays: periodDays,
    dataPoints: recentSales.length
  };
};

export default {
  getProductSalesHistory,
  backfillProductSalesHistory,
  backfillAllProductsSalesHistory,
  calculateDemandFromHistory
};
