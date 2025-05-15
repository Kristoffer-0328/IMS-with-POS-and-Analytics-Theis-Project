import React, { useEffect, useRef, useState } from 'react';
import { getFirestore, doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import app from '../../../FirebaseConfig';
import { getDoc } from 'firebase/firestore';

const ViewProductModal = ({ isOpen, onClose, product }) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [imageUrl, setImageUrl] = useState(null);
  const db = getFirestore(app);
  
  useEffect(() => {
    if (product) {
      setImageUrl(product.imageUrl || null);
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

  const formatMoney = (amount) => {
    const number = parseFloat(amount);
    return isNaN(number) ? '0.00' : number.toLocaleString('en-PH', {
      style: 'decimal',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return date.toLocaleString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const getProductDetail = (field) => {
    if (!product) return "N/A";

    switch (field) {
      case 'name':
      case 'category':
        return product[field] || "N/A";
      case 'quantity':
        return product.variants?.reduce((total, variant) => 
          total + Number(variant.quantity || 0), 0) || 0;
      case 'unitprice':
        return product.variants?.[0]?.unitPrice || 0;
      case 'totalvalue':
        return product.variants?.reduce((total, variant) => 
          total + (Number(variant.quantity || 0) * Number(variant.unitPrice || 0)), 0) || 0;
      case 'location':
        return product.variants?.[0]?.location || "N/A";
      case 'unit':
        return product.variants?.[0]?.unit || product.measurements?.defaultUnit || "N/A";
      case 'image':
        return product.imageUrl || null;
      default:
        return product[field] !== undefined ? product[field] : "N/A";
    }
  };

  const handleImageClick = () => {
    if (imageUrl) {
      window.open(imageUrl, '_blank');
    }
  };
  
  const handleUploadButtonClick = (e) => {
    e.stopPropagation();
    fileInputRef.current.click();
  };
  
  const findProductDocument = async (category, productId, productName) => {
    try {
      if (productId) {
        const exactIdRef = doc(db, "Products", category, "Items", productId);
        const exactIdDoc = await getDoc(exactIdRef);
        if (exactIdDoc.exists()) {
          return { ref: exactIdRef, doc: exactIdDoc };
        }
      }
      
      if (productName) {
        const nameRef = doc(db, "Products", category, "Items", productName);
        const nameDoc = await getDoc(nameRef);
        if (nameDoc.exists()) {
          return { ref: nameRef, doc: nameDoc };
        }
      }
      
      if (productId && productId.includes('-')) {
        const baseId = productId.split('-')[0];
        const baseIdRef = doc(db, "Products", category, "Items", baseId);
        const baseIdDoc = await getDoc(baseIdRef);
        if (baseIdDoc.exists()) {
          return { ref: baseIdRef, doc: baseIdDoc };
        }
      }
      
      if (productName && productName.includes('-')) {
        const baseName = productName.split('-')[0].trim();
        const baseNameRef = doc(db, "Products", category, "Items", baseName);
        const baseNameDoc = await getDoc(baseNameRef);
        if (baseNameDoc.exists()) {
          return { ref: baseNameRef, doc: baseNameDoc };
        }
      }
      
      const itemsRef = collection(db, "Products", category, "Items");
      const q = query(itemsRef, where("name", "==", productName));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const firstDoc = querySnapshot.docs[0];
        return { ref: firstDoc.ref, doc: firstDoc };
      }
      
      const allItemsSnapshot = await getDocs(collection(db, "Products", category, "Items"));
      
      if (productId) {
        const matchById = allItemsSnapshot.docs.find(doc => 
          doc.id.includes(productId) || productId.includes(doc.id)
        );
        
        if (matchById) {
          return { ref: matchById.ref, doc: matchById };
        }
      }
      
      if (productName) {
        const matchByName = allItemsSnapshot.docs.find(doc => {
          const data = doc.data();
          return data.name && (
            data.name.includes(productName) || 
            productName.includes(data.name)
          );
        });
        
        if (matchByName) {
          return { ref: matchByName.ref, doc: matchByName };
        }
      }
      
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
      
      const tempUrl = URL.createObjectURL(file);
      setImageUrl(tempUrl);
      
      const category = getProductDetail('category');
      const productId = getProductDetail('id');
      const productName = getProductDetail('name');
      
      if (!category) {
        throw new Error("Product category is required but missing");
      }
      
      const result = await findProductDocument(category, productId, productName);
      
      if (result) {
        const { ref: productRef, doc: productDoc } = result;
        
        const variantIndex = productId && productId.includes('-') ? 
          parseInt(productId.split('-')[1]) : -1;
        
        if (variantIndex >= 0) {
          const productData = productDoc.data();
          const variants = productData.variants || [];
          
          if (variants[variantIndex]) {
            const updatedVariants = [...variants];
            updatedVariants[variantIndex] = {
              ...updatedVariants[variantIndex],
              image: tempUrl
            };
            
            await updateDoc(productRef, {
              variants: updatedVariants
            });
          } else {
            await updateDoc(productRef, {
              image: tempUrl
            });
          }
        } else {
          await updateDoc(productRef, {
            image: tempUrl
          });
        }
        
        alert('Image updated successfully!');
      } else {
        alert(`Failed to update image: Product not found in category "${category}". Please check the console for debugging information.`);
      }
    } catch (error) {
      console.error("Error uploading image: ", error);
      alert('Failed to upload image: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const standardKeys = [
    "name",
    "category",
    "variants",
    "measurements",
    "imageUrl",
    "id",
    "customFields",
    "categoryValues",
    "createdAt",
    "lastUpdated",
    "restockLevel"
  ];

  const additionalFields = Object.entries(product).filter(
    ([key, value]) => 
      !standardKeys.includes(key) && 
      typeof value !== 'function' && 
      key !== 'ref' &&
      key !== 'key'
  );

  const getVariantsList = () => {
    if (!product.variants || product.variants.length === 0) return null;

    return (
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-3 mt-3">
        <div className="text-xs font-medium text-gray-500 mb-2">Variants</div>
        <div className="space-y-2">
          {product.variants.map((variant, index) => (
            <div key={variant.id} className="bg-white p-2 rounded border border-gray-100">
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-gray-500">Size: </span>
                  <span className="font-medium text-gray-900">{variant.size || 'Default'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Type: </span>
                  <span className="font-medium text-gray-900">{variant.type || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Quantity: </span>
                  <span className="font-medium text-gray-900">{variant.quantity}</span>
                </div>
                <div>
                  <span className="text-gray-500">Price: </span>
                  <span className="font-medium text-gray-900">₱{formatMoney(variant.unitPrice)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Location: </span>
                  <span className="font-medium text-gray-900">{variant.location}</span>
                </div>
                <div>
                  <span className="text-gray-500">Unit: </span>
                  <span className="font-medium text-gray-900">{variant.unit}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div className="relative bg-white w-full max-w-2xl max-h-[85vh] rounded-xl shadow-xl animate-scaleUp overflow-hidden">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-4 py-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Product Details</h2>
            <button
              onClick={onClose}
              className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-colors"
            >
              <span className="text-lg">✕</span>
            </button>
          </div>

          <div className="overflow-y-auto p-4 space-y-4" style={{ maxHeight: 'calc(85vh - 48px)' }}>
            <div className="relative group">
              <div onClick={handleImageClick} 
                className="h-40 bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg flex items-center justify-center cursor-pointer overflow-hidden border border-gray-200 group-hover:border-blue-300 transition-all duration-200"
              >
                {uploading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <span className="text-sm text-gray-500">Uploading...</span>
                  </div>
                ) : imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={product.name}
                    className="h-full w-full object-contain p-2 transition duration-300 group-hover:scale-105"
                  />
                ) : (
                  <div className="text-center">
                    <div className="text-gray-400 text-sm">Click to upload image</div>
                  </div>
                )}
              </div>
              
              <button 
                onClick={handleUploadButtonClick}
                className="absolute bottom-2 right-2 p-2 bg-blue-500 text-white rounded-full shadow-sm hover:bg-blue-600 hover:shadow transition-all duration-200"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 bg-blue-50 p-3 rounded-lg border border-blue-100">
                <div className="text-sm font-medium text-blue-900">{getProductDetail('name')}</div>
                <div className="text-xs text-blue-600 mt-1">{getProductDetail('category')}</div>
              </div>
              
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="text-xs text-gray-500">Total Quantity</div>
                <div className="text-lg font-semibold text-blue-600">{getProductDetail('quantity')}</div>
              </div>
              
              <div className="bg-white p-3 rounded-lg border border-gray-200">
                <div className="text-xs text-gray-500">Base Price</div>
                <div className="text-lg font-semibold text-green-600">₱{formatMoney(getProductDetail('unitprice'))}</div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200">
              <div className="flex justify-between items-center px-3 py-2">
                <span className="text-xs text-gray-500">Total Value</span>
                <span className="text-sm font-medium text-gray-900">₱{formatMoney(getProductDetail('totalvalue'))}</span>
              </div>
              <div className="flex justify-between items-center px-3 py-2">
                <span className="text-xs text-gray-500">Maximum Stock Level</span>
                <span className="text-sm font-medium text-gray-900">{product.maximumStockLevel || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center px-3 py-2">
                <span className="text-xs text-gray-500">Restock Level</span>
                <span className="text-sm font-medium text-gray-900">{product.restockLevel || 'N/A'}</span>
              </div>
              <div className="flex justify-between items-center px-3 py-2">
                <span className="text-xs text-gray-500">Created At</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDate(product.createdAt)}
                </span>
              </div>
              <div className="flex justify-between items-center px-3 py-2">
                <span className="text-xs text-gray-500">Last Updated</span>
                <span className="text-sm font-medium text-gray-900">
                  {formatDate(product.lastUpdated)}
                </span>
              </div>
            </div>

            {getVariantsList()}

            {additionalFields.length > 0 && (
              <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                <div className="text-xs font-medium text-gray-500 mb-2">Additional Information</div>
                <div className="grid grid-cols-2 gap-2">
                  {additionalFields.map(([key, value]) => (
                    <div key={key} className="text-xs">
                      <span className="text-gray-500">{key}: </span>
                      <span className="font-medium text-gray-900">{value === null ? "N/A" : String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewProductModal;