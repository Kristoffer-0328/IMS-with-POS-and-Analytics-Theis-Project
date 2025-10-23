// ProductServices.jsx
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { getFirestore, collection, onSnapshot, query, getDocs, orderBy, doc, setDoc, deleteDoc, updateDoc, getDoc } from 'firebase/firestore';
import app from './config';
import { ProductFactory } from '../../features/inventory/components/Factory/productFactory';

const db = getFirestore(app);
const ServicesContext = createContext(null);

export const ServicesProvider = ({ children }) => {
  const [products, setProducts] = useState([]);

  const listenToProducts = useCallback((onUpdate) => {
    const allProducts = [];
    let isFirstLoad = true;

    // Fetch products from nested structure: Products/{storageUnit}/products/{productId}
    const fetchAllProducts = async () => {
      try {
        const allProducts = [];
        const productsRef = collection(db, "Products");
        const storageUnitsSnapshot = await getDocs(productsRef);
        
        // Iterate through each storage unit (Unit 01, Unit 02, etc.)
        for (const storageUnitDoc of storageUnitsSnapshot.docs) {
          const unitId = storageUnitDoc.id;
          
          // Skip non-storage unit documents (if any)
          if (!unitId.startsWith('Unit ')) {
            continue;
          }
          
          // Fetch products subcollection for this storage unit
          const productsSubcollectionRef = collection(db, "Products", unitId, "products");
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
              totalvalue: (typeof data.unitPrice === 'number' ? data.unitPrice : parseFloat(data.unitPrice) || 0) * 
                         (typeof data.quantity === 'number' ? data.quantity : parseInt(data.quantity) || 0)
            });
          });
        }

        
        setProducts(allProducts);
        if (onUpdate) onUpdate(allProducts);
        
      } catch (error) {
        console.error('Error fetching products:', error);
        setProducts([]);
        if (onUpdate) onUpdate([]);
      }
    };

    // Initial fetch
    fetchAllProducts();

    // Set up a listener on the Products collection to detect changes
    const unsubscribe = onSnapshot(
      collection(db, "Products"),
      (snapshot) => {
        if (!isFirstLoad) {
          fetchAllProducts();
        }
        isFirstLoad = false;
      },
      (error) => {
        console.error('Error listening to Products collection:', error);
      }
    );

    // Return cleanup function
    return () => {
      unsubscribe();
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
    const now = new Date().toISOString();
    await setDoc(supplierProductRef, {
      productId,
      supplierPrice: supplierData.supplierPrice || 0,
      supplierSKU: supplierData.supplierSKU || '',
      createdAt: now,
      updatedAt: now,
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
    // Find the product in the nested structure: Products/{storageLocation}/products/{productId}
    const storageLocationsRef = collection(db, 'Products');
    const storageLocationsSnapshot = await getDocs(storageLocationsRef);
    
    for (const storageLocationDoc of storageLocationsSnapshot.docs) {
      const storageLocation = storageLocationDoc.id;
      
      // Check if this storage location has a products subcollection
      const productsRef = collection(db, 'Products', storageLocation, 'products');
      
      try {
        const productsSnapshot = await getDocs(productsRef);
        
        for (const productDoc of productsSnapshot.docs) {
          if (productDoc.id === productId) {
            const productData = productDoc.data();
            
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
              const productRef = doc(db, 'Products', storageLocation, 'products', productId);
              await updateDoc(productRef, {
                variants: updatedVariants,
                updatedAt: new Date().toISOString()
              });

              return; // Found and updated, no need to continue searching
            }
          }
        }
      } catch (err) {
        // Continue to next storage location if this one fails
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
    // Find the product in the nested structure: Products/{storageLocation}/products/{productId}
    const storageLocationsRef = collection(db, 'Products');
    const storageLocationsSnapshot = await getDocs(storageLocationsRef);
    
    for (const storageLocationDoc of storageLocationsSnapshot.docs) {
      const storageLocation = storageLocationDoc.id;
      
      // Check if this storage location has a products subcollection
      const productsRef = collection(db, 'Products', storageLocation, 'products');
      
      try {
        const productsSnapshot = await getDocs(productsRef);
        
        for (const productDoc of productsSnapshot.docs) {
          if (productDoc.id === productId) {
            const productData = productDoc.data();
            
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
              const productRef = doc(db, 'Products', storageLocation, 'products', productId);
              await updateDoc(productRef, {
                variants: updatedVariants,
                updatedAt: new Date().toISOString()
              });

              return; // Found and updated, no need to continue searching
            }
          }
        }
      } catch (err) {
        // Continue to next storage location if this one fails
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
