import React, { useState, useEffect } from "react";
import app from "../../../FirebaseConfig";
import {
  getFirestore,
  doc,
  setDoc,
  getDocs,
  collection,
  addDoc,
  deleteDoc,
} from "firebase/firestore";

const AddProductModal = ({ isOpen, onClose }) => {
  const [product, setProduct] = useState("");
  const [category, setCategory] = useState("");
  const [categories, setCategories] = useState([]);
  const [newCategory, setNewCategory] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [unitprice, setUnitPrice] = useState(1);
  const [storageRoom, setStorageRoom] = useState("STR A1");
  const [expiringDate, setExpiringDate] = useState("");
  const [additionalFields, setAdditionalFields] = useState([]);
  const [newFieldName, setNewFieldName] = useState("");

  const db = getFirestore(app);

  const storageOptions = [];
  const rows = ["A", "B", "C"];
  for (let row of rows) {
    for (let i = 1; i <= 3; i++) {
      storageOptions.push(`STR ${row}${i}`);
    }
  }

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const fetchCategories = async () => {
      const querySnapshot = await getDocs(collection(db, "Categories"));
      const fetchedCategories = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setCategories(fetchedCategories);
      if (fetchedCategories.length && !category) {
        setCategory(fetchedCategories[0].name);
      }
    };

    if (isOpen) {
      fetchCategories();
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleAddField = () => {
    if (
      newFieldName.trim() &&
      !additionalFields.find((f) => f.name === newFieldName)
    ) {
      setAdditionalFields([...additionalFields, { name: newFieldName, value: "" }]);
      setNewFieldName("");
    }
  };

  const handleAdditionalFieldChange = (index, value) => {
    const updatedFields = [...additionalFields];
    updatedFields[index].value = value;
    setAdditionalFields(updatedFields);
  };

  const handleAddCategory = async () => {
    if (!newCategory.trim()) return;
    try {
      const categoryRef = doc(db, "Categories", newCategory);
      await setDoc(categoryRef, {
        name: newCategory,
      });
      setNewCategory("");
      const querySnapshot = await getDocs(collection(db, "Categories"));
      const cats = querySnapshot.docs.map((doc) => ({
        ...doc.data(),
      }));
      setCategories(cats);
    } catch (error) {
      console.error("Error adding category:", error.message);
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    try {
      await deleteDoc(doc(db, "Categories", categoryId));
      const updated = categories.filter((c) => c.id !== categoryId);
      setCategories(updated);
      if (categoryId === category) {
        setCategory(updated.length > 0 ? updated[0].name : "");
      }
    } catch (error) {
      console.error("Error deleting category:", error.message);
    }
  };

  const saveData = async () => {
    try {
      const total = quantity * unitprice;
      const productRef = doc(db, "Products", category);
      const categoryRef = doc(productRef, "Items", product);
   
      const additionalData = additionalFields.reduce((acc, field) => {
        acc[field.name] = field.value;
        return acc;
      }, {});

      await setDoc(categoryRef, {
        ProductName: product,
        Category: category,
        Quantity: quantity,
        UnitPrice: unitprice,
        TotalValue: total,
        Location: storageRoom,
        ExpiringDate: expiringDate || null,
        ...additionalData,
      });
      alert("Product Added Successfully!");
      console.log("Product added successfully!");
    } catch (error) {
      console.error("Error adding product: ", error.message);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    saveData();
    setProduct("");
    setCategory(categories.length ? categories[0].name : "");
    setQuantity(1);
    setUnitPrice(1);
    setStorageRoom("STR A1");
    setExpiringDate("");
    setAdditionalFields([]);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 backdrop-blur-md bg-white/30 flex justify-center items-center">
      <form onSubmit={handleSubmit} className="bg-white space-y-4 p-10 max-w-lg w-full shadow-lg rounded-2xl">
        
        <div className=" grid grid-cols-2 gap-4">
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
              value={newCategory}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border p-2 rounded-lg"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="New category"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="w-full border p-2 rounded-lg"
            />
            <button
              type="button"
              onClick={handleAddCategory}
              className="bg-blue-600 text-white px-3 rounded-lg hover:bg-green-800"
            >
              Add
            </button>
          </div>

          <ul className="mt-2 max-h-28 overflow-y-auto text-sm">
            {categories.map((cat) => (
              <li
                key={cat.id}
                className="flex justify-between items-center border-b py-1"
              >
                {cat.name}
                <button
                  type="button"
                  onClick={() => handleDeleteCategory(cat.id)}
                  className="text-red-500 hover:text-red-700 text-xs"
                >
                  Delete
                </button>
              </li>
            ))}
          </ul>
        </div>
        <div className="grid grid-cols-3 gap-4">
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
                <option key={room} value={room}>
                  {room}
                </option>
              ))}
            </select>
          </div>
        </div>

       
        <div className="grid grid-cols-2 gap-4">
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
        </div>

    
        {additionalFields.length > 0 && (
          <div className=" grid grid-cols-2 gap-4">
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
          </div>
        )}

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
  );
};

export default AddProductModal;
