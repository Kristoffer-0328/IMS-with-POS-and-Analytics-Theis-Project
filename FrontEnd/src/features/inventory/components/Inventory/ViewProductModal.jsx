import React, { useEffect, useRef, useState } from 'react';
import { getFirestore, doc, updateDoc, collection, query, where, getDocs } from "firebase/firestore";
import app from '../../../../FirebaseConfig';
import { getDoc } from 'firebase/firestore';
import { FiPackage, FiDollarSign, FiMapPin, FiInfo, FiLayers, FiCalendar, FiMap } from 'react-icons/fi';
import ShelfViewModal from './ShelfViewModal';
import { uploadImage } from '../../../../services/cloudinary/CloudinaryService';

const ViewProductModal = ({ isOpen, onClose, product, onProductUpdate }) => {
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageUrl, setImageUrl] = useState(null);
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'variants', 'additional'
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedUnitForMap, setSelectedUnitForMap] = useState(null);
  const [variants, setVariants] = useState([]); // For flat structure variants
  const [loadingVariants, setLoadingVariants] = useState(false);
  const db = getFirestore(app);
  
  useEffect(() => {
    if (product) {
      // Check both imageUrl and image fields (image is used in some products)
      setImageUrl(product.imageUrl || product.image || null);
    }
  }, [product]);
  
  // Fetch variants from flat structure
  useEffect(() => {
    const fetchVariants = async () => {
      if (!product || product.isVariant) return; // Don't fetch variants for variant products
      
      setLoadingVariants(true);
      try {
        const storageLocation = product.storageLocation;
        if (!storageLocation) {
          console.log('No storage location on product');
          setVariants([]);
          return;
        }

        // Query for all products where parentProductId === this product's ID
        const productsRef = collection(db, 'Products', storageLocation, 'products');
        const variantsQuery = query(
          productsRef,
          where('parentProductId', '==', product.id),
          where('isVariant', '==', true)
        );
        
        const variantsSnapshot = await getDocs(variantsQuery);
        const variantsList = variantsSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        console.log(`Found ${variantsList.length} variants for product ${product.id}`);
        setVariants(variantsList);
      } catch (error) {
        console.error('Error fetching variants:', error);
        setVariants([]);
      } finally {
        setLoadingVariants(false);
      }
    };

    if (isOpen && product) {
      fetchVariants();
    }
  }, [isOpen, product, db]);
  
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
        // Check if product has variants (nested structure from Firebase)
        if (product.variants && typeof product.variants === 'object') {
          // Variants is an object with keys
          return Object.values(product.variants).reduce((total, variant) => 
            total + (Number(variant.quantity) || 0), 0);
        } else if (Array.isArray(product.variants) && product.variants.length > 0) {
          // Variants is an array
          return product.variants.reduce((total, variant) => 
            total + (Number(variant.quantity) || 0), 0);
        }
        // Fallback to direct quantity field
        return Number(product.quantity) || 0;
      case 'unitprice':
        // Try to get price from variants first - prioritize variant prices over direct fields
        if (product.variants && typeof product.variants === 'object') {
          const firstVariant = Object.values(product.variants)[0];
          const variantPrice = Number(firstVariant?.unitPrice) || Number(firstVariant?.price);
          // Only use variant price if it's greater than 0, otherwise try direct fields
          if (variantPrice > 0) return variantPrice;
        } else if (Array.isArray(product.variants) && product.variants.length > 0) {
          const variantPrice = Number(product.variants[0]?.unitPrice) || Number(product.variants[0]?.price);
          if (variantPrice > 0) return variantPrice;
        }
        // Fallback to direct price fields (only if variant prices were 0 or don't exist)
        return Number(product.unitPrice) || Number(product.price) || 0;
      case 'totalvalue':
        // Calculate total value from variants
        if (product.variants && typeof product.variants === 'object') {
          const variantTotal = Object.values(product.variants).reduce((total, variant) => 
            total + ((Number(variant.quantity) || 0) * (Number(variant.unitPrice) || Number(variant.price) || 0)), 0);
          // Only use variant calculation if it results in a value > 0
          if (variantTotal > 0) return variantTotal;
        } else if (Array.isArray(product.variants) && product.variants.length > 0) {
          const variantTotal = product.variants.reduce((total, variant) => 
            total + ((Number(variant.quantity) || 0) * (Number(variant.unitPrice) || Number(variant.price) || 0)), 0);
          if (variantTotal > 0) return variantTotal;
        }
        // Fallback calculation
        return (Number(product.quantity) || 0) * (Number(product.unitPrice) || Number(product.price) || 0);
      case 'location':
        return product.fullLocation || product.location || "N/A";
      case 'unit':
        // Try variants first
        if (product.variants && typeof product.variants === 'object') {
          const firstVariant = Object.values(product.variants)[0];
          return firstVariant?.unit || product.unit || product.measurements?.defaultUnit || "N/A";
        } else if (Array.isArray(product.variants) && product.variants.length > 0) {
          return product.variants[0]?.unit || product.unit || product.measurements?.defaultUnit || "N/A";
        }
        return product.unit || product.measurements?.defaultUnit || "N/A";
      case 'image':
        return product.imageUrl || product.image || null;
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
      setUploadProgress(0);

      const category = getProductDetail('category');
      const productId = getProductDetail('id');
      const productName = getProductDetail('name');
      const storageLocation = product.storageLocation; // e.g., "Unit 01"
      const shelfName = product.shelfName; // e.g., "A"
      const rowName = product.rowName; // e.g., "1"
      const columnIndex = product.columnIndex; // e.g., 1

      if (!category) {
        throw new Error("Product category is required but missing");
      }
      
      if (!storageLocation || !shelfName || !rowName || columnIndex === undefined) {
        throw new Error("Product storage information is incomplete. Missing: " + 
          (!storageLocation ? "storageLocation " : "") +
          (!shelfName ? "shelfName " : "") +
          (!rowName ? "rowName " : "") +
          (columnIndex === undefined ? "columnIndex" : ""));
      }
      
      // Upload to Cloudinary with progress tracking
      const uploadResult = await uploadImage(
        file,
        (progress) => {
          setUploadProgress(progress);
        },
        {
          folder: `ims-products/${category}`
        }
      );

      // Get the permanent Cloudinary URL
      const cloudinaryUrl = uploadResult.url;
      
      // Update preview with Cloudinary URL
      setImageUrl(cloudinaryUrl);
      
      // Update the product in Firebase using the NEW NESTED structure
      // Path: Products/{storageLocation}/products/{productId}
      
      const productRef = doc(
        db,
        'Products',
        storageLocation,
        'products',
        productId
      );

      await updateDoc(productRef, {
        image: cloudinaryUrl,
        imageUrl: cloudinaryUrl,
        lastUpdated: new Date().toISOString()
      });

      console.log(`✅ Image updated at: Products/${storageLocation}/products/${productId}`);

      alert('Image uploaded successfully!');
      setImageUrl(cloudinaryUrl);
      
      // Notify parent component to refresh the product data
      if (onProductUpdate) {
        onProductUpdate();
      }
    } catch (error) {
      console.error('Failed to update image:', error);
      alert('Failed to update image: ' + error.message);
    } finally {
      setUploading(false);
      setUploadProgress(0);
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

  // Get unit configuration for ShelfViewModal
  const getUnitConfig = (storageLocation) => {
    const unitConfigs = {
      'Unit 01': {
        title: 'Unit 01 - Steel & Heavy Materials',
        type: 'Steel & Heavy Materials Storage',
        shelves: [
          { name: 'Shelf A', rows: Array.from({ length: 8 }, (_, i) => `Row ${i + 1}`) },
          { name: 'Shelf B', rows: Array.from({ length: 13 }, (_, i) => `Row ${i + 1}`) },
          { name: 'Shelf C', rows: Array.from({ length: 6 }, (_, i) => `Row ${i + 1}`) }
        ]
      },
      'Unit 02': {
        title: 'Unit 02 - Cement & Aggregate',
        type: 'Cement & Aggregate Storage',
        shelves: [
          { name: 'Shelf A', rows: Array.from({ length: 8 }, (_, i) => `Row ${i + 1}`) }
        ]
      },
      'Unit 03': {
        title: 'Unit 03 - Goods',
        type: 'General Goods Storage',
        shelves: [
          { name: 'Shelf A', rows: Array.from({ length: 8 }, (_, i) => `Row ${i + 1}`) },
          { name: 'Shelf B', rows: Array.from({ length: 8 }, (_, i) => `Row ${i + 1}`) }
        ]
      },
      'Unit 04': {
        title: 'Unit 04 - Goods',
        type: 'General Goods Storage',
        shelves: [
          { name: 'Shelf A', rows: Array.from({ length: 8 }, (_, i) => `Row ${i + 1}`) },
          { name: 'Shelf B', rows: Array.from({ length: 8 }, (_, i) => `Row ${i + 1}`) }
        ]
      }
    };
    
    return unitConfigs[storageLocation] || null;
  };

  // Handle view location click
  const handleViewLocation = () => {
    const storageLocation = product.storageLocation;





    if (storageLocation) {
      const unitConfig = getUnitConfig(storageLocation);

      if (unitConfig) {
        setSelectedUnitForMap(unitConfig);
        setShowLocationModal(true);
      } else {
        console.error('No unit config found for:', storageLocation);
      }
    } else {
      console.error('No storage location on product');
    }
  };

  const InfoRow = ({ label, value, icon: Icon }) => (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2">
        {Icon && <Icon className="text-gray-400" size={16} />}
        <span className="text-sm text-gray-600">{label}</span>
      </div>
      <span className="text-sm font-medium text-gray-900">{value}</span>
    </div>
  );

  const StatCard = ({ icon: Icon, label, value, color = "blue" }) => {
    const colorClasses = {
      blue: "bg-blue-50 text-blue-600",
      green: "bg-green-50 text-green-600",
      orange: "bg-orange-50 text-orange-600",
      purple: "bg-purple-50 text-purple-600"
    };

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow">
        <div className={`w-10 h-10 rounded-lg ${colorClasses[color]} flex items-center justify-center mb-3`}>
          <Icon size={20} />
        </div>
        <div className="text-xs text-gray-500 mb-1">{label}</div>
        <div className="text-xl font-bold text-gray-900">{value}</div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl animate-scaleUp overflow-hidden">
          {/* Header */}
          <div className={`bg-gradient-to-r px-6 py-4 flex items-center justify-between ${
            product.isVariant 
              ? 'from-purple-500 to-purple-600' 
              : 'from-orange-500 to-orange-600'
          }`}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                {product.isVariant ? (
                  <FiLayers className="text-white" size={20} />
                ) : (
                  <FiPackage className="text-white" size={20} />
                )}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-semibold text-white">
                    {product.isVariant ? 'Product Variant Details' : 'Product Details'}
                  </h2>
                  {product.isVariant && (
                    <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full border border-white/30">
                      VARIANT
                    </span>
                  )}
                  {!product.isVariant && (
                    <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm text-white text-xs font-bold rounded-full border border-white/30">
                      BASE PRODUCT
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-0.5 ${product.isVariant ? 'text-purple-100' : 'text-orange-100'}`}>
                  {getProductDetail('category')}
                  {product.isVariant && product.variantName && (
                    <span className="ml-2">• {product.variantName}</span>
                  )}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <span className="text-xl">✕</span>
            </button>
          </div>

          {/* Product Header Card */}
          <div className="bg-gradient-to-br from-orange-50 to-white p-6 border-b border-gray-200">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Image Section */}
              <div className="relative group md:w-64 flex-shrink-0">
                <div onClick={handleImageClick} 
                  className="h-48 bg-white rounded-xl flex items-center justify-center cursor-pointer overflow-hidden border-2 border-gray-200 group-hover:border-orange-300 transition-all duration-200 shadow-sm"
                >
                  {uploading ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-3 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
                      <span className="text-sm text-gray-500">Uploading to Cloudinary...</span>
                      <div className="w-32 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-orange-500 h-2 rounded-full transition-all duration-300" 
                          style={{ width: `${uploadProgress}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-400">{uploadProgress}%</span>
                    </div>
                  ) : imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={product.name}
                      className="h-full w-full object-contain p-3 transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <FiPackage className="mx-auto text-gray-300 mb-2" size={32} />
                      <div className="text-gray-400 text-xs">Click to upload image</div>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={handleUploadButtonClick}
                  className="absolute bottom-3 right-3 p-2.5 bg-orange-500 text-white rounded-lg shadow-lg hover:bg-orange-600 hover:shadow-xl transition-all duration-200"
                  title="Upload Image"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0l-4 4m4-4v12" />
                  </svg>
                </button>
              </div>

              {/* Product Info */}
              <div className="flex-1">
                <div className="flex items-start gap-3 mb-2">
                  <h3 className="text-2xl font-bold text-gray-900 flex-1">{getProductDetail('name')}</h3>
                  {product.isVariant && (
                    <div className="flex flex-col gap-1">
                      <span className="px-3 py-1 bg-purple-500 text-white text-xs font-bold rounded-full flex items-center gap-1.5 shadow-sm">
                        <FiLayers size={12} />
                        VARIANT PRODUCT
                      </span>
                      {product.variantName && (
                        <span className="text-xs text-purple-700 font-medium text-right">
                          {product.variantName}
                        </span>
                      )}
                    </div>
                  )}
                  {!product.isVariant && (
                    <span className="px-3 py-1 bg-blue-500 text-white text-xs font-bold rounded-full flex items-center gap-1.5 shadow-sm">
                      <FiPackage size={12} />
                      BASE PRODUCT
                    </span>
                  )}
                </div>
                <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mb-4 ${
                  product.isVariant 
                    ? 'bg-purple-100 text-purple-700' 
                    : 'bg-orange-100 text-orange-700'
                }`}>
                  <FiLayers size={14} />
                  {getProductDetail('category')}
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  <StatCard 
                    icon={FiPackage}
                    label="Total Stock"
                    value={getProductDetail('quantity')}
                    color={product.isVariant ? "purple" : "blue"}
                  />
                  <StatCard 
                    icon={FiDollarSign}
                    label="Unit Price"
                    value={`₱${formatMoney(getProductDetail('unitprice'))}`}
                    color="green"
                  />
                  <StatCard 
                    icon={FiDollarSign}
                    label="Total Value"
                    value={`₱${formatMoney(getProductDetail('totalvalue'))}`}
                    color={product.isVariant ? "purple" : "orange"}
                  />
                  <StatCard 
                    icon={FiLayers}
                    label="Variants"
                    value={loadingVariants ? '...' : variants.length}
                    color="purple"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 bg-gray-50">
            <div className="flex px-6">
              <button
                onClick={() => setActiveTab('overview')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'overview'
                    ? (product.isVariant ? 'border-purple-500 text-purple-600' : 'border-orange-500 text-orange-600')
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FiInfo size={16} />
                  Overview
                </div>
              </button>
              <button
                onClick={() => setActiveTab('variants')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'variants'
                    ? (product.isVariant ? 'border-purple-500 text-purple-600' : 'border-orange-500 text-orange-600')
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FiLayers size={16} />
                  Variants ({loadingVariants ? '...' : variants.length})
                </div>
              </button>
              {additionalFields.length > 0 && (
                <button
                  onClick={() => setActiveTab('additional')}
                  className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                    activeTab === 'additional'
                      ? (product.isVariant ? 'border-purple-500 text-purple-600' : 'border-orange-500 text-orange-600')
                      : 'border-transparent text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FiInfo size={16} />
                    Additional Info
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Tab Content */}
          <div className="overflow-y-auto p-6" style={{ maxHeight: 'calc(90vh - 400px)' }}>
            {/* Overview Tab */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                {/* Stock Information */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <FiPackage size={16} />
                      Stock Information
                    </h4>
                  </div>
                  <div className="p-4 space-y-1">
                    <InfoRow label="Maximum Stock Level" value={product.maximumStockLevel || 'N/A'} />
                    <InfoRow label="Restock Level" value={product.restockLevel || 60} />
                    <InfoRow label="Unit" value={getProductDetail('unit')} />
                  </div>
                </div>

                {/* Location Information */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <FiMapPin size={16} />
                      Storage Location
                    </h4>
                    {product.storageLocation && (
                      <button
                        onClick={handleViewLocation}
                        className={`flex items-center gap-2 px-3 py-1.5 text-white text-xs font-medium rounded-lg transition-colors ${
                          product.isVariant 
                            ? 'bg-purple-500 hover:bg-purple-600' 
                            : 'bg-orange-500 hover:bg-orange-600'
                        }`}
                      >
                        <FiMap size={14} />
                        View on Map
                      </button>
                    )}
                  </div>
                  <div className="p-4 space-y-1">
                    <InfoRow label="Storage Location" value={product.storageLocation || 'N/A'} />
                    <InfoRow label="Shelf Name" value={product.shelfName || 'N/A'} />
                    <InfoRow label="Row Name" value={product.rowName || 'N/A'} />
                    <InfoRow label="Full Location" value={product.fullLocation || 'N/A'} />
                  </div>
                </div>

                {/* Timestamps */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <FiCalendar size={16} />
                      Timeline
                    </h4>
                  </div>
                  <div className="p-4 space-y-1">
                    <InfoRow label="Created At" value={formatDate(product.createdAt)} />
                    <InfoRow label="Last Updated" value={formatDate(product.lastUpdated)} />
                  </div>
                </div>
              </div>
            )}

            {/* Variants Tab */}
            {activeTab === 'variants' && (
              <div className="space-y-4">
                {loadingVariants ? (
                  <div className="text-center py-8">
                    <div className={`w-8 h-8 border-3 ${product.isVariant ? 'border-purple-500' : 'border-orange-500'} border-t-transparent rounded-full animate-spin mx-auto mb-2`}></div>
                    <p className="text-gray-500">Loading variants...</p>
                  </div>
                ) : variants.length > 0 ? (
                  variants.map((variant, index) => (
                    <div key={variant.id || index} className="bg-white rounded-xl border border-purple-200 overflow-hidden hover:shadow-md transition-shadow hover:border-purple-300">
                      <div className="bg-gradient-to-r from-purple-50 to-purple-100/50 px-4 py-3 border-b border-purple-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FiLayers className="text-purple-600" size={16} />
                            <h4 className="text-sm font-semibold text-gray-800">
                              Variant {index + 1}: {variant.variantName || variant.size || variant.specifications || 'Default'} 
                            </h4>
                          </div>
                          <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-purple-700 shadow-sm border border-purple-200">
                            {Number(variant.quantity) || 0} {variant.unit || 'pcs'}
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Variant Name</div>
                            <div className="text-sm font-medium text-gray-900">
                              {variant.variantName || variant.size || 'N/A'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Size</div>
                            <div className="text-sm font-medium text-gray-900">{variant.size || 'N/A'}</div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Quantity</div>
                            <div className="text-sm font-medium text-purple-600">
                              {Number(variant.quantity) || 0} {variant.unit || 'pcs'}
                            </div>
                          </div>
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Unit Price</div>
                            <div className="text-sm font-medium text-green-600">
                              ₱{formatMoney(Number(variant.unitPrice) || 0)}
                            </div>
                          </div>
                          <div className="col-span-2">
                            <div className="text-xs text-gray-500 mb-1">Total Value</div>
                            <div className="text-sm font-medium text-purple-600">
                              ₱{formatMoney((Number(variant.quantity) || 0) * (Number(variant.unitPrice) || 0))}
                            </div>
                          </div>
                          {variant.specifications && (
                            <div className="col-span-2">
                              <div className="text-xs text-gray-500 mb-1">Specifications</div>
                              <div className="text-sm font-medium text-gray-900">{variant.specifications}</div>
                            </div>
                          )}
                          <div className="col-span-2">
                            <div className="text-xs text-gray-500 mb-1">Storage Location</div>
                            <div className="text-sm font-medium text-gray-900">
                              {variant.fullLocation || `${variant.storageLocation} - ${variant.shelfName} - ${variant.rowName}` || 'N/A'}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FiLayers className="mx-auto mb-2" size={32} />
                    <p>No variants found for this product</p>
                    <p className="text-xs mt-1">Variants are separate products linked to this base product</p>
                  </div>
                )}
              </div>
            )}

            {/* Additional Info Tab */}
            {activeTab === 'additional' && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700">Additional Information</h4>
                </div>
                <div className="p-4">
                  {additionalFields.length > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      {additionalFields.map(([key, value]) => (
                        <div key={key} className="pb-3 border-b border-gray-100 last:border-0">
                          <div className="text-xs text-gray-500 mb-1 capitalize">
                            {key.replace(/([A-Z])/g, ' $1').trim()}
                          </div>
                          <div className="text-sm font-medium text-gray-900 break-words">
                            {value === null ? "N/A" : typeof value === 'object' ? JSON.stringify(value) : String(value)}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-gray-500">
                      <FiInfo className="mx-auto mb-2" size={32} />
                      <p>No additional information available</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept="image/*"
        className="hidden"
      />

      {/* Location View Modal */}
      <ShelfViewModal 
        isOpen={showLocationModal}
        onClose={() => setShowLocationModal(false)}
        selectedUnit={selectedUnitForMap}
        highlightedProduct={product}
      />
    </div>
  );
};

export default ViewProductModal;