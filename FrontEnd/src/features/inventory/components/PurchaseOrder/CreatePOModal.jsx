import React, { useState, useEffect } from 'react';
import { FiX, FiPlus, FiTrash2 } from 'react-icons/fi';
import { usePurchaseOrderServices } from '../../../../services/firebase/PurchaseOrderServices';
import { useServices } from '../../../../services/firebase/ProductServices';
import { useAuth } from '../../../auth/services/FirebaseAuth';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import app from '../../../../FirebaseConfig';

const CreatePOModal = ({ onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const poServices = usePurchaseOrderServices();
  const { listenToProducts } = useServices();
  const db = getFirestore(app);

  // State
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [restockRequests, setRestockRequests] = useState([]);
  const [items, setItems] = useState([{ productId: '', quantity: '', unitPrice: '', total: 0 }]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [notes, setNotes] = useState('');

  // Load products and restock requests
  useEffect(() => {
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
        console.log('Restock requests:', requests);
        setRestockRequests(requests);

        // Set up products listener
        const unsubscribeProducts = listenToProducts((fetchedProducts) => {
          // Filter products to only those with pending restock requests
          const productsWithRequests = fetchedProducts.filter(product => 
            requests.some(req => req.productId === product.id)
          );
          setProducts(productsWithRequests);
        });

        return () => unsubscribeProducts();
      } catch (error) {
        console.error('Error loading data:', error);
        alert('Failed to load data: ' + error.message);
      }
    };

    loadData();
  }, []);

  // Calculate totals
  const calculateItemTotal = (item) => {
    return Number(item.quantity || 0) * Number(item.unitPrice || 0);
  };

  const totalAmount = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);

  // Handle item changes
  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'productId') {
      const product = products.find(p => p.id === value); 
      if (product) {
        // Find the restock request for this product
        const restockRequest = restockRequests.find(req => req.productId === value);
        if (restockRequest) {
          newItems[index] = {
            ...newItems[index],
            productName: product.name,
            quantity: restockRequest.requestedQuantity.toString(),
            unitPrice: product.variants[0]?.unitPrice || 0,
            supplier: product.supplier || product.variants[0]?.supplier,
            total: 0 // Will be calculated below
          };
         
        }
      }
    }
    
    newItems[index].total = calculateItemTotal(newItems[index]);
    setItems(newItems);
    
  };

  // Add/Remove items
  const addItem = () => {
    setItems([...items, { productId: '', quantity: '', unitPrice: '', total: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  // Submit PO
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Group items by supplier
      const supplierGroups = items.reduce((groups, item) => {
        const product = products.find(p => p.id === item.productId);
        if (!product || !product.supplier) {
          throw new Error(`No supplier found for product: ${product?.name || item.productId}`);
        }

        const supplierId = product.supplier.code;
        if (!groups[supplierId]) {
          groups[supplierId] = {
            supplierId: product.supplier.code,
            supplierName: product.supplier.name,
            items: []
          };
        }
        groups[supplierId].items.push({
          productId: item.productId,
          productName: product.name,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          total: calculateItemTotal(item),
          restockRequestId: restockRequests.find(req => req.productId === item.productId)?.id
        });
        return groups;
      }, {});

      // Create a PO for each supplier
      const poPromises = Object.values(supplierGroups).map(async group => {
        const poData = {
          supplierId: group.supplierId,
          supplierName: group.supplierName,
          items: group.items,
          totalAmount: group.items.reduce((sum, item) => sum + item.total, 0),
          deliveryDate,
          paymentTerms,
          notes,
          createdBy: {
            id: currentUser?.uid || '',
            name: currentUser?.name || '',
            role: currentUser?.role || 'staff'
          }
        };
        console.log('Creating PO with data:', poData);
        const result = await poServices.createPurchaseOrder(poData);
        console.log('PO creation result:', result);
        return result;
      });

      const results = await Promise.all(poPromises);
      console.log('All PO creation results:', results);
      
      const failures = results.filter(result => !result.success);
      if (failures.length > 0) {
        console.error('Failed PO creations:', failures);
        throw new Error(`Failed to create ${failures.length} purchase orders. Errors: ${failures.map(f => f.error).join(', ')}`);
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
          <h2 className="text-xl font-semibold">Create Purchase Order</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-129px)]">
          <div className="grid grid-cols-2 gap-4 mb-6">
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
                className="w-full border rounded-lg px-3 py-2"
                min={new Date().toISOString().split('T')[0]}
              />
            </div>

            
          </div>

          {/* Items */}
          <div className="mb-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium">Order Items</h3>
              <h3 className="text-md font-medium"></h3>
              <h3 className="text-md font-medium"></h3>
              <h3 className="text-md font-medium"></h3>
              <h3 className="text-md font-medium"></h3>
              <h3 className="text-md font-medium"></h3>
              <h3 className="text-md font-medium"></h3>
              <h3 className="text-md font-medium"></h3>
              <h3 className="text-md font-medium">Quantity</h3>
              <h3 className="text-md font-medium">Unit Price</h3>
              
              <h3 className="text-md font-medium">Total</h3>
              <button
                type="button"
                onClick={addItem}
                className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <FiPlus /> Add Item
              </button>
            </div>

            <div className="space-y-4">
              {items.map((item, index) => {
                const selectedProduct = products.find(p => p.id === item.productId);
                const supplier = selectedProduct?.supplier || selectedProduct?.variants[0]?.supplier;
                
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex gap-4 items-start">
                      <div className="flex-1">
                        <select
                          required
                          value={item.productId}
                          onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                          className="w-full border rounded-lg px-3 py-2"
                        >
                          <option value="">Select Product</option>
                          {products.map((product) => {
                            const request = restockRequests.find(req => req.productId === product.id);
                            return (
                              <option key={product.id} value={product.id}>
                                {product.name} (Current: {request?.currentQuantity || 0}, Requested: {request?.requestedQuantity || 0})
                              </option>
                            );
                          })}
                        </select>
                      </div>
                      <div className="w-24">
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="Qty"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          className="w-full border rounded-lg px-3 py-2"
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
                          className="w-full border rounded-lg px-3 py-2"
                        />
                      </div>
                      <div className="w-32 py-2 px-3 bg-gray-50 rounded-lg">
                        ₱{calculateItemTotal(item).toLocaleString()}
                      </div>
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-800 p-2"
                        >
                          <FiTrash2 />
                        </button>
                      )}
                    </div>
                    {supplier && (
                      <div className="text-sm text-gray-600 pl-2">
                        Supplier: {supplier.name} ({supplier.code})
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end mt-4">
              <div className="w-48 py-2 px-3 bg-green-50 rounded-lg text-right font-medium">
                Total: ₱{totalAmount.toLocaleString()}
              </div>
            </div>
          </div>
          {/* Payment Terms */}
          <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Terms
              </label>
              <textarea
                type="text"
                rows={3}
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                placeholder="e.g., Net 30, COD"
                className="w-full border rounded-lg px-3 py-2"
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
              rows={3}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 hover:text-gray-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating...' : 'Create Purchase Order'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreatePOModal; 