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
    <div className="p-4">
      <h3 className="font-medium text-gray-700 mb-4">Added Products</h3>
      <div className="space-y-3">
        {addedProducts.map((item, index) => (
          <div
            key={`${item.variantId}-${index}`}
            className="flex items-start justify-between p-4 bg-gray-50 rounded-lg border border-gray-100"
          >
            <div className="flex-1 min-w-0 pr-3">
              <h4 className="font-medium text-gray-900 text-sm leading-tight mb-2">
                {item.name}
              </h4>
              <div className="flex items-center text-xs text-gray-500 space-x-2">
                <span className="whitespace-nowrap">{item.qty} {item.unit || 'pcs'}</span>
                <span>×</span>
                <span className="whitespace-nowrap">{formatCurrency(item.price || 0)}</span>
              </div>
            </div>
            <div className="flex flex-col items-end space-y-2">
              <div className="font-semibold text-orange-600 text-sm">
                {formatCurrency((item.price || 0) * (item.qty || 0))}
              </div>
              <button
                onClick={() => onRemoveItem(index)}
                disabled={isProcessing}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-50 rounded"
              >
                <FiTrash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProductList;