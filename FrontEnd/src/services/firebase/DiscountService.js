import { getFirestore, doc, updateDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import moment from 'moment';
import app from '../../FirebaseConfig';
import { ReportingService } from './ReportingService';

const db = getFirestore(app);

/**
 * DiscountService - Manage product discounts and sales
 * 
 * Features:
 * - Detect slow-moving Class C products
 * - Apply/remove discounts on variants
 * - Suggest discounts based on turnover analysis
 */
export const DiscountService = {
  /**
   * Analyze a variant's performance and suggest if it needs a discount
   * @param {string} variantId - Variant ID
   * @returns {Promise<Object>} Suggestion result
   */
  async analyzeSaleNeed(variantId) {
    try {
      console.log('🔍 Analyzing sale need for variant:', variantId);

      // Get variant details
      const variantRef = doc(db, 'Variants', variantId);
      const variantSnap = await getDoc(variantRef);

      if (!variantSnap.exists()) {
        return { success: false, error: 'Variant not found' };
      }

      const variant = variantSnap.data();

      // Check if already on sale
      if (variant.onSale) {
        return {
          success: true,
          needsSale: false,
          reason: 'Already on sale',
          currentDiscount: variant.discountPercentage || 0,
          variant: variant
        };
      }

      // Analyze last 30 days turnover
      const endDate = moment().format('YYYY-MM-DD');
      const startDate = moment().subtract(30, 'days').format('YYYY-MM-DD');

      const turnoverData = await ReportingService.getInventoryTurnover(startDate, endDate);

      // Find this variant in the turnover data
      const variantData = turnoverData.productData?.find(
        p => p.variantId === variantId || p.variantId.includes(variantId)
      );

      if (!variantData) {
        return {
          success: true,
          needsSale: false,
          reason: 'No sales data available',
          variant: variant
        };
      }

      // Check if it's Class C and slow-moving
      const isSlowMoving = variantData.classification === 'Class C';
      const turnoverRate = variantData.turnoverRate;
      const productAge = variantData.productAge;

      // Suggest sale if:
      // 1. Class C (turnover < 4x)
      // 2. Product age > 30 days
      // 3. Has stock
      const needsSale = isSlowMoving && productAge > 30 && variant.quantity > 0;

      let suggestionLevel = 'none';
      let suggestedDiscount = 0;

      if (needsSale) {
        // Determine suggestion level based on severity
        if (turnoverRate < 1 && productAge > 90) {
          suggestionLevel = 'urgent'; // Very slow, old stock
          suggestedDiscount = 25; // 25% discount
        } else if (turnoverRate < 2 && productAge > 60) {
          suggestionLevel = 'high'; // Slow, aging stock
          suggestedDiscount = 15; // 15% discount
        } else {
          suggestionLevel = 'moderate'; // Moderate concern
          suggestedDiscount = 10; // 10% discount
        }
      }

      return {
        success: true,
        needsSale,
        suggestionLevel,
        suggestedDiscount,
        reason: needsSale
          ? `Product is ${variantData.classLabel}, ${productAge} days old, with ${turnoverRate.toFixed(2)}x turnover rate`
          : 'Product is performing well',
        analytics: {
          classification: variantData.classification,
          turnoverRate: turnoverRate,
          productAge,
          currentStock: variant.quantity,
          unitsSold: variantData.totalUnitsSold
        },
        variant: variant
      };
    } catch (error) {
      console.error('❌ Error analyzing sale need:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Apply discount to a variant
   * @param {string} variantId - Variant ID
   * @param {number} discountPercentage - Discount percentage (0-100)
   * @param {Object} options - Additional options
   * @returns {Promise<Object>} Success status
   */
  async applyDiscount(variantId, discountPercentage, options = {}) {
    try {
      console.log('💰 Applying discount:', { variantId, discountPercentage, options });

      if (discountPercentage < 0 || discountPercentage > 100) {
        return { success: false, error: 'Discount must be between 0-100%' };
      }

      const variantRef = doc(db, 'Variants', variantId);
      const variantSnap = await getDoc(variantRef);

      if (!variantSnap.exists()) {
        return { success: false, error: 'Variant not found' };
      }

      const variant = variantSnap.data();
      const originalPrice = variant.unitPrice || 0;
      const discountAmount = (originalPrice * discountPercentage) / 100;
      const salePrice = originalPrice - discountAmount;

      const updateData = {
        onSale: true,
        discountPercentage: discountPercentage,
        originalPrice: originalPrice,
        salePrice: salePrice,
        saleStartDate: options.startDate || new Date().toISOString(),
        saleEndDate: options.endDate || null,
        saleReason: options.reason || 'Promotional Sale',
        lastUpdated: new Date().toISOString(),
        updatedBy: options.updatedBy || null
      };

      await updateDoc(variantRef, updateData);

      console.log('✅ Discount applied successfully');
      return {
        success: true,
        variantId,
        originalPrice,
        salePrice,
        discountPercentage,
        savingsAmount: discountAmount
      };
    } catch (error) {
      console.error('❌ Error applying discount:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Remove discount from a variant
   * @param {string} variantId - Variant ID
   * @returns {Promise<Object>} Success status
   */
  async removeDiscount(variantId) {
    try {
      console.log('🔄 Removing discount from variant:', variantId);

      const variantRef = doc(db, 'Variants', variantId);
      const variantSnap = await getDoc(variantRef);

      if (!variantSnap.exists()) {
        return { success: false, error: 'Variant not found' };
      }

      const updateData = {
        onSale: false,
        discountPercentage: 0,
        salePrice: null,
        saleStartDate: null,
        saleEndDate: null,
        saleReason: null,
        lastUpdated: new Date().toISOString()
      };

      // Keep originalPrice for reference but don't remove it

      await updateDoc(variantRef, updateData);

      console.log('✅ Discount removed successfully');
      return { success: true, variantId };
    } catch (error) {
      console.error('❌ Error removing discount:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Get all variants currently on sale
   * @returns {Promise<Array>} List of variants on sale
   */
  async getVariantsOnSale() {
    try {
      const variantsRef = collection(db, 'Variants');
      const q = query(variantsRef, where('onSale', '==', true));
      const snapshot = await getDocs(q);

      const variants = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return { success: true, variants };
    } catch (error) {
      console.error('❌ Error fetching sale variants:', error);
      return { success: false, error: error.message };
    }
  },

  /**
   * Bulk analyze all variants and suggest discounts
   * @returns {Promise<Object>} Analysis results
   */
  async analyzeAllVariantsForSales() {
    try {
      console.log('🔍 Analyzing all variants for sale opportunities...');

      // Get last 30 days turnover data
      const endDate = moment().format('YYYY-MM-DD');
      const startDate = moment().subtract(30, 'days').format('YYYY-MM-DD');

      const turnoverData = await ReportingService.getInventoryTurnover(startDate, endDate);

      // Filter Class C products with age > 30 days
      const slowMovingProducts = turnoverData.productData?.filter(
        p => p.classification === 'Class C' && p.productAge > 30
      ) || [];

      // Get variant details for each
      const suggestions = [];

      for (const product of slowMovingProducts) {
        const variantRef = doc(db, 'Variants', product.variantId);
        const variantSnap = await getDoc(variantRef);

        if (variantSnap.exists()) {
          const variant = variantSnap.data();

          // Skip if already on sale
          if (variant.onSale) continue;

          // Determine suggestion level
          let suggestionLevel = 'moderate';
          let suggestedDiscount = 10;

          if (product.turnoverRate < 1 && product.productAge > 90) {
            suggestionLevel = 'urgent';
            suggestedDiscount = 25;
          } else if (product.turnoverRate < 2 && product.productAge > 60) {
            suggestionLevel = 'high';
            suggestedDiscount = 15;
          }

          suggestions.push({
            variantId: product.variantId,
            productName: product.productName,
            variantName: product.variantName,
            category: product.category,
            currentPrice: variant.unitPrice,
            currentStock: variant.quantity,
            classification: product.classification,
            turnoverRate: product.turnoverRate,
            productAge: product.productAge,
            unitsSold: product.totalUnitsSold,
            suggestionLevel,
            suggestedDiscount,
            estimatedSalePrice: variant.unitPrice * (1 - suggestedDiscount / 100)
          });
        }
      }

      // Sort by urgency
      const urgencyOrder = { urgent: 0, high: 1, moderate: 2 };
      suggestions.sort((a, b) => urgencyOrder[a.suggestionLevel] - urgencyOrder[b.suggestionLevel]);

      console.log(`✅ Found ${suggestions.length} variants that need sales/discounts`);

      return {
        success: true,
        totalAnalyzed: turnoverData.totalVariants,
        slowMovingCount: slowMovingProducts.length,
        suggestionsCount: suggestions.length,
        suggestions
      };
    } catch (error) {
      console.error('❌ Error analyzing variants for sales:', error);
      return { success: false, error: error.message };
    }
  }
};

export default DiscountService;
