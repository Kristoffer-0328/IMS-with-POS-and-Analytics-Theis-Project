import React, { useState, useEffect } from 'react';
import { FiX, FiEdit2, FiTrash2, FiSave } from 'react-icons/fi';
import { getFirestore, collection, getDocs, doc, getDoc, deleteDoc } from 'firebase/firestore';
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
  const [editData, setEditData] = useState({ supplierPrice: '', supplierSKU: '' });
  const [expandedProducts, setExpandedProducts] = useState(new Set());
  const [editingVariant, setEditingVariant] = useState(null);
  const [variantEditData, setVariantEditData] = useState({ supplierPrice: '', supplierSKU: '' });
  const db = getFirestore(app);
  const { updateSupplierProductDetails } = useServices();

  const fetchSupplierProducts = async () => {
    if (!supplier?.id) return;

    setLoading(true);
    try {
      const supplierProductsRef = collection(db, 'supplier_products', supplier.id, 'products');
      const supplierProductsSnapshot = await getDocs(supplierProductsRef);
      
      const productsData = await Promise.all(
        supplierProductsSnapshot.docs.map(async (docSnapshot) => {
          const productData = docSnapshot.data();
          

          
          try {
            // We need to search through all categories to find the product
            const categoriesRef = collection(db, 'Products');
            const categoriesSnapshot = await getDocs(categoriesRef);
            
            let mainProductData = {};
            let foundInCategory = null;
            
            for (const categoryDoc of categoriesSnapshot.docs) {
              const categoryName = categoryDoc.id;
              const productRef = doc(db, 'Products', categoryName, 'Items', productData.productId);
              
              try {
                const productSnap = await getDoc(productRef);
                if (productSnap.exists()) {
                  mainProductData = productSnap.data();
                  foundInCategory = categoryName;
                  break;
                }
              } catch (err) {
                // Continue to next category if this one fails
                continue;
              }
            }

          return {
            id: productData.productId,
            ...mainProductData,
              supplierPrice: productData.supplierPrice || 0,
              supplierSKU: productData.supplierSKU || '',
              lastUpdated: productData.lastUpdated,
              // Use the exact category where the product was found
              actualCategory: foundInCategory || mainProductData.category || 'Unknown'
            };
          } catch (error) {
            console.error('Error fetching product details:', error);
            return {
              id: productData.productId,
              name: 'Product not found',
            supplierPrice: productData.supplierPrice || 0,
            supplierSKU: productData.supplierSKU || '',
            lastUpdated: productData.lastUpdated
          };
          }
        })
      );

      setSupplierProducts(productsData);
    } catch (error) {
      console.error('Error fetching supplier products:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSupplierProducts();
  }, [supplier, db]);

  const handleEdit = (product) => {
    setEditingProduct(product.id);
    setEditData({
      supplierPrice: product.supplierPrice,
      supplierSKU: product.supplierSKU
    });
  };

  const handleSave = async (productId) => {
    try {
      await updateSupplierProductDetails(productId, supplier.id, editData);
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
      supplierPrice: variant.supplierPrice || variant.unitPrice || '',
      supplierSKU: variant.supplier?.code || variant.supplierSKU || ''
    });
  };

  const handleVariantSave = async (productId, variantIndex) => {
    try {
      // Here you would implement variant-specific supplier data update
      // For now, this is a placeholder - you might want to store variant-supplier relationships
      // in a separate collection or as part of the product document
      console.log('Saving variant data:', { productId, variantIndex, variantEditData });
      
      setEditingVariant(null);
      await fetchSupplierProducts(); // Refresh the list
    } catch (error) {
      console.error('Error updating variant:', error);
    }
  };

  const handleVariantUnlink = async (productId, variantIndex, variantName) => {
    if (window.confirm(`Are you sure you want to remove "${variantName}" variant from this supplier?`)) {
      try {
        // Here you would implement variant-specific unlinking
        console.log('Unlinking variant:', { productId, variantIndex });
        
        await fetchSupplierProducts(); // Refresh the list
      } catch (error) {
        console.error('Error unlinking variant:', error);
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[80vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">
            Products from {supplier?.name}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <FiX size={24} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
          {loading ? (
            <div className="text-center py-4">Loading products...</div>
          ) : supplierProducts.length === 0 ? (
            <div className="text-center py-4 text-gray-500">
              No products found for this supplier
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
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                      <th className="px-4 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                      Product Name
                    </th>
                      <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/6">
                      Supplier SKU
                    </th>
                      <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                      Category
                    </th>
                      <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                      Supplier Price
                    </th>
                      <th className="px-3 py-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/8">
                      Unit Price
                    </th>
                      <th className="px-4 py-4 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-1/4">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {supplierProducts.map((product) => (
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
                        <td className="px-3 py-4 whitespace-nowrap">
                        {editingProduct === product.id ? (
                          <input
                            type="text"
                            value={editData.supplierSKU}
                            onChange={(e) => setEditData({ ...editData, supplierSKU: e.target.value })}
                              className="w-full p-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                          />
                        ) : (
                            <div className="text-sm text-gray-900">{product.supplierSKU || '-'}</div>
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
                            <td className="px-3 py-3 whitespace-nowrap">
                              {editingVariant === `${product.id}-${variantIndex}` ? (
                                <input
                                  type="text"
                                  value={variantEditData.supplierSKU}
                                  onChange={(e) => setVariantEditData({ ...variantEditData, supplierSKU: e.target.value })}
                                  className="w-full p-1.5 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                                />
                              ) : (
                                <div className="text-sm text-gray-600">
                                  {variant.supplier?.code || variant.supplierSKU || '-'}
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
                  ))}
                </tbody>
              </table>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-gray-200 bg-gray-50 p-6 flex justify-between items-center">
          <div className="text-sm text-gray-500">
            {supplierProducts.length} product{supplierProducts.length !== 1 ? 's' : ''} linked to this supplier
            {supplierProducts.some(p => hasVariants(p)) && (
              <span className="ml-2">
                • {supplierProducts.reduce((total, product) => total + (product.variants?.length || 0), 0)} variant{supplierProducts.reduce((total, product) => total + (product.variants?.length || 0), 0) !== 1 ? 's' : ''}
              </span>
            )}
          </div>
          
          <div className="flex space-x-3">
            <button
              onClick={() => setcategorymodal(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Product
            </button>

            <button
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 bg-white text-gray-700 text-sm font-medium rounded-lg border border-gray-300 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Close
            </button>
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