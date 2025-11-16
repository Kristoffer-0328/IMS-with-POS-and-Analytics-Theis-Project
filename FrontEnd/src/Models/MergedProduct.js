/**
 * MergedProduct.js
 * 
 * Data model for merged product structure used across POS and Inventory modules.
 * 
 * Architecture:
 * - Master Collection: General product info (name, brand, category, image, description)
 * - Variants Collection: Stock, price, location, dimensions per variant
 * - Suppliers Collection: Supplier information with product subcollection links
 * 
 * This model ensures type consistency and prevents duplicated mapping logic.
 */

/**
 * Supplier structure
 * @typedef {Object} Supplier
 * @property {string} id - Supplier document ID
 * @property {string} name - Supplier name
 * @property {string} primaryCode - Primary supplier code
 * @property {string} address - Supplier address
 * @property {string} contactPerson - Contact person name
 * @property {string} phone - Contact phone number
 * @property {string} email - Contact email
 * @property {Array<string>} supplierCodes - Additional supplier codes
 * @property {number} leadTime - Lead time in days
 * @property {string} status - Supplier status (active, inactive)
 */

/**
 * Variant structure with all related data
 * @typedef {Object} MergedVariant
 * @property {string} variantId - Variant document ID
 * @property {string} variantName - Variant display name
 * @property {string} brand - Product brand
 * @property {string} image - Variant image URL (fallback to product image)
 * 
 * Pricing & Stock
 * @property {number} unitPrice - Current unit price
 * @property {number} price - Alias for unitPrice
 * @property {number} quantity - Current stock quantity
 * @property {number} totalQuantity - Alias for quantity
 * 
 * Sale/Discount info
 * @property {boolean} onSale - Whether variant is on sale
 * @property {number|null} salePrice - Sale price (if on sale)
 * @property {number} originalPrice - Original price before discount
 * @property {number} discountPercentage - Discount percentage
 * 
 * Units & Sizing
 * @property {string} size - Variant size
 * @property {string} unit - Unit of measurement (pcs, kg, liter, etc.)
 * @property {string} baseUnit - Base unit of measurement
 * 
 * Bundle info
 * @property {boolean} isBundle - Whether this is a bundle/package
 * @property {number|null} piecesPerBundle - Number of pieces per bundle
 * @property {string|null} bundlePackagingType - Bundle packaging type description
 * 
 * Dimensional/Spec info
 * @property {string} measurementType - Type of measurement (dimensional, weight, volume, discrete)
 * @property {number|null} length - Length dimension
 * @property {number|null} width - Width dimension
 * @property {number|null} thickness - Thickness dimension
 * @property {number|null} unitWeightKg - Weight in kg
 * @property {number|null} unitVolumeLiters - Volume in liters
 * @property {string} specifications - Additional specifications
 * 
 * Storage info
 * @property {string} storageLocation - Storage location/unit
 * @property {string} shelfName - Shelf name
 * @property {string} rowName - Row name
 * 
 * Supplier info
 * @property {Array<Supplier>} suppliers - List of suppliers for this variant
 * @property {Object|null} primarySupplier - Primary supplier (first in list)
 */

/**
 * Merged product structure combining Master + Variants + Suppliers
 * @typedef {Object} MergedProduct
 * @property {string} id - Product document ID from Master collection
 * @property {string} name - Product name
 * @property {string} image - Product image URL
 * @property {string} category - Product category
 * @property {string} brand - Product brand
 * @property {string} description - Product description
 * @property {Array<MergedVariant>} variants - Array of variants with full data
 * @property {number} totalStock - Aggregate stock across all variants
 * @property {number} totalVariants - Total number of variants
 * @property {number} lowestPrice - Lowest price across all variants
 * @property {number} highestPrice - Highest price across all variants
 * @property {boolean} hasMultipleVariants - Whether product has multiple variants
 * @property {boolean} isInStock - Whether product has any stock
 * @property {Array<string>} allSuppliers - Unique list of all supplier names
 */

/**
 * Create a merged variant object
 * @param {Object} variantData - Raw variant data from Variants collection
 * @param {Object} productData - Product data from Master collection
 * @param {Array<Supplier>} suppliers - Supplier list for this variant
 * @returns {MergedVariant}
 */
export const createMergedVariant = (variantData, productData, suppliers = []) => {
  return {
    // Identity
    variantId: variantData.id,
    variantName: variantData.variantName || variantData.name,
    brand: variantData.brand || productData.brand || 'Generic',
    image: variantData.image || variantData.imageUrl || productData.image,

    // Pricing & stock
    unitPrice: variantData.unitPrice || variantData.price || 0,
    price: variantData.unitPrice || variantData.price || 0,
    quantity: variantData.quantity || 0,
    totalQuantity: variantData.quantity || 0,
    
    // Sale/Discount info
    onSale: variantData.onSale || false,
    salePrice: variantData.salePrice || null,
    originalPrice: variantData.originalPrice || variantData.unitPrice || variantData.price || 0,
    discountPercentage: variantData.discountPercentage || 0,

    // Units & sizing
    size: variantData.size,
    unit: variantData.unit || variantData.baseUnit || 'pcs',
    baseUnit: variantData.baseUnit || variantData.unit || 'pcs',

    // Bundle info
    isBundle: !!variantData.isBundle,
    piecesPerBundle: variantData.piecesPerBundle,
    bundlePackagingType: variantData.bundlePackagingType,

    // Dimensional/spec info
    measurementType: variantData.measurementType,
    length: variantData.length,
    width: variantData.width,
    thickness: variantData.thickness,
    unitWeightKg: variantData.unitWeightKg,
    unitVolumeLiters: variantData.unitVolumeLiters,
    specifications: variantData.specifications,

    // Storage info
    storageLocation: variantData.storageLocation,
    shelfName: variantData.shelfName,
    rowName: variantData.rowName,

    // Supplier info
    suppliers: suppliers,
    primarySupplier: suppliers.length > 0 ? suppliers[0] : null
  };
};

/**
 * Create a merged product object
 * @param {Object} productData - Raw product data from Master collection
 * @param {Array<MergedVariant>} variants - Merged variants with supplier data
 * @returns {MergedProduct}
 */
export const createMergedProduct = (productData, variants = []) => {
  // Calculate aggregate statistics
  const totalStock = variants.reduce((sum, v) => sum + (v.quantity || 0), 0);
  const prices = variants.map(v => v.price).filter(p => p > 0);
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;
  const highestPrice = prices.length > 0 ? Math.max(...prices) : 0;
  
  // Collect unique supplier names
  const allSuppliersSet = new Set();
  variants.forEach(variant => {
    variant.suppliers.forEach(supplier => {
      allSuppliersSet.add(supplier.name);
    });
  });

  return {
    id: productData.id,
    name: productData.name,
    image: productData.image || productData.imageUrl,
    category: productData.category || 'Uncategorized',
    brand: productData.brand || 'Generic',
    description: productData.description,
    variants: variants,
    
    // Aggregate statistics
    totalStock,
    totalVariants: variants.length,
    lowestPrice,
    highestPrice,
    hasMultipleVariants: variants.length > 1,
    isInStock: totalStock > 0,
    
    // Supplier info
    allSuppliers: Array.from(allSuppliersSet)
  };
};

/**
 * Filter merged products by search query
 * @param {Array<MergedProduct>} products - Array of merged products
 * @param {string} searchQuery - Search query string
 * @returns {Array<MergedProduct>}
 */
export const filterProductsBySearch = (products, searchQuery) => {
  if (!searchQuery || !searchQuery.trim()) {
    return products;
  }

  const query = searchQuery.toLowerCase();
  return products.filter(p => 
    p.name?.toLowerCase().includes(query) ||
    p.brand?.toLowerCase().includes(query) ||
    p.category?.toLowerCase().includes(query) ||
    p.description?.toLowerCase().includes(query)
  );
};

/**
 * Filter merged products by category
 * @param {Array<MergedProduct>} products - Array of merged products
 * @param {string} category - Category to filter by
 * @returns {Array<MergedProduct>}
 */
export const filterProductsByCategory = (products, category) => {
  if (!category) {
    return products;
  }
  return products.filter(p => p.category === category);
};

/**
 * Filter merged products by brand
 * @param {Array<MergedProduct>} products - Array of merged products
 * @param {string} brand - Brand to filter by
 * @returns {Array<MergedProduct>}
 */
export const filterProductsByBrand = (products, brand) => {
  if (!brand) {
    return products;
  }
  return products.filter(p => p.brand === brand);
};

/**
 * Filter merged products by supplier
 * @param {Array<MergedProduct>} products - Array of merged products
 * @param {string} supplierName - Supplier name to filter by
 * @returns {Array<MergedProduct>}
 */
export const filterProductsBySupplier = (products, supplierName) => {
  if (!supplierName) {
    return products;
  }
  return products.filter(p => p.allSuppliers.includes(supplierName));
};

/**
 * Apply multiple filters to merged products
 * @param {Array<MergedProduct>} products - Array of merged products
 * @param {Object} filters - Filter options
 * @param {string} filters.searchQuery - Search query
 * @param {string} filters.category - Category filter
 * @param {string} filters.brand - Brand filter
 * @param {string} filters.supplier - Supplier filter
 * @returns {Array<MergedProduct>}
 */
export const applyProductFilters = (products, filters = {}) => {
  let filtered = products;

  if (filters.searchQuery) {
    filtered = filterProductsBySearch(filtered, filters.searchQuery);
  }

  if (filters.category) {
    filtered = filterProductsByCategory(filtered, filters.category);
  }

  if (filters.brand) {
    filtered = filterProductsByBrand(filtered, filters.brand);
  }

  if (filters.supplier) {
    filtered = filterProductsBySupplier(filtered, filters.supplier);
  }

  return filtered;
};

export default {
  createMergedVariant,
  createMergedProduct,
  filterProductsBySearch,
  filterProductsByCategory,
  filterProductsByBrand,
  filterProductsBySupplier,
  applyProductFilters
};
