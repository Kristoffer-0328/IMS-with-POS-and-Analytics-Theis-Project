import React, { useState, useEffect } from "react";
import app from "../../../FirebaseConfig";
import { getFirestore, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { useServices } from "../../../FirebaseBackEndQuerry/ProductServices";

export const RestockRequestModal = ({ isOpen, onClose }) => {
  const db = getFirestore(app);
  const [products, setProducts] = useState([]);
  const [productName, setProductName] = useState("");
  const [currentStock, setCurrentStock] = useState("");
  const [requestedQty, setRequestedQty] = useState("");
  const [month, setMonth] = useState("October");

  const { getData } = useServices();

  useEffect(() => {
    const fetchData = async () => {
      const res = await getData();

      if (res.success) {
        const lowStockProducts = res.product.filter((p) => p.quantity <= 60);
        setProducts(lowStockProducts);
      } else {
        console.error("Failed to fetch products:", res.error);
      }
    };

    fetchData();
  }, [getData]);

  const handleProductChange = (e) => {
    const selectedName = e.target.value;
    setProductName(selectedName);

    const selectedProduct = products.find((p) => p.name === selectedName);
    if (selectedProduct) {
      setCurrentStock(selectedProduct.quantity || 0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const newRequest = {
        Product: productName,
        CurrentStock: parseInt(currentStock),
        Requested: parseInt(requestedQty),
        Status: "Pending",
        Action: "Pending",
        Month: month,
        CreatedAt:   new Date().toISOString().split('T')[0],
      };

      const docRef = await addDoc(collection(db, "RestockRequests"), {
        ...newRequest,
        status: "pending",
        type: "restock_request",
        timestamp: serverTimestamp(),
        requestedQuantity: parseInt(requestedQty),
        maximumStockLevel: selectedProduct?.maximumStockLevel || 0,
        restockLevel: selectedProduct?.restockLevel || 0,
        productId: selectedProduct?.id,
        category: selectedProduct?.category
      });
      console.log("Restock request created with ID: ", docRef.id);
      alert("Stock restocking request submitted.");
      onClose();
    } catch (error) {
      console.error("Error submitting restock request: ", error.message);
    }
  };

  if (!isOpen) return null;

  const monthOptions = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return (
    <div className="fixed inset-0 z-50 backdrop-blur-md bg-white/30 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-[90%] max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-xl text-gray-500 hover:text-red-500"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold mb-4">Create Restocking Request</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm">Product Name</label>
            <select
              value={productName}
              onChange={handleProductChange}
              className="w-full border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            >
              <option value="">-- Select Product --</option>
              {products.map((product) => (
                <option key={product.id} value={product.name}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm">Current Stock</label>
            <input
              type="number"
              value={currentStock}
              onChange={(e) => setCurrentStock(e.target.value)}
              min={0}
              className="w-full border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
              disabled // Disable editing if it's auto-filled
            />
          </div>

          <div>
            <label className="block text-sm">Requested Quantity</label>
            <input
              type="number"
              value={requestedQty}
              onChange={(e) => setRequestedQty(e.target.value)}
              min={1}
              className="w-full border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm">Month</label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {monthOptions.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          <div className="text-right">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Submit Request
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default RestockRequestModal;
