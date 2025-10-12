import React, { useState, useEffect, useRef } from 'react';
import { AlertCircle, CheckCircle, Clock, Upload, X, MapPin, User, Truck, FileText } from 'lucide-react';

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
        orderedQuantity: 10,
        deliveredQuantity: 10,
        qualityCheck: 'Pass',
        condition: 'Complete',
        notes: '',
        itemStatus: 'Accepted',
        damagedReason: '',
        damageImages: [],
      },
      {
        id: 'prod002',
        name: 'Steel Rebar',
        sku: 'SRB-002',
        unit: 'pieces',
        orderedQuantity: 50,
        deliveredQuantity: 48,
        qualityCheck: 'Pass',
        condition: 'Partial',
        notes: '2 pieces misaligned',
        itemStatus: 'Accepted',
        damagedReason: '',
        damageImages: [],
      },
    ],
    supportingDocuments: [],
  });

  const [errors, setErrors] = useState({});
  const [activeTab, setActiveTab] = useState('details');
  
  // Swipe functionality
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const containerRef = useRef(null);
  
  const tabs = ['details', 'products', 'documents', 'summary'];

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDeliveryData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleProductChange = (index, field, value) => {
    const newProducts = [...deliveryData.products];
    newProducts[index][field] = value;
    setDeliveryData(prevData => ({
      ...prevData,
      products: newProducts
    }));
  };

  const calculateVariance = (ordered, delivered) => {
    return delivered - ordered;
  };

  const getVarianceColor = (variance) => {
    if (variance === 0) return 'text-green-600';
    if (variance > 0) return 'text-blue-600';
    return 'text-orange-600';
  };

  const validateForm = () => {
    let newErrors = {};
    if (!deliveryData.drNumber) newErrors.drNumber = 'DR Number is required';
    if (!deliveryData.deliveryDateTime) newErrors.deliveryDateTime = 'Delivery Date & Time is required';
    if (!deliveryData.driverName) newErrors.driverName = 'Driver Name is required';
    if (!deliveryData.receivedBy) newErrors.receivedBy = 'Received By is required';

    deliveryData.products.forEach((product, index) => {
      if (product.deliveredQuantity === null || product.deliveredQuantity < 0) {
        newErrors[`product-${index}-qty`] = 'Quantity must be non-negative';
      }
      if (product.itemStatus === 'Rejected/Damaged' && !product.damagedReason) {
        newErrors[`product-${index}-reason`] = 'Rejection reason is required';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (isDraft) => {
    if (isDraft || validateForm()) {
      const payload = {
        drNumber: deliveryData.drNumber,
        invoiceNumber: deliveryData.invoiceNumber,
        poNumber: deliveryData.poNumber,
        supplierName: deliveryData.supplierName,
        deliveryDateTime: deliveryData.deliveryDateTime,
        driverName: deliveryData.driverName,
        truckNumber: deliveryData.truckNumber,
        receivedBy: deliveryData.receivedBy,
        projectSite: deliveryData.projectSite,
        products: deliveryData.products,
        supportingDocuments: deliveryData.supportingDocuments,
        status: isDraft ? 'Draft' : 'Submitted',
        timestamp: new Date().toISOString(),
      };
      console.log('Submitting Payload:', payload);
    } else {
      console.log('Form has errors.', errors);
    }
  };

  const acceptAll = () => {
    const newProducts = deliveryData.products.map(p => ({
      ...p,
      itemStatus: 'Accepted',
      qualityCheck: 'Pass',
    }));
    setDeliveryData(prevData => ({
      ...prevData,
      products: newProducts
    }));
  };

  const rejectAll = () => {
    const reason = prompt('Enter reason for rejection:');
    if (reason) {
      const newProducts = deliveryData.products.map(p => ({
        ...p,
        itemStatus: 'Rejected/Damaged',
        damagedReason: reason,
      }));
      setDeliveryData(prevData => ({
        ...prevData,
        products: newProducts
      }));
    }
  };

  const getSummary = () => {
    const accepted = deliveryData.products.filter(p => p.itemStatus === 'Accepted').length;
    const rejected = deliveryData.products.filter(p => p.itemStatus === 'Rejected/Damaged').length;
    const pending = deliveryData.products.filter(p => p.itemStatus === 'Pending').length;
    return { accepted, rejected, pending, total: deliveryData.products.length };
  };

  const summary = getSummary();

  // Swipe handlers
  const handleTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe || isRightSwipe) {
      const currentIndex = tabs.indexOf(activeTab);
      let nextIndex;

      if (isLeftSwipe && currentIndex < tabs.length - 1) {
        // Swipe left - go to next tab
        nextIndex = currentIndex + 1;
      } else if (isRightSwipe && currentIndex > 0) {
        // Swipe right - go to previous tab
        nextIndex = currentIndex - 1;
      }

      if (nextIndex !== undefined) {
        setActiveTab(tabs[nextIndex]);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900">Delivery Receipt</h1>
          <p className="text-sm text-gray-500 mt-1">Construction Material Receiving Form</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white border-b border-gray-200 sticky top-16 z-10">
        <div className="max-w-2xl mx-auto px-4">
          <div className="flex space-x-1">
            {tabs.map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-3 font-medium text-sm border-b-2 transition-all duration-200 ${
                  activeTab === tab
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
          {/* Swipe indicator */}
          <div className="text-center py-2">
            <p className="text-xs text-gray-400">← Swipe left/right to navigate →</p>
          </div>
        </div>
      </div>

      <div 
        ref={containerRef}
        className="max-w-2xl mx-auto px-4 py-6 pb-24"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* DELIVERY DETAILS TAB */}
        {activeTab === 'details' && (
          <div className="space-y-5 animate-fadeIn">
            {/* DR & Invoice Info */}
            <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" style={{ color: '#EC6923' }} />
                Delivery Information
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    DR Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="drNumber"
                    value={deliveryData.drNumber}
                    onChange={handleInputChange}
                    placeholder="e.g., DR-2025-001"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  {errors.drNumber && <p className="text-red-500 text-xs mt-1">{errors.drNumber}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                    <input
                      type="text"
                      name="invoiceNumber"
                      value={deliveryData.invoiceNumber}
                      onChange={handleInputChange}
                      placeholder="Optional"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">PO Number</label>
                    <input
                      type="text"
                      name="poNumber"
                      value={deliveryData.poNumber}
                      onChange={handleInputChange}
                      placeholder="Optional"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Supplier / Company Name</label>
                  <input
                    type="text"
                    name="supplierName"
                    value={deliveryData.supplierName}
                    onChange={handleInputChange}
                    placeholder="Enter supplier name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Delivery Date & Time <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      name="deliveryDateTime"
                      value={deliveryData.deliveryDateTime}
                      onChange={handleInputChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                    {errors.deliveryDateTime && <p className="text-red-500 text-xs mt-1">{errors.deliveryDateTime}</p>}
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Truck / Plate Number</label>
                    <input
                      type="text"
                      name="truckNumber"
                      value={deliveryData.truckNumber}
                      onChange={handleInputChange}
                      placeholder="Optional"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Personnel Info */}
            <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <User className="w-5 h-5 mr-2" style={{ color: '#EC6923' }} />
                Personnel
              </h3>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Driver / Delivery Personnel Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="driverName"
                    value={deliveryData.driverName}
                    onChange={handleInputChange}
                    placeholder="Enter name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                  {errors.driverName && <p className="text-red-500 text-xs mt-1">{errors.driverName}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Project Site / Location</label>
                    <input
                      type="text"
                      name="projectSite"
                      value={deliveryData.projectSite}
                      onChange={handleInputChange}
                      placeholder="Site name"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* PRODUCTS TAB */}
        {activeTab === 'products' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Bulk Actions */}
            <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Bulk Actions</h2>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={acceptAll}
                  className="px-4 py-3 bg-green-50 text-green-700 border border-green-200 rounded-lg hover:bg-green-100 font-medium transition-colors"
                >
                  ✓ Accept All
                </button>
                <button
                  onClick={rejectAll}
                  className="px-4 py-3 bg-red-50 text-red-700 border border-red-200 rounded-lg hover:bg-red-100 font-medium transition-colors"
                >
                  ✗ Reject All
                </button>
              </div>
            </div>

            {/* Products List */}
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-gray-900">Product Verification</h2>
              {deliveryData.products.map((product, index) => {
                const variance = calculateVariance(product.orderedQuantity, product.deliveredQuantity);
                const varianceColor = getVarianceColor(variance);
                
                return (
                  <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-100 overflow-hidden">
                    {/* Product Header */}
                    <div className="p-4 border-b border-gray-100 bg-gray-50">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-semibold text-gray-900">{product.name}</h3>
                          <p className="text-sm text-gray-500">SKU: {product.sku}</p>
                        </div>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${
                          product.itemStatus === 'Accepted' ? 'bg-green-50 text-green-700' :
                          product.itemStatus === 'Rejected/Damaged' ? 'bg-red-50 text-red-700' :
                          'bg-yellow-50 text-yellow-700'
                        }`}>
                          {product.itemStatus}
                        </span>
                      </div>
                    </div>

                    {/* Product Details */}
                    <div className="p-4 space-y-4">
                      {/* Quantities */}
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Ordered</label>
                          <p className="text-lg font-semibold text-gray-900">{product.orderedQuantity}</p>
                          <p className="text-xs text-gray-500">{product.unit}</p>
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Delivered</label>
                          <input
                            type="number"
                            value={product.deliveredQuantity}
                            onChange={(e) => handleProductChange(index, 'deliveredQuantity', parseInt(e.target.value) || 0)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-lg font-semibold focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          />
                          {errors[`product-${index}-qty`] && <p className="text-red-500 text-xs mt-1">{errors[`product-${index}-qty`]}</p>}
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-600 mb-1">Variance</label>
                          <p className={`text-lg font-semibold ${varianceColor}`}>
                            {variance > 0 ? '+' : ''}{variance}
                          </p>
                          <p className="text-xs text-gray-500">{product.unit}</p>
                        </div>
                      </div>

                      {/* Condition */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Condition</label>
                          <select
                            value={product.condition}
                            onChange={(e) => handleProductChange(index, 'condition', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                          >
                            <option value="Complete">✓ Complete</option>
                            <option value="Partial">⚠ Partial</option>
                            <option value="Excess">+ Excess</option>
                            <option value="Damaged/Defective">✗ Damaged/Defective</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Quality Check</label>
                          <select
                            value={product.qualityCheck}
                            onChange={(e) => handleProductChange(index, 'qualityCheck', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                          >
                            <option value="Pass">Pass</option>
                            <option value="Fail">Fail</option>
                          </select>
                        </div>
                      </div>

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Notes / Comments</label>
                        <textarea
                          value={product.notes}
                          onChange={(e) => handleProductChange(index, 'notes', e.target.value)}
                          placeholder="Enter observations (e.g., 5 bags wet due to rain)"
                          rows="2"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                        />
                      </div>

                      {/* Item Status */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Item Status</label>
                        <select
                          value={product.itemStatus}
                          onChange={(e) => handleProductChange(index, 'itemStatus', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        >
                          <option value="Accepted">Accepted into Inventory</option>
                          <option value="Rejected/Damaged">Rejected / Damaged</option>
                          <option value="Pending">Pending</option>
                        </select>
                      </div>

                      {/* Rejection/Damage Reason */}
                      {(product.itemStatus === 'Rejected/Damaged' || product.condition === 'Damaged/Defective') && (
                        <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-4">
                          <div>
                            <label className="block text-sm font-medium text-red-700 mb-2">Damage Type</label>
                            <select
                              value={product.damagedReason}
                              onChange={(e) => handleProductChange(index, 'damagedReason', e.target.value)}
                              className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent mb-2"
                            >
                              <option value="">Select damage type</option>
                              <option value="Fully Damaged">Fully Damaged (Reject All)</option>
                              <option value="Partially Damaged">Partially Damaged</option>
                              <option value="Wrong Item">Wrong Item</option>
                              <option value="Incomplete">Incomplete</option>
                              <option value="Expired">Expired</option>
                              <option value="Other">Other</option>
                            </select>
                            {errors[`product-${index}-reason`] && <p className="text-red-500 text-xs mt-1">{errors[`product-${index}-reason`]}</p>}
                          </div>

                          {product.damagedReason === 'Partially Damaged' && (
                            <div>
                              <label className="block text-sm font-medium text-red-700 mb-2">
                                Quantity Damaged
                              </label>
                              <input
                                type="number"
                                min="1"
                                max={product.deliveredQuantity}
                                placeholder="How many units are damaged?"
                                className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent"
                              />
                              <p className="text-xs text-red-600 mt-1">
                                Good units: {product.deliveredQuantity - (parseInt(product.damagedReason) || 0)}
                              </p>
                            </div>
                          )}

                          <div>
                            <label className="block text-sm font-medium text-red-700 mb-2">Details / Description</label>
                            <textarea
                              placeholder="Describe the damage (e.g., cracked, wet, bent, missing labels)"
                              rows="3"
                              className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-red-700 mb-2">Action Needed</label>
                            <select className="w-full px-3 py-2 border border-red-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm">
                              <option value="">Select action</option>
                              <option value="Reported to Supplier">Report to Supplier</option>
                              <option value="Awaiting Replacement">Awaiting Replacement</option>
                              <option value="For Inspection">For Inspection</option>
                              <option value="Partial Acceptance">Accept Good Units</option>
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* DOCUMENTS TAB */}
        {activeTab === 'documents' && (
          <div className="space-y-5 animate-fadeIn">
            <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Upload className="w-5 h-5 mr-2" style={{ color: '#EC6923' }} />
                Supporting Documents
              </h2>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-orange-500 transition-colors cursor-pointer">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="font-medium text-gray-900">Upload Documents</p>
                <p className="text-sm text-gray-500 mt-1">Drag and drop or click to browse</p>
                <p className="text-xs text-gray-400 mt-2">Max 10 files, 10MB each</p>
                <input type="file" multiple accept="image/*,application/pdf" className="mt-3 hidden" />
              </div>

              <p className="text-sm text-gray-600 mt-4">Accepted files:</p>
              <ul className="text-sm text-gray-600 mt-2 space-y-1">
                <li>📷 Delivery Receipt (DR) Photo</li>
                <li>📷 Invoice Photo</li>
                <li>📷 Proof of Delivery / Acknowledgment</li>
                <li>📷 Material Condition Photos</li>
              </ul>
            </div>
          </div>
        )}

        {/* SUMMARY TAB */}
        {activeTab === 'summary' && (
          <div className="space-y-5 animate-fadeIn">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-green-600 text-sm font-medium">Accepted</p>
                <p className="text-3xl font-bold text-green-700 mt-1">{summary.accepted}</p>
              </div>
              <div className="bg-red-50 rounded-lg p-4 border border-red-200">
                <p className="text-red-600 text-sm font-medium">Rejected</p>
                <p className="text-3xl font-bold text-red-700 mt-1">{summary.rejected}</p>
              </div>
              <div className="bg-yellow-50 rounded-lg p-4 border border-yellow-200">
                <p className="text-yellow-600 text-sm font-medium">Pending</p>
                <p className="text-3xl font-bold text-yellow-700 mt-1">{summary.pending}</p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                <p className="text-blue-600 text-sm font-medium">Total Items</p>
                <p className="text-3xl font-bold text-blue-700 mt-1">{summary.total}</p>
              </div>
            </div>

            {/* Overall Status */}
            <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-3">Overall Status</h3>
              <div className="flex items-center p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <Clock className="w-5 h-5 text-blue-600 mr-3" />
                <div>
                  <p className="font-medium text-blue-900">
                    {summary.accepted === summary.total ? '✓ Complete' : summary.pending > 0 ? '⏳ Pending' : '⚠ Partial'}
                  </p>
                  <p className="text-sm text-blue-700">
                    {summary.accepted}/{summary.total} items accepted
                  </p>
                </div>
              </div>
            </div>

            {/* Review Summary */}
            <div className="bg-white rounded-lg shadow-sm p-5 border border-gray-100">
              <h3 className="font-semibold text-gray-900 mb-4">Delivery Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">DR Number:</span>
                  <span className="font-medium text-gray-900">{deliveryData.drNumber || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Supplier:</span>
                  <span className="font-medium text-gray-900">{deliveryData.supplierName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Date & Time:</span>
                  <span className="font-medium text-gray-900">{deliveryData.deliveryDateTime || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Driver:</span>
                  <span className="font-medium text-gray-900">{deliveryData.driverName || '—'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Received By:</span>
                  <span className="font-medium text-gray-900">{deliveryData.receivedBy || '—'}</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-3 flex gap-3">
          <button
            onClick={() => handleSubmit(true)}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-800 font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Save Draft
          </button>
          <button
            onClick={() => handleSubmit(false)}
            className="flex-1 px-4 py-3 text-white font-medium rounded-lg transition-colors"
            style={{ backgroundColor: '#EC6923' }}
            onMouseEnter={(e) => e.target.style.opacity = '0.9'}
            onMouseLeave={(e) => e.target.style.opacity = '1'}
          >
            Submit Receipt
          </button>
        </div>
      </div>
    </div>
  );
};

export default MobileDeliveryReceipt;