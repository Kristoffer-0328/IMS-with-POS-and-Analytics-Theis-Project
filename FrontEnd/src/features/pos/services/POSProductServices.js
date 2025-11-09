/**
 * POSProductServices.js
 * 
 * Service layer for POS product and variant operations.
 * Designed for the new flat Product & Variant architecture.
 * 
 * Architecture:
 * - Products collection: General product info (name, brand, category, image)
 * - Variants collection: Stock, price, location data per variant
 * 
 * POS Flow:
 * 1. Search/Browse products
 * 2. Select product → load variants
 * 3. Select variant → add to cart
 * 4. Checkout → deduct from variant stock
 */

import { 
  getFirestore,
  collection, 
  query, 
  where, 
  getDocs, 
  getDoc, 
  doc,
  orderBy,
  limit
} from 'firebase/firestore';
import app from '../../../FirebaseConfig';

const db = getFirestore(app);

// Collection names
const PRODUCTS_COLLECTION = 'Products';
const VARIANTS_COLLECTION = 'Variants';

/**
 * Search products for POS
 * Returns products with variant counts and stock info
 * 
 * @param {string} searchTerm - Search query (optional)
 * @param {string} category - Filter by category (optional)
 * @param {string} brand - Filter by brand (optional)
 * @returns {Promise<Array>} Products with variant metadata
 */
export const searchPOSProducts = async (searchTerm = '', category = null, brand = null) => {
  try {
    console.log('🔍 Searching POS products:', { searchTerm, category, brand });
    
    // Build query for Products collection
    const productsRef = collection(db, PRODUCTS_COLLECTION);
    let q = query(productsRef);
    
    // Apply filters
    if (category) {
      q = query(q, where('category', '==', category));
    }
    
    if (brand) {
      q = query(q, where('brand', '==', brand));
    }
    
    // Execute query
    const snapshot = await getDocs(q);
    console.log(`📦 Found ${snapshot.size} products in Products collection`);
    
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    // Client-side search filtering (Firestore doesn't support LIKE queries)
    let filtered = products;
    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      filtered = products.filter(p => 
        p.name?.toLowerCase().includes(query) ||
        p.brand?.toLowerCase().includes(query) ||
        p.category?.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }
    
    console.log(`🔍 After filtering: ${filtered.length} products`);
    
    // Enrich each product with variant data
    const enrichedProducts = await Promise.all(
      filtered.map(async (product) => {
        try {
          // Query variants for this product
          const variantsQuery = query(
            collection(db, VARIANTS_COLLECTION),
            where('parentProductId', '==', product.id)
          );
          const variantsSnap = await getDocs(variantsQuery);
          
          // Calculate aggregate data
          const variants = variantsSnap.docs.map(d => d.data());
          const totalStock = variants.reduce((sum, v) => sum + (v.quantity || 0), 0);
          const prices = variants.map(v => v.unitPrice).filter(p => p > 0);
          const minPrice = prices.length > 0 ? Math.min(...prices) : 0;
          const maxPrice = prices.length > 0 ? Math.max(...prices) : 0;
          
          return {
            ...product,
            variantCount: variantsSnap.size,
            totalStock,
            minPrice,
            maxPrice,
            priceRange: minPrice === maxPrice 
              ? `₱${minPrice.toFixed(2)}` 
              : `₱${minPrice.toFixed(2)} - ₱${maxPrice.toFixed(2)}`,
            hasMultipleVariants: variantsSnap.size > 1,
            isInStock: totalStock > 0,
            isLowStock: totalStock > 0 && totalStock <= 10
          };
        } catch (error) {
          console.error(`Error enriching product ${product.id}:`, error);
          return {
            ...product,
            variantCount: 0,
            totalStock: 0,
            minPrice: 0,
            maxPrice: 0,
            priceRange: 'N/A',
            hasMultipleVariants: false,
            isInStock: false
          };
        }
      })
    );
    
    console.log('✅ Products enriched with variant data');
    
    // Sort by name
    enrichedProducts.sort((a, b) => 
      (a.name || '').localeCompare(b.name || '')
    );
    
    return enrichedProducts;
  } catch (error) {
    console.error('❌ Error searching POS products:', error);
    throw new Error(`Failed to search products: ${error.message}`);
  }
};

/**
 * Get all variants for a specific product
 * 
 * @param {string} productId - Product document ID
 * @returns {Promise<Array>} Variants for this product
 */
export const getProductVariants = async (productId) => {
  try {
    console.log(`🔍 Fetching variants for product: ${productId}`);
    
    if (!productId) {
      throw new Error('Product ID is required');
    }
    
    // Query Variants collection
    const variantsQuery = query(
      collection(db, VARIANTS_COLLECTION),
      where('parentProductId', '==', productId),
      orderBy('variantName')
    );
    
    const snapshot = await getDocs(variantsQuery);
    console.log(`📦 Found ${snapshot.size} variants for product ${productId}`);
    
    const variants = snapshot.docs.map(doc => ({
      id: doc.id,
      variantId: doc.id, // Use Firestore document ID as variantId
      ...doc.data()
    }));
    
    // Sort variants by name/size
    variants.sort((a, b) => {
      const aName = a.variantName || a.packagingVariant || '';
      const bName = b.variantName || b.packagingVariant || '';
      return aName.localeCompare(bName);
    });
    
    return variants;
  } catch (error) {
    console.error(`❌ Error fetching variants for product ${productId}:`, error);
    throw new Error(`Failed to fetch product variants: ${error.message}`);
  }
};

/**
 * Get a specific variant by ID
 * 
 * @param {string} variantId - Variant document ID
 * @returns {Promise<object>} Variant data
 */
export const getVariant = async (variantId) => {
  try {
    console.log(`🔍 Fetching variant: ${variantId}`);
    
    if (!variantId) {
      throw new Error('Variant ID is required');
    }
    
    const variantRef = doc(db, VARIANTS_COLLECTION, variantId);
    const variantSnap = await getDoc(variantRef);
    
    if (!variantSnap.exists()) {
      throw new Error(`Variant ${variantId} not found`);
    }
    
    const variantData = {
      id: variantSnap.id,
      variantId: variantSnap.id,
      ...variantSnap.data()
    };
    
    console.log('✅ Variant fetched:', variantData.variantName);
    
    return variantData;
  } catch (error) {
    console.error(`❌ Error fetching variant ${variantId}:`, error);
    throw new Error(`Failed to fetch variant: ${error.message}`);
  }
};

/**
 * Get product details by ID
 * 
 * @param {string} productId - Product document ID
 * @returns {Promise<object>} Product data
 */
export const getProduct = async (productId) => {
  try {
    console.log(`🔍 Fetching product: ${productId}`);
    
    if (!productId) {
      throw new Error('Product ID is required');
    }
    
    const productRef = doc(db, PRODUCTS_COLLECTION, productId);
    const productSnap = await getDoc(productRef);
    
    if (!productSnap.exists()) {
      throw new Error(`Product ${productId} not found`);
    }
    
    const productData = {
      id: productSnap.id,
      ...productSnap.data()
    };
    
    console.log('✅ Product fetched:', productData.name);
    
    return productData;
  } catch (error) {
    console.error(`❌ Error fetching product ${productId}:`, error);
    throw new Error(`Failed to fetch product: ${error.message}`);
  }
};

/**
 * Check variant stock availability
 * 
 * @param {string} variantId - Variant document ID
 * @param {number} requestedQty - Requested quantity
 * @returns {Promise<object>} Availability status
 */
export const checkVariantAvailability = async (variantId, requestedQty) => {
  try {
    console.log(`🔍 Checking availability for variant ${variantId}, qty: ${requestedQty}`);
    
    const variant = await getVariant(variantId);
    const available = variant.quantity || 0;
    const isAvailable = available >= requestedQty;
    const shortage = Math.max(0, requestedQty - available);
    
    console.log(`📊 Availability check result:`, {
      available,
      requested: requestedQty,
      isAvailable,
      shortage
    });
    
    return {
      variantId,
      variantName: variant.variantName,
      available,
      requested: requestedQty,
      isAvailable,
      shortage,
      location: {
        storageLocation: variant.storageLocation,
        shelfName: variant.shelfName,
        rowName: variant.rowName,
        columnIndex: variant.columnIndex
      }
    };
  } catch (error) {
    console.error(`❌ Error checking variant availability:`, error);
    throw new Error(`Failed to check availability: ${error.message}`);
  }
};

/**
 * Batch check availability for multiple cart items
 * 
 * @param {Array} cartItems - Array of {variantId, quantity}
 * @returns {Promise<object>} Batch availability result
 */
export const checkCartAvailability = async (cartItems) => {
  try {
    console.log(`🔍 Checking availability for ${cartItems.length} cart items`);
    
    if (!cartItems || cartItems.length === 0) {
      return {
        allAvailable: true,
        unavailableItems: [],
        warnings: []
      };
    }
    
    const checks = await Promise.all(
      cartItems.map(item => 
        checkVariantAvailability(item.variantId, item.quantity)
      )
    );
    
    const unavailableItems = checks.filter(c => !c.isAvailable);
    const allAvailable = unavailableItems.length === 0;
    
    console.log(`📊 Cart availability:`, {
      totalItems: cartItems.length,
      available: checks.length - unavailableItems.length,
      unavailable: unavailableItems.length
    });
    
    return {
      allAvailable,
      unavailableItems,
      checks,
      totalItems: cartItems.length,
      availableCount: checks.length - unavailableItems.length,
      unavailableCount: unavailableItems.length
    };
  } catch (error) {
    console.error(`❌ Error checking cart availability:`, error);
    throw new Error(`Failed to check cart availability: ${error.message}`);
  }
};

/**
 * Get all unique categories from Products collection
 * 
 * @returns {Promise<Array>} List of categories
 */
export const getCategories = async () => {
  try {
    console.log('🔍 Fetching categories');
    
    const productsRef = collection(db, PRODUCTS_COLLECTION);
    const snapshot = await getDocs(productsRef);
    
    const categories = new Set();
    snapshot.docs.forEach(doc => {
      const category = doc.data().category;
      if (category) {
        categories.add(category);
      }
    });
    
    const categoriesList = Array.from(categories).sort();
    console.log(`✅ Found ${categoriesList.length} categories`);
    
    return categoriesList;
  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    throw new Error(`Failed to fetch categories: ${error.message}`);
  }
};

/**
 * Get all unique brands from Products collection
 * 
 * @returns {Promise<Array>} List of brands
 */
export const getBrands = async () => {
  try {
    console.log('🔍 Fetching brands');
    
    const productsRef = collection(db, PRODUCTS_COLLECTION);
    const snapshot = await getDocs(productsRef);
    
    const brands = new Set();
    snapshot.docs.forEach(doc => {
      const brand = doc.data().brand;
      if (brand) {
        brands.add(brand);
      }
    });
    
    const brandsList = Array.from(brands).sort();
    console.log(`✅ Found ${brandsList.length} brands`);
    
    return brandsList;
  } catch (error) {
    console.error('❌ Error fetching brands:', error);
    throw new Error(`Failed to fetch brands: ${error.message}`);
  }
};

/**
 * Get low stock variants (for alerts/warnings)
 * 
 * @param {number} threshold - Stock threshold (default: 10)
 * @returns {Promise<Array>} Low stock variants
 */
export const getLowStockVariants = async (threshold = 10) => {
  try {
    console.log(`🔍 Fetching low stock variants (threshold: ${threshold})`);
    
    const variantsRef = collection(db, VARIANTS_COLLECTION);
    const variantsSnap = await getDocs(variantsRef);
    
    const lowStockVariants = [];
    
    variantsSnap.docs.forEach(doc => {
      const variant = doc.data();
      const quantity = variant.quantity || 0;
      
      if (quantity <= threshold && quantity > 0) {
        lowStockVariants.push({
          id: doc.id,
          variantId: doc.id,
          ...variant,
          stockLevel: quantity
        });
      }
    });
    
    // Sort by quantity (lowest first)
    lowStockVariants.sort((a, b) => a.stockLevel - b.stockLevel);
    
    console.log(`⚠️ Found ${lowStockVariants.length} low stock variants`);
    
    return lowStockVariants;
  } catch (error) {
    console.error('❌ Error fetching low stock variants:', error);
    throw new Error(`Failed to fetch low stock variants: ${error.message}`);
  }
};

/**
 * Search variants directly (for quick search/barcode lookup)
 * 
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} Matching variants
 */
export const searchVariants = async (searchTerm) => {
  try {
    console.log(`🔍 Searching variants: ${searchTerm}`);
    
    if (!searchTerm || searchTerm.trim().length < 2) {
      return [];
    }
    
    const variantsRef = collection(db, VARIANTS_COLLECTION);
    const snapshot = await getDocs(variantsRef);
    
    const query = searchTerm.toLowerCase();
    const matchingVariants = [];
    
    snapshot.docs.forEach(doc => {
      const variant = doc.data();
      
      // Search in multiple fields
      const matches = 
        variant.productName?.toLowerCase().includes(query) ||
        variant.variantName?.toLowerCase().includes(query) ||
        variant.productBrand?.toLowerCase().includes(query) ||
        variant.variantSKU?.toLowerCase().includes(query) ||
        variant.packagingVariant?.toLowerCase().includes(query);
      
      if (matches) {
        matchingVariants.push({
          id: doc.id,
          variantId: doc.id,
          ...variant
        });
      }
    });
    
    console.log(`✅ Found ${matchingVariants.length} matching variants`);
    
    return matchingVariants;
  } catch (error) {
    console.error('❌ Error searching variants:', error);
    throw new Error(`Failed to search variants: ${error.message}`);
  }
};

// Export all functions
export default {
  searchPOSProducts,
  getProductVariants,
  getVariant,
  getProduct,
  checkVariantAvailability,
  checkCartAvailability,
  getCategories,
  getBrands,
  getLowStockVariants,
  searchVariants
};
