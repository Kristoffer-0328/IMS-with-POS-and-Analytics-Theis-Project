import React from 'react';
import { FiTrash2 } from 'react-icons/fi';

const formatCurrency = (number) => {
  return `₱${Number(number).toLocaleString('en-PH', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

const ProductList = ({ cartItems: addedProducts, onRemoveItem, isProcessing }) => {
  if (addedProducts.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500 text-sm">No products added yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {addedProducts.map((item, index) => (
        <div key={`item-${index}`} className="border border-gray-200 rounded-lg p-4 bg-white">
          <div className="flex items-start justify-between">
            <div className="flex-1">
                <h4 className="font-medium text-gray-900 text-sm leading-tight mb-2">
                  {item.name && item.variantName
                    ? `${item.name} - ${item.variantName}`
                    : item.productName || item.variantName || item.name}
                </h4>
              <div className="flex flex-col gap-1">
                {/* Bundle or dimension info */}
                {item.isBundle && item.piecesPerBundle ? (
                  <>
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-700">
                        📦 Bundle
                      </span>
                      <span className="text-xs text-gray-600">
                        {item.piecesPerBundle} {item.baseUnit || 'pcs'} per {item.bundlePackagingType || 'bundle'}
                      </span>
                    </div>
                    {/* Show pricing information for bundles */}
                    <div className="bg-purple-50 rounded px-2 py-1 text-xs space-y-0.5">
                      {item.bundlePrice && (
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-purple-600">Bundle Price:</span>
                          <span className="font-medium text-purple-700">
                            {formatCurrency(item.bundlePrice)} / {item.bundlePackagingType || 'bundle'}
                          </span>
                        </div>
                      )}
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-purple-600">Price per {item.baseUnit || 'pc'}:</span>
                        <span className="font-medium text-purple-700">{formatCurrency(item.price)}</span>
                      </div>
                    </div>
                  </>
                ) : item.formattedDimensions ? (
                  <span className="text-xs text-gray-600">
                    📏 {item.formattedDimensions}
                  </span>
                ) : null}

                {/* Quantity and price per unit */}
                <div className="flex items-center text-xs text-gray-500 space-x-2">
                  <span className="font-medium text-orange-600">
                    {item.isBundle ? (
                      <>
                        {Math.floor(item.qty / (item.piecesPerBundle || 1))} {item.bundlePackagingType || 'bundles'}
                        {item.qty % (item.piecesPerBundle || 1) > 0 && (
                          <span className="ml-1 text-blue-600">
                            + {item.qty % (item.piecesPerBundle || 1)} {item.baseUnit || 'pcs'}
                          </span>
                        )}
                      </>
                    ) : (
                      <>{item.qty} { 'pcs'}</>
                    )}
                  </span>
                  <span>×</span>
                  <span>{formatCurrency(item.price)}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 ml-4">
              <div className="text-right">
                <div className="font-semibold text-orange-600 text-sm">
                  {formatCurrency(item.price * item.qty)}
                </div>
              </div>
              <button
                onClick={() => onRemoveItem(index)}
                disabled={isProcessing}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-50 rounded flex-shrink-0"
                title="Remove item"
              >
                <FiTrash2 size={13} />
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProductList;
