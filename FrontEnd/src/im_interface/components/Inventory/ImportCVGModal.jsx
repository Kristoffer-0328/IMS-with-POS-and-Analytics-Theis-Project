import React, { useState } from "react";
import { FiUpload } from "react-icons/fi";
import Papa from 'papaparse';
import app from "../../../FirebaseConfig";
import { getFirestore, doc, writeBatch, collection } from "firebase/firestore";
import { useEffect } from "react";

const ImportCVGModal = ({ isOpen, onClose }) => {
  const [file, setFile] = useState(null);
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
      const batch = writeBatch(db);
  
      products.forEach((item) => {
        // Create a cleaned object with optional number conversion
        const cleanedItem = Object.fromEntries(
          Object.entries(item).map(([key, value]) => {
            if (value === undefined || value === null || value === "") return [key, null];
            const num = parseFloat(value);
            return [key, isNaN(num) ? value : num];
          })
        );
        if (
          cleanedItem.Quantity != null &&
          cleanedItem.UnitPrice != null &&
          !isNaN(cleanedItem.Quantity) &&
          !isNaN(cleanedItem.UnitPrice)
        ) {
          cleanedItem.TotalValue = cleanedItem.Quantity * cleanedItem.UnitPrice;
        }
        console.log(cleanedItem.ProductName);
        const productRef = doc(collection(db, "Products"), cleanedItem.ProductName);
        batch.set(productRef, cleanedItem);
      });
  
      await batch.commit();
      console.log("All products added successfully!");
    } catch (error) {
      console.error("Error adding products:", error.message);
    }
  };
  
  return (
    <div className="fixed inset-0 z-50 backdrop-blur-md bg-white/30 flex justify-center items-center">

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
