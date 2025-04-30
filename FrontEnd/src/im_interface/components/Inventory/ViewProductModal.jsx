import React, { useEffect, useRef, useState } from 'react';
import { getFirestore, doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import app from '../../../FirebaseConfig';
import { getDoc } from 'firebase/firestore';

const ViewProductModal = ({ isOpen, onClose, product }) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const db = getFirestore(app);
  
  // Initialize image URL state from product data when component mounts or product changes
  useEffect(() => {
    if (product) {
      // Check for image in both possible locations based on ProductServices.jsx
      setImageUrl(product.image || product.productImage || null);
    }
  }, [product]);
  
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

  const getProductDetail = (field) => {
    // Handle special cases
    if (field === 'unitprice' && product['unitprice'] !== undefined) {
      return typeof product['unitprice'] === 'number' ? product['unitprice'] : 0;
    }
    if (field === 'totalvalue' && product['totalvalue'] !== undefined) {
      return typeof product['totalvalue'] === 'number' ? product['totalvalue'] : 0;
    }
    
    // Default handling with fallback to "N/A"
    return product[field] !== undefined ? product[field] : "N/A";
  };

  const handleImageClick = () => {
    if (imageUrl) {
      // If image exists, open it in a new tab for zooming
      window.open(imageUrl, '_blank');
    }
  };
  
  const handleUploadButtonClick = (e) => {
    e.stopPropagation(); // Prevent triggering the parent's onClick
    fileInputRef.current.click();
  };
  
  // Improved function to find the product document with more fallback methods
  const findProductDocument = async (category, productId, productName) => {
    try {
      // Method 1: Try with the exact ID from the product object
      if (productId) {
        console.log(`Trying to find product with ID: ${productId} in category: ${category}`);
        const exactIdRef = doc(db, "Products", category, "Items", productId);
        const exactIdDoc = await getDoc(exactIdRef);
        if (exactIdDoc.exists()) {
          console.log("Found product using exact ID");
          return { ref: exactIdRef, doc: exactIdDoc };
        }
      }
      
      // Method 2: Try with the product name
      if (productName) {
        console.log(`Trying to find product with name: ${productName} in category: ${category}`);
        const nameRef = doc(db, "Products", category, "Items", productName);
        const nameDoc = await getDoc(nameRef);
        if (nameDoc.exists()) {
          console.log("Found product using product name");
          return { ref: nameRef, doc: nameDoc };
        }
      }
      
      // Method 3: Try with base name if ID contains a dash (for variants)
      if (productId && productId.includes('-')) {
        const baseId = productId.split('-')[0];
        console.log(`Trying with base ID: ${baseId}`);
        const baseIdRef = doc(db, "Products", category, "Items", baseId);
        const baseIdDoc = await getDoc(baseIdRef);
        if (baseIdDoc.exists()) {
          console.log("Found product using base ID");
          return { ref: baseIdRef, doc: baseIdDoc };
        }
      }
      
      // Method 4: Try with base name if name contains a dash
      if (productName && productName.includes('-')) {
        const baseName = productName.split('-')[0].trim();
        console.log(`Trying with base name: ${baseName}`);
        const baseNameRef = doc(db, "Products", category, "Items", baseName);
        const baseNameDoc = await getDoc(baseNameRef);
        if (baseNameDoc.exists()) {
          console.log("Found product using base name");
          return { ref: baseNameRef, doc: baseNameDoc };
        }
      }
      
      // Method 5: Query by name field instead of document ID
      console.log(`Trying query by name field: ${productName}`);
      const itemsRef = collection(db, "Products", category, "Items");
      const q = query(itemsRef, where("name", "==", productName));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const firstDoc = querySnapshot.docs[0];
        console.log("Found product using query by name field");
        return { ref: firstDoc.ref, doc: firstDoc };
      }
      
      // Method 6: Last resort - get all documents and find by partial match
      console.log("Trying to find by partial match");
      const allItemsSnapshot = await getDocs(collection(db, "Products", category, "Items"));
      
      // Try to match by ID
      if (productId) {
        const matchById = allItemsSnapshot.docs.find(doc => 
          doc.id.includes(productId) || productId.includes(doc.id)
        );
        
        if (matchById) {
          console.log("Found product using partial ID match");
          return { ref: matchById.ref, doc: matchById };
        }
      }
      
      // Try to match by name
      if (productName) {
        const matchByName = allItemsSnapshot.docs.find(doc => {
          const data = doc.data();
          return data.name && (
            data.name.includes(productName) || 
            productName.includes(data.name)
          );
        });
        
        if (matchByName) {
          console.log("Found product using partial name match");
          return { ref: matchByName.ref, doc: matchByName };
        }
      }
      
      console.log("Product document not found after all attempts");
      return null;
    } catch (error) {
      console.error("Error finding product document:", error);
      return null;
    }
  };
  
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      setUploading(true);
      
      // Create a temporary URL to display the image immediately
      const tempUrl = URL.createObjectURL(file);
      setImageUrl(tempUrl);
      
      // Extract product details for proper database referencing
      const category = getProductDetail('category');
      const productId = getProductDetail('id');
      const productName = getProductDetail('name');
      
      console.log("Product details:", {
        category,
        id: productId,
        name: productName
      });
      
      if (!category) {
        throw new Error("Product category is required but missing");
      }
      
      // Use the improved function to find product document
      const result = await findProductDocument(category, productId, productName);
      
      if (result) {
        const { ref: productRef, doc: productDoc } = result;
        
        // Check if this is a variant-specific image update or main product image
        const variantIndex = productId && productId.includes('-') ? 
          parseInt(productId.split('-')[1]) : -1;
        
        if (variantIndex >= 0) {
          // This is a variant-specific image update
          const productData = productDoc.data();
          const variants = productData.variants || [];
          
          if (variants[variantIndex]) {
            console.log("Updating variant image at index:", variantIndex);
            // Create updated variants array
            const updatedVariants = [...variants];
            updatedVariants[variantIndex] = {
              ...updatedVariants[variantIndex],
              image: tempUrl // Use the tempUrl instead of a Firebase Storage URL
            };
            
            // Update the variants array in the document
            await updateDoc(productRef, {
              variants: updatedVariants
            });
          } else {
            console.log("Variant not found, updating main image");
            // Variant not found, update the main product image instead
            await updateDoc(productRef, {
              image: tempUrl // Use the tempUrl instead of a Firebase Storage URL
            });
          }
        } else {
          console.log("Updating main product image");
          // Update the main product image
          await updateDoc(productRef, {
            image: tempUrl // Use the tempUrl instead of a Firebase Storage URL
          });
        }
        
        alert('Image updated successfully!');
      } else {
        console.error("Product document not found after multiple attempts");
        alert(`Failed to update image: Product not found in category "${category}". Please check the console for debugging information.`);
      }
    } catch (error) {
      console.error("Error uploading image: ", error);
      alert('Failed to upload image: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  // Define what fields are considered "standard" to be shown in the main section
  const standardKeys = [
    "name",
    "category",
    "quantity",
    "unitprice",
    "totalvalue",
    "location",
    "expiringDate",
    "status",
    "image",
    "productImage",
    "id",
    "action",
    "size",
    "unit"
  ];

  // Filter out standard keys and internal props to find additional fields
  const additionalFields = Object.entries(product).filter(
    ([key, value]) => 
      !standardKeys.includes(key) && 
      typeof value !== 'function' && 
      key !== 'ref' &&
      key !== 'key'
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
        <div className="relative">
          <div
            onClick={handleImageClick}
            className="bg-gray-100 rounded-xl flex justify-center items-center h-40 mb-8 cursor-pointer hover:bg-gray-200 transition"
          >
            {uploading ? (
              <span className="text-gray-400 animate-pulse">Uploading...</span>
            ) : imageUrl ? (
              <>
                <img
                  src={imageUrl}
                  alt={product.name || "Product Image"}
                  className="h-full object-contain rounded-xl cursor-zoom-in"
                />
                <div className="absolute bottom-10 right-2 opacity-80 hover:opacity-100 transition">
                  <button 
                    onClick={handleUploadButtonClick}
                    className="bg-blue-500 text-white p-2 rounded-full shadow hover:bg-blue-600"
                    title="Upload new image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
                    </svg>
                  </button>
                </div>
              </>
            ) : (
              <>
                <span className="text-gray-400">Click to upload image</span>
                <div className="absolute bottom-10 right-2 opacity-80 hover:opacity-100 transition">
                  <button 
                    onClick={handleUploadButtonClick}
                    className="bg-blue-500 text-white p-2 rounded-full shadow hover:bg-blue-600"
                    title="Upload image"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
                    </svg>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Main Info */}
        <div className="bg-blue-50 p-6 rounded-2xl grid grid-cols-2 gap-4 mb-8">
          <h3 className="text-lg font-semibold mb-4 text-gray-700 col-span-2">Product Details</h3>
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
            Status: {getProductDetail('status')}
          </div>
          {getProductDetail('expiringDate') !== "N/A" && (
            <div className="bg-blue-200 p-3 rounded-lg shadow-sm text-sm font-medium">
              Expiring Date: {getProductDetail('expiringDate')}
            </div>
          )}
          {getProductDetail('size') !== "N/A" && (
            <div className="bg-blue-200 p-3 rounded-lg shadow-sm text-sm font-medium">
              Size: {getProductDetail('size')}
            </div>
          )}
          {getProductDetail('unit') !== "N/A" && (
            <div className="bg-blue-200 p-3 rounded-lg shadow-sm text-sm font-medium">
              Unit: {getProductDetail('unit')}
            </div>
          )}
        </div>

        {/* Additional Info Section */}
        {additionalFields.length > 0 && (
          <div className="bg-blue-50 p-6 rounded-2xl grid grid-cols-1 gap-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-700">Additional Info</h3>
            <div className="grid grid-cols-2 gap-4">
              {additionalFields.map(([key, value]) => (
                <div key={key} className="bg-blue-100 p-3 rounded-lg text-sm font-medium">
                  {key}: {value === null ? "N/A" : String(value)}
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