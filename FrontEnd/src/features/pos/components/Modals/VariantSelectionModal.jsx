import React from 'react';
import { FiX } from 'react-icons/fi';

const formatCurrency = (number) => {
  return new Intl.NumberFormat('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  }).format(number);
};

export default function VariantSelectionModal({
  product,
  activeVariantIndex,
  setActiveVariantIndex,
  qty,
  setQty,
  onAddVariant,
  onClose
}) {
  const activeVariant = product.variants[activeVariantIndex];
  const maxQty = activeVariant?.quantity || 0;

  const handleQuantityChange = (e) => {
    const value = parseInt(e.target.value) || 0;
    setQty(Math.max(1, Math.min(value, maxQty))); // Clamp between 1 and maxQty
  };

  const adjustQuantity = (amount) => {
    setQty(prev => Math.min(maxQty, Math.max(1, prev + amount)));
  };

  const quickQuantities = [5, 10, 25, 50];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-[400px] mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="text-lg font-medium">Select Quantity</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-500">
            <FiX size={20} />
          </button>
        </div>

        <div className="p-4">
          {/* Product Info */}
          <div className="mb-4">
            <p className="text-gray-600 mb-1">Product:</p>
            <p className="font-medium">{product.name}</p>
            <p className="text-gray-600 mt-1">Available Stock: {maxQty}</p>
          </div>

          {/* Quick Select */}
          <div className="grid grid-cols-4 gap-2 mb-4">
            {quickQuantities.map((quickQty) => (
              <button
                key={quickQty}
                onClick={() => setQty(Math.min(quickQty, maxQty))}
                disabled={quickQty > maxQty}
                className={`py-2 rounded-lg text-sm ${
                  qty === quickQty
                    ? 'bg-gray-200'
                    : 'bg-gray-100'
                }`}
              >
                {quickQty}
              </button>
            ))}
          </div>

          {/* Custom Quantity */}
          <div className="mb-6">
            <p className="text-gray-600 mb-2">Custom Quantity</p>
            <div className="flex items-center">
              <button
                onClick={() => adjustQuantity(-1)}
                className="px-4 py-2 border rounded-l-lg bg-gray-50"
                disabled={qty <= 1}
              >
                −
              </button>
              <input
                type="number"
                value={qty}
                onChange={handleQuantityChange}
                className="w-full px-3 py-2 border-y text-center"
                min="1"
                max={maxQty}
              />
              <button
                onClick={() => adjustQuantity(1)}
                className="px-4 py-2 border rounded-r-lg bg-gray-50"
                disabled={qty >= maxQty}
              >
                +
              </button>
            </div>
          </div>

          {/* Price Summary */}
          <div>
            <div className="flex justify-between py-1">
              <span className="text-gray-600">Price per {activeVariant?.unit || 'pcs'}:</span>
              <span>₱{formatCurrency(activeVariant?.price || 0)}</span>
            </div>
            <div className="flex justify-between py-1">
              <span className="text-gray-600">Quantity:</span>
              <span>{qty} {activeVariant?.unit || 'pcs'}</span>
            </div>
            <div className="flex justify-between py-1 text-orange-500 font-medium">
              <span>Total:</span>
              <span>₱{formatCurrency((activeVariant?.price || 0) * qty)}</span>
            </div>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={onAddVariant}
            className="w-full py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium mt-4"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}