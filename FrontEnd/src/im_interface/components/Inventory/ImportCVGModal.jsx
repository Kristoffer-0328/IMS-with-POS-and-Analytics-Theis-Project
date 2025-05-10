import React, { useState, useEffect } from "react";
import { FiUpload } from "react-icons/fi";
import Papa from "papaparse";
import app from "../../../FirebaseConfig";
import {
  getFirestore,
  doc,
  writeBatch,
  collection,
} from "firebase/firestore";
import ProductFactory from "../Factory/productFactory";
import { useServices } from "../../../FirebaseBackEndQuerry/ProductServices";

const ImportCVGModal = ({ isOpen, onClose }) => {
  const [file, setFile] = useState(null);
  const [importProgress, setImportProgress] = useState({ total: 0, current: 0 });
  const db = getFirestore(app);
  const { listenToProducts } = useServices();
 

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    if (isOpen) document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) setFile(selectedFile);
  };

  const validateCSVData = (data) => {
    const requiredFields = ['ProductName', 'Category', 'Quantity', 'UnitPrice'];
    const missingFields = [];

    data.forEach((row, index) => {
      requiredFields.forEach(field => {
        if (!row[field]) {
          missingFields.push(`Row ${index + 1}: Missing ${field}`);
        }
      });
    });

    return missingFields;
  };

  const handleImport = async (e) => {
    e.preventDefault();
    if (!file) {
      alert("Please select a file.");
      return;
    }

    try {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const { data } = results;
          
          const missingFields = validateCSVData(data);
          if (missingFields.length > 0) {
            alert(`Validation errors:\n${missingFields.join('\n')}`);
            return;
          }

          setImportProgress({ total: data.length, current: 0 });
          
          try {
            const processedProducts = ProductFactory.processCSVData(data);
            await saveMultipleProducts(processedProducts);
            
            alert(`Successfully imported ${processedProducts.length} products.`);
            onClose();
          } catch (error) {
            console.error('Error processing products:', error);
            alert(`Error importing products: ${error.message}`);
          }
        },
        error: (err) => {
          console.error("Error parsing CSV:", err);
          alert("Error parsing CSV file.");
        }
      });
    } catch (error) {
      console.error('Error during import:', error);
      alert(`Import failed: ${error.message}`);
    }
  };

  const saveMultipleProducts = async (processedProducts) => {
    let batch = writeBatch(db);
    let operationCount = 0;
    const batchSize = 500;
    const batches = [];
    const categories = new Set();

    try {
      // First, collect all unique categories
      processedProducts.forEach(product => {
        categories.add(product.category);
      });

      // Create category documents if they don't exist
      categories.forEach(category => {
        const categoryRef = doc(db, "Products", category);
        batch.set(categoryRef, {
          name: category,
          createdAt: new Date().toISOString(),
          totalProducts: 0
        }, { merge: true });

        operationCount++;
      });

      // Save products
      processedProducts.forEach((product) => {
        const productRef = doc(db, "Products", product.category, "Items", product.id);
        
        console.log(`Saving product: ${product.id} in category: ${product.category}`);
        
        batch.set(productRef, {
          ...product,
          lastUpdated: new Date().toISOString()
        }, { merge: true });

        operationCount++;
        setImportProgress(prev => ({ ...prev, current: operationCount }));

        if (operationCount === batchSize) {
          batches.push(batch.commit());
          batch = writeBatch(db); // Create new batch
          operationCount = 0;
        }
      });

      if (operationCount > 0) {
        batches.push(batch.commit());
      }

      await Promise.all(batches);
      
      listenToProducts((updatedProducts) => {
        console.log("Products updated after import:", updatedProducts.length);
      });

    } catch (error) {
      console.error('Error saving products:', error);
      throw new Error(`Failed to save products: ${error.message}`);
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
              Upload File (.csv)
            </label>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="w-full border p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-400"
            />
            {file && (
              <p className="text-sm text-gray-600 mt-1">
                Selected: {file.name}
              </p>
            )}
          </div>

          {importProgress.total > 0 && (
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div
                  className="bg-green-600 h-2.5 rounded-full transition-all duration-300"
                  style={{ width: `${(importProgress.current / importProgress.total) * 100}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-600 mt-1">
                Processing: {importProgress.current} of {importProgress.total}
              </p>
            </div>
          )}

          <div className="text-right">
            <button
              type="submit"
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition"
              disabled={!file || importProgress.total > 0}
            >
              {importProgress.total > 0 ? 'Importing...' : 'Import'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ImportCVGModal;
