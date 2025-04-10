import React, { useState } from "react";
import { FiUpload } from "react-icons/fi";
import Papa from 'papaparse';
import app from "../../../FirebaseConfig";
import { getFirestore, doc,writeBatch } from "firebase/firestore";

const ImportCVGModal = ({ isOpen, onClose }) => {
  const [file, setFile] = useState(null);
  const [product, setProduct] = useState("");
  const [category, setCategory] = useState("Tools");
  const [quantity, setQuantity] = useState(1);
  const [unitprice, setUnitPrice] = useState(1);
  const [storageRoom, setStorageRoom] = useState("STR A1");
  const [expiringDate, setExpiringDate] = useState("");
  const [importData, setImportData] = useState([]);
  const [status, setStatus] = useState();
  const db = getFirestore(app);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };
  

  const handleImport = (e) => {
    e.preventDefault();

    if (!file) {
      alert("Please select a CSV or Excel file.");
      return;
    }
    Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          // You can now use results.data (an array of objects) however you want
          alert(`Imported: ` + file.name);
          saveMultipleProducts(results.data);
        },
        error: (err) => {
          console.error("Error parsing CSV:", err.message);
          alert("Error parsing CSV file.");
        }
      });
      
    // Reset
    setFile(null);
    onClose();
  };
  const saveMultipleProducts = async (products) => {
    try {
      const batch = writeBatch(db); // Use a batch for performance and atomicity
  
      products.forEach((item) => {
        const { ProductName, Category, Quantity, UnitPrice, Location, ExpiringDate } = item;
        const total = Quantity * UnitPrice;
        
  
        const productRef = doc(db, "Products", ProductName);
        batch.set(productRef, {
          ProductName,
          Category,
          Quantity,
          UnitPrice,
          TotalValue: total,
          Location,
          ExpiringDate: ExpiringDate || null,
        });
      });
  
      await batch.commit();
      
      console.log("All products added successfully!");
      console.log(products)
    } catch (error) {
      console.error("Error adding multiple products: ", error.message);
    }
  };
  

  return (
    <div className="fixed inset-0 z-50 bg-white bg-opacity-50 flex justify-center items-center">
      <div className="bg-white p-6 rounded-lg shadow-xl w-[90%] max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-4 text-xl text-gray-500 hover:text-red-500"
        >
          ✕
        </button>

        <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
          <FiUpload className="w-6 h-6 text-green-600" />
          Import CVG File
        </h2>

        <form onSubmit={handleImport} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Upload File (.csv or .xlsx)
            </label>
            <input
              type="file"
              accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              onChange={handleFileChange}
              className="w-full border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            {file && (
              <p className="text-sm text-gray-600 mt-1">Selected: {file.name}</p>
            )}
          </div>

          <div className="text-right">
            <button
              type="submit"
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
            >
              Import
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ImportCVGModal;
