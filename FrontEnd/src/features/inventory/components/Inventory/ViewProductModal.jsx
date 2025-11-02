import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getFirestore, doc, updateDoc, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
import app from '../../../../FirebaseConfig';
import { getDoc } from 'firebase/firestore';
import { FiPackage, FiDollarSign, FiMapPin, FiInfo, FiLayers, FiCalendar, FiMap, FiTrash2 } from 'react-icons/fi';
import ShelfViewModal from './ShelfViewModal';
import { uploadImage } from '../../../../services/cloudinary/CloudinaryService';
import { getStorageUnitConfig } from '../../config/StorageUnitsConfig';
import NewVariantForm from './CategoryModal/NewVariantForm';

const ViewProductModal = ({ isOpen, onClose, product, onProductUpdate, initialTab = 'overview' }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageUrl, setImageUrl] = useState(null);
  const [activeTab, setActiveTab] = useState(initialTab); // 'overview', 'variants', 'location', 'supplier', 'additional'
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [selectedUnitForMap, setSelectedUnitForMap] = useState(null);
  const [variants, setVariants] = useState([]); // For flat structure variants
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [showVariantCreationModal, setShowVariantCreationModal] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editedProduct, setEditedProduct] = useState(null);
  const [isActive, setIsActive] = useState(true);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const db = getFirestore(app);
  
  // Helper function to normalize supplier data - handles both old (suppliers array) and new (supplier object) structures
  const getSuppliers = (product) => {
    if (!product) return [];
    
    // If product has suppliers array (old structure or multi-supplier)
    if (product.suppliers && Array.isArray(product.suppliers) && product.suppliers.length > 0) {
      return product.suppliers;
    }
    
    // If product has supplier object (new structure from linking)
    if (product.supplier && typeof product.supplier === 'object' && product.supplier.name) {
      return [product.supplier];
    }
    
    // Check variants for supplier info
    if (product.variants && Array.isArray(product.variants) && product.variants.length > 0) {
      const variantSuppliers = product.variants
        .filter(v => v.supplier && v.supplier.name)
        .map(v => v.supplier);
      
      if (variantSuppliers.length > 0) {
        // Remove duplicates by supplier id
        const uniqueSuppliers = variantSuppliers.reduce((acc, supplier) => {
          if (!acc.find(s => s.id === supplier.id)) {
            acc.push(supplier);
          }
          return acc;
        }, []);
        return uniqueSuppliers;
      }
    }
    
    return [];
  };
  
  useEffect(() => {
    if (product) {
      // Check both imageUrl and image fields (image is used in some products)
      setImageUrl(product.imageUrl || product.image || null);
      // Initialize edited product data and active status
      setEditedProduct({ ...product });
      setIsActive(product.isActive !== false); // Default to true if not specified
    }
  }, [product]);
  
  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);
  
  // Fetch variants from flat structure
  useEffect(() => {
    const fetchVariants = async () => {
      if (!product || product.isVariant) return; // Don't fetch variants for variant products
      
      setLoadingVariants(true);
      try {
        const storageLocation = product.storageLocation;
        if (!storageLocation) {
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
    "restockLevel",
    "storageLocation",
    "shelfName",
    "rowName",
    "columnIndex",
    "fullLocation",
    "isVariant",
    "variantName",
    "parentProductId",
    "locations",
    "quantity",
    "unitPrice",
    "price",
    "unit",
    "maximumStockLevel",
    // Supplier fields (expanded)
    "supplierId",
    "supplierName",
    "supplierContact",
    "supplierEmail",
    "supplierPhone",
    "supplierAddress",
    "supplierContactPerson",
    "supplierWebsite",
    "supplierNotes",
    "supplier",
    "suppliers",
    "supplierInfo",
    "supplierDetails",
    "vendor",
    "vendors",
    "vendorInfo",
    "manufacturer",
    "manufacturers"
  ];

  const additionalFields = Object.entries(product).filter(
    ([key, value]) => {
      // Exclude supplier-related fields using the same logic as supplierFields
      const keyLower = key.toLowerCase();
      const isSupplierRelated = 
        keyLower.includes('supplier') || 
        keyLower.includes('vendor') || 
        keyLower.includes('manufacturer') ||
        ["supplierId", "supplierName", "supplierContact", "supplierEmail", "supplierPhone", "supplierAddress", "supplierContactPerson", "supplierWebsite", "supplierNotes"].includes(key);
      
      return !standardKeys.includes(key) && 
        !isSupplierRelated &&
        typeof value !== 'function' && 
        key !== 'ref' &&
        key !== 'key' &&
        value !== null &&
        value !== undefined &&
        value !== '' &&
        !(Array.isArray(value) && value.length === 0) &&
        !(typeof value === 'object' && Object.keys(value).length === 0);
    }
  );

  // Filter supplier-related fields (expanded to catch more patterns)
  const supplierFields = Object.entries(product).filter(
    ([key, value]) => {
      const keyLower = key.toLowerCase();
      const isSupplierRelated = 
        keyLower.includes('supplier') || 
        keyLower.includes('vendor') || 
        keyLower.includes('manufacturer') ||
        ["supplierId", "supplierName", "supplierContact", "supplierEmail", "supplierPhone", "supplierAddress", "supplierContactPerson", "supplierWebsite", "supplierNotes"].includes(key);
      
      return isSupplierRelated &&
        value !== null &&
        value !== undefined &&
        value !== '' &&
        !(Array.isArray(value) && value.length === 0) &&
        !(typeof value === 'object' && Object.keys(value).length === 0);
    }
  );

  // Helper function to format values nicely
  const formatValue = (value) => {
    if (value === null || value === undefined) return "N/A";
    
    if (typeof value === 'boolean') {
      return value ? "Yes" : "No";
    }
    
    if (typeof value === 'number') {
      return value.toLocaleString();
    }
    
    if (typeof value === 'string') {
      // Check if it's a timestamp
      if (value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/) || value.match(/^\d{13}$/)) {
        return formatDate(value);
      }
      return value;
    }
    
    if (Array.isArray(value)) {
      if (value.length === 0) return "None";
      if (value.length === 1) return formatValue(value[0]);
      return `${value.length} items`;
    }
    
    if (typeof value === 'object') {
      // Handle specific object types
      if (value.latitude && value.longitude) {
        return `Lat: ${value.latitude}, Lng: ${value.longitude}`;
      }
      
      if (value.width && value.height) {
        return `${value.width} × ${value.height}`;
      }
      
      // For other objects, show key-value pairs
      const entries = Object.entries(value).filter(([k, v]) => v !== null && v !== undefined && v !== '');
      if (entries.length === 0) return "N/A";
      if (entries.length === 1) return `${entries[0][0]}: ${formatValue(entries[0][1])}`;
      
      return entries.map(([k, v]) => `${k.replace(/([A-Z])/g, ' $1').toLowerCase()}: ${formatValue(v)}`).join(', ');
    }
    
    return String(value);
  };

  // Get unit configuration for ShelfViewModal - using centralized config
  const getUnitConfig = (storageLocation) => {
    if (!storageLocation) return null;
    
    // Use the centralized configuration from StorageUnitsConfig.js
    const config = getStorageUnitConfig(storageLocation);
    
    if (config) {
      return {
        title: config.title,
        type: config.type,
        shelves: config.shelves
      };
    }
    
    // Fallback if no config found
    console.warn(`No storage unit configuration found for: ${storageLocation}`);
    return null;
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

  // Edit mode functions
  const handleEditToggle = () => {
    if (isEditMode) {
      // Cancel edit - reset to original
      setEditedProduct({ ...product });
      setIsActive(product.isActive !== false);
    }
    setIsEditMode(!isEditMode);
  };

  const handleFieldChange = (field, value) => {
    setEditedProduct(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSaveChanges = async () => {
    try {
      if (!editedProduct || !product) return;

      const storageLocation = product.storageLocation;
      if (!storageLocation) {
        alert('Cannot save: Product storage location is missing');
        return;
      }

      // Clean the data by removing undefined values and computed fields
      const cleanData = (obj) => {
        const cleaned = {};
        for (const [key, value] of Object.entries(obj)) {
          // Skip undefined values and computed fields
          if (value !== undefined && 
              !['hasVariants', 'variantCount', 'locations', 'locationCount', 'status', 'totalvalue', 'allIds'].includes(key)) {
            if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
              // Recursively clean nested objects
              cleaned[key] = cleanData(value);
            } else {
              cleaned[key] = value;
            }
          }
        }
        return cleaned;
      };

      const updateData = {
        ...cleanData(editedProduct),
        isActive: isActive,
        lastUpdated: new Date().toISOString()
      };

      // Update the product in Firebase
      const productRef = doc(
        db,
        'Products',
        storageLocation,
        'products',
        product.id
      );

      await updateDoc(productRef, updateData);

      // Update local state
      setIsEditMode(false);
      
      // Notify parent component to refresh
      if (onProductUpdate) {
        onProductUpdate();
      }

      alert('Product updated successfully!');
    } catch (error) {
      console.error('Error updating product:', error);
      alert('Failed to update product: ' + error.message);
    }
  };

  const handleActiveToggle = () => {
    setIsActive(!isActive);
  };

  const handleDeleteProduct = async () => {
    try {
      if (!product) return;

      const storageLocation = product.storageLocation;
      if (!storageLocation) {
        alert('Cannot delete: Product storage location is missing');
        return;
      }

      setIsDeleting(true);

      // Delete supplier links first
      const suppliers = getSuppliers(product);
      if (suppliers.length > 0) {
        for (const supplier of suppliers) {
          try {
            // Delete from supplier_products collection
            const supplierProductRef = doc(db, 'supplier_products', supplier.id, 'products', product.id);
            await deleteDoc(supplierProductRef);
            console.log(`Deleted supplier link: ${supplier.name} -> ${product.name}`);
          } catch (error) {
            console.error(`Error deleting supplier link for ${supplier.name}:`, error);
            // Continue with deletion even if supplier link deletion fails
          }
        }
      }

      // Delete the product document
      const productRef = doc(
        db,
        'Products',
        storageLocation,
        'products',
        product.id
      );

      await deleteDoc(productRef);

      // Close modals and notify parent to refresh
      setShowDeleteModal(false);
      setDeleteConfirmText('');
      onClose();
      if (onProductUpdate) {
        onProductUpdate();
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('❌ Failed to delete product: ' + error.message);
    } finally {
      setIsDeleting(false);
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
          <div className={`bg-gradient-to-r px-6 py-4 flex items-center justify-between ${isEditMode ? 'bg-gradient-to-r from-blue-500 to-blue-600' : (
            product.isVariant 
              ? 'from-purple-500 to-purple-600' 
              : 'from-orange-500 to-orange-600'
          )}`}>
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
                    {isEditMode ? 'Edit Product' : 'Product Details'}
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
                  {isEditMode && (
                    <span className="px-2 py-0.5 bg-blue-200 backdrop-blur-sm text-blue-800 text-xs font-bold rounded-full border border-blue-300">
                      EDIT MODE
                    </span>
                  )}
                </div>
                <p className={`text-xs mt-0.5 ${isEditMode ? 'text-blue-100' : (
                  product.isVariant ? 'text-purple-100' : 'text-orange-100'
                )}`}>
                  {getProductDetail('category')}
                  {product.isVariant && product.variantName && (
                    <span className="ml-2">• {product.variantName}</span>
                  )}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Active/Inactive Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-medium">
                  {isActive ? 'Active' : 'Inactive'}
                </span>
                <button
                  onClick={handleActiveToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    isActive ? 'bg-green-500' : 'bg-gray-400'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isActive ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {/* Delete Button */}
              {!isEditMode && (
                <button
                  onClick={() => setShowDeleteModal(true)}
                  className="px-4 py-2 bg-red-500/90 backdrop-blur-sm text-white border border-red-400 rounded-lg hover:bg-red-600 transition-colors flex items-center gap-2"
                  title="Delete Product"
                >
                  <FiTrash2 size={16} />
                  Delete
                </button>
              )}

              {/* Edit/Save/Cancel Buttons */}
              {!isEditMode ? (
                <button
                  onClick={handleEditToggle}
                  className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white border border-white/30 rounded-lg hover:bg-white/30 transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleEditToggle}
                    className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white border border-white/30 rounded-lg hover:bg-white/30 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveChanges}
                    className="px-4 py-2 bg-green-500 text-white border border-green-400 rounded-lg hover:bg-green-600 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Save
                  </button>
                </div>
              )}

              <button
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <span className="text-xl">✕</span>
              </button>
            </div>
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
                  {isEditMode ? (
                    <input
                      type="text"
                      value={editedProduct?.name || ''}
                      onChange={(e) => handleFieldChange('name', e.target.value)}
                      className="text-2xl font-bold text-gray-900 flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Product name"
                    />
                  ) : (
                    <h3 className="text-2xl font-bold text-gray-900 flex-1">{getProductDetail('name')}</h3>
                  )}
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
                
                {/* Product Details List */}
                <div className="space-y-2 mb-4">
                  {/* Category */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-28 flex-shrink-0">Category:</span>
                    {isEditMode ? (
                      <select
                        value={editedProduct?.category || ''}
                        onChange={(e) => handleFieldChange('category', e.target.value)}
                        className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">Select Category</option>
                        <option value="Steel & Heavy Materials">Steel & Heavy Materials</option>
                        <option value="Plywood & Sheet Materials">Plywood & Sheet Materials</option>
                        <option value="Cement & Aggregates">Cement & Aggregates</option>
                        <option value="Electrical & Plumbing">Electrical & Plumbing</option>
                        <option value="Paint & Coatings">Paint & Coatings</option>
                        <option value="Insulation & Foam">Insulation & Foam</option>
                        <option value="Miscellaneous">Miscellaneous</option>
                        <option value="Roofing Materials">Roofing Materials</option>
                        <option value="Hardware & Fasteners">Hardware & Fasteners</option>
                      </select>
                    ) : (
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        product.isVariant 
                          ? 'bg-purple-100 text-purple-700' 
                          : 'bg-orange-100 text-orange-700'
                      }`}>
                        <FiLayers size={12} />
                        {getProductDetail('category')}
                      </span>
                    )}
                  </div>

                  {/* Brand */}
                  {product.brand && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-28 flex-shrink-0">Brand:</span>
                      {isEditMode ? (
                        <input
                          type="text"
                          value={editedProduct?.brand || ''}
                          onChange={(e) => handleFieldChange('brand', e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Brand"
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-900">{product.brand}</span>
                      )}
                    </div>
                  )}

                  {/* Size/Variant Name */}
                  {(product.length || product.width || product.height) && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-28 flex-shrink-0">Variant/Size:</span>
                      {isEditMode ? (
                        <input
                          type="text"
                          value={editedProduct?.size || editedProduct?.variantName || ''}
                          onChange={(e) => handleFieldChange('size', e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Variant/Size"
                        />
                      ) : (
                        <span className="text-sm font-medium text-gray-900">{product.length } x {product.width } x {product.thickness }</span>
                      )}
                    </div>
                  )}

                  {/* Specifications */}
                  {product.specifications && (
                    <div className="flex items-start gap-2">
                      <span className="text-xs text-gray-500 w-28 flex-shrink-0 pt-1">Specifications:</span>
                      {isEditMode ? (
                        <textarea
                          value={editedProduct?.specifications || ''}
                          onChange={(e) => handleFieldChange('specifications', e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          rows="2"
                          placeholder="Product specifications"
                        />
                      ) : (
                        <span className="text-xs text-gray-700 flex-1">{product.specifications}</span>
                      )}  
                    </div>
                  )}

                  {/* Measurement Type */}
                  {product.measurementType && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-28 flex-shrink-0">Measurement:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        product.measurementType === 'length' ? 'bg-blue-100 text-blue-700' :
                        product.measurementType === 'weight' ? 'bg-green-100 text-green-700' :
                        product.measurementType === 'volume' ? 'bg-purple-100 text-purple-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {product.measurementType === 'length' && (
                          <span className="inline-flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                            </svg>
                            Length-based
                          </span>
                        )}
                        {product.measurementType === 'weight' && (
                          <span className="inline-flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                            </svg>
                            Weight-based
                          </span>
                        )}
                        {product.measurementType === 'volume' && (
                          <span className="inline-flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                            </svg>
                            Volume-based
                          </span>
                        )}
                        {!product.measurementType && (
                          <span className="inline-flex items-center gap-1">
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                            </svg>
                            Count-based
                          </span>
                        )}
                      </span>
                      <span className="text-xs text-gray-600">
                        Base Unit: <span className="font-medium text-gray-900">{product.baseUnit || 'pcs'}</span>
                      </span>
                    </div>
                  )}

                  {/* Dimensions (for length-based products) */}
                  {product.measurementType === 'length' && (product.lengthCm || product.widthCm || product.thicknessCm) && (
                    <div className="flex flex-col gap-1">
                      <span className="text-xs text-gray-500">Dimensions:</span>
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        {product.lengthCm && (
                          <span className="bg-blue-50 px-2 py-1 rounded text-blue-700">
                            Length: <span className="font-medium">{product.lengthCm} cm</span>
                          </span>
                        )}
                        {product.widthCm && (
                          <span className="bg-blue-50 px-2 py-1 rounded text-blue-700">
                            Width: <span className="font-medium">{product.widthCm} cm</span>
                          </span>
                        )}
                        {product.thicknessCm && (
                          <span className="bg-blue-50 px-2 py-1 rounded text-blue-700">
                            Thickness: <span className="font-medium">{product.thicknessCm} cm</span>
                          </span>
                        )}
                      </div>
                      {product.unitVolumeCm3 && (
                        <div className="mt-1">
                          <span className="text-xs text-gray-600">
                            Calculated Volume: <span className="font-medium text-blue-600">{product.unitVolumeCm3.toFixed(2)} cm³</span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Unit Weight (for weight-based products) */}
                  {product.measurementType === 'weight' && product.unitWeightKg && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-28 flex-shrink-0">Unit Weight:</span>
                      <span className="bg-green-50 px-2 py-1 rounded text-green-700 text-sm font-medium">
                        {product.unitWeightKg} kg
                      </span>
                    </div>
                  )}

                  {/* Unit Volume (for volume-based products) */}
                  {product.measurementType === 'volume' && product.unitVolumeLiters && (
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500 w-28 flex-shrink-0">Unit Volume:</span>
                      <span className="bg-purple-50 px-2 py-1 rounded text-purple-700 text-sm font-medium">
                        {product.unitVolumeLiters} L
                      </span>
                    </div>
                  )}

                  {/* UOM Conversions */}
                  {product.uomConversions && Array.isArray(product.uomConversions) && product.uomConversions.length > 0 && (
                    <div className="flex flex-col gap-2 mt-2 p-3 bg-gray-50 rounded-lg border border-gray-200">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-700">Package/Bundle Conversions:</span>
                        <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                          {product.uomConversions.length} type{product.uomConversions.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        {product.uomConversions.map((uom, index) => (
                          <div key={index} className="flex items-center gap-2 bg-white p-2 rounded border border-gray-200">
                            <span className="text-xs text-gray-600">1 {uom.name} =</span>
                            <span className="font-medium text-sm text-gray-900">{uom.quantity} {product.baseUnit || 'pcs'}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  <StatCard 
                    icon={FiPackage}
                    label="Total Stock"
                    value={`${getProductDetail('quantity')} ${product.unit || 'pcs'}`}
                    color={product.isVariant ? "purple" : "blue"}
                  />
                  
                  {/* Consolidated Pricing Card */}
                  {product.isBundle && product.piecesPerBundle ? (
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl border border-purple-200 p-3 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="p-1.5 bg-purple-500 rounded-lg">
                          <FiDollarSign className="text-white" size={14} />
                        </div>
                        <h4 className="text-xs font-semibold text-purple-800">Pricing</h4>
                      </div>
                      <div className="space-y-1">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-purple-600">Bundle:</span>
                          <span className="text-sm font-bold text-purple-700">₱{formatMoney(getProductDetail('unitprice'))}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-purple-600">Per {product.baseUnit || 'pc'}:</span>
                          <span className="text-sm font-bold text-purple-700">₱{formatMoney(getProductDetail('unitprice') / product.piecesPerBundle)}</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <StatCard 
                      icon={FiDollarSign}
                      label="Unit Price"
                      value={`₱${formatMoney(getProductDetail('unitprice'))}`}
                      color="green"
                    />
                  )}
                  
                  <StatCard 
                    icon={FiDollarSign}
                    label="Total Value"
                    value={`₱${formatMoney(getProductDetail('totalvalue'))}`}
                    color={product.isVariant ? "purple" : "orange"}
                  />
                  <StatCard 
                    icon={FiLayers}
                    label="Variants"
                    value={loadingVariants ? '...' : (() => {
                      const groupedCount = variants.reduce((groups, variant) => {
                        const key = variant.variantName || variant.size || variant.specifications || 'Default';
                        groups[key] = true;
                        return groups;
                      }, {});
                      return Object.keys(groupedCount).length;
                    })()}
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
                  Variants ({loadingVariants ? '...' : (() => {
                    const groupedCount = variants.reduce((groups, variant) => {
                      const key = variant.variantName || variant.size || variant.specifications || 'Default';
                      groups[key] = true;
                      return groups;
                    }, {});
                    return Object.keys(groupedCount).length;
                  })()})
                </div>
              </button>
              <button
                onClick={() => setActiveTab('location')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'location'
                    ? (product.isVariant ? 'border-purple-500 text-purple-600' : 'border-orange-500 text-orange-600')
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FiMapPin size={16} />
                  Location
                </div>
              </button>
              <button
                onClick={() => setActiveTab('supplier')}
                className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === 'supplier'
                    ? (product.isVariant ? 'border-purple-500 text-purple-600' : 'border-orange-500 text-orange-600')
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center gap-2">
                  <FiPackage size={16} />
                  Supplier{getSuppliers(product).length > 1 ? `s (${getSuppliers(product).length})` : ''}
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
              
               

                {/* Bundle/Package Summary - Compact */}
                {product.isBundle && product.piecesPerBundle && (
                  <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-xl border-2 border-teal-200 p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className="p-2 bg-teal-500 rounded-lg">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-bold text-teal-800 mb-2">Bundle/Package Product</h4>
                          
                          {/* Pricing Information */}
                          <div className="bg-purple-50 border border-purple-200 rounded-lg p-3 mb-3">
                            <div className="grid grid-cols-2 gap-3">
                              <div>
                                <div className="text-xs text-purple-600 mb-1">Bundle Price</div>
                                <div className="text-lg font-bold text-purple-700">
                                  ₱{formatMoney(product.unitPrice || 0)}
                                </div>
                                <div className="text-xs text-purple-600">per {product.bundlePackagingType || 'bundle'}</div>
                              </div>
                              <div>
                                <div className="text-xs text-purple-600 mb-1">Price per Piece</div>
                                <div className="text-lg font-bold text-purple-700">
                                  ₱{formatMoney((product.unitPrice || 0) / (product.piecesPerBundle || 1))}
                                </div>
                                <div className="text-xs text-purple-600">per {product.baseUnit || 'pc'}</div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-white rounded-lg p-2 border border-teal-200">
                              <div className="text-xs text-teal-600">Type</div>
                              <div className="text-sm font-bold text-teal-700 capitalize">{product.bundlePackagingType || 'bundle'}</div>
                            </div>
                            <div className="bg-white rounded-lg p-2 border border-teal-200">
                              <div className="text-xs text-teal-600">Per Package</div>
                              <div className="text-sm font-bold text-teal-700">{product.piecesPerBundle} {product.baseUnit || product.unit || 'pcs'}</div>
                            </div>
                            <div className="bg-white rounded-lg p-2 border border-teal-200">
                              <div className="text-xs text-teal-600">Total Packages</div>
                              <div className="text-sm font-bold text-teal-700">{product.totalBundles || Math.floor((product.quantity || 0) / (product.piecesPerBundle || 1))}</div>
                            </div>
                          </div>
                          {(product.loosePieces > 0 || (product.quantity || 0) % (product.piecesPerBundle || 1) > 0) && (
                            <div className="mt-2 p-2 bg-orange-100 rounded-lg border border-orange-200">
                              <div className="flex items-center gap-2">
                                <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                                <span className="text-xs text-orange-700">
                                  <span className="font-bold">{product.loosePieces || (product.quantity || 0) % (product.piecesPerBundle || 1)}</span> loose pieces
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Info Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Storage Location Card */}
                  <div 
                    onClick={handleViewLocation}
                    className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                          <FiMapPin className="text-blue-600" size={18} />
                        </div>
                        <h4 className="text-sm font-semibold text-gray-700">Storage Location</h4>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Storage Unit:</span>
                        <span className="font-medium text-gray-900">{product.storageLocation || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500">Location:</span>
                        <span className="font-medium text-gray-900">{product.shelfName || 'N/A'} - {product.rowName || 'N/A'}</span>
                      </div>
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <span className="text-xs text-blue-600 font-medium group-hover:text-blue-700">
                        Click to view on map →
                      </span>
                    </div>
                  </div>

                  {/* Supplier Card */}
                  <div 
                    onClick={() => {
                      const suppliers = getSuppliers(product);
                      if (suppliers.length > 0) {
                        setActiveTab('supplier');
                      } else {
                        onClose();
                        navigate('/im/suppliers');
                      }
                    }}
                    className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-orange-100 rounded-lg group-hover:bg-orange-200 transition-colors">
                          <FiPackage className="text-orange-600" size={18} />
                        </div>
                        <h4 className="text-sm font-semibold text-gray-700">Supplier Info</h4>
                      </div>
                      <svg className="w-4 h-4 text-gray-400 group-hover:text-orange-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                    <div className="space-y-2">
                      {(() => {
                        const suppliers = getSuppliers(product);
                        return suppliers.length > 0 ? (
                          <>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-gray-500">Primary:</span>
                              <span className="font-medium text-gray-900">{suppliers[0].name}</span>
                            </div>
                            {suppliers.length > 1 && (
                              <div className="flex items-center gap-1">
                                <span className="px-2 py-1 bg-orange-100 text-orange-700 text-xs font-medium rounded-full">
                                  +{suppliers.length - 1} more
                                </span>
                              </div>
                            )}
                          </>
                        ) : (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5">
                            <p className="text-xs text-amber-800 font-medium mb-1 flex items-center gap-1">
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              No supplier linked
                            </p>
                            <p className="text-xs text-amber-700 leading-relaxed">
                              Link this product to a supplier in the Supplier Management page
                            </p>
                          </div>
                        );
                      })()}
                    </div>
                    <div className="mt-3 pt-3 border-t border-gray-100">
                      <span className="text-xs text-orange-600 font-medium group-hover:text-orange-700 flex items-center gap-1">
                        {getSuppliers(product).length > 0 ? (
                          <>
                            View supplier details
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                          </>
                        ) : (
                          <>
                            Go to Supplier Management
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                            </svg>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Variants Tab */}
            {activeTab === 'variants' && (
              <div className="space-y-4">
                {/* Add Variant Button - Only show for base products */}
                {!product.isVariant && (
                  <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 border border-purple-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-purple-800 mb-1">Add New Variant</h4>
                        <p className="text-xs text-purple-600">Create a new variant for this product</p>
                      </div>
                      <button
                        onClick={() => {
                          setShowVariantCreationModal(true);
                        }}
                        className="px-4 py-2 bg-purple-500 text-white text-sm font-medium rounded-lg hover:bg-purple-600 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Add Variant
                      </button>
                    </div>
                  </div>
                )}
                
                {loadingVariants ? (
                  <div className="text-center py-8">
                    <div className={`w-8 h-8 border-3 ${product.isVariant ? 'border-purple-500' : 'border-orange-500'} border-t-transparent rounded-full animate-spin mx-auto mb-2`}></div>
                    <p className="text-gray-500">Loading variants...</p>
                  </div>
                ) : variants.length > 0 ? (
                  (() => {
                    // Group variants by variant name or identifier
                    const groupedVariants = variants.reduce((groups, variant) => {
                      // Use variantName as primary key, fallback to size or specifications
                      const key = variant.variantName || variant.size || variant.specifications || 'Default';
                      
                      if (!groups[key]) {
                        groups[key] = {
                          name: key,
                          instances: [],
                          totalQuantity: 0,
                          totalValue: 0,
                          unitPrice: variant.unitPrice || variant.price || 0,
                          unit: variant.unit || 'pcs',
                          specifications: variant.specifications,
                          size: variant.size,
                          isBundle: variant.isBundle,
                          piecesPerBundle: variant.piecesPerBundle,
                          bundlePackagingType: variant.bundlePackagingType,
                          baseUnit: variant.baseUnit
                        };
                      }
                      
                      groups[key].instances.push(variant);
                      groups[key].totalQuantity += Number(variant.quantity) || 0;
                      groups[key].totalValue += (Number(variant.quantity) || 0) * (Number(variant.unitPrice) || Number(variant.price) || 0);
                      
                      return groups;
                    }, {});
                    
                    return Object.values(groupedVariants).map((group, index) => (
                      <div key={group.name + index} className="bg-white rounded-xl border border-purple-200 overflow-hidden hover:shadow-md transition-shadow hover:border-purple-300">
                        <div className="bg-gradient-to-r from-purple-50 to-purple-100/50 px-4 py-3 border-b border-purple-200">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <FiLayers className="text-purple-600" size={16} />
                              <h4 className="text-sm font-semibold text-gray-800">
                                {group.name}
                              </h4>
                              {group.instances.length > 1 && (
                                <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs font-medium rounded-full">
                                  {group.instances.length} locations
                                </span>
                              )}
                            </div>
                            <span className="px-3 py-1 bg-white rounded-full text-xs font-medium text-purple-700 shadow-sm border border-purple-200">
                              {group.totalQuantity} {group.unit}
                            </span>
                          </div>
                        </div>
                        <div className="p-4">
                          <div className="grid grid-cols-2 gap-4 mb-4">
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Variant Name</div>
                              <div className="text-sm font-medium text-gray-900">
                                {group.name}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Total Quantity</div>
                              <div className="text-sm font-medium text-purple-600">
                                {group.totalQuantity} {group.unit}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">
                                {group.isBundle && group.piecesPerBundle ? 'Bundle Price' : 'Unit Price'}
                              </div>
                              <div className="text-sm font-medium text-green-600">
                                ₱{formatMoney(group.unitPrice)}
                                {group.isBundle && group.piecesPerBundle && (
                                  <span className="text-xs text-purple-600 block mt-0.5">
                                    (₱{formatMoney(group.unitPrice / group.piecesPerBundle)} / {group.baseUnit || 'pc'})
                                  </span>
                                )}
                              </div>
                            </div>
                            <div>
                              <div className="text-xs text-gray-500 mb-1">Total Value</div>
                              <div className="text-sm font-medium text-purple-600">
                                ₱{formatMoney(group.totalValue)}
                              </div>
                            </div>
                            {group.isBundle && group.piecesPerBundle && (
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Bundle Info</div>
                                <div className="text-xs font-medium text-purple-700 bg-purple-50 px-2 py-1 rounded">
                                  {group.piecesPerBundle} {group.baseUnit || 'pcs'} / {group.bundlePackagingType || 'bundle'}
                                </div>
                              </div>
                            )}
                            {group.size && (
                              <div>
                                <div className="text-xs text-gray-500 mb-1">Size</div>
                                <div className="text-sm font-medium text-gray-900">{group.size}</div>
                              </div>
                            )}
                            {group.specifications && (
                              <div className={group.size ? "" : "col-span-2"}>
                                <div className="text-xs text-gray-500 mb-1">Specifications</div>
                                <div className="text-sm font-medium text-gray-900">{group.specifications}</div>
                              </div>
                            )}
                          </div>
                          
                          {/* Show multiple locations if more than one */}
                          {group.instances.length > 1 && (
                            <div className="border-t border-purple-100 pt-4">
                              <div className="text-xs text-gray-500 mb-3 font-medium">Storage Locations ({group.instances.length})</div>
                              <div className="space-y-2">
                                {group.instances.map((instance, locIndex) => (
                                  <div key={instance.id || locIndex} className="bg-purple-50/50 border border-purple-200 rounded-lg p-3">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs font-semibold text-purple-700 bg-purple-100 px-2 py-1 rounded">
                                        Location {locIndex + 1}
                                      </span>
                                      <span className="text-xs font-medium text-purple-600">
                                        Qty: {Number(instance.quantity) || 0} {instance.unit || group.unit}
                                      </span>
                                    </div>
                                    <div className="text-sm text-gray-700">
                                      {instance.fullLocation || `${instance.storageLocation} - ${instance.shelfName} - ${instance.rowName}` || 'N/A'}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Show single location */}
                          {group.instances.length === 1 && (
                            <div className="border-t border-purple-100 pt-4">
                              <div className="text-xs text-gray-500 mb-1">Storage Location</div>
                              <div className="text-sm font-medium text-gray-900">
                                {group.instances[0].fullLocation || `${group.instances[0].storageLocation} - ${group.instances[0].shelfName} - ${group.instances[0].rowName}` || 'N/A'}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    ));
                  })()
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <FiLayers className="mx-auto mb-2" size={32} />
                    <p>No variants found for this product</p>
                    <p className="text-xs mt-1">Variants are separate products linked to this base product</p>
                  </div>
                )}
              </div>
            )}

            {/* Location Tab */}
            {activeTab === 'location' && (
              <div className="space-y-6">
                {/* Location Information */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <FiMapPin size={16} />
                      Storage Location{product.locations && product.locations.length > 1 ? 's' : ''}
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
                  <div className="p-4 space-y-3">
                    {product.locations && product.locations.length > 1 ? (
                      <>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
                          <p className="text-sm text-blue-800 font-medium">
                            📍 This product is stored in {product.locations.length} different locations
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            Total quantity across all locations: {product.quantity} {product.unit}
                          </p>
                        </div>
                        {product.locations.map((loc, index) => (
                          <div key={loc.id || index} className="bg-gray-50 border border-gray-200 rounded-lg p-3 space-y-1">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-gray-700 bg-gray-200 px-2 py-1 rounded">
                                Location {index + 1}
                              </span>
                              <span className="text-xs font-medium text-gray-600">
                                Qty: {loc.quantity} {product.unit}
                              </span>
                            </div>
                            <InfoRow label="Full Location" value={loc.location || 'N/A'} />
                            <InfoRow label="Storage Unit" value={loc.storageLocation || 'N/A'} />
                            {loc.shelfName && <InfoRow label="Shelf" value={loc.shelfName} />}
                            {loc.rowName && <InfoRow label="Row" value={loc.rowName} />}
                          </div>
                        ))}
                      </>
                    ) : (
                      <>
                        <InfoRow label="Storage Location" value={product.storageLocation || 'N/A'} />
                        <InfoRow label="Shelf Name" value={product.shelfName || 'N/A'} />
                        <InfoRow label="Row Name" value={product.rowName || 'N/A'} />
                        <InfoRow label="Full Location" value={product.fullLocation || 'N/A'} />
                      </>
                    )}
                  </div>
                </div>

                {/* Storage Unit Configuration */}
                {product.storageLocation && (
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                      <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                        <FiMap size={16} />
                        Storage Unit Details
                      </h4>
                    </div>
                    <div className="p-4">
                      <div className="grid grid-cols-2 gap-4">
                        <InfoRow label="Storage Unit" value={product.storageLocation || 'N/A'} />
                        <InfoRow label="Unit Type" value={getUnitConfig(product.storageLocation)?.type || 'N/A'} />
                        <InfoRow label="Shelves" value={getUnitConfig(product.storageLocation)?.shelves?.length || 'N/A'} />
                        <InfoRow label="Column Index" value={product.columnIndex || 'N/A'} />
                      </div>
                      {getUnitConfig(product.storageLocation) && (
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-xs text-blue-700">
                            <strong>Unit Configuration:</strong> {getUnitConfig(product.storageLocation).title}
                          </p>
                          <p className="text-xs text-blue-600 mt-1">
                            This storage unit has {getUnitConfig(product.storageLocation).shelves.length} shelves available for storage.
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Location Map Preview */}
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
                      <FiMap size={16} />
                      Location Map
                    </h4>
                    <button
                      onClick={handleViewLocation}
                      disabled={!product.storageLocation}
                      className={`flex items-center gap-2 px-3 py-1.5 text-white text-xs font-medium rounded-lg transition-colors ${
                        product.storageLocation
                          ? (product.isVariant ? 'bg-purple-500 hover:bg-purple-600' : 'bg-orange-500 hover:bg-orange-600')
                          : 'bg-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <FiMap size={14} />
                      {product.storageLocation ? 'View Full Map' : 'No Location Set'}
                    </button>
                  </div>
                  <div className="p-4">
                    {product.storageLocation ? (
                      <div className="text-center py-8">
                        <FiMap className="mx-auto mb-2 text-gray-400" size={32} />
                        <p className="text-sm text-gray-600 mb-2">Interactive storage map available</p>
                        <p className="text-xs text-gray-500">Click "View Full Map" to see the complete storage layout and locate this product</p>
                      </div>
                    ) : (
                      <div className="text-center py-8 text-gray-500">
                        <FiMapPin className="mx-auto mb-2" size={32} />
                        <p>No storage location assigned</p>
                        <p className="text-xs mt-1">This product needs to be assigned to a storage location</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Supplier Tab */}
            {activeTab === 'supplier' && (
              <div className="space-y-4">
                {/* Dedicated Suppliers Section */}
                {getSuppliers(product).length > 0 && (
                  <div className="bg-white rounded-xl border border-blue-200 overflow-hidden">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100/50 px-4 py-3 border-b border-blue-200">
                      <h4 className="text-sm font-semibold text-blue-700 flex items-center gap-2">
                        <FiPackage size={16} />
                        Product Suppliers ({getSuppliers(product).length})
                      </h4>
                    </div>
                    <div className="p-4">
                      <div className="space-y-4">
                        {getSuppliers(product).map((supplier, index) => (
                          <div key={supplier.id || index} className="bg-white border border-blue-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-3 mb-3">
                              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                <FiPackage className="text-blue-600" size={16} />
                              </div>
                              <div>
                                <h5 className="text-sm font-semibold text-gray-900">{supplier.name}</h5>
                                <p className="text-xs text-gray-600">Supplier {index + 1}</p>
                              </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                              <InfoRow label="Supplier Code" value={supplier.code || supplier.primaryCode || 'N/A'} />
                              <InfoRow label="Supplier ID" value={supplier.id || 'N/A'} />
                              {supplier.price && <InfoRow label="Supplier Price" value={`₱${formatMoney(supplier.price)}`} />}
                              {supplier.sku && <InfoRow label="Supplier SKU" value={supplier.sku} />}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Empty State - No Suppliers */}
                {getSuppliers(product).length === 0 && (
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border-2 border-amber-200 p-8">
                    <div className="text-center max-w-md mx-auto">
                      <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FiPackage className="text-amber-600" size={32} />
                      </div>
                      <h3 className="text-lg font-bold text-amber-900 mb-2">No Supplier Linked</h3>
                      <p className="text-sm text-amber-800 mb-4">
                        This product is not currently linked to any supplier. Link this product to track supplier information, pricing, and manage purchase orders.
                      </p>
                      <div className="bg-white rounded-lg border border-amber-200 p-4 mb-4">
                        <h4 className="text-sm font-semibold text-amber-900 mb-2 flex items-center justify-center gap-2">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          How to Link a Supplier
                        </h4>
                        <ol className="text-left text-xs text-amber-800 space-y-2">
                          <li className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-bold text-xs">1</span>
                            <span>Navigate to <strong>Supplier Management</strong> page</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-bold text-xs">2</span>
                            <span>Select a supplier or create a new one</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 bg-amber-100 rounded-full flex items-center justify-center text-amber-700 font-bold text-xs">3</span>
                            <span>Add this product to the supplier's product list</span>
                          </li>
                        </ol>
                      </div>
                      <button
                        onClick={() => {
                          onClose(); // Close the modal first
                          navigate('/im/suppliers'); // Navigate to supplier management page
                        }}
                        className="inline-flex items-center gap-2 px-6 py-3 bg-amber-600 text-white font-medium rounded-lg hover:bg-amber-700 transition-colors shadow-md hover:shadow-lg"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                        Go to Supplier Management
                      </button>
                    </div>
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
                            {formatValue(value)}
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

      {/* Variant Creation Modal */}
      {showVariantCreationModal && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowVariantCreationModal(false)}></div>
          <div className="min-h-screen px-4 py-8 flex items-center justify-center">
            <div className="relative bg-white w-full max-w-4xl max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden">
              <NewVariantForm
                selectedCategory={{ name: product.category }}
                onBack={() => {
                  setShowVariantCreationModal(false);
                  // Refresh variants list after creating a new variant
                  if (product && !product.isVariant) {
                    const fetchVariants = async () => {
                      setLoadingVariants(true);
                      try {
                        const storageLocation = product.storageLocation;
                        if (!storageLocation) {
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
                        
                        setVariants(variantsList);
                      } catch (error) {
                        console.error('Error fetching variants:', error);
                        setVariants([]);
                      } finally {
                        setLoadingVariants(false);
                      }
                    };
                    fetchVariants();
                  }
                }}
                preSelectedProduct={product}
              />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-[60] overflow-y-auto">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isDeleting && setShowDeleteModal(false)}></div>
          <div className="min-h-screen px-4 py-8 flex items-center justify-center">
            <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-scaleUp">
              {/* Header */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                    <FiTrash2 className="text-white" size={20} />
                  </div>
                  <div>
                    <h2 className="text-lg font-semibold text-white">Delete Product</h2>
                    <p className="text-xs text-red-100">This action cannot be undone</p>
                  </div>
                </div>
                {!isDeleting && (
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteConfirmText('');
                    }}
                    className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <span className="text-xl">✕</span>
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                {/* Warning Banner */}
                <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
                      <span className="text-red-600 text-lg font-bold">⚠</span>
                    </div>
                    <div className="flex-1">
                      <h3 className="text-sm font-bold text-red-800 mb-1">Warning: Permanent Deletion</h3>
                      <p className="text-xs text-red-700">
                        This will permanently delete the product and remove all its supplier connections. This action cannot be undone.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Product Details */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Product Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Name:</span>
                      <span className="text-sm font-medium text-gray-900">{product.name}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Category:</span>
                      <span className="text-sm font-medium text-gray-900">{product.category}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Current Stock:</span>
                      <span className="text-sm font-medium text-gray-900">
                        {product.quantity || 0} {product.unit || 'units'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Location:</span>
                      <span className="text-sm font-medium text-gray-900">{product.fullLocation || 'N/A'}</span>
                    </div>
                  </div>
                </div>

                {/* Supplier Information */}
                {getSuppliers(product).length > 0 && (
                  <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
                    <h4 className="text-sm font-semibold text-blue-700 mb-3 flex items-center gap-2">
                      <FiPackage size={14} />
                      Linked Suppliers ({getSuppliers(product).length})
                    </h4>
                    <div className="space-y-2">
                      {getSuppliers(product).map((supplier, index) => (
                        <div key={supplier.id || index} className="flex items-center gap-2 text-sm text-blue-800">
                          <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                          <span className="font-medium">{supplier.name}</span>
                          <span className="text-blue-600">({supplier.code || supplier.primaryCode || 'N/A'})</span>
                        </div>
                      ))}
                    </div>
                    <div className="mt-3 pt-3 border-t border-blue-200">
                      <p className="text-xs text-blue-700">
                        All supplier connections for this product will be permanently removed.
                      </p>
                    </div>
                  </div>
                )}

                {/* What will be deleted */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">This action will:</h4>
                  <ul className="space-y-2">
                    <li className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-red-500 mt-0.5">✕</span>
                      <span>Permanently delete this product from inventory</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-red-500 mt-0.5">✕</span>
                      <span>Remove all supplier connections for this product</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-red-500 mt-0.5">✕</span>
                      <span>Remove this product from all supplier records</span>
                    </li>
                    <li className="flex items-start gap-2 text-sm text-gray-700">
                      <span className="text-red-500 mt-0.5">✕</span>
                      <span>Delete product image and all associated data</span>
                    </li>
                  </ul>
                </div>

                {/* Confirmation Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Type <span className="font-bold text-red-600">DELETE</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder="Type DELETE here"
                    disabled={isDeleting}
                    className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 text-sm font-medium disabled:bg-gray-100 disabled:cursor-not-allowed"
                    autoFocus
                  />
                  {deleteConfirmText && deleteConfirmText !== 'DELETE' && (
                    <p className="mt-2 text-xs text-red-600">
                      Please type "DELETE" exactly as shown (all capitals)
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeleteConfirmText('');
                    }}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteProduct}
                    disabled={deleteConfirmText !== 'DELETE' || isDeleting}
                    className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isDeleting ? (
                      <>
                        <div className="w-5 h-5 border-3 border-white border-t-transparent rounded-full animate-spin"></div>
                        Deleting...
                      </>
                    ) : (
                      <>
                        <FiTrash2 size={16} />
                        Delete Product
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewProductModal;
