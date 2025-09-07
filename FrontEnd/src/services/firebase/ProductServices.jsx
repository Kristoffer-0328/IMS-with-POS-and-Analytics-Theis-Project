// ProductServices.jsx
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { getFirestore, collection, onSnapshot, query, getDocs, orderBy, doc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import app from './config';
import { ProductFactory } from '../../features/inventory/components/Factory/productFactory';

const db = getFirestore(app);
const ServicesContext = createContext(null);

export const ServicesProvider = ({ children }) => {
  const [products, setProducts] = useState([]);

  const listenToProducts = useCallback((onUpdate) => {
    const categoryListeners = new Map();
    const allProducts = new Map();
    let isFirstLoad = true;

    const unsubscribeCategories = onSnapshot(
      collection(db, "Products"),
      (categoriesSnapshot) => {
        
        // Handle removed categories
        const currentCategories = new Set(categoriesSnapshot.docs.map(doc => doc.id));
        [...categoryListeners.keys()].forEach(category => {
          if (!currentCategories.has(category)) {
            const unsubscribe = categoryListeners.get(category);
            if (unsubscribe) unsubscribe();
            categoryListeners.delete(category);
            allProducts.delete(category);
          }
        });

        // Set up listeners for each category's Items subcollection
        categoriesSnapshot.forEach((categoryDoc) => {
          const category = categoryDoc.id;

          // Skip if already listening to this category
          if (categoryListeners.has(category)) return;

          const itemsQuery = query(collection(db, "Products", category, "Items"));
          
          const unsubscribeItems = onSnapshot(
            itemsQuery,
            (itemsSnapshot) => {
              if (!isFirstLoad && !itemsSnapshot.docChanges().length) {
                return; // Skip if no actual changes and not first load
              }

              const categoryProducts = itemsSnapshot.docs.map(doc => {
                const data = doc.data();
                console.log('Raw product data:', {
                  id: doc.id,
                  name: data.name,
                  supplier: data.supplier,
                  supplierCode: data.supplierCode,
                  variants: data.variants
                });
                return {
                  ...data,
                  id: doc.id,
                  baseProductId: doc.id.split('-')[0],
                  category: category,
                  brand: data.brand || 'Generic',
                  subCategory: data.subCategory || category,
                  specifications: data.specifications || '',
                  storageType: data.storageType || 'Goods',
                  unitPrice: typeof data.unitPrice === 'number' ? data.unitPrice : parseFloat(data.unitPrice),
                  supplierCode: data.supplierCode || '',
                  supplier: data.supplier || {
                    name: 'Unknown',
                    code: '',
                    address: '',
                    contactPerson: '',
                    phone: '',
                    email: ''
                  },
                  variants: Array.isArray(data.variants) ? data.variants.map((variant, index) => ({
                    ...variant,
                    id: `${doc.id}-${index}`,
                    baseProductId: doc.id,
                    brand: data.brand || 'Generic',
                    storageType: variant.storageType || data.storageType || 'Goods',
                    specifications: variant.specifications || data.specifications || '',
                    unitPrice: typeof variant.unitPrice === 'number' ? variant.unitPrice : parseFloat(variant.unitPrice) || 0,
                    supplierCode: variant.supplierCode || data.supplierCode || '',
                    supplier: variant.supplier || data.supplier || {
                      name: 'Unknown',
                      code: ''
                    }
                  })) : []
                };
              });

              allProducts.set(category, categoryProducts);
              
              const mergedProducts = Array.from(allProducts.values()).flat();
              
              setProducts(mergedProducts);
              if (onUpdate) onUpdate(mergedProducts);
              
              if (isFirstLoad) isFirstLoad = false;
            },
            (error) => {
              console.error(`Error listening to ${category} items:`, error);
            }
          );

          categoryListeners.set(category, unsubscribeItems);
        });
      }
    );

    // Return cleanup function
    return () => {
      console.log("Cleaning up product listeners");
      unsubscribeCategories();
      categoryListeners.forEach(unsubscribe => unsubscribe());
      categoryListeners.clear();
      allProducts.clear();
    };
  }, []); // Empty dependency array since it doesn't depend on any external values

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

  const value = useMemo(() => ({
    products,
    listenToProducts,
    fetchRestockRequests
  }), [products, listenToProducts, fetchRestockRequests]);

  return (
    <ServicesContext.Provider value={value}>
      {children}
    </ServicesContext.Provider>
  );
};

// Functions for managing supplier-product relationships
export const linkProductToSupplier = async (productId, supplierId, supplierData) => {
  try {
    // First, create the supplier-product relationship record
    const supplierProductRef = doc(db, 'supplier_products', supplierId, 'products', productId);
    await setDoc(supplierProductRef, {
      productId,
      supplierPrice: supplierData.supplierPrice || 0,
      supplierSKU: supplierData.supplierSKU || '',
      lastUpdated: new Date().toISOString(),
    });

    // Then, update the product's variant array with supplier information
    await updateProductVariantsWithSupplier(productId, supplierId, supplierData);
    
    return { success: true };
  } catch (error) {
    console.error('Error linking product to supplier:', error);
    return { success: false, error };
  }
};

// Helper function to update product variants with supplier information
const updateProductVariantsWithSupplier = async (productId, supplierId, supplierData) => {
  try {
    // Find the product in all categories
    const categoriesRef = collection(db, 'Products');
    const categoriesSnapshot = await getDocs(categoriesRef);
    
    for (const categoryDoc of categoriesSnapshot.docs) {
      const categoryName = categoryDoc.id;
      const productRef = doc(db, 'Products', categoryName, 'Items', productId);
      
      try {
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const productData = productSnap.data();
          
          // Update variants with supplier information
          if (productData.variants && Array.isArray(productData.variants)) {
            const updatedVariants = productData.variants.map(variant => ({
              ...variant,
              supplier: {
                name: supplierData.supplierName || 'Unknown',
                code: supplierData.supplierCode || supplierData.supplierSKU || '',
                id: supplierId,
                price: supplierData.supplierPrice || variant.unitPrice || 0,
                sku: supplierData.supplierSKU || ''
              }
            }));
            
            // Update the product document with the new variants
            await updateDoc(productRef, {
              variants: updatedVariants,
              lastUpdated: new Date().toISOString()
            });
            
            console.log(`Updated product ${productId} in category ${categoryName} with supplier information`);
            break; // Found and updated, no need to continue searching
          }
        }
      } catch (err) {
        // Continue to next category if this one fails
        continue;
      }
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
    // Find the product in all categories
    const categoriesRef = collection(db, 'Products');
    const categoriesSnapshot = await getDocs(categoriesRef);
    
    for (const categoryDoc of categoriesSnapshot.docs) {
      const categoryName = categoryDoc.id;
      const productRef = doc(db, 'Products', categoryName, 'Items', productId);
      
      try {
        const productSnap = await getDoc(productRef);
        if (productSnap.exists()) {
          const productData = productSnap.data();
          
          // Remove supplier information from variants
          if (productData.variants && Array.isArray(productData.variants)) {
            const updatedVariants = productData.variants.map(variant => {
              // Remove supplier info if it matches the supplier being unlinked
              if (variant.supplier && variant.supplier.id === supplierId) {
                const { supplier, ...variantWithoutSupplier } = variant;
                return variantWithoutSupplier;
              }
              return variant;
            });
            
            // Update the product document with the updated variants
            await updateDoc(productRef, {
              variants: updatedVariants,
              lastUpdated: new Date().toISOString()
            });
            
            console.log(`Removed supplier ${supplierId} from product ${productId} in category ${categoryName}`);
            break; // Found and updated, no need to continue searching
          }
        }
      } catch (err) {
        // Continue to next category if this one fails
        continue;
      }
    }
  } catch (error) {
    console.error('Error removing supplier from product variants:', error);
    throw error;
  }
};

export const updateSupplierProductDetails = async (productId, supplierId, updates) => {
  try {
    const supplierProductRef = doc(db, 'supplier_products', supplierId, 'products', productId);
    await updateDoc(supplierProductRef, {
      ...updates,
      lastUpdated: new Date().toISOString()
    });
    return { success: true };
  } catch (error) {
    console.error('Error updating supplier product details:', error);
    return { success: false, error };
  }
};

export const getSupplierProducts = async (supplierId) => {
  try {
    const supplierProductsRef = collection(db, 'supplier_products', supplierId, 'products');
    const snapshot = await getDocs(supplierProductsRef);
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
    linkProductToSupplier,
    unlinkProductFromSupplier,
    updateSupplierProductDetails,
    getSupplierProducts
  };
};
