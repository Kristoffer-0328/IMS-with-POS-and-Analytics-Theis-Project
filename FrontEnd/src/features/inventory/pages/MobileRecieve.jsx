
import React, { useState, useEffect } from 'react';

const MobileRecieve = () => {
  const [deliveryData, setDeliveryData] = useState({
    drNumber: '',
    invoiceNumber: '',
    deliveryDateTime: '',
    driverName: '',
    products: [    // Sample product for demonstration
      {
        id: 'prod001',
        name: 'Product Alpha',
        sku: 'PA-001',
        expectedQuantity: 10,
        unit: 'units',
        actualQuantity: 10,
        remarkStatus: 'Complete',
        freeTextRemarks: '',
        itemStatus: 'Accepted',
        images: [],
      },
      {
        id: 'prod002',
        name: 'Product Beta',
        sku: 'PB-002',
        expectedQuantity: 5,
        unit: 'pieces',
        actualQuantity: 3,
        remarkStatus: 'Complete',
        freeTextRemarks: '',
        itemStatus: 'Pending',
        images: [],
      },
    ],
    supportingDocuments: [],
  });

  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setDeliveryData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleProductChange = (index, e) => {
    const { name, value } = e.target;
    const newProducts = [...deliveryData.products];
    newProducts[index] = {
      ...newProducts[index],
      [name]: value
    };
    setDeliveryData(prevData => ({
      ...prevData,
      products: newProducts
    }));
  };

  const validateForm = () => {
    let newErrors = {};
    // Header validation
    if (!deliveryData.drNumber) newErrors.drNumber = 'DR Number is required';
    if (!deliveryData.deliveryDateTime) newErrors.deliveryDateTime = 'Delivery Date & Time is required';
    if (!deliveryData.driverName) newErrors.driverName = 'Driver Name is required';

    // Product validation
    deliveryData.products.forEach((product, index) => {
      if (product.actualQuantity === null || product.actualQuantity < 0) {
        newErrors[`product-${index}-actualQuantity`] = 'Actual quantity must be a non-negative integer';
      }
      // Discrepancy warning (example: if actual is less than 50% of expected)
      if (product.actualQuantity < product.expectedQuantity / 2) {
        newErrors[`product-${index}-discrepancyWarning`] = 'Large discrepancy detected!';
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
        deliveryDateTime: deliveryData.deliveryDateTime,
        driverName: deliveryData.driverName,
        products: deliveryData.products.map(product => ({
          id: product.id,
          actualQuantity: parseInt(product.actualQuantity),
          remarkStatus: product.remarkStatus,
          freeTextRemarks: product.freeTextRemarks,
          itemStatus: product.itemStatus,
          images: product.images, // Assuming images are URLs or references after upload
        })),
        supportingDocuments: deliveryData.supportingDocuments, // Assuming images are URLs or references after upload
        status: isDraft ? 'Draft' : 'Submitted',
      };
      console.log('Submitting Payload:', payload);
      // TODO: Replace with actual API call
      // fetch('/api/deliveries', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(payload),
      // })
      // .then(response => response.json())
      // .then(data => console.log(data))
      // .catch(error => console.error('Error:', error));
    } else {
      console.log('Form has errors.', errors);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      <h1 className="text-2xl font-bold mb-4">Delivery Receipt</h1>
      {/* Header Section */}
      <section className="bg-white p-4 rounded-lg shadow mb-4">
        <h2 className="text-xl font-semibold mb-3">Delivery Information</h2>
        <div className="mb-3">
          <label htmlFor="drNumber" className="block text-sm font-medium text-gray-700">Delivery Receipt (DR) Number <span className="text-red-500">*</span></label>
          <input type="text" id="drNumber" name="drNumber" value={deliveryData.drNumber} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2" required />
          {errors.drNumber && <p className="text-red-500 text-xs mt-1">{errors.drNumber}</p>}
        </div>
        <div className="mb-3">
          <label htmlFor="invoiceNumber" className="block text-sm font-medium text-gray-700">Invoice Number (Optional)</label>
          <input type="text" id="invoiceNumber" name="invoiceNumber" value={deliveryData.invoiceNumber} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2" />
        </div>
        <div className="mb-3">
          <label htmlFor="deliveryDateTime" className="block text-sm font-medium text-gray-700">Delivery Date & Time <span className="text-red-500">*</span></label>
          <input type="datetime-local" id="deliveryDateTime" name="deliveryDateTime" value={deliveryData.deliveryDateTime} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2" required />
          {errors.deliveryDateTime && <p className="text-red-500 text-xs mt-1">{errors.deliveryDateTime}</p>}
        </div>
        <div className="mb-3">
          <label htmlFor="driverName" className="block text-sm font-medium text-gray-700">Driver / Delivery Personnel Name <span className="text-red-500">*</span></label>
          <input type="text" id="driverName" name="driverName" value={deliveryData.driverName} onChange={handleInputChange} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2" required />
          {errors.driverName && <p className="text-red-500 text-xs mt-1">{errors.driverName}</p>}
        </div>
      </section>

      {/* Bulk Actions */}
      <section className="bg-white p-4 rounded-lg shadow mb-4">
        <h2 className="text-xl font-semibold mb-3">Bulk Actions</h2>
        <div className="flex flex-col space-y-2">
          <button className="bg-green-500 text-white px-4 py-2 rounded-md">Accept All</button>
          <button className="bg-red-500 text-white px-4 py-2 rounded-md">Reject All (with Reason)</button>
        </div>
      </section>

      {/* Product Verification List */}
      <section className="bg-white p-4 rounded-lg shadow mb-4">
        <h2 className="text-xl font-semibold mb-3">Product Verification</h2>
        <div className="space-y-4">
          {deliveryData.products.map((product, index) => (
            <div key={index} className="border p-3 rounded-md">
              <h3 className="font-semibold text-lg mb-2">{product.name}</h3>
              <p className="text-sm text-gray-600">SKU: {product.sku}</p>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Expected Quantity:</label>
                  <p className="mt-1 text-base">{product.expectedQuantity} {product.unit}</p>
                </div>
                <div>
                  <label htmlFor={`actualQuantity-${index}`} className="block text-sm font-medium text-gray-700">Actual Delivered Quantity:</label>
                  <input type="number" id={`actualQuantity-${index}`} name="actualQuantity" value={product.actualQuantity} onChange={(e) => handleProductChange(index, e)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2" />
                  {errors[`product-${index}-actualQuantity`] && <p className="text-red-500 text-xs mt-1">{errors[`product-${index}-actualQuantity`]}</p>}
                </div>
              </div>
              <div className="mt-2">
                <p className="text-sm font-medium text-gray-700">Discrepancy: <span className={product.actualQuantity - product.expectedQuantity === 0 ? "font-bold text-green-600" : "font-bold text-red-600"}>{product.actualQuantity - product.expectedQuantity} {product.unit}</span></p>
                {errors[`product-${index}-discrepancyWarning`] && <p className="text-yellow-600 text-xs mt-1">{errors[`product-${index}-discrepancyWarning`]}</p>}
              </div>
              <div className="mt-3">
                <label htmlFor={`remarkStatus-${index}`} className="block text-sm font-medium text-gray-700">Remarks Status:</label>
                <select id={`remarkStatus-${index}`} name="remarkStatus" value={product.remarkStatus} onChange={(e) => handleProductChange(index, e)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2">
                  <option value="Complete">Complete</option>
                  <option value="Damaged/Defective">Damaged/Defective</option>
                </select>
              </div>
              <div className="mt-3">
                <label htmlFor={`freeTextRemarks-${index}`} className="block text-sm font-medium text-gray-700">Free-text Remarks (Optional):</label>
                <textarea id={`freeTextRemarks-${index}`} name="freeTextRemarks" value={product.freeTextRemarks} onChange={(e) => handleProductChange(index, e)} rows="3" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2"></textarea>
              </div>
              <div className="mt-3">
                <label htmlFor={`itemStatus-${index}`} className="block text-sm font-medium text-gray-700">Item Status:</label>
                <select id={`itemStatus-${index}`} name="itemStatus" value={product.itemStatus} onChange={(e) => handleProductChange(index, e)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2">
                  <option value="Accepted">Accepted</option>
                  <option value="Rejected/Damaged">Rejected/Damaged</option>
                  <option value="Pending">Pending</option>
                </select>
              </div>
              {/* Conditional UI for Rejected/Damaged status */}
              {product.itemStatus === 'Rejected/Damaged' && (
                <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm font-medium text-red-700 mb-2">Reason for Rejection/Damage:</p>
                  <textarea rows="2" className="mt-1 block w-full rounded-md border-red-300 shadow-sm focus:border-red-500 focus:ring-red-500 sm:text-sm p-2" placeholder="Specify reason for rejection or damage"></textarea>
                  <label htmlFor={`damageImages-${index}`} className="block text-sm font-medium text-red-700 mt-2">Upload Damage Photos (Required):</label>
                  <input type="file" id={`damageImages-${index}`} name="damageImages" multiple accept="image/*" className="mt-1 block w-full text-sm text-red-500"></input>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Supporting Documents Upload */}
      <section className="bg-white p-4 rounded-lg shadow mb-4">
        <h2 className="text-xl font-semibold mb-3">Supporting Documents</h2>
        <input type="file" id="supportingDocuments" name="supportingDocuments" multiple accept="image/*,application/pdf" className="mb-3" />
        <p className="text-sm text-gray-600 mb-2">Max 10 files, 10MB each. Images required for damaged items.</p>
        {/* Preview thumbnails will go here */}
        <div className="grid grid-cols-3 gap-2">
          {/* Example thumbnail */}
          {/* <div className="relative w-24 h-24 rounded-md overflow-hidden">
            <img src="https://via.placeholder.com/150" alt="Document Preview" className="w-full h-full object-cover" />
            <button className="absolute top-0 right-0 bg-red-500 text-white rounded-full p-1 text-xs">X</button>
          </div> */}
        </div>
      </section>

      {/* Action Buttons */}
      <section className="flex justify-around mt-6">
        <button onClick={() => handleSubmit(true)} className="bg-gray-300 text-gray-800 px-6 py-2 rounded-lg mr-2">Save Draft</button>
        <button onClick={() => handleSubmit(false)} className="bg-blue-600 text-white px-6 py-2 rounded-lg">Submit</button>
      </section>
    </div>
  );
};

export default MobileRecieve;
