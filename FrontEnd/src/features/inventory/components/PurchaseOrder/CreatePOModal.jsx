import React, { useState, useEffect } from 'react';
import { FiX, FiPlus, FiTrash2, FiPackage, FiUser } from 'react-icons/fi';
import { usePurchaseOrderServices } from '../../../../services/firebase/PurchaseOrderServices';
import { useServices } from '../../../../services/firebase/ProductServices';
import { useSupplierServices } from '../../../../services/firebase/SupplierServices';
import { useAuth } from '../../../auth/services/FirebaseAuth';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import app from '../../../../FirebaseConfig';

const CreatePOModal = ({ onClose, onSuccess }) => {
  const { currentUser } = useAuth();
  const poServices = usePurchaseOrderServices();
  const { listenToProducts } = useServices();
  const supplierServices = useSupplierServices();
  const db = getFirestore(app);

  // State
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [restockRequests, setRestockRequests] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [suppliersWithRestockNeeds, setSuppliersWithRestockNeeds] = useState([]);
  const [items, setItems] = useState([]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [currentStep, setCurrentStep] = useState('supplier-selection'); // 'supplier-selection' or 'product-selection'

  // Load data on component mount
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

        // Load suppliers
        const supplierResult = await supplierServices.listSuppliers();
        if (supplierResult.success) {
          setSuppliers(supplierResult.data);
        }

        // Set up products listener
        const unsubscribeProducts = listenToProducts((fetchedProducts) => {
          setProducts(fetchedProducts);
          
          // Find suppliers who have products that need restocking
          const suppliersWithNeeds = findSuppliersWithRestockNeeds(fetchedProducts, requests);
          setSuppliersWithRestockNeeds(suppliersWithNeeds);
        });

        return () => unsubscribeProducts();
      } catch (error) {
        console.error('Error loading data:', error);
        alert('Failed to load data: ' + error.message);
      }
    };

    loadData();
  }, []);

  // Find suppliers who have products that need restocking
  const findSuppliersWithRestockNeeds = (products, requests) => {
    const supplierMap = new Map();

    requests.forEach(request => {
      // Find the product for this request
      const product = products.find(p => 
        p.id === request.productId || 
        p.variants?.some(v => v.id === request.productId)
      );

      if (product && product.supplier) {
        console.log('Product supplier structure:', product.supplier);
        
        // Properly extract supplier name (handle both string and object cases)
        const supplierName = typeof product.supplier.name === 'string' 
          ? product.supplier.name 
          : (typeof product.supplier.name === 'object' ? product.supplier.name?.name || 'Unknown Supplier' : 'Unknown Supplier');
        
        // Create a fallback supplier ID if both code and primaryCode are missing
        const fallbackId = supplierName.replace(/\s+/g, '_').toLowerCase() + '_' + Date.now();
        const supplierKey = product.supplier.primaryCode || product.supplier.code || fallbackId;
        
        if (!supplierMap.has(supplierKey)) {
          supplierMap.set(supplierKey, {
            code: product.supplier.code || fallbackId,
            primaryCode: product.supplier.primaryCode || fallbackId,
            name: supplierName,
            restockCount: 0,
            products: []
          });
          console.log('Created supplier map entry:', supplierMap.get(supplierKey));
        }
        
        const supplierData = supplierMap.get(supplierKey);
        supplierData.restockCount++;
        supplierData.products.push({
          ...product,
          restockRequest: request
        });
      }
    });

    return Array.from(supplierMap.values());
  };

  // Handle supplier selection
  const handleSupplierSelect = (supplier) => {
    setSelectedSupplier(supplier);
    
    // Auto-populate items with products that need restocking from this supplier
    const supplierProducts = supplier.products.map(product => ({
      productId: product.id,
      productName: product.name,
      quantity: product.restockRequest.requestedQuantity || '',
      unitPrice: product.unitPrice || product.variants?.[0]?.unitPrice || '',
      total: 0,
      restockRequestId: product.restockRequest.id,
      currentQuantity: product.restockRequest.currentQuantity,
      requestedQuantity: product.restockRequest.requestedQuantity
    }));

    setItems(supplierProducts.length > 0 ? supplierProducts : [{ productId: '', quantity: '', unitPrice: '', total: 0 }]);
    setCurrentStep('product-selection');
  };

  // Go back to supplier selection
  const handleBackToSupplierSelection = () => {
    setSelectedSupplier(null);
    setItems([{ productId: '', quantity: '', unitPrice: '', total: 0 }]);
    setCurrentStep('supplier-selection');
  };

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
      const product = selectedSupplier.products.find(p => p.id === value);
      if (product) {
        newItems[index] = {
          ...newItems[index],
          productName: product.name,
          quantity: product.restockRequest.requestedQuantity.toString(),
          unitPrice: product.unitPrice || product.variants?.[0]?.unitPrice || 0,
          restockRequestId: product.restockRequest.id,
          currentQuantity: product.restockRequest.currentQuantity,
          requestedQuantity: product.restockRequest.requestedQuantity
        };
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
      // Debug logging to see what we have
      console.log('Selected supplier object:', selectedSupplier);
      console.log('Selected supplier keys:', Object.keys(selectedSupplier || {}));
      
      // Ensure we have a valid supplier ID
      const supplierIdToUse = selectedSupplier.primaryCode || selectedSupplier.code;
      console.log('Supplier ID to use:', supplierIdToUse);
      
      if (!supplierIdToUse) {
        console.error('No supplier ID found in:', selectedSupplier);
        throw new Error('Supplier ID (primaryCode or code) is missing');
      }

      const poData = {
        supplierId: String(supplierIdToUse),
        supplierName: String(selectedSupplier.name || 'Unknown Supplier'),
        items: items.filter(item => item.productId).map(item => ({
          productId: item.productId,
          productName: item.productName,
          quantity: Number(item.quantity),
          unitPrice: Number(item.unitPrice),
          total: calculateItemTotal(item),
          restockRequestId: item.restockRequestId
        })),
        totalAmount,
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
      
      if (!result.success) {
        throw new Error(result.error);
      }

      onSuccess();
    } catch (error) {
      console.error('Error creating PO:', error);
      alert('Failed to create purchase order: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  // Render supplier selection step
  const renderSupplierSelection = () => (
    <div className="p-6">
      <div className="mb-6">
        <h3 className="text-lg font-medium mb-4">Select Supplier with Restock Needs</h3>
        <p className="text-sm text-gray-600 mb-4">
          Choose a supplier who has products that need restocking:
        </p>
      </div>

      {suppliersWithRestockNeeds.length === 0 ? (
        <div className="text-center py-8">
          <FiPackage className="mx-auto text-gray-300 mb-4" size={48} />
          <p className="text-gray-500 text-lg">No suppliers with restock needs found</p>
          <p className="text-gray-400 text-sm">All products are adequately stocked</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {suppliersWithRestockNeeds.map((supplier) => (
            <div
              key={supplier.primaryCode || supplier.code}
              onClick={() => handleSupplierSelect(supplier)}
              className="border rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 cursor-pointer transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center">
                  <FiUser className="text-blue-500 mr-2" size={20} />
                  <h4 className="font-medium text-gray-900">{String(supplier.name || 'Unknown Supplier')}</h4>
                </div>
                <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs font-medium">
                  {supplier.restockCount} items
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">Code: {String(supplier.primaryCode || supplier.code || 'N/A')}</p>
              <p className="text-sm text-gray-500">
                Products needing restock: {supplier.products.length}
              </p>
              <div className="mt-3">
                <button className="text-blue-600 text-sm font-medium hover:text-blue-800">
                  Create Purchase Order →
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // Render product selection and PO creation step
  const renderProductSelection = () => (
    <form onSubmit={handleSubmit} className="p-6 overflow-y-auto max-h-[calc(90vh-129px)]">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-medium">Create Purchase Order</h3>
            <p className="text-sm text-gray-600">Supplier: {String(selectedSupplier.name || 'Unknown Supplier')} ({String(selectedSupplier.primaryCode || selectedSupplier.code || 'N/A')})</p>
          </div>
          <button
            type="button"
            onClick={handleBackToSupplierSelection}
            className="text-blue-600 hover:text-blue-800 text-sm"
          >
            ← Change Supplier
          </button>
        </div>
      </div>

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
            const selectedProduct = selectedSupplier.products.find(p => p.id === item.productId);
            
            return (
              <div key={index} className="border rounded-lg p-4 bg-gray-50">
                <div className="grid grid-cols-12 gap-4 items-start">
                  <div className="col-span-5">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
                    <select
                      required
                      value={item.productId}
                      onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="">Select Product</option>
                      {selectedSupplier.products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} (Current: {product.restockRequest.currentQuantity}, Need: {product.restockRequest.requestedQuantity})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Quantity</label>
                    <input
                      type="number"
                      required
                      min="1"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Unit Price</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="0.01"
                      value={item.unitPrice}
                      onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
                    <div className="py-2 px-3 bg-white rounded-lg border">
                      ₱{calculateItemTotal(item).toLocaleString()}
                    </div>
                  </div>
                  <div className="col-span-1 flex items-end">
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
                </div>
                
                {selectedProduct && (
                  <div className="mt-3 text-sm text-gray-600">
                    <p><strong>Restock Details:</strong> Current stock: {item.currentQuantity}, Requested: {item.requestedQuantity}</p>
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
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-semibold">
            {currentStep === 'supplier-selection' ? 'Create Purchase Order - Select Supplier' : 'Create Purchase Order'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">
            <FiX size={24} />
          </button>
        </div>

        {currentStep === 'supplier-selection' ? renderSupplierSelection() : renderProductSelection()}
      </div>
    </div>
  );
};

export default CreatePOModal; 