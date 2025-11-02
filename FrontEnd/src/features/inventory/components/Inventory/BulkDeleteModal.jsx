import React, { useState } from 'react';
import { FiTrash2, FiPackage, FiX } from 'react-icons/fi';
import { getFirestore, doc, deleteDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import app from '../../../../FirebaseConfig';

const BulkDeleteModal = ({ isOpen, onClose, selectedProducts, products, onDeleteComplete }) => {
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const db = getFirestore(app);

  if (!isOpen) return null;

  // Get selected product details
  const selectedProductDetails = products.filter(product =>
    selectedProducts.includes(product.id)
  );

  // Calculate total suppliers affected
  const totalSuppliers = selectedProductDetails.reduce((total, product) => {
    if (product.suppliers && Array.isArray(product.suppliers)) {
      return total + product.suppliers.length;
    }
    return total;
  }, 0);

  const handleBulkDelete = async () => {
    if (deleteConfirmText !== 'DELETE') return;

    setIsDeleting(true);
    try {
      const batch = writeBatch(db);
      let deletedCount = 0;

      for (const productId of selectedProducts) {
        const product = products.find(p => p.id === productId);
        if (!product) {
          console.warn(`Product ${productId} not found in product list`);
          continue;
        }

        // Delete supplier connections first
        if (product.suppliers && Array.isArray(product.suppliers) && product.suppliers.length > 0) {
          for (const supplier of product.suppliers) {
            try {
              // Query for supplier-product link documents in Suppliers collection
              const supplierProductsRef = collection(db, 'Suppliers', supplier.id, 'products');
              const linkQuery = query(supplierProductsRef, where('productId', '==', productId));
              const linkSnapshot = await getDocs(linkQuery);

              // Delete all matching link documents
              linkSnapshot.forEach((linkDoc) => {
                batch.delete(linkDoc.ref);
                console.log(`Queued deletion of supplier link: ${supplier.name} -> ${product.name}`);
              });
            } catch (error) {
              console.error(`Error queuing supplier links deletion for product ${productId}:`, error);
            }
          }
        }

        // Delete all product instances across all locations
        if (product.locations && Array.isArray(product.locations) && product.locations.length > 0) {
          // Product exists in multiple locations - delete all instances
          for (const location of product.locations) {
            const storageLocation = location.storageLocation;
            const locationProductId = location.id;
            
            if (!storageLocation || !locationProductId) {
              console.warn(`Missing storage location or ID for product location:`, location);
              continue;
            }

            const productRef = doc(db, 'Products', storageLocation, 'products', locationProductId);
            batch.delete(productRef);
            deletedCount++;
            console.log(`Queued deletion: ${storageLocation}/products/${locationProductId}`);
          }
        } else if (product.storageLocation) {
          // Single location product - delete using direct storage location
          const productRef = doc(db, 'Products', product.storageLocation, 'products', productId);
          batch.delete(productRef);
          deletedCount++;
          console.log(`Queued deletion: ${product.storageLocation}/products/${productId}`);
        } else {
          console.warn(`Product ${productId} (${product.name}) has no storage location information, skipping...`);
        }
      }

      // Commit all deletions
      if (deletedCount > 0) {
        await batch.commit();
        console.log(`✅ Successfully deleted ${deletedCount} product instance(s)`);
      } else {
        console.warn('No products were deleted - check storage location data');
      }

      onDeleteComplete();
    } catch (error) {
      console.error('Error during bulk delete:', error);
      alert('❌ An error occurred during deletion: ' + error.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => !isDeleting && onClose()}></div>
      <div className="min-h-screen px-4 py-8 flex items-center justify-center">
        <div className="relative bg-white w-full max-w-2xl rounded-2xl shadow-2xl overflow-hidden animate-scaleUp">
          {/* Header */}
          <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <FiTrash2 className="text-white" size={20} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Bulk Delete Products</h2>
                <p className="text-xs text-red-100">This action cannot be undone</p>
              </div>
            </div>
            {!isDeleting && (
              <button
                onClick={onClose}
                className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              >
                <FiX size={20} />
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
                  <h3 className="text-sm font-bold text-red-800 mb-1">Warning: Permanent Bulk Deletion</h3>
                  <p className="text-xs text-red-700">
                    You are about to delete {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''}.
                    This will permanently remove all selected products, their supplier connections, and all associated data.
                    This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            {/* Products List */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200 max-h-60 overflow-y-auto">
              <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <FiPackage size={14} />
                Products to be deleted ({selectedProductDetails.length})
              </h4>
              <div className="space-y-2">
                {selectedProductDetails.map((product) => (
                  <div key={product.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3">
                    <div className="flex-1">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      <div className="text-xs text-gray-500">
                        {product.category} • {product.quantity} {product.unit || 'units'}
                        {product.suppliers && product.suppliers.length > 0 && (
                          <span className="ml-2">• {product.suppliers.length} supplier{product.suppliers.length !== 1 ? 's' : ''}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-gray-400">
                      ID: {product.id.slice(-8)}...
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-blue-50 rounded-lg p-4 mb-6 border border-blue-200">
              <h4 className="text-sm font-semibold text-blue-700 mb-3">Deletion Summary</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-blue-600">Products to delete:</span>
                  <div className="font-medium text-gray-900">{selectedProducts.length}</div>
                </div>
                <div>
                  <span className="text-blue-600">Supplier connections:</span>
                  <div className="font-medium text-gray-900">{totalSuppliers}</div>
                </div>
              </div>
            </div>

            {/* Action Items */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">This action will:</h4>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-red-500 mt-0.5">✕</span>
                  <span>Permanently delete {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} from inventory</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-red-500 mt-0.5">✕</span>
                  <span>Remove {totalSuppliers} supplier connection{totalSuppliers !== 1 ? 's' : ''}</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-red-500 mt-0.5">✕</span>
                  <span>Remove products from all supplier records</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-700">
                  <span className="text-red-500 mt-0.5">✕</span>
                  <span>Delete all product images and associated data</span>
                </li>
              </ul>
            </div>

            {/* Confirmation Input */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type <span className="font-bold text-red-600">DELETE</span> to confirm bulk deletion:
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
                onClick={onClose}
                disabled={isDeleting}
                className="flex-1 px-4 py-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
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
                    Delete {selectedProducts.length} Product{selectedProducts.length !== 1 ? 's' : ''}
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

export default BulkDeleteModal;