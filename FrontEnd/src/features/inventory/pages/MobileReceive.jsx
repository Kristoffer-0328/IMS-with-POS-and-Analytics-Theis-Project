import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle, Clock, Upload, X, MapPin, User, Truck, FileText, Camera, ChevronLeft, ChevronRight } from 'lucide-react';

const MobileDeliveryReceipt = () => {
  const [deliveryData, setDeliveryData] = useState({
    drNumber: '',
    invoiceNumber: '',
    poNumber: '',
    supplierName: '',
    deliveryDateTime: '',
    driverName: '',
    truckNumber: '',
    receivedBy: '',
    projectSite: '',
    products: [
      {
        id: 'prod001',
        name: 'Cement Bags',
        sku: 'CBX-001',
        unit: 'bags',
        expectedQty: 10,
        acceptedQty: 0,
        rejectedQty: 0,
        photo: null,
        photoPreview: null,
        rejectionReason: '',
        status: 'pending',
        notes: '',
      },
      {
        id: 'prod002',
        name: 'Steel Rebar',
        sku: 'SRB-002',
        unit: 'pieces',
        expectedQty: 50,
        acceptedQty: 0,
        rejectedQty: 0,
        photo: null,
        photoPreview: null,
        rejectionReason: '',
        status: 'pending',
        notes: '',
      },
      {
        id: 'prod003',
        name: 'Concrete Blocks',
        sku: 'CBL-003',
        unit: 'pieces',
        expectedQty: 100,
        acceptedQty: 0,
        rejectedQty: 0,
        photo: null,
        photoPreview: null,
        rejectionReason: '',
        status: 'pending',
        notes: '',
      },
    ],
    supportingDocuments: [],
  });

  const [errors, setErrors] = useState({});
  const [currentStep, setCurrentStep] = useState(0);
  const [currentProductIndex, setCurrentProductIndex] = useState(0);
  const [showNotReceivedModal, setShowNotReceivedModal] = useState(false);
  const [notReceivedProductId, setNotReceivedProductId] = useState(null);
  const [notReceivedReason, setNotReceivedReason] = useState('');
  const [selectedProducts, setSelectedProducts] = useState([]);
  
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  
  const steps = ['List', 'Inspect', 'Info', 'Summary'];

  // Initialize all products as selected for inspection
  useEffect(() => {
    setSelectedProducts(deliveryData.products.map(p => p.id));
  }, []);

  // Handle case where current product is no longer selected (e.g., marked as not received)
  useEffect(() => {
    if (currentStep === 1 && selectedProducts.length > 0) {
      const selectedProductsForInspection = deliveryData.products.filter(p => selectedProducts.includes(p.id));
      
      // If current product index is out of bounds, reset to first available product
      if (currentProductIndex >= selectedProductsForInspection.length) {
        setCurrentProductIndex(0);
      }
      
      // If no products are selected for inspection, go back to step 0
      if (selectedProductsForInspection.length === 0) {
        setCurrentStep(0);
        setCurrentProductIndex(0);
      }
    }
  }, [selectedProducts, currentStep, currentProductIndex, deliveryData.products]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDeliveryData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleProductChange = (selectedIndex, field, value) => {
    const newProducts = [...deliveryData.products];
    
    // Find the actual product in the full array using the selected product's ID
    const selectedProductsForInspection = deliveryData.products.filter(p => selectedProducts.includes(p.id));
    const currentProduct = selectedProductsForInspection[selectedIndex];
    if (!currentProduct) return;
    
    const actualIndex = newProducts.findIndex(p => p.id === currentProduct.id);
    if (actualIndex === -1) return;
    
    // Handle quantity fields specially to allow empty string during typing
    if (field === 'acceptedQty' || field === 'rejectedQty') {
      // Allow empty string or valid numbers
      if (value === '' || (!isNaN(value) && value >= 0)) {
        newProducts[actualIndex][field] = value === '' ? '' : parseInt(value) || 0;
      } else {
        return; // Don't update if invalid value
      }
    } else {
      newProducts[actualIndex][field] = value;
    }
    
    if (field === 'photo' && !value) {
      newProducts[actualIndex].photoPreview = null;
    }
    
    // Auto-update status when quantities change
    if (field === 'acceptedQty' || field === 'rejectedQty') {
      const accepted = field === 'acceptedQty' ? (newProducts[actualIndex].acceptedQty || 0) : newProducts[actualIndex].acceptedQty;
      const rejected = field === 'rejectedQty' ? (newProducts[actualIndex].rejectedQty || 0) : newProducts[actualIndex].rejectedQty;
      
      if (accepted > 0 || rejected > 0) {
        newProducts[actualIndex].status = 'received';
      }
    }
    
    setDeliveryData(prevData => ({
      ...prevData,
      products: newProducts
    }));
  };

  const handlePhotoUpload = (selectedIndex, event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('Please select an image file');
        return;
      }
      
      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        alert('File size must be less than 10MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        handleProductChange(selectedIndex, 'photo', file);
        handleProductChange(selectedIndex, 'photoPreview', reader.result);
      };
      reader.onerror = () => {
        alert('Error reading file. Please try again.');
      };
      reader.readAsDataURL(file);
    }
    
    // Reset the input value to allow selecting the same file again if needed
    event.target.value = '';
  };

  const handleNotReceivedClick = (productId) => {
    setNotReceivedProductId(productId);
    setShowNotReceivedModal(true);
  };

  const submitNotReceived = () => {
    if (!notReceivedReason.trim()) {
      alert('Please provide a reason');
      return;
    }
    
    const newProducts = deliveryData.products.map(p => 
      p.id === notReceivedProductId 
        ? { ...p, status: 'not_received', rejectionReason: notReceivedReason, acceptedQty: 0, rejectedQty: 0 }
        : p
    );
    
    // Remove the product from selected products list since it's not received
    setSelectedProducts(prev => prev.filter(id => id !== notReceivedProductId));
    
    setDeliveryData(prevData => ({ ...prevData, products: newProducts }));
    setShowNotReceivedModal(false);
    setNotReceivedReason('');
    setNotReceivedProductId(null);
  };

  const undoNotReceived = (productId) => {
    if (window.confirm('Are you sure you want to undo "Not Received" for this product? It will be added back to the inspection list.')) {
      const newProducts = deliveryData.products.map(p => 
        p.id === productId 
          ? { ...p, status: 'pending', rejectionReason: '', acceptedQty: 0, rejectedQty: 0 }
          : p
      );
      
      // Add the product back to selected products list
      setSelectedProducts(prev => [...prev, productId]);
      
      setDeliveryData(prevData => ({ ...prevData, products: newProducts }));
    }
  };

  const toggleProductSelection = (productId) => {
    // Find the product to check its status
    const product = deliveryData.products.find(p => p.id === productId);
    
    // Don't allow selection of products marked as not received
    if (product && product.status === 'not_received') {
      return;
    }
    
    setSelectedProducts(prev => 
      prev.includes(productId) 
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const calculateVariance = (expected, accepted, rejected) => {
    const total = accepted + rejected;
    return total - expected;
  };

  const getVarianceColor = (variance) => {
    if (variance === 0) return 'text-green-600';
    if (variance > 0) return 'text-red-600';
    return 'text-orange-600';
  };

  const validateCurrentProduct = () => {
    const selectedProductsForInspection = deliveryData.products.filter(p => selectedProducts.includes(p.id));
    const product = selectedProductsForInspection[currentProductIndex];
    let newErrors = {};

    if (product && product.status !== 'not_received') {
      if (!product.photo) {
        newErrors.photo = 'Photo is required for inspection';
      }

      const totalCounted = (parseInt(product.acceptedQty) || 0) + (parseInt(product.rejectedQty) || 0);
      
      if (totalCounted > product.expectedQty) {
        newErrors.quantity = `Total cannot exceed expected quantity of ${product.expectedQty}`;
      }

      if ((parseInt(product.rejectedQty) || 0) > 0 && !product.rejectionReason.trim()) {
        newErrors.rejectionReason = 'Rejection reason is required when rejecting items';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateDeliveryInfo = () => {
    let newErrors = {};
    if (!deliveryData.driverName) newErrors.driverName = 'Driver Name is required';
    if (!deliveryData.deliveryDateTime) newErrors.deliveryDateTime = 'Delivery Date & Time is required';
    if (!deliveryData.receivedBy) newErrors.receivedBy = 'Received By is required';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNextProduct = () => {
    if (validateCurrentProduct()) {
      const selectedProductsForInspection = deliveryData.products.filter(p => selectedProducts.includes(p.id));
      if (currentProductIndex < selectedProductsForInspection.length - 1) {
        setCurrentProductIndex(currentProductIndex + 1);
        setErrors({});
        // Reset file input when moving to next product
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else {
        // Move to next step
        setCurrentStep(2);
      }
    }
  };

  const handlePreviousProduct = () => {
    if (currentProductIndex > 0) {
      setCurrentProductIndex(currentProductIndex - 1);
      setErrors({});
      // Reset file input when moving to previous product
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleStepNavigation = (direction) => {
    if (direction === 'next') {
      if (currentStep === 0) {
        if (selectedProducts.length === 0) {
          alert('Please select at least one product for inspection');
          return;
        }
        setCurrentStep(1);
        setCurrentProductIndex(0); // Reset to first selected product
        // Reset file input when starting inspection
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
      } else if (currentStep === 1) {
        if (validateCurrentProduct()) {
          const selectedProductsForInspection = deliveryData.products.filter(p => selectedProducts.includes(p.id));
          if (currentProductIndex < selectedProductsForInspection.length - 1) {
            handleNextProduct();
          } else {
            setCurrentStep(2);
          }
        }
      } else if (currentStep === 2) {
        if (validateDeliveryInfo()) {
          setCurrentStep(3);
        }
      }
    } else if (direction === 'back') {
      if (currentStep === 1 && currentProductIndex > 0) {
        handlePreviousProduct();
      } else if (currentStep > 0) {
        setCurrentStep(currentStep - 1);
      }
    }
  };

  const getSummary = () => {
    const totalExpected = deliveryData.products.reduce((sum, p) => sum + p.expectedQty, 0);
    const totalAccepted = deliveryData.products.reduce((sum, p) => sum + (parseInt(p.acceptedQty) || 0), 0);
    const totalRejected = deliveryData.products.reduce((sum, p) => sum + (parseInt(p.rejectedQty) || 0), 0);
    const totalReceived = totalAccepted + totalRejected;
    const notReceived = deliveryData.products.filter(p => p.status === 'not_received').length;
    const forInspection = selectedProducts.length;

    return { totalExpected, totalAccepted, totalRejected, totalReceived, notReceived, forInspection, totalProducts: deliveryData.products.length };
  };

  const summary = getSummary();
  
  // Get the selected products for inspection
  const selectedProductsForInspection = deliveryData.products.filter(p => selectedProducts.includes(p.id));
  const currentProduct = selectedProductsForInspection[currentProductIndex];
  const totalCounted = currentProduct ? (parseInt(currentProduct.acceptedQty) || 0) + (parseInt(currentProduct.rejectedQty) || 0) : 0;
  const variance = currentProduct ? calculateVariance(currentProduct.expectedQty, parseInt(currentProduct.acceptedQty) || 0, parseInt(currentProduct.rejectedQty) || 0) : 0;

  const handleSubmit = () => {
    const payload = {
      ...deliveryData,
      status: 'Submitted',
      timestamp: new Date().toISOString(),
    };
    console.log('Submitting Final Payload:', payload);
    alert('Delivery receipt submitted successfully!');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20 shadow-sm">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Delivery Receipt</h1>
          <p className="text-sm text-gray-500 mt-1">Material Receiving & Inspection</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="bg-white border-b border-gray-200 sticky top-20 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <React.Fragment key={step}>
                <div className="flex flex-col items-center flex-1">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                    index <= currentStep 
                      ? 'bg-orange-500 text-white' 
                      : 'bg-gray-200 text-gray-500'
                  }`}>
                    {index < currentStep ? '✓' : index + 1}
                  </div>
                  <p className={`text-xs mt-2 font-medium ${
                    index <= currentStep ? 'text-orange-600' : 'text-gray-400'
                  }`}>
                    {step}
                  </p>
                </div>
                {index < steps.length - 1 && (
                  <div className={`flex-1 h-1 mx-2 mb-6 ${
                    index < currentStep ? 'bg-orange-500' : 'bg-gray-200'
                  }`} />
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div ref={containerRef} className="max-w-2xl mx-auto px-4 py-6">
        {/* STEP 1 - EXPECTED PRODUCTS LIST */}
        {currentStep === 0 && (
          <div className="space-y-5 animate-fadeIn">
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 text-center">
                <p className="text-blue-600 text-xs font-medium">Total Products</p>
                <p className="text-2xl font-bold text-blue-700 mt-1">{summary.totalProducts}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3 border border-orange-200 text-center">
                <p className="text-orange-600 text-xs font-medium">For Inspection</p>
                <p className="text-2xl font-bold text-orange-700 mt-1">{summary.forInspection}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 border border-red-200 text-center">
                <p className="text-red-600 text-xs font-medium">Not Received</p>
                <p className="text-2xl font-bold text-red-700 mt-1">{summary.notReceived}</p>
              </div>
            </div>

            {/* Product Selection List */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Expected Products</h2>
              <p className="text-sm text-gray-600 mb-4">Select products for inspection or mark as not received</p>
              
              <div className="space-y-3">
                {deliveryData.products.map((product, index) => (
                  <div key={product.id} className={`border rounded-lg p-4 ${
                    product.status === 'not_received' 
                      ? 'bg-red-50 border-red-200' 
                      : selectedProducts.includes(product.id)
                      ? 'bg-blue-50 border-blue-300'
                      : 'border-gray-200 bg-white'
                  }`}>
                    <div className="flex items-start justify-between">
                      <div className="flex items-start flex-1">
                        <input
                          type="checkbox"
                          checked={selectedProducts.includes(product.id)}
                          onChange={() => toggleProductSelection(product.id)}
                          disabled={product.status === 'not_received'}
                          className="mt-1 mr-3 w-5 h-5 text-orange-500 rounded focus:ring-orange-500"
                        />
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{product.name}</h3>
                          <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                          <div className="mt-2 flex items-center gap-4 text-sm">
                            <span className="text-gray-700">
                              <span className="font-medium">Expected:</span> {product.expectedQty} {product.unit}
                            </span>
                          </div>
                          {product.status === 'not_received' && (
                            <div className="mt-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded inline-block">
                              Not Received: {product.rejectionReason}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      {product.status !== 'not_received' ? (
                        <button
                          onClick={() => handleNotReceivedClick(product.id)}
                          className="ml-3 text-xs px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors whitespace-nowrap"
                        >
                          Not Received
                        </button>
                      ) : (
                        <button
                          onClick={() => undoNotReceived(product.id)}
                          className="ml-3 text-xs px-3 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200 transition-colors whitespace-nowrap"
                        >
                          ↶ Undo
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Helper Text */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-medium mb-1">💡 Next Steps:</p>
              <p>Select products to inspect or mark missing items as "Not Received"</p>
              <p className="mt-2 text-xs text-blue-600">💡 Tip: You can undo "Not Received" if it was marked by mistake</p>
            </div>
          </div>
        )}

        {/* STEP 2 - PHYSICAL INSPECTION */}
        {currentStep === 1 && currentProduct && (
          <div className="space-y-5 animate-fadeIn">
            {/* Progress Bar */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">
                  Product {currentProductIndex + 1} of {selectedProductsForInspection.length}
                </span>
                <span className="text-sm text-gray-500">
                  {Math.round(((currentProductIndex + 1) / selectedProductsForInspection.length) * 100)}% Complete
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-orange-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentProductIndex + 1) / selectedProductsForInspection.length) * 100}%` }}
                />
              </div>
            </div>

            {/* Product Header */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{currentProduct.name}</h2>
                  <p className="text-sm text-gray-500 mt-1">SKU: {currentProduct.sku}</p>
                </div>
                <div className="bg-blue-50 px-3 py-1 rounded-full">
                  <span className="text-sm font-semibold text-blue-700">
                    Expected: {currentProduct.expectedQty} {currentProduct.unit}
                  </span>
                </div>
              </div>
            </div>

            {/* Photo Upload - REQUIRED */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
              <label className="block text-sm font-semibold text-gray-900 mb-3 flex items-center">
                <Camera className="w-5 h-5 mr-2 text-orange-500" />
                Product Photo <span className="text-red-500 ml-1">*</span>
              </label>
              
              <div 
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                  errors.photo 
                    ? 'border-red-300 bg-red-50 hover:border-red-400' 
                    : currentProduct.photoPreview
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-300 bg-gray-50 hover:border-orange-400'
                }`}
              >
                {currentProduct.photoPreview ? (
                  <div className="relative">
                    <img 
                      src={currentProduct.photoPreview} 
                      alt="Product preview" 
                      className="max-h-48 mx-auto rounded-lg"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleProductChange(currentProductIndex, 'photo', null);
                      }}
                      className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    <p className="text-sm text-green-700 mt-3 font-medium">✓ Photo uploaded. Tap to change</p>
                  </div>
                ) : (
                  <>
                    <Camera className={`w-12 h-12 mx-auto mb-3 ${errors.photo ? 'text-red-400' : 'text-gray-400'}`} />
                    <p className={`font-medium ${errors.photo ? 'text-red-700' : 'text-gray-900'}`}>
                      {errors.photo ? '⚠ Photo Required' : 'Tap to Take/Upload Photo'}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">Camera or Gallery</p>
                  </>
                )}
              </div>
              <input
                key={`photo-input-${currentProduct?.id || currentProductIndex}`}
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => handlePhotoUpload(currentProductIndex, e)}
                className="hidden"
              />
              {errors.photo && (
                <p className="text-red-600 text-sm mt-2 font-medium">📷 {errors.photo}</p>
              )}
            </div>

            {/* Quantity Inputs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-4">Quantity Count</h3>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Accepted Qty
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={currentProduct.acceptedQty}
                    onChange={(e) => handleProductChange(currentProductIndex, 'acceptedQty', e.target.value)}
                    className="w-full px-4 py-3 text-lg font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">{currentProduct.unit}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rejected/Damaged
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={currentProduct.rejectedQty}
                    onChange={(e) => handleProductChange(currentProductIndex, 'rejectedQty', e.target.value)}
                    className="w-full px-4 py-3 text-lg font-semibold border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">{currentProduct.unit}</p>
                </div>
              </div>

              {/* Total and Variance Display */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-600 mb-1">Total Counted</p>
                  <p className="text-2xl font-bold text-gray-900">{totalCounted}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs font-medium text-gray-600 mb-1">Variance</p>
                  <p className={`text-2xl font-bold ${getVarianceColor(variance)}`}>
                    {variance > 0 ? '+' : ''}{variance}
                  </p>
                </div>
              </div>

              {/* Discrepancy Warnings */}
              {variance !== 0 && (
                <div className={`mt-4 p-3 rounded-lg ${
                  variance < 0 
                    ? 'bg-orange-50 border border-orange-200' 
                    : 'bg-red-50 border border-red-200'
                }`}>
                  <p className={`text-sm font-medium ${
                    variance < 0 ? 'text-orange-700' : 'text-red-700'
                  }`}>
                    {variance < 0 
                      ? `⚠ Discrepancy: ${Math.abs(variance)} units under expected` 
                      : `❌ Error: ${variance} units over expected`
                    }
                  </p>
                  {variance < 0 && (
                    <p className="text-xs text-orange-600 mt-1">Please verify count or mark remaining as damaged/rejected</p>
                  )}
                </div>
              )}

              {errors.quantity && (
                <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm font-medium text-red-700">{errors.quantity}</p>
                </div>
              )}
            </div>

            {/* Rejection Reason - Shows when rejected > 0 */}
            {(parseInt(currentProduct.rejectedQty) || 0) > 0 && (
              <div className="bg-red-50 rounded-lg shadow-sm border border-red-200 p-5">
                <h3 className="text-sm font-semibold text-red-900 mb-3 flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  Rejection/Damage Details <span className="text-red-600 ml-1">*</span>
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-red-700 mb-2">Damage Type</label>
                    <select
                      value={currentProduct.rejectionReason}
                      onChange={(e) => handleProductChange(currentProductIndex, 'rejectionReason', e.target.value)}
                      className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    >
                      <option value="">Select reason...</option>
                      <option value="Fully Damaged">Fully Damaged (All Units)</option>
                      <option value="Partially Damaged">Partially Damaged</option>
                      <option value="Wrong Item">Wrong Item Delivered</option>
                      <option value="Incomplete">Incomplete/Missing Parts</option>
                      <option value="Expired">Expired/Past Date</option>
                      <option value="Quality Failed">Quality Check Failed</option>
                      <option value="Other">Other</option>
                    </select>
                    {errors.rejectionReason && (
                      <p className="text-red-600 text-sm mt-2">{errors.rejectionReason}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-red-700 mb-2">Description</label>
                    <textarea
                      value={currentProduct.notes}
                      onChange={(e) => handleProductChange(currentProductIndex, 'notes', e.target.value)}
                      placeholder="Describe the damage (e.g., 5 bags wet due to rain, 3 rebars bent)"
                      rows="3"
                      className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Additional Notes */}
            {(parseInt(currentProduct.rejectedQty) || 0) === 0 && (
              <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-5">
                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (Optional)</label>
                <textarea
                  value={currentProduct.notes}
                  onChange={(e) => handleProductChange(currentProductIndex, 'notes', e.target.value)}
                  placeholder="Any observations or comments about this product..."
                  rows="2"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                />
              </div>
            )}
          </div>
        )}

        {/* STEP 3 - DELIVERY INFORMATION */}
        {currentStep === 2 && (
          <div className="space-y-5 animate-fadeIn">
            <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" style={{ color: '#EC6923' }} />
                Delivery Information
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                  <input
                    type="text"
                    name="invoiceNumber"
                    value={deliveryData.invoiceNumber}
                    onChange={handleInputChange}
                    placeholder="INV-2025-001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Driver's Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="driverName"
                    value={deliveryData.driverName}
                    onChange={handleInputChange}
                    placeholder="Enter driver's name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  {errors.driverName && <p className="text-red-500 text-xs mt-1">{errors.driverName}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Date <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      name="deliveryDate"
                      value={deliveryData.deliveryDateTime.split('T')[0]}
                      onChange={(e) => setDeliveryData(prev => ({ ...prev, deliveryDateTime: e.target.value + 'T' + (prev.deliveryDateTime.split('T')[1] || '00:00') }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="time"
                      name="deliveryTime"
                      value={deliveryData.deliveryDateTime.split('T')[1] || ''}
                      onChange={(e) => setDeliveryData(prev => ({ ...prev, deliveryDateTime: (prev.deliveryDateTime.split('T')[0] || '') + 'T' + e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
                {errors.deliveryDateTime && <p className="text-red-500 text-xs mt-1">{errors.deliveryDateTime}</p>}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Received By <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="receivedBy"
                    value={deliveryData.receivedBy}
                    onChange={handleInputChange}
                    placeholder="Your name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  {errors.receivedBy && <p className="text-red-500 text-xs mt-1">{errors.receivedBy}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Additional Notes</label>
                  <textarea
                    name="projectSite"
                    value={deliveryData.projectSite}
                    onChange={handleInputChange}
                    placeholder="Any additional comments about the delivery..."
                    rows="3"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4 - SUMMARY */}
        {currentStep === 3 && (
          <div className="space-y-5 animate-fadeIn">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-blue-600 text-sm font-medium">Total Expected</p>
                <p className="text-3xl font-bold text-blue-700 mt-1">{summary.totalExpected}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-green-600 text-sm font-medium">Accepted</p>
                <p className="text-3xl font-bold text-green-700 mt-1">{summary.totalAccepted}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <p className="text-red-600 text-sm font-medium">Rejected</p>
                <p className="text-3xl font-bold text-red-700 mt-1">{summary.totalRejected}</p>
              </div>
              <div className="bg-orange-50 rounded-lg p-4 border border-orange-200">
                <p className="text-orange-600 text-sm font-medium">Total Received</p>
                <p className="text-3xl font-bold text-orange-700 mt-1">{summary.totalReceived}</p>
              </div>
            </div>

            {/* Success Message */}
            <div className="bg-green-50 border border-green-200 rounded-lg p-5">
              <div className="flex items-start">
                <CheckCircle className="w-6 h-6 text-green-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-900 text-lg">Process Complete</h3>
                  <p className="text-sm text-green-700 mt-1">
                    All products have been processed and documented. Ready for review or export.
                  </p>
                </div>
              </div>
            </div>

            {/* Delivery Info Summary */}
            <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Delivery Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Invoice Number:</span>
                  <span className="font-medium text-gray-900">{deliveryData.invoiceNumber || '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Driver's Name:</span>
                  <span className="font-medium text-gray-900">{deliveryData.driverName || '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Delivery Date & Time:</span>
                  <span className="font-medium text-gray-900">{deliveryData.deliveryDateTime || '—'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="text-gray-600">Received By:</span>
                  <span className="font-medium text-gray-900">{deliveryData.receivedBy || '—'}</span>
                </div>
              </div>
            </div>

            {/* Product List Summary */}
            <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Product Summary</h3>
              <div className="space-y-3">
                {deliveryData.products.map((product, index) => (
                  <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">{product.name}</h4>
                        <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                      </div>
                      {product.photoPreview && (
                        <img 
                          src={product.photoPreview} 
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded ml-3"
                        />
                      )}
                    </div>
                    
                    <div className="grid grid-cols-3 gap-3 text-sm">
                      <div>
                        <p className="text-gray-600 text-xs">Expected</p>
                        <p className="font-semibold text-gray-900">{product.expectedQty}</p>
                      </div>
                      <div>
                        <p className="text-green-600 text-xs">Accepted</p>
                        <p className="font-semibold text-green-700">{product.acceptedQty}</p>
                      </div>
                      <div>
                        <p className="text-red-600 text-xs">Rejected</p>
                        <p className="font-semibold text-red-700">{product.rejectedQty}</p>
                      </div>
                    </div>

                    {product.status === 'not_received' && (
                      <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                        <span className="font-medium">Not Received:</span> {product.rejectionReason}
                      </div>
                    )}

                    {product.rejectedQty > 0 && product.rejectionReason && (
                      <div className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700">
                        <span className="font-medium">Reason:</span> {product.rejectionReason}
                      </div>
                    )}

                    {product.notes && (
                      <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded text-xs text-gray-700">
                        <span className="font-medium">Notes:</span> {product.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Not Received Modal */}
      {showNotReceivedModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Product Not Received</h3>
            <p className="text-sm text-gray-600 mb-4">Please provide a reason why this product was not received:</p>
            
            <textarea
              value={notReceivedReason}
              onChange={(e) => setNotReceivedReason(e.target.value)}
              placeholder="e.g., Out of stock, Wrong item sent, Delivery delayed..."
              rows="4"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm mb-4"
            />
            
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowNotReceivedModal(false);
                  setNotReceivedReason('');
                  setNotReceivedProductId(null);
                }}
                className="flex-1 px-4 py-2 bg-gray-100 text-gray-800 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={submitNotReceived}
                className="flex-1 px-4 py-2 bg-red-500 text-white font-medium rounded-lg hover:bg-red-600 transition-colors"
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-20">
        <div className="max-w-2xl mx-auto px-4 py-3">
          {currentStep < 3 ? (
            <div className="flex gap-3">
              {(currentStep > 0 || (currentStep === 1 && currentProductIndex > 0)) && (
                <button
                  onClick={() => handleStepNavigation('back')}
                  className="px-6 py-3 bg-gray-100 text-gray-800 font-medium rounded-lg hover:bg-gray-200 transition-colors flex items-center"
                >
                  <ChevronLeft className="w-5 h-5 mr-1" />
                  {currentStep === 1 && currentProductIndex > 0 ? 'Previous Product' : 'Back'}
                </button>
              )}
              <button
                onClick={() => handleStepNavigation('next')}
                className="flex-1 px-6 py-3 text-white font-medium rounded-lg transition-colors flex items-center justify-center"
                style={{ backgroundColor: '#EC6923' }}
              >
                {currentStep === 0 ? 'Start Inspection' : 
                 currentStep === 1 ? (currentProductIndex < selectedProductsForInspection.length - 1 ? 'Next Product' : 'Continue to Info') :
                 'Continue to Summary'}
                <ChevronRight className="w-5 h-5 ml-1" />
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <button
                onClick={() => window.print()}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-800 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                🖨️ Print
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Are you sure you want to start over?')) {
                    window.location.reload();
                  }
                }}
                className="flex-1 px-4 py-3 bg-gray-100 text-gray-800 font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                🔄 Start Over
              </button>
              <button
                onClick={handleSubmit}
                className="flex-1 px-4 py-3 text-white font-medium rounded-lg transition-colors"
                style={{ backgroundColor: '#EC6923' }}
              >
                ✓ Submit Receipt
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Printable Receipt - Hidden by default, shown only when printing */}
      <div className="hidden print:block print:bg-white print:text-black print:p-8 print:max-w-none">
        <div className="print:border-2 print:border-gray-300 print:p-6 print:min-h-screen">
          {/* Receipt Header */}
          <div className="text-center mb-6 print:border-b print:border-gray-300 print:pb-4">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">DELIVERY RECEIPT</h1>
            <p className="text-sm text-gray-600">Material Receiving & Inspection Report</p>
            <p className="text-xs text-gray-500 mt-1">Generated: {new Date().toLocaleString()}</p>
          </div>

          {/* Delivery Information */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-1">DELIVERY INFORMATION</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-700">Invoice Number:</span>
                <span className="ml-2 text-gray-900">{deliveryData.invoiceNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">DR Number:</span>
                <span className="ml-2 text-gray-900">{deliveryData.drNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">PO Number:</span>
                <span className="ml-2 text-gray-900">{deliveryData.poNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Supplier:</span>
                <span className="ml-2 text-gray-900">{deliveryData.supplierName || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Driver Name:</span>
                <span className="ml-2 text-gray-900">{deliveryData.driverName || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Truck Number:</span>
                <span className="ml-2 text-gray-900">{deliveryData.truckNumber || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Delivery Date & Time:</span>
                <span className="ml-2 text-gray-900">{deliveryData.deliveryDateTime || 'N/A'}</span>
              </div>
              <div>
                <span className="font-medium text-gray-700">Received By:</span>
                <span className="ml-2 text-gray-900">{deliveryData.receivedBy || 'N/A'}</span>
              </div>
            </div>
          </div>

          {/* Summary Statistics */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-1">SUMMARY</h2>
            <div className="grid grid-cols-4 gap-4 text-sm">
              <div className="text-center p-3 bg-blue-50 border border-blue-200 rounded">
                <div className="font-semibold text-blue-700">Total Expected</div>
                <div className="text-2xl font-bold text-blue-800">{summary.totalExpected}</div>
              </div>
              <div className="text-center p-3 bg-green-50 border border-green-200 rounded">
                <div className="font-semibold text-green-700">Accepted</div>
                <div className="text-2xl font-bold text-green-800">{summary.totalAccepted}</div>
              </div>
              <div className="text-center p-3 bg-red-50 border border-red-200 rounded">
                <div className="font-semibold text-red-700">Rejected</div>
                <div className="text-2xl font-bold text-red-800">{summary.totalRejected}</div>
              </div>
              <div className="text-center p-3 bg-orange-50 border border-orange-200 rounded">
                <div className="font-semibold text-orange-700">Not Received</div>
                <div className="text-2xl font-bold text-orange-800">{summary.notReceived}</div>
              </div>
            </div>
          </div>

          {/* Product Details */}
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3 border-b border-gray-200 pb-1">PRODUCT DETAILS</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse border border-gray-300">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Product</th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-semibold">SKU</th>
                    <th className="border border-gray-300 px-3 py-2 text-center font-semibold">Expected</th>
                    <th className="border border-gray-300 px-3 py-2 text-center font-semibold">Accepted</th>
                    <th className="border border-gray-300 px-3 py-2 text-center font-semibold">Rejected</th>
                    <th className="border border-gray-300 px-3 py-2 text-center font-semibold">Status</th>
                    <th className="border border-gray-300 px-3 py-2 text-left font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {deliveryData.products.map((product, index) => (
                    <tr key={product.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-300 px-3 py-2 font-medium">{product.name}</td>
                      <td className="border border-gray-300 px-3 py-2 text-gray-600">{product.sku}</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">{product.expectedQty} {product.unit}</td>
                      <td className="border border-gray-300 px-3 py-2 text-center text-green-700 font-semibold">{product.acceptedQty || 0}</td>
                      <td className="border border-gray-300 px-3 py-2 text-center text-red-700 font-semibold">{product.rejectedQty || 0}</td>
                      <td className="border border-gray-300 px-3 py-2 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          product.status === 'received' ? 'bg-green-100 text-green-800' :
                          product.status === 'not_received' ? 'bg-red-100 text-red-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {product.status === 'received' ? 'Received' :
                           product.status === 'not_received' ? 'Not Received' : 'Pending'}
                        </span>
                      </td>
                      <td className="border border-gray-300 px-3 py-2 text-xs">
                        {product.status === 'not_received' && product.rejectionReason && (
                          <div className="text-red-700">Not Received: {product.rejectionReason}</div>
                        )}
                        {product.rejectedQty > 0 && product.rejectionReason && (
                          <div className="text-orange-700">Rejected: {product.rejectionReason}</div>
                        )}
                        {product.notes && (
                          <div className="text-gray-600">{product.notes}</div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-gray-300">
            <div className="grid grid-cols-2 gap-8">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Received By:</h3>
                <div className="border-b border-gray-300 pb-1 mb-4">
                  <span className="text-sm">{deliveryData.receivedBy || '_________________'}</span>
                </div>
                <p className="text-xs text-gray-600">Signature</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Date & Time:</h3>
                <div className="border-b border-gray-300 pb-1 mb-4">
                  <span className="text-sm">{new Date().toLocaleString()}</span>
                </div>
                <p className="text-xs text-gray-600">Inspection Completed</p>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          {deliveryData.projectSite && (
            <div className="mt-6 pt-4 border-t border-gray-300">
              <h3 className="font-semibold text-gray-900 mb-2">Additional Notes:</h3>
              <p className="text-sm text-gray-700">{deliveryData.projectSite}</p>
            </div>
          )}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-in-out;
        }
        
        /* Print-specific styles */
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:block, .print\\:block * {
            visibility: visible;
          }
          .print\\:block {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  );
};

export default MobileDeliveryReceipt;