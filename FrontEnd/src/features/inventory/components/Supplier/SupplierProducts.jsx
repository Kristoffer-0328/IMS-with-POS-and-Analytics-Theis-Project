import React, { useState, useEffect } from 'react';
import { FiX, FiEdit2, FiTrash2, FiSave } from 'react-icons/fi';
import { getFirestore, collection, getDocs, doc, getDoc, deleteDoc, updateDoc } from 'firebase/firestore';
import app from '../../../../FirebaseConfig';
import CategoryModalIndex from '../Inventory/CategoryModal/CategoryModalIndex';
import NewVariantForm from '../Inventory/CategoryModal/NewVariantForm';
import { useServices } from '../../../../services/firebase/ProductServices';

const SupplierProducts = ({ supplier, onClose }) => {
  const [supplierProducts, setSupplierProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categorymodal, setcategorymodal] = useState(false);
  const [variantModal, setVariantModal] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editData, setEditData] = useState({ supplierPrice: '', supplierSKU: '', unitPrice: '' });
  const [expandedProducts, setExpandedProducts] = useState(new Set());
  const [editingVariant, setEditingVariant] = useState(null);
  const [variantEditData, setVariantEditData] = useState({ supplierPrice: '', supplierSKU: '', unitPrice: '' });
  const db = getFirestore(app);
  const { updateSupplierProductDetails, listenToProducts } = useServices();

  const fetchSupplierProducts = async () => {
    if (!supplier?.id) return;

    setLoading(true);
    try {
      // Step 1: Get the list of product IDs linked to this supplier
      const supplierProductsRef = collection(db, 'supplier_products', supplier.id, 'products');
      const supplierProductsSnapshot = await getDocs(supplierProductsRef);
      
      // Create a map of productId -> supplier data (price, SKU, etc.)
      const supplierDataMap = {};
      supplierProductsSnapshot.docs.forEach(docSnapshot => {
        const data = docSnapshot.data();
        // Use the document ID as the key (which is the productId)
        const productId = docSnapshot.id;
        supplierDataMap[productId] = {
          supplierPrice: data.supplierPrice || 0,
          supplierSKU: data.supplierSKU || '',
          lastUpdated: data.lastUpdated,
          isVariant: data.isVariant || false,
          parentProductId: data.parentProductId || null,
          variantIndex: data.variantIndex || null
        };
      });


      // Step 2: Use listenToProducts service to get all products (more efficient)
      const unsubscribe = listenToProducts((allProducts) => {

        // Step 3: Filter products that are linked to this supplier
        const linkedProducts = allProducts.filter(product => {
          const isLinked = supplierDataMap[product.id] !== undefined;
          if (isLinked) {
          }
          return isLinked;
        });


        // Step 4: Group products by base identity to consolidate duplicates across storage locations
        const productGroups = {};
        
        linkedProducts.forEach(product => {
          const supplierData = supplierDataMap[product.id];
          
          // Create a unique key for grouping (name + brand + specifications)
          const groupKey = `${product.name || 'unknown'}_${product.brand || 'generic'}_${product.specifications || ''}_${product.category || ''}`;
          
          if (!productGroups[groupKey]) {
            // Check if product has variants in Firebase
            const productVariants = Array.isArray(product.variants) ? product.variants : [];
            
            // Process variants that are linked to this supplier
            const linkedVariants = productVariants
              .map((variant, index) => {
                const variantId = variant.id || `${product.id}_variant_${index}`;
                const variantSupplierData = supplierDataMap[variantId];
                
                if (variantSupplierData) {
                  return {
                    ...variant,
                    id: variantId,
                    variantIndex: index,
                    parentProductId: product.id,
                    name: variant.name || product.name,
                    size: variant.size || variant.specifications || '',
                    specifications: variant.specifications || '',
                    supplierPrice: variantSupplierData.supplierPrice || 0,
                    supplierSKU: variantSupplierData.supplierSKU || '',
                    unitPrice: variant.unitPrice || 0,
                    quantity: variant.quantity || 0,
                    unit: variant.unit || 'pcs'
                  };
                }
                return null;
              })
              .filter(v => v !== null);
            
            productGroups[groupKey] = {
              ...product,
              supplierPrice: supplierData.supplierPrice || 0,
              supplierSKU: supplierData.supplierSKU || '',
              lastUpdated: supplierData.lastUpdated,
              originalUnitPrice: product.unitPrice, // Store original unit price for editing
              variants: linkedVariants,
              actualCategory: product.category || product.storageLocation || 'Unknown',
              fullLocation: product.fullLocation || '',
              locations: [{
                id: product.id,
                location: product.fullLocation || product.location || 'Unknown',
                storageLocation: product.storageLocation,
                quantity: Number(product.quantity) || 0
              }],
              allIds: [product.id],
              totalQuantity: Number(product.quantity) || 0
            };
          } else {
            // Add this location to the existing product group
            productGroups[groupKey].locations.push({
              id: product.id,
              location: product.fullLocation || product.location || 'Unknown',
              storageLocation: product.storageLocation,
              quantity: Number(product.quantity) || 0
            });
            productGroups[groupKey].allIds.push(product.id);
            productGroups[groupKey].totalQuantity += Number(product.quantity) || 0;
          }
        });

        // Convert grouped products to array
        const processedProducts = Object.values(productGroups).map(group => ({
          ...group,
          locationCount: group.locations.length,
          // Update the full location display to show multiple locations if applicable
          fullLocation: group.locations.length > 1 
            ? `${group.locations.length} locations` 
            : group.locations[0]?.location || 'Unknown'
        }));

        setSupplierProducts(processedProducts);
        setLoading(false);
      });

      // Store unsubscribe function for cleanup
      return () => unsubscribe();
      
    } catch (error) {
      console.error('Error fetching supplier products:', error);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplierProducts();
  }, [supplier, db]);

  const handleEdit = (product) => {
    setEditingProduct(product.id);
    setEditData({
      supplierPrice: product.supplierPrice, // This is the actual supplier price from database
      supplierSKU: product.supplierSKU,
      unitPrice: product.originalUnitPrice || product.unitPrice // Use originalUnitPrice if available, otherwise use unitPrice
    });
  };

  const handleSave = async (productId) => {
    try {
      // Map UI data to database structure
      // Database stores supplierPrice directly, not in unitPrice field
      const updateData = {
        supplierPrice: editData.supplierPrice, // UI "Supplier Price" maps to database "supplierPrice"
        supplierSKU: editData.supplierSKU,
        // Store unit price as a separate field for reference
        originalUnitPrice: editData.unitPrice
      };
      
      await updateSupplierProductDetails(productId, supplier.id, updateData);
      setEditingProduct(null);
      await fetchSupplierProducts(); // Refresh the list
    } catch (error) {
      console.error('Error updating product:', error);
    }
  };

  const handleUnlink = async (productId) => {
    if (window.confirm('Are you sure you want to unlink this product from the supplier?')) {
      try {
        // Delete the product document from supplier_products collection
        const productRef = doc(db, 'supplier_products', supplier.id, 'products', productId);
        await deleteDoc(productRef);
        
        // Refresh the list
        await fetchSupplierProducts();
        
        // Show success message
        alert('Product successfully unlinked from supplier!');
      } catch (error) {
        console.error('Error unlinking product:', error);
        alert('Failed to unlink product: ' + error.message);
      }
    }
  };

  const toggleProductExpansion = (productId) => {
    const newExpanded = new Set(expandedProducts);
    if (newExpanded.has(productId)) {
      newExpanded.delete(productId);
    } else {
      newExpanded.add(productId);
    }
    setExpandedProducts(newExpanded);
  };

  const hasVariants = (product) => {
    return product.variants && Array.isArray(product.variants) && product.variants.length > 0;
  };

  const handleVariantEdit = (productId, variantIndex, variant) => {
    const variantKey = `${productId}-${variantIndex}`;
    setEditingVariant(variantKey);
    setVariantEditData({
      supplierPrice: variant.supplierPrice || 0,
      supplierSKU: variant.supplierSKU || '',
      unitPrice: variant.unitPrice || 0
    });
  };

  const handleVariantSave = async (productId, variantIndex) => {
    try {
      // Find the variant in the current product list
      const product = supplierProducts.find(p => p.id === productId);
      if (!product || !product.variants || !product.variants[variantIndex]) {
        throw new Error('Variant not found');
      }

      const variant = product.variants[variantIndex];
      const variantId = variant.id;

      // Update supplier-product relationship in supplier_products collection
      const supplierProductRef = doc(db, 'supplier_products', supplier.id, 'products', variantId);
      await updateDoc(supplierProductRef, {
        supplierPrice: parseFloat(variantEditData.supplierPrice) || 0,
        supplierSKU: variantEditData.supplierSKU || '',
        lastUpdated: new Date().toISOString()
      });

      setEditingVariant(null);
      await fetchSupplierProducts(); // Refresh the list
    } catch (error) {
      console.error('Error updating variant:', error);
      alert(`Failed to update variant: ${error.message}`);
    }
  };

  const handleVariantUnlink = async (productId, variantIndex, variantName) => {
    if (window.confirm(`Are you sure you want to remove "${variantName}" variant from this supplier?`)) {
      try {
        // Find the variant in the current product list
        const product = supplierProducts.find(p => p.id === productId);
        if (!product || !product.variants || !product.variants[variantIndex]) {
          throw new Error('Variant not found');
        }

        const variant = product.variants[variantIndex];
        const variantId = variant.id;

        // Delete the variant from supplier_products collection
        const variantRef = doc(db, 'supplier_products', supplier.id, 'products', variantId);
        await deleteDoc(variantRef);

        await fetchSupplierProducts(); // Refresh the list
        alert('Variant successfully unlinked from supplier!');
      } catch (error) {
        console.error('Error unlinking variant:', error);
        alert(`Failed to unlink variant: ${error.message}`);
      }
    }
  };

  const handleAddVariant = (product) => {
    setSelectedProductForVariant(product);
    setVariantModal(true);
  };

  const handleVariantModalClose = () => {
    setVariantModal(false);
    setSelectedProductForVariant(null);
    fetchSupplierProducts(); // Refresh the list after adding variant
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-7xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Fixed Header */}
        <div className="flex justify-between items-center p-6 border-b bg-white flex-shrink-0">
          <h2 className="text-xl font-semibold">
            Products from {supplier?.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              {/* Animated Spinner */}
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
                <div className="w-16 h-16 border-4 border-blue-600 rounded-full animate-spin border-t-transparent absolute top-0 left-0"></div>
              </div>
              
              {/* Loading Text */}
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold text-gray-800">Loading Products...</p>
                <p className="text-sm text-gray-500">Please wait while we fetch the supplier's products</p>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="bg-gray-50 p-4 rounded-lg mb-6">
                <h3 className="font-medium mb-3 text-gray-900">Supplier Details</h3>
                <div className="grid grid-cols-2 gap-6 text-sm">
                  <div className="space-y-2">
                    <p><span className="font-medium text-gray-700">Code:</span> <span className="text-gray-900">{supplier.primaryCode || supplier.code || 'N/A'}</span></p>
                    <p><span className="font-medium text-gray-700">Contact:</span> <span className="text-gray-900">{supplier.contactPerson || 'N/A'}</span></p>
                    <p><span className="font-medium text-gray-700">Phone:</span> <span className="text-gray-900">{supplier.phone || 'N/A'}</span></p>
                  </div>
                  <div className="space-y-2">
                    <p><span className="font-medium text-gray-700">Email:</span> <span className="text-gray-900">{supplier.email || 'N/A'}</span></p>
                    <p><span className="font-medium text-gray-700">Address:</span> <span className="text-gray-900">{supplier.address || 'N/A'}</span></p>
                    <p><span className="font-medium text-gray-700">Status:</span> 
                      <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${
                        supplier.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {supplier.status || 'Active'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-white shadow-sm rounded-lg border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto min-w-full">
                  <table className="min-w-full divide-y divide-gray-200 table-fixed">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '200px'}}>
                          Product Name
                        </th>
                        <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '250px'}}>
                          Product Details
                        </th>
                        <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '120px'}}>
                          Category
                        </th>
                        <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '120px'}}>
                          Supplier Price
                        </th>
                        <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '120px'}}>
                          Unit Price
                        </th>
                        <th className="px-4 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider" style={{width: '160px'}}>
                          Actions
                        </th>
                      </tr>
                    </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {supplierProducts.length === 0 ? (
                    <tr>
                      <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                        <div className="flex flex-col items-center space-y-2">
                          <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-5.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                          <p className="text-sm">No products linked to this supplier yet</p>
                          <p className="text-xs text-gray-400">Click "Add Product" to link products from your inventory</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    supplierProducts.map((product) => (
                      <React.Fragment key={product.id}>
                        <tr className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            {hasVariants(product) && (
                              <button
                                onClick={() => toggleProductExpansion(product.id)}
                                className="mr-2 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                                title={expandedProducts.has(product.id) ? 'Collapse variants' : 'Expand variants'}
                              >
                                <svg 
                                  className={`w-4 h-4 transition-transform ${expandedProducts.has(product.id) ? 'rotate-90' : ''}`} 
                                  fill="none" 
                                  stroke="currentColor" 
                                  viewBox="0 0 24 24"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                </svg>
                              </button>
                            )}
                            <div>
                              <div className={`text-sm font-medium ${
                                product.name === 'Product not found' 
                                  ? 'text-red-600' 
                                  : 'text-gray-900'
                              }`}>
                                {product.name || 'Unknown Product'}
                                {product.name === 'Product not found' && (
                                  <span className="ml-2 px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded-full">
                                    Missing from inventory
                                  </span>
                                )}
                              </div>
                              {hasVariants(product) && (
                                <div className="text-xs text-gray-500 mt-1">
                                  {product.variants.length} variant{product.variants.length !== 1 ? 's' : ''}
                                </div>
                              )}
                            </div>
                          </div>
                      </td>
                        <td className="px-3 py-4">
                        {editingProduct === product.id ? (
                          <div className="space-y-2">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Supplier SKU</label>
                              <input
                                type="text"
                                value={editData.supplierSKU}
                                onChange={(e) => setEditData({ ...editData, supplierSKU: e.target.value })}
                                className="w-full p-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                placeholder="Enter supplier SKU"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Supplier Price (₱)</label>
                              <input
                                type="number"
                                value={editData.supplierPrice}
                                onChange={(e) => setEditData({ ...editData, supplierPrice: parseFloat(e.target.value) })}
                                className="w-full p-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                placeholder="Enter supplier price"
                                step="0.01"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Unit Price (₱)</label>
                              <input
                                type="number"
                                value={editData.unitPrice}
                                onChange={(e) => setEditData({ ...editData, unitPrice: parseFloat(e.target.value) })}
                                className="w-full p-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                placeholder="Enter unit price"
                                step="0.01"
                              />
                            </div>
                          </div>
                        ) : (
                            <div className="text-sm text-gray-900 break-words max-w-xs">
                              <div className="font-medium text-gray-700">SKU: {product.supplierSKU || 'Not set'}</div>
                              {product.specifications && (
                                <div className="text-xs text-gray-500 mt-1">
                                  Specs: {product.specifications}
                                </div>
                              )}
                              {product.brand && (
                                <div className="text-xs text-gray-500">
                                  Brand: {product.brand}
                                </div>
                              )}
                              {product.storageType && (
                                <div className="text-xs text-gray-500">
                                  Storage: {product.storageType}
                                </div>
                              )}
                              {product.locationCount > 1 && (
                                <div className="text-xs mt-2">
                                  <span className="inline-flex items-center px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full font-semibold">
                                    📍 {product.locationCount} storage locations
                                  </span>
                                  <div className="mt-1 text-xs text-gray-600">
                                    Total qty: {product.totalQuantity} {product.unit || 'pcs'}
                                  </div>
                                </div>
                              )}
                            </div>
                        )}
                      </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {product.category || 'Uncategorized'}
                          </span>
                      </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                        {editingProduct === product.id ? (
                          <input
                            type="number"
                            value={editData.supplierPrice}
                            onChange={(e) => setEditData({ ...editData, supplierPrice: parseFloat(e.target.value) })}
                              className="w-full p-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                        ) : (
                            <div className="text-sm font-medium text-gray-900">₱{(product.supplierPrice || 0).toLocaleString()}</div>
                        )}
                      </td>
                        <td className="px-3 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">₱{(product.variants?.[0]?.unitPrice || product.unitPrice || 0).toLocaleString()}</div>
                      </td>
                        <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {editingProduct === product.id ? (
                            <div className="flex justify-end space-x-2">
                            <button
                              onClick={() => handleSave(product.id)}
                                className="inline-flex items-center p-2 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-md transition-colors"
                                title="Save changes"
                            >
                                <FiSave className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setEditingProduct(null)}
                                className="inline-flex items-center p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                                title="Cancel"
                            >
                                <FiX className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                            <div className="flex justify-end space-x-1">
                              <button
                                onClick={() => handleAddVariant(product)}
                                disabled={product.name === 'Product not found' || !product.category}
                                className={`inline-flex items-center p-2 rounded-md transition-colors ${
                                  product.name === 'Product not found' || !product.category
                                    ? 'text-gray-400 cursor-not-allowed' 
                                    : 'text-green-600 hover:text-green-900 hover:bg-green-50'
                                }`}
                                title={
                                  product.name === 'Product not found' || !product.category
                                    ? "Cannot add variant - product not found in main inventory"
                                    : "Add variant to this product"
                                }
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                              </button>
                            <button
                              onClick={() => handleEdit(product)}
                                className="inline-flex items-center p-2 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-md transition-colors"
                                title="Edit product details"
                            >
                                <FiEdit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleUnlink(product.id)}
                                className="inline-flex items-center p-2 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md transition-colors"
                                title="Unlink from supplier"
                              >
                                <FiTrash2 className="w-4 h-4" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                      {/* Variant rows */}
                      {expandedProducts.has(product.id) && hasVariants(product) && 
                        product.variants.map((variant, variantIndex) => (
                          <tr key={`${product.id}-variant-${variantIndex}`} className="bg-gray-50">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <div className="flex items-center pl-6">
                                <div className="w-4 h-4 mr-2 flex-shrink-0">
                                  <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
                                </div>
                                <div>
                                  <div className="text-sm text-gray-700 font-medium">
                                    {variant.size ? `${product.name} (${variant.size})` : `${product.name} - Variant ${variantIndex + 1}`}
                                  </div>
                                  {variant.specifications && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      {variant.specifications}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              {editingVariant === `${product.id}-${variantIndex}` ? (
                                <div className="space-y-2">
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">Supplier SKU</label>
                                    <input
                                      type="text"
                                      value={variantEditData.supplierSKU}
                                      onChange={(e) => setVariantEditData({ ...variantEditData, supplierSKU: e.target.value })}
                                      className="w-full p-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                      placeholder="Enter supplier SKU"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">Supplier Price (₱)</label>
                                    <input
                                      type="number"
                                      value={variantEditData.supplierPrice}
                                      onChange={(e) => setVariantEditData({ ...variantEditData, supplierPrice: parseFloat(e.target.value) })}
                                      className="w-full p-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                      placeholder="Enter supplier price"
                                      step="0.01"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs text-gray-500 mb-1">Unit Price (₱)</label>
                                    <input
                                      type="number"
                                      value={variantEditData.unitPrice}
                                      onChange={(e) => setVariantEditData({ ...variantEditData, unitPrice: parseFloat(e.target.value) })}
                                      className="w-full p-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                      placeholder="Enter unit price"
                                      step="0.01"
                                    />
                                  </div>
                                </div>
                              ) : (
                                <div className="text-sm text-gray-600 break-words max-w-xs">
                                  <div className="font-medium text-gray-700">SKU: {variant.supplierSKU || 'Not set'}</div>
                                  {variant.specifications && (
                                    <div className="text-xs text-gray-500 mt-1">
                                      Specs: {variant.specifications}
                                    </div>
                                  )}
                                  {variant.size && (
                                    <div className="text-xs text-gray-500">
                                      Size: {variant.size}
                                    </div>
                                  )}
                                  {variant.storageType && (
                                    <div className="text-xs text-gray-500">
                                      Storage: {variant.storageType}
                                    </div>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                                Variant
                              </span>
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              {editingVariant === `${product.id}-${variantIndex}` ? (
                                <input
                                  type="number"
                                  value={variantEditData.supplierPrice}
                                  onChange={(e) => setVariantEditData({ ...variantEditData, supplierPrice: parseFloat(e.target.value) || 0 })}
                                  className="w-full p-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                />
                              ) : (
                                <div className="text-sm text-gray-700">
                                  {variant.supplierPrice ? `₱${variant.supplierPrice.toLocaleString()}` : '-'}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-700">
                                ₱{(variant.unitPrice || 0).toLocaleString()}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-right text-sm font-medium">
                              {editingVariant === `${product.id}-${variantIndex}` ? (
                                <div className="flex justify-end space-x-2">
                                  <button
                                    onClick={() => handleVariantSave(product.id, variantIndex)}
                                    className="inline-flex items-center p-1.5 text-green-600 hover:text-green-900 hover:bg-green-50 rounded-md transition-colors"
                                    title="Save variant changes"
                                  >
                                    <FiSave className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setEditingVariant(null)}
                                    className="inline-flex items-center p-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-50 rounded-md transition-colors"
                                    title="Cancel"
                                  >
                                    <FiX className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <div className="flex justify-end space-x-2">
                                  <button
                                    onClick={() => handleVariantEdit(product.id, variantIndex, variant)}
                                    className="inline-flex items-center p-1.5 text-blue-600 hover:text-blue-900 hover:bg-blue-50 rounded-md transition-colors"
                                    title="Edit variant supplier info"
                                  >
                                    <FiEdit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleVariantUnlink(product.id, variantIndex, variant.size ? `${product.name} (${variant.size})` : `Variant ${variantIndex + 1}`)}
                                    className="inline-flex items-center p-1.5 text-red-600 hover:text-red-900 hover:bg-red-50 rounded-md transition-colors"
                                    title="Remove variant from supplier"
                                  >
                                    <FiTrash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                        ))
                      }
                      </React.Fragment>
                  ))
                  )}
                </tbody>
              </table>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Fixed Footer with Buttons */}
        <div className="border-t border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100 p-6 flex-shrink-0">
          <div className="flex justify-between items-center gap-4">
            <div className="text-sm text-gray-600 flex-shrink-0">
              <span className="font-semibold text-gray-900">{supplierProducts.length}</span> product{supplierProducts.length !== 1 ? 's' : ''} linked
              {supplierProducts.some(p => hasVariants(p)) && (
                <span className="ml-2 text-gray-500">
                  • <span className="font-semibold text-gray-900">{supplierProducts.reduce((total, product) => total + (product.variants?.length || 0), 0)}</span> variant{supplierProducts.reduce((total, product) => total + (product.variants?.length || 0), 0) !== 1 ? 's' : ''}
                </span>
              )}
            </div>
            
            <div className="flex gap-3 flex-shrink-0">
              <button
                onClick={() => setcategorymodal(true)}
                className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg 
                         hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
                         transition-all shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Product
              </button>

              <button
                onClick={onClose}
                className="inline-flex items-center px-5 py-2.5 bg-white text-gray-700 text-sm font-semibold rounded-lg 
                         border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:outline-none 
                         focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all shadow-sm hover:shadow"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
      <CategoryModalIndex CategoryOpen={categorymodal} CategoryClose={() => setcategorymodal(false)} supplier={supplier} />
      
      {/* Variant Modal */}
      {variantModal && selectedProductForVariant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b">
              <h2 className="text-xl font-semibold">
                Add Variant to {selectedProductForVariant.name}
              </h2>
              <button
                onClick={() => setVariantModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX size={24} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <NewVariantForm 
                selectedCategory={{ name: selectedProductForVariant.actualCategory || selectedProductForVariant.category }}
                onBack={handleVariantModalClose}
                preSelectedProduct={selectedProductForVariant}
                supplier={supplier}
              />
            </div>
          </div>
        </div>
      )}
    </div>
    
  );
};

export default SupplierProducts; 
