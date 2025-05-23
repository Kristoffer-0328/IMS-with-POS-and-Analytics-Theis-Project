import React, { useState, useEffect } from 'react';
import { FiX, FiPlus, FiTrash2 } from 'react-icons/fi';
import { usePurchaseOrderServices } from '../../../../services/firebase/PurchaseOrderServices';
import { useServices } from '../../../../services/firebase/ProductServices';
import { useAuth } from '../../../auth/services/FirebaseAuth';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
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
          ,where('supplier.code', '==', supplier.code)
        );0
    
        const querySnapshot = await getDocs(q);
        const requests = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        // Set up products listener
        const unsubscribeProducts = listenToProducts((fetchedProducts) => {
          // Filter products to only those:
          // 1. With pending restock requests OR below restock level
          // 2. Belonging to the selected supplier
          const supplierProducts = fetchedProducts.filter(product => {
            // Check if product has a restock request
            const hasRestockRequest = requests.some(req => req.productId === product.id 
                && req.supplier.code === selectedSupplier.code
            );
            
            // Check if product is below restock level
            const isLowStock = product.restockLevel > 0 && product.quantity <= product.restockLevel;
            
            // Check if product belongs to the supplier (check all possible references)
            const isFromSupplier = 
              // Check main supplier references
              product.supplier?.code === selectedSupplier.code ||
              product.supplierCode === selectedSupplier.code ||
              product.supplier?.id === selectedSupplier.id ||
              product.supplierId === selectedSupplier.id ||
              // Check variant supplier references
              product.variants?.some(variant => 
                variant.supplier?.code === selectedSupplier.code ||
                variant.supplierCode === selectedSupplier.code ||
                variant.supplier?.id === selectedSupplier.id ||
                variant.supplierId === selectedSupplier.id
              );

            // Product should either have a restock request or be low in stock
            // AND must belong to the selected supplier
            return (hasRestockRequest || isLowStock) && isFromSupplier;
          });

          console.log('Filtered products:', {
            total: fetchedProducts.length,
            filtered: supplierProducts.length,
            supplier: selectedSupplier,
            products: supplierProducts
          });

          setLowStockProducts(supplierProducts);
          
          // Initialize items with the low stock products
          const initialItems = supplierProducts.map(product => {
            const request = requests.find(req => req.productId === product.id);
            const restockAmount = request?.requestedQuantity || 
              (product.maximumStockLevel ? product.maximumStockLevel - product.quantity : 0);

            return {
              productId: product.id,
              productName: product.name,
              quantity: restockAmount.toString(),
              unitPrice: product.variants?.[0]?.unitPrice || product.unitPrice || 0,
              total: 0,
              currentQuantity: product.quantity || 0,
              restockLevel: product.restockLevel || 0,
              maximumStockLevel: product.maximumStockLevel || 0,
              restockRequestId: request?.id
            };
          });
          
          setItems(initialItems);
        });

        return () => unsubscribeProducts();
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
        supplierId: selectedSupplier.code,
        supplierName: selectedSupplier.name,
        items: items.map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          total: calculateItemTotal(item),
          restockRequestId: item.restockRequestId
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
          <h2 className="text-xl font-semibold">Create Purchase Order</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-129px)]">
          {/* Supplier Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-medium mb-4">Select Supplier</h3>
            <SupplierSelector
              onSelect={setSelectedSupplier}
              selectedSupplierId={selectedSupplier?.id}
            />
          </div>

          {selectedSupplier && (
            <>
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

                {/* Payment Terms */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Terms
                  </label>
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    placeholder="e.g., Net 30, COD"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              {/* Low Stock Items */}
              <div className="mb-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium">Low Stock Items from {selectedSupplier.name}</h3>
                </div>

                <div className="space-y-4">
                  {items.map((item, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex gap-4 items-start">
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{item.productName}</div>
                          <div className="text-sm text-gray-500">
                            Current Stock: {item.currentQuantity} 
                            {item.restockLevel > 0 && ` (Restock Level: ${item.restockLevel})`}
                            {item.maximumStockLevel > 0 && ` (Max Level: ${item.maximumStockLevel})`}
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
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-600 hover:text-red-800 p-2"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                  ))}

                  {items.length === 0 && selectedSupplier && (
                    <div className="text-center py-8 text-gray-500">
                      No low stock items found for this supplier
                    </div>
                  )}
                </div>

                <div className="flex justify-end mt-4">
                  <div className="w-48 py-2 px-3 bg-green-50 rounded-lg text-right font-medium">
                    Total: ₱{totalAmount.toLocaleString()}
                  </div>
                </div>
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
                  className="w-full border rounded-lg px-3 py-2 h-24"
                />
              </div>

              {/* Submit Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={loading || items.length === 0}
                  className={`px-6 py-2.5 rounded-lg text-white font-medium ${
                    loading || items.length === 0
                      ? 'bg-gray-400 cursor-not-allowed'
                      : 'bg-blue-600 hover:bg-blue-700'
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