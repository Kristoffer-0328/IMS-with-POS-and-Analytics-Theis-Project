import React from 'react';
import { FiShoppingCart } from 'react-icons/fi';

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

  return (
    <div className="fixed inset-0 backdrop-blur-md bg-white/30 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl p-6 w-11/12 max-w-md">
        {/* Modal Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold text-gray-800">Select {product.name} Options</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
        </div>

        {/* Product Image */}
        <div className="bg-gray-50 rounded-lg p-4 mb-4">
          <img
            src={activeVariant?.image || product.image || '/images/placeholder.png'}
            alt={product.name}
            className="h-40 w-full object-contain rounded-lg"
            onError={(e) => { e.target.src = '/images/placeholder.png' }}
          />
        </div>

        {/* Variant Selection Buttons */}
        {product.variants && product.variants.length > 1 && (
          <div className="mb-4">
            <p className="font-medium text-gray-700 mb-2">Available Options:</p>
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
                    className={`px-3 py-1.5 rounded-lg border text-sm ${
                      activeVariantIndex === index
                        ? 'bg-orange-500 text-white border-orange-500 font-semibold'
                        : isAvailable
                          ? 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through'
                      }`}
                  >
                    {variantLabel} {isAvailable ? '' : '(Out)'}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Price and Quantity Controls */}
        <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <p className="text-lg mb-1">
              Price: <span className="font-semibold text-green-600">
                ₱{activeVariant?.price?.toFixed(2) || 'N/A'}
              </span>
            </p>
            <p className="text-sm text-gray-500">
              Available Stock: {maxQty} units
            </p>
          </div>
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button
              onClick={() => qty > 1 && setQty(qty - 1)}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={qty <= 1}
            >-</button>
            <span className="px-4 py-1 font-medium min-w-[50px] text-center">{qty}</span>
            <button
              onClick={() => qty < maxQty && setQty(qty + 1)}
              className="px-3 py-2 bg-gray-100 hover:bg-gray-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={qty >= maxQty}
            >+</button>
          </div>
        </div>


        {/* Add to Cart Button */}
        <div className="flex justify-end mt-6">
          <button
            onClick={onAddVariant}
            className={`px-6 py-2.5 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition flex items-center gap-2 ${
              (!activeVariant || maxQty < qty || qty <= 0)
                ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            disabled={!activeVariant || maxQty < qty || qty <= 0}
          >
            <FiShoppingCart size={16} />
            <span>Add to Cart</span>
          </button>
        </div>
      </div>
    </div>
  );
}