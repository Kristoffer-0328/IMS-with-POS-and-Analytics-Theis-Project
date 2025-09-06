import React, { useState, useEffect } from "react";
import { FiUpload } from "react-icons/fi";
import Papa from "papaparse";
import app from "../../../../services/firebase/config";
import {
  getFirestore,
  doc,
  writeBatch,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import ProductFactory from "../Factory/productFactory";
import { useServices } from "../../../../services/firebase/ProductServices";

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
    const totalOperations = processedProducts.length + new Set(processedProducts.map(p => p.category)).size;

    try {
      setImportProgress({ total: totalOperations, current: 0 });
      
      // First, collect all unique categories
      processedProducts.forEach(product => {
        categories.add(product.category);
      });

      // Create category documents if they don't exist
      for (const category of categories) {
        const categoryRef = doc(db, "Products", category);
        batch.set(categoryRef, {
          name: category,
          createdAt: new Date().toISOString(),
          totalProducts: 0
        }, { merge: true });

        operationCount++;
        setImportProgress(prev => ({ ...prev, current: operationCount }));
      }

      // Save products
      for (const product of processedProducts) {
        const productRef = doc(db, "Products", product.category, "Items", product.id);
        
        console.log(`Saving product: ${product.id} in category: ${product.category}`);
        
        batch.set(productRef, {
          ...product,
          lastUpdated: new Date().toISOString()
        }, { merge: true });

        operationCount++;
        setImportProgress(prev => ({ ...prev, current: operationCount }));

        if (operationCount % batchSize === 0) {
          await batch.commit();
          batch = writeBatch(db);
        }
      }

      if (operationCount % batchSize !== 0) {
        await batch.commit();
      }
      
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
            <div className="relative">
              <button
                type="button"
                onClick={() => document.getElementById('fileInput').click()}
                className="w-full bg-white border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-green-500 transition-colors cursor-pointer"
              >
                <FiUpload className="mx-auto h-6 w-6 text-gray-400 mb-2" />
                <span className="text-sm text-gray-600">
                  {file ? file.name : 'Click to upload CSV file'}
                </span>
              </button>
              <input
                id="fileInput"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
            {file && (
              <p className="text-sm text-green-600 mt-1">
                File selected and ready to import
              </p>
            )}
          </div>

          {importProgress.total > 0 && (
            <div className="mt-4">
              <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden border border-gray-200">
                <div
                  className="bg-green-600 h-full rounded-full transition-all duration-500 ease-out"
                  style={{ 
                    width: `${Math.min((importProgress.current / importProgress.total) * 100, 100)}%`,
                  }}
                ></div>
              </div>
              <div className="flex justify-between mt-2">
                <p className="text-sm text-gray-600">
                  Processing: {importProgress.current} of {importProgress.total}
                </p>
                <p className="text-sm text-gray-600">
                  {Math.min(Math.round((importProgress.current / importProgress.total) * 100), 100)}%
                </p>
              </div>
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
