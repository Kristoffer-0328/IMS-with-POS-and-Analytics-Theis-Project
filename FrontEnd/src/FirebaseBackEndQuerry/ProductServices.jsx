// ProductServices.jsx
import React, { createContext, useContext, useState } from 'react';
import { getFirestore, collection, getDocs } from "firebase/firestore";
import app from "../FirebaseConfig";

const db = getFirestore(app);
const ServicesContext = createContext(null);

export const ServicesProvider = ({ children }) => {
  const [product, setProduct] = useState(() => {
    const savedProduct = localStorage.getItem('product');
    return savedProduct ? JSON.parse(savedProduct) : null;
  });

  const getData = async () => {
    try {
      const querySnapshot = await getDocs(collection(db, "Products"));
      const productArray = [];
  
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        productArray.push({
          id: docSnap.id,
          name: data.ProductName,
          category: data.Category,
          quantity: data.Quantity,
          unitprice: data.UnitPrice,
          totalvalue: data.TotalValue,
          location: data.Location,
          status: data.Status,
          action: data.Action,
          expiringDate: data.ExpiringDate || null
        });
      });
  
      setProduct(productArray);
      localStorage.setItem('product', JSON.stringify(productArray));
  
      return { success: true, product: productArray };
    } catch (error) {
      console.error("Error fetching products: ", error);
      return { success: false, error: 'Failed to fetch products' };
    }
  };

  const value = {
    product,
    getData
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
