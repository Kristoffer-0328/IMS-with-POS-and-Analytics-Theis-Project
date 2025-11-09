// ProductServices.jsx - Refactored for Product/Variant Architecture
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { getFirestore, collection, onSnapshot, query, getDocs, orderBy, doc, setDoc, deleteDoc, updateDoc, getDoc, where, writeBatch } from 'firebase/firestore';
import app from './config';
import { ProductFactory } from '../../features/inventory/components/Factory/productFactory';

const db = getFirestore(app);
const ServicesContext = createContext(null);

// Collection names
const PRODUCTS_COLLECTION = 'Products';
const VARIANTS_COLLECTION = 'Variants';
const LEGACY_PRODUCTS_PATH = 'Products'; // For backward compatibility with nested structure

export const ServicesProvider = ({ children }) => {
  const [products, setProducts] = useState([]);

  /**
   * Listen to products from the NEW flat structure: Products/{productId}
   * This replaces the old nested structure: Products/{unit}/products/{productId}
   * 
   * Products now contain ONLY general information:
   * - name, brand, category, image, description, specifications
   * - measurementType, baseUnit, requireDimensions
   * - Aggregate stats: totalVariants, totalStock, lowestPrice, highestPrice
   * 
   * For stock/price/location data, query the Variants collection
   */
  const listenToProducts = useCallback((onUpdate) => {
    const productsRef = collection(db, VARIANTS_COLLECTION);
    
    const unsubscribe = onSnapshot(
      productsRef,
      (snapshot) => {
        const productsList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setProducts(productsList);
        if (onUpdate) onUpdate(productsList);
      },
      (error) => {
        console.error('Error listening to products:', error);
        setProducts([]);
        if (onUpdate) onUpdate([]);
      }
    );
    
    return unsubscribe;
  }, []);

  /**
   * LEGACY: Listen to products from old nested structure
   * Kept for backward compatibility during migration period
   * @deprecated Use listenToProducts() for new flat structure
   */
  const listenToLegacyProducts = useCallback((onUpdate) => {
    const allProducts = [];
    let isFirstLoad = true;
    const unsubscribers = [];

    // Fetch products from nested structure: Products/{storageUnit}/products/{productId}
    const fetchAllProducts = async () => {
      try {
        const allProducts = [];
        const productsRef = collection(db, LEGACY_PRODUCTS_PATH);
        const storageUnitsSnapshot = await getDocs(productsRef);
        
        // Iterate through each storage unit (Unit 01, Unit 02, etc.)
        for (const storageUnitDoc of storageUnitsSnapshot.docs) {
          const unitId = storageUnitDoc.id;
          
          // Skip non-storage unit documents (if any)
          if (!unitId.startsWith('Unit ')) {
            continue;
          }
          
          // Fetch products subcollection for this storage unit
          const productsSubcollectionRef = collection(db, LEGACY_PRODUCTS_PATH, unitId, "products");
          const productsSnapshot = await getDocs(productsSubcollectionRef);
          
          productsSnapshot.docs.forEach(doc => {
            const data = doc.data();
            
            allProducts.push({
              ...data,
              id: doc.id,
              baseProductId: data.parentProductId || doc.id,
              category: data.category || 'Uncategorized',
              storageLocation: data.storageLocation || unitId,
              shelfName: data.shelfName || 'Unknown',
              rowName: data.rowName || 'Unknown',
              columnIndex: data.columnIndex || 0,
              fullLocation: data.fullLocation || `${data.storageLocation || unitId} - ${data.shelfName || 'Unknown'} - ${data.rowName || 'Unknown'} - Column ${data.columnIndex || 0}`,
              brand: data.brand || 'Generic',
              subCategory: data.subCategory || data.category || 'Uncategorized',
              specifications: data.specifications || '',
              storageType: data.storageType || 'Goods',
              unitPrice: typeof data.unitPrice === 'number' ? data.unitPrice : parseFloat(data.unitPrice) || 0,
              quantity: typeof data.quantity === 'number' ? data.quantity : parseInt(data.quantity) || 0,
              supplierCode: data.supplierCode || data.supplier?.primaryCode || data.supplier?.code || '',
              supplier: data.supplier || {
                name: 'Unknown',
                primaryCode: '',
                code: '',
                address: '',
                contactPerson: '',
                phone: '',
                email: ''
              },
              isVariant: data.isVariant || false,
              parentProductId: data.parentProductId || null,
              variantName: data.variantName || data.size || 'Standard',
              
              // Bundle/Package information
              isBundle: data.isBundle || false,
              piecesPerBundle: data.piecesPerBundle || null,
              bundlePackagingType: data.bundlePackagingType || null,
              totalBundles: data.totalBundles || null,
              loosePieces: data.loosePieces || null,
              
              totalvalue: (typeof data.unitPrice === 'number' ? data.unitPrice : parseFloat(data.unitPrice) || 0) * 
                         (typeof data.quantity === 'number' ? data.quantity : parseInt(data.quantity) || 0),
              
              _isLegacy: true // Flag to identify legacy products
            });
          });
        }

        
        setProducts(allProducts);
        if (onUpdate) onUpdate(allProducts);
        
      } catch (error) {
        console.error('Error fetching legacy products:', error);
        setProducts([]);
        if (onUpdate) onUpdate([]);
      }
    };

    // Setup listeners for each storage unit's products subcollection
    const setupListeners = async () => {
      try {
        const productsRef = collection(db, LEGACY_PRODUCTS_PATH);
        const storageUnitsSnapshot = await getDocs(productsRef);
        
        // Set up a listener for each storage unit's products subcollection
        for (const storageUnitDoc of storageUnitsSnapshot.docs) {
          const unitId = storageUnitDoc.id;
          
          if (!unitId.startsWith('Unit ')) {
            continue;
          }
          
          const productsSubcollectionRef = collection(db, LEGACY_PRODUCTS_PATH, unitId, "products");
          const unsubscribe = onSnapshot(
            productsSubcollectionRef,
            (snapshot) => {
              if (!isFirstLoad) {
                fetchAllProducts();
              }
            },
            (error) => {
              console.error(`Error listening to Products/${unitId}/products:`, error);
            }
          );
          
          unsubscribers.push(unsubscribe);
        }
        
        isFirstLoad = false;
      } catch (error) {
        console.error('Error setting up legacy listeners:', error);
      }
    };

    // Initial fetch
    fetchAllProducts();
    
    // Setup listeners after initial fetch
    setupListeners();

    // Return cleanup function
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, []);

  const fetchRestockRequests = useCallback(async () => {
    try {
      const restockRequestsRef = collection(db, 'RestockRequests');
      const q = query(restockRequestsRef, orderBy('timestamp', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const requests = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      return { success: true, requests };
    } catch (error) {
      console.error('Error fetching restock requests:', error);
      return { success: false, error };
    }
  }, []);

  const listenToSupplierProducts = useCallback((supplierId, onUpdate) => {
    if (!supplierId) return () => {};
    
    const supplierProductsRef = collection(db, 'supplier_products', supplierId, 'products');
    const unsubscribe = onSnapshot(
      supplierProductsRef,
      (snapshot) => {
        const products = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        if (onUpdate) onUpdate(products);
      },
      (error) => {
        console.error('Error listening to supplier products:', error);
      }
    );
    
    return unsubscribe;
  }, []);

  const value = useMemo(() => ({
    products,
    listenToProducts,
    listenToLegacyProducts,
    fetchRestockRequests,
    listenToSupplierProducts
  }), [products, listenToProducts, listenToLegacyProducts, fetchRestockRequests, listenToSupplierProducts]);

  return (
    <ServicesContext.Provider value={value}>
      {children}
    </ServicesContext.Provider>
  );
};

// ============================================================================
// NEW Product Services for Flat Structure (Products/{productId})
// ============================================================================

/**
 * Create a new product (general info only, no variants)
 * Use ProductFactory.createProduct() to generate the product object
 * @param {Object} productData - Product data from ProductFactory.createProduct()
 * @returns {Promise<Object>} Created product
 */
export const createProduct = async (productData) => {
  try {
    if (!productData.id) {
      throw new Error('Product ID is required');
    }

    const productRef = doc(db, PRODUCTS_COLLECTION, productData.id);
    await setDoc(productRef, productData);

    console.log('✅ Product created:', productData.id);
    return { success: true, product: productData };
  } catch (error) {
    console.error('❌ Error creating product:', error);
    return { success: false, error };
  }
};

/**
 * Get a single product by ID (flat structure)
 * @param {string} productId - The product document ID
 * @returns {Promise<Object|null>} Product data or null if not found
 */
export const getProductById = async (productId) => {
  try {
    const productRef = doc(db, PRODUCTS_COLLECTION, productId);
    const productSnap = await getDoc(productRef);

    if (productSnap.exists()) {
      return { success: true, product: { id: productSnap.id, ...productSnap.data() } };
    } else {
      console.warn('⚠️ Product not found:', productId);
      return { success: false, error: 'Product not found' };
    }
  } catch (error) {
    console.error('❌ Error fetching product:', error);
    return { success: false, error };
  }
};

/**
 * Get product with all its variants
 * @param {string} productId - The product document ID
 * @returns {Promise<Object>} Object with product and variants array
 */
export const getProductWithVariants = async (productId) => {
  try {
    // Get product
    const productResult = await getProductById(productId);
    if (!productResult.success) {
      return productResult;
    }

    // Get all variants for this product
    const variantsRef = collection(db, VARIANTS_COLLECTION);
    const q = query(variantsRef, where('parentProductId', '==', productId));
    const variantsSnapshot = await getDocs(q);
    
    const variants = variantsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return {
      success: true,
      product: productResult.product,
      variants: variants
    };
  } catch (error) {
    console.error('❌ Error fetching product with variants:', error);
    return { success: false, error };
  }
};

/**
 * Update product information (general info only, not variant data)
 * @param {string} productId - The product document ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Success status
 */
export const updateProduct = async (productId, updates) => {
  try {
    const productRef = doc(db, PRODUCTS_COLLECTION, productId);
    
    const updateData = {
      ...updates,
      lastUpdated: new Date().toISOString()
    };

    await updateDoc(productRef, updateData);
    console.log('✅ Product updated:', productId);
    return { success: true };
  } catch (error) {
    console.error('❌ Error updating product:', error);
    return { success: false, error };
  }
};

/**
 * Delete a product and all its variants (cascade delete)
 * @param {string} productId - The product document ID
 * @returns {Promise<Object>} Success status with count of deleted variants
 */
export const deleteProduct = async (productId) => {
  try {
    // First, delete all variants
    const variantsRef = collection(db, VARIANTS_COLLECTION);
    const q = query(variantsRef, where('parentProductId', '==', productId));
    const variantsSnapshot = await getDocs(q);
    
    const batch = writeBatch(db);
    let variantCount = 0;
    
    variantsSnapshot.docs.forEach(variantDoc => {
      batch.delete(doc(db, VARIANTS_COLLECTION, variantDoc.id));
      variantCount++;
    });
    
    // Delete the product
    const productRef = doc(db, PRODUCTS_COLLECTION, productId);
    batch.delete(productRef);
    
    await batch.commit();
    
    console.log(`✅ Product deleted: ${productId} (${variantCount} variants also deleted)`);
    return { success: true, variantsDeleted: variantCount };
  } catch (error) {
    console.error('❌ Error deleting product:', error);
    return { success: false, error };
  }
};

/**
 * List all products with optional filtering
 * @param {Object} options - Filter and pagination options
 * @returns {Promise<Array>} Array of product objects
 */
export const listProducts = async (options = {}) => {
  try {
    const {
      category = null,
      measurementType = null,
      orderByField = 'createdAt',
      orderDirection = 'desc'
    } = options;

    let q = collection(db, PRODUCTS_COLLECTION);

    if (category) {
      q = query(q, where('category', '==', category));
    }
    if (measurementType) {
      q = query(q, where('measurementType', '==', measurementType));
    }

    q = query(q, orderBy(orderByField, orderDirection));

    const querySnapshot = await getDocs(q);
    const products = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    return { success: true, products };
  } catch (error) {
    console.error('❌ Error listing products:', error);
    return { success: false, error };
  }
};

/**
 * Search products by name, brand, or category
 * @param {string} searchTerm - Search query string
 * @param {Object} filters - Additional filters
 * @returns {Promise<Array>} Array of matching products
 */
export const searchProducts = async (searchTerm, filters = {}) => {
  try {
    let q = collection(db, PRODUCTS_COLLECTION);
    
    if (filters.category) {
      q = query(q, where('category', '==', filters.category));
    }
    if (filters.measurementType) {
      q = query(q, where('measurementType', '==', filters.measurementType));
    }

    const querySnapshot = await getDocs(q);
    let products = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    // Client-side filtering for search term
    if (searchTerm && searchTerm.trim() !== '') {
      const lowerSearch = searchTerm.toLowerCase();
      products = products.filter(product => {
        const name = (product.name || '').toLowerCase();
        const brand = (product.brand || '').toLowerCase();
        const category = (product.category || '').toLowerCase();
        
        return name.includes(lowerSearch) ||
               brand.includes(lowerSearch) ||
               category.includes(lowerSearch) ||
               product.id.toLowerCase().includes(lowerSearch);
      });
    }

    return { success: true, products };
  } catch (error) {
    console.error('❌ Error searching products:', error);
    return { success: false, error };
  }
};

// ============================================================================
// Legacy/Supplier Product Relationship Functions
// ============================================================================

// Functions for managing supplier-product relationships
export const linkProductToSupplier = async (productId, supplierId, supplierData) => {
  try {
    const now = new Date().toISOString();
    
    // Check if this is a variant (new architecture) or product (old architecture)
    const isVariant = productId.startsWith('VAR_');
    
    if (isVariant) {
      // NEW ARCHITECTURE: Link variant to supplier
      // Path: Suppliers/{supplierId}/products/{variantId}
      const supplierProductRef = doc(db, 'Suppliers', supplierId, 'products', productId);
      
      // Get variant data to include in supplier link
      const variantRef = doc(db, 'Variants', productId);
      const variantSnap = await getDoc(variantRef);
      
      if (!variantSnap.exists()) {
        console.error(`Variant ${productId} not found`);
        return { success: false, error: 'Variant not found' };
      }
      
      const variantData = variantSnap.data();
      
      // Create comprehensive link document with all necessary fields
      await setDoc(supplierProductRef, {
        // Link identifiers
        variantId: productId,
        productId: variantData.parentProductId, // Reference to master product
        supplierId: supplierId,
        
        // Denormalized product info (for queries without joins)
        productName: variantData.productName,
        productBrand: variantData.productBrand,
        productCategory: variantData.productCategory,
        variantName: variantData.variantName,
        
        // Pricing
        supplierPrice: supplierData.supplierPrice || 0,
        unitPrice: variantData.unitPrice || 0,
        
        // Stock info (snapshot at time of linking)
        currentStock: variantData.quantity || 0,
        
        // SKU/Code
        supplierSKU: supplierData.supplierSKU || productId,
        
        // Metadata
        linkedAt: now,
        createdAt: now,
        updatedAt: now,
        
        // Storage location (for reference)
        storageLocation: variantData.storageLocation || '',
        fullLocation: variantData.fullLocation || '',
        
        // Ensure collection is visible
        _collectionExists: true, // Dummy field to ensure collection exists
      });
      
      console.log(`✅ Linked variant ${productId} to supplier ${supplierId} (Suppliers/${supplierId}/products/${productId})`);
      
    } else {
      // OLD ARCHITECTURE: Link product to supplier (backward compatibility)
      // Path: supplier_products/{supplierId}/products/{productId}
      const supplierProductRef = doc(db, 'supplier_products', supplierId, 'products', productId);
      
      await setDoc(supplierProductRef, {
        productId,
        supplierId: supplierId,
        supplierPrice: supplierData.supplierPrice || 0,
        supplierSKU: supplierData.supplierSKU || '',
        createdAt: now,
        updatedAt: now,
        _collectionExists: true, // Dummy field to ensure collection exists
      });
      
      // Update the product's variant array with supplier information
      await updateProductVariantsWithSupplier(productId, supplierId, supplierData);
      
      console.log(`🔙 Linked product ${productId} to supplier ${supplierId} (old structure)`);
    }
    
    return { success: true };
  } catch (error) {
    console.error('❌ Error linking product to supplier:', error);
    return { success: false, error };
  }
};

// Helper function to update product variants with supplier information
const updateProductVariantsWithSupplier = async (productId, supplierId, supplierData) => {
  try {
    // Find the product in the nested structure: Products/{storageLocation}/products/{productId}
    const storageLocationsRef = collection(db, 'Products');
    const storageLocationsSnapshot = await getDocs(storageLocationsRef);
    
    let productFound = false;
    
    for (const storageLocationDoc of storageLocationsSnapshot.docs) {
      const storageLocation = storageLocationDoc.id;
      
      // Skip non-storage unit documents
      if (!storageLocation.startsWith('Unit ')) {
        continue;
      }
      
      // Check if this storage location has a products subcollection
      const productsRef = collection(db, 'Products', storageLocation, 'products');
      
      try {
        const productsSnapshot = await getDocs(productsRef);
        
        for (const productDoc of productsSnapshot.docs) {
          if (productDoc.id === productId || productDoc.id.startsWith(productId)) {
            const productData = productDoc.data();
            const productRef = doc(db, 'Products', storageLocation, 'products', productDoc.id);
            
            // Prepare supplier information
            const supplierInfo = {
              name: supplierData.supplierName || 'Unknown',
              code: supplierData.supplierCode || supplierData.supplierSKU || '',
              primaryCode: supplierData.supplierCode || supplierData.supplierSKU || '',
              id: supplierId,
              price: supplierData.supplierPrice || 0,
              sku: supplierData.supplierSKU || ''
            };
            
            // Check if product has variants structure
            if (productData.variants && Array.isArray(productData.variants)) {
              // Get existing suppliers array or initialize empty array
              const existingSuppliers = productData.suppliers || [];
              
              // Check if supplier already exists
              const supplierExists = existingSuppliers.some(s => s.id === supplierId);
              
              // Update variants with supplier information
              const updatedVariants = productData.variants.map(variant => {
                const variantSuppliers = variant.suppliers || [];
                const variantSupplierExists = variantSuppliers.some(s => s.id === supplierId);
                
                if (variantSupplierExists) {
                  // Update existing supplier in variant
                  return {
                    ...variant,
                    suppliers: variantSuppliers.map(s => 
                      s.id === supplierId 
                        ? { ...supplierInfo, price: supplierData.supplierPrice || variant.unitPrice || 0 }
                        : s
                    )
                  };
                } else {
                  // Add new supplier to variant
                  return {
                    ...variant,
                    suppliers: [...variantSuppliers, {
                      ...supplierInfo,
                      price: supplierData.supplierPrice || variant.unitPrice || 0,
                      sku: supplierData.supplierSKU || ''
                    }]
                  };
                }
              });
              
              // Prepare update object
              const updateData = {
                variants: updatedVariants,
                updatedAt: new Date().toISOString()
              };
              
              // Add or update supplier in product-level suppliers array
              if (supplierExists) {
                updateData.suppliers = existingSuppliers.map(s => 
                  s.id === supplierId ? supplierInfo : s
                );
              } else {
                updateData.suppliers = [...existingSuppliers, supplierInfo];
              }
              
              // Update the product document
              await updateDoc(productRef, updateData);
            } else {
              // Product doesn't have variants - update product directly
              const existingSuppliers = productData.suppliers || [];
              const supplierExists = existingSuppliers.some(s => s.id === supplierId);
              
              const updateData = {
                updatedAt: new Date().toISOString()
              };
              
              if (supplierExists) {
                // Update existing supplier
                updateData.suppliers = existingSuppliers.map(s => 
                  s.id === supplierId ? supplierInfo : s
                );
              } else {
                // Add new supplier
                updateData.suppliers = [...existingSuppliers, supplierInfo];
              }
              
              await updateDoc(productRef, updateData);
            }
            
            productFound = true;
          }
        }
      } catch (err) {
        // Continue to next storage location if this one fails
        console.error(`Error updating products in ${storageLocation}:`, err);
        continue;
      }
    }
    
    if (!productFound) {
      console.warn(`Product ${productId} not found in any storage location`);
    }
  } catch (error) {
    console.error('Error updating product variants with supplier:', error);
    throw error;
  }
};

export const unlinkProductFromSupplier = async (productId, supplierId) => {
  try {
    // First, delete the supplier-product relationship record
    const supplierProductRef = doc(db, 'supplier_products', supplierId, 'products', productId);
    await deleteDoc(supplierProductRef);
    
    // Then, remove supplier information from the product's variant array
    await removeSupplierFromProductVariants(productId, supplierId);
    
    return { success: true };
  } catch (error) {
    console.error('Error unlinking product from supplier:', error);
    return { success: false, error };
  }
};

// Helper function to remove supplier information from product variants
const removeSupplierFromProductVariants = async (productId, supplierId) => {
  try {
    // Find the product in the nested structure: Products/{storageLocation}/products/{productId}
    const storageLocationsRef = collection(db, 'Products');
    const storageLocationsSnapshot = await getDocs(storageLocationsRef);
    
    let productFound = false;
    
    for (const storageLocationDoc of storageLocationsSnapshot.docs) {
      const storageLocation = storageLocationDoc.id;
      
      // Skip non-storage unit documents
      if (!storageLocation.startsWith('Unit ')) {
        continue;
      }
      
      // Check if this storage location has a products subcollection
      const productsRef = collection(db, 'Products', storageLocation, 'products');
      
      try {
        const productsSnapshot = await getDocs(productsRef);
        
        for (const productDoc of productsSnapshot.docs) {
          if (productDoc.id === productId || productDoc.id.startsWith(productId)) {
            const productData = productDoc.data();
            const productRef = doc(db, 'Products', storageLocation, 'products', productDoc.id);
            
            // Check if product has variants structure
            if (productData.variants && Array.isArray(productData.variants)) {
              // Remove supplier from variants' suppliers arrays
              const updatedVariants = productData.variants.map(variant => {
                if (variant.suppliers && Array.isArray(variant.suppliers)) {
                  return {
                    ...variant,
                    suppliers: variant.suppliers.filter(s => s.id !== supplierId)
                  };
                }
                return variant;
              });
              
              // Remove supplier from product-level suppliers array
              const existingSuppliers = productData.suppliers || [];
              const updatedSuppliers = existingSuppliers.filter(s => s.id !== supplierId);
              
              const updateData = {
                variants: updatedVariants,
                suppliers: updatedSuppliers,
                updatedAt: new Date().toISOString()
              };
              
              await updateDoc(productRef, updateData);
            } else {
              // Product doesn't have variants - remove supplier from product's suppliers array
              const existingSuppliers = productData.suppliers || [];
              const updatedSuppliers = existingSuppliers.filter(s => s.id !== supplierId);
              
              await updateDoc(productRef, {
                suppliers: updatedSuppliers,
                updatedAt: new Date().toISOString()
              });
            }
            
            productFound = true;
          }
        }
      } catch (err) {
        // Continue to next storage location if this one fails
        console.error(`Error removing supplier from products in ${storageLocation}:`, err);
        continue;
      }
    }
    
    if (!productFound) {
      console.warn(`Product ${productId} not found in any storage location`);
    }
  } catch (error) {
    console.error('Error removing supplier from product variants:', error);
    throw error;
  }
};

export const updateSupplierProductDetails = async (productId, supplierId, updates) => {
  try {
    // Try new structure first (Suppliers/{id}/products/{productId})
    let supplierProductRef = doc(db, 'Suppliers', supplierId, 'products', productId);
    let supplierProductDoc = await getDoc(supplierProductRef);
    
    // If not found, try old structure (supplier_products/{id}/products/{productId})
    if (!supplierProductDoc.exists()) {
      console.log('📦 Product link not in new "Suppliers" collection, using old "supplier_products"...');
      supplierProductRef = doc(db, 'supplier_products', supplierId, 'products', productId);
      supplierProductDoc = await getDoc(supplierProductRef);
    } else {
      console.log('📦 Updating product link in new "Suppliers" collection');
    }
    
    // Update the document
    await updateDoc(supplierProductRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    
    return { success: true };
  } catch (error) {
    console.error('Error updating supplier product details:', error);
    return { success: false, error };
  }
};

export const getSupplierProducts = async (supplierId) => {
  try {
    // Try new structure first (Suppliers/{id}/products)
    let supplierProductsRef = collection(db, 'Suppliers', supplierId, 'products');
    let snapshot = await getDocs(supplierProductsRef);
    
    // If empty, try old structure (supplier_products/{id}/products)
    if (snapshot.empty) {
      console.log('📦 No products in new "Suppliers" collection, checking old "supplier_products"...');
      supplierProductsRef = collection(db, 'supplier_products', supplierId, 'products');
      snapshot = await getDocs(supplierProductsRef);
    } else {
      console.log(`📦 Found ${snapshot.size} products in new "Suppliers" collection`);
    }
    
    const products = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    return { success: true, products };
  } catch (error) {
    console.error('Error fetching supplier products:', error);
    return { success: false, error };
  }
};

export const useServices = () => {
  const context = useContext(ServicesContext);
  if (!context) {
    throw new Error('useServices must be used within a ServicesProvider');
  }
  return {
    ...context,
    // NEW: Product services (flat structure)
    createProduct,
    getProductById,
    getProductWithVariants,
    updateProduct,
    deleteProduct,
    listProducts,
    searchProducts,
    // Legacy: Supplier-product relationship functions
    linkProductToSupplier,
    unlinkProductFromSupplier,
    updateSupplierProductDetails,
    getSupplierProducts
  };
};
