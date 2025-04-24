// ProductServices.jsx
import React, { createContext, useContext, useState } from 'react';
import {
  getFirestore,
  collection,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import app from '../FirebaseConfig';

const db = getFirestore(app);
const ServicesContext = createContext(null);

function isDateClose(date, thresholdDays = 3) {
  if (!date) return false;
  const currentDate = new Date();
  const targetDate = new Date(date);
  const timeDifference = Math.abs(currentDate - targetDate);
  const daysDifference = timeDifference / (1000 * 3600 * 24);
  return daysDifference <= thresholdDays;
}

export const ServicesProvider = ({ children }) => {
  const [product, setProduct] = useState(() => {
    const saved = localStorage.getItem('product');
    return saved ? JSON.parse(saved) : [];
  });

  const listenToProducts = (onUpdate) => {
    const categoryListeners = new Map(); // track unsubscribe functions
    const allProducts = new Map(); // store per-category product arrays
  
    const unsubscribeCategories = onSnapshot(collection(db, "Products"), (categoriesSnapshot) => {
      categoriesSnapshot.forEach((categoryDoc) => {
        const category = categoryDoc.id;
  
        // If already listening to this category, skip
        if (categoryListeners.has(category)) return;
  
        const unsubscribeItems = onSnapshot(collection(db, "Products", category, "Items"), (itemsSnapshot) => {
          const products = [];
  
          itemsSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
  
            let status = data.Quantity < 60 ? "low-stock" : "in-stock";
            if (isDateClose(data.ExpiringDate)) {
              status = "expiring-soon";
            }
  
            const action = "view";
  
            products.push({
              id: docSnap.id,
              name: data.ProductName,
              category,
              quantity: data.Quantity,
              unitprice: data.UnitPrice,
              totalvalue: data.TotalValue,
              location: data.Location,
              status,
              action,
              expiringDate: data.ExpiringDate || null,
            });
          });
  
          // Save to the full map
          allProducts.set(category, products);
  
          // Merge all product arrays from all categories
          const mergedProducts = Array.from(allProducts.values()).flat();
  
          localStorage.setItem("product", JSON.stringify(mergedProducts));
          onUpdate(mergedProducts);
        });
  
        // Track the unsubscribe function
        categoryListeners.set(category, unsubscribeItems);
      });
    });
  
    return () => {
      unsubscribeCategories();
      categoryListeners.forEach((unsub) => unsub());
    };
  };
  
  

  const fetchRestockRequests = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'StockRestocks'));
      const requestArray = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        requestArray.push({
          id: docSnap.id,
          Product: data.Product,
          currentStock: data.CurrentStock,
          requested: data.Requested,
          status: data.Status,
          actionStatus: data.Action,
          Month: data.Month,
          createdAt: data.CreatedAt || null,
        });
      });

      localStorage.setItem('restockRequests', JSON.stringify(requestArray));
      return { success: true, requests: requestArray };
    } catch (error) {
      console.error('Error fetching restock requests:', error.message);
      return { success: false, error: 'Failed to fetch restock requests' };
    }
  };

  const fetchCategories = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, 'Categories'));
      const categories = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.name) {
          categories.push(data.name);
        }
      });

      return { success: true, categories };
    } catch (error) {
      console.error('Error fetching categories:', error.message);
      return { success: false, error: 'Failed to fetch categories' };
    }
  };

  const value = {
    product,
    listenToProducts,
    fetchRestockRequests,
    fetchCategories,
  };

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
