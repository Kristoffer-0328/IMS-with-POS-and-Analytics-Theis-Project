import React, { useState, useEffect } from 'react';
import { FiX, FiPlus, FiTrash2, FiPackage, FiUser, FiCalendar, FiFileText, FiChevronLeft, FiAlertCircle, FiCheck } from 'react-icons/fi';
import { usePurchaseOrderServices } from '../../../../services/firebase/PurchaseOrderServices';
import { useServices } from '../../../../services/firebase/ProductServices';
import { useSupplierServices } from '../../../../services/firebase/SupplierServices';
import { useAuth } from '../../../auth/services/FirebaseAuth';
import { generatePurchaseOrderNotification } from '../../../../services/firebase/NotificationServices';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
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
  const [currentStep, setCurrentStep] = useState('supplier-selection');
  const [searchTerm, setSearchTerm] = useState('');

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const restockRequestsRef = collection(db, 'RestockingRequests');
        const q = query(restockRequestsRef, where('status', '==', 'pending'));
        const querySnapshot = await getDocs(q);
        const requests = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        setRestockRequests(requests);

        const supplierResult = await supplierServices.listSuppliers();
        if (supplierResult.success) {
          setSuppliers(supplierResult.data);
        }

        const unsubscribeProducts = listenToProducts((fetchedProducts) => {
          setProducts(fetchedProducts);
        const suppliersWithNeeds = findSuppliersWithRestockNeeds(fetchedProducts, requests);
        
        // Add total product count for each supplier
        suppliersWithNeeds.forEach(supplier => {
          const supplierCode = supplier.primaryCode || supplier.code;
          const totalProducts = fetchedProducts.filter(product => {
            const productSupplierCode = product.supplier?.primaryCode || product.supplier?.code;
            return productSupplierCode === supplierCode;
          }).length;
          supplier.totalProducts = totalProducts;
        });
        
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

  const findSuppliersWithRestockNeeds = (products, requests) => {
    const supplierMap = new Map();

    requests.forEach(request => {
      const product = products.find(p => 
        p.id === request.productId || 
        p.variants?.some(v => v.id === request.productId)
      );

      if (product && product.supplier) {
        const supplierName = typeof product.supplier.name === 'string' 
          ? product.supplier.name 
          : (typeof product.supplier.name === 'object' ? product.supplier.name?.name || 'Unknown Supplier' : 'Unknown Supplier');
        
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

  const handleSupplierSelect = (supplier) => {
    setSelectedSupplier(supplier);
    
    // Get all products from this supplier
    const supplierProducts = products.filter(product => {
      const productSupplierCode = product.supplier?.primaryCode || product.supplier?.code;
      const selectedSupplierCode = supplier.primaryCode || supplier.code;
      return productSupplierCode === selectedSupplierCode;
    }).map(product => {
      // Find if there's a restock request for this product
      const restockRequest = restockRequests.find(request => 
        request.productId === product.id || 
        product.variants?.some(v => v.id === request.productId)
      );
      
      // Check if product needs restocking based on restock level
      const needsRestocking = product.quantity < (product.restockLevel || 0);
      
      return {
        ...product,
        restockRequest,
        needsRestocking,
        suggestedQuantity: restockRequest ? restockRequest.suggestedOrderQuantity : 
                          needsRestocking ? Math.max(0, (product.restockLevel || 0) - product.quantity + 10) : 0
      };
    });

    setItems(supplierProducts.length > 0 ? 
      supplierProducts.filter(p => p.restockRequest).map(product => ({
        productId: product.id,
        productName: product.name,
        quantity: product.restockRequest.suggestedOrderQuantity || '',
        unitPrice: product.unitPrice || product.variants?.[0]?.unitPrice || '',
        total: 0,
        restockRequestId: product.restockRequest.id,
        currentQuantity: product.quantity,
        requestedQuantity: product.restockRequest.suggestedOrderQuantity,
        needsRestocking: product.needsRestocking
      })) : 
      [{ productId: '', quantity: '', unitPrice: '', total: 0 }]
    );
    
    // Store all supplier products for selection
    setSelectedSupplier(prev => ({ ...prev, allProducts: supplierProducts }));
    
    setCurrentStep('product-selection');
  };

  const handleBackToSupplierSelection = () => {
    setSelectedSupplier(null);
    setItems([{ productId: '', quantity: '', unitPrice: '', total: 0 }]);
    setCurrentStep('supplier-selection');
  };

  const calculateItemTotal = (item) => {
    return Number(item.quantity || 0) * Number(item.unitPrice || 0);
  };

  const totalAmount = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    if (field === 'productId') {
      const product = selectedSupplier.allProducts?.find(p => p.id === value);
      if (product) {
        newItems[index] = {
          ...newItems[index],
          productName: product.name,
          quantity: product.restockRequest ? product.restockRequest.suggestedOrderQuantity.toString() : 
                   product.needsRestocking ? product.suggestedQuantity.toString() : '',
          unitPrice: product.unitPrice || product.variants?.[0]?.unitPrice || 0,
          restockRequestId: product.restockRequest?.id || null,
          currentQuantity: product.quantity,
          requestedQuantity: product.restockRequest?.suggestedOrderQuantity || null,
          needsRestocking: product.needsRestocking,
          restockLevel: product.restockLevel
        };
      }
    }
    
    newItems[index].total = calculateItemTotal(newItems[index]);
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { productId: '', quantity: '', unitPrice: '', total: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
    setLoading(true);

    try {
      const supplierIdToUse = selectedSupplier.primaryCode || selectedSupplier.code;

      if (!supplierIdToUse) {
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

      const result = await poServices.createPurchaseOrder(poData);

      if (!result.success) {
        throw new Error(result.error);
      }

      // Generate notification for PO creation
      try {
        // Use the PO data that was just created, but add the generated fields
        const notificationData = {
          ...poData,
          id: result.id,
          poNumber: result.poNumber,
          status: 'draft'
        };
        await generatePurchaseOrderNotification(notificationData, currentUser, 'created');
      } catch (notificationError) {
        console.error('Failed to generate PO creation notification:', notificationError);
        // Don't fail the PO creation if notification fails
      }

      // Update restocking requests to mark them as processed
      try {
        const restockRequestsRef = collection(db, 'RestockingRequests');
        
        // Get all restock request IDs that were used in this PO
        const restockRequestIds = items
          .filter(item => item.restockRequestId)
          .map(item => item.restockRequestId);

        // Update each restocking request to mark it as processed
        for (const requestId of restockRequestIds) {
          const requestRef = doc(db, 'RestockingRequests', requestId);
          await updateDoc(requestRef, {
            status: 'processed',
            processedAt: new Date(),
            poId: result.id,
            poNumber: result.poNumber
          });
        }

      } catch (restockError) {
        console.error('Failed to update restocking requests:', restockError);
        // Don't fail the PO creation if restock request update fails
      }

      onSuccess();
    } catch (error) {
      console.error('Error creating PO:', error);
      alert('Failed to create purchase order: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredSuppliers = suppliersWithRestockNeeds.filter(supplier =>
    supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (supplier.primaryCode || supplier.code || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderSupplierSelection = () => (
    <div className="p-8">
      <div className="mb-8">
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">Select Supplier</h3>
        <p className="text-gray-600">
          Choose a supplier with products that need restocking
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search suppliers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>

      {filteredSuppliers.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-200 rounded-full mb-4">
            <FiPackage className="text-gray-400" size={36} />
          </div>
          <h4 className="text-xl font-medium text-gray-900 mb-2">No Suppliers Found</h4>
          <p className="text-gray-500">
            {searchTerm ? 'Try adjusting your search' : 'All products are adequately stocked'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredSuppliers.map((supplier) => (
            <button
              key={supplier.primaryCode || supplier.code}
              onClick={() => handleSupplierSelect(supplier)}
              className="group relative border-2 border-gray-200 rounded-2xl p-6 hover:border-blue-500 hover:shadow-lg transition-all duration-200 text-left bg-white"
            >
              {/* Badge */}
              <div className="absolute -top-3 -right-3 bg-gradient-to-br from-red-500 to-red-600 text-white px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg">
                {supplier.restockCount} pending
              </div>

              {/* Icon */}
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mb-4 group-hover:bg-blue-500 transition-colors">
                <FiUser className="text-blue-600 group-hover:text-white transition-colors" size={24} />
              </div>

              {/* Content */}
              <h4 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-1">
                {String(supplier.name || 'Unknown Supplier')}
              </h4>
              <p className="text-sm text-gray-500 mb-3">
                Code: <span className="font-medium text-gray-700">{String(supplier.primaryCode || supplier.code || 'N/A')}</span>
              </p>
              <div className="flex items-center text-sm text-gray-600 mb-4">
                <FiPackage size={16} className="mr-2" />
                <span>{supplier.totalProducts || supplier.products.length} total products • {supplier.restockCount} need restocking</span>
              </div>
              
              {/* Arrow */}
              <div className="flex items-center text-blue-600 font-medium text-sm group-hover:text-blue-700">
                <span>Create Purchase Order</span>
                <svg className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderProductSelection = () => (
    <div className="max-h-[80vh] overflow-y-auto">
      <div className="flex-1 overflow-y-auto p-8">
        {/* Header */}
        <div className="mb-8">
          <button
            type="button"
            onClick={handleBackToSupplierSelection}
            className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
          >
            <FiChevronLeft className="mr-1" />
            <span className="text-sm font-medium">Change Supplier</span>
          </button>
          
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100">
            <div className="flex items-center mb-2">
              <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center mr-3">
                <FiUser className="text-white" size={20} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {String(selectedSupplier.name || 'Unknown Supplier')}
                </h3>
                <p className="text-sm text-gray-600">
                  Supplier Code: {String(selectedSupplier.primaryCode || selectedSupplier.code || 'N/A')}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Delivery Date */}
        <div className="mb-8">
          <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
            <FiCalendar className="mr-2 text-gray-400" />
            Expected Delivery Date
          </label>
          <input
            type="date"
            required
            value={deliveryDate}
            onChange={(e) => setDeliveryDate(e.target.value)}
            className="w-full md:w-1/2 border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
            min={new Date().toISOString().split('T')[0]}
          />
        </div>

        {/* Items */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <FiPackage className="mr-2 text-gray-400" />
              Order Items
            </h3>
            <button
              type="button"
              onClick={addItem}
              className="inline-flex items-center px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors font-medium text-sm"
            >
              <FiPlus className="mr-2" size={18} />
              Add Item
            </button>
          </div>

          <div className="space-y-4">
            {items.map((item, index) => {
              const selectedProduct = selectedSupplier.allProducts?.find(p => p.id === item.productId);
              
              return (
                <div key={index} className="border-2 border-gray-200 rounded-xl p-5 bg-white hover:border-gray-300 transition-colors">
                  <div className="grid grid-cols-12 gap-4 items-start">
                    <div className="col-span-5">
                      <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Product</label>
                      <select
                        required
                        value={item.productId}
                        onChange={(e) => handleItemChange(index, 'productId', e.target.value)}
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                      >
                        <option value="">Select Product</option>
                        {selectedSupplier.allProducts?.filter(product => 
                          (product.restockRequest || product.needsRestocking) &&
                          !items.some((item, itemIndex) => itemIndex !== index && item.productId === product.id)
                        ).map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} (Stock: {product.quantity}, Level: {product.restockLevel || 0})
                            {product.restockRequest ? ' - Pending Request' : ' - Needs Restock'}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Quantity</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Supplier Price</label>
                      <input
                        type="number"
                        required
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => handleItemChange(index, 'unitPrice', e.target.value)}
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Total</label>
                      <div className="py-2.5 px-3 bg-gray-50 rounded-lg border-2 border-gray-200 font-semibold text-sm text-gray-900">
                        ₱{calculateItemTotal(item).toLocaleString()}
                      </div>
                    </div>
                    <div className="col-span-1 flex items-end justify-center">
                      {items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeItem(index)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2.5 rounded-lg transition-colors"
                        >
                          <FiTrash2 size={18} />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {selectedProduct && (
                    <div className={`mt-4 flex items-start gap-2 text-sm p-3 rounded-lg ${
                      selectedProduct.restockRequest ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                      selectedProduct.needsRestocking ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                      'bg-green-50 text-green-700 border border-green-200'
                    }`}>
                      <FiAlertCircle className="mt-0.5 flex-shrink-0" size={16} />
                      <span>
                        <strong>Stock Status:</strong> Current stock is {item.currentQuantity} units
                        {selectedProduct.restockLevel && ` (Restock level: ${selectedProduct.restockLevel})`}
                        {selectedProduct.restockRequest ? 
                          `. Pending restock request for ${item.requestedQuantity} units.` :
                          selectedProduct.needsRestocking ? 
                          '. Product is below restock level and may need ordering.' :
                          '. Product is adequately stocked.'
                        }
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Total Amount */}
          <div className="flex justify-end mt-6">
            <div className="bg-gradient-to-br from-green-500 to-emerald-600 text-white px-8 py-4 rounded-xl shadow-lg">
              <p className="text-sm font-medium mb-1 opacity-90">Total Amount</p>
              <p className="text-3xl font-bold">₱{totalAmount.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {/* Payment Terms */}
        <div className="mb-6">
          <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
            <FiFileText className="mr-2 text-gray-400" />
            Payment Terms
          </label>
          <textarea
            rows={3}
            value={paymentTerms}
            onChange={(e) => setPaymentTerms(e.target.value)}
            placeholder="e.g., Net 30, COD, 50% deposit with balance on delivery"
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
          />
        </div>

        {/* Notes */}
        <div className="mb-6">
          <label className="flex items-center text-sm font-semibold text-gray-700 mb-3">
            <FiFileText className="mr-2 text-gray-400" />
            Additional Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any special instructions or requirements..."
            rows={3}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
          />
        </div>
      </div>

      {/* Footer */}
      <div className="border-t bg-gray-50 px-8 py-5 flex justify-between items-center flex-shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="px-6 py-2.5 text-gray-700 hover:text-gray-900 font-medium transition-colors"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="inline-flex items-center bg-gradient-to-r from-blue-600 to-blue-700 text-white px-8 py-3 rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed font-semibold shadow-lg hover:shadow-xl transition-all"
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Creating...
            </>
          ) : (
            <>
              <FiCheck className="mr-2" size={20} />
              Create Purchase Order
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl w-full max-w-7xl max-h-[95vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center px-8 py-6 border-b bg-gradient-to-r from-gray-50 to-gray-100">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">
              {currentStep === 'supplier-selection' ? 'Create Purchase Order' : 'Purchase Order Details'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {currentStep === 'supplier-selection' ? 'Step 1: Select a supplier' : 'Step 2: Add order details'}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="text-gray-400 hover:text-gray-600 hover:bg-gray-200 p-2 rounded-lg transition-all"
          >
            <FiX size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {currentStep === 'supplier-selection' ? renderSupplierSelection() : renderProductSelection()}
        </div>
      </div>
    </div>
  );
};

export default CreatePOModal;
