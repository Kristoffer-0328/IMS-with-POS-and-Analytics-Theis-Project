import React from 'react';

function CustomerInfo({ customerInfo, setCustomerInfo, disabled, transactionType, setTransactionType }) {
  const currentDate = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const handleInputChange = (field, value) => {
    if (!disabled) {
      setCustomerInfo(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  const handleTransactionTypeChange = (type) => {
    setTransactionType(type);
    if (type === 'walk-in') {
      // Clear customer info when switching to walk-in
      setCustomerInfo({
        name: '',
        phone: '',
        email: '',
        address: ''
      });
    }
  };

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-800 mb-4">Customer Information</h3>
      
      {/* Transaction Type Selector */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-600 mb-2">Transaction Type:</label>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => handleTransactionTypeChange('walk-in')}
            disabled={disabled}
            className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
              transactionType === 'walk-in'
                ? 'bg-blue-50 border-blue-500 text-blue-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Walk-in Sale
          </button>
          <button
            onClick={() => handleTransactionTypeChange('quotation')}
            disabled={disabled}
            className={`px-3 py-2 text-sm rounded-lg border transition-colors ${
              transactionType === 'quotation'
                ? 'bg-orange-50 border-orange-500 text-orange-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            Generate Quotation
          </button>
        </div>
      </div>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">Customer:</label>
          {transactionType === 'walk-in' ? (
            <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-500">
              N/A (Walk-in)
            </div>
          ) : (
            <div className="px-3 py-2 bg-orange-50 border border-orange-200 rounded-lg text-sm text-orange-600">
              Customer info will be collected during checkout
            </div>
          )}
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-2">Date:</label>
          <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-700">
            {currentDate}
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerInfo;