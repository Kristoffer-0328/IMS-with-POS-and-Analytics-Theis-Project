import React, { useState, useEffect } from "react";
import app from "../../../../FirebaseConfig";
import { getFirestore, addDoc, collection } from "firebase/firestore";
import { useServices } from "../../../../services/firebase/ProductServices";

export const TransferFormModal = ({ isOpen, onClose }) => {
  const db = getFirestore(app);
  const { listenToProducts } = useServices();

  const [products, setProducts] = useState([]);
  const [productName, setProductName] = useState("");
  const [fromRoom, setFromRoom] = useState("STR A1");
  const [toRoom, setToRoom] = useState("STR B1");
  const [quantity, setQuantity] = useState(1);

  const storageOptions = [];
  const rows = ["A", "B", "C"];
  for (let row of rows) {
    for (let i = 1; i <= 3; i++) {
      storageOptions.push(`STR ${row}${i}`);
    }
  }
  
  const filteredStorageRoom = () =>{
    let dataStorageRoom =[...products]

    const productname = dataStorageRoom.filter((item) => item.productName === productName);
    const productLocation = productname.location;
    return productLocation;
  }

  useEffect(() => {
    const unsubscribe = listenToProducts(setProducts);
    return () => unsubscribe();
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const newTransfer = {
        Product: productName,
        From: fromRoom,
        To: toRoom,
        Quantity: quantity,
        Status: "Pending",
        CreatedAt: new Date(),
      };

      const docRef = await addDoc(collection(db, "StockTransfers"), newTransfer);

      alert("Transfer Form Submitted. QR Code will be generated next.");
      onClose();
    } catch (error) {
      console.error("Error creating transfer: ", error.message);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 backdrop-blur-md bg-white/30 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-[90%] max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-xl text-gray-500 hover:text-red-500"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold mb-4">Create Stock Transfer</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
          <label className="block text-sm">Product Name</label>
            <select
              value={productName}
              onChange={(e) => {
                const selectedName = e.target.value;
                setProductName(selectedName);

                const selectedProduct = products.find(
                  (product) => product.name === selectedName
                );
                if (selectedProduct) {
                  setFromRoom(selectedProduct.location || ""); // auto-update From field
                }
              }}
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
            <label className="block text-sm">From</label>
            <select
              value={fromRoom}
              disabled
              onChange={(e) => setFromRoom(e.target.value)}
              className="w-full border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {storageOptions.map((room) => (
                <option key={room} value={room}>
                  {room}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm">To</label>
            <select
              value={toRoom}
              dos
              onChange={(e) => setToRoom(e.target.value)}
              className="w-full border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              {storageOptions.map((room) => (
                <option key={room} value={room}>
                  {room}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm">Quantity</label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value))}
              min={1}
              className="w-full border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
              required
            />
          </div>

          <div className="text-right">
            <button
              type="submit"
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              Generate QR Code
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TransferFormModal;
