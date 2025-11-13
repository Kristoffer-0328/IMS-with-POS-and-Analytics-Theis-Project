import React, { useState, useEffect } from 'react';
import { FiX, FiPlus, FiTrash2, FiPackage, FiUser, FiCalendar, FiFileText, FiChevronLeft, FiAlertCircle, FiCheck } from 'react-icons/fi';
import { usePurchaseOrderServices } from '../../../../services/firebase/PurchaseOrderServices';
import { useServices } from '../../../../services/firebase/ProductServices';
import { useSupplierServices } from '../../../../services/firebase/SupplierServices';
import { useAuth } from '../../../auth/services/FirebaseAuth';
import { generatePurchaseOrderNotification } from '../../../../services/firebase/NotificationServices';
import { getFirestore, collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import app from '../../../../FirebaseConfig';

const CreatePOModal = ({ onClose, onSuccess , }) => {
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
  const [productsNeedingRestock, setProductsNeedingRestock] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [selectedSupplierForProduct, setSelectedSupplierForProduct] = useState(null);
  const [items, setItems] = useState([]);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [notes, setNotes] = useState('');
  const [currentStep, setCurrentStep] = useState('product-selection');
  const [searchTerm, setSearchTerm] = useState('');

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const restockRequestsRef = collection(db, 'RestockingRequests');
        const q = query(restockRequestsRef, where("status", "in", ["pending", "resolved_safety_stock"]));
        const querySnapshot = await getDocs(q);
        const requests = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        console.log('Fetched restock requests:', requests);

        setRestockRequests(requests);

        const supplierResult = await supplierServices.listSuppliers();
        if (supplierResult.success) {
          setSuppliers(supplierResult.data);
        }

        // Fetch Master products to get supplier info
        const masterRef = collection(db, 'Master');
        const masterSnapshot = await getDocs(masterRef);
        const masterProducts = {};
        masterSnapshot.docs.forEach(doc => {
          masterProducts[doc.id] = {
            id: doc.id,
            ...doc.data()
          };
        });
        console.log('📦 Master products loaded:', Object.keys(masterProducts).length);

        const unsubscribeProducts = listenToProducts((fetchedProducts) => {
          console.log('📦 Products loaded:', fetchedProducts.length);
          
          // Enrich variants with supplier info from Master
          const enrichedProducts = fetchedProducts.map(variant => {
            const masterProduct = masterProducts[variant.parentProductId];
            return {
              ...variant,
              supplier: variant.supplier || masterProduct?.supplier || null,
              masterProductName: masterProduct?.name || null
            };
            
          });
         
          setProducts(enrichedProducts);
          
          // Find products that need restocking
          const productsWithRestockNeeds = findProductsNeedingRestock(enrichedProducts, requests, supplierResult.data || []);
          setProductsNeedingRestock(productsWithRestockNeeds);
          console.log('� Products needing restock:', productsWithRestockNeeds.length);
        });

        return () => unsubscribeProducts();
      } catch (error) {
        console.error('Error loading data:', error);
        alert('Failed to load data: ' + error.message);
      }
    };

    loadData();
  }, []);

  const findProductsNeedingRestock = (products, requests, allSuppliers) => {
    const productMap = new Map();

    console.log('🔍 Finding products needing restock:', {
      productsCount: products.length,
      requestsCount: requests.length,
      suppliersCount: allSuppliers.length
    });

    // Process each restock request
    requests.forEach(request => {
      const variant = products.find(v => 
        v.id === request.variantId ||
        v.id === request.productId ||
        v.parentProductId === request.productId ||
        (v.parentProductId && request.variantDetails && 
         v.size === request.variantDetails.size && 
         (v.unit === request.variantDetails.unit || v.baseUnit === request.variantDetails.unit))
      );

      if (variant) {
        const productKey = variant.id;
        
        if (!productMap.has(productKey)) {
          // Find all suppliers for this variant
          const variantSuppliers = findSuppliersForVariant(variant, allSuppliers);
          
          productMap.set(productKey, {
            id: variant.id,
            name: variant.variantName || variant.name || 'Unnamed Product',
            parentProductId: variant.parentProductId,
            masterProductName: variant.masterProductName,
            size: variant.size,
            unit: variant.unit || variant.baseUnit,
            currentQuantity: variant.quantity || 0,
            restockLevel: variant.restockLevel || variant.rop || 0,
            restockRequest: request,
            suggestedQuantity: request.suggestedQty,
            suppliers: variantSuppliers,
            needsRestocking: true
          });
        }
      }
    });

    // Also check for products below restock level without requests
    products.forEach(variant => {
      const needsRestocking = (variant.quantity || 0) < (variant.restockLevel || variant.rop || 0);
      const productKey = variant.id;
      
      if (needsRestocking && !productMap.has(productKey)) {
        const variantSuppliers = findSuppliersForVariant(variant, allSuppliers);
        
        if (variantSuppliers.length > 0) {
          const suggestedQty = Math.max(0, (variant.restockLevel || variant.rop || 0) - (variant.quantity || 0) + 10);
          
          productMap.set(productKey, {
            id: variant.id,
            name: variant.variantName || variant.name || 'Unnamed Product',
            parentProductId: variant.parentProductId,
            masterProductName: variant.masterProductName,
            size: variant.size,
            unit: variant.unit || variant.baseUnit,
            currentQuantity: variant.quantity || 0,
            restockLevel: variant.restockLevel || variant.rop || 0,
            restockRequest: null,
            suggestedQuantity: suggestedQty,
            suppliers: variantSuppliers,
            needsRestocking: true
          });
        }
      }
    });

    const result = Array.from(productMap.values());
    console.log('✅ Found products needing restock:', result.length, result);
    return result;
  };

  const findSuppliersForVariant = (variant, allSuppliers) => {
    const suppliers = [];
    
    // Check if variant has suppliers array (NEW structure from Firebase)
    if (variant.suppliers && Array.isArray(variant.suppliers) && variant.suppliers.length > 0) {
      variant.suppliers.forEach((sup) => {
        const supplierCode = sup.primaryCode || sup.code || sup.supplierId;
        const supplierName = sup.name || sup.supplierName;
        
        const supplier = allSuppliers.find(s => 
          (s.primaryCode === supplierCode) || (s.code === supplierCode) || (s.name === supplierName)
        );
        
        if (supplier && !suppliers.find(s => s.id === (supplier.primaryCode || supplier.code))) {
          suppliers.push({
            id: supplier.primaryCode || supplier.code,
            primaryCode: supplier.primaryCode || supplier.code,
            code: supplier.code,
            name: supplier.name,
            supplierPrice: sup.price || 0, // Price from supplier (what we buy at)
            contactInfo: supplier.contactInfo || supplier.email || supplier.phone || ''
          });
        }
      });
      
      return suppliers;
    }
    
    // Fallback: Get supplier from variant.supplier field (OLD structure)
    const variantSupplier = variant.supplier;
    
    if (!variantSupplier) return suppliers;

    // Handle different supplier formats
    if (typeof variantSupplier === 'string') {
      // Supplier is stored as a string (name)
      const supplier = allSuppliers.find(s => s.name === variantSupplier);
      if (supplier) {
        suppliers.push({
          id: supplier.primaryCode || supplier.code,
          primaryCode: supplier.primaryCode || supplier.code,
          code: supplier.code,
          name: supplier.name,
          supplierPrice: variant.supplierPrice || 0, // Use supplierPrice field
          contactInfo: supplier.contactInfo || supplier.email || supplier.phone || ''
        });
      }
    } else if (typeof variantSupplier === 'object' && variantSupplier) {
      // Supplier is stored as an object
      const supplierCode = variantSupplier.primaryCode || variantSupplier.code || variantSupplier.supplierId;
      const supplierName = variantSupplier.name || variantSupplier.supplierName;
      
      const supplier = allSuppliers.find(s => 
        (s.primaryCode === supplierCode) || (s.code === supplierCode) || (s.name === supplierName)
      );
      
      if (supplier) {
        suppliers.push({
          id: supplier.primaryCode || supplier.code,
          primaryCode: supplier.primaryCode || supplier.code,
          code: supplier.code,
          name: supplier.name,
          supplierPrice: variantSupplier.price || variant.supplierPrice || 0, // Get price from supplier object
          contactInfo: supplier.contactInfo || supplier.email || supplier.phone || ''
        });
      }
    }

    return suppliers;
  };

  const handleProductSelect = (product) => {
    console.log('📦 Product selected:', product);
    setSelectedProduct(product);
    setCurrentStep('supplier-selection');
  };

  const handleSupplierSelect = (supplier) => {
    console.log('🏢 Supplier selected for product:', supplier);
    setSelectedSupplierForProduct(supplier);
    
    // Initialize items with the selected product and supplier
    setItems([{
      productId: selectedProduct.id,
      productName: selectedProduct.name,
      quantity: selectedProduct.suggestedQuantity || '',
      unitPrice: supplier.supplierPrice || '',
      total: 0,
      restockRequestId: selectedProduct.restockRequest?.id || null,
      currentQuantity: selectedProduct.currentQuantity,
      requestedQuantity: selectedProduct.suggestedQuantity,
      needsRestocking: selectedProduct.needsRestocking,
      restockLevel: selectedProduct.restockLevel,
      supplierId: supplier.id,
      supplierName: supplier.name
    }]);
    
    setCurrentStep('order-details');
  };

  const handleBackToProductSelection = () => {
    setSelectedProduct(null);
    setSelectedSupplierForProduct(null);
    setItems([]);
    setCurrentStep('product-selection');
  };

  const handleBackToSupplierSelection = () => {
    setSelectedSupplierForProduct(null);
    setItems([]);
    setCurrentStep('supplier-selection');
  };

  const calculateItemTotal = (item) => {
    return Number(item.quantity || 0) * Number(item.unitPrice || 0);
  };

  const totalAmount = items.reduce((sum, item) => sum + calculateItemTotal(item), 0);

  const handleItemChange = (index, field, value) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Recalculate total for this item
    newItems[index].total = calculateItemTotal(newItems[index]);
    setItems(newItems);
  };

  const addItem = () => {
    // Find more products from the same supplier
    const currentSupplierId = selectedSupplierForProduct?.id;
    const availableProducts = productsNeedingRestock.filter(product => 
      product.suppliers.some(s => s.id === currentSupplierId) &&
      !items.some(item => item.productId === product.id)
    );

    if (availableProducts.length > 0) {
      setItems([...items, { 
        productId: '', 
        quantity: '', 
        unitPrice: '', 
        total: 0,
        supplierId: currentSupplierId,
        supplierName: selectedSupplierForProduct?.name
      }]);
    } else {
      alert('No more products available from this supplier that need restocking.');
    }
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
      const supplierIdToUse = selectedSupplierForProduct.primaryCode || selectedSupplierForProduct.code || selectedSupplierForProduct.id;

      if (!supplierIdToUse) {
        throw new Error('Supplier ID is missing');
      }

      const poData = {
        supplierId: String(supplierIdToUse),
        supplierName: String(selectedSupplierForProduct.name || 'Unknown Supplier'),
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
      const notificationData = {
        ...poData,
        id: result.id,
        poNumber: result.poNumber,
        status: 'draft'
      };
      generatePurchaseOrderNotification(notificationData, currentUser, 'created')
        .catch(notificationError => {
          console.error('Failed to generate PO creation notification:', notificationError);
        });
      
      try {
        const restockRequestsRef = collection(db, 'RestockingRequests');
        
        const restockRequestIds = items
          .filter(item => item.restockRequestId)
          .map(item => item.restockRequestId);

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
      }

      onSuccess();
    } catch (error) {
      console.error('Error creating PO:', error);
      alert('Failed to create purchase order: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = productsNeedingRestock.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.masterProductName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.size || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderProductSelectionStep = () => (
    <div className="p-8">
      <div className="mb-8">
        <h3 className="text-2xl font-semibold text-gray-900 mb-2">Products Needing Restock</h3>
        <p className="text-gray-600">
          Select a product to view available suppliers and pricing options
        </p>
      </div>

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search products..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
        />
      </div>

      {filteredProducts.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-200 rounded-full mb-4">
            <FiPackage className="text-gray-400" size={36} />
          </div>
          <h4 className="text-xl font-medium text-gray-900 mb-2">No Products Found</h4>
          <p className="text-gray-500">
            {searchTerm ? 'Try adjusting your search' : 'All products are adequately stocked'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProducts.map((product) => (
            <button
              key={product.id}
              onClick={() => handleProductSelect(product)}
              className="group relative border-2 border-gray-200 rounded-2xl p-6 hover:border-blue-500 hover:shadow-lg transition-all duration-200 text-left bg-white"
            >
              {/* Status Badge */}
              <div className={`absolute -top-3 -right-3 px-3 py-1.5 rounded-full text-xs font-semibold shadow-lg ${
                product.restockRequest 
                  ? 'bg-gradient-to-br from-red-500 to-red-600 text-white'
                  : 'bg-gradient-to-br from-yellow-500 to-yellow-600 text-white'
              }`}>
                {product.restockRequest ? 'Pending Request' : 'Below Level'}
              </div>

              {/* Icon */}
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mb-4 group-hover:bg-blue-500 transition-colors">
                <FiPackage className="text-blue-600 group-hover:text-white transition-colors" size={24} />
              </div>

              {/* Content */}
              <h4 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2">
                {product.name}
              </h4>
              {product.masterProductName && (
                <p className="text-xs text-gray-500 mb-2">
                  {product.masterProductName}
                </p>
              )}
              {product.size && (
                <p className="text-sm text-gray-600 mb-3">
                  Size: <span className="font-medium">{product.size} {product.unit}</span>
                </p>
              )}
              
              {/* Stock Info */}
              <div className="space-y-2 mb-4">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Current Stock:</span>
                  <span className="font-semibold text-gray-900">{product.currentQuantity}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Restock Level:</span>
                  <span className="font-semibold text-gray-900">{product.restockLevel}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Suggested Qty:</span>
                  <span className="font-semibold text-blue-600">{product.suggestedQuantity}</span>
                </div>
              </div>

              {/* Suppliers Count */}
              <div className="flex items-center text-sm text-gray-600 mb-4 pt-4 border-t">
                <FiUser size={16} className="mr-2" />
                <span>{product.suppliers.length} supplier{product.suppliers.length !== 1 ? 's' : ''} available</span>
              </div>
              
              {/* Arrow */}
              <div className="flex items-center text-blue-600 font-medium text-sm group-hover:text-blue-700">
                <span>View Suppliers</span>
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

  const renderSupplierSelectionStep = () => (
    <div className="p-8">
      <div className="mb-8">
        <button
          type="button"
          onClick={handleBackToProductSelection}
          className="inline-flex items-center text-gray-600 hover:text-gray-900 mb-4 transition-colors"
        >
          <FiChevronLeft className="mr-1" />
          <span className="text-sm font-medium">Back to Products</span>
        </button>
        
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-100 mb-6">
          <div className="flex items-start">
            <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
              <FiPackage className="text-white" size={24} />
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {selectedProduct?.name}
              </h3>
              {selectedProduct?.masterProductName && (
                <p className="text-sm text-gray-600 mb-2">{selectedProduct.masterProductName}</p>
              )}
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-gray-600">Current Stock:</span>
                  <span className="ml-2 font-semibold text-gray-900">{selectedProduct?.currentQuantity}</span>
                </div>
                <div>
                  <span className="text-gray-600">Restock Level:</span>
                  <span className="ml-2 font-semibold text-gray-900">{selectedProduct?.restockLevel}</span>
                </div>
                <div>
                  <span className="text-gray-600">Suggested:</span>
                  <span className="ml-2 font-semibold text-blue-600">{selectedProduct?.suggestedQuantity}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <h3 className="text-2xl font-semibold text-gray-900 mb-2">Select Supplier</h3>
        <p className="text-gray-600">
          Compare prices and choose the best supplier for this product
        </p>
      </div>

      {selectedProduct?.suppliers.length === 0 ? (
        <div className="text-center py-16 bg-gray-50 rounded-2xl">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gray-200 rounded-full mb-4">
            <FiUser className="text-gray-400" size={36} />
          </div>
          <h4 className="text-xl font-medium text-gray-900 mb-2">No Suppliers Available</h4>
          <p className="text-gray-500">
            This product doesn't have any suppliers assigned
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {selectedProduct?.suppliers.map((supplier) => (
            <button
              key={supplier.id}
              onClick={() => handleSupplierSelect(supplier)}
              className="group relative border-2 border-gray-200 rounded-2xl p-6 hover:border-green-500 hover:shadow-lg transition-all duration-200 text-left bg-white"
            >
              {/* Icon */}
              <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 rounded-xl mb-4 group-hover:bg-green-500 transition-colors">
                <FiUser className="text-green-600 group-hover:text-white transition-colors" size={24} />
              </div>

              {/* Content */}
              <h4 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-1">
                {supplier.name}
              </h4>
              <p className="text-sm text-gray-500 mb-4">
                Code: <span className="font-medium text-gray-700">{supplier.code || supplier.primaryCode || 'N/A'}</span>
              </p>

              {/* Price */}
              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 mb-4 border border-green-200">
                <p className="text-sm text-gray-600 mb-1">Supplier Price (Buy)</p>
                <p className="text-2xl font-bold text-green-700">₱{supplier.supplierPrice.toLocaleString()}</p>
                <p className="text-xs text-gray-500 mt-2">
                  Total for {selectedProduct?.suggestedQuantity} units: ₱{(supplier.supplierPrice * selectedProduct?.suggestedQuantity).toLocaleString()}
                </p>
              </div>

              {supplier.contactInfo && (
                <p className="text-xs text-gray-500 mb-4">
                  Contact: {supplier.contactInfo}
                </p>
              )}
              
              {/* Arrow */}
              <div className="flex items-center text-green-600 font-medium text-sm group-hover:text-green-700">
                <span>Select This Supplier</span>
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

  const renderOrderDetailsStep = () => (
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
          
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-100">
            <div className="flex items-start mb-4">
              <div className="w-10 h-10 bg-green-500 rounded-lg flex items-center justify-center mr-3">
                <FiUser className="text-white" size={20} />
              </div>
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedSupplierForProduct?.name || 'Unknown Supplier'}
                </h3>
                <p className="text-sm text-gray-600">
                  Supplier Code: {selectedSupplierForProduct?.code || selectedSupplierForProduct?.primaryCode || 'N/A'}
                </p>
              </div>
            </div>
            
            <div className="bg-white bg-opacity-60 rounded-lg p-4 border border-green-200">
              <div className="flex items-start">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center mr-3 flex-shrink-0">
                  <FiPackage className="text-blue-600" size={20} />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-gray-900 mb-1">{selectedProduct?.name}</p>
                  {selectedProduct?.masterProductName && (
                    <p className="text-xs text-gray-600 mb-2">{selectedProduct.masterProductName}</p>
                  )}
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-gray-600">Stock:</span>
                      <span className="ml-1 font-semibold">{selectedProduct?.currentQuantity}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Level:</span>
                      <span className="ml-1 font-semibold">{selectedProduct?.restockLevel}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Price:</span>
                      <span className="ml-1 font-semibold text-green-600">₱{selectedSupplierForProduct?.supplierPrice || 0}</span>
                    </div>
                  </div>
                </div>
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
              const availableProducts = productsNeedingRestock.filter(product => 
                product.suppliers.some(s => s.id === selectedSupplierForProduct?.id) &&
                !items.some((existingItem, existingIndex) => existingIndex !== index && existingItem.productId === product.id)
              );
              
              const currentProduct = productsNeedingRestock.find(p => p.id === item.productId);
              const supplierForProduct = currentProduct?.suppliers.find(s => s.id === selectedSupplierForProduct?.id);
              
              return (
                <div key={index} className="border-2 border-gray-200 rounded-xl p-5 bg-white hover:border-gray-300 transition-colors">
                  <div className="grid grid-cols-12 gap-4 items-start">
                    <div className="col-span-5">
                      <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Product</label>
                      <select
                        required
                        value={item.productId}
                        onChange={(e) => {
                          const productId = e.target.value;
                          const product = productsNeedingRestock.find(p => p.id === productId);
                          const supplier = product?.suppliers.find(s => s.id === selectedSupplierForProduct?.id);
                          
                          handleItemChange(index, 'productId', productId);
                          if (product && supplier) {
                            handleItemChange(index, 'productName', product.name);
                            handleItemChange(index, 'quantity', product.suggestedQuantity);
                            handleItemChange(index, 'unitPrice', supplier.supplierPrice);
                            handleItemChange(index, 'restockRequestId', product.restockRequest?.id || null);
                            handleItemChange(index, 'currentQuantity', product.currentQuantity);
                            handleItemChange(index, 'requestedQuantity', product.suggestedQuantity);
                            handleItemChange(index, 'needsRestocking', product.needsRestocking);
                            handleItemChange(index, 'restockLevel', product.restockLevel);
                          }
                        }}
                        className="w-full border-2 border-gray-200 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                      >
                        <option value="">Select Product</option>
                        {availableProducts.map((product) => (
                          <option key={product.id} value={product.id}>
                            {product.name} {product.size ? `(${product.size} ${product.unit})` : ''} - Stock: {product.currentQuantity}
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
                      <label className="block text-xs font-semibold text-gray-700 mb-2 uppercase tracking-wide">Unit Price</label>
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
                  
                  {currentProduct && (
                    <div className={`mt-4 flex items-start gap-2 text-sm p-3 rounded-lg ${
                      currentProduct.restockRequest ? 'bg-orange-50 text-orange-700 border border-orange-200' :
                      currentProduct.needsRestocking ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                      'bg-green-50 text-green-700 border border-green-200'
                    }`}>
                      <FiAlertCircle className="mt-0.5 flex-shrink-0" size={16} />
                      <span>
                        <strong>Stock Status:</strong> Current stock is {currentProduct.currentQuantity} units
                        {currentProduct.restockLevel && ` (Restock level: ${currentProduct.restockLevel})`}
                        {currentProduct.restockRequest ? 
                          `. Pending restock request for ${currentProduct.suggestedQuantity} units.` :
                          currentProduct.needsRestocking ? 
                          '. Product is below restock level.' :
                          '. Product is adequately stocked.'
                        }
                        {supplierForProduct && ` Supplier price from ${selectedSupplierForProduct?.name}: ₱${supplierForProduct.supplierPrice}`}
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
              {currentStep === 'product-selection' ? 'Create Purchase Order' : 
               currentStep === 'supplier-selection' ? 'Select Supplier' : 
               'Purchase Order Details'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {currentStep === 'product-selection' ? 'Step 1: Select a product that needs restocking' : 
               currentStep === 'supplier-selection' ? 'Step 2: Choose supplier and compare prices' : 
               'Step 3: Review and complete order details'}
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
          {currentStep === 'product-selection' && renderProductSelectionStep()}
          {currentStep === 'supplier-selection' && renderSupplierSelectionStep()}
          {currentStep === 'order-details' && renderOrderDetailsStep()}
        </div>
      </div>
    </div>
  );
};

export default CreatePOModal;
