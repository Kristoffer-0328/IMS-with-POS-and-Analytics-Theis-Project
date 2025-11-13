import { getFirestore, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
import moment from 'moment';
import app from '../../FirebaseConfig';

const db = getFirestore(app);

export const ReportingService = {
  /**
   * Get inventory turnover data from stock_movements and Transactions collections
   * 
   * Calculation:
   * - Beginning Stock: previousQuantity from oldest movement in period
   * - Ending Stock: newQuantity from newest movement in period
   * - Average Inventory: (Beginning Stock + Ending Stock) / 2
   * - Turnover Rate: Total Units Sold / Average Inventory
   * 
   * Classification:
   * - Class A (Fast Moving): 8-10 turnover rate
   * - Class B (Moderate Moving): 4-8 turnover rate
   * - Class C (Slow Moving): <4 turnover rate
   * 
   * @param {string} startDate - Start date (YYYY-MM-DD)
   * @param {string} endDate - End date (YYYY-MM-DD)
   * @returns {Promise<Object>} Turnover report data
   */
  async getInventoryTurnover(startDate, endDate) {
    try {
      console.log('🔍 ReportingService.getInventoryTurnover called with:', { startDate, endDate });

      // Convert dates to appropriate formats for querying
      // Transactions use string dates (YYYY-MM-DD), stock_movements use Firestore timestamps
      const startDateObj = new Date(startDate);
      startDateObj.setHours(0, 0, 0, 0);
      
      const endDateObj = new Date(endDate);
      endDateObj.setHours(23, 59, 59, 999);

      // For Transactions collection (uses string YYYY-MM-DD format)
      const startDateStr = startDate; // Already in YYYY-MM-DD format
      const endDateStr = endDate; // Already in YYYY-MM-DD format

      console.log('📅 Date range:', { 
        startDateObj: startDateObj.toISOString(), 
        endDateObj: endDateObj.toISOString(),
        startDateStr,
        endDateStr
      });

      // ============================================================================
      // STEP 1: Fetch Stock Movements (uses Firestore Timestamps)
      // ============================================================================
      console.log('📦 Fetching stock movements...');
      const movementsRef = collection(db, 'stock_movements');
      const movementsQuery = query(
        movementsRef,
        where('movementDate', '>=', startDateObj),
        where('movementDate', '<=', endDateObj),
        orderBy('movementDate', 'asc')
      );

      const movementsSnapshot = await getDocs(movementsQuery);
      console.log(`✅ Found ${movementsSnapshot.size} stock movements`);

      // ============================================================================
      // STEP 2: Fetch Transactions for Total Units Sold (uses string YYYY-MM-DD)
      // ============================================================================
      console.log('💰 Fetching transactions...');
      const transactionsRef = collection(db, 'Transactions');
      const transactionsQuery = query(
        transactionsRef,
        where('saleDate', '>=', startDateStr),
        where('saleDate', '<=', endDateStr),
        orderBy('saleDate', 'asc')
      );

      const transactionsSnapshot = await getDocs(transactionsQuery);
      console.log(`✅ Found ${transactionsSnapshot.size} transactions`);
      
      // Log sample transaction for debugging
      if (transactionsSnapshot.size > 0) {
        const firstTransaction = transactionsSnapshot.docs[0].data();
        console.log('📄 Sample transaction:', {
          saleDate: firstTransaction.saleDate,
          items: firstTransaction.items?.length || 0,
          total: firstTransaction.total
        });
      }

      // ============================================================================
      // STEP 3: Group movements by variant and calculate beginning/ending stock
      // ============================================================================
      console.log('🔄 Processing movements by variant...');
      const variantMovementsMap = new Map();

      movementsSnapshot.forEach(doc => {
        const movement = doc.data();
        const variantKey = movement.variantId || `${movement.productId}_${movement.variantName || 'default'}`;
        
        if (!variantMovementsMap.has(variantKey)) {
          variantMovementsMap.set(variantKey, {
            variantId: movement.variantId,
            productId: movement.productId,
            productName: movement.productName,
            variantName: movement.variantName || 'Standard',
            category: movement.category || 'Uncategorized',
            movements: [],
            oldestMovement: null,
            newestMovement: null
          });
        }

        const variantData = variantMovementsMap.get(variantKey);
        const movementDate = movement.movementDate?.toDate ? movement.movementDate.toDate() : new Date(movement.movementDate);
        
        variantData.movements.push({
          ...movement,
          movementDate: movementDate
        });

        // Track oldest and newest movements
        if (!variantData.oldestMovement || movementDate < variantData.oldestMovement.movementDate) {
          variantData.oldestMovement = {
            ...movement,
            movementDate: movementDate
          };
        }

        if (!variantData.newestMovement || movementDate > variantData.newestMovement.movementDate) {
          variantData.newestMovement = {
            ...movement,
            movementDate: movementDate
          };
        }
      });

      console.log(`📊 Grouped into ${variantMovementsMap.size} variants`);

      // ============================================================================
      // STEP 4: Calculate total units sold per variant from Transactions
      // ============================================================================
      console.log('💵 Calculating total units sold...');
      const variantSalesMap = new Map();

      transactionsSnapshot.forEach(doc => {
        const transaction = doc.data();
        const items = transaction.items || [];

        items.forEach(item => {
          const variantKey = item.variantId || `${item.productId}_${item.variantName || 'default'}`;
          
          if (!variantSalesMap.has(variantKey)) {
            variantSalesMap.set(variantKey, {
              totalUnitsSold: 0,
              totalSalesValue: 0,
              transactionCount: 0
            });
          }

          const salesData = variantSalesMap.get(variantKey);
          salesData.totalUnitsSold += item.quantity || 0;
          salesData.totalSalesValue += (item.quantity || 0) * (item.price || 0);
          salesData.transactionCount += 1;
        });
      });

      console.log(`💰 Calculated sales for ${variantSalesMap.size} variants`);

      // ============================================================================
      // STEP 5: Fetch valid variants from Variants collection to filter orphaned data
      // ============================================================================
      console.log('🔍 Fetching valid variants from Variants collection...');
      const variantsRef = collection(db, 'Variants');
      const variantsSnapshot = await getDocs(variantsRef);
      
      // Create a set of valid variant IDs and a map of variant details
      const validVariantIds = new Set();
      const variantDetailsMap = new Map();
      
      variantsSnapshot.forEach(doc => {
        const variant = doc.data();
        const variantId = doc.id;
        validVariantIds.add(variantId);
        
        // Also add alternate key format for backward compatibility
        const altKey = `${variant.parentProductId}_${variant.variantName || 'default'}`;
        validVariantIds.add(altKey);
        
        variantDetailsMap.set(variantId, {
          variantId: variantId,
          productName: variant.productName,
          variantName: variant.variantName,
          category: variant.productCategory || variant.category || 'Uncategorized',
          parentProductId: variant.parentProductId
        });
        
        variantDetailsMap.set(altKey, {
          variantId: variantId,
          productName: variant.productName,
          variantName: variant.variantName,
          category: variant.productCategory || variant.category || 'Uncategorized',
          parentProductId: variant.parentProductId
        });
      });
      
      console.log(`✅ Found ${validVariantIds.size} valid variant keys in Variants collection`);

      // ============================================================================
      // STEP 6: Calculate turnover metrics per variant (only valid variants)
      // ============================================================================
      console.log('📈 Calculating turnover metrics...');
      const productData = [];
      let totalVariants = 0;
      let totalUnitsSold = 0;
      let totalAvgInventory = 0;
      let classACount = 0;
      let classBCount = 0;
      let classCCount = 0;

      // Get all unique variants from both movements and sales
      const allVariantKeys = new Set([
        ...variantMovementsMap.keys(),
        ...variantSalesMap.keys()
      ]);

      allVariantKeys.forEach(variantKey => {
        // ✅ FILTER: Only process variants that exist in Variants collection
        if (!validVariantIds.has(variantKey)) {
          console.log(`⚠️ Skipping orphaned/invalid variant: ${variantKey}`);
          return; // Skip this variant
        }

        const movementData = variantMovementsMap.get(variantKey);
        const salesData = variantSalesMap.get(variantKey) || {
          totalUnitsSold: 0,
          totalSalesValue: 0,
          transactionCount: 0
        };

        // Get variant details from Variants collection for accurate naming
        const variantDetails = variantDetailsMap.get(variantKey);

        // Calculate beginning and ending stock
        let beginningStock = 0;
        let endingStock = 0;

        if (movementData && movementData.oldestMovement && movementData.newestMovement) {
          beginningStock = movementData.oldestMovement.previousQuantity || 0;
          endingStock = movementData.newestMovement.newQuantity || 0;
        }

        // Calculate average inventory
        const averageInventory = (beginningStock + endingStock) / 2;

        // Calculate turnover rate
        const turnoverRate = averageInventory > 0 
          ? salesData.totalUnitsSold / averageInventory 
          : 0;

        // Classify product
        let classification = 'Class C';
        let classLabel = 'Slow Moving';
        if (turnoverRate >= 8) {
          classification = 'Class A';
          classLabel = 'Fast Moving';
          classACount++;
        } else if (turnoverRate >= 4) {
          classification = 'Class B';
          classLabel = 'Moderate Moving';
          classBCount++;
        } else {
          classCCount++;
        }

        // Calculate days since first movement (product age)
        let productAge = 0;
        if (movementData && movementData.oldestMovement) {
          const ageInMs = Date.now() - movementData.oldestMovement.movementDate.getTime();
          productAge = Math.floor(ageInMs / (1000 * 60 * 60 * 24));
        }

        // Use variant details from Variants collection for accurate naming
        const productName = variantDetails?.productName || movementData?.productName || 'Unknown Product';
        const variantName = variantDetails?.variantName || movementData?.variantName || 'Standard';
        const category = variantDetails?.category || movementData?.category || 'Uncategorized';

        productData.push({
          variantId: variantDetails?.variantId || variantKey,
          productId: variantDetails?.parentProductId || movementData?.productId || variantKey.split('_')[0],
          productName,
          variantName,
          category,
          beginningStock,
          endingStock,
          averageInventory,
          totalUnitsSold: salesData.totalUnitsSold,
          totalSalesValue: salesData.totalSalesValue,
          transactionCount: salesData.transactionCount,
          turnoverRate,
          classification,
          classLabel,
          productAge,
          movementCount: movementData?.movements.length || 0,
          oldestMovementDate: movementData?.oldestMovement?.movementDate || null,
          newestMovementDate: movementData?.newestMovement?.movementDate || null
        });

        totalVariants++;
        totalUnitsSold += salesData.totalUnitsSold;
        totalAvgInventory += averageInventory;
      });

      // Sort by turnover rate (descending)
      productData.sort((a, b) => b.turnoverRate - a.turnoverRate);

      console.log(`✅ Processed ${totalVariants} valid variants (filtered out orphaned data)`);
      console.log(`📊 Classification: Class A: ${classACount}, Class B: ${classBCount}, Class C: ${classCCount}`);

      // ============================================================================
      // STEP 7: Calculate overall metrics
      // ============================================================================
      const averageTurnoverRate = totalAvgInventory > 0 
        ? totalUnitsSold / totalAvgInventory 
        : 0;

      const result = {
        // Overall metrics
        averageTurnoverRate,
        totalUnitsSold,
        totalAvgInventory,
        totalVariants,
        
        // Classification breakdown
        classACount,
        classBCount,
        classCCount,
        
        // Date range
        startDate,
        endDate,
        
        // Product-level data
        productData,
        
        // Chart data (for visualization)
        chartData: [
          { name: 'Class A', label: 'Fast Moving', value: classACount, color: '#22c55e' },
          { name: 'Class B', label: 'Moderate Moving', value: classBCount, color: '#3b82f6' },
          { name: 'Class C', label: 'Slow Moving', value: classCCount, color: '#ef4444' }
        ]
      };

      console.log('✅ Final result:', {
        averageTurnoverRate: averageTurnoverRate.toFixed(2),
        totalUnitsSold,
        totalAvgInventory: totalAvgInventory.toFixed(2),
        totalVariants,
        classACount,
        classBCount,
        classCCount
      });

      return result;
    } catch (error) {
      console.error('❌ Error calculating inventory turnover:', error);
      throw error;
    }
  }
}; 
