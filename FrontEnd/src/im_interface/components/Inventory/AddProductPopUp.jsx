import React, { useState } from "react";
import app from "../../../FirebaseConfig";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { useEffect } from "react";

const AddProductModal = ({ isOpen, onClose }) => {
  const [product, setProduct] = useState("");
  const [category, setCategory] = useState("Tools");
  const [quantity, setQuantity] = useState(1);
  const [unitprice, setUnitPrice] = useState(1);
  const [storageRoom, setStorageRoom] = useState("STR A1");
  const [expiringDate, setExpiringDate] = useState("");
  const [additionalFields, setAdditionalFields] = useState([]);
  const [newFieldName, setNewFieldName] = useState("");
  const db = getFirestore(app);
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
  
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
  
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  const storageOptions = [];
  const rows = ["A", "B", "C"];
  for (let row of rows) {
    for (let i = 1; i <= 3; i++) {
      storageOptions.push(`STR ${row}${i}`);
    }
  }

  if (!isOpen) return null;

  const handleAddField = () => {
    if (newFieldName.trim() && !additionalFields.find(f => f.name === newFieldName)) {
      setAdditionalFields([...additionalFields, { name: newFieldName, value: "" }]);
      setNewFieldName("");
    }
  };

  const handleAdditionalFieldChange = (index, value) => {
    const updatedFields = [...additionalFields];
    updatedFields[index].value = value;
    setAdditionalFields(updatedFields);
  };

  const saveData = async () => {
    try {
      const total = quantity * unitprice;
      const productRef = doc(db, "Products", product);
      const additionalData = additionalFields.reduce((acc, field) => {
        acc[field.name] = field.value;
        return acc;
      }, {});
      await setDoc(productRef, {
        ProductName: product,
        Category: category,
        Quantity: quantity,
        UnitPrice: unitprice,
        TotalValue: total,
        Location: storageRoom,
        ExpiringDate: expiringDate || null,
        ...additionalData,
      });
      console.log("Product added successfully!");
    } catch (error) {
      console.error("Error adding product: ", error.message);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveData();
    setProduct("");
    setCategory("Tools");
    setQuantity(1);
    setUnitPrice(1);
    setStorageRoom("STR A1");
    setExpiringDate("");
    setAdditionalFields([]);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 backdrop-blur-md bg-white/30 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-xl text-gray-500 hover:text-red-500"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold mb-4">Add Product</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm">Product Name</label>
            <input
              type="text"
              value={product}
              onChange={(e) => setProduct(e.target.value)}
              className="w-full border p-2 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border p-2 rounded-lg"
            >
              <option>Tools</option>
              <option>Building</option>
              <option>Finishing</option>
              <option>Electrical</option>
              <option>Plumbing</option>
            </select>
          </div>

          <div>
            <label className="block text-sm">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              min={0}
              className="w-full border p-2 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm">Unit Price ₱</label>
            <input
              type="number"
              value={unitprice}
              onChange={(e) => setUnitPrice(Number(e.target.value))}
              min={0}
              className="w-full border p-2 rounded-lg"
              required
            />
          </div>

          <div>
            <label className="block text-sm">Storage Room</label>
            <select
              value={storageRoom}
              onChange={(e) => setStorageRoom(e.target.value)}
              className="w-full border p-2 rounded-lg"
            >
              {storageOptions.map((room) => (
                <option key={room} value={room}>{room}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm">Expiring Date (Optional)</label>
            <input
              type="date"
              value={expiringDate}
              onChange={(e) => setExpiringDate(e.target.value)}
              className="w-full border p-2 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm">Add New Field</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newFieldName}
                onChange={(e) => setNewFieldName(e.target.value)}
                placeholder="e.g. Color"
                className="w-full border p-2 rounded-lg"
              />
              <button
                type="button"
                onClick={handleAddField}
                className="bg-blue-600 text-white px-3 rounded-lg hover:bg-blue-800"
              >
                +
              </button>
            </div>
          </div>

          {additionalFields.map((field, index) => (
            <div key={index}>
              <label className="block text-sm">{field.name}</label>
              <input
                type="text"
                value={field.value}
                onChange={(e) => handleAdditionalFieldChange(index, e.target.value)}
                className="w-full border p-2 rounded-lg"
              />
            </div>
          ))}

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
