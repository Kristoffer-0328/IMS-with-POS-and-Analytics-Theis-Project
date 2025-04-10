// ProductServices.jsx
import React, { createContext, useContext, useState } from 'react';
import { getFirestore, collection, getDocs } from "firebase/firestore";
import app from "../FirebaseConfig";

const db = getFirestore(app);
const ServicesContext = createContext(null);

function isDateClose(date, thresholdDays = 3) {
  const currentDate = new Date();
  const targetDate = new Date(date);
  const timeDifference = Math.abs(currentDate - targetDate);
  const daysDifference = timeDifference / (1000 * 3600 * 24);
  return daysDifference <= thresholdDays;
}


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
        let status = data.Quantity < 60 ? "low-stock" : "in-stock";
        if(isDateClose(data.ExpiringDate )){
          status = "expiring-soon";
        }
        const action = status === "low-stock" ? "restock" : "view";
        
        productArray.push({
          id: docSnap.id,
          name: data.ProductName,
          category: data.Category,
          quantity: data.Quantity,
          unitprice: data.UnitPrice,
          totalvalue: data.TotalValue,
          location: data.Location,
          status: status,
          action: action,
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
