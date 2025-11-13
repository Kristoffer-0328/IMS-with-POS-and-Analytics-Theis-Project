import { 
    getFirestore, 
    collection, 
    doc, 
    getDoc, 
    getDocs, 
    setDoc, 
    updateDoc, 
    deleteDoc, 
    query, 
    where, 
    orderBy, 
    limit,
    startAfter,
    writeBatch
} from 'firebase/firestore';
import app from '../../FirebaseConfig';

const db = getFirestore(app);
const VARIANTS_COLLECTION = 'Variants';
const PRODUCTS_COLLECTION = 'Products';

/**
 * VariantServices - Service layer for managing Product Variants
 * 
 * This service handles all Firestore operations for the Variants collection,
 * which stores variant-specific data (stock, price, location, suppliers).
 * 
 * Architecture:
 * - Products/{productId} - Contains general product info only
 * - Variants/{variantId} - Contains variant-specific data with parentProductId reference
 * 
 * Each variant denormalizes key product info for efficient queries.
 */

/**
 * Create a new variant and update parent product aggregate stats
 * @param {Object} variantData - Complete variant data from ProductFactory.createVariant()
 * @returns {Promise<Object>} Created variant document
 */
export const createVariant = async (variantData) => {
    try {
        if (!variantData.id) {
            throw new Error('Variant ID is required');
        }
        if (!variantData.parentProductId) {
            throw new Error('Parent product ID is required');
        }

        // Save variant to Firestore
        const variantRef = doc(db, VARIANTS_COLLECTION, variantData.id);
        await setDoc(variantRef, variantData);

        // Update product aggregate stats
        await updateProductAggregateStats(variantData.parentProductId);

        console.log('✅ Variant created:', variantData.id);
        return variantData;
    } catch (error) {
        console.error('❌ Error creating variant:', error);
        throw error;
    }
};

/**
 * Get a single variant by ID
 * @param {string} variantId - The variant document ID
 * @returns {Promise<Object|null>} Variant data or null if not found
 */
export const getVariantById = async (variantId) => {
    try {
        const variantRef = doc(db, VARIANTS_COLLECTION, variantId);
        const variantSnap = await getDoc(variantRef);

        if (variantSnap.exists()) {
            return { id: variantSnap.id, ...variantSnap.data() };
        } else {
            console.warn('⚠️ Variant not found:', variantId);
            return null;
        }
    } catch (error) {
        console.error('❌ Error fetching variant:', error);
        throw error;
    }
};

/**
 * Get all variants for a specific product
 * @param {string} productId - The parent product ID
 * @param {Object} options - Query options (orderByField, limitCount)
 * @returns {Promise<Array>} Array of variant objects
 */
export const getVariantsByProduct = async (productId, options = {}) => {
    try {
        const { 
            orderByField = 'createdAt', 
            orderDirection = 'desc', 
            limitCount = null 
        } = options;

        let q = query(
            collection(db, VARIANTS_COLLECTION),
            where('parentProductId', '==', productId),
            orderBy(orderByField, orderDirection)
        );

        if (limitCount) {
            q = query(q, limit(limitCount));
        }

        const querySnapshot = await getDocs(q);
        const variants = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log(`✅ Found ${variants.length} variants for product ${productId}`);
        return variants;
    } catch (error) {
        console.error('❌ Error fetching variants by product:', error);
        throw error;
    }
};

/**
 * Get all variants at a specific storage location
 * @param {string} storageLocation - Unit name (e.g., "Unit 01")
 * @param {string} shelfName - Optional shelf filter
 * @param {string} rowName - Optional row filter
 * @returns {Promise<Array>} Array of variant objects
 */
export const getVariantsByLocation = async (storageLocation, shelfName = null, rowName = null) => {
    try {
        let q = query(
            collection(db, VARIANTS_COLLECTION),
            where('storageLocation', '==', storageLocation)
        );

        if (shelfName) {
            q = query(q, where('shelfName', '==', shelfName));
        }

        if (rowName) {
            q = query(q, where('rowName', '==', rowName));
        }

        q = query(q, orderBy('createdAt', 'desc'));

        const querySnapshot = await getDocs(q);
        const variants = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log(`✅ Found ${variants.length} variants at location ${storageLocation}`);
        return variants;
    } catch (error) {
        console.error('❌ Error fetching variants by location:', error);
        throw error;
    }
};

/**
 * Search variants by product name, brand, category, or variant name
 * @param {string} searchTerm - Search query string
 * @param {Object} filters - Additional filters (category, measurementType, etc.)
 * @returns {Promise<Array>} Array of matching variant objects
 */
export const searchVariants = async (searchTerm, filters = {}) => {
    try {
        // Firestore doesn't support full-text search, so we query all and filter client-side
        // For production, consider using Algolia or Elastic Search
        
        let q = collection(db, VARIANTS_COLLECTION);
        
        // Apply filters if provided
        if (filters.category) {
            q = query(q, where('productCategory', '==', filters.category));
        }
        if (filters.measurementType) {
            q = query(q, where('measurementType', '==', filters.measurementType));
        }
        if (filters.storageLocation) {
            q = query(q, where('storageLocation', '==', filters.storageLocation));
        }

        const querySnapshot = await getDocs(q);
        let variants = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Client-side filtering for search term
        if (searchTerm && searchTerm.trim() !== '') {
            const lowerSearch = searchTerm.toLowerCase();
            variants = variants.filter(variant => {
                const productName = (variant.productName || '').toLowerCase();
                const productBrand = (variant.productBrand || '').toLowerCase();
                const variantName = (variant.variantName || '').toLowerCase();
                const category = (variant.productCategory || '').toLowerCase();
                
                return productName.includes(lowerSearch) ||
                       productBrand.includes(lowerSearch) ||
                       variantName.includes(lowerSearch) ||
                       category.includes(lowerSearch) ||
                       variant.id.toLowerCase().includes(lowerSearch);
            });
        }

        console.log(`✅ Search found ${variants.length} variants for "${searchTerm}"`);
        return variants;
    } catch (error) {
        console.error('❌ Error searching variants:', error);
        throw error;
    }
};

/**
 * Get variants with low stock (below safety stock level)
 * @param {number} threshold - Optional custom threshold multiplier (default: 1.0 = at or below safety stock)
 * @returns {Promise<Array>} Array of low-stock variants
 */
export const getLowStockVariants = async (threshold = 1.0) => {
    try {
        // Get all variants (Firestore doesn't support comparing two fields directly)
        const querySnapshot = await getDocs(collection(db, VARIANTS_COLLECTION));
        
        const lowStockVariants = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(variant => {
                const quantity = variant.quantity || 0;
                const safetyStock = variant.safetyStock || 0;
                
                // Consider low stock if quantity <= (safetyStock * threshold)
                return quantity <= (safetyStock * threshold);
            })
            .sort((a, b) => {
                // Sort by urgency: lowest stock percentage first
                const aPercent = a.safetyStock > 0 ? a.quantity / a.safetyStock : 0;
                const bPercent = b.safetyStock > 0 ? b.quantity / b.safetyStock : 0;
                return aPercent - bPercent;
            });

        console.log(`✅ Found ${lowStockVariants.length} low-stock variants`);
        return lowStockVariants;
    } catch (error) {
        console.error('❌ Error fetching low-stock variants:', error);
        throw error;
    }
};

/**
 * Get variants that are out of stock (quantity = 0)
 * @returns {Promise<Array>} Array of out-of-stock variants
 */
export const getOutOfStockVariants = async () => {
    try {
        const q = query(
            collection(db, VARIANTS_COLLECTION),
            where('quantity', '==', 0)
        );

        const querySnapshot = await getDocs(q);
        const variants = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        console.log(`✅ Found ${variants.length} out-of-stock variants`);
        return variants;
    } catch (error) {
        console.error('❌ Error fetching out-of-stock variants:', error);
        throw error;
    }
};

/**
 * Update variant information
 * @param {string} variantId - The variant document ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<void>}
 */
export const updateVariant = async (variantId, updates) => {
    try {
        const variantRef = doc(db, VARIANTS_COLLECTION, variantId);
        
        // Add lastUpdated timestamp
        const updateData = {
            ...updates,
            lastUpdated: new Date().toISOString()
        };

        await updateDoc(variantRef, updateData);

        // If quantity or unitPrice changed, update product aggregate stats
        if (updates.hasOwnProperty('quantity') || updates.hasOwnProperty('unitPrice')) {
            const variantDoc = await getDoc(variantRef);
            if (variantDoc.exists()) {
                const variantData = variantDoc.data();
                await updateProductAggregateStats(variantData.parentProductId);
            }
        }

        console.log('✅ Variant updated:', variantId);
    } catch (error) {
        console.error('❌ Error updating variant:', error);
        throw error;
    }
};

/**
 * Update variant stock quantity and optionally log the reason
 * @param {string} variantId - The variant document ID
 * @param {number} newQuantity - New quantity value
 * @param {string} reason - Reason for stock change (e.g., "Sale", "Restock", "Adjustment")
 * @param {Object} additionalData - Additional data to log (e.g., transaction ID, user ID)
 * @returns {Promise<void>}
 */
export const updateVariantStock = async (variantId, newQuantity, reason = 'Manual Adjustment', additionalData = {}) => {
    try {
        const variantRef = doc(db, VARIANTS_COLLECTION, variantId);
        const variantSnap = await getDoc(variantRef);

        if (!variantSnap.exists()) {
            throw new Error(`Variant ${variantId} not found`);
        }

        const oldQuantity = variantSnap.data().quantity || 0;
        const quantityChange = newQuantity - oldQuantity;

        // Update variant quantity
        await updateDoc(variantRef, {
            quantity: newQuantity,
            lastUpdated: new Date().toISOString()
        });

        // Update product aggregate stats (gracefully handle missing parent product)
        const variantData = variantSnap.data();
        if (variantData.parentProductId) {
            try {
                await updateProductAggregateStats(variantData.parentProductId);
            } catch (statsError) {
                console.warn('⚠️ Could not update parent product stats, but variant was updated successfully');
                // Continue - variant update succeeded, stats update is non-critical
            }
        }

        console.log(`✅ Stock updated for variant ${variantId}: ${oldQuantity} → ${newQuantity} (${quantityChange > 0 ? '+' : ''}${quantityChange})`);
        console.log(`   Reason: ${reason}`);

        // TODO: Consider implementing a StockMovements collection to track history
        // This would be useful for audit trails and analytics

    } catch (error) {
        console.error('❌ Error updating variant stock:', error);
        throw error;
    }
};

/**
 * Delete a variant and update parent product aggregate stats
 * @param {string} variantId - The variant document ID
 * @returns {Promise<void>}
 */
export const deleteVariant = async (variantId) => {
    try {
        const variantRef = doc(db, VARIANTS_COLLECTION, variantId);
        const variantSnap = await getDoc(variantRef);

        if (!variantSnap.exists()) {
            throw new Error(`Variant ${variantId} not found`);
        }

        const variantData = variantSnap.data();
        const parentProductId = variantData.parentProductId;

        // Delete the variant
        await deleteDoc(variantRef);

        // Update product aggregate stats
        await updateProductAggregateStats(parentProductId);

        console.log('✅ Variant deleted:', variantId);
    } catch (error) {
        console.error('❌ Error deleting variant:', error);
        throw error;
    }
};

/**
 * Delete all variants for a specific product
 * @param {string} productId - The parent product ID
 * @returns {Promise<number>} Number of variants deleted
 */
export const deleteVariantsByProduct = async (productId) => {
    try {
        const variants = await getVariantsByProduct(productId);
        
        if (variants.length === 0) {
            console.log('ℹ️ No variants to delete for product:', productId);
            return 0;
        }

        // Use batch delete for efficiency
        const batch = writeBatch(db);
        variants.forEach(variant => {
            const variantRef = doc(db, VARIANTS_COLLECTION, variant.id);
            batch.delete(variantRef);
        });

        await batch.commit();
        console.log(`✅ Deleted ${variants.length} variants for product ${productId}`);
        
        return variants.length;
    } catch (error) {
        console.error('❌ Error deleting variants by product:', error);
        throw error;
    }
};

/**
 * Get variants by supplier
 * @param {string} supplierId - The supplier ID
 * @returns {Promise<Array>} Array of variants supplied by this supplier
 */
export const getVariantsBySupplier = async (supplierId) => {
    try {
        // Get all variants (Firestore doesn't support array-contains with object matching)
        const querySnapshot = await getDocs(collection(db, VARIANTS_COLLECTION));
        
        const variants = querySnapshot.docs
            .map(doc => ({ id: doc.id, ...doc.data() }))
            .filter(variant => {
                const suppliers = variant.suppliers || [];
                return suppliers.some(supplier => supplier.id === supplierId);
            });

        console.log(`✅ Found ${variants.length} variants for supplier ${supplierId}`);
        return variants;
    } catch (error) {
        console.error('❌ Error fetching variants by supplier:', error);
        throw error;
    }
};

/**
 * Update product aggregate statistics based on all its variants
 * This calculates totalVariants, totalStock, lowestPrice, highestPrice
 * @param {string} productId - The product document ID
 * @returns {Promise<void>}
 */
export const updateProductAggregateStats = async (productId) => {
    try {
        // First check if the product document exists
        const productRef = doc(db, PRODUCTS_COLLECTION, productId);
        const productSnap = await getDoc(productRef);
        
        if (!productSnap.exists()) {
            console.warn(`⚠️ Product ${productId} does not exist in Products collection - skipping aggregate stats update`);
            console.log('💡 This is normal if variants were created without a parent product document');
            return; // Gracefully exit - this is not an error
        }
        
        // Get all variants for this product
        const variants = await getVariantsByProduct(productId);

        // Calculate aggregate stats
        const totalVariants = variants.length;
        const totalStock = variants.reduce((sum, v) => sum + (v.quantity || 0), 0);
        
        const prices = variants
            .map(v => v.unitPrice)
            .filter(price => price != null && price > 0);
        
        const lowestPrice = prices.length > 0 ? Math.min(...prices) : null;
        const highestPrice = prices.length > 0 ? Math.max(...prices) : null;

        // Update product document
        await updateDoc(productRef, {
            totalVariants,
            totalStock,
            lowestPrice,
            highestPrice,
            lastUpdated: new Date().toISOString()
        });

        console.log(`✅ Updated aggregate stats for product ${productId}:`, {
            totalVariants,
            totalStock,
            lowestPrice,
            highestPrice
        });
    } catch (error) {
        console.error('❌ Error updating product aggregate stats:', error);
        throw error;
    }
};

/**
 * Get variant statistics (total count, total stock value, etc.)
 * @param {Object} filters - Optional filters (productId, category, location)
 * @returns {Promise<Object>} Statistics object
 */
export const getVariantStatistics = async (filters = {}) => {
    try {
        let q = collection(db, VARIANTS_COLLECTION);

        if (filters.productId) {
            q = query(q, where('parentProductId', '==', filters.productId));
        }
        if (filters.category) {
            q = query(q, where('productCategory', '==', filters.category));
        }
        if (filters.storageLocation) {
            q = query(q, where('storageLocation', '==', filters.storageLocation));
        }

        const querySnapshot = await getDocs(q);
        const variants = querySnapshot.docs.map(doc => doc.data());

        const stats = {
            totalVariants: variants.length,
            totalStock: variants.reduce((sum, v) => sum + (v.quantity || 0), 0),
            totalValue: variants.reduce((sum, v) => {
                const qty = v.quantity || 0;
                const price = v.unitPrice || 0;
                return sum + (qty * price);
            }, 0),
            lowStockCount: variants.filter(v => {
                const qty = v.quantity || 0;
                const safety = v.safetyStock || 0;
                return qty <= safety;
            }).length,
            outOfStockCount: variants.filter(v => (v.quantity || 0) === 0).length,
            averagePrice: 0,
            measurementTypes: {}
        };

        // Calculate average price
        const pricesWithStock = variants.filter(v => (v.quantity || 0) > 0);
        if (pricesWithStock.length > 0) {
            const totalPrice = pricesWithStock.reduce((sum, v) => sum + (v.unitPrice || 0), 0);
            stats.averagePrice = totalPrice / pricesWithStock.length;
        }

        // Count by measurement type
        variants.forEach(v => {
            const type = v.measurementType || 'unknown';
            stats.measurementTypes[type] = (stats.measurementTypes[type] || 0) + 1;
        });

        console.log('✅ Variant statistics calculated:', stats);
        return stats;
    } catch (error) {
        console.error('❌ Error calculating variant statistics:', error);
        throw error;
    }
};

/**
 * Bulk update variants (useful for batch operations)
 * @param {Array<Object>} updates - Array of {variantId, updates} objects
 * @returns {Promise<void>}
 */
export const bulkUpdateVariants = async (updates) => {
    try {
        const batch = writeBatch(db);
        const timestamp = new Date().toISOString();

        updates.forEach(({ variantId, updates: variantUpdates }) => {
            const variantRef = doc(db, VARIANTS_COLLECTION, variantId);
            batch.update(variantRef, {
                ...variantUpdates,
                lastUpdated: timestamp
            });
        });

        await batch.commit();
        console.log(`✅ Bulk updated ${updates.length} variants`);

        // Update product aggregate stats for affected products
        const productIds = new Set();
        for (const update of updates) {
            if (update.updates.quantity || update.updates.unitPrice) {
                const variantDoc = await getDoc(doc(db, VARIANTS_COLLECTION, update.variantId));
                if (variantDoc.exists()) {
                    productIds.add(variantDoc.data().parentProductId);
                }
            }
        }

        for (const productId of productIds) {
            await updateProductAggregateStats(productId);
        }
    } catch (error) {
        console.error('❌ Error bulk updating variants:', error);
        throw error;
    }
};

/**
 * Get paginated variants
 * @param {Object} options - Pagination options
 * @returns {Promise<Object>} Object with variants array and lastDoc for pagination
 */
export const getPaginatedVariants = async (options = {}) => {
    try {
        const {
            limitCount = 20,
            orderByField = 'createdAt',
            orderDirection = 'desc',
            lastDocument = null,
            filters = {}
        } = options;

        let q = collection(db, VARIANTS_COLLECTION);

        // Apply filters
        if (filters.productId) {
            q = query(q, where('parentProductId', '==', filters.productId));
        }
        if (filters.category) {
            q = query(q, where('productCategory', '==', filters.category));
        }
        if (filters.storageLocation) {
            q = query(q, where('storageLocation', '==', filters.storageLocation));
        }

        // Apply ordering
        q = query(q, orderBy(orderByField, orderDirection));

        // Apply pagination
        if (lastDocument) {
            q = query(q, startAfter(lastDocument));
        }

        q = query(q, limit(limitCount));

        const querySnapshot = await getDocs(q);
        const variants = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        const lastDoc = querySnapshot.docs[querySnapshot.docs.length - 1];

        console.log(`✅ Fetched ${variants.length} variants (paginated)`);
        return {
            variants,
            lastDocument: lastDoc,
            hasMore: variants.length === limitCount
        };
    } catch (error) {
        console.error('❌ Error fetching paginated variants:', error);
        throw error;
    }
};

/**
 * Export all variant services
 */
export default {
    // CRUD operations
    createVariant,
    getVariantById,
    updateVariant,
    deleteVariant,
    
    // Query operations
    getVariantsByProduct,
    getVariantsByLocation,
    getVariantsBySupplier,
    searchVariants,
    getPaginatedVariants,
    
    // Stock operations
    updateVariantStock,
    getLowStockVariants,
    getOutOfStockVariants,
    
    // Bulk operations
    deleteVariantsByProduct,
    bulkUpdateVariants,
    
    // Analytics
    updateProductAggregateStats,
    getVariantStatistics
};
