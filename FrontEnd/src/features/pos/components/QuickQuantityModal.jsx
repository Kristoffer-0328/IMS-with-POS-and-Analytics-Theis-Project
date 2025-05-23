import React, { useState } from 'react';
import { FiMinus, FiPlus, FiX } from 'react-icons/fi';

const QuickQuantityModal = ({
  product,
  onClose,
  onAdd,
  maxQuantity
}) => {
  const [quantity, setQuantity] = useState(1);
  
  const handleQuantityChange = (e) => {
    const value = e.target.value;
    if (value === '') {
      setQuantity('');
    } else {
      const numValue = parseInt(value);
      if (!isNaN(numValue)) {
        setQuantity(Math.min(maxQuantity, numValue));
      }
    }
  };

  const handleQuantityBlur = () => {
    if (quantity === '' || quantity < 1) {
      setQuantity(1);
    }
  };

  const adjustQuantity = (amount) => {
    setQuantity(prev => Math.min(maxQuantity, Math.max(1, prev + amount)));
  };

  const quickQuantities = [5, 10, 25, 50];

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
                onClick={() => setQuantity(Math.min(qty, maxQuantity))}
                disabled={qty > maxQuantity}
                className={`py-2 px-3 rounded-lg text-sm font-medium transition-all
                  ${qty <= maxQuantity
                    ? quantity === qty
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
                disabled={quantity <= 1}
                className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiMinus size={18} />
              </button>
              <input
                type="number"
                min="1"
                max={maxQuantity}
                value={quantity}
                onChange={handleQuantityChange}
                onBlur={handleQuantityBlur}
                className="flex-1 px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500 text-center"
              />
              <button
                onClick={() => adjustQuantity(1)}
                disabled={quantity >= maxQuantity}
                className="p-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <FiPlus size={18} />
              </button>
            </div>
          </div>

          {/* Total Calculation */}
          <div className="bg-gray-50 p-3 rounded-lg mb-4">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Price per {product.variants[0].unit}:</span>
              <span className="font-medium">₱{product.variants[0].price.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-sm mt-1">
              <span className="text-gray-600">Quantity:</span>
              <span className="font-medium">{quantity} {product.variants[0].unit}</span>
            </div>
            <div className="flex justify-between text-base font-medium mt-2 pt-2 border-t">
              <span>Total:</span>
              <span className="text-orange-600">
                ₱{(product.variants[0].price * quantity).toLocaleString()}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <button
            onClick={() => onAdd(quantity)}
            className="w-full py-2.5 rounded-lg font-medium bg-orange-500 text-white hover:bg-orange-600 transition-colors"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
};

export default QuickQuantityModal; 