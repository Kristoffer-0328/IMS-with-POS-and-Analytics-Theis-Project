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

const ImportCVGModal = ({ isOpen, onClose }) => {
  const [file, setFile] = useState(null);
  const db = getFirestore(app);

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

  const handleImport = (e) => {
    e.preventDefault();

    if (!file) {
      alert("Please select a file.");
      return;
    }

    // Validate if the file is a CSV
    if (file.type !== "text/csv") {
      alert("Please select a valid CSV file.");
      return;
    }

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        alert(`Imported: ${file.name}`);
        saveMultipleProducts(results.data);
      },
      error: (err) => {
        console.error("Error parsing CSV:", err.message);
        alert("Error parsing CSV file.");
      },
    });

    setFile(null);
    onClose();
};

const saveMultipleProducts = async (products) => {
  try {
    const batch = writeBatch(db);
    const categorySet = new Set();

    // To track existing products and variants
    const productVariants = new Map();

    products.forEach((item) => {
      // Clean up the item: Set undefined or empty fields to null
      const cleanedItem = Object.fromEntries(
        Object.entries(item).map(([key, value]) => {
          if (value === undefined || value === null || value === "") {
            return [key, null]; // Replace undefined or empty values with null
          }
          const num = parseFloat(value);
          return [key, isNaN(num) ? value : num];
        })
      );

      // Log the cleaned data for inspection
      console.log("Cleaned Item:", cleanedItem);

      // Ensure required fields are not null or undefined
      if (
        !cleanedItem.ProductName ||
        !cleanedItem.Category ||
        cleanedItem.Quantity == null ||
        cleanedItem.UnitPrice == null
      ) {
        console.error("Skipping product due to missing required fields:", cleanedItem);
        return; // Skip this product if essential fields are missing
      }

      // Handle product variants (group them by ProductName and Size)
      const productName = cleanedItem.ProductName;
      const size = cleanedItem.Size; // Variant size can be used to distinguish

      // Create a unique product ID combining ProductName and Size
      const productVariantID = `${productName}${size}`;

      if (!productVariants.has(productVariantID)) {
        productVariants.set(productVariantID, {
          ProductName: cleanedItem.ProductName,
          Category: cleanedItem.Category,
          Location: cleanedItem.Location ?? null, 
          variants: [],
          Quantity: 0,
        });
      }

      // Add variant details
      const product = productVariants.get(productVariantID);
      const variant = {
        size: cleanedItem.Size ?? null,
        length: cleanedItem.LengthPerUnit ?? null,
        unit: cleanedItem.Unit ?? null,
        quantity: cleanedItem.Quantity ?? null,
        unitPrice: cleanedItem.UnitPrice ?? null,
      };      
      product.variants.push(variant);

      // Calculate total quantity for the product
      product.Quantity += cleanedItem.Quantity;

      // Handle category reference
      const categoryRef = doc(db, "Products", cleanedItem.Category);
      batch.set(categoryRef, { name: cleanedItem.Category }, { merge: true });

      // Handle the product reference (with variants)
      const productRef = doc(
        collection(db, "Products", cleanedItem.Category, "Items"),
        productVariantID // Unique document ID for each variant
      );
      batch.set(productRef, product);

      // Track categories for batch commit
      categorySet.add(cleanedItem.Category);
    });

    // Commit categories
    categorySet.forEach((categoryName) => {
      const categoryRef = doc(collection(db, "Categories"), categoryName);
      batch.set(categoryRef, { name: categoryName });
    });

    // Commit all the changes in batch
    await batch.commit();
    console.log("All products and categories added successfully!");
  } catch (error) {
    console.error("Error adding products and categories:", error.message);
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
              <p className="text-sm text-gray-600 mt-1">
                Selected: {file.name}
              </p>
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
