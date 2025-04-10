import React, { useState } from "react";
import app from "../../../FirebaseConfig";
import { getFirestore, addDoc, collection, doc, setDoc } from "firebase/firestore";
const AddProductModal = ({ isOpen, onClose }) => {
  const [product, setProduct] = useState("");
  const [category, setCategory] = useState("Tools");
  const [quantity, setQuantity] = useState(1);
  const [unitprice, setUnitPrice] = useState(1);
  const [storageRoom, setStorageRoom] = useState("STR A1");
  const [expiringDate, setExpiringDate] = useState("");
  const [status, setStatus] = useState();
  const db = getFirestore(app);

  const storageOptions = [];

  const rows = ["A", "B", "C"];
  for (let row of rows) {
    for (let i = 1; i <= 3; i++) {
      storageOptions.push(`STR ${row}${i}`);
    }
  }

  if (!isOpen) return null;

  function isDateClose(date, thresholdDays = 3) {
    const currentDate = new Date();
    const targetDate = new Date(date);
    const timeDifference = Math.abs(currentDate - targetDate);
    const daysDifference = timeDifference / (1000 * 3600 * 24);
    return daysDifference <= thresholdDays;
  }
  

  const saveData = async () => {
    try {
      // Reference to the storage room
      const total = quantity * unitprice;
      
      const productRef = doc(db, "Products", product); 
      await setDoc(productRef, {
        ProductName: product,
        Category: category,
        Quantity: quantity,
        UnitPrice: unitprice,
        TotalValue: total,
        Location: storageRoom,
        ExpiringDate: expiringDate || null,
      });
      
      console.log("Product added successfully!");
    } catch (error) {
      console.error("Error adding product: ", error.message);
    }
  };
  
const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Added: ${product}, ${category}, Qty: ${quantity}, UnitPrice: ${unitprice} ,Room: ${storageRoom}, Expires on: ${expiringDate || "N/A"}`);
    saveData();
    setProduct("");
    setCategory("Tools");
    setQuantity(1);
    setUnitPrice(1);
    setStorageRoom("STR A1");
    setExpiringDate(""); // Optional, so it can be cleared
    onClose(); 
  };
  return (
    <div className="fixed inset-0 z-50 backdrop-blur-md bg-white/30 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-[100%] max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-xl text-gray-500 hover:text-red-500"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold mb-4">Add Product</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Product Name */}
          <div>
            <label className="block text-sm">Product Name</label>
            <input
              type="text"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className="w-full border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option>Tools</option>
              <option>Building</option>
              <option>Finishing</option>
              <option>Electrical</option>
              <option>Plumbing</option>
            </select>
          </div>

          {/* Quantity */}
          <div>
            <label className="block text-sm">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              min={1}
              className="w-full border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>
          <div>
            <label className="block text-sm">UnitPrice ₱</label>
            <input
              type="number"
              value={unitprice}
              placeholder="₱"
              onChange={(e) => setUnitPrice(e.target.value)}
              min={1}
              className="w-full border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>
          {/* Storage Room */}
          <div>
            <label className="block text-sm">Storage Room</label>
            <select
              value={storageRoom}
              onChange={(e) => setStorageRoom(e.target.value)}
              className="w-full border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {storageOptions.map((room) => (
                <option key={room} value={room}>
                  {room}
                </option>
              ))}
            </select>
          </div>

          {/* Expiring Date (Optional) */}
          <div>
            <label className="block text-sm">Expiring Date (Optional)</label>
            <input
              type="date"
              value={expiringDate}
              onChange={(e) => setExpiringDate(e.target.value)}
              className="w-full border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
          </div>

          {/* Submit */}
          <div className="text-right">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Add Product
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddProductModal;
