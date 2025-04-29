import React, { useEffect, useRef, useState } from 'react';
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getFirestore, doc, updateDoc } from "firebase/firestore";
import app from '../../../FirebaseConfig';

const ViewProductModal = ({ isOpen, onClose, product }) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  
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

  if (!isOpen || !product) return null;

  const getProductDetail = (field) => product[field] ?? "N/A";

  const handleImageClick = () => {
    fileInputRef.current.click();
  };
  
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      const storage = getStorage();
      const storageRef = ref(storage, `product_images/${product.id}-${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      // Update Firestore
      const db = getFirestore(app);
      const productRef = doc(db, "Products", getProductDetail('category'), "Items", getProductDetail('name')); // adjust your collection name
      await updateDoc(productRef, {
        imageUrl: url,
      });

      alert("Image updated successfully!");

      // Optionally, refresh the page or reload the product manually
      window.location.reload();

    } catch (error) {
      console.error("Error uploading image: ", error);
      alert("Failed to upload image.");
    } finally {
      setUploading(false);
    }
  };

  const standardKeys = [
    "name",
    "category",
    "quantity",
    "unitprice",
    "totalvalue",
    "location",
    "expiringDate",
    "length",
    "status",
    "imageUrl",
  ];

  const additionalFields = Object.entries(product).filter(
    ([key]) => !standardKeys.includes(key)
  );

  return (
    <div className="fixed inset-0 z-50 backdrop-blur-md bg-white/30 flex justify-center items-center">
      <div className="bg-white p-6 rounded-2xl shadow-2xl w-full max-w-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-xl text-gray-500 hover:text-red-500"
        >
          ✕
        </button>

        {/* Hidden File Input */}
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />

        {/* Image Container */}
        <div
          onClick={handleImageClick}
          className="bg-gray-100 rounded-xl flex justify-center items-center h-40 mb-8 cursor-pointer hover:bg-gray-200 transition"
        >
          {uploading ? (
            <span className="text-gray-400 animate-pulse">Uploading...</span>
          ) : product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name || "Product Image"}
              className="h-full object-contain rounded-xl"
            />
          ) : (
            <span className="text-gray-400">Click to upload image</span>
          )}
        </div>

        {/* Main Info */}
        <div className="bg-blue-50 p-6 rounded-2xl grid grid-cols-2 gap-4 mb-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-700">Product Details</h3>
          <div className="bg-blue-200 p-3 rounded-lg shadow-sm text-sm font-medium">
            Product Name: {getProductDetail('name')}
          </div>
          <div className="bg-blue-200 p-3 rounded-lg shadow-sm text-sm font-medium">
            Unit Price: ₱ {getProductDetail('unitprice').toLocaleString()}
          </div>
          <div className="bg-blue-200 p-3 rounded-lg shadow-sm text-sm font-medium">
            Category: {getProductDetail('category')}
          </div>
          <div className="bg-blue-200 p-3 rounded-lg shadow-sm text-sm font-medium">
            Location: {getProductDetail('location')}
          </div>
          <div className="bg-blue-200 p-3 rounded-lg shadow-sm text-sm font-medium">
            Quantity: {getProductDetail('quantity')}
          </div>
          <div className="bg-blue-200 p-3 rounded-lg shadow-sm text-sm font-medium">
            Total Value: ₱{getProductDetail('totalvalue').toLocaleString()}
          </div>
          <div className="bg-blue-200 p-3 rounded-lg shadow-sm text-sm font-medium">
            Expiring Date: {getProductDetail('expiringDate')}
          </div>
        </div>

        {/* Additional Info Section */}
        {additionalFields.length > 0 && (
          <div className="bg-blue-50 p-6 rounded-2xl grid grid-cols-1 gap-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">Additional Info</h3>
            <div className="grid grid-cols-2 gap-4">
              {additionalFields.map(([key, value]) => (
                <div key={key} className="bg-blue-100 p-3 rounded-lg text-sm font-medium">
                  {key}: {value || "N/A"}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewProductModal;