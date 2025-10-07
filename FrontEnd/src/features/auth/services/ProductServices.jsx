// ProductServices.jsx
import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { getFirestore, collection, onSnapshot, query, getDocs, orderBy } from 'firebase/firestore';
import app from '../../../FirebaseConfig';
import ProductFactory from '../../inventory/components/Factory/productFactory';

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
                return {
                  id: doc.id,
                  baseProductId: doc.id.split('-')[0],
                  category: category,
                  brand: data.brand || 'Generic',
                  subCategory: data.subCategory || category,
                  specifications: data.specifications || '',
                  storageType: data.storageType || 'Goods',
                  supplier: data.supplier || {
                    name: 'Unknown',
                    code: ''
                  },
                  ...data,
                  variants: Array.isArray(data.variants) ? data.variants.map((variant, index) => ({
                    ...variant,
                    id: `${doc.id}-${index}`,
                    baseProductId: doc.id,
                    brand: data.brand || 'Generic',
                    storageType: variant.storageType || data.storageType || 'Goods',
                    specifications: variant.specifications || data.specifications || '',
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

export const useServices = () => {
  const context = useContext(ServicesContext);
  if (!context) {
    throw new Error('useServices must be used within a ServicesProvider');
  }
  return context;
};
