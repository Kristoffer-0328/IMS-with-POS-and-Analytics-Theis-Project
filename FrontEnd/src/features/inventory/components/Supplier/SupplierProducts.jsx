import React, { useState, useEffect, useMemo } from 'react';
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
  const [linkProductModal, setLinkProductModal] = useState(false);
  const [variantModal, setVariantModal] = useState(false);
  const [selectedProductForVariant, setSelectedProductForVariant] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [editData, setEditData] = useState({ supplierPrice: '', supplierSKU: '', unitPrice: '' });
  const [editingVariant, setEditingVariant] = useState(null);
  const [variantEditData, setVariantEditData] = useState({ supplierPrice: '', supplierSKU: '', unitPrice: '' });
  const db = getFirestore(app);
  const { updateSupplierProductDetails, listenToProducts } = useServices();

  // Memoize linked product IDs to prevent unnecessary re-renders in child modal
  const linkedProductIds = useMemo(() => {
    return supplierProducts.map(p => p.id);
  }, [supplierProducts]);

  const fetchSupplierProducts = async () => {
    if (!supplier?.id) return;

    setLoading(true);
    try {
      console.log('📦 Fetching supplier products for supplier:', supplier.id);
      
      // Step 1: Get the list of product IDs linked to this supplier
      // Try new structure first (Suppliers/{id}/products), then fallback to old (supplier_products/{id}/products)
      let supplierProductsRef = collection(db, 'Suppliers', supplier.id, 'products');
      let supplierProductsSnapshot = await getDocs(supplierProductsRef);
      
      if (supplierProductsSnapshot.empty) {
        console.log('📦 No products in new "Suppliers" collection, checking old "supplier_products"...');
        supplierProductsRef = collection(db, 'supplier_products', supplier.id, 'products');
        supplierProductsSnapshot = await getDocs(supplierProductsRef);
      } else {
        console.log(`📦 Found ${supplierProductsSnapshot.size} products in new "Suppliers" collection`);
      }
      
      // Create a map of productId/variantId -> supplier data (price, SKU, etc.)
      const supplierDataMap = {};
      supplierProductsSnapshot.docs.forEach(docSnapshot => {
        const data = docSnapshot.data();
        // Use the document ID as the key (which is the productId or variantId)
        const productId = docSnapshot.id;
        supplierDataMap[productId] = {
          supplierPrice: data.supplierPrice || 0,
          supplierSKU: data.supplierSKU || '',
          lastUpdated: data.lastUpdated,
          isVariant: data.isVariant || false,
          parentProductId: data.parentProductId || null,
          variantIndex: data.variantIndex || null,
          // New structure fields
          productName: data.productName || '',
          productBrand: data.productBrand || '',
          productCategory: data.productCategory || ''
        };
      });


      // Step 2: Fetch variants from new Variants collection for linked variant IDs
      const variantIds = Object.keys(supplierDataMap).filter(id => id.startsWith('VAR_'));
      const variantsFromDB = [];
      
      if (variantIds.length > 0) {
        console.log(`📦 Fetching ${variantIds.length} variants from Variants collection...`);
        for (const variantId of variantIds) {
          const variantRef = doc(db, 'Variants', variantId);
          const variantDoc = await getDoc(variantRef);
          if (variantDoc.exists()) {
            variantsFromDB.push({
              id: variantDoc.id,
              ...variantDoc.data()
            });
          }
        }
        console.log(`📦 Found ${variantsFromDB.length} variants in Variants collection`);
      }

      // Step 3: Use listenToProducts service to get all products (more efficient)
      const unsubscribe = listenToProducts((allProducts) => {

        // Step 4: Filter products that are linked to this supplier
        const linkedProducts = allProducts.filter(product => {
          const isLinked = supplierDataMap[product.id] !== undefined;
          if (isLinked) {
          }
          return isLinked;
        });


        // Step 5: Group products by base identity to consolidate duplicates across storage locations
        const productGroups = {};
        
        linkedProducts.forEach(product => {
          const supplierData = supplierDataMap[product.id];
          
          // Create a unique key for grouping (name + brand + specifications)
          const groupKey = `${product.name || 'unknown'}_${product.brand || 'generic'}_${product.specifications || ''}_${product.category || ''}`;
          
          if (!productGroups[groupKey]) {
            // Check if product has variants in Firebase (old structure)
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

        // Step 6: Process variants from new Variants collection
        variantsFromDB.forEach(variant => {
          const variantSupplierData = supplierDataMap[variant.id];
          if (!variantSupplierData) return;

          // Use denormalized product data or fetch parent product
          const productName = variant.productName || variantSupplierData.productName || 'Unknown';
          const productBrand = variant.productBrand || variantSupplierData.productBrand || 'Generic';
          const productCategory = variant.productCategory || variantSupplierData.productCategory || 'Unknown';
          
          // Create group key using denormalized parent product data
          const groupKey = `${productName}_${productBrand}_${variant.specifications || ''}_${productCategory}`;
          
          // Create variant object
          const processedVariant = {
            ...variant,
            id: variant.id,
            parentProductId: variant.parentProductId,
            name: productName,
            size: variant.size || variant.specifications || '',
            specifications: variant.specifications || '',
            supplierPrice: variantSupplierData.supplierPrice || 0,
            supplierSKU: variantSupplierData.supplierSKU || '',
            unitPrice: variant.unitPrice || 0,
            quantity: variant.quantity || 0,
            unit: variant.unit || 'pcs',
            // Handle multi-location variants
            locations: variant.locations || [],
            totalQuantity: variant.locations 
              ? variant.locations.reduce((sum, loc) => sum + (loc.quantity || 0), 0) 
              : (variant.quantity || 0)
          };

          // Add to existing product group or create new one
          if (!productGroups[groupKey]) {
            productGroups[groupKey] = {
              id: variant.parentProductId || variant.id,
              name: productName,
              brand: productBrand,
              category: productCategory,
              image: variant.productImageUrl || '',
              supplierPrice: variantSupplierData.supplierPrice || 0,
              supplierSKU: variantSupplierData.supplierSKU || '',
              lastUpdated: variantSupplierData.lastUpdated,
              variants: [processedVariant],
              actualCategory: productCategory,
              fullLocation: processedVariant.locations.length > 0 
                ? processedVariant.locations.map(l => l.fullLocation).join(', ')
                : 'Unknown',
              locations: processedVariant.locations.length > 0 
                ? processedVariant.locations 
                : [{
                    id: variant.id,
                    location: variant.fullLocation || 'Unknown',
                    quantity: variant.quantity || 0
                  }],
              allIds: [variant.id],
              totalQuantity: processedVariant.totalQuantity
            };
          } else {
            // Add variant to existing product group
            productGroups[groupKey].variants.push(processedVariant);
            productGroups[groupKey].allIds.push(variant.id);
            productGroups[groupKey].totalQuantity += processedVariant.totalQuantity;
            
            // Add locations from this variant
            if (processedVariant.locations.length > 0) {
              productGroups[groupKey].locations.push(...processedVariant.locations);
            }
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
        // Try new structure first (Suppliers/{id}/products/{productId})
        let productRef = doc(db, 'Suppliers', supplier.id, 'products', productId);
        let productDoc = await getDoc(productRef);
        
        // If not found, try old structure (supplier_products/{id}/products/{productId})
        if (!productDoc.exists()) {
          console.log('📦 Product link not in new "Suppliers" collection, using old "supplier_products"...');
          productRef = doc(db, 'supplier_products', supplier.id, 'products', productId);
        } else {
          console.log('📦 Deleting product link from new "Suppliers" collection');
        }
        
        // Delete the product document from supplier collection
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

        // Try new structure first (Suppliers/{id}/products/{variantId})
        let variantRef = doc(db, 'Suppliers', supplier.id, 'products', variantId);
        let variantDoc = await getDoc(variantRef);
        
        // If not found, try old structure (supplier_products/{id}/products/{variantId})
        if (!variantDoc.exists()) {
          console.log('📦 Variant link not in new "Suppliers" collection, using old "supplier_products"...');
          variantRef = doc(db, 'supplier_products', supplier.id, 'products', variantId);
        } else {
          console.log('📦 Deleting variant link from new "Suppliers" collection');
        }
        
        // Delete the variant from supplier collection
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

              {/* Products Grid View */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {supplierProducts.length === 0 ? (
                  <div className="col-span-full text-center py-12">
                    <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-5.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                    <p className="text-lg font-semibold text-gray-800">No products linked yet</p>
                    <p className="text-sm text-gray-500">Click "Link Product" to add products from your inventory</p>
                  </div>
                ) : (
                  supplierProducts.map((product) => (
                    <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                      {/* Product Image */}
                      <div className="aspect-square bg-gray-100 relative">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDMTMuMSAyIDE0IDIuOSAxNCA0VjE2QzE0IDE3LjEgMTMuMSAxOCA5IDE4QzQuOSAxOCA0IDE3LjEgNCAxNlY0QzQgMi45IDQuOSAyIDYgMkgxOEMxOS4xIDIgMjAgMi45IDIwIDRWMTZDMjAgMTcuMSAxOS4xIDE4IDE4IDE4SDE0VjE2QzE0IDE0LjkgMTMuMSAxNCAxMiAxNFoiIGZpbGw9IiM5Q0E0QUYiLz4KPC9zdmc+';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}

                        {/* Status Indicator */}
                        {product.name === 'Product not found' && (
                          <div className="absolute top-3 left-3 bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                            Missing
                          </div>
                        )}

                        {/* Variant Count Badge */}
                        {hasVariants(product) && (
                          <div className="absolute top-3 right-3 bg-purple-500 text-white text-xs px-2 py-1 rounded-full">
                            {product.variants.length} variants
                          </div>
                        )}
                      </div>

                      {/* Product Info */}
                      <div className="p-4">
                        <div className="mb-3">
                          <h3 className={`text-sm font-semibold mb-1 line-clamp-2 ${
                            product.name === 'Product not found' 
                              ? 'text-red-600' 
                              : 'text-gray-900'
                          }`}>
                            {product.name || 'Unknown Product'}
                          </h3>
                          
                          <div className="space-y-1 text-xs text-gray-500">
                            <div>SKU: {product.supplierSKU || 'Not set'}</div>
                            {product.brand && <div>Brand: {product.brand}</div>}
                            {product.specifications && (
                              <div className="line-clamp-1" title={product.specifications}>
                                Specs: {product.specifications}
                              </div>
                            )}
                          </div>

                          <div className="mt-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {product.category || 'Uncategorized'}
                            </span>
                          </div>
                        </div>

                        {/* Pricing Info */}
                        {editingProduct === product.id ? (
                          <div className="space-y-2 mb-3 p-3 bg-blue-50 rounded-lg">
                            <div className="text-xs font-semibold text-blue-900 mb-2">Edit Supplier Info</div>
                            <div>
                              <label className="block text-xs text-gray-700 mb-1">Supplier Price (₱)</label>
                              <input
                                type="number"
                                value={editData.supplierPrice}
                                onChange={(e) => setEditData({...editData, supplierPrice: e.target.value})}
                                className="w-full px-2 py-1.5 border rounded text-sm"
                                step="0.01"
                                min="0"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-700 mb-1">Supplier SKU</label>
                              <input
                                type="text"
                                value={editData.supplierSKU}
                                onChange={(e) => setEditData({...editData, supplierSKU: e.target.value})}
                                className="w-full px-2 py-1.5 border rounded text-sm"
                              />
                            </div>
                            <div className="flex gap-2 mt-3">
                              <button
                                onClick={() => handleSave(product.id)}
                                className="flex-1 px-3 py-1.5 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center justify-center gap-1"
                              >
                                <FiSave className="w-3 h-3" />
                                Save
                              </button>
                              <button
                                onClick={() => setEditingProduct(null)}
                                className="flex-1 px-3 py-1.5 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-2 mb-3">
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Supplier Price:</span>
                              <span className="font-semibold text-gray-900">₱{(product.supplierPrice || 0).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-500">Unit Price:</span>
                              <span className="font-semibold text-gray-900">₱{(product.variants?.[0]?.unitPrice || product.unitPrice || 0).toLocaleString()}</span>
                            </div>
                          </div>
                        )}

                        {/* Storage & Location Info */}
                        {product.locationCount > 1 && (
                          <div className="mb-3 p-2 bg-blue-50 rounded-lg">
                            <div className="text-xs text-blue-700">
                              <span className="font-semibold">📍 {product.locationCount} storage locations</span>
                              <div className="mt-1">Total qty: {product.totalQuantity} {product.unit || 'pcs'}</div>
                            </div>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                          <div className="flex space-x-1">
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
                        
                        </div>
                      </div>

                      {/* Variants Section */}
                      {hasVariants(product) && (
                        <div className="border-t border-gray-100 bg-gray-50">
                          <div className="p-3">
                            <div className="text-xs font-semibold text-gray-700 mb-2">Variants:</div>
                            <div className="space-y-2">
                              {product.variants.map((variant, variantIndex) => {
                                const variantKey = `${product.id}-${variantIndex}`;
                                const isEditingVariant = editingVariant === variantKey;
                                
                                return (
                                  <div key={`${product.id}-variant-${variantIndex}`} className="bg-white rounded-lg p-3 border border-gray-200">
                                    {isEditingVariant ? (
                                      <div className="space-y-2">
                                        <div className="text-xs font-semibold text-blue-900 mb-2">
                                          Edit: {variant.size ? `${product.name} (${variant.size})` : `${product.name} - Variant ${variantIndex + 1}`}
                                        </div>
                                        <div>
                                          <label className="block text-xs text-gray-700 mb-1">Supplier Price (₱)</label>
                                          <input
                                            type="number"
                                            value={variantEditData.supplierPrice}
                                            onChange={(e) => setVariantEditData({...variantEditData, supplierPrice: e.target.value})}
                                            className="w-full px-2 py-1.5 border rounded text-xs"
                                            step="0.01"
                                            min="0"
                                          />
                                        </div>
                                        <div>
                                          <label className="block text-xs text-gray-700 mb-1">Supplier SKU</label>
                                          <input
                                            type="text"
                                            value={variantEditData.supplierSKU}
                                            onChange={(e) => setVariantEditData({...variantEditData, supplierSKU: e.target.value})}
                                            className="w-full px-2 py-1.5 border rounded text-xs"
                                          />
                                        </div>
                                        <div className="flex gap-2 mt-2">
                                          <button
                                            onClick={() => handleVariantSave(product.id, variantIndex)}
                                            className="flex-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 flex items-center justify-center gap-1"
                                          >
                                            <FiSave className="w-3 h-3" />
                                            Save
                                          </button>
                                          <button
                                            onClick={() => setEditingVariant(null)}
                                            className="flex-1 px-2 py-1 bg-gray-300 text-gray-700 text-xs rounded hover:bg-gray-400"
                                          >
                                            Cancel
                                          </button>
                                        </div>
                                      </div>
                                    ) : (
                                      <>
                                        <div className="flex justify-between items-start mb-2">
                                          <div className="flex-1">
                                            <div className="text-sm font-medium text-gray-900">
                                              {variant.size ? `${product.name} (${variant.size})` : `${product.name} - Variant ${variantIndex + 1}`}
                                            </div>
                                            <div className="text-xs text-gray-500 space-y-1">
                                              <div>SKU: {variant.supplierSKU || 'Not set'}</div>
                                              {variant.specifications && <div>Specs: {variant.specifications}</div>}
                                              {variant.storageType && <div>Storage: {variant.storageType}</div>}
                                            </div>
                                          </div>
                                          <div className="flex space-x-1 ml-2">
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
                                        </div>
                                        <div className="flex justify-between text-xs">
                                          <span className="text-gray-500">Supplier Price:</span>
                                          <span className="font-medium text-gray-900">
                                            {variant.supplierPrice ? `₱${variant.supplierPrice.toLocaleString()}` : '-'}
                                          </span>
                                        </div>
                                        <div className="flex justify-between text-xs mt-1">
                                          <span className="text-gray-500">Unit Price:</span>
                                          <span className="font-medium text-gray-900">₱{(variant.unitPrice || 0).toLocaleString()}</span>
                                        </div>
                                      </>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
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
                onClick={() => setLinkProductModal(true)}
                className="inline-flex items-center px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg 
                         hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 
                         transition-all shadow-md hover:shadow-lg transform hover:scale-105"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Link Product
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
     
      
      {/* Link Product Modal */}
      {linkProductModal && (
        <LinkProductModal 
          supplier={supplier} 
          onClose={() => setLinkProductModal(false)} 
          onProductLinked={fetchSupplierProducts}
          linkedProductIds={linkedProductIds}
        />
      )}
      
   ~
    </div>
    
  );
};

const LinkProductModal = ({ supplier, onClose, onProductLinked, linkedProductIds }) => {
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState({});
  const [supplierPrices, setSupplierPrices] = useState({});
  const [linking, setLinking] = useState(false);
  const { listenToProducts, linkProductToSupplier } = useServices();
  const db = getFirestore(app);

  useEffect(() => {
    setLoading(true);
    console.log('📦 Fetching available products for linking...');

    // Listen to products - this returns the unsubscribe function directly
    const unsubscribe = listenToProducts((products) => {
      console.log(`📦 Got ${products.length} products from listener`);
      
      // Group by base identity to avoid duplicates
      const productGroups = {};
      
      products.forEach(item => {
        const itemName = item.name || 'unknown';
        const itemBrand = item.brand || 'generic';
        const itemCategory = item.category || '';
        const itemSpecs = item.specifications || '';
        
        const groupKey = `${itemName}_${itemBrand}_${itemSpecs}_${itemCategory}`;
        
        if (!productGroups[groupKey]) {
          productGroups[groupKey] = {
            id: item.id,
            name: itemName,
            brand: itemBrand,
            category: itemCategory,
            specifications: itemSpecs,
            imageUrl: item.imageUrl || '',
            unitPrice: item.unitPrice || 0,
            unit: item.unit || 'pcs',
            isVariant: false, // Old structure products
            locations: [item],
            totalQuantity: Number(item.quantity) || 0,
            allIds: [item.id]
          };
        } else {
          // Add to existing group
          productGroups[groupKey].locations.push(item);
          productGroups[groupKey].totalQuantity += Number(item.quantity) || 0;
          productGroups[groupKey].allIds.push(item.id);
        }
      });

      // Convert to array and filter out already linked products/variants
      const availableProducts = Object.values(productGroups)
        .filter(group => !group.allIds.some(id => linkedProductIds.includes(id)))
        .map(group => ({
          ...group,
          quantity: group.totalQuantity,
          location: group.locations.length > 1 
            ? `${group.locations.length} locations` 
            : (group.locations[0]?.fullLocation || group.locations[0]?.location || 'Unknown')
        }));

      console.log(`📦 ${availableProducts.length} products available for linking`);
      setAllProducts(availableProducts);
      setLoading(false);
    });

    // Cleanup on unmount - unsubscribe is returned directly from listenToProducts
    return () => {
      if (unsubscribe && typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []); // Empty dependency array - only run once on mount

  const handleProductSelect = (productId, checked) => {
    setSelectedProducts(prev => ({
      ...prev,
      [productId]: checked
    }));
    
    if (checked) {
      // Initialize supplier price when selecting
      const product = allProducts.find(p => p.id === productId);
      if (product && !supplierPrices[productId]) {
        setSupplierPrices(prev => ({
          ...prev,
          [productId]: product.unitPrice || 0
        }));
      }
    }
  };

  const handleSupplierPriceChange = (productId, price) => {
    setSupplierPrices(prev => ({
      ...prev,
      [productId]: parseFloat(price) || 0
    }));
  };

  const handleLinkProducts = async () => {
    const productsToLink = Object.keys(selectedProducts).filter(id => selectedProducts[id]);
    
    if (productsToLink.length === 0) {
      alert('Please select at least one product to link.');
      return;
    }

    setLinking(true);
    try {
      for (const productId of productsToLink) {
        const supplierData = {
          supplierPrice: supplierPrices[productId] || 0,
          supplierSKU: productId,  // Use product ID as supplier SKU (like the old system)
          supplierName: supplier.name,
          supplierCode: supplier.primaryCode || supplier.code
        };

        const result = await linkProductToSupplier(productId, supplier.id, supplierData);
        if (!result.success) {
          throw new Error(`Failed to link product ${productId}`);
        }
      }

      alert(`Successfully linked ${productsToLink.length} product(s) to ${supplier.name}!`);
      onProductLinked(); // Refresh the supplier products list
      onClose(); // Close the modal
    } catch (error) {
      console.error('Error linking products:', error);
      alert('Failed to link some products: ' + error.message);
    } finally {
      setLinking(false);
    }
  };

  const selectedCount = Object.values(selectedProducts).filter(Boolean).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b bg-white flex-shrink-0">
          <h2 className="text-xl font-semibold">
            Link Products to {supplier?.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-200 rounded-full"></div>
                <div className="w-16 h-16 border-4 border-blue-600 rounded-full animate-spin border-t-transparent absolute top-0 left-0"></div>
              </div>
              <div className="text-center space-y-2">
                <p className="text-lg font-semibold text-gray-800">Loading Products...</p>
                <p className="text-sm text-gray-500">Please wait while we fetch available products</p>
              </div>
            </div>
          ) : allProducts.length === 0 ? (
            <div className="text-center py-12">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-5.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
              <p className="text-lg font-semibold text-gray-800">No Available Products</p>
              <p className="text-sm text-gray-500">All products are already linked to this supplier</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <p className="text-sm text-blue-800">
                  Select products from your inventory to link to <strong>{supplier.name}</strong>. 
                  Set the supplier price for each selected product. The supplier SKU will be automatically set to match your internal product ID.
                </p>
                {selectedCount > 0 && (
                  <p className="text-sm text-blue-700 mt-2 font-medium">
                    {selectedCount} product{selectedCount !== 1 ? 's' : ''} selected
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {allProducts.map((product) => (
                  <div key={product.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
                    {/* Product Image */}
                    <div className="aspect-square bg-gray-100 relative">
                      {product.imageUrl ? (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTEyIDJDMTMuMSAyIDE0IDIuOSAxNCA0VjE2QzE0IDE3LjEgMTMuMSAxOCA5IDE4QzQuOSAxOCA0IDE3LjEgNCAxNlY0QzQgMi45IDQuOSAyIDYgMkgxOEMxOS4xIDIgMjAgMi45IDIwIDRWMTZDMjAgMTcuMSAxOS4xIDE4IDE4IDE4SDE0VjE2QzE0IDE0LjkgMTMuMSAxNCAxMiAxNFoiIGZpbGw9IiM5Q0E0QUYiLz4KPC9zdmc+';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <svg className="w-12 h-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                      )}

                      {/* Selection Checkbox */}
                      <div className="absolute top-3 left-3">
                        <input
                          type="checkbox"
                          checked={selectedProducts[product.id] || false}
                          onChange={(e) => handleProductSelect(product.id, e.target.checked)}
                          className="w-5 h-5 text-blue-600 bg-white border-2 border-white rounded focus:ring-blue-500 focus:ring-2"
                        />
                      </div>

                      {/* Selection Indicator */}
                      {selectedProducts[product.id] && (
                        <div className="absolute top-3 right-3 bg-blue-500 text-white rounded-full w-6 h-6 flex items-center justify-center">
                          <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                    </div>

                    {/* Product Info */}
                    <div className="p-4">
                      <div className="mb-3">
                        <h3 className="text-sm font-semibold text-gray-900 mb-1 line-clamp-2">
                          {product.name || 'Unknown Product'}
                        </h3>
                        {product.brand && (
                          <p className="text-xs text-gray-500 mb-1">Brand: {product.brand}</p>
                        )}
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {product.category || 'Uncategorized'}
                        </span>
                      </div>

                      {/* Stock Info */}
                      <div className="space-y-1 mb-3">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Stock:</span>
                          <span className="font-medium text-gray-900">{product.quantity} {product.unit || 'pcs'}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Unit Price:</span>
                          <span className="font-medium text-gray-900">₱{product.unitPrice?.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">Location:</span>
                          <span className="font-medium text-gray-900 truncate max-w-24" title={product.location}>
                            {product.location}
                          </span>
                        </div>
                      </div>

                      {/* Supplier Price Input - Only show when selected */}
                      {selectedProducts[product.id] && (
                        <div className="border-t border-gray-100 pt-3">
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Supplier Price (₱)
                          </label>
                          <input
                            type="number"
                            value={supplierPrices[product.id] || ''}
                            onChange={(e) => handleSupplierPriceChange(product.id, e.target.value)}
                            className="w-full px-2 py-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                            placeholder="0.00"
                            step="0.01"
                            min="0"
                          />
                        </div>
                      )}

                      {/* Specifications */}
                      {product.specifications && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500 line-clamp-2" title={product.specifications}>
                            {product.specifications}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 bg-gray-50 p-6 flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {allProducts.length} available product{allProducts.length !== 1 ? 's' : ''} • {selectedCount} selected
            </div>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="inline-flex items-center px-5 py-2.5 bg-white text-gray-700 text-sm font-semibold rounded-lg 
                         border-2 border-gray-300 hover:bg-gray-50 hover:border-gray-400 focus:outline-none 
                         focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all shadow-sm hover:shadow"
                disabled={linking}
              >
                Cancel
              </button>
              <button
                onClick={handleLinkProducts}
                disabled={selectedCount === 0 || linking}
                className={`inline-flex items-center px-5 py-2.5 text-white text-sm font-semibold rounded-lg 
                         transition-all shadow-md hover:shadow-lg transform hover:scale-105 ${
                  selectedCount === 0 || linking
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
                }`}
              >
                {linking ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Linking...
                  </>
                ) : (
                  <>
                    Link {selectedCount} Product{selectedCount !== 1 ? 's' : ''}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierProducts; 
