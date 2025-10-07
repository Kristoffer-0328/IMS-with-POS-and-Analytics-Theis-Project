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

    // Simplified approach: recursively fetch all products from the nested structure
    const fetchAllProducts = async () => {
      try {

        const storageLocationsRef = collection(db, "Products");
        const storageLocationsSnapshot = await getDocs(storageLocationsRef);
        
        const productPromises = [];
        
        for (const storageLocationDoc of storageLocationsSnapshot.docs) {
          const storageLocation = storageLocationDoc.id;

          // Fetch the storage unit's category
          const storageLocationData = storageLocationDoc.data();
          const unitCategory = storageLocationData.category || storageLocation;

          const shelvesRef = collection(db, "Products", storageLocation, "shelves");
          const shelvesSnapshot = await getDocs(shelvesRef);
          
          for (const shelfDoc of shelvesSnapshot.docs) {
            const shelfName = shelfDoc.id;
            
            const rowsRef = collection(db, "Products", storageLocation, "shelves", shelfName, "rows");
            const rowsSnapshot = await getDocs(rowsRef);
            
            for (const rowDoc of rowsSnapshot.docs) {
              const rowName = rowDoc.id;
              
              const columnsRef = collection(db, "Products", storageLocation, "shelves", shelfName, "rows", rowName, "columns");
              const columnsSnapshot = await getDocs(columnsRef);
              
              for (const columnDoc of columnsSnapshot.docs) {
                const columnIndex = columnDoc.id;
                
                const productsRef = collection(db, "Products", storageLocation, "shelves", shelfName, "rows", rowName, "columns", columnIndex, "items");
                
                productPromises.push(
                  getDocs(productsRef).then(productsSnapshot => {
                    return productsSnapshot.docs.map(doc => {
                      const data = doc.data();

                      return {
                        ...data,
                        id: doc.id,
                        baseProductId: doc.id.split('-')[0],
                        category: data.category || unitCategory, // Use data.category first, fallback to storage unit's category
                        storageLocation: storageLocation,
                        shelfName: shelfName,
                        rowName: rowName,
                        columnIndex: columnIndex,
                        fullLocation: `${storageLocation} - ${shelfName} - ${rowName} - Column ${columnIndex}`,
                        brand: data.brand || 'Generic',
                        subCategory: data.subCategory || data.category || unitCategory,
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
                        variants: (Array.isArray(data.variants) && data.variants.length > 0) || (data.variants && typeof data.variants === 'object' && Object.keys(data.variants).length > 0)
                          ? (Array.isArray(data.variants) ? data.variants : Object.values(data.variants)).map((variant, index) => ({
                          ...variant,
                          id: `${doc.id}-${index}`,
                          variantId: variant.variantId || `${doc.id}-${index}`,
                          baseProductId: doc.id,
                          brand: data.brand || 'Generic',
                          size: variant.size || variant.variantName || '',
                          variantName: variant.variantName || variant.size || '',
                          storageType: variant.storageType || data.storageType || 'Goods',
                          specifications: variant.specifications || data.specifications || '',
                          unitPrice: typeof variant.unitPrice === 'number' ? variant.unitPrice : parseFloat(variant.unitPrice) || 0,
                          quantity: typeof variant.quantity === 'number' ? variant.quantity : parseInt(variant.quantity) || 0,
                          unit: variant.unit || 'pcs',
                          supplierCode: variant.supplierCode || data.supplierCode || data.supplier?.primaryCode || data.supplier?.code || '',
                          // Add location fields to variants
                          storageLocation: storageLocation,
                          shelfName: shelfName,
                          rowName: rowName,
                          columnIndex: columnIndex,
                          fullLocation: `${storageLocation} - ${shelfName} - ${rowName} - Column ${columnIndex}`,
                          supplier: variant.supplier || data.supplier || {
                            name: 'Unknown',
                            primaryCode: '',
                            code: ''
                          }
                        })) : [
                          // Create a default variant if no variants exist
                          {
                            id: doc.id,
                            variantId: doc.id,
                            baseProductId: doc.id,
                            brand: data.brand || 'Generic',
                            size: data.size || 'Standard',
                            variantName: 'Standard',
                            storageType: data.storageType || 'Goods',
                            specifications: data.specifications || '',
                            unitPrice: typeof data.unitPrice === 'number' ? data.unitPrice : parseFloat(data.unitPrice) || 0,
                            quantity: typeof data.quantity === 'number' ? data.quantity : parseInt(data.quantity) || 0,
                            unit: data.unit || 'pcs',
                            supplierCode: data.supplierCode || data.supplier?.primaryCode || data.supplier?.code || '',
                            // Add location fields to default variant
                            storageLocation: storageLocation,
                            shelfName: shelfName,
                            rowName: rowName,
                            columnIndex: columnIndex,
                            fullLocation: `${storageLocation} - ${shelfName} - ${rowName} - Column ${columnIndex}`,
                            supplier: data.supplier || {
                              name: 'Unknown',
                              primaryCode: '',
                              code: ''
                            }
                          }
                        ],
                        // Calculate total value for display
                        totalvalue: (typeof data.unitPrice === 'number' ? data.unitPrice : parseFloat(data.unitPrice) || 0) * 
                                   (typeof data.quantity === 'number' ? data.quantity : parseInt(data.quantity) || 0)
                      };
                    });
                  }).catch(error => {
                    console.error(`Error fetching products from ${storageLocation}/${shelfName}/${rowName}/${columnIndex}:`, error);
                    return [];
                  })
                );
              }
            }
          }
        }
        
        const productArrays = await Promise.all(productPromises);
        const allProducts = productArrays.flat();

        
        
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

    // Set up a single listener on the top-level Products collection to detect changes
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
    // Find the product in the new nested structure
    const storageLocationsRef = collection(db, 'Products');
    const storageLocationsSnapshot = await getDocs(storageLocationsRef);
    
    for (const storageLocationDoc of storageLocationsSnapshot.docs) {
      const storageLocation = storageLocationDoc.id;
      const shelvesRef = collection(db, 'Products', storageLocation);
      const shelvesSnapshot = await getDocs(shelvesRef);
      
      for (const shelfDoc of shelvesSnapshot.docs) {
        const shelfName = shelfDoc.id;
        const rowsRef = collection(db, 'Products', storageLocation, shelfName);
        const rowsSnapshot = await getDocs(rowsRef);
        
        for (const rowDoc of rowsSnapshot.docs) {
          const rowName = rowDoc.id;
          const columnsRef = collection(db, 'Products', storageLocation, shelfName, rowName);
          const columnsSnapshot = await getDocs(columnsRef);
          
          for (const columnDoc of columnsSnapshot.docs) {
            const columnIndex = columnDoc.id;
            const productRef = doc(db, 'Products', storageLocation, shelfName, rowName, columnIndex, productId);
            
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

                  return; // Found and updated, no need to continue searching
                }
              }
            } catch (err) {
              // Continue to next location if this one fails
              continue;
            }
          }
        }
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
    // Find the product in the new nested structure
    const storageLocationsRef = collection(db, 'Products');
    const storageLocationsSnapshot = await getDocs(storageLocationsRef);
    
    for (const storageLocationDoc of storageLocationsSnapshot.docs) {
      const storageLocation = storageLocationDoc.id;
      const shelvesRef = collection(db, 'Products', storageLocation);
      const shelvesSnapshot = await getDocs(shelvesRef);
      
      for (const shelfDoc of shelvesSnapshot.docs) {
        const shelfName = shelfDoc.id;
        const rowsRef = collection(db, 'Products', storageLocation, shelfName);
        const rowsSnapshot = await getDocs(rowsRef);
        
        for (const rowDoc of rowsSnapshot.docs) {
          const rowName = rowDoc.id;
          const columnsRef = collection(db, 'Products', storageLocation, shelfName, rowName);
          const columnsSnapshot = await getDocs(columnsRef);
          
          for (const columnDoc of columnsSnapshot.docs) {
            const columnIndex = columnDoc.id;
            const productRef = doc(db, 'Products', storageLocation, shelfName, rowName, columnIndex, productId);
            
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

                  return; // Found and updated, no need to continue searching
                }
              }
            } catch (err) {
              // Continue to next location if this one fails
              continue;
            }
          }
        }
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
