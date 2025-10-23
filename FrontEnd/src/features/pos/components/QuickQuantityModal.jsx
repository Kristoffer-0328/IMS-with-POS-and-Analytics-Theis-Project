import React, { useState } from 'react';
import { FiMinus, FiPlus, FiX } from 'react-icons/fi';

const QuickQuantityModal = ({
  product,
  onClose,
  onAdd,
  maxQuantity
}) => {
  
  // Early return if product is null
  if (!product) {
    console.warn('QuickQuantityModal: No product provided');
    return null;
  }

  if (!product.variants || product.variants.length === 0) {
    console.error('QuickQuantityModal: No variants found in product', product);
    return null;
  }

  const [quantity, setQuantity] = useState('1');
  
  const handleQuantityChange = (e) => {
    const value = e.target.value;
    // Allow empty value or numbers
    if (value === '' || /^\d*$/.test(value)) {
      if (value === '') {
        setQuantity('');
      } else {
        const numValue = parseInt(value);
        if (!isNaN(numValue)) {
          if (numValue > maxQuantity) {
            setQuantity(maxQuantity.toString());
          } else {
            setQuantity(value);
          }
        }
      }
    }
  };

  const handleQuantityBlur = () => {
    if (quantity === '' || parseInt(quantity) < 1) {
      setQuantity('1');
    }
  };

  const adjustQuantity = (amount) => {
    const currentQty = quantity === '' ? 0 : parseInt(quantity);
    const newValue = Math.min(maxQuantity, Math.max(1, currentQty + amount));
    setQuantity(newValue.toString());
  };

  const quickQuantities = [5, 10, 25, 50];

  const getDisplayQuantity = () => {
    return quantity === '' ? '0' : quantity;
  };

  const getCurrentQuantity = () => {
    return quantity === '' ? 0 : parseInt(quantity);
  };

  const firstVariant = product.variants?.[0] || {};
  const variantUnit = firstVariant.unit || 'pcs';
  const variantPrice = firstVariant.unitPrice || firstVariant.price || 0;


  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-medium text-gray-900">Select Quantity</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-500"
          >
            <FiX size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-2">Product:</p>
            <p className="font-medium text-gray-900">{product.name}</p>
            <p className="text-sm text-gray-500 mt-1">Available Stock: {maxQuantity}</p>
          </div>

          {/* Quick Quantity Buttons */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {quickQuantities.map((qty) => (
              <button
                key={qty}
                onClick={() => setQuantity(Math.min(qty, maxQuantity).toString())}
                disabled={qty > maxQuantity}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all
                  ${qty <= maxQuantity
                    ? parseInt(quantity) === qty
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
              >
                {qty}
              </button>
            ))}
          </div>

          {/* Quantity Input with +/- Buttons */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Custom Quantity
            </label>
            <div className="flex items-center gap-2">
              <button
                onClick={() => adjustQuantity(-1)}
                disabled={getCurrentQuantity() <= 1}
                className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiMinus size={18} />
              </button>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={quantity}
                onChange={handleQuantityChange}
                onBlur={handleQuantityBlur}
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-center"
              />
              <button
                onClick={() => adjustQuantity(1)}
                disabled={getCurrentQuantity() >= maxQuantity}
                className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiPlus size={18} />
              </button>
            </div>
          </div>

          {/* Total Calculation */}
          <div className="bg-gray-50 p-3 rounded-lg mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Price per {variantUnit}:</span>
              <span className="font-medium">₱{variantPrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600">Quantity:</span>
              <span className="font-medium">{getDisplayQuantity()} {variantUnit}</span>
            </div>
            <div className="flex justify-between text-base font-medium mt-2 pt-2 border-t">
              <span>Total:</span>
              <span className="text-orange-600">
                ₱{(variantPrice * getCurrentQuantity()).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <button
            onClick={() => onAdd(parseInt(quantity))}
            disabled={quantity === '' || parseInt(quantity) < 1}
            className="w-full py-2.5 rounded-lg font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Item
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickQuantityModal; 
