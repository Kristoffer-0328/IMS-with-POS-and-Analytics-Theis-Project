import React from 'react';
import { FiShoppingCart, FiX } from 'react-icons/fi';

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
    setQty(Math.max(0, Math.min(value, maxQty))); // Clamp between 0 and maxQty
  };

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-black/30 flex items-center justify-center z-50 p-4 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-11/12 max-w-md animate-slideUp">
        {/* Modal Header */}
        <div className="relative bg-gradient-to-r from-orange-50 to-amber-50 rounded-t-2xl p-6 pb-24">
          <button 
            onClick={onClose} 
            className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/50 transition-colors"
          >
            <FiX size={24} className="text-gray-600" />
          </button>
          <h2 className="text-2xl font-bold text-gray-800 pr-8">{product.name}</h2>
          <p className="text-gray-600 mt-1">Select options and quantity</p>
        </div>

        {/* Product Image - Overlapping Header */}
        <div className="relative -mt-20 px-6">
          <div className="bg-white rounded-xl p-4 shadow-md border border-gray-100">
            <img
              src={activeVariant?.image || product.image || '/images/placeholder.png'}
              alt={product.name}
              className="h-48 w-full object-contain rounded-lg transition-transform hover:scale-105"
              onError={(e) => { e.target.src = '/images/placeholder.png' }}
            />
          </div>
        </div>

        <div className="p-6 pt-4 space-y-6">
          {/* Variant Selection */}
          {product.variants && product.variants.length > 1 && (
            <div>
              <p className="font-medium text-gray-700 mb-3">Available Options:</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map((variant, index) => {
                  const variantLabel = variant.size || variant.unit ?
                    `${variant.size || ''} ${variant.unit || ''}`.trim() :
                    `Option ${index + 1}`;
                  const isAvailable = variant.quantity > 0;

                  return (
                    <button
                      key={variant.variantId}
                      onClick={() => setActiveVariantIndex(index)}
                      disabled={!isAvailable}
                      className={`px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all duration-200 ${
                        activeVariantIndex === index
                          ? 'bg-orange-500 text-white border-orange-500 shadow-md scale-105'
                          : isAvailable
                            ? 'bg-white text-gray-700 border-gray-200 hover:border-orange-200 hover:bg-orange-50'
                            : 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed line-through'
                      }`}
                    >
                      {variantLabel}
                      {!isAvailable && ' (Out of Stock)'}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Price and Stock Info */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Price:</span>
              <span className="text-lg font-bold text-green-600">
                ₱{activeVariant?.price?.toFixed(2) || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Available Stock:</span>
              <span className="font-medium text-gray-700">{maxQty} units</span>
            </div>
          </div>

          {/* Quantity Controls */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => qty > 1 && setQty(qty - 1)}
              className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center disabled:opacity-50"
              disabled={qty <= 1}
            >
              -
            </button>
            <input
              type="number"
              value={qty}
              onChange={handleQuantityChange}
              min="1"
              max={maxQty}
              className="w-24 h-12 text-center text-lg font-medium border rounded-xl focus:ring-2 focus:ring-orange-200 focus:border-orange-500 transition-shadow"
              disabled={!activeVariant || maxQty <= 0}
            />
            <button
              onClick={() => qty < maxQty && setQty(qty + 1)}
              className="w-12 h-12 rounded-xl bg-gray-100 hover:bg-gray-200 transition-colors flex items-center justify-center disabled:opacity-50"
              disabled={qty >= maxQty}
            >
              +
            </button>
          </div>

          {/* Add to Cart Button */}
          <button
            onClick={onAddVariant}
            className={`w-full py-4 px-6 rounded-xl bg-orange-500 hover:bg-orange-600 transition-colors flex items-center justify-center gap-2 ${
              (!activeVariant || maxQty < qty || qty <= 0)
                ? 'opacity-50 cursor-not-allowed' : 'shadow-lg shadow-orange-500/20'
            }`}
            disabled={!activeVariant || maxQty < qty || qty <= 0}
          >
            <FiShoppingCart size={20} className="text-white" />
            <span className="text-white font-medium">Add {qty} to Cart</span>
          </button>
        </div>
      </div>
    </div>
  );
}