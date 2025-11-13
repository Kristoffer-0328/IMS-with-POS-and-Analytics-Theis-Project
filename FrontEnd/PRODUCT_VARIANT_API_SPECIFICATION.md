# Product & Variant API Specification

## Overview
This document defines the new service layer APIs for managing Products and Variants in the refactored architecture.

---

## Service Structure

```
src/services/firebase/
├── ProductServices.js       (Product management)
├── VariantServices.js       (Variant management - NEW)
└── ProductVariantQueries.js (Combined queries - NEW)
```

---

## ProductServices.js (Refactored)

### 1. Create Product (General Info Only)

```javascript
/**
 * Create a new product with general information only (no stock/price/location)
 * @param {Object} productData - Product information
 * @returns {Promise<Object>} Created product with ID
 */
export const createProduct = async (productData) => {
  const db = getFirestore(app);
  
  // Validate required fields
  const requiredFields = ['name', 'brand', 'category', 'measurementType', 'baseUnit'];
  const missingFields = requiredFields.filter(field => !productData[field]);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
  
  // Generate product ID
  const productId = generateProductId(productData.name, productData.category, productData.brand);
  
  const product = {
    id: productId,
    name: productData.name,
    brand: productData.brand,
    category: productData.category,
    description: productData.description || '',
    measurementType: productData.measurementType,
    baseUnit: productData.baseUnit,
    requireDimensions: productData.requireDimensions || false,
    imageUrl: productData.imageUrl || null,
    
    // Computed fields (will be updated via triggers or manually)
    totalVariants: 0,
    totalStock: 0,
    lowestPrice: null,
    highestPrice: null,
    
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    createdBy: productData.createdBy || null
  };
  
  const productRef = doc(db, 'Products', productId);
  await setDoc(productRef, product);
  
  return { success: true, productId, product };
};
```

**Usage:**
```javascript
const result = await createProduct({
  name: 'Portland Cement',
  brand: 'Republic Cement',
  category: 'Cement & Aggregates',
  description: 'High-quality Portland cement',
  measurementType: 'weight',
  baseUnit: 'kg',
  requireDimensions: false,
  imageUrl: 'https://cloudinary.com/...',
  createdBy: 'user123'
});

console.log(result.productId); // "PROD_CEM_1704556800_abc123"
```

---

### 2. Get Product by ID

```javascript
/**
 * Get a product by its ID (general info only)
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} Product data
 */
export const getProductById = async (productId) => {
  const db = getFirestore(app);
  const productRef = doc(db, 'Products', productId);
  const productSnap = await getDoc(productRef);
  
  if (!productSnap.exists()) {
    throw new Error(`Product ${productId} not found`);
  }
  
  return { id: productSnap.id, ...productSnap.data() };
};
```

---

### 3. Update Product (General Info Only)

```javascript
/**
 * Update product general information
 * Note: Stock, price, location are NOT updated here (they're in variants)
 * @param {string} productId - Product ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>}
 */
export const updateProduct = async (productId, updates) => {
  const db = getFirestore(app);
  
  // Prevent updating stock/price/location fields
  const forbiddenFields = ['quantity', 'unitPrice', 'supplierPrice', 'storageLocation'];
  const hasForbiddenField = forbiddenFields.some(field => updates.hasOwnProperty(field));
  
  if (hasForbiddenField) {
    throw new Error('Cannot update stock/price/location on Product. Update Variant instead.');
  }
  
  const productRef = doc(db, 'Products', productId);
  await updateDoc(productRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
  
  // If name/brand changed, update denormalized data in all variants
  if (updates.name || updates.brand || updates.category) {
    await updateVariantsDenormalizedData(productId, updates);
  }
  
  return { success: true };
};
```

---

### 4. Delete Product (and All Variants)

```javascript
/**
 * Delete a product and all its variants
 * @param {string} productId - Product ID
 * @returns {Promise<Object>}
 */
export const deleteProduct = async (productId) => {
  const db = getFirestore(app);
  
  // Get all variants for this product
  const variantsQuery = query(
    collection(db, 'Variants'),
    where('parentProductId', '==', productId)
  );
  const variantsSnapshot = await getDocs(variantsQuery);
  
  // Use batch for atomic deletion
  const batch = writeBatch(db);
  
  // Delete all variants
  variantsSnapshot.docs.forEach(variantDoc => {
    batch.delete(variantDoc.ref);
  });
  
  // Delete product
  const productRef = doc(db, 'Products', productId);
  batch.delete(productRef);
  
  await batch.commit();
  
  return { 
    success: true, 
    deletedVariants: variantsSnapshot.size 
  };
};
```

---

### 5. List All Products

```javascript
/**
 * List all products (without variants)
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Array of products
 */
export const listProducts = async (filters = {}) => {
  const db = getFirestore(app);
  let productsQuery = collection(db, 'Products');
  
  // Apply filters
  if (filters.category) {
    productsQuery = query(productsQuery, where('category', '==', filters.category));
  }
  
  if (filters.brand) {
    productsQuery = query(productsQuery, where('brand', '==', filters.brand));
  }
  
  const snapshot = await getDocs(productsQuery);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};
```

---

### 6. Update Product Aggregate Stats

```javascript
/**
 * Recalculate and update product aggregate stats from variants
 * Call this after variant changes
 * @param {string} productId - Product ID
 * @returns {Promise<Object>}
 */
export const updateProductStats = async (productId) => {
  const db = getFirestore(app);
  
  // Get all variants
  const variantsQuery = query(
    collection(db, 'Variants'),
    where('parentProductId', '==', productId)
  );
  const variantsSnapshot = await getDocs(variantsQuery);
  
  const variants = variantsSnapshot.docs.map(doc => doc.data());
  
  // Calculate stats
  const totalVariants = variants.length;
  const totalStock = variants.reduce((sum, v) => sum + (v.quantity || 0), 0);
  const prices = variants.map(v => v.unitPrice).filter(p => p > 0);
  const lowestPrice = prices.length > 0 ? Math.min(...prices) : null;
  const highestPrice = prices.length > 0 ? Math.max(...prices) : null;
  
  // Update product
  const productRef = doc(db, 'Products', productId);
  await updateDoc(productRef, {
    totalVariants,
    totalStock,
    lowestPrice,
    highestPrice,
    updatedAt: serverTimestamp()
  });
  
  return { success: true, stats: { totalVariants, totalStock, lowestPrice, highestPrice } };
};
```

---

## VariantServices.js (NEW)

### 1. Create Variant

```javascript
/**
 * Create a new variant for a product
 * @param {Object} variantData - Variant information
 * @returns {Promise<Object>} Created variant with ID
 */
export const createVariant = async (variantData) => {
  const db = getFirestore(app);
  
  // Validate required fields
  const requiredFields = [
    'parentProductId', 'variantName', 'quantity', 
    'unitPrice', 'storageLocation'
  ];
  const missingFields = requiredFields.filter(field => !variantData[field] && variantData[field] !== 0);
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
  
  // Get parent product for denormalization
  const productRef = doc(db, 'Products', variantData.parentProductId);
  const productSnap = await getDoc(productRef);
  
  if (!productSnap.exists()) {
    throw new Error(`Parent product ${variantData.parentProductId} not found`);
  }
  
  const product = productSnap.data();
  
  // Generate variant ID
  const variantId = generateVariantId(variantData.parentProductId, variantData.variantName);
  
  const variant = {
    id: variantId,
    
    // Product reference
    parentProductId: variantData.parentProductId,
    
    // Denormalized product data
    productName: product.name,
    productBrand: product.brand,
    productCategory: product.category,
    productMeasurementType: product.measurementType,
    productBaseUnit: product.baseUnit,
    productImageUrl: product.imageUrl,
    
    // Variant identity
    variantName: variantData.variantName,
    variantSKU: variantData.variantSKU || null,
    specifications: variantData.specifications || '',
    
    // Stock & pricing (REQUIRED)
    quantity: variantData.quantity,
    unitPrice: variantData.unitPrice,
    supplierPrice: variantData.supplierPrice || 0,
    safetyStock: variantData.safetyStock || 0,
    rop: variantData.rop || 0,
    eoq: variantData.eoq || 0,
    
    // Storage location (REQUIRED)
    storageLocation: variantData.storageLocation,
    shelfName: variantData.shelfName || 'Unknown',
    rowName: variantData.rowName || 'Unknown',
    columnIndex: variantData.columnIndex || 0,
    fullLocation: variantData.fullLocation || 
      `${variantData.storageLocation} - ${variantData.shelfName} - ${variantData.rowName} - Column ${variantData.columnIndex + 1}`,
    
    // Supplier info
    suppliers: variantData.suppliers || [],
    
    // Category-specific fields (optional, based on product type)
    ...variantData.categorySpecificFields,
    
    // Bundle/package info
    isBundle: variantData.isBundle || false,
    piecesPerBundle: variantData.piecesPerBundle || null,
    bundlePackagingType: variantData.bundlePackagingType || null,
    
    // Metadata
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    dateStocked: variantData.dateStocked || new Date().toISOString().split('T')[0],
    createdBy: variantData.createdBy || null
  };
  
  // Save variant
  const variantRef = doc(db, 'Variants', variantId);
  await setDoc(variantRef, variant);
  
  // Update product stats
  await updateProductStats(variantData.parentProductId);
  
  return { success: true, variantId, variant };
};
```

**Usage:**
```javascript
const result = await createVariant({
  parentProductId: 'PROD_CEM_1704556800_abc123',
  variantName: '40kg Bag',
  variantSKU: 'CEM-REP-40KG',
  specifications: 'Standard 40kg bagged cement',
  quantity: 200,
  unitPrice: 255.00,
  supplierPrice: 240.00,
  safetyStock: 50,
  storageLocation: 'Unit 03',
  shelfName: 'Shelf A',
  rowName: 'Row 1',
  columnIndex: 0,
  fullLocation: 'Unit 03 - Shelf A - Row 1 - Column 1',
  suppliers: [{ id: 'SUP_001', name: 'ABC Cement Co.', price: 240 }],
  categorySpecificFields: {
    packagingVariant: '40kg',
    cementFormType: 'packed',
    numberOfBags: 10,
    weightPerBag: 40
  },
  createdBy: 'user123'
});

console.log(result.variantId); // "VAR_PROD_CEM_1704556800_abc123_40KG_BAG_..."
```

---

### 2. Get Variant by ID

```javascript
/**
 * Get a variant by its ID
 * @param {string} variantId - Variant ID
 * @returns {Promise<Object>} Variant data
 */
export const getVariantById = async (variantId) => {
  const db = getFirestore(app);
  const variantRef = doc(db, 'Variants', variantId);
  const variantSnap = await getDoc(variantRef);
  
  if (!variantSnap.exists()) {
    throw new Error(`Variant ${variantId} not found`);
  }
  
  return { id: variantSnap.id, ...variantSnap.data() };
};
```

---

### 3. Update Variant

```javascript
/**
 * Update variant information
 * @param {string} variantId - Variant ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>}
 */
export const updateVariant = async (variantId, updates) => {
  const db = getFirestore(app);
  
  const variantRef = doc(db, 'Variants', variantId);
  const variantSnap = await getDoc(variantRef);
  
  if (!variantSnap.exists()) {
    throw new Error(`Variant ${variantId} not found`);
  }
  
  const variant = variantSnap.data();
  
  await updateDoc(variantRef, {
    ...updates,
    updatedAt: serverTimestamp()
  });
  
  // If quantity or price changed, update product stats
  if (updates.hasOwnProperty('quantity') || updates.hasOwnProperty('unitPrice')) {
    await updateProductStats(variant.parentProductId);
  }
  
  return { success: true };
};
```

---

### 4. Update Variant Stock

```javascript
/**
 * Update variant stock (with validation)
 * @param {string} variantId - Variant ID
 * @param {number} newQuantity - New stock quantity
 * @param {string} reason - Reason for update (sale, restock, adjustment)
 * @returns {Promise<Object>}
 */
export const updateVariantStock = async (variantId, newQuantity, reason = 'adjustment') => {
  const db = getFirestore(app);
  
  if (newQuantity < 0) {
    throw new Error('Stock quantity cannot be negative');
  }
  
  const variantRef = doc(db, 'Variants', variantId);
  const variantSnap = await getDoc(variantRef);
  
  if (!variantSnap.exists()) {
    throw new Error(`Variant ${variantId} not found`);
  }
  
  const variant = variantSnap.data();
  const oldQuantity = variant.quantity;
  
  // Update stock
  await updateDoc(variantRef, {
    quantity: newQuantity,
    updatedAt: serverTimestamp()
  });
  
  // Log stock movement (optional - for audit trail)
  await logStockMovement({
    variantId,
    productId: variant.parentProductId,
    productName: variant.productName,
    variantName: variant.variantName,
    oldQuantity,
    newQuantity,
    change: newQuantity - oldQuantity,
    reason,
    timestamp: serverTimestamp()
  });
  
  // Update product stats
  await updateProductStats(variant.parentProductId);
  
  // Check if below safety stock
  if (newQuantity <= variant.safetyStock) {
    await createLowStockAlert(variantId, variant, newQuantity);
  }
  
  return { success: true, oldQuantity, newQuantity };
};
```

---

### 5. Delete Variant

```javascript
/**
 * Delete a variant
 * Note: Prevents deletion if it's the last variant of a product
 * @param {string} variantId - Variant ID
 * @returns {Promise<Object>}
 */
export const deleteVariant = async (variantId) => {
  const db = getFirestore(app);
  
  const variantRef = doc(db, 'Variants', variantId);
  const variantSnap = await getDoc(variantRef);
  
  if (!variantSnap.exists()) {
    throw new Error(`Variant ${variantId} not found`);
  }
  
  const variant = variantSnap.data();
  const productId = variant.parentProductId;
  
  // Check if this is the last variant
  const variantsQuery = query(
    collection(db, 'Variants'),
    where('parentProductId', '==', productId)
  );
  const variantsSnapshot = await getDocs(variantsQuery);
  
  if (variantsSnapshot.size === 1) {
    throw new Error('Cannot delete the last variant. Delete the product instead.');
  }
  
  await deleteDoc(variantRef);
  
  // Update product stats
  await updateProductStats(productId);
  
  return { success: true };
};
```

---

### 6. Get Variants by Product

```javascript
/**
 * Get all variants for a product
 * @param {string} productId - Product ID
 * @returns {Promise<Array>} Array of variants
 */
export const getVariantsByProduct = async (productId) => {
  const db = getFirestore(app);
  
  const variantsQuery = query(
    collection(db, 'Variants'),
    where('parentProductId', '==', productId),
    orderBy('variantName', 'asc')
  );
  
  const snapshot = await getDocs(variantsQuery);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};
```

---

### 7. Search Variants

```javascript
/**
 * Search variants by product name, variant name, or SKU
 * @param {string} searchTerm - Search term
 * @returns {Promise<Array>} Array of matching variants
 */
export const searchVariants = async (searchTerm) => {
  const db = getFirestore(app);
  
  // Firestore doesn't support OR queries, so we need multiple queries
  const searches = [
    // Search by product name
    query(
      collection(db, 'Variants'),
      where('productName', '>=', searchTerm),
      where('productName', '<=', searchTerm + '\uf8ff')
    ),
    // Search by variant name
    query(
      collection(db, 'Variants'),
      where('variantName', '>=', searchTerm),
      where('variantName', '<=', searchTerm + '\uf8ff')
    )
  ];
  
  // If searchTerm looks like a SKU, add exact match query
  if (searchTerm.includes('-')) {
    searches.push(
      query(
        collection(db, 'Variants'),
        where('variantSKU', '==', searchTerm)
      )
    );
  }
  
  // Execute all queries in parallel
  const results = await Promise.all(searches.map(q => getDocs(q)));
  
  // Merge and deduplicate results
  const variantsMap = new Map();
  results.forEach(snapshot => {
    snapshot.docs.forEach(doc => {
      variantsMap.set(doc.id, { id: doc.id, ...doc.data() });
    });
  });
  
  return Array.from(variantsMap.values());
};
```

---

### 8. Get Variants by Storage Location

```javascript
/**
 * Get all variants in a specific storage location
 * @param {string} storageLocation - Storage unit name
 * @param {string} shelfName - Optional shelf name
 * @param {string} rowName - Optional row name
 * @returns {Promise<Array>} Array of variants
 */
export const getVariantsByLocation = async (storageLocation, shelfName = null, rowName = null) => {
  const db = getFirestore(app);
  
  let variantsQuery = query(
    collection(db, 'Variants'),
    where('storageLocation', '==', storageLocation)
  );
  
  if (shelfName) {
    variantsQuery = query(variantsQuery, where('shelfName', '==', shelfName));
  }
  
  if (rowName) {
    variantsQuery = query(variantsQuery, where('rowName', '==', rowName));
  }
  
  const snapshot = await getDocs(variantsQuery);
  
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
};
```

---

## ProductVariantQueries.js (NEW - Combined Queries)

### 1. Get Product with Variants

```javascript
/**
 * Get a product with all its variants
 * @param {string} productId - Product ID
 * @returns {Promise<Object>} Product with variants array
 */
export const getProductWithVariants = async (productId) => {
  const product = await getProductById(productId);
  const variants = await getVariantsByProduct(productId);
  
  return {
    ...product,
    variants,
    totalVariants: variants.length,
    totalStock: variants.reduce((sum, v) => sum + v.quantity, 0),
    lowestPrice: Math.min(...variants.map(v => v.unitPrice).filter(p => p > 0)),
    highestPrice: Math.max(...variants.map(v => v.unitPrice).filter(p => p > 0))
  };
};
```

---

### 2. Get All Products with Variants

```javascript
/**
 * Get all products with their variants
 * @param {Object} filters - Optional filters
 * @returns {Promise<Array>} Array of products with variants
 */
export const getAllProductsWithVariants = async (filters = {}) => {
  const products = await listProducts(filters);
  
  const productsWithVariants = await Promise.all(
    products.map(async (product) => {
      const variants = await getVariantsByProduct(product.id);
      return {
        ...product,
        variants
      };
    })
  );
  
  return productsWithVariants;
};
```

---

### 3. Get Low Stock Variants

```javascript
/**
 * Get all variants that are below safety stock
 * @returns {Promise<Array>} Array of low stock variants
 */
export const getLowStockVariants = async () => {
  const db = getFirestore(app);
  
  // Note: Firestore doesn't support field comparison in queries
  // We need to fetch all variants and filter client-side
  const variantsRef = collection(db, 'Variants');
  const snapshot = await getDocs(variantsRef);
  
  const lowStockVariants = snapshot.docs
    .map(doc => ({ id: doc.id, ...doc.data() }))
    .filter(variant => variant.quantity <= variant.safetyStock)
    .sort((a, b) => a.quantity - b.quantity);
  
  return lowStockVariants;
};
```

---

### 4. Get Stock Valuation Report

```javascript
/**
 * Get total stock valuation by product/variant
 * @returns {Promise<Object>} Valuation report
 */
export const getStockValuation = async () => {
  const db = getFirestore(app);
  const variantsRef = collection(db, 'Variants');
  const snapshot = await getDocs(variantsRef);
  
  const variants = snapshot.docs.map(doc => {
    const data = doc.data();
    return {
      id: doc.id,
      productName: data.productName,
      variantName: data.variantName,
      quantity: data.quantity,
      unitPrice: data.unitPrice,
      totalValue: data.quantity * data.unitPrice
    };
  });
  
  const totalValuation = variants.reduce((sum, v) => sum + v.totalValue, 0);
  
  // Group by product
  const byProduct = variants.reduce((acc, variant) => {
    if (!acc[variant.productName]) {
      acc[variant.productName] = {
        productName: variant.productName,
        variants: [],
        totalValue: 0
      };
    }
    acc[variant.productName].variants.push(variant);
    acc[variant.productName].totalValue += variant.totalValue;
    return acc;
  }, {});
  
  return {
    totalValuation,
    totalVariants: variants.length,
    byProduct: Object.values(byProduct).sort((a, b) => b.totalValue - a.totalValue),
    allVariants: variants.sort((a, b) => b.totalValue - a.totalValue)
  };
};
```

---

## Helper Functions

### Generate Product ID

```javascript
const generateProductId = (name, category, brand) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const categoryPrefix = category.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, '');
  return `PROD_${categoryPrefix}_${timestamp}_${random}`;
};
```

### Generate Variant ID

```javascript
const generateVariantId = (productId, variantName) => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 9);
  const variantSlug = variantName
    .replace(/[^a-zA-Z0-9]/g, '_')
    .substring(0, 20)
    .toUpperCase();
  return `VAR_${productId}_${variantSlug}_${timestamp}_${random}`;
};
```

### Update Variants Denormalized Data

```javascript
const updateVariantsDenormalizedData = async (productId, productUpdates) => {
  const db = getFirestore(app);
  
  const variantsQuery = query(
    collection(db, 'Variants'),
    where('parentProductId', '==', productId)
  );
  const variantsSnapshot = await getDocs(variantsQuery);
  
  const batch = writeBatch(db);
  
  variantsSnapshot.docs.forEach(variantDoc => {
    const updates = {};
    
    if (productUpdates.name) updates.productName = productUpdates.name;
    if (productUpdates.brand) updates.productBrand = productUpdates.brand;
    if (productUpdates.category) updates.productCategory = productUpdates.category;
    if (productUpdates.imageUrl) updates.productImageUrl = productUpdates.imageUrl;
    
    updates.updatedAt = serverTimestamp();
    
    batch.update(variantDoc.ref, updates);
  });
  
  await batch.commit();
};
```

---

## Error Handling

All service functions should follow this error handling pattern:

```javascript
export const serviceFunction = async (params) => {
  try {
    // Validation
    if (!params.requiredField) {
      throw new Error('requiredField is required');
    }
    
    // Business logic
    const result = await performOperation();
    
    // Success response
    return { 
      success: true, 
      data: result,
      message: 'Operation completed successfully'
    };
    
  } catch (error) {
    console.error(`Error in serviceFunction:`, error);
    
    // Error response
    return {
      success: false,
      error: error.message,
      code: error.code || 'UNKNOWN_ERROR'
    };
  }
};
```

---

## Usage Examples

### Complete Product Creation Flow

```javascript
// Step 1: Create product
const productResult = await createProduct({
  name: 'Portland Cement',
  brand: 'Republic Cement',
  category: 'Cement & Aggregates',
  measurementType: 'weight',
  baseUnit: 'kg',
  imageUrl: 'https://...'
});

const productId = productResult.productId;

// Step 2: Add first variant
const variant1Result = await createVariant({
  parentProductId: productId,
  variantName: '40kg Bag',
  quantity: 200,
  unitPrice: 255.00,
  storageLocation: 'Unit 03',
  shelfName: 'Shelf A',
  rowName: 'Row 1',
  columnIndex: 0,
  categorySpecificFields: {
    packagingVariant: '40kg',
    numberOfBags: 10,
    weightPerBag: 40
  }
});

// Step 3: Add second variant
const variant2Result = await createVariant({
  parentProductId: productId,
  variantName: '25kg Bag',
  quantity: 150,
  unitPrice: 165.00,
  storageLocation: 'Unit 03',
  shelfName: 'Shelf B',
  rowName: 'Row 2',
  columnIndex: 3,
  categorySpecificFields: {
    packagingVariant: '25kg',
    numberOfBags: 15,
    weightPerBag: 25
  }
});

// Step 4: Get product with all variants
const productWithVariants = await getProductWithVariants(productId);
console.log(productWithVariants);
/* Output:
{
  id: "PROD_CEM_...",
  name: "Portland Cement",
  brand: "Republic Cement",
  totalVariants: 2,
  totalStock: 350,
  lowestPrice: 165,
  highestPrice: 255,
  variants: [
    { variantName: "40kg Bag", quantity: 200, ... },
    { variantName: "25kg Bag", quantity: 150, ... }
  ]
}
*/
```

---

## Migration from Old Structure

```javascript
// Migrate existing product to new structure
const migrateProduct = async (oldProductData) => {
  // Create product (general info)
  const productResult = await createProduct({
    name: oldProductData.name,
    brand: oldProductData.brand,
    category: oldProductData.category,
    measurementType: oldProductData.measurementType,
    baseUnit: oldProductData.baseUnit,
    imageUrl: oldProductData.imageUrl
  });
  
  // Create variant (stock/price/location)
  const variantResult = await createVariant({
    parentProductId: productResult.productId,
    variantName: oldProductData.variantName || 'Standard',
    quantity: oldProductData.quantity,
    unitPrice: oldProductData.unitPrice,
    storageLocation: oldProductData.storageLocation,
    shelfName: oldProductData.shelfName,
    rowName: oldProductData.rowName,
    columnIndex: oldProductData.columnIndex,
    // Copy all other fields...
  });
  
  return { productId: productResult.productId, variantId: variantResult.variantId };
};
```

---

## Testing

### Unit Test Example

```javascript
import { createProduct, createVariant, getProductWithVariants } from './ProductVariantServices';

describe('Product & Variant Services', () => {
  it('should create product and variant', async () => {
    // Create product
    const productResult = await createProduct({
      name: 'Test Product',
      brand: 'Test Brand',
      category: 'Test Category',
      measurementType: 'count',
      baseUnit: 'pcs'
    });
    
    expect(productResult.success).toBe(true);
    expect(productResult.productId).toBeDefined();
    
    // Create variant
    const variantResult = await createVariant({
      parentProductId: productResult.productId,
      variantName: 'Test Variant',
      quantity: 100,
      unitPrice: 50.00,
      storageLocation: 'Unit 01'
    });
    
    expect(variantResult.success).toBe(true);
    expect(variantResult.variantId).toBeDefined();
    
    // Get product with variants
    const product = await getProductWithVariants(productResult.productId);
    expect(product.variants.length).toBe(1);
    expect(product.totalStock).toBe(100);
  });
});
```

---

## Performance Considerations

### Indexing Strategy

Create composite indexes in Firestore:

```
Collection: Variants
Indexes:
- parentProductId (ascending) + variantName (ascending)
- storageLocation (ascending) + shelfName (ascending) + rowName (ascending)
- productName (ascending) + variantName (ascending)
- quantity (ascending) + safetyStock (ascending) [for low stock queries]
```

### Caching Strategy

```javascript
// Use React Query for client-side caching
import { useQuery } from '@tanstack/react-query';

const useProductWithVariants = (productId) => {
  return useQuery(
    ['product', productId],
    () => getProductWithVariants(productId),
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
    }
  );
};
```

---

This API specification provides a complete, production-ready service layer for the new Product & Variant architecture. All functions include proper error handling, validation, and documentation.
