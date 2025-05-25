import React, { useState, useEffect } from 'react';
import { FiX, FiPlus, FiTrash2 } from 'react-icons/fi';
import { usePurchaseOrderServices } from '../../../../services/firebase/PurchaseOrderServices';
import { useServices } from '../../../../services/firebase/ProductServices';
import { useAuth } from '../../../auth/services/FirebaseAuth';
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import app from '../../../../FirebaseConfig';
import SupplierSelector from '../../Supplier/SupplierSelector';

const SupplierPOModal = ({ onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const poServices = usePurchaseOrderServices();
  const { listenToProducts } = useServices();
  const db = getFirestore(app);

  // State
  const [loading, setLoading] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [items, setItems] = useState([]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [availableSuppliers, setAvailableSuppliers] = useState([]);

  // Load only suppliers with pending restock requests
  useEffect(() => {
    const loadSuppliersWithPendingRequests = async () => {
      try {
        // 1. Get all pending restock requests
        const restockRequestsRef = collection(db, 'RestockRequests');
        const q = query(restockRequestsRef, where('status', '==', 'pending'));
        const querySnapshot = await getDocs(q);
        const requests = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        console.log('Found restock requests:', requests);

        // 2. Extract unique supplier codes - handle both primary codes and product codes
        const supplierCodes = new Set();
        requests.forEach(req => {
          // Check supplier primary code from the request
          if (req.supplierPrimaryCode) {
            supplierCodes.add(req.supplierPrimaryCode);
          }
          // Check legacy supplier code
          if (req.supplier?.code) {
            supplierCodes.add(req.supplier.code);
          }
          // Check product-specific supplier code
          if (req.supplierCode) {
            supplierCodes.add(req.supplierCode);
          }
          // Check legacy product supplier code
          if (req.supplier?.supplierCode) {
            supplierCodes.add(req.supplier.supplierCode);
          }
        });

        console.log('Extracted supplier codes:', Array.from(supplierCodes));

        // 3. Fetch suppliers that match either primary code or have matching product codes
        let suppliers = [];
        if (supplierCodes.size > 0) {
          const suppliersRef = collection(db, 'suppliers');
          const suppliersSnapshot = await getDocs(suppliersRef);
          
          suppliers = suppliersSnapshot.docs
            .map(doc => ({
              id: doc.id,
              ...doc.data()
            }))
            .filter(supplier => {
              // Check primary code (both new and legacy formats)
              if (supplierCodes.has(supplier.primaryCode) || supplierCodes.has(supplier.code)) {
                return true;
              }
              // Check product supplier codes
              if (supplier.supplierCodes && Array.isArray(supplier.supplierCodes)) {
                return supplier.supplierCodes.some(sc => supplierCodes.has(sc.code));
              }
              return false;
            });

          console.log('Matched suppliers:', suppliers);
        }

        setAvailableSuppliers(suppliers);
      } catch (error) {
        console.error('Error loading suppliers with pending requests:', error);
        setAvailableSuppliers([]);
      }
    };
    loadSuppliersWithPendingRequests();
  }, []);

  // Load low stock products for selected supplier
  useEffect(() => {
    if (!selectedSupplier) return;

    const loadData = async () => {
      try {
        // Load restock requests
        const restockRequestsRef = collection(db, 'RestockRequests');
        const q = query(
          restockRequestsRef,
          where('status', '==', 'pending')
        );
        const querySnapshot = await getDocs(q);
        const requests = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        console.log('All pending restock requests:', requests);

        // Filter requests for this supplier
        const supplierRequests = requests.filter(req => {
          console.log('Checking request:', {
            requestId: req.id,
            productName: req.productName,
            supplierPrimaryCode: req.supplierPrimaryCode,
            supplierCode: req.supplierCode,
            supplier: req.supplier,
            selectedSupplier: {
              id: selectedSupplier.id,
              primaryCode: selectedSupplier.primaryCode || selectedSupplier.code,
              registeredCodes: selectedSupplier.supplierCodes
            }
          });

          // First check if supplier IDs match (most reliable)
          if (selectedSupplier.id === req.supplier?.id) {
            console.log('Matched by supplier ID');
            return true;
          }

          // Then check primary codes
          const primaryCodeMatch = (selectedSupplier.primaryCode || selectedSupplier.code) === req.supplierPrimaryCode;
          
          // Then check if this supplier has registered the product code
          const productCodeMatch = selectedSupplier.supplierCodes?.some(sc => 
            sc.code === req.supplierCode
          );

          if (primaryCodeMatch) {
            console.log('Matched by primary supplier code:', {
              requestId: req.id,
              productName: req.productName,
              matchedCode: req.supplierPrimaryCode
            });
          }

          if (productCodeMatch) {
            console.log('Matched by product registration code:', {
              requestId: req.id,
              productName: req.productName,
              matchedCode: req.supplierCode,
              matchedProduct: selectedSupplier.supplierCodes.find(sc => 
                sc.code === req.supplierCode
              )
            });
          }

          return primaryCodeMatch || productCodeMatch;
        });

        console.log('Filtered requests for supplier:', {
          supplierName: selectedSupplier.name,
          supplierId: selectedSupplier.id,
          supplierPrimaryCode: selectedSupplier.primaryCode || selectedSupplier.code,
          totalRequests: requests.length,
          matchedRequests: supplierRequests.length,
          registeredProducts: selectedSupplier.supplierCodes || [],
          requests: supplierRequests.map(req => ({
            id: req.id,
            productName: req.productName,
            supplierPrimaryCode: req.supplierPrimaryCode,
            productCode: req.supplierCode,
            matchedByPrimary: (selectedSupplier.primaryCode || selectedSupplier.code) === req.supplierPrimaryCode,
            matchedByProduct: selectedSupplier.supplierCodes?.some(sc => 
              sc.code === req.supplierCode
            )
          }))
        });

        // Only fetch products referenced in the filtered restock requests
        const productIds = supplierRequests.map(req => req.productId).filter(Boolean);
        let supplierProducts = [];
        
        if (productIds.length > 0) {
          try {
            // For each product ID, determine its category and fetch from the correct subcollection
            const productPromises = productIds.map(async productId => {
              // Extract category from product ID (e.g., "Electrical-Philips-LED_Bulb" -> "Electrical")
              const category = productId.split('-')[0];
              const productRef = doc(db, 'Products', category, 'Items', productId);
              const productDoc = await getDoc(productRef);
              
              if (productDoc.exists()) {
                return {
                  id: productDoc.id,
                  ...productDoc.data()
                };
              }
              return null;
            });

            // Wait for all product fetches to complete
            const products = await Promise.all(productPromises);
            supplierProducts = products.filter(Boolean); // Remove any null results

            console.log('Found matching products:', {
              requestedIds: productIds,
              foundProducts: supplierProducts.map(p => ({
                id: p.id,
                name: p.name,
                supplier: p.supplier?.code,
                supplierCode: p.supplierCode
              }))
            });
          } catch (error) {
            console.error('Error fetching products:', error);
          }
        }

        // Map products to restock requests
        const filteredProducts = supplierProducts.map(product => {
          const request = supplierRequests.find(req => req.productId === product.id);
          const restockAmount = request?.requestedQuantity || 0;
          
          const mappedProduct = {
            productId: product.id,
            productName: product.name,
            quantity: restockAmount.toString(),
            unitPrice: product.variants?.[0]?.unitPrice || product.unitPrice || 0,
            total: 0,
            currentQuantity: product.quantity || 0,
            restockLevel: product.restockLevel || 0,
            maximumStockLevel: product.maximumStockLevel || 0,
            restockRequestId: request?.id,
            // Add supplier code information for verification
            supplierPrimaryCode: request?.supplierPrimaryCode || selectedSupplier.primaryCode,
            productSupplierCode: request?.supplierCode || product.supplierCode
          };

          console.log('Mapped product with restock data:', mappedProduct);
          return mappedProduct;
        });

        setLowStockProducts(filteredProducts);
        setItems(filteredProducts);
      } catch (error) {
        console.error('Error loading data:', error);
        alert('Failed to load data: ' + error.message);
      }
    };

    loadData();
  }, [selectedSupplier]);

  // Calculate totals
  const calculateItemTotal = (item) => {
    return Number(item.quantity || 0) * Number(item.unitPrice || 0);
  };

  const totalAmount = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);

  // Handle item changes
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    newItems[index].total = calculateItemTotal(newItems[index]);
    setItems(newItems);
  };

  // Remove item
  const removeItem = (index) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Submit PO
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSupplier) {
      alert('Please select a supplier first');
      return;
    }
    
    if (items.length === 0) {
      alert('Please add at least one item');
      return;
    }

    setLoading(true);

    try {
      const poData = {
        supplierId: selectedSupplier.id,
        supplierPrimaryCode: selectedSupplier.primaryCode,
        supplierName: selectedSupplier.name,
        items: items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          total: calculateItemTotal(item),
          restockRequestId: item.restockRequestId,
          supplierPrimaryCode: item.supplierPrimaryCode,
          productSupplierCode: item.productSupplierCode
        })),
        totalAmount: totalAmount,
        deliveryDate,
        paymentTerms,
        notes,
        createdBy: {
          id: currentUser?.uid || '',
          name: currentUser?.name || '',
          role: currentUser?.role || 'staff'
        }
      };

      const result = await poServices.createPurchaseOrder(poData);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to create purchase order');
      }

      onSuccess();
    } catch (error) {
      console.error('Error creating PO:', error);
      alert('Failed to create purchase order: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-800">Create Purchase Order</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-129px)]">
          {/* Supplier Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4 text-gray-700">Select Supplier</h3>
            <SupplierSelector
              onSelect={setSelectedSupplier}
              selectedSupplierId={selectedSupplier?.id}
              suppliers={availableSuppliers}
            />
          </div>

          {selectedSupplier && (
            <>
              <div className="grid grid-cols-2 gap-6 mb-6">
                {/* Delivery Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Expected Delivery Date
                  </label>
                  <input
                    type="date"
                    required
                    value={deliveryDate}
                    onChange={(e) => setDeliveryDate(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
              </div>

              {/* Low Stock Items */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-700">Low Stock Items from {selectedSupplier.name}</h3>
                </div>

                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                  <div className="space-y-4">
                    {items.map((item, index) => (
                      <div key={index} className="bg-white rounded-lg p-4 shadow-sm">
                        <div className="flex gap-4 items-start">
                          <div className="flex-1">
                            <div className="text-base font-medium text-gray-900">{item.productName}</div>
                            <div className="text-sm text-gray-500 mt-1">
                              Current Stock: {item.currentQuantity} 
                              {item.restockLevel > 0 && ` • Restock Level: ${item.restockLevel}`}
                              {item.maximumStockLevel > 0 && ` • Max Level: ${item.maximumStockLevel}`}
                            </div>
                          </div>
                          <div className="w-24">
                            <input
                              type="number"
                              required
                              min="1"
                              placeholder="Qty"
                              value={item.quantity}
                              onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div className="w-32">
                            <input
                              type="number"
                              required
                              min="0"
                              step="0.01"
                              placeholder="Unit Price"
                              value={item.unitPrice}
                              onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div className="w-32 py-2 px-3 bg-gray-50 rounded-lg font-medium text-gray-900">
                            ₱{calculateItemTotal(item).toLocaleString()}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeItem(index)}
                            className="text-red-600 hover:text-red-800 p-2 rounded-lg hover:bg-red-50"
                          >
                            <FiTrash2 size={20} />
                          </button>
                        </div>
                      </div>
                    ))}

                    {items.length === 0 && selectedSupplier && (
                      <div className="text-center py-8 text-gray-500 bg-white rounded-lg">
                        No low stock items found for this supplier
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end mt-6">
                    <div className="bg-green-50 rounded-lg px-6 py-3 text-right">
                      <span className="text-sm text-gray-600">Total Amount</span>
                      <div className="text-xl font-semibold text-gray-900">₱{totalAmount.toLocaleString()}</div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Payment Terms */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Terms
                </label>
                <textarea
                  value={paymentTerms}
                  onChange={(e) => setPaymentTerms(e.target.value)}
                  placeholder="e.g., Net 30, COD, or detailed payment instructions..."
                  className="w-full border rounded-lg px-4 py-3 h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Notes */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Additional notes or instructions..."
                  className="w-full border rounded-lg px-4 py-3 h-24 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end pt-4 border-t">
                <button
                  type="submit"
                  disabled={loading || items.length === 0}
                  className={`px-6 py-2.5 rounded-lg text-white font-medium transition-colors ${
                    loading || items.length === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700 focus:ring-4 focus:ring-blue-200'
                  }`}
                >
                  {loading ? 'Creating...' : 'Create Purchase Order'}
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
};

export default SupplierPOModal; 