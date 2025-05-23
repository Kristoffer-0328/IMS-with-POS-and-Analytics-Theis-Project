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
    const value = e.target.value;
    // Allow empty value or numbers
    if (value === '' || /^\d*$/.test(value)) {
      setQty(value);
    }
  };

  const handleQuantityBlur = () => {
    const numValue = parseInt(qty);
    if (qty === '' || isNaN(numValue) || numValue < 1) {
      setQty('1');
    } else if (numValue > maxQty) {
      setQty(maxQty.toString());
    }
  };

  const adjustQuantity = (amount) => {
    const currentQty = qty === '' ? 0 : parseInt(qty);
    const newValue = Math.min(maxQty, Math.max(1, currentQty + amount));
    setQty(newValue.toString());
  };

  const quickQuantities = [5, 10, 25, 50];

  const getCurrentQuantity = () => {
    return qty === '' ? 0 : parseInt(qty);
  };

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
                onClick={() => setQty(Math.min(quickQty, maxQty).toString())}
                disabled={quickQty > maxQty}
                className={`py-2 rounded-lg text-sm ${
                  quickQty <= maxQty
                    ? getCurrentQuantity() === quickQty
                      ? 'bg-orange-500 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
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
                disabled={getCurrentQuantity() <= 1}
              >
                −
              </button>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={qty}
                onChange={handleQuantityChange}
                onBlur={handleQuantityBlur}
                className="w-full px-3 py-2 border-y text-center"
              />
              <button
                onClick={() => adjustQuantity(1)}
                className="px-4 py-2 border rounded-r-lg bg-gray-50"
                disabled={getCurrentQuantity() >= maxQty}
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
              <span>{qty || 0} {activeVariant?.unit || 'pcs'}</span>
            </div>
            <div className="flex justify-between py-1 text-orange-500 font-medium">
              <span>Total:</span>
              <span>₱{formatCurrency((activeVariant?.price || 0) * getCurrentQuantity())}</span>
            </div>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={onAddVariant}
            disabled={!qty || getCurrentQuantity() < 1 || getCurrentQuantity() > maxQty}
            className="w-full py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 font-medium mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}