import React, { useState, useEffect } from 'react';

const QuantityInputModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  location, // { unit, shelf, row, column, columnDisplay, fullLocation }
  cellCapacity = 100, // Maximum items that can fit in one cell
  totalQuantity = 0, // Total quantity user wants to store
  allocatedQuantity = 0 // Already allocated to other cells
}) => {
  const [quantity, setQuantity] = useState('');
  const [error, setError] = useState('');

  const remainingQuantity = totalQuantity - allocatedQuantity;
  const maxAllowedInCell = Math.min(cellCapacity, remainingQuantity);

  useEffect(() => {
    if (isOpen) {
      setQuantity('');
      setError('');
    }
  }, [isOpen]);

  const handleQuantityChange = (value) => {
    const numValue = parseInt(value) || 0;
    setQuantity(value);
    
    if (numValue <= 0 && value !== '') {
      setError('Quantity must be greater than 0');
    } else if (numValue > maxAllowedInCell) {
      if (numValue > cellCapacity) {
        setError(`Cell capacity limit: ${cellCapacity} items`);
      } else {
        setError(`Only ${remainingQuantity} items remaining to allocate`);
      }
    } else {
      setError('');
    }
  };

  const handleConfirm = () => {
    const numValue = parseInt(quantity);
    
    if (!numValue || numValue <= 0) {
      setError('Please enter a valid quantity');
      return;
    }
    
    if (numValue > maxAllowedInCell) {
      return; // Error already shown
    }
    
    onConfirm(numValue);
    onClose();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !error && quantity) {
      handleConfirm();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!isOpen || !location) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[90]"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            Allocate Quantity
          </h3>
          <p className="text-sm text-gray-600">
            {location.fullLocation}
          </p>
        </div>

        {/* Information Cards */}
        <div className="space-y-3 mb-6">
          {/* Cell Capacity */}
          <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="text-sm font-medium text-purple-900">Cell Capacity</span>
            </div>
            <span className="text-lg font-bold text-purple-600">{cellCapacity}</span>
          </div>

          {/* Total Quantity */}
          <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z" />
              </svg>
              <span className="text-sm font-medium text-blue-900">Total to Store</span>
            </div>
            <span className="text-lg font-bold text-blue-600">{totalQuantity}</span>
          </div>

          {/* Allocated Quantity */}
          {allocatedQuantity > 0 && (
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm font-medium text-green-900">Already Allocated</span>
              </div>
              <span className="text-lg font-bold text-green-600">{allocatedQuantity}</span>
            </div>
          )}

          {/* Remaining Quantity */}
          <div className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-amber-50 rounded-lg border-2 border-orange-300 shadow-sm">
            <div className="flex items-center gap-2">
              <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-sm font-bold text-orange-900">Remaining</span>
            </div>
            <span className="text-2xl font-bold text-orange-600">{remainingQuantity}</span>
          </div>
        </div>

        {/* Quantity Input */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Quantity for this cell
            <span className="text-red-500 ml-1">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              min="1"
              max={maxAllowedInCell}
              value={quantity}
              onChange={(e) => handleQuantityChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={`Max: ${maxAllowedInCell}`}
              autoFocus
              className={`w-full px-4 py-3 text-lg font-semibold border-2 rounded-lg transition-all
                ${error 
                  ? 'border-red-300 bg-red-50 focus:ring-red-500 focus:border-red-500' 
                  : 'border-gray-300 bg-white focus:ring-blue-500 focus:border-blue-500'
                }`}
            />
            {quantity && !error && (
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-green-500">
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
            )}
          </div>
          {error && (
            <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {error}
            </p>
          )}
          <p className="mt-2 text-xs text-gray-500">
            💡 Maximum allowed: {maxAllowedInCell} items (limited by {maxAllowedInCell === cellCapacity ? 'cell capacity' : 'remaining quantity'})
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={!quantity || error || parseInt(quantity) <= 0}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium 
                     hover:from-blue-600 hover:to-blue-700 disabled:from-gray-300 disabled:to-gray-300 
                     disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg
                     disabled:shadow-none"
          >
            Confirm
          </button>
        </div>

        {/* Keyboard Shortcuts Hint */}
        <div className="mt-4 text-center text-xs text-gray-400">
          Press <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-600 font-mono">Enter</kbd> to confirm or <kbd className="px-2 py-1 bg-gray-100 rounded text-gray-600 font-mono">Esc</kbd> to cancel
        </div>
      </div>
    </div>
  );
};

export default QuantityInputModal;
